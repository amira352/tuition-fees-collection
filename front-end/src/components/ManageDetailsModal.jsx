export default function ManageDetailsModal({ title, fields, onClose }) {
  return (
    <div className="mgmt-modal-backdrop" onClick={onClose}>
      <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="mgmt-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {fields.map((f) => (
          <div className="mgmt-detail-row" key={f.label}>
            <span className="mgmt-detail-label">{f.label}</span>
            <span className="mgmt-detail-value">{f.value || "—"}</span>
          </div>
        ))}

        <div className="mgmt-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}