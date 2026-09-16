import { getDailyReportData } from "../repositories/report.repository.js";

/**
 * BE-3 item 8. Day boundary is computed in REPORT_TIMEZONE (default
 * Africa/Cairo, not server-local time and not a silent UTC default) —
 * see sql/002_daily_report_function.sql for where that's actually applied.
 * total_outstanding is a live snapshot (what's owed right now), NOT scoped
 * to the report date — only total_collected is date-scoped.
 */
export const buildDailyReport = async (institutionId, date) => {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const summary = mergeFeeTypeCasing(await getDailyReportData(institutionId, targetDate));

  const grandTotalCollected = summary.reduce((sum, r) => sum + Number(r.total_collected), 0);
  const grandTotalOutstanding = summary.reduce((sum, r) => sum + Number(r.total_outstanding), 0);

  return {
    date: targetDate,
    timezone: process.env.REPORT_TIMEZONE || "Africa/Cairo",
    institution_id: institutionId,
    summary,
    grand_total_collected: grandTotalCollected,
    grand_total_outstanding: grandTotalOutstanding
  };
};

/**
 * Fee types are free text on upload, so the same type can be stored with
 * different casing/whitespace ("transportation" vs "Transportation") and the
 * SQL GROUP BY treats those as separate rows. Fold them together here so the
 * report shows one row per fee type. The displayed label prefers a variant
 * that starts with a capital letter, otherwise the first one seen.
 */
export const mergeFeeTypeCasing = (rows = []) => {
  const merged = new Map();

  for (const row of rows) {
    const label = String(row.fee_type ?? "").trim();
    const key = label.toLowerCase();
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...row,
        fee_type: label,
        payments_count: Number(row.payments_count || 0),
        total_collected: Number(row.total_collected || 0),
        total_outstanding: Number(row.total_outstanding || 0)
      });
      continue;
    }

    existing.payments_count += Number(row.payments_count || 0);
    existing.total_collected += Number(row.total_collected || 0);
    existing.total_outstanding += Number(row.total_outstanding || 0);
    if (!/^[A-Z]/.test(existing.fee_type) && /^[A-Z]/.test(label)) existing.fee_type = label;
  }

  return [...merged.values()];
};
