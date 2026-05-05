// Sprint 28 MX154: Regras de Apps — restringe quem pode usar cada app instalado
// (kernel.app_access_rules) por cargo (role base), departamento, grupo ou bloqueio
// total. Carrega apps instalados de kernel.company_modules e mostra modo atual
// derivado das regras existentes.
//
// IMPORTANTE (R12): Owner e admin sempre veem todos os apps independentemente
// das regras — invariante do kernel. UI exibe nota informativa.
//
// Convenções:
//   - "Bloqueado": INSERT com rule_type='role', rule_target='__all__', action='deny'
//     (sentinel de "todos bloqueados"). Decisão pra Sprint 28 MX154.
//   - "Por cargo": rule_type='role', rule_target=<base_role>, action='allow' por role selecionada.
//   - "Por departamento" / "Por grupo": idem com rule_type correspondente e rule_target=<id>.
//   - "Todos": ausência de regras (default permissivo).
//   - Salvar = DELETE WHERE company_id+app_id THEN INSERT linhas novas (try/catch).

import { useEffect, useState, useCallback } from "react";
import { Settings2, Info, X } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  InlineButton,
  ComingSoonSection,
} from "./_shared";
import { getApp } from "../../registry";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";

// ─── Tipos ────────────────────────────────────────────────────────────────

type AccessMode = "all" | "by-role" | "by-department" | "by-group" | "blocked";
type BaseRole = "admin" | "manager" | "member" | "viewer";

// Sentinel "todos os usuarios" pra rule_target quando action='deny' total.
const BLOCKED_TARGET = "__all__";

interface CompanyModuleRow {
  module: string;
}

interface AppAccessRuleRow {
  id: string;
  app_id: string;
  rule_type: "role" | "department" | "group" | "user";
  rule_target: string;
  action: "allow" | "deny";
}

interface DepartmentRow {
  id: string;
  name: string;
}

interface GroupRow {
  id: string;
  name: string;
}

const BASE_ROLES: { value: BaseRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gestor de setor" },
  { value: "member", label: "Colaborador" },
  { value: "viewer", label: "Visualizador" },
];

const MODE_OPTIONS: { value: AccessMode; label: string }[] = [
  { value: "all", label: "Todos os colaboradores" },
  { value: "by-role", label: "Por cargo" },
  { value: "by-department", label: "Por departamento" },
  { value: "by-group", label: "Por grupo" },
  { value: "blocked", label: "Bloqueado" },
];

// ─── Helpers de derivação ─────────────────────────────────────────────────

function appName(appId: string): string {
  const found = getApp(appId);
  return found?.name ?? appId;
}

function deriveMode(rules: AppAccessRuleRow[]): AccessMode {
  if (rules.length === 0) return "all";
  const blocked = rules.find(
    (r) => r.action === "deny" && r.rule_target === BLOCKED_TARGET,
  );
  if (blocked !== undefined) return "blocked";
  const first = rules.find((r) => r.action === "allow");
  if (first === undefined) return "all";
  if (first.rule_type === "role") return "by-role";
  if (first.rule_type === "department") return "by-department";
  if (first.rule_type === "group") return "by-group";
  return "all";
}

function deriveSummary(
  mode: AccessMode,
  rules: AppAccessRuleRow[],
  deps: DepartmentRow[],
  groups: GroupRow[],
): string {
  if (mode === "all") return "Acesso: Todos os colaboradores";
  if (mode === "blocked") return "Acesso: Bloqueado por regra";
  if (mode === "by-role") {
    const targets = rules
      .filter((r) => r.rule_type === "role" && r.action === "allow")
      .map((r) => r.rule_target);
    return `Acesso: Restrito por cargo (${targets.length})`;
  }
  if (mode === "by-department") {
    const ids = rules
      .filter((r) => r.rule_type === "department" && r.action === "allow")
      .map((r) => r.rule_target);
    const names = ids
      .map((id) => deps.find((d) => d.id === id)?.name ?? id)
      .slice(0, 2)
      .join(", ");
    return `Acesso: Restrito por departamento${
      ids.length > 0 ? ` (${names}${ids.length > 2 ? "…" : ""})` : ""
    }`;
  }
  if (mode === "by-group") {
    const ids = rules
      .filter((r) => r.rule_type === "group" && r.action === "allow")
      .map((r) => r.rule_target);
    const names = ids
      .map((id) => groups.find((g) => g.id === id)?.name ?? id)
      .slice(0, 2)
      .join(", ");
    return `Acesso: Restrito por grupo${
      ids.length > 0 ? ` (${names}${ids.length > 2 ? "…" : ""})` : ""
    }`;
  }
  return "Acesso: Todos os colaboradores";
}

