-- Sinking Fund Groups: allows grouping multiple goals under one budget category + savings account

-- New table
CREATE TABLE sinking_fund_groups (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT         NOT NULL,
  category_id       UUID         REFERENCES categories(id) ON DELETE SET NULL,
  source_account_id UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE sinking_fund_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON sinking_fund_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extend sinking_funds with grouping, recurrence and pay-tracking columns
ALTER TABLE sinking_funds
  ADD COLUMN group_id         UUID    REFERENCES sinking_fund_groups(id) ON DELETE SET NULL,
  ADD COLUMN recurrence       TEXT    NOT NULL DEFAULT 'one_time'
                              CHECK (recurrence IN ('one_time', 'annual')),
  ADD COLUMN is_paid          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_paid_amount NUMERIC(12,2),
  ADD COLUMN last_paid_date   DATE,
  ALTER COLUMN category_id DROP NOT NULL;
