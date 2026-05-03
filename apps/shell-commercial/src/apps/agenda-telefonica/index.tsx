import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  Mail,
  Globe,
  Star,
  Users,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  Pencil,
  Copy,
  MapPin,
  Calendar,
  Link,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  AlertTriangle,
  Upload,
  ChevronDown,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { moveToTrash } from "../../lib/trash";

function useStableModalA11y<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = ref.current;
    if (root !== null) {
      const focusables = root.querySelectorAll<HTMLElement>(
        'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      const firstField = Array.from(focusables).find(
        (el) =>
          el.tagName === "INPUT" ||
          el.tagName === "SELECT" ||
          el.tagName === "TEXTAREA",
      );
      (firstField ?? focusables[0])?.focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && root !== null) {
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (first === undefined || last === undefined) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey, true);

    return () => {
      document.removeEventListener("keydown", handleKey, true);
      previouslyFocused?.focus();
    };
  }, [open]);

  return ref;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MethodType = "phone" | "email" | "website" | "social";

interface ContactMethod {
  id: string;
  contact_id: string;
  user_id: string;
  type: MethodType;
  label: string;
  value: string;
  is_primary: boolean;
}

interface ContactAddress {
  id: string;
  contact_id: string;
  user_id: string;
  label: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

interface ContactGroup {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  color: string;
}

interface Contact {
  id: string;
  user_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  company: string;
  job_title: string;
  notes: string;
  birthday: string | null;
  avatar_url: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // joined in-memory
  methods: ContactMethod[];
  addresses: ContactAddress[];
  groupIds: string[];
}

type ViewId = "all" | "favorites" | "duplicates" | string; // string = group_id

type ModalState =
  | { type: "none" }
  | { type: "edit"; contact: Contact | null }
  | { type: "delete"; contact: Contact }
  | { type: "csv-import" }
  | { type: "create-group" };

// ─── Form types ───────────────────────────────────────────────────────────────

interface FPhone {
  tempId: string;
  label: string;
  value: string;
  is_primary: boolean;
}
interface FEmail {
  tempId: string;
  label: string;
  value: string;
  is_primary: boolean;
}
interface FWebsite {
  tempId: string;
  value: string;
}
interface FSocial {
  tempId: string;
  platform: string;
  value: string;
}
interface FAddress {
  tempId: string;
  label: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}
interface FormState {
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  notes: string;
  birthday: string;
  is_favorite: boolean;
  phones: FPhone[];
  emails: FEmail[];
  websites: FWebsite[];
  socials: FSocial[];
  addresses: FAddress[];
  groupIds: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

const ASIDE_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "rgba(15,21,27,0.82)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
  scrollbarWidth: "none",
};

const GROUP_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  pink: "#ec4899",
  teal: "#14b8a6",
  gray: "#64748b",
  indigo: "#6366f1",
};

const AVATAR_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#f97316",
];

const PHONE_LABELS = ["pessoal", "trabalho", "celular", "fax", "outro"];
const EMAIL_LABELS = ["pessoal", "trabalho", "outro"];
const ADDRESS_LABELS = ["casa", "trabalho", "outro"];
const SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "twitter",
  "github",
  "facebook",
  "youtube",
  "tiktok",
  "outro",
];

const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9000,
  padding: 24,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId(): string {
  return crypto.randomUUID();
}

function getInitials(c: Contact): string {
  if (c.first_name && c.last_name)
    return ((c.first_name[0] ?? "") + (c.last_name[0] ?? "")).toUpperCase();
  if (c.first_name) return c.first_name.slice(0, 2).toUpperCase();
  if (c.last_name) return c.last_name.slice(0, 2).toUpperCase();
  if (c.company) return c.company.slice(0, 2).toUpperCase();
  return "?";
}

function getAvatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "#8b5cf6";
}

function computeDisplayName(
  first: string,
  last: string,
  company: string,
): string {
  return (
    [first.trim(), last.trim()].filter(Boolean).join(" ") ||
    company.trim() ||
    "Sem nome"
  );
}

function formatBirthday(birthday: string | null): string {
  if (!birthday) return "";
  const d = new Date(birthday + "T00:00:00");
  if (isNaN(d.getTime())) return birthday;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function csvCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n"))
    return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const row: string[] = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i] ?? "";
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        row.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function generateCSV(contacts: Contact[]): string {
  const headers = [
    "Nome",
    "Sobrenome",
    "Empresa",
    "Cargo",
    "Aniversário",
    "Notas",
    "Favorito",
    "Telefone 1",
    "Tipo Tel 1",
    "Telefone 2",
    "Tipo Tel 2",
    "Email 1",
    "Tipo Email 1",
    "Email 2",
    "Tipo Email 2",
    "Site",
    "Rede Social",
    "URL Rede Social",
  ];
  const rows = contacts.map((c) => {
    const phones = c.methods.filter((m) => m.type === "phone");
    const emails = c.methods.filter((m) => m.type === "email");
    const websites = c.methods.filter((m) => m.type === "website");
    const socials = c.methods.filter((m) => m.type === "social");
    return [
      c.first_name,
      c.last_name,
      c.company,
      c.job_title,
      c.birthday ?? "",
      c.notes,
      c.is_favorite ? "Sim" : "Não",
      phones[0]?.value ?? "",
      phones[0]?.label ?? "",
      phones[1]?.value ?? "",
      phones[1]?.label ?? "",
      emails[0]?.value ?? "",
      emails[0]?.label ?? "",
      emails[1]?.value ?? "",
      emails[1]?.label ?? "",
      websites[0]?.value ?? "",
      socials[0]?.label ?? "",
      socials[0]?.value ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [headers.map(csvCell).join(","), ...rows].join("\n");
}

function initForm(c: Contact | null): FormState {
  if (!c)
    return {
      first_name: "",
      last_name: "",
      company: "",
      job_title: "",
      notes: "",
      birthday: "",
      is_favorite: false,
      phones: [],
      emails: [],
      websites: [],
      socials: [],
      addresses: [],
      groupIds: [],
    };
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    company: c.company,
    job_title: c.job_title,
    notes: c.notes,
    birthday: c.birthday ?? "",
    is_favorite: c.is_favorite,
    phones: c.methods
      .filter((m) => m.type === "phone")
      .map((m) => ({
        tempId: m.id,
        label: m.label,
        value: m.value,
        is_primary: m.is_primary,
      })),
    emails: c.methods
      .filter((m) => m.type === "email")
      .map((m) => ({
        tempId: m.id,
        label: m.label,
        value: m.value,
        is_primary: m.is_primary,
      })),
    websites: c.methods
      .filter((m) => m.type === "website")
      .map((m) => ({ tempId: m.id, value: m.value })),
    socials: c.methods
      .filter((m) => m.type === "social")
      .map((m) => ({ tempId: m.id, platform: m.label, value: m.value })),
    addresses: c.addresses.map((a) => ({
      tempId: a.id,
      label: a.label,
      street: a.street,
      number: a.number,
      complement: a.complement,
      district: a.district,
      city: a.city,
      state: a.state,
      country: a.country,
      postal_code: a.postal_code,
    })),
    groupIds: c.groupIds,
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ contact, size = 40 }: { contact: Contact; size?: number }) {
  const color = getAvatarColor(contact.id);
  const initials = getInitials(contact);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontSize: size < 36 ? 13 : size < 60 ? 16 : 22,
        fontWeight: 600,
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

// ─── InputRow helper ──────────────────────────────────────────────────────────

function InputRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {children}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 10px",
        fontSize: 13,
        color: "var(--text-primary)",
        outline: "none",
        ...style,
      }}
    />
  );
}

