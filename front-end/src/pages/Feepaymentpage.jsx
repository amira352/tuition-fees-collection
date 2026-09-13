import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AccountSelectModal from "../components/AccountSelectModal";
import "./shared.css";
import "../Styles/FeePaymentPage.css";

const PAYMENT_AMOUNT_OPTIONS = [
  {
    key: "full",
    title: "Full Settlement",
    badge: "Recommended",
    desc: (total, currency) => `Clear entire outstanding balance (${currency} ${total.toLocaleString()})`
  },
  {
    key: "partial",
    title: "Custom Partial Amount",
    badge: "Flexible",
    desc: () => "Choose a custom amount to pay towards balance today"
  },
  {
    key: "epp",
    title: "CIB Easy Payment Plan",
    badge: "0% Interest Options",
    desc: () => "Split payment into 3, 6, 12 or 18 equal monthly instalments"
  },
];

const PAYMENT_METHOD_OPTIONS = [
  {
    key: "card",
    title: "CIB Credit / Debit Card",
    desc: "Instant direct debit from verified linked client account",
    tag: "Instant"
  },
  {
    key: "cash",
    title: "Branch Cash Deposit",
    desc: "Generate reference slip for teller counter payment",
    tag: "Branch"
  },
];

const EPP_TENORS = [3, 6, 12, 18];

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function FeePaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const invoices = location.state?.invoices ?? [];
  const total = useMemo(() => invoices.reduce((sum, inv) => sum + inv.amount, 0), [invoices]);

  const invoiceCurrencies = useMemo(
    () => [...new Set(invoices.map((inv) => inv.currency || "EGP"))],
    [invoices],
  );
  const hasMixedInvoiceCurrencies = invoiceCurrencies.length > 1;
  const invoiceCurrency = invoiceCurrencies[0] || "EGP";

  const [amountOption, setAmountOption] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [eppTenor, setEppTenor] = useState(EPP_TENORS[2]);
  const [methodOption, setMethodOption] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);

  const partialAmountNumber = Number(partialAmount);
  const isPartialValid =
    amountOption !== "partial" ||
    (partialAmount.trim() !== "" && partialAmountNumber > 0 && partialAmountNumber <= total);

  const amountDue = amountOption === "partial" ? partialAmountNumber : total;

  const methodOptionsForAmount =
    amountOption === "epp"
      ? PAYMENT_METHOD_OPTIONS.filter((m) => m.key === "card")
      : PAYMENT_METHOD_OPTIONS;

  const canConfirm =
    invoices.length > 0 && amountOption && methodOption && isPartialValid && !isProcessing;

  const setPresetPartial = (fraction) => {
    setPartialAmount(String(Math.round(total * fraction)));
  };

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

      await new Promise((resolve) => setTimeout(resolve, 700));
      const receipt = {
        receiptNumber: "RC-" + Math.floor(1000000 + Math.random() * 9000000),
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
      <div className="page pay-container">
        <h1 className="page-title">Fee Payment</h1>
        <div className="placeholder-card">
          No invoices selected. Head back to{" "}
          <Link to="/browse">Browse</Link> to select fee items.
        </div>
      </div>
    );
  }

  return (
    <div className="page pay-container">
      {/* Top Breadcrumb / Status Header */}
      <div className="pay-header">
        <div>
          <span className="pay-kicker">CIB Checkout Portal</span>
          <h1 className="page-title">Tuition Settlement</h1>
        </div>
        <div className="pay-invoice-pill">
          <span>{invoices.length} Item{invoices.length > 1 ? "s" : ""} Selected</span>
        </div>
      </div>

      {/* Invoice Breakdown Banner */}
      <div className="cib-pay-hero">
        <div className="cib-pay-hero-details">
          <span className="hero-eyebrow">Settlement Summary</span>
          <div className="hero-students">
            {invoices.map((inv) => (
              <span key={inv.id} className="student-chip">
                {inv.studentName} · <strong>{inv.feeCategory}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="cib-pay-hero-due">
          <span className="due-label">Total Balance Due</span>
          <span className="due-value">
            {hasMixedInvoiceCurrencies ? "Multi-currency" : formatAmount(total, invoiceCurrency)}
          </span>
        </div>
      </div>

      {/* Payment Configuration Card */}
      <div className="cib-config-card">
        {/* Step 1: Amount Option */}
        <section className="config-section">
          <div className="section-title-wrap">
            <span className="section-num">01</span>
            <div>
              <h2 className="section-title">Select Payment Allocation</h2>
              <p className="section-desc">Choose between immediate full settlement, custom installment, or EPP</p>
            </div>
          </div>

          <div className="option-grid option-grid-3">
            {PAYMENT_AMOUNT_OPTIONS.map((opt) => {
              const isSelected = amountOption === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  className={`option-card ${isSelected ? "option-card-selected" : ""}`}
                  onClick={() => {
                    setAmountOption(opt.key);
                    if (opt.key === "epp" && methodOption && methodOption !== "card") {
                      setMethodOption("card");
                    }
                  }}
                >
                  <div className="option-head">
                    <span className={`custom-radio ${isSelected ? "checked" : ""}`} />
                    <span className="option-badge">{opt.badge}</span>
                  </div>
                  <strong className="option-title">{opt.title}</strong>
                  <span className="option-desc">
                    {opt.desc(total, invoiceCurrency)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Partial Payment Highlight Box */}
          {amountOption === "partial" && (
            <div className="partial-box">
              <div className="partial-header">
                <div>
                  <label className="partial-label" htmlFor="partial-input">
                    Enter Amount to Settle Today
                  </label>
                  <span className="partial-sub">Maximum payable: {formatAmount(total, invoiceCurrency)}</span>
                </div>

                <div className="preset-chips">
                  <button type="button" onClick={() => setPresetPartial(0.25)}>25%</button>
                  <button type="button" onClick={() => setPresetPartial(0.5)}>50%</button>
                  <button type="button" onClick={() => setPresetPartial(0.75)}>75%</button>
                </div>
              </div>

              <div className="partial-input-wrap">
                <span className="currency-tag">{invoiceCurrency}</span>
                <input
                  id="partial-input"
                  type="number"
                  className="partial-hero-input"
                  min="1"
                  max={total}
                  placeholder="0.00"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  autoFocus
                />
              </div>

              {partialAmount.trim() !== "" && !isPartialValid && (
                <div className="field-error-bar">
                  Please enter an amount greater than 0 and not exceeding {formatAmount(total, invoiceCurrency)}.
                </div>
              )}
            </div>
          )}

          {/* EPP Tenors Highlight Box */}
          {amountOption === "epp" && (
            <div className="epp-box">
              <span className="epp-label">Choose Installment Tenor (Months)</span>
              <div className="tenor-row">
                {EPP_TENORS.map((months) => (
                  <button
                    type="button"
                    key={months}
                    className={`tenor-chip ${eppTenor === months ? "tenor-chip-selected" : ""}`}
                    onClick={() => setEppTenor(months)}
                  >
                    <span className="tenor-months">{months} Months</span>
                    <span className="tenor-calc">
                      {formatAmount(Math.ceil(total / months), invoiceCurrency)}/mo
                    </span>
                  </button>
                ))}
              </div>
              <p className="epp-note">
                0% interest applies to select CIB Platinum and Titanium Credit Cards.
              </p>
            </div>
          )}
        </section>

        <hr className="config-divider" />

        {/* Step 2: Payment Method */}
        <section className="config-section">
          <div className="section-title-wrap">
            <span className="section-num">02</span>
            <div>
              <h2 className="section-title">Payment Method</h2>
              <p className="section-desc">Select customer preferred settlement channel</p>
            </div>
          </div>

          <div className="option-grid option-grid-2">
            {methodOptionsForAmount.map((opt) => {
              const isSelected = methodOption === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  className={`option-card ${isSelected ? "option-card-selected" : ""}`}
                  onClick={() => setMethodOption(opt.key)}
                >
                  <div className="option-head">
                    <span className={`custom-radio ${isSelected ? "checked" : ""}`} />
                    <span className="method-tag">{opt.tag}</span>
                  </div>
                  <strong className="option-title">{opt.title}</strong>
                  <span className="option-desc">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {formError && <div className="alert-error-banner">{formError}</div>}

        {/* Bottom CTA Bar */}
        <div className="pay-action-bar">
          <div className="action-summary">
            <span className="summary-title">Total Settling Now:</span>
            <span className="summary-amount">
              {formatAmount(amountDue || 0, invoiceCurrency)}
            </span>
          </div>

          <button
            type="button"
            className="btn-cib-confirm"
            disabled={!canConfirm}
            onClick={handleConfirmClick}
          >
            {isProcessing ? (
              <span>Authorizing Transaction…</span>
            ) : (
              <>
                <span>Confirm & Process Payment</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
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