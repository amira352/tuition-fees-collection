import { Link } from "react-router-dom";
import { getUser } from "../lib/auth";
import "./shared.css";
import "../Styles/Dashboard.css";

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — replace with real data once the backend is ready, e.g.
//   GET /api/agent/summary          -> stats
//   GET /api/agent/recent-activity  -> recentActivity
// ---------------------------------------------------------------------------
const STATS = [
  { label: "Collected today", value: "EGP 1.86M", delta: "+12% vs yesterday" },
  { label: "Transactions by you", value: "24" },
  { label: "Pending EPP plans", value: "3" },
  { label: "Failed payments", value: "1" },
];

const RECENT_ACTIVITY = [
  { id: "RC-8842910", detail: "Ahmed M. Hassan · Cairo International School", amount: "EGP 20,250", status: "settled", time: "14:32" },
  { id: "RC-8842877", detail: "Youssef Adel · Nile University", amount: "EGP 2,300", status: "settled", time: "13:05" },
  { id: "RC-8842861", detail: "Laila Farouk · Heliopolis Language School", amount: "EGP 4,600", status: "pending", time: "11:47" },
  { id: "RC-8842840", detail: "Omar Nabil · Cairo International School", amount: "EGP 1,300", status: "failed", time: "10:12" },
];

const STATUS_LABEL = {
  settled: { text: "Settled", className: "status-pill status-settled" },
  pending: { text: "Pending", className: "status-pill status-pending" },
  failed: { text: "Failed", className: "status-pill status-failed" },
};

export default function Dashboard() {
  const user = getUser();

  return (
    <div className="page">
      <h1 className="page-title">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="page-subtitle">
        Signed in as {user?.email}
        {user?.role && <span className="role-badge">{user.role.replace("_", " ")}</span>}
      </p>

      <div className="dash-actions">
        <Link to="/browse" className="btn">
          Search a national ID
        </Link>
      </div>

      <div className="stat-grid">
        {STATS.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.delta && <div className="stat-delta">{stat.delta}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent activity</h3>
          <Link to="/history" className="view-all-link">
            View all
          </Link>
        </div>

        {RECENT_ACTIVITY.length === 0 ? (
          <div className="placeholder-card">Nothing processed yet today.</div>
        ) : (
          <ul className="activity-list">
            {RECENT_ACTIVITY.map((item) => {
              const status = STATUS_LABEL[item.status];
              return (
                <li className="activity-row" key={item.id}>
                  <div className="activity-main">
                    <span className="activity-ref">{item.id}</span>
                    <span className="activity-detail">{item.detail}</span>
                  </div>
                  <div className="activity-meta">
                    <span className="activity-amount">{item.amount}</span>
                    <span className={status.className}>{status.text}</span>
                    <span className="activity-time">{item.time}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}