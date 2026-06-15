export function ConfirmModal({ action, onCancel, onConfirm }) {
  if (!action) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        aria-labelledby="confirm-modal-title"
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="modal-eyebrow">{action.eyebrow}</p>
        <h2 id="confirm-modal-title">{action.title}</h2>
        <p>{action.message}</p>
        <div className="modal-actions">
          <button type="button" className="modal-secondary" onClick={onCancel}>
            Άκυρο
          </button>
          <button type="button" className="modal-danger" onClick={onConfirm}>
            {action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
