// Sprint 28 MX155: tela de "Permissões Efetivas".
// Gestor seleciona um colaborador e vê o resultado final de:
//  - role base + cargo custom + departamento + grupos
//  - apps visíveis (computado das app_access_rules da company)
//  - apps bloqueados (com motivo)
//
// Diagnostica regras conflitantes e responde "esse user vê esse app, sim ou não".

import { useEffect, useState } from "react";
import { Users, BadgeCheck, Building2, UserCheck, Shield } from "lucide-react";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  SettingRow,
  Badge,
  ComingSoonSection,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import { calculateEffectivePermissions } from "../../../lib/effective-permissions";
import { getApp } from "../../registry";

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  department_id: string | null;
  custom_role_id: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
}

interface GroupRow {
  id: string;
  name: string;
}

interface CustomRoleRow {
  id: string;
  label: string;
  base_role: string;
}

interface Computed {
  visible: { id: string; name: string }[];
  blocked: { id: string; name: string; reason: string }[];
}

export function TabPermissoesEfetivas() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleRow[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<string[]>([]);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega lista de membros + lookups.
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void (async () => {
      const { data: m } = await drivers.data
        .from("tenant_memberships")
        .select(
          "user_id, role, department_id, custom_role_id, status, profiles!inner(full_name)",
        )
        .eq("company_id", activeCompanyId)
        .eq("status", "active");
      const rows =
        ((m ?? []) as unknown as Array<{
          user_id: string;
          role: string;
          department_id: string | null;
          custom_role_id: string | null;
          profiles: { full_name: string };
        }>) ?? [];
      setMembers(
        rows.map((r) => ({
          user_id: r.user_id,
          full_name: r.profiles.full_name,
          email: null,
          role: r.role,
          department_id: r.department_id,
          custom_role_id: r.custom_role_id,
        })),
      );

      const [{ data: d }, { data: g }, { data: cr }] = await Promise.all([
        drivers.data
          .from("departments")
          .select("id, name")
          .eq("company_id", activeCompanyId),
        drivers.data
          .from("groups")
          .select("id, name")
          .eq("company_id", activeCompanyId),
        drivers.data
          .from("company_roles")
          .select("id, label, base_role")
          .eq("company_id", activeCompanyId),
      ]);
      setDepartments((d ?? []) as DepartmentRow[]);
      setGroups((g ?? []) as GroupRow[]);
      setCustomRoles((cr ?? []) as CustomRoleRow[]);
    })();
  }, [drivers, activeCompanyId]);

  // Quando member selecionado, computa permissoes + busca grupos do user.
  useEffect(() => {
    if (
      drivers === null ||
      activeCompanyId === null ||
      selectedUserId === null
    ) {
      setComputed(null);
      setMemberGroupIds([]);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data: cm } = await drivers.data
        .from("company_modules")
        .select("module")
        .eq("company_id", activeCompanyId);
      const installed = ((cm ?? []) as Array<{ module: string }>).map(
        (r) => r.module,
      );

      const result = await calculateEffectivePermissions(
        drivers,
        selectedUserId,
        activeCompanyId,
        installed,
      );

      const { data: gm } = await drivers.data
        .from("group_members")
        .select("group_id")
        .eq("user_id", selectedUserId)
        .eq("company_id", activeCompanyId);
      setMemberGroupIds(
        ((gm ?? []) as Array<{ group_id: string }>).map((r) => r.group_id),
      );

      setComputed({
        visible: result.visibleApps.map((id) => ({
          id,
          name: getApp(id)?.name ?? id,
        })),
        blocked: result.blockedApps.map((b) => ({
          id: b.appId,
          name: getApp(b.appId)?.name ?? b.appId,
          reason: b.reason,
        })),
      });
      setLoading(false);
    })();
  }, [drivers, activeCompanyId, selectedUserId]);

  const selected = members.find((m) => m.user_id === selectedUserId);
  const departmentName =
    selected?.department_id != null
      ? (departments.find((d) => d.id === selected.department_id)?.name ?? "—")
      : "—";
  const customRoleLabel =
    selected?.custom_role_id != null
      ? (customRoles.find((r) => r.id === selected.custom_role_id)?.label ??
        "—")
      : null;
  const memberGroupNames = memberGroupIds
    .map((id) => groups.find((g) => g.id === id)?.name ?? id)
    .filter((n) => n !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Shield}
        iconBg="rgba(99,102,241,0.22)"
        iconColor="#818cf8"
        title="Permissões Efetivas"
        subtitle="Diagnóstico de qual colaborador vê quais apps — resultado final calculado das regras"
      />

      {/* Seleção de membro */}
      <div>
        <SectionLabel>Selecione um colaborador</SectionLabel>
        <SettingGroup>
          <SettingRow label="Colaborador" sublabel="Lista da empresa">
            <select
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "var(--text-primary)",
                minWidth: 280,
                cursor: "pointer",
              }}
            >
              <option value="">— Selecione —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name} · {m.role}
                </option>
              ))}
            </select>
          </SettingRow>
        </SettingGroup>
      </div>

      {selected !== undefined && (
        <>
          {/* Identidade */}
          <div>
            <SectionLabel>Identidade</SectionLabel>
            <SettingGroup>
              <SettingRow
                label="Role base"
                icon={<BadgeCheck size={13} style={{ color: "#a5b4fc" }} />}
              >
                <Badge variant="info">{selected.role}</Badge>
              </SettingRow>
              {customRoleLabel !== null && (
                <SettingRow
                  label="Cargo custom"
                  icon={<BadgeCheck size={13} style={{ color: "#fbbf24" }} />}
                >
                  <Badge variant="warning">{customRoleLabel}</Badge>
                </SettingRow>
              )}
              <SettingRow
                label="Departamento"
                icon={<Building2 size={13} style={{ color: "#34d399" }} />}
              >
                {departmentName === "—" ? (
                  <Badge variant="neutral">Sem departamento</Badge>
                ) : (
                  <Badge variant="success">{departmentName}</Badge>
                )}
              </SettingRow>
              <SettingRow
                label="Grupos"
                last
                icon={<UserCheck size={13} style={{ color: "#a78bfa" }} />}
              >
                {memberGroupNames.length === 0 ? (
                  <Badge variant="neutral">Nenhum</Badge>
                ) : (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {memberGroupNames.map((n) => (
                      <Badge key={n} variant="info">
                        {n}
                      </Badge>
                    ))}
                  </div>
                )}
              </SettingRow>
            </SettingGroup>
          </div>

          {/* Apps */}
          {loading ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 13,
              }}
            >
              Calculando…
            </div>
          ) : computed === null ? null : (
            <>
              <div>
                <SectionLabel>
                  Apps visíveis ({computed.visible.length})
                </SectionLabel>
                {computed.visible.length === 0 ? (
                  <ComingSoonSection
                    icon={Shield}
                    label="Nenhum app visível"
                    description="As regras de acesso bloqueiam todos os apps instalados pra esse colaborador."
                  />
                ) : (
                  <SettingGroup>
                    {computed.visible.map((a, i) => (
                      <SettingRow
                        key={a.id}
                        label={a.name}
                        sublabel={a.id}
                        last={i === computed.visible.length - 1}
                      >
                        <Badge variant="success">Permitido</Badge>
                      </SettingRow>
                    ))}
                  </SettingGroup>
                )}
              </div>

              {computed.blocked.length > 0 && (
                <div>
                  <SectionLabel>
                    Apps bloqueados ({computed.blocked.length})
                  </SectionLabel>
                  <SettingGroup>
                    {computed.blocked.map((a, i) => (
                      <SettingRow
                        key={a.id}
                        label={a.name}
                        sublabel={a.reason}
                        last={i === computed.blocked.length - 1}
                      >
                        <Badge variant="danger">Bloqueado</Badge>
                      </SettingRow>
                    ))}
                  </SettingGroup>
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedUserId === null && members.length === 0 && (
        <ComingSoonSection
          icon={Users}
          label="Sem membros ativos"
          description="Convide colaboradores na seção Pessoas & Equipe."
        />
      )}
    </div>
  );
}
