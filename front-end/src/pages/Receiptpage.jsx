import { useLocation, Link } from "react-router-dom";
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

// ---------------------------------------------------------------------------
// PLACEHOLDER — used only if this page is opened without a receipt in router
// state (e.g. a direct link/refresh). Once a real receipt-lookup endpoint
// exists, this fallback can be dropped or swapped to a fetch-by-id.
// ---------------------------------------------------------------------------
const PLACEHOLDER_RECEIPT = {
  receiptNumber: "RC-8842910",
  nationalId: "29804151234567",
  institution: "Cairo International School",
  method: "card",
  accountCurrency: "EGP",
  amountPaid: 21900,
  amountCurrency: "EGP",
  processedBy: "Salma Sami (BO-2026-08421)",
  processedAt: "2026-09-02T14:32:00Z",
  invoices: [
    { id: "inv-001", studentName: "Ahmed Mohamed Hassan", feeCategory: "Tuition Fees", amount: 8500, currency: "EGP" },
    { id: "inv-002", studentName: "Ahmed Mohamed Hassan", feeCategory: "Bus Services", amount: 2450, currency: "EGP" },
    { id: "inv-003", studentName: "Mariam Mohamed Hassan", feeCategory: "Tuition Fees", amount: 8500, currency: "EGP" },
    { id: "inv-004", studentName: "Youssef Mohamed Hassan", feeCategory: "Bus Services", amount: 2450, currency: "EGP" },
  ],
};

const METHOD_LABEL = {
  card: "Credit / debit card",
  cash: "Cash",
};

export default function ReceiptPage() {
  const location = useLocation();
  const receipt = location.state?.receipt ?? PLACEHOLDER_RECEIPT;

  const {
    receiptNumber,
    nationalId,
    institution,
    method,
    amountPaid,
    amountCurrency,
    processedBy,
    processedAt,
    invoices = [],
  } = receipt;

  const processedDate = processedAt
    ? new Date(processedAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="page">
      <h1 className="page-title">Payment complete</h1>
      <p className="page-subtitle">Receipt generated and printed.</p>

      <div className="receipt-card">
        <div className="receipt-head">
          <div className="receipt-kicker">Payment receipt</div>
          <div className="receipt-amount">{formatAmount(amountPaid, amountCurrency)}</div>
          <span className="status-pill status-settled">Settled</span>
        </div>

        <hr className="divider" />

        <table className="receipt-meta">
          <tbody>
            <tr>
              <td>Receipt number</td>
              <td className="mono">{receiptNumber}</td>
            </tr>
            {nationalId && (
              <tr>
                <td>Guardian national ID</td>
                <td className="mono">{maskNationalId(nationalId)}</td>
              </tr>
            )}
            {institution && (
              <tr>
                <td>Institution</td>
                <td>{institution}</td>
              </tr>
            )}
            <tr>
              <td>Method</td>
              <td>{METHOD_LABEL[method] ?? method}</td>
            </tr>
          </tbody>
        </table>

        <hr className="divider" />

        <div className="receipt-section-label">Fees paid</div>
        <table className="receipt-lines">
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div className="line-student">{inv.studentName}</div>
                  <div className="line-category">{inv.feeCategory}</div>
                </td>
                <td className="line-amount">{formatAmount(inv.amount, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="divider" />

        <div className="receipt-total-row">
          <span>Total</span>
          <span>{formatAmount(amountPaid, amountCurrency)}</span>
        </div>

        <hr className="divider" />

        <table className="receipt-meta">
          <tbody>
            {processedBy && (
              <tr>
                <td>Processed by</td>
                <td>{processedBy}</td>
              </tr>
            )}
            {processedDate && (
              <tr>
                <td>Date & time</td>
                <td>{processedDate}</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="divider" />

        <div className="receipt-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn btn-secondary">
            Download PDF
          </button>
          <Link to="/browse" className="btn">
            New search
          </Link>
        </div>
      </div>
    </div>
  );
}