-- Migration: 20260727000002_handle_new_user_trigger.sql
-- Status: PENDING — review and run manually. NEVER execute autonomously.
--
-- Replaces the never-wired "Database Webhook" step with the real mechanism.
--
-- 20260628000001_initial_schema.sql defined handle_new_user() but attached it to
-- nothing, leaving a manual instruction to "register a Database Webhook on
-- auth.users INSERT that calls handle_new_user()". That is not possible: a
-- Supabase Database Webhook issues an HTTP request, it cannot invoke a plpgsql
-- function, and handle_new_user() is a trigger function (RETURNS TRIGGER, reads
-- NEW.id) that only CREATE TRIGGER can attach. The step was therefore never
-- completed — see docs/PLAN.md:196-199, where credit-card accounts silently
-- never received their "Pago · X" category because the "Sistema" group was
-- missing.
--
-- Also makes the function idempotent. Without that, a user who somehow already
-- has a user_settings row would hit the UNIQUE(user_id) constraint and the
-- INSERT into auth.users would be rolled back — i.e. signup would fail outright.

-- ---------------------------------------------------------------------------
-- STEP 1 — idempotent version of the function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- No unique constraint covers (user_id, is_system), so guard explicitly
  -- rather than relying on ON CONFLICT.
  IF NOT EXISTS (
    SELECT 1 FROM public.category_groups
    WHERE user_id = NEW.id AND is_system = true
  ) THEN
    INSERT INTO public.category_groups (user_id, name, display_order, is_system)
    VALUES (NEW.id, 'Sistema', 9999, true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- STEP 2 — attach it. This is the part that was missing.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- STEP 3 — backfill anyone who signed up while the trigger did not exist.
-- Safe to re-run.
-- ---------------------------------------------------------------------------

INSERT INTO public.user_settings (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.user_settings s ON s.user_id = u.id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.category_groups (user_id, name, display_order, is_system)
SELECT u.id, 'Sistema', 9999, true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.category_groups g
  WHERE g.user_id = u.id AND g.is_system = true
);

-- ---------------------------------------------------------------------------
-- VERIFY — both counts must equal the number of users, and the trigger must
-- appear. Run after applying:
-- ---------------------------------------------------------------------------
--
-- SELECT
--   (SELECT count(*) FROM auth.users)                                   AS usuarios,
--   (SELECT count(*) FROM public.user_settings)                         AS settings,
--   (SELECT count(*) FROM public.category_groups WHERE is_system)       AS grupos_sistema;
--
-- SELECT tgname, tgenabled
-- FROM pg_trigger
-- WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
