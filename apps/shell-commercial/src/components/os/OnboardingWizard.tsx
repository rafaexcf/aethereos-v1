import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardDrive,
  MessageSquare,
  Store,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Rocket,
  Upload,
  X,
} from "lucide-react";
import { PhoneInput } from "../shared/PhoneInput";
import { CEPInput, type CEPAddress } from "../shared/CEPInput";
import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";
import type { SupabaseBrowserAuthDriver } from "@aethereos/drivers-supabase/browser";

interface OnboardingWizardProps {
  companyId: string;
  accessToken: string;
  data: SupabaseBrowserDataDriver;
  auth: SupabaseBrowserAuthDriver;
  supabaseUrl: string;
  onComplete: () => void;
}

const TOUR_CARDS = [
  {
    icon: HardDrive,
    color: "#06b6d4",
    name: "Drive",
    desc: "Armazene documentos e arquivos da empresa com segurança.",
  },
  {
    icon: MessageSquare,
    color: "#06b6d4",
    name: "Mensagens",
    desc: "Converse com sua equipe em canais organizados.",
  },
  {
    icon: Store,
    color: "#0ea5e9",
    name: "Magic Store",
    desc: "Expanda o Aethereos com apps verticais e módulos.",
  },
];

const inputStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  padding: "8px 12px",
  width: "100%",
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
};

