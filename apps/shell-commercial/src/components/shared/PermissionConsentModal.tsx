import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  Antenna,
  Bell,
  Bot,
  Edit,
  Eye,
  Lock,
  MessageSquare,
  Palette,
  Radio,
  Send,
  Settings,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  User,
  Users,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { SCOPE_CATALOG, getScope } from "@aethereos/client";
import { useModalA11y } from "./useModalA11y";

/**
 * Sprint 23 MX125 — Modal de consentimento de permissoes.
 *
 * Aparece ao instalar app que declara qualquer scope sensitive=true.
 * Usuario pode aceitar (instala + grants) ou cancelar (nao instala).
 */

const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Eye,
  Edit,
  Trash2,
  Users,
  UserPlus,
  MessageSquare,
  Send,
  Bell,
  Radio,
  Antenna,
  Bot,
  Sparkles,
  Settings,
  SlidersHorizontal,
  Palette,
  AppWindow,
  Lock,
};

export interface PermissionConsentModalProps {
  open: boolean;
  appName: string;
  appIcon?: string | null;
  appColor?: string | null;
  scopes: readonly string[];
  onAccept: () => void;
  onCancel: () => void;
}

export function PermissionConsentModal({
  open,
  appName,
  appIcon,
  appColor,
  scopes,
  onAccept,
  onCancel,
}: PermissionConsentModalProps) {
  const ref = useModalA11y<HTMLDivElement>({ open, onClose: onCancel });

  const scopeDefs = useMemo(
    () =>
      scopes
        .map((s) => getScope(s))
        .filter((s): s is NonNullable<typeof s> => s !== undefined)
        .sort((a, b) =>
          a.sensitive === b.sensitive
            ? a.label.localeCompare(b.label, "pt-BR")
            : a.sensitive
              ? -1
              : 1,
        ),
    [scopes],
  );
  void appIcon;
  void appColor;
  void SCOPE_CATALOG;

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-consent-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={ref}
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "82vh",
          background: "#191d21",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2
            id="perm-consent-title"
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Permissoes necessarias
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </header>

        <div
          style={{
            padding: "14px 18px 6px",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>{appName}</strong>{" "}
          solicita acesso a:
        </div>

        <ul
          style={{
            flex: 1,
            overflowY: "auto",
            margin: 0,
            padding: "8px 18px 12px",
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {scopeDefs.map((scope) => {
            const Icon = ICON_MAP[scope.icon] ?? Lock;
            return (
              <li
                key={scope.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: scope.sensitive
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(255,255,255,0.03)",
                  border: scope.sensitive
                    ? "1px solid rgba(245,158,11,0.25)"
                    : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8,
                }}
              >
                <Icon
                  size={16}
                  color={scope.sensitive ? "#f59e0b" : "var(--text-secondary)"}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span>{scope.label}</span>
                    {scope.sensitive && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 6px",
                          background: "rgba(245,158,11,0.18)",
                          color: "#fde68a",
                          border: "1px solid rgba(245,158,11,0.32)",
                          borderRadius: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Sensivel
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      lineHeight: 1.45,
                    }}
                  >
                    {scope.description}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <footer
          style={{
            padding: "10px 18px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "var(--text-tertiary)",
            }}
          >
            Voce pode revogar permissoes a qualquer momento na pagina do app na
            Magic Store.
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onAccept}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                background: "rgba(34,197,94,0.18)",
                color: "#86efac",
                border: "1px solid rgba(34,197,94,0.32)",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Instalar e permitir
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