// ─── Modal de configuração de regras ──────────────────────────────────────

interface ConfigModalProps {
  appId: string;
  initialMode: AccessMode;
  initialRules: AppAccessRuleRow[];
  onClose: () => void;
  onSave: (
    mode: AccessMode,
    targets: {
      rule_type: "role" | "department" | "group";
      rule_target: string;
    }[],
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}

function ConfigModal({
  appId,
  initialMode,
  initialRules,
  onClose,
  onSave,
}: ConfigModalProps) {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [selectedRoles, setSelectedRoles] = useState<Set<BaseRole>>(
    new Set(
      initialRules
        .filter((r) => r.rule_type === "role" && r.action === "allow")
        .map((r) => r.rule_target as BaseRole),
    ),
  );
  const [selectedDeps, setSelectedDeps] = useState<Set<string>>(
    new Set(
      initialRules
        .filter((r) => r.rule_type === "department" && r.action === "allow")
        .map((r) => r.rule_target),
    ),
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(
      initialRules
        .filter((r) => r.rule_type === "group" && r.action === "allow")
        .map((r) => r.rule_target),
    ),
  );

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [auxLoading, setAuxLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega listas auxiliares só quando modal abre.
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    let cancelled = false;
    setAuxLoading(true);
    void (async () => {
      try {
        const [depsRes, groupsRes] = await Promise.all([
          drivers.data
            .from("departments")
            .select("id,name")
            .eq("company_id", activeCompanyId)
            .order("name") as unknown as Promise<{
            data: DepartmentRow[] | null;
            error: { message: string } | null;
          }>,
          drivers.data
            .from("groups")
            .select("id,name")
            .eq("company_id", activeCompanyId)
            .order("name") as unknown as Promise<{
            data: GroupRow[] | null;
            error: { message: string } | null;
          }>,
        ]);
        if (cancelled) return;
        setDepartments(depsRes.error === null ? (depsRes.data ?? []) : []);
        setGroups(groupsRes.error === null ? (groupsRes.data ?? []) : []);
        setAuxLoading(false);
      } catch {
        if (!cancelled) {
          setDepartments([]);
          setGroups([]);
          setAuxLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId]);

  function toggleRole(value: BaseRole) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleDep(id: string) {
    setSelectedDeps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSubmitting(true);
    setErrorMsg(null);
    let targets: {
      rule_type: "role" | "department" | "group";
      rule_target: string;
    }[] = [];
    if (mode === "by-role") {
      targets = Array.from(selectedRoles).map((v) => ({
        rule_type: "role" as const,
        rule_target: v,
      }));
    } else if (mode === "by-department") {
      targets = Array.from(selectedDeps).map((id) => ({
        rule_type: "department" as const,
        rule_target: id,
      }));
    } else if (mode === "by-group") {
      targets = Array.from(selectedGroups).map((id) => ({
        rule_type: "group" as const,
        rule_target: id,
      }));
    }
    const result = await onSave(mode, targets);
    if (result.ok) {
      onClose();
    } else {
      setErrorMsg(result.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configurar regras de ${appName(appId)}`}
        style={{
          width: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 16,
          background: "var(--bg-elevated, #1e2328)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.5))",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              Regras de acesso
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              {appName(appId)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <SectionLabel>Modo de acesso</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                background:
                  mode === opt.value
                    ? "rgba(99,102,241,0.14)"
                    : "rgba(255,255,255,0.04)",
                border:
                  mode === opt.value
                    ? "1px solid rgba(99,102,241,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={`mode-${appId}`}
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                style={{ accentColor: "#6366f1" }}
              />
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {mode === "by-role" && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Cargos com acesso permitido</SectionLabel>
            <SettingGroup>
              {BASE_ROLES.map((r, i) => (
                <SettingRow
                  key={r.value}
                  label={r.label}
                  sublabel={`base_role: ${r.value}`}
                  last={i === BASE_ROLES.length - 1}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.has(r.value)}
                    onChange={() => toggleRole(r.value)}
                    aria-label={`Permitir cargo ${r.label}`}
                    style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                  />
                </SettingRow>
              ))}
            </SettingGroup>
          </div>
        )}

        {mode === "by-department" && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Departamentos com acesso</SectionLabel>
            {auxLoading ? (
              <SettingGroup>
                <SettingRow label="Carregando…" sublabel="Aguarde" last />
              </SettingGroup>
            ) : departments.length === 0 ? (
              <ComingSoonSection
                icon={Settings2}
                label="Nenhum departamento cadastrado"
                description="Crie departamentos na aba Departamentos antes de criar regras por departamento."
              />
            ) : (
              <SettingGroup>
                {departments.map((d, i) => (
                  <SettingRow
                    key={d.id}
                    label={d.name}
                    last={i === departments.length - 1}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDeps.has(d.id)}
                      onChange={() => toggleDep(d.id)}
                      aria-label={`Permitir departamento ${d.name}`}
                      style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                    />
                  </SettingRow>
                ))}
              </SettingGroup>
            )}
          </div>
        )}

        {mode === "by-group" && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Grupos com acesso</SectionLabel>
            {auxLoading ? (
              <SettingGroup>
                <SettingRow label="Carregando…" sublabel="Aguarde" last />
              </SettingGroup>
            ) : groups.length === 0 ? (
              <ComingSoonSection
                icon={Settings2}
                label="Nenhum grupo cadastrado"
                description="Crie grupos na aba Grupos antes de criar regras por grupo."
              />
            ) : (
              <SettingGroup>
                {groups.map((g, i) => (
                  <SettingRow
                    key={g.id}
                    label={g.name}
                    last={i === groups.length - 1}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      aria-label={`Permitir grupo ${g.name}`}
                      style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                    />
                  </SettingRow>
                ))}
              </SettingGroup>
            )}
          </div>
        )}

        {mode === "blocked" && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.32)",
              color: "#fca5a5",
              fontSize: 12,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Nenhum colaborador conseguirá abrir esse app — exceto owner e admin
            (R12, invariante do kernel).
          </div>
        )}

        {errorMsg !== null && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.32)",
              color: "#fca5a5",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              background: "rgba(99,102,241,0.85)",
              border: "1px solid rgba(99,102,241,1)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function TabRegrasApp() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const [installed, setInstalled] = useState<string[]>([]);
  const [rules, setRules] = useState<AppAccessRuleRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [ready, setReady] = useState(false);
  const [configuringApp, setConfiguringApp] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const [modulesRes, rulesRes, depsRes, groupsRes] = await Promise.all([
          drivers.data
            .from("company_modules")
            .select("module")
            .eq("company_id", activeCompanyId) as unknown as Promise<{
            data: CompanyModuleRow[] | null;
            error: { message: string } | null;
          }>,
          drivers.data
            .from("app_access_rules")
            .select("id,app_id,rule_type,rule_target,action")
            .eq("company_id", activeCompanyId) as unknown as Promise<{
            data: AppAccessRuleRow[] | null;
            error: { message: string } | null;
          }>,
          drivers.data
            .from("departments")
            .select("id,name")
            .eq("company_id", activeCompanyId) as unknown as Promise<{
            data: DepartmentRow[] | null;
            error: { message: string } | null;
          }>,
          drivers.data
            .from("groups")
            .select("id,name")
            .eq("company_id", activeCompanyId) as unknown as Promise<{
            data: GroupRow[] | null;
            error: { message: string } | null;
          }>,
        ]);
        if (cancelled) return;
        setInstalled(
          modulesRes.error === null
            ? (modulesRes.data ?? []).map((r) => r.module)
            : [],
        );
        setRules(rulesRes.error === null ? (rulesRes.data ?? []) : []);
        setDepartments(depsRes.error === null ? (depsRes.data ?? []) : []);
        setGroups(groupsRes.error === null ? (groupsRes.data ?? []) : []);
        setReady(true);
      } catch {
        if (!cancelled) {
          setInstalled([]);
          setRules([]);
          setDepartments([]);
          setGroups([]);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId, reloadCounter]);

  function rulesForApp(appId: string): AppAccessRuleRow[] {
    return rules.filter((r) => r.app_id === appId);
  }

  async function handleSaveRules(
    appId: string,
    mode: AccessMode,
    targets: {
      rule_type: "role" | "department" | "group";
      rule_target: string;
    }[],
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (drivers === null || activeCompanyId === null) {
      return { ok: false, message: "Drivers não disponíveis." };
    }
    try {
      // Limpa regras existentes desse app na empresa.
      const delRes = (await drivers.data
        .from("app_access_rules")
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("app_id", appId)) as unknown as {
        error: { message: string } | null;
      };
      if (delRes.error !== null) {
        return { ok: false, message: delRes.error.message };
      }

      // Calcula payload conforme modo.
      const inserts: {
        company_id: string;
        app_id: string;
        rule_type: "role" | "department" | "group" | "user";
        rule_target: string;
        action: "allow" | "deny";
      }[] = [];

      if (mode === "blocked") {
        inserts.push({
          company_id: activeCompanyId,
          app_id: appId,
          rule_type: "role",
          rule_target: BLOCKED_TARGET,
          action: "deny",
        });
      } else if (mode !== "all") {
        for (const t of targets) {
          inserts.push({
            company_id: activeCompanyId,
            app_id: appId,
            rule_type: t.rule_type,
            rule_target: t.rule_target,
            action: "allow",
          });
        }
      }

      if (inserts.length > 0) {
        const insRes = (await drivers.data
          .from("app_access_rules")
          .insert(inserts)) as unknown as {
          error: { message: string } | null;
        };
        if (insRes.error !== null) {
          return { ok: false, message: insRes.error.message };
        }
      }

      triggerReload();
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Erro inesperado.",
      };
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ContentHeader
        icon={Settings2}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Regras de Apps"
        subtitle="Restringir apps por cargo, departamento ou grupo"
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 10,
          background: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.28)",
        }}
        role="note"
      >
        <Info
          size={14}
          strokeWidth={1.8}
          style={{ color: "#a5b4fc", flexShrink: 0, marginTop: 2 }}
        />
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Owner e admin veem todos os apps independentemente das regras
          (invariante do kernel — R12).
        </span>
      </div>

      <div>
        <SectionLabel>Apps instalados</SectionLabel>
        {!ready ? (
          <SettingGroup>
            <SettingRow label="Carregando apps…" sublabel="Aguarde" last />
          </SettingGroup>
        ) : installed.length === 0 ? (
          <ComingSoonSection
            icon={Settings2}
            label="Nenhum app instalado"
            description="Apps instalados são gerenciados via Magic Store."
          />
        ) : (
          <SettingGroup>
            {installed.map((appId, idx) => {
              const appRules = rulesForApp(appId);
              const mode = deriveMode(appRules);
              const summary = deriveSummary(
                mode,
                appRules,
                departments,
                groups,
              );
              return (
                <SettingRow
                  key={appId}
                  label={appName(appId)}
                  sublabel={summary}
                  last={idx === installed.length - 1}
                >
                  <InlineButton onClick={() => setConfiguringApp(appId)}>
                    Configurar
                  </InlineButton>
                </SettingRow>
              );
            })}
          </SettingGroup>
        )}
      </div>

      {configuringApp !== null && (
        <ConfigModal
          appId={configuringApp}
          initialMode={deriveMode(rulesForApp(configuringApp))}
          initialRules={rulesForApp(configuringApp)}
          onClose={() => setConfiguringApp(null)}
          onSave={(mode, targets) =>
            handleSaveRules(configuringApp, mode, targets)
          }
        />
      )}
    </div>
  );
}
