import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AccountSelectModal from "../components/AccountSelectModal";
import "./shared.css";
import "../Styles/FeePaymentPage.css";

const PAYMENT_AMOUNT_OPTIONS = [
  { key: "full", title: "Full amount", desc: (total, currency) => `Settle all ${currency} ${total.toLocaleString()} now` },
  { key: "partial", title: "Partial amount", desc: () => "Choose how much to pay today" },
  { key: "epp", title: "EPP instalments", desc: () => "3, 6, 12 or 18 months · credit card only" },
];

const PAYMENT_METHOD_OPTIONS = [
  { key: "card", title: "Credit / debit card", desc: "Deduct from a linked CIB account" },
  { key: "cash", title: "Cash", desc: "Pay at branch" },
];

const EPP_TENORS = [3, 6, 12, 18];

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function FeePaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Invoices selected on the Browse page are passed via router state.
  // Falling back to an empty list keeps this page safe to land on directly
  // (e.g. a refresh) instead of crashing.
  const invoices = location.state?.invoices ?? [];
  const total = useMemo(() => invoices.reduce((sum, inv) => sum + inv.amount, 0), [invoices]);

  const invoiceCurrencies = useMemo(
    () => [...new Set(invoices.map((inv) => inv.currency || "EGP"))],
    [invoices],
  );
  // TODO: mixed-currency invoice batches aren't handled yet — totals assume a single currency.
  const hasMixedInvoiceCurrencies = invoiceCurrencies.length > 1;
  const invoiceCurrency = invoiceCurrencies[0] || "EGP";

  const [amountOption, setAmountOption] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [eppTenor, setEppTenor] = useState(EPP_TENORS[2]);
  const [methodOption, setMethodOption] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);

  const partialAmountNumber = Number(partialAmount);
  const isPartialValid =
    amountOption !== "partial" ||
    (partialAmount.trim() !== "" && partialAmountNumber > 0 && partialAmountNumber <= total);

  const amountDue =
    amountOption === "partial" ? partialAmountNumber : total;

  // EPP is only available by card — auto-correct if someone picks EPP then cash.
  const methodOptionsForAmount =
    amountOption === "epp"
      ? PAYMENT_METHOD_OPTIONS.filter((m) => m.key === "card")
      : PAYMENT_METHOD_OPTIONS;

  const canConfirm =
    invoices.length > 0 && amountOption && methodOption && isPartialValid && !isProcessing;

  async function handleConfirm(selectedAccount = null) {
    setFormError("");
    if (!canConfirm) return;

    setShowAccountModal(false);
    setIsProcessing(true);
    try {
      const payload = {
        invoiceIds: invoices.map((inv) => inv.id),
        amountOption,
        amountPaid: amountDue,
        amountCurrency: invoiceCurrency,
        eppTenor: amountOption === "epp" ? eppTenor : null,
        method: methodOption,
        accountId: selectedAccount?.id ?? null,
        accountCurrency: selectedAccount?.currency ?? null,
      };

      // TODO: replace with the real API call, e.g.
      // const receipt = await apiPost("/payments/settle", payload);
      await new Promise((resolve) => setTimeout(resolve, 700)); // fake latency
      const receipt = {
        receiptNumber: "RC-8842910",
        amountPaid: payload.amountPaid,
        amountCurrency: payload.amountCurrency,
        method: payload.method,
        accountId: payload.accountId,
        accountCurrency: payload.accountCurrency,
        invoices,
        processedAt: new Date().toISOString(),
      };

      navigate("/receipt", { state: { receipt } });
    } catch {
      setFormError("We couldn't process this payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirmClick() {
    if (!canConfirm) return;

    if (methodOption === "card") {
      setShowAccountModal(true);
      return;
    }

    handleConfirm();
  }

  if (invoices.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Fee Payment</h1>
        <div className="placeholder-card">
          No invoices were passed to this page. Head back to{" "}
          <Link to="/browse">Browse</Link> and select at least one invoice.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Fee Payment</h1>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Fee Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.studentName}</td>
                <td>{inv.feeCategory}</td>
                <td>{formatAmount(inv.amount, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="divider" />
        <div className="totals-row">
          <div className="totals-label">TOTAL BALANCE DUE</div>
          <div className="totals-amount">
            {hasMixedInvoiceCurrencies
              ? "Multiple currencies"
              : formatAmount(total, invoiceCurrency)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Payment Amount</h3>
        <div className="option-grid option-grid-3">
          {PAYMENT_AMOUNT_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.key}
              className={`option-card ${amountOption === opt.key ? "option-card-selected" : ""}`}
              onClick={() => {
                setAmountOption(opt.key);
                if (opt.key === "epp" && methodOption && methodOption !== "card") {
                  setMethodOption(null);
                }
              }}
            >
              <span className="option-title">{opt.title}</span>
              <span className="option-desc">
                {opt.desc(total.toLocaleString(), invoiceCurrency)}
              </span>
            </button>
          ))}
        </div>

        {amountOption === "partial" && (
          <div className="inline-field">
            <label className="field-label">Amount to pay today</label>
            <input
              type="number"
              className="field-input"
              min="1"
              max={total}
              placeholder={`Up to ${formatAmount(total, invoiceCurrency)}`}
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
            />
            {partialAmount.trim() !== "" && !isPartialValid && (
              <span className="field-error">
                Enter an amount between 1 and {formatAmount(total, invoiceCurrency)}.
              </span>
            )}
          </div>
        )}

        {amountOption === "epp" && (
          <div className="inline-field">
            <label className="field-label">Instalment plan</label>
            <div className="tenor-row">
              {EPP_TENORS.map((months) => (
                <button
                  type="button"
                  key={months}
                  className={`tenor-chip ${eppTenor === months ? "tenor-chip-selected" : ""}`}
                  onClick={() => setEppTenor(months)}
                >
                  {months} months
                </button>
              ))}
            </div>
            <span className="field-hint">
              {formatAmount(Math.ceil(total / eppTenor), invoiceCurrency)} / month for {eppTenor}{" "}
              months
            </span>
          </div>
        )}

        <h3 className="section-title section-title-spaced">Payment Method</h3>
        <div className="option-grid option-grid-3">
          {methodOptionsForAmount.map((opt) => (
            <button
              type="button"
              key={opt.key}
              className={`option-card ${methodOption === opt.key ? "option-card-selected" : ""}`}
              onClick={() => setMethodOption(opt.key)}
            >
              <span className="option-title">{opt.title}</span>
              <span className="option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
        {amountOption === "epp" && (
          <p className="field-hint field-hint-block">EPP instalments are only available by credit card.</p>
        )}

        {formError && <div className="alert">{formError}</div>}

        <div className="confirm-row">
          <button className="btn" disabled={!canConfirm} onClick={handleConfirmClick}>
            {isProcessing && <span className="spinner" aria-hidden="true" />}
            {isProcessing ? "Processing…" : "Confirm & process payment"}
          </button>
        </div>
      </div>

      <AccountSelectModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onConfirm={handleConfirm}
        amountDue={amountDue}
        invoiceCurrency={invoiceCurrency}
        isProcessing={isProcessing}
      />
    </div>
  );
}
