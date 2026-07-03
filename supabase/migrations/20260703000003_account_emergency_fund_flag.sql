ALTER TABLE accounts
  ADD COLUMN is_emergency_fund BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: existing off-budget non-liability accounts are included by default
-- so nothing breaks for existing users
UPDATE accounts
SET is_emergency_fund = TRUE
WHERE is_tracking_only = TRUE
  AND type != 'liability'
  AND is_archived = FALSE;
