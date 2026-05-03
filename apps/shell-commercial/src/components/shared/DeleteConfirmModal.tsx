import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useModalA11y } from "./useModalA11y";

export interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/**
 * Modal canônico de confirmação destrutiva.
 * Aplica padrão visual #191d21 + a11y (focus trap + Esc).
 */
export function DeleteConfirmModal({
  open,
  title = "Confirmar exclusão",
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const ref = useModalA11y<HTMLDivElement>({ open, onClose });

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          width: 360,
          maxWidth: "90vw",
          color: "var(--text-primary, #e2e8f0)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <h3
            id="delete-confirm-title"
            style={{ fontSize: 14, fontWeight: 600, margin: 0 }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: "0 0 20px",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              void onConfirm();
            }}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
