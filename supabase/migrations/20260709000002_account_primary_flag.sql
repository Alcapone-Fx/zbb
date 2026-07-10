ALTER TABLE accounts
  ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Enforce at most one primary account per user
CREATE UNIQUE INDEX accounts_one_primary_per_user
  ON accounts (user_id)
  WHERE is_primary;