function FormSelect({
  value,
  onChange,
  options,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 10px",
        fontSize: 13,
        color: "var(--text-primary)",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.45)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: 26,
        ...style,
      }}
    >
      {options.map((o) => (
        <option
          key={o}
          value={o}
          style={{ background: "#1a1f26", color: "var(--text-primary)" }}
        >
          {o}
        </option>
      ))}
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-tertiary)",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        margin: "16px 0 6px",
      }}
    >
      {label}
    </p>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  contact: Contact | null;
  groups: ContactGroup[];
  onSave: (f: FormState) => Promise<void>;
  onClose: () => void;
}

function EditModal({ contact, groups, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<FormState>(() => initForm(contact));
  const [saving, setSaving] = useState(false);
  const [showAddr, setShowAddr] = useState(form.addresses.length > 0);
  const modalRef = useStableModalA11y<HTMLDivElement>(true, onClose);

  function upd<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    color: "var(--text-primary)",
    outline: "none",
  };
  const addBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text-secondary)",
    cursor: "pointer",
    marginTop: 4,
  };
  const removeBtnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 6,
    color: "rgba(255,255,255,0.30)",
    cursor: "pointer",
    flexShrink: 0,
  };

  return createPortal(
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={contact ? "Editar contato" : "Novo contato"}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1f26",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {contact ? "Editar contato" : "Novo contato"}
          </span>
          <button type="button" onClick={onClose} style={removeBtnStyle}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          className="agenda-modal-scroll"
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "0 20px 20px",
            minHeight: 0,
          }}
        >
          {/* Favorite toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingTop: 14,
              marginBottom: -4,
            }}
          >
            <button
              type="button"
              onClick={() => upd("is_favorite", !form.is_favorite)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                background: form.is_favorite
                  ? "rgba(251,191,36,0.12)"
                  : "transparent",
                border: "1px solid",
                borderColor: form.is_favorite
                  ? "rgba(251,191,36,0.35)"
                  : "rgba(255,255,255,0.10)",
                borderRadius: 8,
                fontSize: 12,
                color: form.is_favorite ? "#fbbf24" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <Star size={13} fill={form.is_favorite ? "#fbbf24" : "none"} />
              {form.is_favorite ? "Favorito" : "Favoritar"}
            </button>
          </div>

          {/* Basic info */}
          <SectionLabel label="Dados básicos" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <InputRow>
              <div style={{ flex: 1 }}>
                <FieldLabel>Nome</FieldLabel>
                <FormInput
                  value={form.first_name}
                  onChange={(v) => upd("first_name", v)}
                  placeholder="Nome"
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Sobrenome</FieldLabel>
                <FormInput
                  value={form.last_name}
                  onChange={(v) => upd("last_name", v)}
                  placeholder="Sobrenome"
                />
              </div>
            </InputRow>
            <InputRow>
              <div style={{ flex: 1 }}>
                <FieldLabel>Empresa</FieldLabel>
                <FormInput
                  value={form.company}
                  onChange={(v) => upd("company", v)}
                  placeholder="Empresa"
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Cargo</FieldLabel>
                <FormInput
                  value={form.job_title}
                  onChange={(v) => upd("job_title", v)}
                  placeholder="Cargo"
                />
              </div>
            </InputRow>
            <div style={{ maxWidth: "50%" }}>
              <FieldLabel>Data de nascimento</FieldLabel>
              <FormInput
                value={form.birthday}
                onChange={(v) => upd("birthday", v)}
                type="date"
                placeholder="Data de nascimento"
              />
            </div>
          </div>

          {/* Phones */}
          <SectionLabel label="Telefones" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.phones.map((p, i) => (
              <InputRow key={p.tempId}>
                <FormSelect
                  value={p.label}
                  onChange={(v) =>
                    upd(
                      "phones",
                      form.phones.map((x, j) =>
                        j === i ? { ...x, label: v } : x,
                      ),
                    )
                  }
                  options={PHONE_LABELS}
                />
                <FormInput
                  value={p.value}
                  onChange={(v) =>
                    upd(
                      "phones",
                      form.phones.map((x, j) =>
                        j === i ? { ...x, value: v } : x,
                      ),
                    )
                  }
                  placeholder="(11) 99999-9999"
                  type="tel"
                />
                <button
                  type="button"
                  onClick={() =>
                    upd(
                      "phones",
                      form.phones.filter((_, j) => j !== i),
                    )
                  }
                  style={removeBtnStyle}
                >
                  <X size={13} />
                </button>
              </InputRow>
            ))}
            <button
              type="button"
              onClick={() =>
                upd("phones", [
                  ...form.phones,
                  {
                    tempId: genId(),
                    label: "pessoal",
                    value: "",
                    is_primary: form.phones.length === 0,
                  },
                ])
              }
              style={addBtnStyle}
            >
              <Plus size={13} /> Adicionar telefone
            </button>
          </div>

          {/* Emails */}
          <SectionLabel label="E-mails" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.emails.map((em, i) => (
              <InputRow key={em.tempId}>
                <FormSelect
                  value={em.label}
                  onChange={(v) =>
                    upd(
                      "emails",
                      form.emails.map((x, j) =>
                        j === i ? { ...x, label: v } : x,
                      ),
                    )
                  }
                  options={EMAIL_LABELS}
                />
                <FormInput
                  value={em.value}
                  onChange={(v) =>
                    upd(
                      "emails",
                      form.emails.map((x, j) =>
                        j === i ? { ...x, value: v } : x,
                      ),
                    )
                  }
                  placeholder="email@exemplo.com"
                  type="email"
                />
                <button
                  type="button"
                  onClick={() =>
                    upd(
                      "emails",
                      form.emails.filter((_, j) => j !== i),
                    )
                  }
                  style={removeBtnStyle}
                >
                  <X size={13} />
                </button>
              </InputRow>
            ))}
            <button
              type="button"
              onClick={() =>
                upd("emails", [
                  ...form.emails,
                  {
                    tempId: genId(),
                    label: "pessoal",
                    value: "",
                    is_primary: form.emails.length === 0,
                  },
                ])
              }
              style={addBtnStyle}
            >
              <Plus size={13} /> Adicionar e-mail
            </button>
          </div>

          {/* Websites */}
          <SectionLabel label="Sites" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.websites.map((w, i) => (
              <InputRow key={w.tempId}>
                <FormInput
                  value={w.value}
                  onChange={(v) =>
                    upd(
                      "websites",
                      form.websites.map((x, j) =>
                        j === i ? { ...x, value: v } : x,
                      ),
                    )
                  }
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() =>
                    upd(
                      "websites",
                      form.websites.filter((_, j) => j !== i),
                    )
                  }
                  style={removeBtnStyle}
                >
                  <X size={13} />
                </button>
              </InputRow>
            ))}
            <button
              type="button"
              onClick={() =>
                upd("websites", [
                  ...form.websites,
                  { tempId: genId(), value: "" },
                ])
              }
              style={addBtnStyle}
            >
              <Plus size={13} /> Adicionar site
            </button>
          </div>

          {/* Social networks */}
          <SectionLabel label="Redes sociais" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.socials.map((s, i) => (
              <InputRow key={s.tempId}>
                <FormSelect
                  value={s.platform}
                  onChange={(v) =>
                    upd(
                      "socials",
                      form.socials.map((x, j) =>
                        j === i ? { ...x, platform: v } : x,
                      ),
                    )
                  }
                  options={SOCIAL_PLATFORMS}
                />
                <FormInput
                  value={s.value}
                  onChange={(v) =>
                    upd(
                      "socials",
                      form.socials.map((x, j) =>
                        j === i ? { ...x, value: v } : x,
                      ),
                    )
                  }
                  placeholder="URL ou @usuário"
                />
                <button
                  type="button"
                  onClick={() =>
                    upd(
                      "socials",
                      form.socials.filter((_, j) => j !== i),
                    )
                  }
                  style={removeBtnStyle}
                >
                  <X size={13} />
                </button>
              </InputRow>
            ))}
            <button
              type="button"
              onClick={() =>
                upd("socials", [
                  ...form.socials,
                  { tempId: genId(), platform: "linkedin", value: "" },
                ])
              }
              style={addBtnStyle}
            >
              <Plus size={13} /> Adicionar rede social
            </button>
          </div>

          {/* Address (collapsible) */}
          <button
            type="button"
            onClick={() => setShowAddr((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "16px 0 6px",
            }}
          >
            <ChevronDown
              size={13}
              style={{
                transform: showAddr ? "none" : "rotate(-90deg)",
                transition: "transform 200ms",
              }}
            />
            Endereço
          </button>
          {showAddr && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.addresses.map((a, i) => {
                function updateAddr(patch: Partial<FAddress>) {
                  upd(
                    "addresses",
                    form.addresses.map((x, j) =>
                      j === i ? { ...x, ...patch } : x,
                    ),
                  );
                }
                return (
                  <div
                    key={a.tempId}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <InputRow>
                      <FormSelect
                        value={a.label}
                        onChange={(v) => updateAddr({ label: v })}
                        options={ADDRESS_LABELS}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          upd(
                            "addresses",
                            form.addresses.filter((_, j) => j !== i),
                          )
                        }
                        style={{ ...removeBtnStyle, marginLeft: "auto" }}
                      >
                        <X size={13} />
                      </button>
                    </InputRow>
                    <InputRow>
                      <FormInput
                        value={a.street}
                        onChange={(v) => updateAddr({ street: v })}
                        placeholder="Rua / Avenida"
                      />
                      <input
                        type="text"
                        value={a.number}
                        onChange={(e) => updateAddr({ number: e.target.value })}
                        placeholder="Nº"
                        style={{ ...inputStyle, flex: "none", width: 60 }}
                      />
                    </InputRow>
                    <InputRow>
                      <FormInput
                        value={a.complement}
                        onChange={(v) => updateAddr({ complement: v })}
                        placeholder="Complemento"
                      />
                      <FormInput
                        value={a.district}
                        onChange={(v) => updateAddr({ district: v })}
                        placeholder="Bairro"
                      />
                    </InputRow>
                    <InputRow>
                      <FormInput
                        value={a.city}
                        onChange={(v) => updateAddr({ city: v })}
                        placeholder="Cidade"
                      />
                      <input
                        type="text"
                        value={a.state}
                        onChange={(e) => updateAddr({ state: e.target.value })}
                        placeholder="UF"
                        style={{ ...inputStyle, flex: "none", width: 50 }}
                      />
                      <input
                        type="text"
                        value={a.postal_code}
                        onChange={(e) =>
                          updateAddr({ postal_code: e.target.value })
                        }
                        placeholder="CEP"
                        style={{ ...inputStyle, flex: "none", width: 90 }}
                      />
                    </InputRow>
                    <FormInput
                      value={a.country}
                      onChange={(v) => updateAddr({ country: v })}
                      placeholder="País"
                    />
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  upd("addresses", [
                    ...form.addresses,
                    {
                      tempId: genId(),
                      label: "casa",
                      street: "",
                      number: "",
                      complement: "",
                      district: "",
                      city: "",
                      state: "",
                      country: "Brasil",
                      postal_code: "",
                    },
                  ]);
                }}
                style={addBtnStyle}
              >
                <Plus size={13} /> Adicionar endereço
              </button>
            </div>
          )}

          {/* Notes */}
          <SectionLabel label="Observações" />
          <textarea
            value={form.notes}
            onChange={(e) => upd("notes", e.target.value)}
            placeholder="Anotações sobre este contato..."
            rows={3}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 13,
              color: "var(--text-primary)",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          {/* Groups */}
          {groups.length > 0 && (
            <>
              <SectionLabel label="Grupos" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {groups.map((g) => {
                  const on = form.groupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        upd(
                          "groupIds",
                          on
                            ? form.groupIds.filter((id) => id !== g.id)
                            : [...form.groupIds, g.id],
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: "pointer",
                        background: on
                          ? (GROUP_COLORS[g.color] ?? "#3b82f6") + "22"
                          : "transparent",
                        border: `1px solid ${on ? (GROUP_COLORS[g.color] ?? "#3b82f6") + "66" : "rgba(255,255,255,0.12)"}`,
                        color: on
                          ? (GROUP_COLORS[g.color] ?? "#3b82f6")
                          : "var(--text-secondary)",
                      }}
                    >
                      {on && <Check size={11} />}
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              saving ||
              (!form.first_name.trim() &&
                !form.last_name.trim() &&
                !form.company.trim())
            }
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
              } finally {
                setSaving(false);
              }
            }}
            style={{
              padding: "7px 20px",
              borderRadius: 8,
              background: "#3b82f6",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving && (
              <Loader2
                size={13}
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {contact ? "Salvar" : "Criar contato"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── GroupModal ───────────────────────────────────────────────────────────────

function GroupModal({
  onSave,
  onClose,
}: {
  onSave: (name: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [saving, setSaving] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  return createPortal(
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Criar grupo"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1f26",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 380,
          padding: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
        }}
      >
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 16px",
          }}
        >
          Criar grupo
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do grupo"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            marginBottom: 14,
          }}
        />
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Cor
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 20,
          }}
        >
          {Object.entries(GROUP_COLORS).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: hex,
                border:
                  color === key ? "3px solid #fff" : "2px solid transparent",
                cursor: "pointer",
                outline: "none",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(name.trim(), color);
              } finally {
                setSaving(false);
              }
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: GROUP_COLORS[color] ?? "#3b82f6",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: name.trim() ? "pointer" : "not-allowed",
              opacity: name.trim() ? 1 : 0.45,
            }}
          >
            {saving ? <Loader2 size={13} /> : "Criar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── CSVImportModal ───────────────────────────────────────────────────────────

function CSVImportModal({
  onImport,
  onClose,
}: {
  onImport: (rows: string[][]) => Promise<void>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") setRows(parseCSV(text));
    };
    reader.readAsText(file, "UTF-8");
  }

  const dataRows = rows ? rows.slice(1) : [];
  const preview = dataRows.slice(0, 5);

  return createPortal(
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Importar CSV"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1f26",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Importar CSV
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: 20,
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {!rows ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#3b82f6" : "rgba(255,255,255,0.15)"}`,
                borderRadius: 12,
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 150ms",
                background: dragOver ? "rgba(59,130,246,0.06)" : "transparent",
              }}
            >
              <Upload
                size={28}
                style={{
                  color: "var(--text-tertiary)",
                  margin: "0 auto 10px",
                  display: "block",
                }}
              />
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  margin: "0 0 4px",
                }}
              >
                Arraste um CSV ou clique para selecionar
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  margin: 0,
                }}
              >
                Colunas esperadas: Nome, Sobrenome, Empresa, Cargo, Telefone,
                Email
              </p>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                {dataRows.length} contato{dataRows.length !== 1 ? "s" : ""}{" "}
                encontrado{dataRows.length !== 1 ? "s" : ""}.
                {preview.length < dataRows.length &&
                  ` Prévia dos primeiros ${preview.length}:`}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      {rows[0]?.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "4px 8px",
                            textAlign: "left",
                            color: "var(--text-tertiary)",
                            borderBottom: "1px solid rgba(255,255,255,0.07)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            style={{
                              padding: "4px 8px",
                              color: "var(--text-secondary)",
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              whiteSpace: "nowrap",
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setRows(null)}
                style={{
                  marginTop: 12,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Escolher outro arquivo
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!rows || dataRows.length === 0 || importing}
            onClick={async () => {
              if (!rows) return;
              setImporting(true);
              try {
                await onImport(rows);
              } finally {
                setImporting(false);
              }
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "#3b82f6",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: rows && dataRows.length > 0 ? "pointer" : "not-allowed",
              opacity: rows && dataRows.length > 0 ? 1 : 0.45,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {importing && <Loader2 size={13} />}
            Importar{" "}
            {rows
              ? `${dataRows.length} contato${dataRows.length !== 1 ? "s" : ""}`
              : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgendaTelefonicaApp() {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);

  // ── Data ──
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── UI ──
  const [activeView, setActiveView] = useState<ViewId>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  // ── Load ──

  const loadData = useCallback(async () => {
    if (!drivers?.data || !userId || !companyId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [cRes, mRes, aRes, glRes, gRes] = await Promise.all([
        drivers.data
          .from("contacts")
          .select("*")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .order("display_name", { ascending: true }),
        drivers.data.from("contact_methods").select("*").eq("user_id", userId),
        drivers.data
          .from("contact_addresses")
          .select("*")
          .eq("user_id", userId),
        drivers.data.from("contact_group_links").select("contact_id,group_id"),
        drivers.data
          .from("contact_groups")
          .select("*")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .order("name", { ascending: true }),
      ]);

      const rawContacts = (cRes.data ?? []) as Omit<
        Contact,
        "methods" | "addresses" | "groupIds"
      >[];
      const methods = (mRes.data ?? []) as ContactMethod[];
      const addresses = (aRes.data ?? []) as ContactAddress[];
      const links = (glRes.data ?? []) as {
        contact_id: string;
        group_id: string;
      }[];
      const rawGroups = (gRes.data ?? []) as ContactGroup[];

      const methodsMap = new Map<string, ContactMethod[]>();
      for (const m of methods) {
        const list = methodsMap.get(m.contact_id) ?? [];
        list.push(m);
        methodsMap.set(m.contact_id, list);
      }
      const addressesMap = new Map<string, ContactAddress[]>();
      for (const a of addresses) {
        const list = addressesMap.get(a.contact_id) ?? [];
        list.push(a);
        addressesMap.set(a.contact_id, list);
      }
      const groupLinksMap = new Map<string, string[]>();
      for (const l of links) {
        const list = groupLinksMap.get(l.contact_id) ?? [];
        list.push(l.group_id);
        groupLinksMap.set(l.contact_id, list);
      }

      const hydrated: Contact[] = rawContacts.map((c) => ({
        ...c,
        methods: methodsMap.get(c.id) ?? [],
        addresses: addressesMap.get(c.id) ?? [],
        groupIds: groupLinksMap.get(c.id) ?? [],
      }));

      setContacts(hydrated);
      setGroups(rawGroups);
    } catch {
      setLoadError("Erro ao carregar contatos.");
    } finally {
      setLoading(false);
    }
  }, [drivers, userId, companyId]);

  useEffect(() => {
    if (!drivers?.data || !userId || !companyId) return;
    void loadData();
  }, [drivers, userId, companyId, loadData]);

  // ── Derived ──

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const duplicateInfo = useMemo(() => {
    const phoneMap = new Map<string, Contact[]>();
    const emailMap = new Map<string, Contact[]>();
    for (const c of contacts) {
      for (const m of c.methods) {
        if (m.type === "phone" && m.value.trim()) {
          const norm = m.value.replace(/\D/g, "");
          if (norm.length >= 8) {
            const list = phoneMap.get(norm) ?? [];
            list.push(c);
            phoneMap.set(norm, list);
          }
        }
        if (m.type === "email" && m.value.trim()) {
          const norm = m.value.toLowerCase().trim();
          const list = emailMap.get(norm) ?? [];
          list.push(c);
          emailMap.set(norm, list);
        }
      }
    }
    const dupIds = new Set<string>();
    const dupGroups: {
      kind: "phone" | "email";
      value: string;
      contacts: Contact[];
    }[] = [];
    phoneMap.forEach((cs, v) => {
      if (cs.length >= 2) {
        cs.forEach((c) => dupIds.add(c.id));
        dupGroups.push({ kind: "phone", value: v, contacts: cs });
      }
    });
    emailMap.forEach((cs, v) => {
      if (cs.length >= 2) {
        cs.forEach((c) => dupIds.add(c.id));
        dupGroups.push({ kind: "email", value: v, contacts: cs });
      }
    });
    return { ids: dupIds, groups: dupGroups };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (activeView === "favorites") list = list.filter((c) => c.is_favorite);
    else if (activeView === "duplicates")
      list = list.filter((c) => duplicateInfo.ids.has(c.id));
    else if (activeView !== "all")
      list = list.filter((c) => c.groupIds.includes(activeView));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.job_title.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q) ||
          c.methods.some((m) => m.value.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [contacts, activeView, search, duplicateInfo]);

  const groupedContacts = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of filteredContacts) {
      const first = c.display_name[0]?.toUpperCase() ?? "#";
      const key = /[A-ZÁÉÍÓÚÂÊÔÃÕÀ]/.test(first) ? first : "#";
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    const keys = [...map.keys()].sort((a, b) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b, "pt-BR"),
    );
    return keys.map((letter) => ({ letter, contacts: map.get(letter) ?? [] }));
  }, [filteredContacts]);

  // ── CRUD ──

  async function handleSave(form: FormState) {
    if (!drivers?.data || !userId || !companyId) return;
    const editContact = modal.type === "edit" ? modal.contact : null;
    const display_name = computeDisplayName(
      form.first_name,
      form.last_name,
      form.company,
    );

    let contactId: string;
    if (editContact) {
      await drivers.data
        .from("contacts")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          display_name,
          company: form.company.trim(),
          job_title: form.job_title.trim(),
          notes: form.notes.trim(),
          birthday: form.birthday || null,
          is_favorite: form.is_favorite,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editContact.id);
      contactId = editContact.id;
    } else {
      const { data: inserted } = await drivers.data
        .from("contacts")
        .insert({
          user_id: userId,
          company_id: companyId,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          display_name,
          company: form.company.trim(),
          job_title: form.job_title.trim(),
          notes: form.notes.trim(),
          birthday: form.birthday || null,
          is_favorite: form.is_favorite,
        })
        .select("id")
        .single();
      if (!inserted) throw new Error("insert failed");
      contactId = (inserted as { id: string }).id;
    }

    // Rebuild methods (delete-all + re-insert)
    await drivers.data
      .from("contact_methods")
      .delete()
      .eq("contact_id", contactId);
    const methods = [
      ...form.phones
        .filter((p) => p.value.trim())
        .map((p) => ({
          contact_id: contactId,
          user_id: userId,
          type: "phone" as const,
          label: p.label,
          value: p.value.trim(),
          is_primary: p.is_primary,
        })),
      ...form.emails
        .filter((e) => e.value.trim())
        .map((e) => ({
          contact_id: contactId,
          user_id: userId,
          type: "email" as const,
          label: e.label,
          value: e.value.trim(),
          is_primary: e.is_primary,
        })),
      ...form.websites
        .filter((w) => w.value.trim())
        .map((w) => ({
          contact_id: contactId,
          user_id: userId,
          type: "website" as const,
          label: "site",
          value: w.value.trim(),
          is_primary: false,
        })),
      ...form.socials
        .filter((s) => s.value.trim())
        .map((s) => ({
          contact_id: contactId,
          user_id: userId,
          type: "social" as const,
          label: s.platform,
          value: s.value.trim(),
          is_primary: false,
        })),
    ];
    if (methods.length > 0)
      await drivers.data.from("contact_methods").insert(methods);

    // Rebuild addresses
    await drivers.data
      .from("contact_addresses")
      .delete()
      .eq("contact_id", contactId);
    const addrs = form.addresses
      .filter((a) => a.city.trim() || a.street.trim())
      .map((a) => ({
        contact_id: contactId,
        user_id: userId,
        label: a.label,
        street: a.street.trim(),
        number: a.number.trim(),
        complement: a.complement.trim(),
        district: a.district.trim(),
        city: a.city.trim(),
        state: a.state.trim(),
        country: a.country.trim(),
        postal_code: a.postal_code.trim(),
      }));
    if (addrs.length > 0)
      await drivers.data.from("contact_addresses").insert(addrs);

    // Rebuild group links
    await drivers.data
      .from("contact_group_links")
      .delete()
      .eq("contact_id", contactId);
    if (form.groupIds.length > 0) {
      await drivers.data
        .from("contact_group_links")
        .insert(
          form.groupIds.map((gid) => ({
            contact_id: contactId,
            group_id: gid,
          })),
        );
    }

    await loadData();
    setSelectedContactId(contactId);
    setModal({ type: "none" });
    showToast(editContact ? "Contato atualizado" : "Contato criado");
  }

  async function handleDelete(c: Contact) {
    if (!drivers?.data || !userId || !companyId) return;
    const phonePrimary = c.methods.find((m) => m.type === "phone")?.value ?? "";
    const emailPrimary = c.methods.find((m) => m.type === "email")?.value ?? "";
    await moveToTrash({
      drivers,
      userId,
      companyId,
      appId: "agenda-telefonica",
      itemType: "contact",
      itemName: c.display_name.trim() !== "" ? c.display_name : "(Sem nome)",
      itemData: {
        ...(c as unknown as Record<string, unknown>),
        phone: phonePrimary,
        email: emailPrimary,
      },
      originalId: c.id,
    });
    await drivers.data.from("contacts").delete().eq("id", c.id);
    if (selectedContactId === c.id) setSelectedContactId(null);
    await loadData();
    setModal({ type: "none" });
    showToast("Contato excluído");
  }

  async function toggleFavorite(c: Contact) {
    if (!drivers?.data) return;
    await drivers.data
      .from("contacts")
      .update({
        is_favorite: !c.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    await loadData();
  }

  async function handleCreateGroup(name: string, color: string) {
    if (!drivers?.data || !userId || !companyId) return;
    await drivers.data
      .from("contact_groups")
      .insert({ user_id: userId, company_id: companyId, name, color });
    await loadData();
    setModal({ type: "none" });
    showToast(`Grupo "${name}" criado`);
  }

  async function handleDeleteGroup(g: ContactGroup) {
    if (!drivers?.data) return;
    await drivers.data.from("contact_groups").delete().eq("id", g.id);
    if (activeView === g.id) setActiveView("all");
    await loadData();
    showToast(`Grupo "${g.name}" excluído`);
  }

  // ── CSV ──

  function _handleExport() {
    const csv = generateCSV(
      filteredContacts.length > 0 ? filteredContacts : contacts,
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${contacts.length} contato(s) exportado(s)`);
  }

  async function handleImport(rows: string[][]) {
    if (!drivers?.data || !userId || !companyId) return;
    const header = rows[0] ?? [];

    function col(names: string[]): number {
      for (const n of names) {
        const i = header.findIndex((h) =>
          h.trim().toLowerCase().includes(n.toLowerCase()),
        );
        if (i >= 0) return i;
      }
      return -1;
    }

    const firstNameCol = col(["nome", "first name", "first_name"]);
    const lastNameCol = col(["sobrenome", "last name", "last_name"]);
    const companyCol = col(["empresa", "company"]);
    const jobCol = col(["cargo", "job"]);
    const phoneCol = col(["telefone", "phone", "celular"]);
    const emailCol = col(["email", "e-mail"]);

    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
    let created = 0;

    for (const row of dataRows) {
      const firstName =
        firstNameCol >= 0 ? (row[firstNameCol] ?? "").trim() : "";
      const lastName = lastNameCol >= 0 ? (row[lastNameCol] ?? "").trim() : "";
      const company = companyCol >= 0 ? (row[companyCol] ?? "").trim() : "";
      const jobTitle = jobCol >= 0 ? (row[jobCol] ?? "").trim() : "";
      const phone = phoneCol >= 0 ? (row[phoneCol] ?? "").trim() : "";
      const email = emailCol >= 0 ? (row[emailCol] ?? "").trim() : "";
      if (!firstName && !lastName && !company) continue;

      const display_name = computeDisplayName(firstName, lastName, company);
      const { data: ins } = await drivers.data
        .from("contacts")
        .insert({
          user_id: userId,
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          display_name,
          company,
          job_title: jobTitle,
          notes: "",
          is_favorite: false,
        })
        .select("id")
        .single();

      if (ins) {
        const cid = (ins as { id: string }).id;
        const meths: object[] = [];
        if (phone)
          meths.push({
            contact_id: cid,
            user_id: userId,
            type: "phone",
            label: "pessoal",
            value: phone,
            is_primary: true,
          });
        if (email)
          meths.push({
            contact_id: cid,
            user_id: userId,
            type: "email",
            label: "pessoal",
            value: email,
            is_primary: true,
          });
        if (meths.length > 0)
          await drivers.data.from("contact_methods").insert(meths);
        created++;
      }
    }

    await loadData();
    setModal({ type: "none" });
    showToast(`${created} contato(s) importado(s)`);
  }

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard
      .writeText(text)
      .then(() => showToast(`${label} copiado`));
  }

  // ── Nav item style helper ──
  function navStyle(isActive: boolean): React.CSSProperties {
    return {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 8px",
      cursor: "pointer",
      textAlign: "left",
      transition:
        "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
      marginBottom: 2,
      fontSize: 13,
      ...(isActive
        ? {
            borderRadius: "8px 0 0 8px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            borderRight: "1px solid transparent",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontWeight: 500,
            marginRight: 0,
          }
        : {
            borderRadius: 8,
            border: "1px solid transparent",
            background: "transparent",
            color: "var(--text-secondary)",
            fontWeight: 400,
            marginRight: 8,
          }),
    };
  }

  // ── Sidebar ──

  const sidebarExpanded = (
    <>
      {/* Novo Contato button */}
      <div style={{ padding: "10px 10px 4px" }}>
        <button
          type="button"
          onClick={() => setModal({ type: "edit", contact: null })}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            background: "#10b981",
            border: "none",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            transition: "background 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#059669";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#10b981";
          }}
        >
          <Plus size={13} />
          Novo Contato
        </button>
      </div>

      <div style={{ padding: "4px 0 16px 8px", flex: 1 }}>
        {/* Main nav */}
        {[
          { id: "all", label: "Todos", icon: Users, count: contacts.length },
          {
            id: "favorites",
            label: "Favoritos",
            icon: Star,
            count: contacts.filter((c) => c.is_favorite).length,
          },
        ].map(({ id, label, icon: Icon, count }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              style={navStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {count > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Importar contatos */}
        <button
          type="button"
          onClick={() => setModal({ type: "csv-import" })}
          style={navStyle(false)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <Upload size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Importar contatos</span>
        </button>

        {duplicateInfo.ids.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveView("duplicates")}
            style={navStyle(activeView === "duplicates")}
            onMouseEnter={(e) => {
              if (activeView !== "duplicates") {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== "duplicates") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            <AlertTriangle
              size={15}
              style={{ flexShrink: 0, color: "#f59e0b" }}
            />
            <span style={{ flex: 1 }}>Possíveis duplicados</span>
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
              {duplicateInfo.ids.size}
            </span>
          </button>
        )}

        {/* Groups */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 8px 4px",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Grupos
          </span>
          <button
            type="button"
            title="Criar grupo"
            onClick={() => setModal({ type: "create-group" })}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 2,
              borderRadius: 4,
            }}
          >
            <Plus size={12} />
          </button>
        </div>

        {groups.map((g) => {
          const isActive = activeView === g.id;
          const dot = GROUP_COLORS[g.color] ?? "#64748b";
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveView(g.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                void handleDeleteGroup(g);
              }}
              title={`${g.name} (clique direito para excluir)`}
              style={navStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {g.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {contacts.filter((c) => c.groupIds.includes(g.id)).length}
              </span>
            </button>
          );
        })}

        {groups.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              padding: "4px 8px",
              fontStyle: "italic",
            }}
          >
            Nenhum grupo ainda
          </p>
        )}
      </div>
    </>
  );

  const sidebarCollapsed = (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 0",
        gap: 2,
      }}
    >
      <button
        type="button"
        title="Novo Contato"
        onClick={() => setModal({ type: "edit", contact: null })}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          background: "#10b981",
          border: "none",
          color: "#fff",
          marginBottom: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#059669";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#10b981";
        }}
      >
        <Plus size={16} />
      </button>
      {[
        { id: "all", icon: Users, label: "Todos" },
        { id: "favorites", icon: Star, label: "Favoritos" },
      ].map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => setActiveView(id)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 120ms ease",
              ...(isActive
                ? {
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.08)",
                    color: "var(--text-primary)",
                  }
                : {
                    border: "1px solid transparent",
                    background: "transparent",
                    color: "var(--text-secondary)",
                  }),
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            <Icon size={16} />
          </button>
        );
      })}
      <button
        type="button"
        title="Importar contatos"
        onClick={() => setModal({ type: "csv-import" })}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 120ms ease",
          border: "1px solid transparent",
          background: "transparent",
          color: "var(--text-secondary)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <Upload size={16} />
      </button>
      {duplicateInfo.ids.size > 0 &&
        (() => {
          const isActive = activeView === "duplicates";
          return (
            <button
              type="button"
              title="Possíveis duplicados"
              onClick={() => setActiveView("duplicates")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 120ms ease",
                ...(isActive
                  ? {
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.08)",
                      color: "var(--text-primary)",
                    }
                  : {
                      border: "1px solid transparent",
                      background: "transparent",
                      color: "#f59e0b",
                    }),
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <AlertTriangle size={16} />
            </button>
          );
        })()}
      <div
        style={{
          height: 1,
          width: 28,
          background: "rgba(255,255,255,0.08)",
          margin: "4px 0",
        }}
      />
      {groups.map((g) => {
        const isActive = activeView === g.id;
        return (
          <button
            key={g.id}
            type="button"
            title={g.name}
            onClick={() => setActiveView(g.id)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 120ms ease",
              ...(isActive
                ? {
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.08)",
                  }
                : {
                    border: "1px solid transparent",
                    background: "transparent",
                  }),
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: GROUP_COLORS[g.color] ?? "#64748b",
              }}
            />
          </button>
        );
      })}
    </nav>
  );

  // ── Detail panel ──

  function renderDetail(c: Contact) {
    const primaryPhone =
      c.methods.find((m) => m.type === "phone" && m.is_primary) ??
      c.methods.find((m) => m.type === "phone");
    const primaryEmail =
      c.methods.find((m) => m.type === "email" && m.is_primary) ??
      c.methods.find((m) => m.type === "email");
    const phones = c.methods.filter((m) => m.type === "phone");
    const emails = c.methods.filter((m) => m.type === "email");
    const websites = c.methods.filter((m) => m.type === "website");
    const socials = c.methods.filter((m) => m.type === "social");
    const birthday = formatBirthday(c.birthday);

    const detailRowStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    };
    const iconStyle: React.CSSProperties = {
      flexShrink: 0,
      marginTop: 1,
      color: "var(--text-tertiary)",
    };
    const actionBtnStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "8px 12px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      cursor: "pointer",
      color: "var(--text-secondary)",
      fontSize: 11,
      minWidth: 60,
    };

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar contact={c} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {c.display_name}
              </h2>
              {c.job_title && (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  {c.job_title}
                </p>
              )}
              {c.company && (
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {c.company}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => void toggleFavorite(c)}
                title={
                  c.is_favorite
                    ? "Remover dos favoritos"
                    : "Adicionar aos favoritos"
                }
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: c.is_favorite ? "#fbbf24" : "var(--text-tertiary)",
                  display: "flex",
                }}
              >
                <Star size={15} fill={c.is_favorite ? "#fbbf24" : "none"} />
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: "edit", contact: c })}
                title="Editar"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: "delete", contact: c })}
                title="Excluir"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: "rgba(239,68,68,0.7)",
                  display: "flex",
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedContactId(null)}
                title="Fechar"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick actions */}
          {(primaryPhone ?? primaryEmail) && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              {primaryPhone && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `tel:${primaryPhone.value}`;
                    }}
                    style={actionBtnStyle}
                  >
                    <Phone size={16} />
                    Ligar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(primaryPhone.value, "Telefone")
                    }
                    style={actionBtnStyle}
                  >
                    <Copy size={16} />
                    Copiar tel.
                  </button>
                </>
              )}
              {primaryEmail && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `mailto:${primaryEmail.value}`;
                    }}
                    style={actionBtnStyle}
                  >
                    <Mail size={16} />
                    E-mail
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(primaryEmail.value, "E-mail")
                    }
                    style={actionBtnStyle}
                  >
                    <Copy size={16} />
                    Copiar email
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div style={{ padding: "0 24px 24px", flex: 1 }}>
          {phones.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Telefones
              </p>
              {phones.map((m) => (
                <div key={m.id} style={detailRowStyle}>
                  <Phone size={15} style={iconStyle} />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.value}
                    </p>
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {m.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `tel:${m.value}`;
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Phone size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(m.value, "Telefone")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {emails.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                E-mails
              </p>
              {emails.map((m) => (
                <div key={m.id} style={detailRowStyle}>
                  <Mail size={15} style={iconStyle} />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.value}
                    </p>
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {m.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `mailto:${m.value}`;
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Mail size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(m.value, "E-mail")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {websites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Sites
              </p>
              {websites.map((m) => (
                <div key={m.id} style={detailRowStyle}>
                  <Globe size={15} style={iconStyle} />
                  <div style={{ flex: 1 }}>
                    <a
                      href={
                        m.value.startsWith("http")
                          ? m.value
                          : `https://${m.value}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 13,
                        color: "#60a5fa",
                        textDecoration: "none",
                      }}
                    >
                      {m.value}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(m.value, "Site")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {socials.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Redes sociais
              </p>
              {socials.map((m) => (
                <div key={m.id} style={detailRowStyle}>
                  <Link size={15} style={iconStyle} />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.value}
                    </p>
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {m.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(m.value, m.label)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {c.addresses.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Endereços
              </p>
              {c.addresses.map((a) => {
                const lines = [
                  [a.street, a.number, a.complement].filter(Boolean).join(", "),
                  [a.district, a.city, a.state].filter(Boolean).join(", "),
                  [a.postal_code, a.country].filter(Boolean).join(" — "),
                ].filter(Boolean);
                return (
                  <div key={a.id} style={detailRowStyle}>
                    <MapPin size={15} style={iconStyle} />
                    <div style={{ flex: 1 }}>
                      {lines.map((l, i) => (
                        <p
                          key={i}
                          style={{
                            margin: i === 0 ? 0 : "1px 0 0",
                            fontSize: 13,
                            color:
                              i === 0
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {l}
                        </p>
                      ))}
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          textTransform: "capitalize",
                        }}
                      >
                        {a.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {birthday && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Aniversário
              </p>
              <div style={detailRowStyle}>
                <Calendar size={15} style={iconStyle} />
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  {birthday}
                </p>
              </div>
            </div>
          )}

          {c.notes && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Observações
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.notes}
              </p>
            </div>
          )}

          {c.groupIds.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                Grupos
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {c.groupIds.map((gid) => {
                  const g = groups.find((gr) => gr.id === gid);
                  if (!g) return null;
                  return (
                    <span
                      key={gid}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        background: (GROUP_COLORS[g.color] ?? "#64748b") + "22",
                        border: `1px solid ${GROUP_COLORS[g.color] ?? "#64748b"}44`,
                        color: GROUP_COLORS[g.color] ?? "#64748b",
                      }}
                    >
                      {g.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duplicate warning */}
          {duplicateInfo.ids.has(c.id) && (
            <div
              style={{
                marginTop: 20,
                padding: "10px 12px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle
                size={14}
                style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#fbbf24",
                  lineHeight: 1.5,
                }}
              >
                Possível duplicado detectado — outro contato compartilha o mesmo
                telefone ou e-mail.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main render ──

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#191d21",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
          position: "relative",
        }}
      >
        <aside style={ASIDE_STYLE}>
          {/* App identity header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : undefined,
              gap: collapsed ? 0 : 10,
              padding: "16px 14px 12px",
              flexShrink: 0,
            }}
          >
            <Users
              size={18}
              strokeWidth={1.6}
              style={{ color: "var(--text-primary)", flexShrink: 0 }}
            />
            {!collapsed && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  fontFamily: "var(--font-display)",
                }}
              >
                Contatos Telefônicos
              </span>
            )}
          </div>
          {collapsed ? sidebarCollapsed : sidebarExpanded}
        </aside>
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        onClick={() => setCollapsed((v) => !v)}
        style={{
          position: "absolute",
          left: (collapsed ? SIDEBAR_ICON_W : SIDEBAR_W) - 14,
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 250ms ease",
          zIndex: 10,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,55,80,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15,21,27,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        )}
      </button>

      {/* Main content */}
      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}
      >
        {/* Contact list */}
        <div
          style={{
            width: selectedContact ? 300 : undefined,
            flex: selectedContact ? "none" : 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: selectedContact
              ? "1px solid rgba(255,255,255,0.07)"
              : "none",
            transition: "width 250ms ease",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            {activeView === "all" ? (
              <Users size={14} style={{ color: "#10b981", flexShrink: 0 }} />
            ) : activeView === "favorites" ? (
              <Star size={14} style={{ color: "#10b981", flexShrink: 0 }} />
            ) : activeView === "duplicates" ? (
              <AlertTriangle
                size={14}
                style={{ color: "#f59e0b", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background:
                    GROUP_COLORS[
                      groups.find((g) => g.id === activeView)?.color ?? "gray"
                    ] ?? "#64748b",
                  flexShrink: 0,
                }}
              />
            )}
            <h2
              style={{
                margin: "0 12px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.75)",
                whiteSpace: "nowrap",
              }}
            >
              {activeView === "all"
                ? "Todos"
                : activeView === "favorites"
                  ? "Favoritos"
                  : activeView === "duplicates"
                    ? "Duplicados"
                    : (groups.find((g) => g.id === activeView)?.name ??
                      "Contatos")}
            </h2>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <Search
                size={14}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar contatos..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Contact list body */}
          <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
            {loading ? (
              <div className="skeleton-pulse" style={{ padding: "8px 0" }}>
                {[55, 70, 45, 65, 50, 60, 40].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 13,
                          width: `${w}%`,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.08)",
                          marginBottom: 6,
                        }}
                      />
                      <div
                        style={{
                          height: 10,
                          width: `${w * 0.6}%`,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.05)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 8,
                  color: "var(--text-tertiary)",
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <AlertTriangle size={28} style={{ color: "#f59e0b" }} />
                <p style={{ margin: 0, fontSize: 13 }}>{loadError}</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "60px 32px 160px",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(16,185,129,0.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {search ? (
                    <Search size={24} style={{ color: "#10b981" }} />
                  ) : activeView === "favorites" ? (
                    <Star size={24} style={{ color: "#10b981" }} />
                  ) : (
                    <Users size={24} style={{ color: "#10b981" }} />
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxWidth: 280,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    {search
                      ? "Nenhum contato encontrado"
                      : activeView === "favorites"
                        ? "Nenhum favorito ainda"
                        : activeView === "duplicates"
                          ? "Nenhuma duplicata"
                          : "Nenhum contato ainda"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {search
                      ? `Nenhum resultado para "${search}". Tente termos diferentes.`
                      : activeView === "favorites"
                        ? "Marque contatos como favorito para encontrá-los rapidamente aqui."
                        : activeView === "duplicates"
                          ? "Todos os contatos parecem únicos — nenhuma duplicata detectada."
                          : "Adicione seus contatos para acessar telefones e e-mails rapidamente."}
                  </p>
                </div>
                {!search &&
                  activeView !== "favorites" &&
                  activeView !== "duplicates" && (
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit", contact: null })}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#10b981",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "8px 20px",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={14} /> Novo contato
                    </button>
                  )}
              </div>
            ) : (
              <div style={{ paddingBottom: 120 }}>
                {groupedContacts.map(({ letter, contacts: cs }) => (
                  <div key={letter}>
                    {/* Letter header */}
                    <div
                      style={{
                        padding: "10px 14px 4px",
                        position: "sticky",
                        top: 0,
                        background: "#191d21",
                        zIndex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-tertiary)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {letter}
                      </span>
                    </div>

                    {cs.map((c) => {
                      const isSelected = selectedContactId === c.id;
                      const isHovered = hoveredContactId === c.id;
                      const primaryPhone = c.methods.find(
                        (m) => m.type === "phone",
                      );
                      const primaryEmail = c.methods.find(
                        (m) => m.type === "email",
                      );
                      const isDuplicate = duplicateInfo.ids.has(c.id);

                      return (
                        <div
                          key={c.id}
                          onClick={() =>
                            setSelectedContactId(isSelected ? null : c.id)
                          }
                          onMouseEnter={() => setHoveredContactId(c.id)}
                          onMouseLeave={() => setHoveredContactId(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 14px",
                            cursor: "pointer",
                            background: isSelected
                              ? "rgba(16,185,129,0.10)"
                              : isHovered
                                ? "rgba(255,255,255,0.04)"
                                : "transparent",
                            transition: "background 100ms ease",
                            borderLeft: isSelected
                              ? "2px solid #10b981"
                              : "2px solid transparent",
                          }}
                        >
                          <Avatar contact={c} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: isSelected ? 500 : 400,
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.display_name}
                              </p>
                              {c.is_favorite && (
                                <Star
                                  size={11}
                                  fill="#fbbf24"
                                  color="#fbbf24"
                                  style={{ flexShrink: 0 }}
                                />
                              )}
                              {isDuplicate && (
                                <AlertTriangle
                                  size={11}
                                  style={{ color: "#f59e0b", flexShrink: 0 }}
                                />
                              )}
                            </div>
                            {!selectedContact && (
                              <p
                                style={{
                                  margin: "1px 0 0",
                                  fontSize: 12,
                                  color: "var(--text-tertiary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.company ||
                                  primaryPhone?.value ||
                                  primaryEmail?.value ||
                                  ""}
                              </p>
                            )}
                          </div>
                          {!selectedContact && isHovered && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ type: "edit", contact: c });
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-tertiary)",
                                display: "flex",
                                padding: 4,
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedContact && renderDetail(selectedContact)}
      </div>

      {/* Modals */}
      {modal.type === "edit" && (
        <EditModal
          contact={modal.contact}
          groups={groups}
          onSave={handleSave}
          onClose={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "delete" &&
        createPortal(
          <div style={OVERLAY_STYLE} onClick={() => setModal({ type: "none" })}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#1a1f26",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                width: "100%",
                maxWidth: 400,
                padding: 24,
                boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                Excluir contato
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: "0 0 20px",
                }}
              >
                Tem certeza que deseja excluir{" "}
                <strong>{modal.contact.display_name}</strong>? Esta ação não
                pode ser desfeita.
              </p>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  onClick={() => setModal({ type: "none" })}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(modal.contact)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {modal.type === "create-group" && (
        <GroupModal
          onSave={handleCreateGroup}
          onClose={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "csv-import" && (
        <CSVImportModal
          onImport={handleImport}
          onClose={() => setModal({ type: "none" })}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,36,44,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            color: "var(--text-primary)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.40)",
            zIndex: 8000,
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
          }}
        >
          {toast}
        </div>
      )}

      {/* CSS for spinner + modal scrollbar */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .agenda-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
        .agenda-modal-scroll::-webkit-scrollbar { width: 10px; }
        .agenda-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .agenda-modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
        .agenda-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.24); border: 2px solid transparent; background-clip: padding-box; }
      `}</style>
    </div>
  );
}
