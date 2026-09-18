import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import AccountSelectModal from "../components/AccountSelectModal";
import "./shared.css";
import "../Styles/FeePaymentPage.css";

const PAYMENT_AMOUNT_OPTIONS = [
  {
    key: "full",
    title: "Full Settlement",
    badge: "Recommended",
    desc: (total, currency) => `Clear entire outstanding balance (${currency} ${total.toLocaleString()})`,
  },
  {
    key: "partial",
    title: "Custom Partial Amount",
    badge: "Flexible",
    desc: () => "Choose a custom amount to pay towards balance today",
  },
  {
    key: "epp",
    title: "CIB Easy Payment Plan",
    badge: "Instalments",
    desc: () => "Split payment into 3, 6, 12 or 18 monthly instalments · credit card only",
  },
];

const PAYMENT_METHOD_OPTIONS = [
  {
    key: "transfer",
    tenderMethod: "account",
    title: "Bank Transfer",
    desc: "Deduct from one of the customer's CIB accounts",
    tag: "Same-bank",
  },
  {
    key: "card",
    tenderMethod: "card",
    title: "Credit / Debit Card",
    desc: "Charge one of the customer's cards",
    tag: "Instant",
  },
  {
    key: "cash",
    tenderMethod: "cash",
    title: "Branch Cash Deposit",
    desc: "Handed over at the counter",
    tag: "Branch",
  },
];

const EPP_TENORS = [3, 6, 12, 18];
const EPP_MIN_AMOUNT = 1000;
const EPP_MAX_AMOUNT = 500000;

