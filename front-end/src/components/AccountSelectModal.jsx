import { useState } from "react";
import "../Styles/FeePaymentPage.css";
import "./AccountSelectModal.css";

// ---------------------------------------------------------------------------
// PLACEHOLDER DATA — replace with a real fetch once the endpoint is ready:
//   GET /api/customers/:nationalId/accounts
// Shape to preserve: { id, type, maskedNumber, balance, currency }
// ---------------------------------------------------------------------------
const PLACEHOLDER_ACCOUNTS = [
  { id: "acc-1", type: "Savings", maskedNumber: "•••• 4821", balance: 42300, currency: "EGP" },
  { id: "acc-2", type: "Current / Checking", maskedNumber: "•••• 1190", balance: 3400, currency: "USD" },
  { id: "acc-3", type: "Current / Checking", maskedNumber: "•••• 7702", balance: 900, currency: "EUR" },
];

function formatAmount(amount, currency) {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function AccountSelectModal({
  isOpen,
  onClose,
  onConfirm,
  amountDue,
  invoiceCurrency,
  isProcessing = false,
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  if (!isOpen) return null;

  const selectedAccount = PLACEHOLDER_ACCOUNTS.find((account) => account.id === selectedAccountId);
  const showConversionNote =
    selectedAccount && selectedAccount.currency !== invoiceCurrency;

  function handleClose() {
    if (isProcessing) return;
    setSelectedAccountId(null);
    onClose();
  }

  function handleConfirm() {
    if (!selectedAccount || isProcessing) return;
    onConfirm(selectedAccount);
    setSelectedAccountId(null);
  }

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div
        className="account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="account-modal-title" className="account-modal-title">
          Select account to deduct from
        </h2>
        <p className="account-modal-subheading">
          {formatAmount(amountDue, invoiceCurrency)} due
        </p>

        <div className="account-modal-list">
          {PLACEHOLDER_ACCOUNTS.map((account) => {
            const matchesCurrency = account.currency === invoiceCurrency;
            return (
              <button
                key={account.id}
                type="button"
                className={`option-card account-option ${
                  selectedAccountId === account.id ? "option-card-selected" : ""
                }`}
                onClick={() => setSelectedAccountId(account.id)}
                disabled={isProcessing}
              >
                <span className="option-title account-option-title">
                  {account.type}
                  {matchesCurrency && (
                    <span className="currency-match-badge">Matches invoice currency</span>
                  )}
                </span>
                <span className="option-desc">{account.maskedNumber}</span>
                <span className="option-desc account-balance">
                  {formatAmount(account.balance, account.currency)} available
                </span>
              </button>
            );
          })}
        </div>

        {showConversionNote && (
          <p className="account-conversion-note">
            This will be converted from {selectedAccount.currency} to {invoiceCurrency} at the
            prevailing exchange rate.
            {/* TODO: wire in a real FX rate lookup before processing cross-currency deductions. */}
          </p>
        )}

        <div className="account-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleConfirm}
            disabled={!selectedAccountId || isProcessing}
          >
            {isProcessing && <span className="spinner" aria-hidden="true" />}
            {isProcessing ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
