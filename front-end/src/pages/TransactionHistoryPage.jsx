import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
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
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const [nationalId, setNationalId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchedParent, setSearchedParent] = useState(null);

  // 1. Fetch transactions based on status tabs or parent ID
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
        if (searchedParent?.id) {
          queryParams.set("parentId", searchedParent.id);
        }
        queryParams.set("limit", "100");

        const data = await apiGet(`/payments/history?${queryParams.toString()}`);

        if (isMounted) {
          setPayments(data?.payments || []);
          setSummary(data?.summary || null);
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
  }, [activeTab, searchedParent]);

async function handleSearch(event) {
    event.preventDefault();
    const cleanId = nationalId.trim();

    if (!/^\d{14}$/.test(cleanId)) {
      setError("National ID must be exactly 14 numeric digits.");
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      // Corrected route path: /bank/parents/search (not /parents/search)
      const parentRes = await apiPost("/bank/parents/search", { national_id: cleanId });

      if (parentRes?.found && parentRes?.parent) {
        setSearchedParent(parentRes.parent);
      } else {
        setSearchedParent(null);
        setError("No parent found registered with that National ID.");
        setPayments([]);
      }
    } catch (err) {
      setError(err.message || "Unable to verify National ID.");
      setSearchedParent(null);
    } finally {
      setIsSearching(false);
    }
  }

  function handleClearSearch() {
    setNationalId("");
    setSearchedParent(null);
    setError("");
  }

  return (
    <div className="page">
      <div className="th-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">
          Review all settlements, tenders, and fee items processed through the collection engine.
        </p>

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
        <div className="th-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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

          {/* National ID Search Form */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
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
                inputMode="numeric"
                className="field-input"
                placeholder="Search by 14-digit National ID"
                value={nationalId}
                maxLength={14}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              type="submit"
              className="btn btn-sm"
              disabled={isSearching || nationalId.trim().length !== 14}
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </form>
        </div>

        {/* Verified Guardian Card matching ReceiptsPage */}
        {searchedParent && (
          <div
            className="card"
            style={{
              marginBottom: "1.25rem",
              background: "#f8fafc",
              borderLeft: "4px solid var(--cib-navy, #002d62)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.2rem 1.6rem",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: "0.25rem",
                }}
              >
                Registered Guardian
              </span>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--cib-navy, #002d62)",
                  letterSpacing: "-0.01em",
                }}
              >
                {searchedParent.name}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span
                className="role-badge"
                style={{
                  background: "#e0f2fe",
                  color: "var(--cib-navy, #002d62)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "999px",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                }}
              >
                Verified National ID
              </span>
              <button
                type="button"
                className="btn-link"
                style={{
                  color: "#dc2626",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                }}
                onClick={handleClearSearch}
              >
                Clear Filter ✕
              </button>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {loading && <div className="placeholder-card">Loading transactions…</div>}

        {!loading && error && (
          <div className="placeholder-card" style={{ color: "#dc2626" }}>
            {error}
          </div>
        )}

        {!loading && !error && payments.length === 0 && (
          <div className="placeholder-card">No transactions found matching this filter.</div>
        )}

        {/* Results Table */}
        {!loading && !error && payments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guardian / Student</th>
                <th>Institution</th>
                <th>Fee Line</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((t) => {
                const statusConfig = STATUS_LABEL[t.status] || {
                  text: t.status,
                  className: "status-pill",
                };
                const primaryLine = t.lines?.[0] || {};
                const tender = t.paid_from?.[0] || {};

                return (
                  <tr key={t.payment_id}>
                    <td className="mono font-bold" style={{ color: "var(--cib-navy, #002d62)" }}>
                      {t.receipt_number || (t.payment_id ? String(t.payment_id).slice(0, 8).toUpperCase() : "—")}
                    </td>
                    <td>
                      <strong>{t.payer || "Verified Customer"}</strong>
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