-- Migration: 20261031000001_uncategorize_reconciliation_adjustments.sql
-- Status: PENDING — review and run manually. NEVER execute autonomously.
--
-- Data repair. Reconciliation used to REQUIRE a category for the adjustment
-- transaction on on-budget accounts, so users parked it in an "Ajustes"
-- category. A positive adjustment there is activity with no allocation: it
-- shows up as Disponible and rolls over month after month, locking that money
-- in an envelope nobody spends from. The code now makes the category optional
-- (uncategorized adjustments flow to "Dinero a Asignar").
--
-- This clears the category on reconciliation adjustments that sit in a user
-- category named 'Ajustes', moving that money back to "Dinero a Asignar".
-- Credit-card "Pago · X" categories (linked_account_id IS NOT NULL) are never
-- touched. Only the category link changes — no rows are deleted.

-- ---------------------------------------------------------------------------
-- STEP 1 — PREVIEW. Nothing is modified by this query.
-- ---------------------------------------------------------------------------
--
-- SELECT t.id, t.date, t.amount, a.name AS cuenta, c.name AS categoria
-- FROM transactions t
-- JOIN categories c ON c.id = t.category_id
-- JOIN accounts   a ON a.id = t.account_id
-- WHERE t.type = 'adjustment'
--   AND c.name = 'Ajustes'
--   AND c.linked_account_id IS NULL
-- ORDER BY t.date DESC;
--
-- Also check the category total (should match the $239.97 arrastre seen in
-- Presupuesto, Octubre 2026):
--
-- SELECT c.name, SUM(t.amount) AS neto
-- FROM transactions t JOIN categories c ON c.id = t.category_id
-- WHERE c.name = 'Ajustes' AND c.linked_account_id IS NULL
-- GROUP BY c.name;

-- ---------------------------------------------------------------------------
-- STEP 2 — THE REPAIR.
-- ---------------------------------------------------------------------------

UPDATE transactions t
SET category_id = NULL
FROM categories c
WHERE t.category_id = c.id
  AND t.type = 'adjustment'
  AND c.name = 'Ajustes'
  AND c.linked_account_id IS NULL;

-- ---------------------------------------------------------------------------
-- After running: "Ajustes" returns to 0 in every month and "Dinero a Asignar"
-- rises by the category's former net Disponible. Rollover is recomputed on
-- read, so no backfill is needed. If other transactions (not type 'adjustment')
-- were also filed under 'Ajustes', their amount stays there — review the
-- second preview query.
-- ---------------------------------------------------------------------------
