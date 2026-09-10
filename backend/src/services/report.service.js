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
  const summary = await getDailyReportData(institutionId, targetDate);

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
