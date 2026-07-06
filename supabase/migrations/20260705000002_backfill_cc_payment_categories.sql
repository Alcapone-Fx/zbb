-- One-time DATA REPAIR, not a schema migration. Run once via the Supabase
-- SQL editor or `supabase db push` when convenient — no ALTER TABLE here.
--
-- Root cause: the "Sistema" category_group (and therefore each credit card's
-- "Pago · X" payment category) is normally created by handle_new_user(), which
-- only runs if a Database Webhook on auth.users INSERT was registered by hand
-- in the Supabase dashboard. If that webhook was never registered (or was
-- registered after this user's account already existed), credit card accounts
-- never got their payment category, and every past expense on those cards is
-- missing its "adjustment" mirror entry — so "Pago · X" would show $0 instead
-- of the real amount owed.
--
-- This script, for every non-archived credit_card account:
--   1. Get-or-creates the user's "Sistema" category_group.
--   2. Get-or-creates that account's "Pago · [nombre]" category.
--   3. Only if the category was just created in this run (so re-running this
--      script is safe and won't duplicate mirrors), backfills a retroactive
--      "adjustment" mirror transaction for every existing expense on that
--      account.

DO $$
DECLARE
  v_account RECORD;
  v_system_group_id UUID;
  v_category_id UUID;
  v_category_existed BOOLEAN;
BEGIN
  FOR v_account IN
    SELECT id, user_id, name
    FROM accounts
    WHERE type = 'credit_card' AND is_archived = false
  LOOP
    SELECT id INTO v_system_group_id
    FROM category_groups
    WHERE user_id = v_account.user_id AND is_system = true
    LIMIT 1;

    IF v_system_group_id IS NULL THEN
      INSERT INTO category_groups (user_id, name, display_order, is_system)
      VALUES (v_account.user_id, 'Sistema', 9999, true)
      RETURNING id INTO v_system_group_id;
    END IF;

    SELECT id INTO v_category_id
    FROM categories
    WHERE user_id = v_account.user_id
      AND linked_account_id = v_account.id
      AND is_system = true
    LIMIT 1;

    v_category_existed := v_category_id IS NOT NULL;

    IF NOT v_category_existed THEN
      INSERT INTO categories (user_id, group_id, name, is_system, display_order, linked_account_id)
      VALUES (v_account.user_id, v_system_group_id, 'Pago · ' || v_account.name, true, 0, v_account.id)
      RETURNING id INTO v_category_id;

      INSERT INTO transactions (user_id, account_id, category_id, amount, date, type, memo, tags, next_month)
      SELECT
        t.user_id, t.account_id, v_category_id, ABS(t.amount), t.date, 'adjustment',
        'Pago tarjeta (automático, retroactivo) — ' || COALESCE(t.payee, 'gasto'),
        ARRAY[]::text[], false
      FROM transactions t
      WHERE t.account_id = v_account.id AND t.type = 'expense';
    END IF;
  END LOOP;
END $$;
