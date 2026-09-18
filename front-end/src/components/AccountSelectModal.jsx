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
  parentName = "",
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

  // Filter items based on active payment method
  const items = useMemo(() => {
    if (mode === "account") {
      return customerAccounts.map((acc, idx) => ({
        id: acc.account_id || `acc-${idx}`,
        title: acc.type === "CURRENT" ? "Current Account" : "Savings Account",
        subtitle: acc.iban_masked || acc.account_number || "•••• 0000",
        balance: acc.balance ?? acc.available_balance ?? 0,
        currency: acc.currency || "EGP",
        raw: acc,
        kind: "account",
      }));
    }

    // mode === "card"
    return customerCards
      .filter((c) => {
        if (requireCreditCard) {
          return String(c.type || "").toUpperCase() === "CREDIT";
        }
        return true;
      })
      .map((card, idx) => ({
        id: card.card_id || `card-${idx}`,
        title: `${card.type || "Credit"} Card (${card.scheme || "CIB"})`,
        subtitle: card.masked_number || "•••• 0000",
        balance: card.credit_limit ?? card.balance ?? 0,
        currency: card.currency || "EGP",
        raw: card,
        kind: "card",
      }));
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

    if (selectedItem.kind === "account") {
      onConfirm({
        kind: "account",
        accountRef: selectedItem.raw.account_id || selectedItem.raw.account_number || selectedItem.id,
        maskedNumber: selectedItem.subtitle,
      });
      return;
    }

    // Card Tender Construction using DB record attributes
    const rawCard = selectedItem.raw;
    const [expMonth, expYear] = (rawCard.expiry || "12/28").split("/");

    onConfirm({
      kind: "card",
      maskedNumber: selectedItem.subtitle,
      card: {
        // Uses the card record details from the DB query
        number: rawCard.card_number || rawCard.card_id || "4111111111111111",
        holder_name: parentName || rawCard.holder_name || "CIB Customer",
        expiry_month: expMonth || "12",
        expiry_year: expYear?.length === 2 ? `20${expYear}` : (expYear || "2028"),
        cvv: rawCard.cvv || "123",
      },
      mobile: rawCard.mobile,
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
                  {item.balance > 0 && (
                    <span className="option-desc account-balance">
                      {formatAmount(item.balance, item.currency)} available
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