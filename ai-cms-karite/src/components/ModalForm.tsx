import type * as React from 'react';
interface ModalFormProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalForm({ open, title, children, onClose }: ModalFormProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
