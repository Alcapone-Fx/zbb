-- Migration: 20260703000001_cc_payment_linked_account.sql
-- Adds linked_account_id to categories so CC payment categories can be
-- automatically matched to their credit card account for budget tracking.
-- Status: PENDING — run manually via Supabase dashboard or supabase db push

ALTER TABLE categories
  ADD COLUMN linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_categories_linked_account
  ON categories(linked_account_id)
  WHERE linked_account_id IS NOT NULL;