const ERROR_COPY = {
  CARD_DECLINED: (msg) => msg || "The payment was declined. Try a different card or account.",
  THREE_DS_NOT_SUPPORTED: () =>
    "This card requires a one-time password (3-D Secure), which isn't supported yet. Use a different card, or pay by bank transfer.",
  PAYMENT_OUTCOME_UNKNOWN: () =>
    "The bank didn't confirm or deny this charge, so the money may already have moved. Do NOT retry — this payment is pending manual reconciliation.",
  IDEMPOTENCY_CONFLICT: () =>
    "This payment reference has already been used for different details. Refresh the page and start again.",
  VALIDATION_ERROR: (msg) => msg || "Some details on this payment are invalid.",
  BANK_REJECTED_REQUEST: (msg) => msg || "The bank rejected this charge.",
  EPP_REQUIRES_FULL_PAYMENT: () => "Instalment plans need the full balance settled in one card payment.",
  EPP_REQUIRES_CARD: () => "Instalment plans can only be created from a card payment.",
  PAYMENT_NOT_CONVERTIBLE: (msg) => msg || "This payment can't be converted to instalments.",
  ALREADY_CONVERTED: () => "This payment already has an instalment plan.",
  CARD_NOT_ELIGIBLE: () => "That card isn't eligible for instalments — credit cards only.",
  UNSUPPORTED_TENOR: (msg) => msg || "That instalment length isn't available.",
};

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function FeePaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const invoices = location.state?.invoices ?? [];
  const parent = location.state?.parent ?? null;
  const nationalId = location.state?.nationalId ?? parent?.nationalId ?? parent?.national_id ?? null;

  const total = useMemo(() => invoices.reduce((sum, inv) => sum + inv.amount, 0), [invoices]);

  const invoiceCurrencies = useMemo(
    () => [...new Set(invoices.map((inv) => inv.currency || "EGP"))],
    [invoices]
  );
  const hasMixedInvoiceCurrencies = invoiceCurrencies.length > 1;
  const invoiceCurrency = invoiceCurrencies[0] || "EGP";

  const [amountOption, setAmountOption] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [eppTenor, setEppTenor] = useState(EPP_TENORS[2]);
  const [methodOption, setMethodOption] = useState("transfer");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [eppQuotes, setEppQuotes] = useState([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const idempotencyKeyRef = useRef(
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const partialAmountNumber = Number(partialAmount);
  const isPartialValid =
    amountOption !== "partial" ||
    (partialAmount.trim() !== "" && partialAmountNumber > 0 && partialAmountNumber <= total);

  const amountDue = amountOption === "partial" ? partialAmountNumber : total;
  const isEpp = amountOption === "epp";

  const isEppEligibleAmount = total >= EPP_MIN_AMOUNT && total <= EPP_MAX_AMOUNT;

  const methodOptions = isEpp
    ? PAYMENT_METHOD_OPTIONS.filter((opt) => opt.key === "card")
    : PAYMENT_METHOD_OPTIONS;

  const activeMethod = PAYMENT_METHOD_OPTIONS.find((opt) => opt.key === methodOption);

  const canConfirm =
    !isBlocked &&
    !!parent &&
    invoices.length > 0 &&
    !!activeMethod &&
    isPartialValid &&
    amountDue > 0 &&
    (!isEpp || isEppEligibleAmount) &&
    !isProcessing;

  useEffect(() => {
    if (!isEpp || !total || !isEppEligibleAmount) return;

    let isMounted = true;
    setIsLoadingQuotes(true);

    apiGet(`/epp/quotes?amount=${total}`)
      .then((res) => {
        if (!isMounted) return;
        setEppQuotes(Array.isArray(res) ? res : res?.quotes || res?.options || []);
      })
      .catch((err) => {
        console.warn("Couldn't load EPP quotes:", err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingQuotes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isEpp, total, isEppEligibleAmount]);

  const setPresetPartial = (fraction) => setPartialAmount(String(Math.round(total * fraction)));

  function buildPaymentItems(allocatedTotal) {
    let remaining = allocatedTotal;
    return invoices.map((inv, idx) => {
      if (idx === invoices.length - 1) {
        return { fee_id: inv.id, amount: remaining };
      }
      const proportional = Math.min(inv.amount, Math.round((inv.amount / total) * allocatedTotal));
      remaining -= proportional;
      return { fee_id: inv.id, amount: proportional };
    });
  }

  function buildTender(source) {
    const amount = amountDue;

    if (activeMethod.tenderMethod === "cash") {
      return { method: "cash", amount };
    }

    if (activeMethod.tenderMethod === "account") {
      return { method: "account", account_ref: source.accountRef, amount };
    }

    return {
      method: "card",
      amount,
      card: source.card,
      national_id: nationalId || undefined,
      mobile: source.mobile,
    };
  }

  async function handleConfirm(source = null) {
    setFormError("");
    if (!canConfirm) return;

    if (isEpp && !isEppEligibleAmount) {
      setFormError(`EPP is available between ${EPP_MIN_AMOUNT} and ${EPP_MAX_AMOUNT.toLocaleString()} EGP.`);
      return;
    }

    if (activeMethod.tenderMethod !== "cash" && !source) {
      setFormError("Choose a funding source before confirming.");
      return;
    }

    setShowSourceModal(false);
    setIsProcessing(true);

    try {
      const requestBody = {
        parentId: parent.id,
        items: buildPaymentItems(amountDue),
        tenders: [buildTender(source)],
        paymentType: isEpp ? "full" : amountOption,
      };

      const response = await apiPost("/payments", requestBody, {
        headers: { "Idempotency-Key": idempotencyKeyRef.current },
      });

      const payment = response.payment;
      let eppPlan = null;

      if (isEpp) {
        try {
          eppPlan = await apiPost("/epp", { paymentId: payment.id, tenorMonths: eppTenor });
        } catch (planErr) {
          const copy = ERROR_COPY[planErr.code];
          setFormError(
            copy ? copy(planErr.message) : planErr.message || "EPP setup failed. Payment was completed."
          );
          return;
        }
      }

      let receiptData;
      try {
        const receiptRes = await apiGet(`/receipts/payment/${payment.id}`);
        receiptData = receiptRes.receipt;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 600));
        try {
          const retryRes = await apiGet(`/receipts/payment/${payment.id}`);
          receiptData = retryRes.receipt;
        } catch {
          receiptData = null;
        }
      }

      navigate("/receipt", {
        state: {
          receipt: receiptData,
          fallbackPayment: receiptData ? null : payment,
          eppPlan,
        },
      });
    } catch (err) {
      const copyFn = ERROR_COPY[err.code];
      setFormError(copyFn ? copyFn(err.message) : err.message || "We couldn't process this payment.");

      if (err.code === "PAYMENT_OUTCOME_UNKNOWN") {
        setIsBlocked(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirmClick() {
    if (!canConfirm) return;

    if (activeMethod.tenderMethod === "cash") {
      handleConfirm();
      return;
    }

    setShowSourceModal(true);
  }

  if (invoices.length === 0) {
    return (
      <div className="page pay-container">
        <h1 className="page-title">Fee Payment</h1>
        <div className="placeholder-card">
          No invoices selected. Head back to <Link to="/browse">Browse</Link> to select fee items.
        </div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="page pay-container">
        <h1 className="page-title">Fee Payment</h1>
        <div className="placeholder-card">
          Missing payer record. Head back to <Link to="/browse">Browse</Link> and search again.
        </div>
      </div>
    );
  }

  return (
    <div className="page pay-container">
      <div className="pay-header">
        <div>
          <h1 className="page-title">Tuition Settlement</h1>
          <p className="page-subtitle">Review invoice breakdown and complete settlement.</p>
        </div>
        <div className="pay-invoice-pill">
          {invoices.length} {invoices.length === 1 ? "Item" : "Items"} Selected
        </div>
      </div>

      <div className="card fee-summary-card">
        <div className="summary-card-header">
          <span className="summary-heading">Selected Outstanding Fees</span>
          {parent?.name && <span className="parent-tag">Parent: {parent.name}</span>}
        </div>

        <table className="fee-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Fee Category</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="student-name-cell">{inv.studentName}</td>
                <td><span className="fee-badge">{inv.feeCategory}</span></td>
                <td className="text-right fee-amount-cell">{formatAmount(inv.amount, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals-row">
          <span className="totals-label">TOTAL BALANCE DUE</span>
          <span className="totals-amount">
            {hasMixedInvoiceCurrencies ? "Multi-currency" : formatAmount(total, invoiceCurrency)}
          </span>
        </div>
      </div>

      <div className="card pay-config-card">
        <section className="config-section">
          <div className="section-title-wrap">
            <span className="section-num">01</span>
            <div>
              <h2 className="section-title">Select Payment Allocation</h2>
              <p className="section-desc">Full settlement, a custom partial amount, or instalments</p>
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
                  disabled={isBlocked}
                  onClick={() => {
                    setAmountOption(opt.key);
                    if (opt.key === "epp") setMethodOption("card");
                  }}
                >
                  <div className="option-head">
                    <span className={`custom-radio ${isSelected ? "checked" : ""}`} />
                    <span className="option-badge">{opt.badge}</span>
                  </div>
                  <strong className="option-title">{opt.title}</strong>
                  <span className="option-desc">{opt.desc(total, invoiceCurrency)}</span>
                </button>
              );
            })}
          </div>

          {amountOption === "partial" && (
            <div className="partial-box">
              <div className="partial-header">
                <div>
                  <label className="partial-label" htmlFor="partial-input">Amount to Pay Today</label>
                  <span className="partial-sub">Maximum balance: {formatAmount(total, invoiceCurrency)}</span>
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
                  Please enter an amount between 1 and {formatAmount(total, invoiceCurrency)}.
                </div>
              )}
            </div>
          )}

          {isEpp && (
            <div className="epp-box">
              <span className="epp-label">Choose Installment Tenor</span>

              {!isEppEligibleAmount ? (
                <div className="field-error-bar" style={{ marginTop: "0.5rem" }}>
                  EPP is available between {formatAmount(EPP_MIN_AMOUNT, invoiceCurrency)} and {formatAmount(EPP_MAX_AMOUNT, invoiceCurrency)}. Total balance of {formatAmount(total, invoiceCurrency)} is ineligible.
                </div>
              ) : isLoadingQuotes ? (
                <p className="field-hint">Loading CIB instalment rates…</p>
              ) : (
                <div className="tenor-row">
                  {EPP_TENORS.map((months) => {
                    const quote = eppQuotes.find(
                      (q) => (q.tenor_months ?? q.tenorMonths) === months
                    );
                    const monthly =
                      quote?.monthly_installment ?? quote?.monthlyInstalment ?? Math.ceil(total / months);

                    return (
                      <button
                        type="button"
                        key={months}
                        className={`tenor-chip ${eppTenor === months ? "tenor-chip-selected" : ""}`}
                        onClick={() => setEppTenor(months)}
                      >
                        <span className="tenor-months">{months} Months</span>
                        <span className="tenor-calc">
                          {formatAmount(monthly, invoiceCurrency)}/mo{!quote && " (est.)"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="field-hint field-hint-block">
                The full balance is charged to the card now, then converted into instalments.
              </p>
            </div>
          )}
        </section>

        <hr className="config-divider" />

        <section className="config-section">
          <div className="section-title-wrap">
            <span className="section-num">02</span>
            <div>
              <h2 className="section-title">Payment Method</h2>
              <p className="section-desc">Where the money comes from</p>
            </div>
          </div>

          <div className="option-grid option-grid-3">
            {methodOptions.map((opt) => {
              const isSelected = methodOption === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  disabled={isBlocked}
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

          {isEpp && (
            <p className="field-hint field-hint-block">
              Instalment plans are credit-card only, so bank transfer and cash aren't available here.
            </p>
          )}
        </section>

        {formError && <div className="alert-error-banner">{formError}</div>}

        <div className="pay-action-bar">
          <div className="action-summary">
            <span className="summary-title">Total Settling Now</span>
            <span className="summary-amount">{formatAmount(amountDue || 0, invoiceCurrency)}</span>
          </div>

          <button
            type="button"
            className="btn-simple-confirm"
            disabled={!canConfirm}
            onClick={handleConfirmClick}
          >
            {isProcessing ? "Processing Payment…" : "Confirm & Process Payment"}
          </button>
        </div>
      </div>

      <AccountSelectModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onConfirm={(source) => handleConfirm(source)}
        amountDue={amountDue}
        invoiceCurrency={invoiceCurrency}
        nationalId={nationalId}
        mode={activeMethod?.tenderMethod === "card" ? "card" : "account"}
        requireCreditCard={isEpp}
        isProcessing={isProcessing}
      />
    </div>
  );
}