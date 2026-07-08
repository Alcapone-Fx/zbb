ALTER TABLE user_settings
  ADD COLUMN grocery_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN recurring_budget_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN recurring_budget_pattern TEXT CHECK (recurring_budget_pattern IN ('daily', 'weekend'));

COMMENT ON COLUMN user_settings.grocery_category_id IS
  'Category the Grocery Calculator helper remembers, so it can suggest a daily rate from real history.';
COMMENT ON COLUMN user_settings.recurring_budget_category_id IS
  'Category the Recurring Budget Planner helper remembers, so it can suggest a monthly amount from real history.';
COMMENT ON COLUMN user_settings.recurring_budget_pattern IS
  'Which days count toward the Recurring Budget Planner period: every day, or weekends only.';
