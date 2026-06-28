-- Migration: 20260628000001_initial_schema.sql
-- Module:    M00 — DB Schema & Migrations
-- Status:    PENDING — review and run manually via `supabase db push` or the Supabase dashboard.
--            NEVER execute autonomously per CLAUDE.md migration rules.
--
-- Covers: all tables, RLS policies, indexes, and the handle_new_user() helper function.
--
-- Post-migration manual steps (Supabase dashboard):
--   1. Enable email verification in Auth → Providers → Email.
--   2. Register a Database Webhook on auth.users INSERT that calls handle_new_user().
--      This creates user_settings + system category_group for each new user.
--
-- Design note — system category_group:
--   category_groups.is_system = true identifies the per-user system group ("Sistema").
--   Agents must look it up at runtime:
--     SELECT id FROM category_groups WHERE user_id = $1 AND is_system = true LIMIT 1
--   There is no fixed UUID constant — each user gets a normally-generated UUID for their
--   system group, created by handle_new_user(). M03 and M04 must use the query above.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE accounts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  type             TEXT        NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'liability')),
  is_tracking_only BOOLEAN     NOT NULL DEFAULT false,
  is_archived      BOOLEAN     NOT NULL DEFAULT false,
  starting_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- is_system = true: the hidden "Sistema" group that holds CC payment categories.
-- Agents identify it via: SELECT id FROM category_groups WHERE user_id=$1 AND is_system=true.
CREATE TABLE category_groups (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  ideal_percentage NUMERIC(5,2),
  display_order    INTEGER     NOT NULL DEFAULT 0,
  is_system        BOOLEAN     NOT NULL DEFAULT false,
  is_archived      BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE categories (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id      UUID    NOT NULL REFERENCES category_groups(id),
  name          TEXT    NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system     BOOLEAN NOT NULL DEFAULT false,
  is_archived   BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE budget_months (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

-- No direct user_id — RLS joins through budget_months (see policy below).
CREATE TABLE budget_allocations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID         NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  category_id     UUID         NOT NULL REFERENCES categories(id),
  assigned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (budget_month_id, category_id)
);

-- Defined before transactions to satisfy the FK in transactions.scheduled_transaction_id.
CREATE TABLE scheduled_transactions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    UUID         NOT NULL REFERENCES accounts(id),
  category_id   UUID         REFERENCES categories(id),
  amount        NUMERIC(12,2) NOT NULL,
  payee         TEXT,
  memo          TEXT,
  frequency     TEXT         NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date    DATE         NOT NULL,
  end_date      DATE,
  next_due_date DATE         NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT true
);

CREATE TABLE transactions (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id               UUID         NOT NULL REFERENCES accounts(id),
  category_id              UUID         REFERENCES categories(id),
  amount                   NUMERIC(12,2) NOT NULL,
  date                     DATE         NOT NULL,
  type                     TEXT         NOT NULL CHECK (type IN ('expense', 'income', 'transfer', 'adjustment', 'opening_balance')),
  payee                    TEXT,
  memo                     TEXT,
  tags                     TEXT[],
  is_cleared               BOOLEAN      NOT NULL DEFAULT false,
  is_reconciled            BOOLEAN      NOT NULL DEFAULT false,
  transfer_pair_id         UUID         REFERENCES transactions(id),
  scheduled_transaction_id UUID         REFERENCES scheduled_transactions(id),
  next_month               BOOLEAN      NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE sinking_funds (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID         NOT NULL REFERENCES categories(id),
  name          TEXT         NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  target_date   DATE         NOT NULL,
  notes         TEXT
);

CREATE TABLE wishlist_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  estimated_cost NUMERIC(12,2),
  priority       TEXT         CHECK (priority IN ('high', 'medium', 'low')),
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE reconciliation_records (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id                UUID         NOT NULL REFERENCES accounts(id),
  date                      DATE         NOT NULL,
  bank_balance              NUMERIC(12,2) NOT NULL,
  app_balance               NUMERIC(12,2) NOT NULL,
  adjustment_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment_transaction_id UUID         REFERENCES transactions(id),
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE user_settings (
  id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  emergency_fund_min_expense NUMERIC(12,2),
  theme                      TEXT         NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  budget_template            JSONB,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Called by the Supabase Database Webhook on auth.users INSERT.
-- Creates the initial user_settings row and the system category_group ("Sistema").
-- Register in Supabase dashboard: Auth → Webhooks → Insert on auth.users → handle_new_user.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.category_groups (user_id, name, display_order, is_system)
  VALUES (NEW.id, 'Sistema', 9999, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON category_groups
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON budget_months
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- budget_allocations has no user_id — RLS joins through budget_months.
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON budget_allocations
  FOR ALL
  USING (
    (SELECT user_id FROM budget_months WHERE id = budget_month_id) = auth.uid()
  )
  WITH CHECK (
    (SELECT user_id FROM budget_months WHERE id = budget_month_id) = auth.uid()
  );

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON scheduled_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE sinking_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON sinking_funds
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON wishlist_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE reconciliation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON reconciliation_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES (TRD §6.1)
-- ============================================================

CREATE INDEX idx_transactions_user_date   ON transactions(user_id, date);
CREATE INDEX idx_transactions_category    ON transactions(user_id, category_id, date);
CREATE INDEX idx_budget_allocations_month ON budget_allocations(budget_month_id, category_id);
CREATE INDEX idx_accounts_user            ON accounts(user_id) WHERE is_archived = false;
CREATE INDEX idx_scheduled_next_due       ON scheduled_transactions(user_id, next_due_date) WHERE is_active = true;
