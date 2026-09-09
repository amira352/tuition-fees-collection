import { buildDailyReport } from "../services/report.service.js";

export const getDailyReport = async (req, res, next) => {
  try {
    const report = await buildDailyReport(req.params.id, req.query.date);

    if (req.query.format === "csv") {
      // This report is aggregated by fee type, not by customer, so there
      // are no national IDs in it to mask — nothing to redact here.
      const header = "fee_type,payments_count,total_collected,total_outstanding";
      const rows = report.summary.map(
        (r) => `${r.fee_type},${r.payments_count},${r.total_collected},${r.total_outstanding}`
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="daily-report-${report.date}.csv"`);
      return res.send([header, ...rows].join("\n"));
    }

    return res.json(report);
  } catch (error) {
    next(error);
  }
};
