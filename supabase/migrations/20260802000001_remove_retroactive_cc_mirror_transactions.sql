-- Migration: 20260802000001_remove_retroactive_cc_mirror_transactions.sql
-- Status: PENDING — review and run manually. NEVER execute autonomously.
--
-- Completes the cleanup that 20260710000001 started but only half-finished.
--
-- THE GAP
--
-- Two migrations disagree on a memo string:
--
--   20260705000002_backfill_cc_payment_categories.sql:61 inserts the synthetic
--     mirror rows with memo 'Pago tarjeta (automático, retroactivo) — …'
--
--   20260710000001_remove_cc_mirror_transactions.sql deletes only
--     memo LIKE 'Pago tarjeta (automático) —%'
--
-- The ", retroactivo" sits before the em dash, so the LIKE pattern never
-- matches and every backfilled mirror row survived the cleanup. This is not
-- account-specific: migrations run in order, so ANY database that already held
-- credit-card expenses when the backfill ran ends up with the same residue.
-- (A genuinely fresh database is unaffected — the backfill has nothing to
-- backfill, and the row-creating code itself was deleted on 2026-07-10, so
-- nothing produces new ones either way.)
--
-- IMPACT — cosmetic only, which is why it went unnoticed
--
-- sumBalancesByAccount() skips `type='adjustment'` rows carrying a mirror
-- category, so account balances, "Dinero a Asignar" and every other KPI
-- already read as if these rows did not exist. What they do is clutter
-- /transactions with entries that have no counterpart on the real statement.
-- Observed on one account: 4 rows totalling 400.46 on a card whose true
-- balance is 0.00.
--
-- SCOPING — same structural guard as 20260710000001, which is what makes this
-- safe. A row only matches when its account_id equals the linked_account_id of
-- its own category: exactly how the mirror was created, and never true of a
-- real transfer that pays the card off. That payment is deliberately tagged
-- with the same "Pago · X" category, but it lives on the SOURCE account (e.g.
-- checking) and is type='transfer', so it cannot match on two counts.
--
-- The memo pattern is broadened to cover both variants rather than adding a
-- second exact string, so a future memo tweak does not reopen the same hole.
--
-- Hard DELETE rather than the usual soft-delete: `transactions` has no
-- is_archived column, and these are synthetic rows the app generated and no
-- longer reads — not user-entered data. Same call, and same precedent, as
-- 20260710000001.
--
-- Idempotent: re-running deletes nothing.

-- ---------------------------------------------------------------------------
-- STEP 1 — preview. Uncomment and run this FIRST; it only reads.
-- Every row returned must be an entry you do not recognize from your real
-- statement, on the card itself, with a positive amount.
-- ---------------------------------------------------------------------------
--
-- SELECT a.name AS cuenta, t.date, t.amount, t.memo, c.name AS categoria
-- FROM transactions t
-- JOIN accounts a   ON a.id = t.account_id
-- JOIN categories c ON c.id = t.category_id
-- WHERE t.type = 'adjustment'
--   AND t.memo LIKE 'Pago tarjeta (automático%'
--   AND c.linked_account_id IS NOT NULL
--   AND t.account_id = c.linked_account_id
-- ORDER BY a.name, t.date;

-- ---------------------------------------------------------------------------
-- STEP 2 — the cleanup.
-- ---------------------------------------------------------------------------

DELETE FROM transactions
WHERE type = 'adjustment'
  AND memo LIKE 'Pago tarjeta (automático%'
  AND category_id IN (
    SELECT id FROM categories WHERE linked_account_id IS NOT NULL
  )
  AND account_id = (
    SELECT linked_account_id
    FROM categories
    WHERE categories.id = transactions.category_id
  );

-- ---------------------------------------------------------------------------
-- VERIFY — must return 0 rows. Run after applying.
-- ---------------------------------------------------------------------------
--
-- SELECT count(*) AS filas_espejo_restantes
-- FROM transactions t
-- JOIN categories c ON c.id = t.category_id
-- WHERE t.type = 'adjustment'
--   AND c.linked_account_id IS NOT NULL
--   AND t.account_id = c.linked_account_id;
--
-- Sanity check on the affected card — the raw sum of its transactions should
-- now equal the balance the app has been showing all along:
--
-- SELECT a.name, SUM(t.amount) AS saldo
-- FROM accounts a JOIN transactions t ON t.account_id = a.id
-- WHERE a.type = 'credit_card'
-- GROUP BY a.name;
