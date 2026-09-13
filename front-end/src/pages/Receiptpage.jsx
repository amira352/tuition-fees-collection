import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams, Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { getUser } from "../lib/auth";
import "./shared.css";
import "../Styles/ReceiptPage.css";

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function maskNationalId(id) {
  if (!id) return "";
  const str = String(id);
  return str.length > 4 ? `${str.slice(0, 7)}••••${str.slice(-2)}` : str;
}

const METHOD_LABEL = {
  card: "Credit / Debit Card",
  account: "Direct Account Debit",
  cash: "Counter Cash Deposit",
};

export default function ReceiptPage() {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // 1. Initialize from router state if redirected from FeePaymentPage
  const stateReceipt = location.state?.receipt ?? null;

  const [receipt, setReceipt] = useState(stateReceipt);
  const [isLoading, setIsLoading] = useState(!stateReceipt);
  const [fetchError, setFetchError] = useState("");

  const paymentId = searchParams.get("paymentId") || stateReceipt?.payment_id || stateReceipt?.paymentId;
  const receiptNumberParam = params.receiptNumber || searchParams.get("number");

  // 2. Fallback fetch if opened directly via link/refresh
  useEffect(() => {
    if (stateReceipt) {
      setReceipt(stateReceipt);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchReceipt() {
      setIsLoading(true);
      setFetchError("");
      try {
        let res;
        if (paymentId) {
          // GET /api/receipts/payment/:paymentId
          res = await apiGet(`/receipts/payment/${paymentId}`);
        } else if (receiptNumberParam) {
          // GET /api/receipts/:receiptNumber
          res = await apiGet(`/receipts/${receiptNumberParam}`);
        } else {
          setIsLoading(false);
          return;
        }

        if (isMounted) {
          setReceipt(res.receipt);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || "Failed to load the payment receipt.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchReceipt();

    return () => {
      isMounted = false;
    };
  }, [stateReceipt, paymentId, receiptNumberParam]);

  if (isLoading) {
    return (
      <div className="page">
        <div className="placeholder-card">Loading official receipt details…</div>
      </div>
    );
  }

  if (fetchError || !receipt) {
    return (
      <div className="page">
        <h1 className="page-title">Receipt Not Found</h1>
        <div className="placeholder-card">
          {fetchError || "No receipt data found for this transaction."}{" "}
          <Link to="/browse">Return to Fee Search</Link>
        </div>
      </div>
    );
  }

  // Normalize data between backend shape and router state
  const receiptNumber = receipt.receipt_number || receipt.receiptNumber;
  const totalAmount = receipt.total ?? receipt.amountPaid ?? 0;
  const currency = receipt.currency || receipt.amountCurrency || "EGP";
  const issuedDate = receipt.issued_at || receipt.paid_on || receipt.processedAt;
  const payerName = receipt.payer || receipt.parentName;
  const nationalId = receipt.nationalId || receipt.national_id;

  // Tender line details
  const primaryTender = Array.isArray(receipt.paid_from) && receipt.paid_from.length > 0
    ? receipt.paid_from[0]
    : null;

  const method = primaryTender?.method || receipt.method || "card";
  const accountRef = primaryTender?.account || receipt.accountId;
  const bankRef = primaryTender?.bank_reference;

  // Resolve issuing Back Office agent (prevents "null (Branch)" bug)
  const loggedInUser = getUser?.() || {};
  const rawIssuedName =
    receipt.issued_by?.name ||
    receipt.issued_by?.full_name ||
    (typeof receipt.processedBy === "string" ? receipt.processedBy : null);

  const employeeName =
    (rawIssuedName && rawIssuedName !== "null" ? rawIssuedName : null) ||
    loggedInUser.fullName ||
    loggedInUser.name ||
    loggedInUser.email ||
    "Bank Officer";

  const branchName =
    receipt.issued_by?.branch ||
    loggedInUser.branch ||
    "CIB Branch";

  const issuedBy = branchName ? `${employeeName} (${branchName})` : employeeName;

  // Fee line items
  const feeLines = receipt.lines || (receipt.invoices || []).map((inv) => ({
    student: inv.studentName,
    institution: inv.school,
    fee_type: inv.feeCategory,
    period: inv.academicTerm,
    paid: inv.amount,
  }));

  const institutionName =
    receipt.institution ||
    (feeLines.length > 0 ? feeLines[0].institution : null);

  const paymentType = receipt.payment_type || receipt.paymentType || "full";
  const eppPlan = receipt.eppPlan;

  const formattedDate = issuedDate
    ? new Date(issuedDate).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

  return (
    <div className="page">
      <h1 className="page-title">Payment Complete</h1>
      <p className="page-subtitle">Official settlement receipt generated and recorded.</p>

      <div className="receipt-card">
        {/* Receipt Header */}
        <div className="receipt-head">
          <div className="receipt-kicker">CIB Electronic Settlement Proof</div>
          <div className="receipt-amount">{formatAmount(totalAmount, currency)}</div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
            <span className="status-pill status-settled">Settled</span>
            {paymentType === "partial" && (
              <span className="status-pill status-pending">Partial Settlement</span>
            )}
            {eppPlan && (
              <span className="status-pill" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                EPP Active ({eppPlan.tenorMonths || eppPlan.tenor_months} Mos)
              </span>
            )}
          </div>
        </div>

        <hr className="divider" />

        {/* Core Metadata */}
        <table className="receipt-meta">
          <tbody>
            <tr>
              <td>Receipt Number</td>
              <td className="mono font-bold">{receiptNumber}</td>
            </tr>
            {payerName && (
              <tr>
                <td>Payer / Guardian</td>
                <td><strong>{payerName}</strong></td>
              </tr>
            )}
            {nationalId && (
              <tr>
                <td>Guardian National ID</td>
                <td className="mono">{maskNationalId(nationalId)}</td>
              </tr>
            )}
            {institutionName && (
              <tr>
                <td>Educational Institution</td>
                <td>{institutionName}</td>
              </tr>
            )}
            <tr>
              <td>Settlement Channel</td>
              <td>{METHOD_LABEL[method] || method}</td>
            </tr>
            {accountRef && (
              <tr>
                <td>Account / Card Reference</td>
                <td className="mono">{accountRef}</td>
              </tr>
            )}
            {bankRef && (
              <tr>
                <td>Bank Authorization Code</td>
                <td className="mono">{bankRef}</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="divider" />

        {/* EPP Details Box (if applicable) */}
        {eppPlan && (
          <>
            <div className="receipt-section-label" style={{ color: "#0369a1" }}>
              Easy Payment Plan Summary
            </div>
            <table className="receipt-meta" style={{ marginBottom: "1rem" }}>
              <tbody>
                <tr>
                  <td>Financed Principal</td>
                  <td>{formatAmount(eppPlan.principal, currency)}</td>
                </tr>
                <tr>
                  <td>Monthly Installment</td>
                  <td className="font-bold text-orange">
                    {formatAmount(eppPlan.monthlyInstalment || eppPlan.monthly_installment, currency)} / month
                  </td>
                </tr>
                <tr>
                  <td>Tenor</td>
                  <td>{eppPlan.tenorMonths || eppPlan.tenor_months} Months</td>
                </tr>
              </tbody>
            </table>
            <hr className="divider" />
          </>
        )}

        {/* Itemized Fee Breakdown */}
        <div className="receipt-section-label">Settled Fee Lines</div>
        <table className="receipt-lines">
          <tbody>
            {feeLines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <div className="line-student">{line.student}</div>
                  <div className="line-category">
                    {line.fee_type} {line.period ? `· ${line.period}` : ""}
                  </div>
                </td>
                <td className="line-amount">
                  {formatAmount(line.paid ?? line.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="divider" />

        <div className="receipt-total-row">
          <span>Total Settled</span>
          <span>{formatAmount(totalAmount, currency)}</span>
        </div>

        <hr className="divider" />

        {/* Audit Footer */}
        <table className="receipt-meta">
          <tbody>
            <tr>
              <td>Processed By</td>
              <td>{issuedBy}</td>
            </tr>
            <tr>
              <td>Timestamp</td>
              <td className="mono">{formattedDate}</td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        <div className="receipt-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print Receipt
          </button>
          <Link to="/browse" className="btn">
            New Search
          </Link>
          <Link to="/history" className="btn btn-secondary">
            Payment History
          </Link>
        </div>
      </div>
    </div>
  );
}