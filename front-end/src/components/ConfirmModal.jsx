export default function ConfirmModal({
  title, message, confirmLabel = "Confirm", error, busy, onConfirm, onCancel,
}) {
  return (
    <div className="mgmt-modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-modal-header">
          <h3>{title}</h3>
          <button type="button" className="mgmt-modal-close" onClick={onCancel} aria-label="Close" disabled={busy}>
            ×
          </button>
        </div>

        <p className="mgmt-confirm-text">{message}</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <div className="mgmt-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}