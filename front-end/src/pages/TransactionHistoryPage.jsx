import { useMemo, useState } from "react";
import "./shared.css";
import "../Styles/TransactionHistoryPage.css";

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — replace with a real fetch once the endpoint exists, e.g.
//   GET /api/transactions?query=...&status=...
// ---------------------------------------------------------------------------
const PLACEHOLDER_TRANSACTIONS = [
  {
    reference: "RC-8842910",
    guardianId: "29705121234534",
    institution: "Cairo International School",
    amount: 20250,
    currency: "EGP",
    method: "EPP · 12mo",
    status: "settled",
    date: "2026-09-02T14:32:00Z",
  },
  {
    reference: "RC-8842877",
    guardianId: "29804151234567",
    institution: "Nile University",
    amount: 2300,
    currency: "EGP",
    method: "Bank transfer",
    status: "settled",
    date: "2026-09-02T13:05:00Z",
  },
  {
    reference: "RC-8842799",
    guardianId: "29907211234512",
    institution: "AUC",
    amount: 45000,
    currency: "EGP",
    method: "Card",
    status: "settled",
    date: "2026-09-02T11:47:00Z",
  },
  {
    reference: "RC-8842840",
    guardianId: "30102031234588",
    institution: "Cairo International School",
    amount: 1300,
    currency: "EGP",
    method: "Bank transfer",
    status: "pending",
    date: "2026-09-02T10:12:00Z",
  },
];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "settled", label: "Settled" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

const STATUS_LABEL = {
  settled: { text: "Settled", className: "status-pill status-settled" },
  pending: { text: "Pending", className: "status-pill status-pending" },
  failed: { text: "Failed", className: "status-pill status-failed" },
};

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function maskGuardianId(id) {
  if (!id || id.length < 6) return id;
  return `${id.slice(0, 6)}••••${id.slice(-2)}`;
}

export default function TransactionHistoryPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    let rows = PLACEHOLDER_TRANSACTIONS;

    if (activeTab !== "all") {
      rows = rows.filter((t) => t.status === activeTab);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (t) =>
          t.reference.toLowerCase().includes(q) ||
          t.guardianId.includes(q) ||
          t.institution.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [query, activeTab]);

  return (
    <div className="page">
      <h1 className="page-title">Transaction history</h1>
      <p className="page-subtitle">Every settlement processed.</p>

      <div className="card">
        <div className="th-toolbar">
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
              placeholder="Search by reference, guardian ID or institution"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="placeholder-card">No transactions match that search.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guardian ID</th>
                <th>Institution</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const status = STATUS_LABEL[t.status];
                return (
                  <tr key={t.reference}>
                    <td className="mono">{t.reference}</td>
                    <td className="mono">{maskGuardianId(t.guardianId)}</td>
                    <td>{t.institution}</td>
                    <td>{formatAmount(t.amount, t.currency)}</td>
                    <td>{t.method}</td>
                    <td>
                      <span className={status.className}>{status.text}</span>
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