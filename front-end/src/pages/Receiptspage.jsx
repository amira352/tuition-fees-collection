import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./shared.css";
import "../Styles/ReceiptsPage.css";

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — replace with a real fetch once the endpoint is ready:
//   GET /api/receipts?query=...
// Shape to preserve: { receiptNumber, studentName, institution, amount,
// currency, date, nationalId, method, processedBy, invoices }
// `invoices`/etc. here are enough to let "View" open the full ReceiptPage
// without a second round trip — once there's a real backend, View can
// instead fetch the full receipt by receiptNumber on demand.
// ---------------------------------------------------------------------------
const PLACEHOLDER_RECEIPTS = [
  {
    receiptNumber: "RC-8842910",
    studentName: "Ahmed M. Hassan",
    institution: "Cairo International School",
    amount: 20250,
    currency: "EGP",
    date: "2026-09-02T14:32:00Z",
    nationalId: "29804151234567",
    method: "card",
    processedBy: "Salma Sami (BO-2026-08421)",
    invoices: [
      { id: "inv-001", studentName: "Ahmed Mohamed Hassan", feeCategory: "Tuition Fees", amount: 8500, currency: "EGP" },
      { id: "inv-002", studentName: "Ahmed Mohamed Hassan", feeCategory: "Bus Services", amount: 2450, currency: "EGP" },
      { id: "inv-004", studentName: "Mariam Mohamed Hassan", feeCategory: "Tuition Fees", amount: 8500, currency: "EGP" },
      { id: "inv-005", studentName: "Youssef Mohamed Hassan", feeCategory: "Bus Services", amount: 2450, currency: "EGP" },
    ],
  },
  {
    receiptNumber: "RC-8842877",
    studentName: "Youssef Adel",
    institution: "Nile University",
    amount: 2300,
    currency: "EGP",
    date: "2026-09-02T13:05:00Z",
    nationalId: "29907211234512",
    method: "cash",
    processedBy: "Omar Nabil (BO-04410)",
    invoices: [{ id: "inv-101", studentName: "Youssef Adel", feeCategory: "Tuition Fees", amount: 2300, currency: "EGP" }],
  },
  {
    receiptNumber: "RC-8842799",
    studentName: "Laila Farouk",
    institution: "AUC",
    amount: 45000,
    currency: "EGP",
    date: "2026-09-01T16:40:00Z",
    nationalId: "29855111234509",
    method: "card",
    processedBy: "Salma Sami (BO-2026-08421)",
    invoices: [{ id: "inv-201", studentName: "Laila Farouk", feeCategory: "Tuition Fees", amount: 45000, currency: "EGP" }],
  },
];

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(PLACEHOLDER_RECEIPTS);
  const [isSearching, setIsSearching] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.trim().toLowerCase();
    return results.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.nationalId?.includes(q)
    );
  }, [query, results]);

  async function handleSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    try {
      // TODO: replace with the real API call, e.g.
      // const data = await apiGet(`/receipts?query=${encodeURIComponent(query)}`);
      // setResults(data);
      await new Promise((resolve) => setTimeout(resolve, 300)); // fake latency
    } finally {
      setIsSearching(false);
    }
  }

  function handleView(receipt) {
    navigate("/receipt", {
      state: {
        receipt: {
          receiptNumber: receipt.receiptNumber,
          nationalId: receipt.nationalId,
          institution: receipt.institution,
          method: receipt.method,
          amountPaid: receipt.amount,
          amountCurrency: receipt.currency,
          processedBy: receipt.processedBy,
          processedAt: receipt.date,
          invoices: receipt.invoices,
        },
      },
    });
  }

  function handleDownload(receipt) {
    // TODO: wire up a real PDF download, e.g. window.open(`${API_URL}/receipts/${receipt.receiptNumber}/pdf`)
    console.log("Download receipt:", receipt.receiptNumber);
  }

  return (
    <div className="page">
      <h1 className="page-title">Receipts</h1>
      <p className="page-subtitle">Search and re-issue receipts already generated.</p>

      <form className="card search-card" onSubmit={handleSearch}>
        <label className="field-label">Search by receipt number, guardian ID or student name</label>
        <div className="search-row">
          <input
            type="text"
            className="field-input"
            placeholder="eg. 29901011234567"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn" disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="placeholder-card">No receipts match that search.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Student</th>
                <th>Institution</th>
                <th>Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.receiptNumber}>
                  <td className="mono">{r.receiptNumber}</td>
                  <td>{r.studentName}</td>
                  <td>{r.institution}</td>
                  <td>{formatAmount(r.amount, r.currency)}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn-link" onClick={() => handleView(r)}>
                        View
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => handleDownload(r)}>
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}