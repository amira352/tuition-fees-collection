import { useEffect, useState } from "react";
import { getUser } from "../../lib/auth";
import { getDailyReport } from "../../lib/reportService";
import { Icon } from "./icons";
import "./ReportsPage.css";

function money(value) {
  return `EGP ${Number(value || 0).toLocaleString()}`;
}

export default function ReportsPage() {
  const institutionId = getUser()?.id;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="report-page">
      <header className="report-head">
        <div className="report-heading"><span className="report-icon"><Icon.chart /></span><div><h1>Daily Reports</h1><p>Review collections and outstanding balances by fee type.</p></div></div>
        <label className="report-date">Report date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </header>

      {error && <div className="report-alert">{error}</div>}
      {loading ? <div className="report-empty">Loading report...</div> : report && <>
        <div className="report-summary">
          <article><span>Collected</span><strong>{money(report.grand_total_collected)}</strong></article>
          <article><span>Outstanding</span><strong>{money(report.grand_total_outstanding)}</strong></article>
          <article><span>Timezone</span><strong>{report.timezone}</strong></article>
        </div>
        <section className="report-table-panel"><div className="report-table-head"><div><h2>{report.date}</h2><span>Daily collection summary</span></div><strong>{report.summary?.length || 0} fee types</strong></div><div className="report-table-scroll"><table><thead><tr><th>Fee Type</th><th>Payments</th><th>Collected</th><th>Outstanding</th></tr></thead><tbody>{(report.summary || []).map((row) => <tr key={row.fee_type}><td>{row.fee_type}</td><td>{row.payments_count}</td><td>{money(row.total_collected)}</td><td>{money(row.total_outstanding)}</td></tr>)}</tbody></table>{!report.summary?.length && <div className="report-empty">No payments were recorded for this date.</div>}</div></section>
      </>}
    </div>
  );
}