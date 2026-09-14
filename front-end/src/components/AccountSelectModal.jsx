import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import "../Styles/FeePaymentPage.css";
import "./AccountSelectModal.css";

function formatAmount(amount, currency = "EGP") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function AccountSelectModal({
  isOpen,
  onClose,
  onConfirm,
  amountDue,
  invoiceCurrency = "EGP",
  nationalId,
  isProcessing = false,
}) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedAccount(null);
      setFetchError("");
      return;
    }

    if (!nationalId) {
      setFetchError("Guardian National ID is missing. Please search again.");
      return;
    }

    let isMounted = true;

    async function loadAccounts() {
      setIsLoading(true);
      setFetchError("");
      try {
        // Matches searchById.routes.js GET /customers/:nationalId/accounts under /api/bank
        const res = await apiGet(`/bank/customers/${nationalId}/accounts`);
        const accountList = res?.accounts || [];
        const cardList = res?.cards || [];

        if (isMounted) {
          // Map accounts and cards returned by getCustomerAccounts()
          const combined = [
            ...accountList.map((acc, idx) => ({
              id: acc.account_id || `acc-${idx}`,
              account_ref: acc.account_id,
              type: acc.type === "CURRENT" ? "Current / Checking" : "Savings",
              maskedNumber: acc.iban_masked || "•••• 0000",
              balance: 50000, // Simulated available balance
              currency: acc.currency || "EGP",
              category: "account",
            })),
            ...cardList.map((card, idx) => ({
              id: card.card_id || `card-${idx}`,
              account_ref: card.masked_number,
              type: `${card.type} Card (${card.scheme})`,
              maskedNumber: card.masked_number,
              balance: 100000,
              currency: "EGP",
              category: "card",
            })),
          ];

          setAccounts(combined);
          if (combined.length > 0) {
            setSelectedAccount(combined[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || "Failed to retrieve linked CIB accounts.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAccounts();

    return () => {
      isMounted = false;
    };
  }, [isOpen, nationalId]);

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={() => !isProcessing && onClose()}>
      <div
        className="account-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="account-modal-title">Select account to deduct from</h2>
        <p className="account-modal-subheading">
          {formatAmount(amountDue, invoiceCurrency)} due
        </p>

        {isLoading ? (
          <div className="account-modal-loading" style={{ padding: "2rem", textAlign: "center" }}>
            <span className="spinner" aria-hidden="true" />
            <p style={{ marginTop: "0.5rem", color: "#64748b" }}>Loading linked accounts…</p>
          </div>
        ) : fetchError ? (
          <div className="alert-error-banner" style={{ margin: "1rem 0" }}>{fetchError}</div>
        ) : accounts.length === 0 ? (
          <div className="placeholder-card">No linked accounts found for this customer.</div>
        ) : (
          <div className="account-modal-list">
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  className={`option-card account-option ${isSelected ? "option-card-selected" : ""}`}
                  onClick={() => setSelectedAccount(account)}
                  disabled={isProcessing}
                >
                  <span className="option-title account-option-title">
                    {account.type}
                    <span className="currency-match-badge">Matches invoice currency</span>
                  </span>
                  <span className="option-desc">{account.maskedNumber}</span>
                  <span className="option-desc account-balance">
                    {formatAmount(account.balance, account.currency)} available
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="account-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(selectedAccount)}
            disabled={!selectedAccount || isProcessing || isLoading}
          >
            {isProcessing ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}