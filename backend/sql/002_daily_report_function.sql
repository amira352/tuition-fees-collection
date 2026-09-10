-- BE-3 item 8: GET /api/institutions/:id/reports/daily?date=
-- Supabase's JS client can't do a real GROUP BY aggregation directly, so
-- this follows the same pattern already used for create_pending_payment /
-- settle_payment — a Postgres function called via .rpc().
--
-- REVIEW BEFORE RUNNING: table/column names below are reconstructed from
-- the ERD shared in planning, not the real migration files. Confirm
-- fees.institution_id, payment_items, payments.status values ('captured'/
-- 'settled'), and fees.status ('paid') actually match your real schema.
--
-- Day boundary is computed in p_timezone explicitly (default Africa/Cairo)
-- — not server-local time, not a silent UTC default. total_outstanding is
-- a live snapshot (what's owed right now), NOT scoped to p_date; only
-- total_collected is date-scoped.

CREATE OR REPLACE FUNCTION get_daily_report(
  p_institution_id uuid,
  p_date date,
  p_timezone text DEFAULT 'Africa/Cairo'
)
RETURNS TABLE (
  fee_type text,
  payments_count bigint,
  total_collected numeric,
  total_outstanding numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.fee_type,
    COUNT(DISTINCT pi.payment_id) AS payments_count,
    COALESCE(SUM(pi.amount) FILTER (
      WHERE p.created_at >= (p_date::timestamp AT TIME ZONE p_timezone)
        AND p.created_at < ((p_date + 1)::timestamp AT TIME ZONE p_timezone)
        AND p.status IN ('captured', 'settled')
    ), 0) AS total_collected,
    COALESCE(SUM(f.outstanding_amount) FILTER (WHERE f.status != 'paid'), 0) AS total_outstanding
  FROM fees f
  LEFT JOIN payment_items pi ON pi.fee_id = f.id
  LEFT JOIN payments p ON p.id = pi.payment_id
  WHERE f.institution_id = p_institution_id
  GROUP BY f.fee_type;
END;
$$ LANGUAGE plpgsql;
