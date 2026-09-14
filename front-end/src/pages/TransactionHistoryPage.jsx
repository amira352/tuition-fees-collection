import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import "./shared.css";
import "../Styles/TransactionHistoryPage.css";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

const STATUS_LABEL = {
  completed: { text: "Completed", className: "status-pill status-settled" },
  pending: { text: "Pending", className: "status-pill status-pending" },
  failed: { text: "Failed", className: "status-pill status-failed" },
};

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function TransactionHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      setLoading(true);
      setError("");

      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== "all") {
          queryParams.set("status", activeTab);
        }
        queryParams.set("limit", "100");

        // Hits GET /api/payments/history mounted in app.js
        const data = await apiGet(`/payments/history?${queryParams.toString()}`);

        if (isMounted) {
          setPayments(data.payments || []);
          setSummary(data.summary || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load payment history.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Client-side search across payer, receipt number, student, institution, and payment ID
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((item) => {
      const receiptNo = (item.receipt_number || "").toLowerCase();
      const paymentId = (String(item.payment_id || "")).toLowerCase();
      const payer = (item.payer || "").toLowerCase();
      const institution = (item.lines?.[0]?.institution || "").toLowerCase();
      const student = (item.lines?.[0]?.student || "").toLowerCase();
      const studentCode = (item.lines?.[0]?.student_code || "").toLowerCase();

      return (
        receiptNo.includes(q) ||
        paymentId.includes(q) ||
        payer.includes(q) ||
        student.includes(q) ||
        studentCode.includes(q) ||
        institution.includes(q)
      );
    });
  }, [payments, query]);

  return (
    <div className="page">
      <div className="th-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">
          Review all settlements, tenders, and fee items processed through the collection engine.
        </p>

        {/* Live Summary Bar from Backend getPaymentHistory */}
        {summary && (
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>
            <span>
              Total Matching: <strong style={{ color: "var(--cib-navy, #002d62)" }}>{summary.total_matching}</strong>
            </span>
            <span>
              Collected on Page:{" "}
              <strong style={{ color: "#16a34a" }}>
                {formatAmount(summary.collected_on_this_page, summary.currency)}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="th-toolbar">
          {/* Status Tabs */}
          <div className="admin-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`admin-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="input-with-icon th-search">
            <svg
              className="input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="field-input"
              placeholder="Search by payer, student, ref, or school"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && <div className="placeholder-card">Loading transactions…</div>}

        {!loading && error && (
          <div className="placeholder-card" style={{ color: "#dc2626" }}>
            {error}
          </div>
        )}

        {/* Results Table */}
        {!loading && !error && filtered.length === 0 && (
          <div className="placeholder-card">No transactions match that filter.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Payer / Student</th>
                <th>Institution</th>
                <th>Fee Line</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const statusConfig = STATUS_LABEL[t.status] || {
                  text: t.status,
                  className: "status-pill",
                };
                const primaryLine = t.lines?.[0] || {};
                const tender = t.paid_from?.[0] || {};

                return (
                  <tr key={t.payment_id}>
                    <td className="mono">
                      {t.receipt_number || (t.payment_id ? String(t.payment_id).slice(0, 8).toUpperCase() : "—")}
                    </td>
                    <td>
                      <strong>{t.payer || "Unknown Payer"}</strong>
                      {primaryLine.student && (
                        <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
                          Student: {primaryLine.student}
                        </div>
                      )}
                    </td>
                    <td>{primaryLine.institution || "—"}</td>
                    <td>
                      {primaryLine.fee_type
                        ? `${primaryLine.fee_type} (${primaryLine.period || "Term"})`
                        : "—"}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--cib-navy, #002d62)" }}>
                      {formatAmount(t.amount, t.currency)}
                    </td>
                    <td>
                      <span style={{ textTransform: "capitalize" }}>
                        {tender.method || t.payment_type || "Card"}
                      </span>
                    </td>
                    <td>
                      <span className={statusConfig.className}>{statusConfig.text}</span>
                    </td>
                    <td>{formatDate(t.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}