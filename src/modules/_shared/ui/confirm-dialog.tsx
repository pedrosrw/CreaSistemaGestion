"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "warn";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Eliminar",
  tone = "danger",
  onConfirm,
  onCancel,
  loading = false
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      window.document.body.style.overflow = prev;
    };
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="form-drawer-layer" role="presentation">
      <button className="form-drawer-backdrop" type="button" aria-label="Cancelar" onClick={onCancel} />
      <div
        className="confirm-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h3 id={titleId}>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="btn-secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
