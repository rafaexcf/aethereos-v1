/**
 * Super Sprint F / MX244 — Developer Console app entry.
 *
 * Roteia entre register / dashboard / wizard (MX245) baseado no estado:
 *   - Sem developer_account: render <DeveloperRegister />
 *   - Com account: render <DeveloperDashboard /> ou <AppWizard />
 */

import * as React from "react";
import { useState } from "react";
import { useDeveloperAccount } from "./hooks";
import { DeveloperRegister } from "./register";
import { DeveloperDashboard } from "./dashboard";
import { AppWizard } from "./app-wizard";
import type { AppSubmission } from "./types";

type View = "dashboard" | "wizard";

export function DeveloperConsoleApp(): React.ReactElement {
  const account = useDeveloperAccount();
  const [view, setView] = useState<View>("dashboard");
  const [editingApp, setEditingApp] = useState<AppSubmission | null>(null);

  if (account.loading) {
    return (
      <div
        style={{
          height: "100%",
          background: "#191d21",
          color: "var(--text-tertiary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
        }}
      >
        Carregando…
      </div>
    );
  }

  if (account.error !== null && account.data === null) {
    return (
      <div
        style={{
          height: "100%",
          background: "#191d21",
          color: "#f87171",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          padding: 20,
        }}
      >
        {account.error}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        background: "#191d21",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {account.data === null ? (
        <DeveloperRegister onRegistered={() => void account.refresh()} />
      ) : view === "wizard" ? (
        <AppWizard
          account={account.data}
          editing={editingApp}
          onClose={() => {
            setEditingApp(null);
            setView("dashboard");
          }}
        />
      ) : (
        <DeveloperDashboard
          account={account.data}
          onCreateApp={() => {
            setEditingApp(null);
            setView("wizard");
          }}
          onEditApp={(app) => {
            setEditingApp(app);
            setView("wizard");
          }}
          onAccountRefresh={() => void account.refresh()}
        />
      )}
    </div>
  );
}
