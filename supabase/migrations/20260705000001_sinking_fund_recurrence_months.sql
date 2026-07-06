ALTER TABLE sinking_funds
  ADD COLUMN recurrence_months INTEGER
  CHECK (recurrence_months IS NULL OR recurrence_months > 0);

COMMENT ON COLUMN sinking_funds.recurrence_months IS
  'Months between cycles when recurrence = annual. NULL defaults to 12 (unchanged behavior for existing funds).';
