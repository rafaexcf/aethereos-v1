/**
 * Super Sprint E / MX238 — Tab Plano & Assinatura (substitui inline TabPlanos).
 *
 * Card do plano atual + comparador de planos + botão de upgrade.
 * Dados reais de billing-sync e create-checkout (modo simulado, R9).
 */

import * as React from "react";
import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import { ContentHeader, SectionLabel, Badge } from "./_shared";
import {
  useBillingSync,
  useUsageReport,
  changePlan,
  type SubscriptionInfo,
} from "./use-billing";
import { PLANS, formatBRL, type PlanCode, type Plan } from "@aethereos/kernel";

function useActiveRole(): string | null {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (drivers === null || userId === null || companyId === null) return;
    let cancelled = false;
    void (async () => {
      const { data } = await drivers.data
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const r = (data as { role?: string } | null)?.role ?? null;
      setRole(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, companyId]);
  return role;
}

const PLAN_ORDER: readonly PlanCode[] = ["free", "pro", "enterprise"];

function statusBadge(sub: SubscriptionInfo): {
  variant: "success" | "warning" | "neutral";
  label: string;
} {
  if (sub.status === "active") return { variant: "success", label: "Ativo" };
  if (sub.status === "trialing") return { variant: "neutral", label: "Trial" };
  if (sub.status === "past_due")
    return { variant: "warning", label: "Em atraso" };
  return { variant: "neutral", label: sub.status };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PlanCard({
  plan,
  current,
  onPick,
  busy,
  isOwner,
}: {
  plan: Plan;
  current: boolean;
  onPick: () => void;
  busy: boolean;
  isOwner: boolean;
}): React.ReactElement {
  const accent =
    plan.code === "free"
      ? "#94a3b8"
      : plan.code === "pro"
        ? "#34d399"
        : "#a78bfa";
  return (
    <div
      style={{
        flex: 1,
        background: current
          ? "rgba(52,211,153,0.06)"
          : "rgba(255,255,255,0.03)",
        border: current
          ? `1px solid ${accent}66`
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        minWidth: 200,
      }}
    >
      {current && (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            background: accent,
            color: "#0b1015",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          ATUAL
        </span>
      )}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            letterSpacing: "0.08em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {plan.name}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {formatBRL(plan.amountCents)}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            /mês
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            margin: "4px 0 0",
            lineHeight: 1.4,
          }}
        >
          {plan.tagline}
        </p>
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {plan.highlights.map((h) => (
          <li
            key={h}
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={12} color={accent} />
            {h}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onPick}
        disabled={current || busy || !isOwner}
        title={!isOwner ? "Apenas o owner pode alterar o plano" : undefined}
        style={{
          marginTop: "auto",
          padding: "8px 12px",
          background: current ? "rgba(255,255,255,0.06)" : accent,
          border: "none",
          borderRadius: 8,
          color: current ? "var(--text-tertiary)" : "#0b1015",
          fontSize: 12,
          fontWeight: 600,
          cursor: current || busy || !isOwner ? "default" : "pointer",
          opacity: !isOwner && !current ? 0.5 : 1,
        }}
      >
        {current
          ? "Plano atual"
          : busy
            ? "Processando…"
            : `Mover para ${plan.name}`}
      </button>
    </div>
  );
}

export function TabPlanoAssinatura(): React.ReactElement {
  const drivers = useDrivers();
  const role = useActiveRole();
  const billing = useBillingSync();
  const usage = useUsageReport();
  const [busyPlan, setBusyPlan] = useState<PlanCode | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const isOwner = role === "owner";

  async function handlePick(target: PlanCode): Promise<void> {
    if (!isOwner || busyPlan !== null) return;
    if (
      target === "free" &&
      !confirm(
        "Mover para Gratuito? Sua company perderá acesso a recursos premium ao final do período.",
      )
    ) {
      return;
    }
    setBusyPlan(target);
    setFeedback(null);
    try {
      const res = await changePlan(drivers, target);
      setFeedback({ kind: "ok", text: res.message });
      await Promise.all([billing.refresh(), usage.refresh()]);
    } catch (e) {
      setFeedback({
        kind: "err",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyPlan(null);
    }
  }

  if (billing.loading || usage.loading) {
    return (
      <div>
        <ContentHeader
          icon={CreditCard}
          iconBg="rgba(16,185,129,0.18)"
          iconColor="#34d399"
          title="Plano & Assinatura"
          subtitle="Carregando dados de billing…"
        />
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Carregando…
        </p>
      </div>
    );
  }

  if (billing.error !== null || billing.data === null) {
    return (
      <div>
        <ContentHeader
          icon={CreditCard}
          iconBg="rgba(239,68,68,0.18)"
          iconColor="#f87171"
          title="Plano & Assinatura"
          subtitle="Falha ao carregar"
        />
        <p style={{ fontSize: 13, color: "#f87171" }}>
          {billing.error ?? "Erro desconhecido"}
        </p>
      </div>
    );
  }

  const sub = billing.data.subscription;
  const status = statusBadge(sub);
  const currentPlan = billing.data.plan.code;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ContentHeader
        icon={CreditCard}
        iconBg="rgba(16,185,129,0.18)"
        iconColor="#34d399"
        title="Plano & Assinatura"
        subtitle="Gerencie o plano da empresa, limites e ciclo de cobrança"
        right={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      {feedback !== null && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 10,
            background:
              feedback.kind === "ok"
                ? "rgba(52,211,153,0.10)"
                : "rgba(239,68,68,0.10)",
            border: `1px solid ${feedback.kind === "ok" ? "rgba(52,211,153,0.30)" : "rgba(239,68,68,0.30)"}`,
            color: feedback.kind === "ok" ? "#34d399" : "#f87171",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertTriangle size={14} />
          )}
          {feedback.text}
        </div>
      )}

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {billing.data.plan.name}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {formatBRL(PLANS[currentPlan].amountCents)}/mês
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Período: {formatDate(sub.current_period_start)} →{" "}
          {formatDate(sub.current_period_end)}
        </span>
        {sub.cancel_at_period_end && (
          <span
            style={{
              fontSize: 12,
              color: "#fbbf24",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <AlertTriangle size={12} />
            Cancelamento agendado para o fim do período
          </span>
        )}
        {!isOwner && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Apenas o owner pode alterar o plano. Você pode ver consumo e
            faturas.
          </span>
        )}
      </div>

      <div>
        <SectionLabel>Comparar planos</SectionLabel>
        <div
          style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}
        >
          {PLAN_ORDER.map((code) => (
            <PlanCard
              key={code}
              plan={PLANS[code]}
              current={code === currentPlan}
              onPick={() => void handlePick(code)}
              busy={busyPlan !== null}
              isOwner={isOwner}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          padding: 12,
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.20)",
          borderRadius: 10,
          fontSize: 12,
          color: "var(--text-secondary)",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <Sparkles
          size={13}
          color="#a78bfa"
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <span>
          Checkout em modo simulado — a mudança de plano é aplicada
          imediatamente sem cobrança real. Para integração com Stripe e emissão
          de NF-e, ver <code>docs/billing/README.md</code>.
        </span>
      </div>
    </div>
  );
}
