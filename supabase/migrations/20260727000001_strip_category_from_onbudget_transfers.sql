-- Migration: 20260727000001_strip_category_from_onbudget_transfers.sql
-- Status: PENDING — review and run manually. NEVER execute autonomously.
--
-- Data repair for the phantom-spending bug fixed in src/app/api/transactions.
--
-- POST /api/transactions used to REQUIRE a category whenever *either* side of a
-- transfer was on-budget, then wrote that category onto the source leg only
-- (the destination leg is always inserted with category_id NULL). Since
-- /api/budget/month counts activity for any transaction carrying a category,
-- regardless of type, a transfer between two on-budget accounts registered as
-- spending in that category with nothing offsetting it.
--
-- Two visible symptoms, both reported:
--   1. The category shows spending that never happened.
--   2. "Dinero a Asignar" is inflated by the same amount — the account balances
--      net to zero while reservedDisponible drops, and dineroAAsignar is the
--      difference between them.
--
-- This nulls the category on those legs. Credit-card payment categories are
-- deliberately preserved: a transfer paying off a card is legitimately tagged
-- with its "Pago · X" mirror category, and mirror categories are excluded from
-- the activity sum, so they never produced phantom spending. They are
-- identified by categories.linked_account_id IS NOT NULL.

-- ---------------------------------------------------------------------------
-- STEP 1 — PREVIEW. Run this first and check the rows are what you expect.
-- Nothing is modified by this query.
-- ---------------------------------------------------------------------------
--
-- SELECT
--   t.id,
--   t.date,
--   t.amount,
--   t.memo,
--   t.payee,
--   src.name  AS cuenta_origen,
--   dst.name  AS cuenta_destino,
--   c.name    AS categoria_a_quitar
-- FROM transactions t
-- JOIN accounts   src  ON src.id  = t.account_id
-- JOIN transactions pair ON pair.id = t.transfer_pair_id
-- JOIN accounts   dst  ON dst.id  = pair.account_id
-- JOIN categories c    ON c.id    = t.category_id
-- WHERE t.type = 'transfer'
--   AND t.category_id IS NOT NULL
--   AND src.is_tracking_only = false
--   AND dst.is_tracking_only = false
--   AND c.linked_account_id IS NULL
-- ORDER BY t.date DESC;

-- ---------------------------------------------------------------------------
-- STEP 2 — THE REPAIR.
-- ---------------------------------------------------------------------------

UPDATE transactions t
SET category_id = NULL
FROM accounts src
WHERE t.type = 'transfer'
  AND t.category_id IS NOT NULL
  AND t.account_id = src.id
  AND src.is_tracking_only = false
  -- The paired leg must also sit on an on-budget account: only then is the
  -- transfer budget-neutral and the category meaningless.
  AND EXISTS (
    SELECT 1
    FROM transactions pair
    JOIN accounts dst ON dst.id = pair.account_id
    WHERE pair.id = t.transfer_pair_id
      AND dst.is_tracking_only = false
  )
  -- Never touch credit-card payment categories.
  AND NOT EXISTS (
    SELECT 1
    FROM categories c
    WHERE c.id = t.category_id
      AND c.linked_account_id IS NOT NULL
  );

-- ---------------------------------------------------------------------------
-- After running: reopen the affected months in Presupuesto. Each cleaned
-- category's Actividad rises back by the transfer amount and "Dinero a Asignar"
-- drops by the same total. Rollover is recomputed on read (computeDisponibles),
-- so no further backfill is needed.
-- ---------------------------------------------------------------------------
