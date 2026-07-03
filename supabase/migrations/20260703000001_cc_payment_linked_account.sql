-- Migration: 20260703000001_cc_payment_linked_account.sql
-- Adds linked_account_id to categories so CC payment categories can be
-- automatically matched to their credit card account for budget tracking.
-- Status: PENDING — run manually via Supabase dashboard or supabase db push

ALTER TABLE categories
  ADD COLUMN linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_categories_linked_account
  ON categories(linked_account_id)
  WHERE linked_account_id IS NOT NULL;

-- Backfill: link existing "Pago · " categories to their CC accounts by name match
UPDATE categories c
SET linked_account_id = a.id
FROM accounts a
WHERE c.user_id = a.user_id
  AND a.type = 'credit_card'
  AND a.is_archived = false
  AND c.is_system = true
  AND c.is_archived = false
  AND c.name = 'Pago · ' || a.name
  AND c.linked_account_id IS NULL;
