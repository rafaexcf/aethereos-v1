// Sprint 30 MX167: LGPD & Privacidade — DPO + retenção + exportação real (LGPD Art. 18).
// DPO persistido em kernel.settings scope='company' key='dpo_contact'.
// Exportação chama Edge Function export-company-data; download client-side via blob URL.

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Download, Lock } from "lucide-react";
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
import { friendlyError } from "../../../lib/error-messages";

interface DpoContact {
  name: string;
  email: string;
  phone: string;
}

const DEFAULT_DPO: DpoContact = { name: "", email: "", phone: "" };
const DPO_KEY = "dpo_contact";

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
  padding: "6px 10px",
  outline: "none",
  width: 240,
};

type SaveStatus = "idle" | "saving" | "saved";
type ExportStatus = "idle" | "preparing" | "error";

export function TabLGPD() {
  const drivers = useDrivers();
  const { activeCompanyId, userId } = useSessionStore();

  const [dpo, setDpo] = useState<DpoContact>(DEFAULT_DPO);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPersistRef = useRef(true);

  // Carrega DPO no mount.
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("settings")
      .select("value")
      .eq("scope", "company")
      .eq("scope_id", activeCompanyId)
      .eq("key", DPO_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { value: DpoContact } | null;
        if (row !== null && row.value !== null) {
          setDpo({ ...DEFAULT_DPO, ...row.value });
        }
        setLoaded(true);
      });
  }, [drivers, activeCompanyId]);

  // Carrega role do caller.
  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    void drivers.data
      .from("tenant_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", activeCompanyId)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { role: string } | null;
        setRole(row?.role ?? null);
        setRoleLoaded(true);
      });
  }, [drivers, userId, activeCompanyId]);

  // Auto-save com debounce 1s.
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (drivers === null || activeCompanyId === null) return;

    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);

    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      void drivers.data
        .from("settings")
        .upsert(
          {
            scope: "company",
            scope_id: activeCompanyId,
            key: DPO_KEY,
            value: dpo,
          },
          { onConflict: "scope,scope_id,key" },
        )
        .then(() => {
          setSaveStatus("saved");
          savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
        });
    }, 1000);

    return () => {
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    };
  }, [dpo, drivers, activeCompanyId, loaded]);

  async function handleExport() {
    if (drivers === null) {
      setExportStatus("error");
      setExportError("Sessão indisponível");
      return;
    }
    setExportStatus("preparing");
    setExportError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as
        | string
        | undefined;
      if (supabaseUrl === undefined || supabaseUrl === "") {
        throw new Error("Configuração Supabase ausente");
      }

      const client = drivers.data.getClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      const accessToken = session?.access_token ?? null;
      if (accessToken === null) {
        throw new Error("Sessão expirada — faça login novamente");
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/export-company-data`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!res.ok) {
        let msg = `Erro ${res.status}`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (typeof errJson.error === "string") msg = errJson.error;
        } catch {
          // resposta sem JSON, usa status code
        }
        throw new Error(msg);
      }

      // Filename do header Content-Disposition (fallback se ausente).
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename =
        match !== null && match[1] !== undefined
          ? match[1]
          : `aethereos-export-${new Date().toISOString().slice(0, 10)}.json`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus("idle");
    } catch (err) {
      setExportStatus("error");
      setExportError(friendlyError(err));
    }
  }

  const isOwner = role === "owner";

  return (
    <div>
      <ContentHeader
        icon={BadgeCheck}
        iconBg="rgba(99,102,241,0.14)"
        iconColor="#a5b4fc"
        title="LGPD & Privacidade"
        subtitle="Compliance e direitos do titular"
        right={
          saveStatus === "saving" ? (
            <Badge variant="info">Salvando…</Badge>
          ) : saveStatus === "saved" ? (
            <Badge variant="success">Salvo</Badge>
          ) : null
        }
      />

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Encarregado de Dados (DPO)</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nome do DPO">
            <input
              type="text"
              value={dpo.name}
              onChange={(e) => setDpo({ ...dpo, name: e.target.value })}
              placeholder="Nome completo"
              aria-label="Nome do DPO"
              style={INPUT_STYLE}
              disabled={!loaded}
            />
          </SettingRow>
          <SettingRow label="Email do DPO">
            <input
              type="email"
              value={dpo.email}
              onChange={(e) => setDpo({ ...dpo, email: e.target.value })}
              placeholder="dpo@empresa.com.br"
              aria-label="Email do DPO"
              style={INPUT_STYLE}
              disabled={!loaded}
            />
          </SettingRow>
          <SettingRow label="Telefone" last>
            <input
              type="tel"
              value={dpo.phone}
              onChange={(e) => setDpo({ ...dpo, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              aria-label="Telefone do DPO"
              style={INPUT_STYLE}
              disabled={!loaded}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Política de Retenção</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Dados operacionais"
            sublabel="Retidos enquanto a conta estiver ativa"
          >
            <Badge variant="info">enquanto ativa</Badge>
          </SettingRow>
          <SettingRow
            label="Audit log"
            sublabel="Histórico de ações dos usuários"
          >
            <Badge variant="info">2 anos</Badge>
          </SettingRow>
          <SettingRow
            label="Dados excluídos"
            sublabel="Mascarados em 24h, purgados definitivamente"
            last
          >
            <Badge variant="info">30 dias</Badge>
          </SettingRow>
        </SettingGroup>
      </div>

      {roleLoaded && isOwner && (
        <div>
          <SectionLabel>Exportação de Dados</SectionLabel>
          <SettingGroup>
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.55,
              }}
            >
              Exporte todos os dados da sua empresa em formato JSON. Conforme
              LGPD Art. 18 — direito à portabilidade.
            </div>
            <SettingRow
              label="Exportar tudo"
              sublabel={
                exportStatus === "preparing"
                  ? "Preparando exportação…"
                  : exportError !== null
                    ? exportError
                    : "Apenas o owner pode exportar"
              }
              icon={
                <Download size={13} style={{ color: "var(--text-tertiary)" }} />
              }
              last
            >
              <InlineButton
                variant="primary"
                onClick={() => {
                  void handleExport();
                }}
              >
                {exportStatus === "preparing"
                  ? "Preparando…"
                  : "Exportar dados da empresa"}
              </InlineButton>
            </SettingRow>
          </SettingGroup>
        </div>
      )}

      {roleLoaded && !isOwner && (
        <div>
          <SectionLabel>Exportação de Dados</SectionLabel>
          <SettingGroup>
            <SettingRow
              label="Exportar dados da empresa"
              sublabel="Apenas o owner pode exportar dados"
              icon={
                <Lock size={13} style={{ color: "var(--text-tertiary)" }} />
              }
              last
            >
              <Badge variant="neutral">Restrito</Badge>
            </SettingRow>
          </SettingGroup>
        </div>
      )}
    </div>
  );
}
