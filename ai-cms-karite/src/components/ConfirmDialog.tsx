interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, danger }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal small">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={() => void onConfirm()}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
