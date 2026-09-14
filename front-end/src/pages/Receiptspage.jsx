import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api";
import "./shared.css";
import "../Styles/ReceiptsPage.css";

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Initial load: Retrieve issued receipts from completed settlements
  useEffect(() => {
    let isMounted = true;

    async function loadIssuedReceipts() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        // Retrieve completed payments that generated receipts
        const data = await apiGet("/payments/history?status=completed&limit=50");
        const payments = data?.payments || [];

        if (isMounted) {
          const mapped = payments
            .filter((p) => p.receipt_number)
            .map((p) => {
              const primaryLine = p.lines?.[0] || {};
              return {
                receiptNumber: p.receipt_number,
                paymentId: p.payment_id,
                studentName: primaryLine.student || "Multiple Students",
                studentCode: primaryLine.student_code,
                institution: primaryLine.institution || "—",
                amount: p.amount,
                currency: p.currency || "EGP",
                date: p.date,
                payer: p.payer,
                method: p.paid_from?.[0]?.method || p.payment_type || "card",
                invoices: (p.lines || []).map((l, i) => ({
                  id: `line-${i}`,
                  studentName: l.student,
                  school: l.institution,
                  feeCategory: l.fee_type,
                  academicTerm: l.period,
                  amount: l.amount,
                  currency: p.currency || "EGP",
                })),
                raw: p,
              };
            });

          setReceipts(mapped);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || "Failed to load receipts list.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadIssuedReceipts();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Direct Search Handler (Searches list or queries GET /api/receipts/:receiptNumber directly)
  async function handleSearch(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setIsSearching(true);
    setErrorMessage("");

    try {
      // If the query looks like a receipt number (starts with RC-), query backend directly
      if (cleanQuery.toUpperCase().startsWith("RC-")) {
        try {
          const res = await apiGet(`/receipts/${cleanQuery.toUpperCase()}`);
          if (res?.receipt) {
            const r = res.receipt;
            const formatted = {
              receiptNumber: r.receipt_number,
              paymentId: r.payment_id,
              studentName: r.lines?.[0]?.student || "Student",
              institution: r.lines?.[0]?.institution || "—",
              amount: r.total,
              currency: r.currency || "EGP",
              date: r.paid_on || r.issued_at,
              payer: r.payer,
              method: r.paid_from?.[0]?.method || "card",
              invoices: (r.lines || []).map((l, i) => ({
                id: `line-${i}`,
                studentName: l.student,
                school: l.institution,
                feeCategory: l.fee_type,
                academicTerm: l.period,
                amount: l.paid,
                currency: r.currency || "EGP",
              })),
            };

            setReceipts((prev) => [
              formatted,
              ...prev.filter((item) => item.receiptNumber !== formatted.receiptNumber),
            ]);
            setIsSearching(false);
            return;
          }
        } catch {
          // If not found by direct ID, continue to client-side filter
        }
      }
    } finally {
      setIsSearching(false);
    }
  }

  // 3. Client-side filter across receipt number, payer, student, or school
  const filtered = useMemo(() => {
    if (!query.trim()) return receipts;
    const q = query.trim().toLowerCase();
    return receipts.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        (r.payer && r.payer.toLowerCase().includes(q)) ||
        (r.institution && r.institution.toLowerCase().includes(q))
    );
  }, [query, receipts]);

  function handleView(r) {
    navigate("/receipt", {
      state: {
        receipt: {
          receipt_number: r.receiptNumber,
          receiptNumber: r.receiptNumber,
          paymentId: r.paymentId,
          payer: r.payer,
          institution: r.institution,
          method: r.method,
          total: r.amount,
          amountPaid: r.amount,
          amountCurrency: r.currency,
          processedAt: r.date,
          paid_on: r.date,
          invoices: r.invoices,
          lines: (r.invoices || []).map((inv) => ({
            student: inv.studentName,
            institution: inv.school,
            fee_type: inv.feeCategory,
            period: inv.academicTerm,
            paid: inv.amount,
          })),
        },
      },
    });
  }

  function handleDownload(r) {
    handleView(r);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  return (
    <div className="page">
      <h1 className="page-title">Receipts</h1>
      <p className="page-subtitle">Search, view, and print generated payment receipts.</p>

      {/* Search Header */}
      <form className="card search-card" onSubmit={handleSearch}>
        <label className="field-label" htmlFor="receipt-search-input">
          Search by receipt number, student name, or institution
        </label>
        <div className="search-row">
          <input
            id="receipt-search-input"
            type="text"
            className="field-input"
            placeholder="eg. RC-8842910 or Student Name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn" disabled={isSearching || isLoading}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Content Area */}
      <div className="card">
        {isLoading ? (
          <div className="placeholder-card">Loading receipts archive…</div>
        ) : errorMessage ? (
          <div className="placeholder-card" style={{ color: "#dc2626" }}>
            {errorMessage}
          </div>
        ) : filtered.length === 0 ? (
          <div className="placeholder-card">No receipts match that search.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Student / Payer</th>
                <th>Institution</th>
                <th>Amount</th>
                <th>Issued Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.receiptNumber}>
                  <td className="mono font-bold" style={{ color: "var(--cib-navy, #002d62)" }}>
                    {r.receiptNumber}
                  </td>
                  <td>
                    <strong>{r.studentName}</strong>
                    {r.payer && (
                      <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
                        Payer: {r.payer}
                      </div>
                    )}
                  </td>
                  <td>{r.institution}</td>
                  <td style={{ fontWeight: 700 }}>
                    {formatAmount(r.amount, r.currency)}
                  </td>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    <div className="row-actions" style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => handleView(r)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleDownload(r)}
                      >
                        Print
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