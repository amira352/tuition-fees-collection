import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import "./shared.css";
import "../Styles/SearchPage.css";

// ---------------------------------------------------------------------------
// Flattens backend response: { parent, children: [{ ..., institution, fees }] }
// into table rows. Only includes fees with an outstanding_amount > 0.
// ---------------------------------------------------------------------------
function flattenChildrenToInvoiceRows(children = []) {
  return children.flatMap((child) =>
    (child.fees || [])
      .filter((fee) => Number(fee.outstanding_amount ?? fee.amount) > 0)
      .map((fee) => ({
        id: fee.id,
        studentName: child.name,
        school: child.institution?.name ?? "N/A",
        feeCategory: fee.fee_type,
        academicTerm: fee.period,
        amount: Number(fee.outstanding_amount ?? fee.amount),
        currency: fee.currency || "EGP",
      }))
  );
}

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [parent, setParent] = useState(null);

  // UI & Network State
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState([]);
  const [infoMessage, setInfoMessage] = useState("");

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
    () =>
      invoices
        .filter((inv) => selectedIds.has(inv.id))
        .reduce((sum, inv) => sum + inv.amount, 0),
    [invoices, selectedIds]
  );

  const handleSearch = async (event) => {
    event.preventDefault();

    const cleanId = nationalId.trim();
    if (cleanId.length !== 14) {
      setErrorMessage("National ID must contain exactly 14 numeric digits.");
      setErrorDetails([]);
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setErrorDetails([]);
    setInfoMessage("");
    setParent(null);

    try {
      // Calls POST /api/bank/parents/search
      const data = await apiPost("/bank/parents/search", { national_id: cleanId });

      if (!data.found) {
        setInvoices([]);
        setSelectedIds(new Set());
        setInfoMessage(
          data.message || "National ID is valid, but no tuition fee records were found."
        );
      } else {
        const rows = flattenChildrenToInvoiceRows(data.children);
        setInvoices(rows);
        setSelectedIds(new Set(rows.map((r) => r.id)));
        setParent(data.parent);
      }
      setHasSearched(true);
    } catch (err) {
      setErrorMessage(err.message || "Unable to retrieve records. Please try again.");
      setErrorDetails(Array.isArray(err.details) ? err.details : []);
      setInvoices([]);
      setSelectedIds(new Set());
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePayNow = (invoiceId) => {
    const singleInvoice = invoices.find((inv) => inv.id === invoiceId);
    if (singleInvoice) {
      navigate("/payment", { state: { invoices: [singleInvoice], parent } });
    }
  };

  const handleProceedToPayment = () => {
    const selectedInvoices = invoices.filter((inv) => selectedIds.has(inv.id));
    navigate("/payment", { state: { invoices: selectedInvoices, parent } });
  };

  return (
    <div className="page">
      <h1 className="page-title">Tuition Fees Collection</h1>
      <p className="page-subtitle">
        Search by National ID to retrieve student fee records
      </p>

      {/* Large Search Bar */}
      <form className="card search-card" onSubmit={handleSearch}>
        <div className="search-field">
          <label className="field-label" htmlFor="nationalId">
            Parent National ID Number
          </label>
          <div className="search-input-group">
            <div className="input-with-icon">
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
                id="nationalId"
                type="text"
                inputMode="numeric"
                className="field-input"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 14-digit National ID (e.g. 29901011234567)"
                maxLength={14}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="btn btn-search"
              disabled={isSearching || nationalId.trim().length !== 14}
            >
              {isSearching ? (
                "Searching…"
              ) : (
                <>
                  <svg
                    className="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
          <span className="field-hint">
            Egyptian National ID must be exactly 14 numeric digits.
          </span>
        </div>

        {errorMessage && (
          <div className="alert">
            <p className="alert-title">{errorMessage}</p>
            {errorDetails.length > 0 && (
              <ul className="alert-details">
                {errorDetails.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      {/* Results Section */}
      {hasSearched && !errorMessage && (
        <div className="card">
          <div className="table-header-row">
            <h3>
              Outstanding Invoices
              {parent?.name && (
                <span className="parent-name"> — {parent.name}</span>
              )}
            </h3>
            <span className="result-count">
              Showing {invoices.length} records
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="placeholder-card">{infoMessage}</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
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
                        <button
                          type="button"
                          className="pill-pay"
                          onClick={() => handlePayNow(inv.id)}
                        >
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
                  <div className="totals-amount">
                    {formatAmount(total, invoices[0]?.currency ?? "EGP")}
                  </div>
                </div>
                <button
                  className="btn"
                  disabled={selectedIds.size === 0}
                  onClick={handleProceedToPayment}
                >
                  Proceed to Payment
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}