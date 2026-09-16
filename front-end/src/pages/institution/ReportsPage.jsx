import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/auth";
import { getDailyReport } from "../../lib/reportService";
import { Icon } from "./icons";
import "./ReportsPage.css";

function money(value) {
  return `EGP ${Number(value || 0).toLocaleString()}`;
}

// Shift a yyyy-mm-dd string by whole days. Parsed as UTC so the local
// timezone can never nudge the date across midnight.
function shiftDate(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

// Outstanding balance severity, fixed EGP thresholds.
function severity(amount) {
  const value = Number(amount || 0);
  if (value <= 0) return "none";
  if (value < 10000) return "low";
  if (value < 100000) return "medium";
  return "high";
}

export default function ReportsPage() {
  const institutionId = getUser()?.id;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const rows = useMemo(() => report?.summary || [], [report]);
  const maxOutstanding = useMemo(() => rows.reduce((max, row) => Math.max(max, Number(row.total_outstanding || 0)), 0), [rows]);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      if (!institutionId) {
        setError("Your institution account is missing an institution ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await getDailyReport(institutionId, date);
        if (active) setReport(data);
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to load the daily report.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => { active = false; };
  }, [date, institutionId]);

  // sqrt scale: Tuition dwarfs the others, so a linear bar would hide them.
  // Zero keeps a small gray sliver so the "nothing owed" color still reads.
  function barWidth(amount) {
    const value = Number(amount || 0);
    if (value <= 0 || maxOutstanding <= 0) return 6;
    return Math.max(6, Math.round(Math.sqrt(value / maxOutstanding) * 100));
  }

  return (
    <div className="report-page">
      <header className="report-head">
        <div className="report-heading"><span className="report-icon"><Icon.chart /></span><div><h1>Daily Reports</h1></div></div>
        <div className="report-date">
          <span className="report-date-label">Report date</span>
          <div className="report-date-control">
            <button type="button" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}><Icon.chevronLeft /></button>
            <input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
            <button type="button" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}><Icon.chevronRight /></button>
          </div>
          {report?.timezone && <span className="report-timezone">Timezone: {report.timezone}</span>}
        </div>
      </header>

      {error && <div className="report-alert">{error}</div>}
      {loading ? <div className="report-empty">Loading report...</div> : report && <>
        <div className="report-summary">
          <article><span>Collected</span><strong>{money(report.grand_total_collected)}</strong></article>
          <article><span>Outstanding</span><strong>{money(report.grand_total_outstanding)}</strong></article>
        </div>
        <section className="report-table-panel">
          <div className="report-table-head"><div><h2>{report.date}</h2><span>Summary</span></div><strong>{rows.length} fee types</strong></div>
          <div className="report-table-scroll">
            <table>
              <thead>
                <tr><th>Fee Type</th><th className="is-num">Payments</th><th className="is-num">Collected</th><th className="is-num">Outstanding</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const level = severity(row.total_outstanding);
                  return (
                    <tr key={row.fee_type}>
                      <td>
                        <div className="report-fee-type">
                          <span>{row.fee_type}</span>
                          <span className="report-bar-track" aria-hidden="true"><span className={`report-bar report-bar-${level}`} style={{ width: `${barWidth(row.total_outstanding)}%` }} /></span>
                        </div>
                      </td>
                      <td className="is-num">{row.payments_count}</td>
                      <td className="is-num report-collected">{money(row.total_collected)}</td>
                      <td className={`is-num report-outstanding report-outstanding-${level}`}>{money(row.total_outstanding)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && <div className="report-empty">No payments were recorded for this date.</div>}
          </div>
        </section>
      </>}
    </div>
  );
}
