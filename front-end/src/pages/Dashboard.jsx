import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";
import "../Styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const stats = [
    {
      title: "Collected Today",
      value: "EGP 1.86M",
      trend: "-12% vs yesterday",
      trendType: "negative",
      color: "orange",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      title: "Transactions by You",
      value: "24",
      trend: "+4 today",
      trendType: "positive",
      color: "navy",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Pending EPP Plans",
      value: "3",
      trend: "Requires attention",
      trendType: "neutral",
      color: "blue",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      title: "Failed Payments",
      value: "1",
      trend: "Last at 10:12",
      trendType: "negative",
      color: "red",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ];

  const recentTransactions = [
    {
      ref: "RC-8842910",
      name: "Ahmed M. Hassan",
      school: "Cairo International School",
      amount: "EGP 20,250",
      status: "Settled",
      time: "14:32",
    },
    {
      ref: "RC-8842877",
      name: "Youssef Adel",
      school: "Nile University",
      amount: "EGP 2,300",
      status: "Settled",
      time: "13:05",
    },
    {
      ref: "RC-8842861",
      name: "Laila Farouk",
      school: "Heliopolis Language School",
      amount: "EGP 4,600",
      status: "Pending",
      time: "11:47",
    },
    {
      ref: "RC-8842840",
      name: "Omar Nabil",
      school: "Cairo International School",
      amount: "EGP 1,300",
      status: "Failed",
      time: "10:12",
    },
  ];

  return (
    <div className="cib-dashboard">
      {/* Welcome Banner */}
      <section className="cib-welcome-hero">
        <div className="cib-hero-content">
          <div className="cib-badge-row">
            <span className="cib-role-badge">{user?.role || "Agent"}</span>
            <span className="cib-online-dot"></span> Live Portal
          </div>
          <h1 className="cib-hero-title">
            Welcome back, <span>{user?.name || user?.email || "Agent"}</span>
          </h1>
          <p className="cib-hero-subtitle">
            CIB Education Collection Operations · Monitor transactions, manage EPP plans, and process national ID fee inquiries.
          </p>
        </div>

        <div className="cib-hero-actions">
          <button
            type="button"
            className="btn-cib-primary"
            onClick={() => navigate("/browse")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search National ID
          </button>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="cib-stats-grid">
        {stats.map((s, idx) => (
          <div key={idx} className={`cib-stat-card border-${s.color}`}>
            <div className="cib-stat-head">
              <span className="cib-stat-title">{s.title}</span>
              <div className={`cib-stat-icon icon-${s.color}`}>{s.icon}</div>
            </div>
            <div className="cib-stat-val">{s.value}</div>
            <div className={`cib-trend trend-${s.trendType}`}>
              <span>{s.trend}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Activity Card */}
      <section className="cib-recent-card">
        <div className="cib-card-header">
          <div>
            <h2 className="cib-section-title">Recent Activity</h2>
            <p className="cib-section-subtitle">Real-time settlement stream across affiliated institutions</p>
          </div>
          <button
            type="button"
            className="cib-btn-link"
            onClick={() => navigate("/history")}
          >
            View all transactions →
          </button>
        </div>

        <div className="cib-table-wrap">
          <table className="cib-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guardian / Student</th>
                <th>Institution</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.ref} className="cib-table-row">
                  <td className="cib-ref mono">{tx.ref}</td>
                  <td className="cib-strong">{tx.name}</td>
                  <td className="cib-text-muted">{tx.school}</td>
                  <td className="cib-amount">{tx.amount}</td>
                  <td>
                    <span className={`cib-status-tag status-${tx.status.toLowerCase()}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="cib-time mono">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}