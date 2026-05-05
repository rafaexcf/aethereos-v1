// Sprint 30 MX163: 2FA TOTP via Supabase Auth nativo.
// API usada: supabase.auth.mfa.{listFactors,enroll,challenge,verify,unenroll}
// - enroll → retorna QR code + secret (URI). User escaneia em app authenticator.
// - challenge + verify → confirma código TOTP. Factor passa de unverified → verified.
// - unenroll → remove factor (precisa código TOTP recente).

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, X, Check, Loader2 } from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";

type Phase =
  | { kind: "loading" }
  | { kind: "idle"; verified: boolean; factorId: string | null }
  | {
      kind: "enrolling";
      factorId: string;
      qrCode: string;
      secret: string;
      code: string;
      submitting: boolean;
      error: string | null;
    }
  | { kind: "unenrolling"; factorId: string; submitting: boolean }
  | { kind: "error"; message: string };

interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
}

export function TwoFactorAuth() {
  const drivers = useDrivers();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const reload = async () => {
    if (drivers === null) return;
    const client = drivers.data.getClient();
    const auth = client.auth as unknown as {
      mfa?: {
        listFactors: () => Promise<{
          data: { totp?: MfaFactor[]; all?: MfaFactor[] } | null;
          error: { message: string } | null;
        }>;
      };
    };
    const mfa = auth.mfa;
    if (mfa === undefined) {
      setPhase({
        kind: "error",
        message: "MFA não disponível neste cliente Supabase.",
      });
      return;
    }
    const { data, error } = await mfa.listFactors();
    if (error !== null) {
      setPhase({ kind: "error", message: error.message });
      return;
    }
    const totps = data?.totp ?? [];
    const verified = totps.find((f) => f.status === "verified") ?? null;
    setPhase({
      kind: "idle",
      verified: verified !== null,
      factorId: verified?.id ?? null,
    });
  };

  useEffect(() => {
    void reload();
  }, [drivers]); // reload é estável; intencionalmente fora da dep list.

  async function handleStartEnroll() {
    if (drivers === null) return;
    const client = drivers.data.getClient();
    const auth = client.auth as unknown as {
      mfa: {
        enroll: (params: {
          factorType: "totp";
          friendlyName?: string;
        }) => Promise<{
          data: {
            id: string;
            type: string;
            totp?: { qr_code: string; secret: string; uri: string };
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
    const { data, error } = await auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Aethereos · ${new Date().toLocaleDateString("pt-BR")}`,
    });
    if (error !== null || data === null) {
      setPhase({
        kind: "error",
        message: error?.message ?? "Falha ao iniciar 2FA",
      });
      return;
    }
    setPhase({
      kind: "enrolling",
      factorId: data.id,
      qrCode: data.totp?.qr_code ?? "",
      secret: data.totp?.secret ?? "",
      code: "",
      submitting: false,
      error: null,
    });
  }

  async function handleVerifyEnroll() {
    if (drivers === null || phase.kind !== "enrolling") return;
    setPhase({ ...phase, submitting: true, error: null });
    const client = drivers.data.getClient();
    const auth = client.auth as unknown as {
      mfa: {
        challengeAndVerify: (params: {
          factorId: string;
          code: string;
        }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await auth.mfa.challengeAndVerify({
      factorId: phase.factorId,
      code: phase.code.trim(),
    });
    if (error !== null) {
      setPhase({ ...phase, submitting: false, error: error.message });
      return;
    }
    void reload();
  }

  async function handleStartUnenroll() {
    if (phase.kind !== "idle" || !phase.verified || phase.factorId === null) {
      return;
    }
    if (
      !window.confirm(
        "Desativar 2FA reduz a segurança da sua conta. Confirmar?",
      )
    ) {
      return;
    }
    setPhase({
      kind: "unenrolling",
      factorId: phase.factorId,
      submitting: true,
    });
    if (drivers === null) return;
    const client = drivers.data.getClient();
    const auth = client.auth as unknown as {
      mfa: {
        unenroll: (params: {
          factorId: string;
        }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await auth.mfa.unenroll({ factorId: phase.factorId });
    if (error !== null) {
      setPhase({ kind: "error", message: error.message });
      return;
    }
    void reload();
  }

  if (phase.kind === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-tertiary)",
          fontSize: 12,
        }}
      >
        <Loader2 size={13} className="animate-spin" /> Carregando…
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.32)",
          color: "#fca5a5",
          fontSize: 12,
        }}
      >
        {phase.message}
      </div>
    );
  }

  if (phase.kind === "idle") {
    return phase.verified ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 6,
            background: "rgba(34,197,94,0.18)",
            color: "#86efac",
            border: "1px solid rgba(34,197,94,0.32)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={11} strokeWidth={2} />
          Ativado
        </span>
        <button
          type="button"
          onClick={() => void handleStartUnenroll()}
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.32)",
            borderRadius: 8,
            padding: "6px 12px",
            color: "#fca5a5",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Desativar 2FA
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => void handleStartEnroll()}
        style={{
          background: "rgba(99,102,241,0.85)",
          border: "1px solid rgba(99,102,241,1)",
          borderRadius: 8,
          padding: "7px 14px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ShieldAlert size={13} strokeWidth={2} />
        Ativar 2FA
      </button>
    );
  }

  if (phase.kind === "unenrolling") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-tertiary)",
          fontSize: 12,
        }}
      >
        <Loader2 size={13} className="animate-spin" /> Desativando…
      </div>
    );
  }

  // enrolling
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(99,102,241,0.32)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 360,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          Configure seu app autenticador
        </strong>
        <button
          type="button"
          onClick={() =>
            setPhase({ kind: "idle", verified: false, factorId: null })
          }
          aria-label="Cancelar"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>
      {phase.qrCode !== "" ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src={phase.qrCode}
            alt="QR Code 2FA"
            style={{ width: 200, height: 200 }}
          />
        </div>
      ) : null}
      {phase.secret !== "" ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono, monospace)",
            wordBreak: "break-all",
            padding: 8,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
          }}
        >
          {phase.secret}
        </div>
      ) : null}
      <p
        style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}
      >
        Escaneie o QR (ou cole a chave manualmente) em Google Authenticator,
        Authy ou 1Password. Em seguida, digite o código de 6 dígitos abaixo.
      </p>
      <input
        type="text"
        value={phase.code}
        onChange={(e) =>
          setPhase({ ...phase, code: e.target.value, error: null })
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleVerifyEnroll();
        }}
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 18,
          color: "var(--text-primary)",
          textAlign: "center",
          letterSpacing: "0.3em",
          fontFamily: "var(--font-mono, monospace)",
          outline: "none",
        }}
      />
      {phase.error !== null && (
        <span style={{ fontSize: 11, color: "#fca5a5" }}>{phase.error}</span>
      )}
      <button
        type="button"
        onClick={() => void handleVerifyEnroll()}
        disabled={phase.code.trim().length < 6 || phase.submitting}
        style={{
          background: "rgba(99,102,241,0.85)",
          border: "none",
          borderRadius: 8,
          padding: "8px 14px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          cursor: phase.submitting ? "wait" : "pointer",
          opacity: phase.code.trim().length < 6 ? 0.5 : 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {phase.submitting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Check size={13} strokeWidth={2} />
        )}
        Verificar e ativar
      </button>
    </div>
  );
}
