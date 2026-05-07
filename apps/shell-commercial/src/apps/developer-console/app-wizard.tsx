/**
 * Super Sprint F / MX245 — App Wizard 5 steps.
 *
 * Stub minimal para MX244 typechek. Implementação completa em MX245.
 */

import * as React from "react";
import type { AppSubmission, DeveloperAccount } from "./types";

interface WizardProps {
  account: DeveloperAccount;
  editing: AppSubmission | null;
  onClose: () => void;
}

export function AppWizard({
  account,
  editing,
  onClose,
}: WizardProps): React.ReactElement {
  void account;
  void editing;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        color: "var(--text-tertiary)",
        fontSize: 13,
      }}
    >
      Wizard será implementado em MX245.{" "}
      <button
        type="button"
        onClick={onClose}
        style={{
          marginLeft: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          color: "var(--text-primary)",
          fontSize: 12,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        Voltar
      </button>
    </div>
  );
}
