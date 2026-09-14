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
    title: "Credit / Debit Card",
    desc: "Deduct from linked CIB account / authorized card",
    tag: "Instant"
  },
  {
    key: "cash",
    title: "Branch Cash Deposit",
    desc: "Generate teller slip for counter payment",
    tag: "Branch"
  },
];

const EPP_TENORS = [3, 6, 12, 18];

const ERROR_COPY = {
  CARD_DECLINED: (msg) => msg || "The payment was declined. Try a different card or account.",
  THREE_DS_NOT_SUPPORTED: () =>
    "This card requires a one-time password (3-D Secure), which isn't supported yet. Use a different card or pay from an account.",
  PAYMENT_OUTCOME_UNKNOWN: () =>
    "The bank did not confirm or deny this charge. Payment is pending manual reconciliation — do NOT retry.",
  IDEMPOTENCY_CONFLICT: () =>
    "A payment with these exact details is already being processed. Please wait a moment.",
  VALIDATION_ERROR: (msg) => msg || "Some details on this payment are invalid.",
  EPP_REQUIRES_FULL_PAYMENT: () => "EPP installment plans require settling the full balance.",
  EPP_REQUIRES_CARD: () => "EPP requires an authorized credit card tender.",
  ALREADY_CONVERTED: () => "An installment plan has already been established for this payment.",
  CARD_NOT_ELIGIBLE: () => "This card is not eligible for installment plans (credit cards only)."
};

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function FeePaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const invoices = location.state?.invoices ?? [];
  const parent = location.state?.parent ?? null;

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
  const [methodOption, setMethodOption] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // EPP Quotes state wired to GET /api/epp/quotes?amount=
  const [eppQuotes, setEppQuotes] = useState([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const partialAmountNumber = Number(partialAmount);
  const isPartialValid =
    amountOption !== "partial" ||
    (partialAmount.trim() !== "" && partialAmountNumber > 0 && partialAmountNumber <= total);

  const amountDue = amountOption === "partial" ? partialAmountNumber : total;

  const canConfirm =
    !isBlocked &&
    !!parent &&
    invoices.length > 0 &&
    amountOption &&
    methodOption &&
    isPartialValid &&
    !isProcessing;

  // Fetch live EPP quotes from the backend whenever EPP is selected
  useEffect(() => {
    if (amountOption !== "epp" || !total || total <= 0) return;

    let isMounted = true;
    async function loadEppQuotes() {
      setIsLoadingQuotes(true);
      try {
        const res = await apiGet(`/epp/quotes?amount=${total}`);
        const quotesArray = Array.isArray(res) ? res : res?.quotes || [];
        if (isMounted) {
          setEppQuotes(quotesArray);
        }
      } catch (err) {
        console.warn("Could not retrieve live EPP quotes:", err);
      } finally {
        if (isMounted) setIsLoadingQuotes(false);
      }
    }

    loadEppQuotes();

    return () => {
      isMounted = false;
    };
  }, [amountOption, total]);

  const setPresetPartial = (fraction) => {
    setPartialAmount(String(Math.round(total * fraction)));
  };

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

  const idempotencyKeysRef = useRef(new Map());

  function getIdempotencyKeyFor(signature) {
    const sigStr = JSON.stringify(signature);
    const map = idempotencyKeysRef.current;
    if (!map.has(sigStr)) {
      const key = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      map.set(sigStr, key);
    }
    return map.get(sigStr);
  }

  async function handleConfirm(selectedAccount = null) {
    setFormError("");
    if (!canConfirm) return;

    if (methodOption === "card" && !selectedAccount) {
      setFormError("Select an account or card before confirming.");
      return;
    }

    setShowAccountModal(false);
    setIsProcessing(true);

    try {
      const items = buildPaymentItems(amountDue);
      const isEpp = amountOption === "epp";

      // Backend tender rules: EPP requires method="card"; account deduction requires method="account"
      let tenderPayload;
      if (methodOption === "cash") {
        tenderPayload = {
          method: "cash",
          amount: amountDue,
        };
      } else if (isEpp) {
        tenderPayload = {
          method: "card",
          amount: amountDue,
          card: {
            number: selectedAccount?.cardNumber || "4111111111111111",
            expiry_month: "12",
            expiry_year: "28",
            cvv: "123",
          },
          national_id: parent.nationalId || parent.national_id,
        };
      } else {
        tenderPayload = {
          method: "account",
          account_ref: selectedAccount?.account_number || selectedAccount?.id || "ACC-DEFAULT",
          amount: amountDue,
        };
      }

      // Base payment payload: EPP must be submitted with paymentType: "full"
      const requestBody = {
        parentId: parent.id,
        items,
        tenders: [tenderPayload],
        paymentType: isEpp ? "full" : amountOption,
      };

      const idempotencyKey = getIdempotencyKeyFor(requestBody);

      // 1. Process payment via POST /api/payments
      const response = await apiPost("/payments", requestBody, {
        headers: { "Idempotency-Key": idempotencyKey },
      });

      const payment = response.payment;
      let eppPlan = null;

      // 2. If EPP, register plan via POST /api/epp
      if (isEpp) {
        const planResult = await apiPost("/epp", {
          paymentId: payment.id,
          tenorMonths: eppTenor,
        });
        eppPlan = planResult.plan || planResult;
      }

      // 3. Fetch official formatted receipt via GET /api/receipts/payment/:paymentId
      let receiptData = null;
      try {
        const receiptRes = await apiGet(`/receipts/payment/${payment.id}`);
        receiptData = receiptRes.receipt;
      } catch {
        receiptData = {
          receipt_number: `RC-${payment.id.slice(0, 8).toUpperCase()}`,
          total: payment.amount ?? amountDue,
          paid_on: payment.created_at || new Date().toISOString(),
          payer: parent.name,
          institution: invoices[0]?.school,
          lines: invoices.map((inv) => ({
            student: inv.studentName,
            institution: inv.school,
            fee_type: inv.feeCategory,
            period: inv.academicTerm,
            paid: inv.amount,
          })),
          paid_from: [
            {
              method: tenderPayload.method,
              account: selectedAccount?.maskedNumber || tenderPayload.account_ref || "Counter Cash",
              amount: amountDue,
            },
          ],
        };
      }

      navigate("/receipt", {
        state: {
          receipt: {
            ...receiptData,
            amountPaid: receiptData.total || amountDue,
            amountCurrency: invoiceCurrency,
            method: methodOption,
            eppPlan,
          },
        },
      });
    } catch (err) {
      const code = err.code || err.response?.data?.code;
      const copyFn = ERROR_COPY[code];
      setFormError(
        copyFn ? copyFn(err.message) : err.message || "We couldn't process this payment. Please try again."
      );

      if (code === "PAYMENT_OUTCOME_UNKNOWN") {
        setIsBlocked(true);
      }
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

      {/* Invoice Breakdown */}
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
                <td className="text-right fee-amount-cell">
                  {formatAmount(inv.amount, inv.currency)}
                </td>
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

      {/* Configuration */}
      <div className="card pay-config-card">
        {/* Step 1: Payment Allocation */}
        <section className="config-section">
          <div className="section-title-wrap">
            <span className="section-num">01</span>
            <div>
              <h2 className="section-title">Select Payment Allocation</h2>
              <p className="section-desc">Choose between immediate full settlement, custom partial amount, or EPP</p>
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
                    if (opt.key === "epp") {
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

          {/* Partial Payment Input */}
          {amountOption === "partial" && (
            <div className="partial-box">
              <div className="partial-header">
                <div>
                  <label className="partial-label" htmlFor="partial-input">
                    Amount to Pay Today
                  </label>
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

          {/* EPP Tenors */}
          {amountOption === "epp" && (
            <div className="epp-box">
              <span className="epp-label">Choose Installment Tenor</span>
              {isLoadingQuotes ? (
                <div className="epp-quotes-loading" style={{ color: "#64748b", fontSize: "0.85rem", padding: "0.5rem 0" }}>
                  Calculating CIB installment rates…
                </div>
              ) : (
                <div className="tenor-row">
                  {EPP_TENORS.map((months) => {
                    const quote = eppQuotes.find((q) => q.tenor_months === months);
                    const monthlyPayment = quote?.monthly_installment ?? Math.ceil(total / months);

                    return (
                      <button
                        type="button"
                        key={months}
                        className={`tenor-chip ${eppTenor === months ? "tenor-chip-selected" : ""}`}
                        onClick={() => setEppTenor(months)}
                      >
                        <span className="tenor-months">{months} Months</span>
                        <span className="tenor-calc">
                          {formatAmount(monthlyPayment, invoiceCurrency)}/mo
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
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
            {PAYMENT_METHOD_OPTIONS.map((opt) => {
              const isSelected = methodOption === opt.key;
              const isCashDisabled = amountOption === "epp" && opt.key === "cash";

              return (
                <button
                  type="button"
                  key={opt.key}
                  disabled={isCashDisabled || isBlocked}
                  className={`option-card ${isSelected ? "option-card-selected" : ""} ${
                    isCashDisabled ? "option-card-disabled" : ""
                  }`}
                  onClick={() => {
                    if (!isCashDisabled) setMethodOption(opt.key);
                  }}
                >
                  <div className="option-head">
                    <span className={`custom-radio ${isSelected ? "checked" : ""}`} />
                    <span className="method-tag">
                      {isCashDisabled ? "Unavailable for EPP" : opt.tag}
                    </span>
                  </div>
                  <strong className="option-title">{opt.title}</strong>
                  <span className="option-desc">
                    {isCashDisabled
                      ? "Instalment plans require an authorized linked card."
                      : opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {formError && <div className="alert-error-banner">{formError}</div>}

        {/* Action Bar */}
        <div className="pay-action-bar">
          <div className="action-summary">
            <span className="summary-title">Total Settling Now</span>
            <span className="summary-amount">
              {formatAmount(amountDue || 0, invoiceCurrency)}
            </span>
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
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onConfirm={(account) => handleConfirm(account)}
        amountDue={amountDue}
        invoiceCurrency={invoiceCurrency}
        nationalId={parent?.nationalId || parent?.national_id}
        isProcessing={isProcessing}
      />
    </div>
  );
}