-- Removes the synthetic "Pago · X" CC mirror transactions that were
-- auto-inserted on every credit card expense (and on confirming a scheduled
-- credit card expense). The budget engine (/api/budget/month) never reads
-- these rows — it computes "Pago · X" category activity synthetically from
-- the linked account's real expense/transfer transactions instead — so they
-- served no functional purpose and only cluttered /transactions with entries
-- that have no counterpart in the user's real bank statement.
--
-- Scoped precisely: only deletes a transaction whose account_id equals the
-- linked_account_id of its own category (exactly how the mirror was always
-- created), plus the exact auto-generated memo prefix as a second guard.
-- This never touches a real transfer that pays off a card, even though that
-- transfer is deliberately tagged with the same "Pago · X" category — its
-- account_id is the source account (e.g. checking), not the card itself.
DELETE FROM transactions
WHERE type = 'adjustment'
  AND memo LIKE 'Pago tarjeta (automático) —%'
  AND category_id IN (
    SELECT id FROM categories WHERE linked_account_id IS NOT NULL
  )
  AND account_id = (
    SELECT linked_account_id
    FROM categories
    WHERE categories.id = transactions.category_id
  );
