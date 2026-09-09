-- BE-3 item 7: epp_plans.tenor_months has a CHECK allowing only 3, 6, 12,
-- 18 — CIB publishes 3-60 months. This finds whatever CHECK constraint
-- currently limits tenor_months (name unknown to us — never saw the real
-- migration file) and replaces it with a wider one.
--
-- REVIEW BEFORE RUNNING: confirm this actually targets the right
-- constraint on your real schema before executing against production data.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'epp_plans'::regclass
    AND att.attname = 'tenor_months'
    AND con.contype = 'c';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE epp_plans DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE epp_plans
  ADD CONSTRAINT epp_plans_tenor_months_check
  CHECK (tenor_months = ANY (ARRAY[3, 6, 12, 18, 24, 36, 48, 60]));

-- Keep this list in sync with EPP_ALLOWED_TENORS in .env — see BE-3-NOTES.md.
