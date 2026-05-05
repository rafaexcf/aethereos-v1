// Sprint 26: Grupos transversais (comites, projetos, times virtuais).
// Mesmo padrao de Departamentos.tsx: CRUD local com persistencia best-effort
// em kernel.groups. Tabela ainda nao migrada — UI funciona como local state.

import { useState } from "react";
import { UserCheck, Plus, Trash2, Save, Check } from "lucide-react";
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

interface Group {
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

export function TabGrupos() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [groups, setGroups] = useState<Group[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function addGroup() {
    const name = draft.trim();
    if (name === "") return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setGroups((prev) => [...prev, { id, name }]);
    setDraft("");
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function renameGroup(id: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  }

  async function handleSave() {
    if (groups.length === 0) return;
    setSaving(true);
    try {
      if (drivers !== null && activeCompanyId !== null) {
        const payload = groups.map((g) => ({
          id: g.id,
          name: g.name,
          company_id: activeCompanyId,
        }));
        try {
          await (drivers.data
            .from("groups")
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
        icon={UserCheck}
        iconBg="rgba(236,72,153,0.18)"
        iconColor="#f472b6"
        title="Grupos transversais"
        subtitle="Comitês, times de projeto e times virtuais"
        right={
          groups.length > 0 ? (
            <InlineButton variant="primary" onClick={() => void handleSave()}>
              <Save size={13} strokeWidth={2} />
              {saving ? "Salvando…" : "Salvar"}
            </InlineButton>
          ) : null
        }
      />

      <div>
        <SectionLabel>Criar grupo</SectionLabel>
        <SettingGroup style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addGroup();
              }}
              placeholder="Ex: Comitê de Inovação, Squad NF-e…"
              aria-label="Nome do grupo"
              style={inputStyle}
            />
            <InlineButton onClick={addGroup}>
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
          <SectionLabel>Grupos cadastrados</SectionLabel>
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
          {groups.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Nenhum grupo criado ainda.
            </div>
          ) : (
            groups.map((g, i) => (
              <SettingRow key={g.id} last={i === groups.length - 1} label="">
                <input
                  type="text"
                  value={g.name}
                  onChange={(e) => renameGroup(g.id, e.target.value)}
                  aria-label="Nome do grupo"
                  style={{
                    ...inputStyle,
                    minWidth: 320,
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeGroup(g.id)}
                  aria-label="Remover grupo"
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
