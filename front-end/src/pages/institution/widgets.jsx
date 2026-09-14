import { formatEGP, formatNumber } from "../../lib/format";
import { Icon } from "./icons";

/* ---------- KPI card ---------- */

export function StatCard({ label, value, money, delta, tone }) {
  const positive = delta >= 0;
  return (
    <article className={`stat stat--${tone}`}>
      <span className="stat-mark" aria-hidden="true">
        <StatGlyph tone={tone} />
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {money ? formatEGP(value) : formatNumber(value)}
      </span>
      <span className={`stat-delta${positive ? "" : " is-down"}`}>
        {positive ? "▲" : "▼"} {Math.abs(delta)}%
        <span className="stat-delta-note">vs. last month</span>
      </span>
    </article>
  );
}

function StatGlyph({ tone }) {
  const map = {
    navy: Icon.receipt,
    green: Icon.plan,
    amber: Icon.warning,
    teal: Icon.card,
    slate: Icon.building,
  };
  const Glyph = map[tone] || Icon.grid;
  return <Glyph />;
}

/* ---------- Panel wrapper ---------- */

export function SectionCard({ title, icon, action, children, className = "" }) {
  const Glyph = icon ? Icon[icon] : null;
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <h2 className="panel-title">
          {Glyph && <span className="panel-title-icon"><Glyph /></span>}
          {title}
        </h2>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

/* ---------- Legend row (for the donuts) ---------- */

export function LegendList({ items, total }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.name} className="legend-row">
          <span className="legend-dot" style={{ background: item.color }} />
          <span className="legend-name">{item.name}</span>
          <span className="legend-pct">
            {Math.round((item.amount / total) * 100)}%
          </span>
          <span className="legend-amount">{formatEGP(item.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Recent activity feed ---------- */

export function RecentActivity({ items }) {
  return (
    <ul className="activity">
      {items.map((item) => {
        const Glyph = Icon[item.icon] || Icon.report;
        return (
          <li key={item.id} className="activity-row">
            <span className={`activity-icon activity-icon--${item.tone}`}>
              <Glyph />
            </span>
            <span className="activity-text">
              <span className="activity-title">{item.title}</span>
              <span className="activity-detail">{item.detail}</span>
            </span>
            <span className="activity-time">{item.time}</span>
            <StatusPill status={item.tone} />
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Recent payments table ---------- */

export function RecentPayments({ rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Student</th>
            <th>Fee Type</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="table-muted">{r.dateTime}</td>
              <td>{r.student}</td>
              <td className="table-muted">{r.feeType}</td>
              <td className="table-amount">{formatEGP(r.amount)}</td>
              <td className="table-muted">{r.method}</td>
              <td><StatusPill status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Status pill ---------- */

const PILL_LABEL = {
  paid: "Paid",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  success: "Success",
  warning: "Warning",
  info: "Info",
  neutral: "New",
  active: "Active",
  overdue: "Overdue",
};

export function StatusPill({ status }) {
  return <span className={`pill pill--${status}`}>{PILL_LABEL[status] || status}</span>;
}
