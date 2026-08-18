import type { ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
