// Sprint 30 MX164: Autenticação 2FA — política persistida em
// kernel.settings (scope=company, key=mfa_policy). Enforcement no
// boot do shell (fast-follow): se policy='all' e user sem MFA →
// redirect pra setup obrigatório antes do desktop.

import { useEffect, useState } from "react";
import { BadgeCheck, ShieldCheck, ShieldAlert } from "lucide-react";
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

type MfaRequired = "none" | "admins" | "all";

interface MfaPolicy {
  required: MfaRequired;
  remember_device: boolean;
}

const DEFAULT_POLICY: MfaPolicy = {
  required: "none",
  remember_device: true,
};

const KEY = "mfa_policy";

export function TabAutenticacao2FA() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const [policy, setPolicy] = useState<MfaPolicy>(DEFAULT_POLICY);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("settings")
      .select("value")
      .eq("scope", "company")
      .eq("scope_id", activeCompanyId)
      .eq("key", KEY)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { value: MfaPolicy } | null;
        if (row !== null && row.value !== null) {
          setPolicy({ ...DEFAULT_POLICY, ...row.value });
        }
        setLoaded(true);
      });
  }, [drivers, activeCompanyId]);

  async function persist(next: MfaPolicy) {
    setPolicy(next);
    if (drivers === null || activeCompanyId === null) return;
    setSaveStatus("saving");
    await drivers.data.from("settings").upsert(
      {
        scope: "company",
        scope_id: activeCompanyId,
        key: KEY,
        value: next,
      },
      { onConflict: "scope,scope_id,key" },
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  function setRequired(v: MfaRequired) {
    void persist({ ...policy, required: v });
  }

  if (!loaded) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
        Carregando…
      </div>
    );
  }

  return (
    <div>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="Autenticação em 2 Fatores"
        subtitle="Configure 2FA para colaboradores"
        right={
          saveStatus === "saving" ? (
            <Badge variant="info">Salvando…</Badge>
          ) : saveStatus === "saved" ? (
            <Badge variant="success">Salvo</Badge>
          ) : null
        }
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Política global</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Não obrigatório"
            sublabel="Cada colaborador escolhe se ativa 2FA"
            icon={
              <ShieldAlert
                size={13}
                style={{
                  color:
                    policy.required === "none"
                      ? "#fbbf24"
                      : "var(--text-tertiary)",
                }}
              />
            }
          >
            <RadioPill
              active={policy.required === "none"}
              onClick={() => setRequired("none")}
            />
          </SettingRow>
          <SettingRow
            label="Obrigatório para admins e owners"
            sublabel="Apenas roles com permissões elevadas"
            icon={
              <ShieldCheck
                size={13}
                style={{
                  color:
                    policy.required === "admins"
                      ? "#a5b4fc"
                      : "var(--text-tertiary)",
                }}
              />
            }
          >
            <RadioPill
              active={policy.required === "admins"}
              onClick={() => setRequired("admins")}
            />
          </SettingRow>
          <SettingRow
            label="Obrigatório para todos os colaboradores"
            sublabel="Login bloqueado até configurar 2FA"
            icon={
              <ShieldCheck
                size={13}
                style={{
                  color:
                    policy.required === "all"
                      ? "#86efac"
                      : "var(--text-tertiary)",
                }}
              />
            }
            last
          >
            <RadioPill
              active={policy.required === "all"}
              onClick={() => setRequired("all")}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Política de Senhas</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Comprimento mínimo"
            sublabel="Mínimo de caracteres exigido na senha"
          >
            <Badge variant="neutral">6 caracteres</Badge>
          </SettingRow>
          <SettingRow
            label="Exigir letra maiúscula"
            sublabel="Pelo menos uma A-Z"
          >
            <Badge variant="neutral">Não</Badge>
          </SettingRow>
          <SettingRow label="Exigir número" sublabel="Pelo menos um dígito 0-9">
            <Badge variant="neutral">Não</Badge>
          </SettingRow>
          <SettingRow
            label="Exigir caractere especial"
            sublabel="Pelo menos um símbolo"
            last
          >
            <Badge variant="neutral">Não</Badge>
          </SettingRow>
        </SettingGroup>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          ℹ️ Política gerenciada pelo provedor de autenticação (Supabase Auth).
          Customização avançada exige plano Enterprise — fast-follow.
        </p>
      </div>

      <div>
        <SectionLabel>Status por colaborador</SectionLabel>
        <ComingSoonSection
          icon={BadgeCheck}
          label="Lista com status TOTP por usuário"
          description="Enforcement no boot do shell + reset de 2FA em caso de perda — em breve."
        />
      </div>
    </div>
  );
}

function RadioPill({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: active ? "rgba(99,102,241,0.85)" : "transparent",
        border: active
          ? "1px solid rgba(99,102,241,1)"
          : "1px solid rgba(255,255,255,0.15)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 120ms ease, border-color 120ms ease",
      }}
      aria-pressed={active}
    >
      {active ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fff",
          }}
        />
      ) : null}
    </button>
  );
}
