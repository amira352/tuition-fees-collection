import { useEffect, useMemo, useState } from "react";
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
  mode = "account", // "account" | "card"
  requireCreditCard = false,
  isProcessing = false,
}) {
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [customerCards, setCustomerCards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setFetchError("");
      return;
    }

    if (!nationalId) {
      setFetchError("Customer National ID is missing.");
      return;
    }

    let isMounted = true;
    async function loadCustomerInstruments() {
      setIsLoading(true);
      setFetchError("");
      try {
        const res = await apiGet(`/bank/customers/${nationalId}/accounts`);
        if (isMounted) {
          setCustomerAccounts(Array.isArray(res?.accounts) ? res.accounts : []);
          setCustomerCards(Array.isArray(res?.cards) ? res.cards : []);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || "Failed to retrieve linked CIB records.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCustomerInstruments();
    return () => {
      isMounted = false;
    };
  }, [isOpen, nationalId]);

  const items = useMemo(() => {
    if (mode === "account") {
      return customerAccounts.map((acc, idx) => {
        const balanceVal = acc.available_balance ?? acc.balance ?? null;
        return {
          id: acc.account_id || acc.id || `acc-${idx}`,
          title: acc.type === "CURRENT" ? "Current Account" : "Savings Account",
          subtitle: acc.iban_masked || acc.account_number || "•••• 0000",
          amount: balanceVal !== null ? Number(balanceVal) : null,
          label: "Available balance",
          currency: acc.currency || "EGP",
          kind: "account",
        };
      });
    }

    return customerCards
      .filter((c) => (requireCreditCard ? String(c.type || "").toUpperCase() === "CREDIT" : true))
      .map((card, idx) => {
        const limitVal =
          card.available_limit ??
          card.credit_limit ??
          card.limit ??
          card.balance ??
          null;

        const isCredit = String(card.type || "").toUpperCase() === "CREDIT";

        return {
          id: card.card_id || card.id || `card-${idx}`,
          title: `${card.type || "Credit"} Card (${card.scheme || "CIB"})`,
          subtitle: card.masked_number || "•••• 0000",
          amount: limitVal !== null ? Number(limitVal) : null,
          label: isCredit ? "Available limit" : "Available balance",
          currency: card.currency || "EGP",
          kind: "card",
        };
      });
  }, [mode, requireCreditCard, customerAccounts, customerCards]);

  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === selectedId);

  function handleSelectAndConfirm() {
    if (!selectedItem || isProcessing) return;

    onConfirm({
      kind: selectedItem.kind,
      sourceId: selectedItem.id,
      maskedNumber: selectedItem.subtitle,
    });
  }

  return (
    <div className="account-modal-overlay" onClick={() => !isProcessing && onClose()}>
      <div
        className="account-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="account-modal-title">
          {mode === "card"
            ? requireCreditCard
              ? "Select Linked Credit Card (EPP)"
              : "Select Customer's Linked Card"
            : "Select CIB Account to Deduct From"}
        </h2>
        <p className="account-modal-subheading">
          {formatAmount(amountDue, invoiceCurrency)} due
        </p>

        {isLoading ? (
          <div className="account-modal-loading" style={{ padding: "2rem", textAlign: "center" }}>
            <span className="spinner" aria-hidden="true" />
            <p style={{ marginTop: "0.5rem", color: "#64748b" }}>
              Retrieving linked CIB instruments…
            </p>
          </div>
        ) : fetchError ? (
          <div className="alert-error-banner" style={{ margin: "1rem 0" }}>
            {fetchError}
          </div>
        ) : items.length === 0 ? (
          <div className="placeholder-card">
            {mode === "card" && requireCreditCard
              ? "No eligible CIB Credit Cards found for EPP conversion."
              : `No linked ${mode === "card" ? "cards" : "accounts"} found for this customer.`}
          </div>
        ) : (
          <div className="account-modal-list">
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`option-card account-option ${isSelected ? "option-card-selected" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  disabled={isProcessing}
                >
                  <span className="option-title account-option-title">
                    {item.title}
                    {item.currency === invoiceCurrency && (
                      <span className="currency-match-badge">Matches currency</span>
                    )}
                  </span>
                  <span className="option-desc">{item.subtitle}</span>
                  {item.amount !== null && (
                    <span className="option-desc account-balance">
                      {formatAmount(item.amount, item.currency)} {item.label}
                    </span>
                  )}
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
            onClick={handleSelectAndConfirm}
            disabled={!selectedItem || isProcessing || isLoading}
          >
            {isProcessing ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}