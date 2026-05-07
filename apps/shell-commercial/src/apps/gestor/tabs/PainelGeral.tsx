// Sprint 26: Painel Geral — visao executiva do workspace.
// Bento grid com 4 KPIs (colaboradores ativos, apps instalados, plano, sessoes
// hoje). Atalhos rapidos para tabs frequentes via useGestorStore.setPendingTab.
// "Ultimas acoes" placeholder ate auditoria-log enviar feed real.

import { useEffect, useState, type ComponentType } from "react";
import {
  LayoutGrid,
  ClipboardList,
  Users,
  Package,
  CreditCard,
  Activity,
  UserPlus,
  Search,
  AlertTriangle,
  type LucideProps,
} from "lucide-react";
import { useUsageReport } from "./use-billing";
import {
  ContentHeader,
  SectionLabel,
  SettingGroup,
  ComingSoonSection,
  Badge,
  TILE_BASE,
  TileIcon,
} from "./_shared";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import { useGestorStore } from "../../../stores/gestorStore";

interface CountResult {
  count: number | null;
  error: unknown;
}

interface PanelStats {
  activeMembers: number | null;
  installedApps: number | null;
}

function StatTile({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  trailing,
}: {
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div style={TILE_BASE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <TileIcon Icon={Icon} color={iconColor} bg={iconBg} />
        {trailing !== undefined && trailing}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-display)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ShortcutButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        color: "var(--text-primary)",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        flex: 1,
        minWidth: 0,
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "rgba(99,102,241,0.16)",
          border: "1px solid rgba(99,102,241,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} strokeWidth={1.8} style={{ color: "#a5b4fc" }} />
      </div>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    </button>
  );
}

function QuotaAlertBanner() {
  const setPendingTab = useGestorStore((s) => s.setPendingTab);
  const { data, loading } = useUsageReport();
  if (loading || data === null || data.alerts.length === 0) return null;
  return (
    <div
      role="status"
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(251,191,36,0.10)",
        border: "1px solid rgba(251,191,36,0.30)",
        color: "#fbbf24",
        fontSize: 13,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {data.alerts.map((msg) => (
          <span key={msg}>{msg}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPendingTab("planos")}
        style={{
          background: "rgba(251,191,36,0.18)",
          border: "1px solid rgba(251,191,36,0.40)",
          borderRadius: 8,
          padding: "6px 12px",
          color: "#fbbf24",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Ver plano
      </button>
    </div>
  );
}

export function TabPainelGeral() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const setPendingTab = useGestorStore((s) => s.setPendingTab);

  const [stats, setStats] = useState<PanelStats>({
    activeMembers: null,
    installedApps: null,
  });

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    let cancelled = false;

    async function load() {
      if (drivers === null) return;
      try {
        const membersRes = (await drivers.data
          .from("tenant_memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("status", "active")) as unknown as CountResult;

        const modulesRes = (await drivers.data
          .from("company_modules")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)) as unknown as CountResult;

        if (cancelled) return;
        setStats({
          activeMembers:
            membersRes.error === null || membersRes.error === undefined
              ? (membersRes.count ?? 0)
              : null,
          installedApps:
            modulesRes.error === null || modulesRes.error === undefined
              ? (modulesRes.count ?? 0)
              : null,
        });
      } catch {
        if (!cancelled) {
          setStats({ activeMembers: null, installedApps: null });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, activeCompanyId]);

  const fmt = (n: number | null): string => (n === null ? "—" : String(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ContentHeader
        icon={LayoutGrid}
        iconBg="rgba(99,102,241,0.18)"
        iconColor="#a5b4fc"
        title="Painel Geral"
        subtitle="Visão geral da empresa"
      />

      <QuotaAlertBanner />

      <div>
        <SectionLabel>Indicadores</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <StatTile
            icon={Users}
            iconColor="#34d399"
            iconBg="rgba(16,185,129,0.18)"
            label="Colaboradores ativos"
            value={fmt(stats.activeMembers)}
          />
          <StatTile
            icon={Package}
            iconColor="#a5b4fc"
            iconBg="rgba(99,102,241,0.18)"
            label="Apps instalados"
            value={fmt(stats.installedApps)}
          />
          <StatTile
            icon={CreditCard}
            iconColor="#fbbf24"
            iconBg="rgba(245,158,11,0.18)"
            label="Plano atual"
            value="Pro"
            trailing={<Badge variant="success">ativo</Badge>}
          />
          <StatTile
            icon={Activity}
            iconColor="#f472b6"
            iconBg="rgba(236,72,153,0.18)"
            label="Sessões hoje"
            value="—"
          />
        </div>
      </div>

      <div>
        <SectionLabel>Atalhos rápidos</SectionLabel>
        <SettingGroup style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <ShortcutButton
              icon={UserPlus}
              label="Convidar colaborador"
              onClick={() => setPendingTab("colaboradores")}
            />
            <ShortcutButton
              icon={Package}
              label="Instalar app"
              onClick={() => setPendingTab("aplicativos")}
            />
            <ShortcutButton
              icon={Search}
              label="Ver auditoria"
              onClick={() => setPendingTab("auditoria-log")}
            />
          </div>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Últimas ações</SectionLabel>
        <ComingSoonSection
          icon={ClipboardList}
          label="Sem ações recentes"
          description="O feed de auditoria começará a aparecer aqui assim que houver atividade no workspace."
        />
      </div>
    </div>
  );
}
