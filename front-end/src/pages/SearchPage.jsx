import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./shared.css";
import "../Styles/SearchPage.css";

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — replace with a real fetch once the endpoint is ready:
//   GET /api/invoices?nationalId=...
// Shape to preserve: { id, studentName, school, feeCategory, academicTerm, amount, currency }
// The table below renders straight from this array so you have something to
// look at and wire up styling against before the backend is ready. Once the
// endpoint exists, swap the initial useState value for [] and populate it
// inside handleSearch instead (see TODO there).
// ---------------------------------------------------------------------------
const PLACEHOLDER_INVOICES = [
  { id: "inv-001", studentName: "Ahmed Mohamed Hassan", school: "Cairo International School", feeCategory: "Tuition Fees", academicTerm: "2024/2025 Term 1", amount: 8500, currency: "EGP" },
  { id: "inv-002", studentName: "Ahmed Mohamed Hassan", school: "Cairo International School", feeCategory: "Bus Services", academicTerm: "2024/2025 Term 1", amount: 2450, currency: "EGP" },
  { id: "inv-003", studentName: "Ahmed Mohamed Hassan", school: "Cairo International School", feeCategory: "Books & Materials", academicTerm: "2024/2025 Term 1", amount: 1500, currency: "EGP" },
  { id: "inv-004", studentName: "Mariam Mohamed Hassan", school: "Cairo International School", feeCategory: "Tuition Fees", academicTerm: "2024/2025 Term 1", amount: 8500, currency: "EGP" },
  { id: "inv-005", studentName: "Youssef Mohamed Hassan", school: "Cairo International School", feeCategory: "Bus Services", academicTerm: "2024/2025 Term 1", amount: 2450, currency: "EGP" },
];

function formatAmount(amount, currency) {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState("29901011234567");
  const [invoices, setInvoices] = useState(PLACEHOLDER_INVOICES);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(PLACEHOLDER_INVOICES.filter((i) => i.id !== "inv-003").map((i) => i.id))
  );
  const [isSearching, setIsSearching] = useState(false);

  const toggleInvoice = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const total = useMemo(
    () => invoices.filter((inv) => selectedIds.has(inv.id)).reduce((sum, inv) => sum + inv.amount, 0),
    [invoices, selectedIds]
  );

  const handleSearch = async (event) => {
    event.preventDefault();
    setIsSearching(true);
    try {
      // TODO: replace with the real API call, e.g.
      // const res = await fetch(`${API_URL}/invoices?nationalId=${nationalId}`);
      // const data = await res.json();
      // setInvoices(data);
      // setSelectedIds(new Set(data.map((i) => i.id)));
      await new Promise((resolve) => setTimeout(resolve, 400)); // fake latency
    } finally {
      setIsSearching(false);
    }
  };

  const handlePayNow = (invoiceId) => {
    // TODO: route to the settlement page for this single invoice
    console.log("Pay now:", invoiceId);
  };

  const handleProceedToPayment = () => {
    const selectedInvoices = invoices.filter((inv) => selectedIds.has(inv.id));
    navigate("/payment", { state: { invoices: selectedInvoices } });
  };

  return (
    <div className="page">
      <h1 className="page-title">Tuition Fees Collection</h1>
      <p className="page-subtitle">Search by National ID to retrieve student fee records</p>

      <form className="card search-card" onSubmit={handleSearch}>
        <div className="search-row">
          <div className="search-field">
            <label className="field-label">National ID Number</label>
            <input
              type="text"
              className="field-input"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="Enter national ID"
            />
          </div>
          <button type="submit" className="btn" disabled={isSearching || !nationalId.trim()}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="table-header-row">
          <h3>Outstanding Invoices</h3>
          <span className="result-count">Showing {invoices.length} records</span>
        </div>

        {invoices.length === 0 ? (
          <div className="placeholder-card">No outstanding invoices found for this National ID.</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Student Name</th>
                  <th>School</th>
                  <th>Fee Category</th>
                  <th>Academic Term</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleInvoice(inv.id)}
                      />
                    </td>
                    <td>{inv.studentName}</td>
                    <td>{inv.school}</td>
                    <td>{inv.feeCategory}</td>
                    <td>{inv.academicTerm}</td>
                    <td>{formatAmount(inv.amount, inv.currency)}</td>
                    <td>
                      <button type="button" className="pill-pay" onClick={() => handlePayNow(inv.id)}>
                        Pay now &gt;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="divider" />
            <div className="totals-row">
              <div>
                <div className="totals-label">TOTAL BALANCE DUE</div>
                <div className="totals-amount">{formatAmount(total, "EGP")}</div>
              </div>
              <button className="btn" disabled={selectedIds.size === 0} onClick={handleProceedToPayment}>
                Proceed to Payment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}