export function OnboardingWizard({
  companyId,
  accessToken,
  data,
  auth,
  supabaseUrl,
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<CEPAddress | null>(null);
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddressFound = useCallback((addr: CEPAddress) => {
    setAddress(addr);
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      let logoUrl: string | undefined;

      if (logoFile !== null) {
        const ext = logoFile.name.split(".").pop() ?? "jpg";
        const path = `${companyId}/logo.${ext}`;
        const client = data.getClient();
        const { data: uploaded } = await client.storage
          .from("company-logos")
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (uploaded !== null) {
          const { data: pub } = client.storage
            .from("company-logos")
            .getPublicUrl(path);
          logoUrl = pub.publicUrl;
        }
      }

      const body: Record<string, unknown> = { company_id: companyId };
      if (phone) body["phone"] = phone;
      if (logoUrl) body["logo_url"] = logoUrl;
      if (address !== null && cep) {
        body["address"] = {
          cep: address.cep,
          street: address.street,
          number: addressNumber,
          complement: addressComplement || undefined,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        };
      }

      const edgeFnUrl = `${supabaseUrl}/functions/v1/complete-onboarding`;
      const res = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Falha ao completar onboarding");
      }

      // Refresh company name (may have changed logo/phone)
      void auth.getCompanyName(companyId);
      setStep(3);
    } catch {
      // error is surfaced to user via isSubmitting state reset; no logging in prod
    } finally {
      setIsSubmitting(false);
    }
  }, [
    logoFile,
    phone,
    cep,
    address,
    addressNumber,
    addressComplement,
    companyId,
    accessToken,
    data,
    auth,
    supabaseUrl,
  ]);

  return (
    <div
      data-testid="onboarding-wizard"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--bg-base)",
          borderRadius: "var(--radius-xl, 16px)",
          width: "100%",
          maxWidth: 560,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "20px 24px 0",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid={`step-indicator-${i}`}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 99,
                background:
                  step > i
                    ? "var(--color-accent, #6366f1)"
                    : step === i
                      ? "var(--color-accent, #6366f1)"
                      : "var(--border-default)",
                opacity: step === i ? 1 : step > i ? 0.6 : 0.3,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && <Step1Tour key="s0" onNext={() => setStep(1)} />}
          {step === 1 && (
            <Step2Data
              key="s1"
              phone={phone}
              onPhoneChange={setPhone}
              cep={cep}
              onCepChange={setCep}
              onAddressFound={handleAddressFound}
              address={address}
              addressNumber={addressNumber}
              onAddressNumberChange={setAddressNumber}
              addressComplement={addressComplement}
              onAddressComplementChange={setAddressComplement}
              logoPreview={logoPreview}
              fileRef={fileRef}
              onLogoChange={handleLogoChange}
              onClearLogo={() => {
                setLogoFile(null);
                setLogoPreview(null);
              }}
              onNext={() => void handleComplete()}
              isSubmitting={isSubmitting}
            />
          )}
          {step === 3 && <Step3Done key="s3" onEnter={onComplete} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Step1Tour({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      style={{ padding: 24 }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        Bem-vindo ao Aethereos
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginTop: 6,
          marginBottom: 20,
        }}
      >
        O OS B2B que reúne tudo que sua empresa precisa. Veja o que está
        disponível.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {TOUR_CARDS.map(({ icon: Icon, color, name, desc }) => (
          <div
            key={name}
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${color}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 2,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              {desc}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "var(--color-accent, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        Próximo <ChevronRight size={16} />
      </button>
    </motion.div>
  );
}

interface Step2Props {
  phone: string;
  onPhoneChange: (v: string) => void;
  cep: string;
  onCepChange: (v: string) => void;
  onAddressFound: (addr: CEPAddress) => void;
  address: CEPAddress | null;
  addressNumber: string;
  onAddressNumberChange: (v: string) => void;
  addressComplement: string;
  onAddressComplementChange: (v: string) => void;
  logoPreview: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: () => void;
  onNext: () => void;
  isSubmitting: boolean;
}

function Step2Data({
  phone,
  onPhoneChange,
  cep,
  onCepChange,
  onAddressFound,
  address,
  addressNumber,
  onAddressNumberChange,
  addressComplement,
  onAddressComplementChange,
  logoPreview,
  fileRef,
  onLogoChange,
  onClearLogo,
  onNext,
  isSubmitting,
}: Step2Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      style={{ padding: 24 }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        Dados complementares
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        Todos os campos são opcionais. Você pode preencher depois em
        Configurações.
      </p>

      {/* Logo */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Logo da empresa</label>
        {logoPreview !== null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={logoPreview}
              alt="logo preview"
              style={{
                width: 56,
                height: 56,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
              }}
            />
            <button
              onClick={onClearLogo}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
            >
              <X size={12} /> Remover
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: "var(--bg-surface)",
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Upload size={14} /> Escolher imagem (PNG, JPG, máx 2MB)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onLogoChange}
          style={{ display: "none" }}
          aria-label="Logo da empresa"
        />
      </div>

      {/* Phone */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Telefone</label>
        <PhoneInput
          value={phone}
          onChange={onPhoneChange}
          style={inputStyle}
          aria-label="Telefone"
        />
      </div>

      {/* CEP */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CEP (endereço da sede)</label>
        <CEPInput
          value={cep}
          onChange={onCepChange}
          onAddressFound={onAddressFound}
          style={inputStyle}
          aria-label="CEP"
        />
      </div>

      {/* Address fields auto-filled from CEP */}
      {address !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{ overflow: "hidden", marginBottom: 12 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <label style={labelStyle}>Rua</label>
              <input
                value={address.street}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
                aria-label="Rua"
              />
            </div>
            <div>
              <label style={labelStyle}>Número</label>
              <input
                value={addressNumber}
                onChange={(e) => onAddressNumberChange(e.target.value)}
                style={inputStyle}
                placeholder="S/N"
                aria-label="Número"
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label style={labelStyle}>Bairro</label>
              <input
                value={address.neighborhood}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
                aria-label="Bairro"
              />
            </div>
            <div>
              <label style={labelStyle}>Complemento</label>
              <input
                value={addressComplement}
                onChange={(e) => onAddressComplementChange(e.target.value)}
                style={inputStyle}
                placeholder="Sala 42"
                aria-label="Complemento"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                value={address.city}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
                aria-label="Cidade"
              />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input
                value={address.state}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
                aria-label="UF"
              />
            </div>
          </div>
        </motion.div>
      )}

      <button
        onClick={onNext}
        disabled={isSubmitting}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "10px 0",
          background: "var(--color-accent, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {isSubmitting ? (
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : null}
        {isSubmitting ? "Salvando..." : "Concluir configuração"}
      </button>
    </motion.div>
  );
}

function Step3Done({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ padding: 40, textAlign: "center" }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#10b98120",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <CheckCircle2 size={32} style={{ color: "#10b981" }} />
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Tudo pronto!
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        Bem-vindo ao Aethereos. Sua empresa está configurada e pronta para usar.
      </p>
      <button
        onClick={onEnter}
        style={{
          padding: "10px 28px",
          background: "var(--color-accent, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Rocket size={16} /> Acessar a Mesa
      </button>
    </motion.div>
  );
}
