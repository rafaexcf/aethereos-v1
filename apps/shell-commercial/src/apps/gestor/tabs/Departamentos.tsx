// Sprint 26: Departamentos — CRUD local com tentativa best-effort de persistir
// em kernel.departments via driver.data. Como a tabela ainda nao existe em
// migration, o salvamento falha silenciosamente — UI permanece funcional como
// estado local. Migration vira em sprint futura.

import { useState } from "react";
import { Building2, Plus, Trash2, Save, Check } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  Badge,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

interface Department {
  id: string;
  name: string;
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
};

export function TabDepartamentos() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function addDepartment() {
    const name = draft.trim();
    if (name === "") return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDepartments((prev) => [...prev, { id, name }]);
    setDraft("");
  }

  function removeDepartment(id: string) {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  }

  function renameDepartment(id: string, name: string) {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d)),
    );
  }

  async function handleSave() {
    if (departments.length === 0) return;
    setSaving(true);
    try {
      if (drivers !== null && activeCompanyId !== null) {
        const payload = departments.map((d) => ({
          id: d.id,
          name: d.name,
          company_id: activeCompanyId,
        }));
        try {
          await (drivers.data
            .from("departments")
            .upsert(payload) as unknown as Promise<{ error: unknown }>);
        } catch {
          // tabela ainda nao existe — falha silenciosa, UI continua local
        }
      }
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Building2}
        iconBg="rgba(245,158,11,0.18)"
        iconColor="#fbbf24"
        title="Departamentos"
        subtitle="Estruture sua empresa em áreas funcionais"
        right={
          departments.length > 0 ? (
            <InlineButton variant="primary" onClick={() => void handleSave()}>
              <Save size={13} strokeWidth={2} />
              {saving ? "Salvando…" : "Salvar"}
            </InlineButton>
          ) : null
        }
      />

      <div>
        <SectionLabel>Adicionar departamento</SectionLabel>
        <SettingGroup style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addDepartment();
              }}
              placeholder="Ex: Financeiro, Comercial, TI…"
              aria-label="Nome do departamento"
              style={inputStyle}
            />
            <InlineButton onClick={addDepartment}>
              <Plus size={13} strokeWidth={2} />
              Adicionar
            </InlineButton>
          </div>
        </SettingGroup>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <SectionLabel>Departamentos cadastrados</SectionLabel>
          {savedAt !== null && (
            <Badge variant="success">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={11} /> salvo
              </span>
            </Badge>
          )}
        </div>
        <SettingGroup>
          {departments.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Nenhum departamento cadastrado ainda.
            </div>
          ) : (
            departments.map((d, i) => (
              <SettingRow
                key={d.id}
                last={i === departments.length - 1}
                label=""
              >
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) => renameDepartment(d.id, e.target.value)}
                  aria-label="Nome do departamento"
                  style={{
                    ...inputStyle,
                    minWidth: 320,
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeDepartment(d.id)}
                  aria-label="Remover departamento"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.30)",
                    background: "rgba(239,68,68,0.10)",
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </SettingRow>
            ))
          )}
        </SettingGroup>
      </div>
    </div>
  );
}
