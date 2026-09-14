import { useEffect, useState } from "react";
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
  const [nationalId, setNationalId] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [payerInfo, setPayerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Initial load: Retrieve recent settled payments that generated receipts
  useEffect(() => {
    let isMounted = true;

    async function loadInitialReceipts() {
      setIsLoading(true);
      setErrorMessage("");
      try {
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
                students: primaryLine.student ? [primaryLine.student] : [],
                institutions: primaryLine.institution ? [primaryLine.institution] : [],
                amount: p.amount,
                currency: p.currency || "EGP",
                date: p.date,
                payer: p.payer,
                methods: p.paid_from?.map((t) => t.method) || [p.payment_type || "card"],
                lines: p.lines || [],
              };
            });

          setReceipts(mapped);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || "Failed to load receipts archive.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialReceipts();

    return () => {
      isMounted = false;
    };
  }, []);

 // 2. Search Handler: Strictly 14-digit National ID lookup
   async function handleSearch(event) {
     event.preventDefault();
     const cleanId = nationalId.trim();

     if (!/^\d{14}$/.test(cleanId)) {
       setErrorMessage("National ID must contain exactly 14 numeric digits.");
       return;
     }

     setIsSearching(true);
     setErrorMessage("");
     setHasSearched(true);

     try {
       let res = null;
       let lastErr = null;

       // Try the 3 common ways this route is mounted across branches:
       const candidatePaths = [
         `/bank/receipts?nationalId=${cleanId}`,
         `/receipts/search?nationalId=${cleanId}`,
         `/receipts?nationalId=${cleanId}`,
       ];

       for (const path of candidatePaths) {
         try {
           res = await apiGet(path);
           if (res) break; // Found it!
         } catch (e) {
           lastErr = e;
           // If it's a 404 route-not-found, try the next candidate
           if (e.status === 404 && (e.message?.includes("Cannot GET") || !e.code)) {
             continue;
           }
           // If it's a real backend business error (e.g. 404 "No parent is registered..."), break and throw it
           throw e;
         }
       }

       if (!res && lastErr) {
         throw lastErr;
       }

       if (res?.receipts) {
         setPayerInfo(res.payer || null);

         const mapped = res.receipts.map((r) => ({
           receiptNumber: r.receipt_number,
           paymentId: r.payment_id,
           students: r.students || (r.lines || []).map((l) => l.student).filter(Boolean),
           institutions: r.institutions || (r.lines || []).map((l) => l.institution).filter(Boolean),
           amount: r.total,
           currency: r.currency || "EGP",
           date: r.issued_at || r.paid_on,
           payer: res.payer?.name || null,
           methods: r.methods || (r.paid_from || []).map((t) => t.method),
           lines: r.lines || [],
         }));

         setReceipts(mapped);

         if (mapped.length === 0) {
           setErrorMessage("No receipts were found for this National ID.");
         }
       } else {
         setReceipts([]);
         setErrorMessage("No receipts were found for this National ID.");
       }
     } catch (err) {
       setPayerInfo(null);
       setReceipts([]);
       setErrorMessage(err.message || "No parent registered with that National ID.");
     } finally {
       setIsSearching(false);
     }

    }

  function handleReset() {
    setNationalId("");
    setPayerInfo(null);
    setErrorMessage("");
    setHasSearched(false);

    apiGet("/payments/history?status=completed&limit=50")
      .then((data) => {
        const mapped = (data?.payments || [])
          .filter((p) => p.receipt_number)
          .map((p) => ({
            receiptNumber: p.receipt_number,
            paymentId: p.payment_id,
            students: p.lines?.[0]?.student ? [p.lines[0].student] : [],
            institutions: p.lines?.[0]?.institution ? [p.lines[0].institution] : [],
            amount: p.amount,
            currency: p.currency || "EGP",
            date: p.date,
            payer: p.payer,
            methods: p.paid_from?.map((t) => t.method) || [p.payment_type || "card"],
            lines: p.lines || [],
          }));
        setReceipts(mapped);
      })
      .catch(() => {});
  }

  function handleView(r) {
    navigate("/receipt", {
      state: {
        receipt: {
          receipt_number: r.receiptNumber,
          paymentId: r.paymentId,
          payer: r.payer || payerInfo?.name,
          institution: r.institutions?.join(", ") || "—",
          method: r.methods?.[0] || "Card",
          total: r.amount,
          amountPaid: r.amount,
          amountCurrency: r.currency,
          processedAt: r.date,
          paid_on: r.date,
          lines: r.lines || [],
        },
      },
    });
  }

  function handlePrint(r) {
    handleView(r);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  return (
    <div className="page">
      <h1 className="page-title">Receipts Archive</h1>
      <p className="page-subtitle">
        Search, view, and verify official payment receipts by Parent National ID.
      </p>

      {/* National ID Only Search Form */}
      <form className="card search-card" onSubmit={handleSearch}>
        <div className="search-field">
          <label className="field-label" htmlFor="receipt-national-id">
            Parent National ID Number
          </label>
          <div className="search-input-group" style={{ display: "flex", gap: "0.75rem" }}>
            <input
              id="receipt-national-id"
              type="text"
              inputMode="numeric"
              className="field-input"
              placeholder="Enter 14-digit National ID (e.g. 29805150102033)"
              value={nationalId}
              maxLength={14}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-search"
              disabled={isSearching || nationalId.trim().length !== 14}
            >
              {isSearching ? "Searching…" : "Search ID"}
            </button>
            {hasSearched && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset
              </button>
            )}
          </div>
          <span className="field-hint" style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
            Must be exactly 14 digits as registered on the National ID card
          </span>
        </div>
      </form>

      {/* Verified Parent Banner */}
      {payerInfo && (
        <div
          className="card"
          style={{
            marginBottom: "1.25rem",
            background: "#f8fafc",
            borderLeft: "4px solid var(--cib-navy, #002d62)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Registered Guardian</span>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#002d62" }}>
              {payerInfo.name}
            </div>
          </div>
          <span
            className="role-badge"
            style={{
              background: "#e0f2fe",
              color: "#002d62",
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "0.75rem",
            }}
          >
            Verified National ID
          </span>
        </div>
      )}

      {/* Receipts Table */}
      <div className="card">
        {isLoading ? (
          <div className="placeholder-card">Loading receipts archive…</div>
        ) : errorMessage ? (
          <div className="placeholder-card" style={{ color: "#dc2626" }}>
            {errorMessage}
          </div>
        ) : receipts.length === 0 ? (
          <div className="placeholder-card">No receipts found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Guardian / Student</th>
                <th>Institution</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Date Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.receiptNumber}>
                  <td className="mono font-bold" style={{ color: "var(--cib-navy, #002d62)" }}>
                    {r.receiptNumber}
                  </td>
                  <td>
                    <strong>{r.payer || payerInfo?.name || "Verified Customer"}</strong>
                    {r.students?.length > 0 && (
                      <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
                        {r.students.join(", ")}
                      </div>
                    )}
                  </td>
                  <td>{r.institutions?.join(", ") || "—"}</td>
                  <td style={{ fontWeight: 700 }}>
                    {formatAmount(r.amount, r.currency)}
                  </td>
                  <td>
                    <span style={{ textTransform: "capitalize" }}>
                      {r.methods?.join(", ") || "Card"}
                    </span>
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
                        onClick={() => handlePrint(r)}
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