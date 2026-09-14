import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api";
import { getUser } from "../lib/auth";
import "../Styles/Dashboard.css";

function formatAmount(amount, currency = "EGP") {
  const num = Number(amount || 0);
  if (num >= 1_000_000) {
    return `${currency} ${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${currency} ${(num / 1_000).toFixed(1)}k`;
  }
  return `${currency} ${num.toLocaleString()}`;
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      try {
        // Parallel fetch for KPI summary and recent activity feed
        const [summaryRes, historyRes] = await Promise.all([
          apiGet("/dashboard/summary").catch(() => null),
          apiGet("/payments/history?limit=5").catch(() => null),
        ]);

        if (!isMounted) return;

        if (summaryRes?.summary) {
          setSummary(summaryRes.summary);
        }

        if (historyRes?.payments) {
          const mappedTx = historyRes.payments.map((p) => {
            const primaryLine = p.lines?.[0] || {};
            return {
              ref: p.receipt_number || (p.payment_id ? String(p.payment_id).slice(0, 8).toUpperCase() : "—"),
              name: p.payer || primaryLine.student || "Customer",
              school: primaryLine.institution || "—",
              amount: formatAmount(p.amount, p.currency),
              status: p.status || "completed",
              time: formatTime(p.date),
            };
          });
          setRecentTransactions(mappedTx);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard metrics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute percentage trend label vs yesterday
  const trendPercent = summary?.change_vs_yesterday_percent;
  let trendLabel = "No comparison baseline";
  let trendType = "neutral";

  if (trendPercent !== null && trendPercent !== undefined) {
    if (trendPercent > 0) {
      trendLabel = `+${trendPercent}% vs yesterday`;
      trendType = "positive";
    } else if (trendPercent < 0) {
      trendLabel = `${trendPercent}% vs yesterday`;
      trendType = "negative";
    } else {
      trendLabel = "0% vs yesterday";
      trendType = "neutral";
    }
  }

  const stats = [
    {
      title: "Collected Today",
      value: formatAmount(summary?.collected_today, summary?.currency || "EGP"),
      trend: trendLabel,
      trendType,
      color: "orange",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      title: "Transactions by You",
      value: String(summary?.transactions_by_you ?? 0),
      trend: `${summary?.transactions_by_you ?? 0} processed today`,
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
      value: String(summary?.pending_epp_plans ?? 0),
      trend: summary?.pending_epp_plans > 0 ? "Requires review" : "All cleared",
      trendType: summary?.pending_epp_plans > 0 ? "negative" : "neutral",
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
      value: String(summary?.failed_today ?? 0),
      trend: summary?.last_failure_at ? `Last at ${formatTime(summary.last_failure_at)}` : "None today",
      trendType: summary?.failed_today > 0 ? "negative" : "positive",
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

  return (
    <div className="cib-dashboard">
      {/* Welcome Banner */}
      <section className="cib-welcome-hero">
        <div className="cib-hero-content">
          <div className="cib-badge-row">
            <span className="cib-role-badge">{user?.role || "Bank Agent"}</span>
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

      {error && (
        <div className="alert-error-banner" style={{ margin: "1rem 0", padding: "0.75rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="cib-stats-grid">
        {stats.map((s, idx) => (
          <div key={idx} className={`cib-stat-card border-${s.color}`}>
            <div className="cib-stat-head">
              <span className="cib-stat-title">{s.title}</span>
              <div className={`cib-stat-icon icon-${s.color}`}>{s.icon}</div>
            </div>
            <div className="cib-stat-val">
              {loading ? "…" : s.value}
            </div>
            <div className={`cib-trend trend-${s.trendType}`}>
              <span>{loading ? "Updating…" : s.trend}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Activity Feed */}
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
          {loading ? (
            <div className="placeholder-card" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              Loading recent transactions…
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="placeholder-card" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              No recent settlements recorded today.
            </div>
          ) : (
            <table className="cib-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Payer / Student</th>
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
          )}
        </div>
      </section>
    </div>
  );
}