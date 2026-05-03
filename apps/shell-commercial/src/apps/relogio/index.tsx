import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  Timer,
  AlarmClock,
  Coffee,
  Globe,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Star,
  Search,
  X,
  Check,
  SkipForward,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useNotify } from "../../hooks/useNotify";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId =
  | "clock"
  | "stopwatch"
  | "timer"
  | "alarm"
  | "pomodoro"
  | "worldclock";
type PomoMode = "focus" | "short" | "long";

interface Alarm {
  id: string;
  title: string;
  time: string;
  repeat_days: number[];
  is_enabled: boolean;
  last_triggered_at: string | null;
}

interface AlarmForm {
  title: string;
  time: string;
  repeat_days: number[];
}

interface PomoCfg {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLong: number;
}

interface WorldClock {
  city: string;
  tz: string;
  favorite: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMER_PRESETS = [1, 5, 10, 15, 25, 30, 60];

const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DEFAULT_POMO_CFG: PomoCfg = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLong: 4,
};

const DEFAULT_WORLD_CLOCKS: WorldClock[] = [
  { city: "São Paulo", tz: "America/Sao_Paulo", favorite: true },
  { city: "New York", tz: "America/New_York", favorite: false },
  { city: "London", tz: "Europe/London", favorite: false },
  { city: "Tokyo", tz: "Asia/Tokyo", favorite: false },
];

const ALL_TIMEZONES: { city: string; tz: string }[] = [
  { city: "São Paulo", tz: "America/Sao_Paulo" },
  { city: "Rio de Janeiro", tz: "America/Sao_Paulo" },
  { city: "Brasília", tz: "America/Sao_Paulo" },
  { city: "Manaus", tz: "America/Manaus" },
  { city: "Belém", tz: "America/Belem" },
  { city: "Fortaleza", tz: "America/Fortaleza" },
  { city: "Salvador", tz: "America/Bahia" },
  { city: "Recife", tz: "America/Recife" },
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
  { city: "Lima", tz: "America/Lima" },
  { city: "Bogotá", tz: "America/Bogota" },
  { city: "Santiago", tz: "America/Santiago" },
  { city: "Caracas", tz: "America/Caracas" },
  { city: "Mexico City", tz: "America/Mexico_City" },
  { city: "New York", tz: "America/New_York" },
  { city: "Toronto", tz: "America/Toronto" },
  { city: "Chicago", tz: "America/Chicago" },
  { city: "Denver", tz: "America/Denver" },
  { city: "Los Angeles", tz: "America/Los_Angeles" },
  { city: "Vancouver", tz: "America/Vancouver" },
  { city: "Anchorage", tz: "America/Anchorage" },
  { city: "Honolulu", tz: "Pacific/Honolulu" },
  { city: "London", tz: "Europe/London" },
  { city: "Lisbon", tz: "Europe/Lisbon" },
  { city: "Paris", tz: "Europe/Paris" },
  { city: "Madrid", tz: "Europe/Madrid" },
  { city: "Rome", tz: "Europe/Rome" },
  { city: "Berlin", tz: "Europe/Berlin" },
  { city: "Amsterdam", tz: "Europe/Amsterdam" },
  { city: "Warsaw", tz: "Europe/Warsaw" },
  { city: "Stockholm", tz: "Europe/Stockholm" },
  { city: "Helsinki", tz: "Europe/Helsinki" },
  { city: "Athens", tz: "Europe/Athens" },
  { city: "Istanbul", tz: "Europe/Istanbul" },
  { city: "Moscow", tz: "Europe/Moscow" },
  { city: "Cairo", tz: "Africa/Cairo" },
  { city: "Lagos", tz: "Africa/Lagos" },
  { city: "Nairobi", tz: "Africa/Nairobi" },
  { city: "Johannesburg", tz: "Africa/Johannesburg" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "Riyadh", tz: "Asia/Riyadh" },
  { city: "Karachi", tz: "Asia/Karachi" },
  { city: "Mumbai", tz: "Asia/Kolkata" },
  { city: "Colombo", tz: "Asia/Colombo" },
  { city: "Kathmandu", tz: "Asia/Kathmandu" },
  { city: "Dhaka", tz: "Asia/Dhaka" },
  { city: "Yangon", tz: "Asia/Yangon" },
  { city: "Bangkok", tz: "Asia/Bangkok" },
  { city: "Ho Chi Minh City", tz: "Asia/Ho_Chi_Minh" },
  { city: "Phnom Penh", tz: "Asia/Phnom_Penh" },
  { city: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur" },
  { city: "Singapore", tz: "Asia/Singapore" },
  { city: "Jakarta", tz: "Asia/Jakarta" },
  { city: "Manila", tz: "Asia/Manila" },
  { city: "Shanghai", tz: "Asia/Shanghai" },
  { city: "Hong Kong", tz: "Asia/Hong_Kong" },
  { city: "Taipei", tz: "Asia/Taipei" },
  { city: "Seoul", tz: "Asia/Seoul" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
  { city: "Perth", tz: "Australia/Perth" },
  { city: "Adelaide", tz: "Australia/Adelaide" },
  { city: "Brisbane", tz: "Australia/Brisbane" },
  { city: "Melbourne", tz: "Australia/Melbourne" },
  { city: "Sydney", tz: "Australia/Sydney" },
  { city: "Auckland", tz: "Pacific/Auckland" },
  { city: "Fiji", tz: "Pacific/Fiji" },
];

const POMO_COLORS: Record<PomoMode, string> = {
  focus: "#ef4444",
  short: "#22c55e",
  long: "#3b82f6",
};

const POMO_LABELS: Record<PomoMode, string> = {
  focus: "Foco",
  short: "Pausa Curta",
  long: "Pausa Longa",
};

// ─── Sidebar constants ────────────────────────────────────────────────────────

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

// ─── Shared styles ────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: "inherit",
  transition: "background 120ms, color 120ms",
};

const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Audio utilities ──────────────────────────────────────────────────────────

function playTone(
  freq: number,
  duration: number,
  volume = 0.25,
  type: OscillatorType = "sine",
) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
    setTimeout(
      () => {
        void ctx.close();
      },
      (duration + 0.6) * 1000,
    );
  } catch {
    // Browser blocked autoplay
  }
}

function playAlarmSound() {
  playTone(880, 0.12, 0.4);
  setTimeout(() => playTone(880, 0.12, 0.4), 160);
  setTimeout(() => playTone(1108, 0.35, 0.4), 330);
  setTimeout(() => playTone(880, 0.12, 0.4), 800);
  setTimeout(() => playTone(880, 0.12, 0.4), 960);
  setTimeout(() => playTone(1108, 0.35, 0.4), 1130);
}

function playDoneSound() {
  playTone(523, 0.08, 0.3);
  setTimeout(() => playTone(659, 0.08, 0.3), 100);
  setTimeout(() => playTone(784, 0.08, 0.3), 200);
  setTimeout(() => playTone(1047, 0.4, 0.3), 300);
}

function playPomoSound(toFocus: boolean) {
  if (toFocus) {
    playTone(440, 0.1, 0.2);
    setTimeout(() => playTone(554, 0.35, 0.2), 140);
  } else {
    playTone(659, 0.1, 0.2);
    setTimeout(() => playTone(523, 0.1, 0.2), 140);
    setTimeout(() => playTone(440, 0.35, 0.2), 280);
  }
}

// ─── Notification utilities ───────────────────────────────────────────────────

async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

function sendNotif(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "aethereos-relogio" });
  } catch {
    // OS denied despite permission flag
  }
}

// ─── Time formatting ──────────────────────────────────────────────────────────

function padZ(n: number, len = 2) {
  return String(Math.floor(Math.abs(n))).padStart(len, "0");
}

function fmtMs(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${padZ(min)}:${padZ(sec)}.${padZ(cs)}`;
}

function fmtSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${padZ(h)}:${padZ(m)}:${padZ(s)}`;
  return `${padZ(m)}:${padZ(s)}`;
}

function fmtDate(date: Date): string {
  return `${DAY_NAMES_FULL[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

function fmtHHMM(date: Date): string {
  return `${padZ(date.getHours())}:${padZ(date.getMinutes())}`;
}

function getTimeInZone(tz: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: tz,
      hour12: false,
    }).format(date);
  } catch {
    return "--:--:--";
  }
}

function getDateInZone(tz: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: tz,
    }).format(date);
  } catch {
    return "";
  }
}

function isDaytime(tz: string, date: Date): boolean {
  try {
    const h = parseInt(
      new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        hour12: false,
        timeZone: tz,
      }).format(date),
      10,
    );
    return h >= 6 && h < 20;
  } catch {
    return true;
  }
}

function getOffsetLabel(tz: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZoneName: "shortOffset",
      timeZone: tz,
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

// ─── AlarmModal ───────────────────────────────────────────────────────────────

interface AlarmModalProps {
  initial: AlarmForm;
  isEdit: boolean;
  onSave: (f: AlarmForm) => void;
  onClose: () => void;
}

function AlarmModal({ initial, isEdit, onSave, onClose }: AlarmModalProps) {
  const [form, setForm] = useState<AlarmForm>(initial);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function toggleDay(d: number) {
    setForm((prev) => ({
      ...prev,
      repeat_days: prev.repeat_days.includes(d)
        ? prev.repeat_days.filter((x) => x !== d)
        : [...prev.repeat_days, d].sort(),
    }));
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Editar alarme" : "Novo alarme"}
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          width: 360,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {isEdit ? "Editar alarme" : "Novo alarme"}
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              ...BTN,
              background: "none",
              color: "var(--text-secondary)",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <label
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Nome
        </label>
        <input
          style={{ ...INPUT, marginBottom: 16 }}
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Alarme"
          maxLength={40}
        />

        <label
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Horário
        </label>
        <input
          type="time"
          style={{ ...INPUT, marginBottom: 16 }}
          value={form.time}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, time: e.target.value }))
          }
        />

        <label
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 8,
          }}
        >
          Repetir
        </label>
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {DAY_NAMES_SHORT.map((d, i) => (
            <button
              type="button"
              key={i}
              onClick={() => toggleDay(i)}
              style={{
                ...BTN,
                padding: "5px 10px",
                borderRadius: 20,
                fontSize: 12,
                background: form.repeat_days.includes(i)
                  ? "rgba(99,102,241,0.3)"
                  : "rgba(255,255,255,0.06)",
                color: form.repeat_days.includes(i)
                  ? "#a5b4fc"
                  : "var(--text-secondary)",
                border: form.repeat_days.includes(i)
                  ? "1px solid rgba(99,102,241,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Sem repetição: dispara uma vez. Com repetição: dispara nos dias
          selecionados.
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.time) onSave(form);
            }}
            disabled={!form.time}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: form.time ? "#6366f1" : "rgba(99,102,241,0.3)",
              color: form.time ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: form.time ? "pointer" : "not-allowed",
            }}
          >
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── PomoSettings ─────────────────────────────────────────────────────────────

interface PomoSettingsProps {
  cfg: PomoCfg;
  onSave: (c: PomoCfg) => void;
  onClose: () => void;
}

function PomoSettings({ cfg, onSave, onClose }: PomoSettingsProps) {
  const [local, setLocal] = useState<PomoCfg>(cfg);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function field(key: keyof PomoCfg, label: string, min: number, max: number) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            min={min}
            max={max}
            value={local[key]}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                [key]: Math.max(min, Math.min(max, Number(e.target.value))),
              }))
            }
            style={{ ...INPUT, width: 80 }}
          />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            min
          </span>
        </div>
      </div>
    );
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configurar Pomodoro"
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          width: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            Configurar Pomodoro
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              ...BTN,
              background: "none",
              color: "var(--text-secondary)",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>
        {field("focusMin", "Tempo de Foco", 1, 120)}
        {field("shortBreakMin", "Pausa Curta", 1, 60)}
        {field("longBreakMin", "Pausa Longa", 1, 120)}
        {field("cyclesBeforeLong", "Ciclos até pausa longa", 1, 10)}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(local);
              onClose();
            }}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: "#6366f1",
              color: "#fff",
            }}
          >
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Clock Styles ────────────────────────────────────────────────────────────

interface ClockAngles {
  hrAngle: number;
  minAngle: number;
  secAngle: number;
  now: Date;
}

interface ClockStyle {
  name: string;
  caseA: string;
  caseB: string;
  bezel: string;
  dialA: string;
  dialB: string;
  marker: string;
  markerType: "rect" | "dot";
  hrColor: string;
  minColor: string;
  secColor: string;
  majTick: string;
  minTick: string;
  render?: (a: ClockAngles) => ReactElement;
  hideDigital?: boolean;
}

function clkDeg(a: number, r: number, cx = 95, cy = 95) {
  return {
    x: cx + r * Math.sin((a * Math.PI) / 180),
    y: cy - r * Math.cos((a * Math.PI) / 180),
  };
}

const CLOCK_STYLES: ClockStyle[] = [
  {
    name: "Dark Steel",
    caseA: "#3a3e46",
    caseB: "#1e2228",
    bezel: "#191d22",
    dialA: "#252a30",
    dialB: "#0e1216",
    marker: "rgba(255,255,255,0.75)",
    markerType: "rect",
    hrColor: "rgba(255,255,255,0.9)",
    minColor: "rgba(255,255,255,0.85)",
    secColor: "#e03030",
    majTick: "rgba(255,255,255,0.55)",
    minTick: "rgba(255,255,255,0.2)",
  },
  {
    name: "Midnight Blue",
    caseA: "#1a2a52",
    caseB: "#08102a",
    bezel: "#0a1430",
    dialA: "#14285e",
    dialB: "#050e1e",
    marker: "rgba(160,200,255,0.85)",
    markerType: "dot",
    hrColor: "rgba(200,220,255,0.92)",
    minColor: "rgba(180,210,255,0.85)",
    secColor: "#ff8800",
    majTick: "rgba(160,200,255,0.6)",
    minTick: "rgba(160,200,255,0.2)",
  },
  {
    name: "Rose Gold",
    caseA: "#c8906a",
    caseB: "#8a5832",
    bezel: "#6a3820",
    dialA: "#f5ede0",
    dialB: "#ead8c0",
    marker: "rgba(90,60,25,0.72)",
    markerType: "rect",
    hrColor: "rgba(70,45,15,0.9)",
    minColor: "rgba(70,45,15,0.78)",
    secColor: "#b03020",
    majTick: "rgba(90,60,25,0.48)",
    minTick: "rgba(90,60,25,0.18)",
  },
  {
    name: "Racing",
    caseA: "#2a2a2a",
    caseB: "#080808",
    bezel: "#000",
    dialA: "#101010",
    dialB: "#000",
    marker: "rgba(255,40,40,0.9)",
    markerType: "dot",
    hrColor: "#fff",
    minColor: "rgba(255,255,255,0.88)",
    secColor: "#ff2020",
    majTick: "rgba(255,255,255,0.65)",
    minTick: "rgba(255,255,255,0.2)",
  },
  {
    name: "Cream",
    caseA: "#e8e2d8",
    caseB: "#bab0a0",
    bezel: "#a8a090",
    dialA: "#faf6ee",
    dialB: "#ede4d4",
    marker: "rgba(75,58,38,0.72)",
    markerType: "rect",
    hrColor: "rgba(55,40,20,0.9)",
    minColor: "rgba(55,40,20,0.82)",
    secColor: "#8a3010",
    majTick: "rgba(75,58,38,0.42)",
    minTick: "rgba(75,58,38,0.15)",
  },
  // ── 6: Swiss Railway ─────────────────────────────────────────────────────
  {
    name: "Swiss Railway",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const sp = d(secAngle, 66);
      const sb = d(secAngle + 180, 20);
      const disc = d(secAngle, 46);
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <circle cx={95} cy={97} r={R + 2} fill="rgba(0,0,0,0.2)" />
          <circle cx={95} cy={95} r={R} fill="#f2f0ec" />
          <circle
            cx={95}
            cy={95}
            r={R}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={3.5}
          />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 2);
            const inn = d(a, maj ? R - 14 : R - 7);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="#1a1a1a"
                strokeWidth={maj ? 2.8 : 1.2}
                strokeLinecap="butt"
              />
            );
          })}
          <line
            x1={d(hrAngle + 180, 9).x}
            y1={d(hrAngle + 180, 9).y}
            x2={d(hrAngle, 52).x}
            y2={d(hrAngle, 52).y}
            stroke="#111"
            strokeWidth={7.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 10).x}
            y1={d(minAngle + 180, 10).y}
            x2={d(minAngle, 74).x}
            y2={d(minAngle, 74).y}
            stroke="#111"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <line
            x1={sb.x}
            y1={sb.y}
            x2={sp.x}
            y2={sp.y}
            stroke="#db1c1c"
            strokeWidth={2}
          />
          <circle cx={disc.x} cy={disc.y} r={8} fill="#db1c1c" />
          <circle cx={95} cy={95} r={5} fill="#111" />
        </svg>
      );
    },
  },

  // ── 7: Bauhaus ────────────────────────────────────────────────────────────
  {
    name: "Bauhaus",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <circle cx={95} cy={95} r={84} fill="#ede9e3" />
          {([0, 90, 180, 270] as number[]).map((a) => {
            const p = d(a, 66);
            return (
              <rect
                key={a}
                x={p.x - 5}
                y={p.y - 5}
                width={10}
                height={10}
                fill={a === 0 ? "#cc1f1f" : "#1a1a1a"}
                transform={`rotate(45,${p.x},${p.y})`}
              />
            );
          })}
          {([30, 60, 120, 150, 210, 240, 300, 330] as number[]).map((a) => {
            const p = d(a, 66);
            return (
              <circle
                key={a}
                cx={p.x}
                cy={p.y}
                r={2.5}
                fill="rgba(26,26,26,0.35)"
              />
            );
          })}
          <line
            x1={95}
            y1={95}
            x2={d(hrAngle, 46).x}
            y2={d(hrAngle, 46).y}
            stroke="#1a1a1a"
            strokeWidth={11}
            strokeLinecap="square"
          />
          <line
            x1={95}
            y1={95}
            x2={d(minAngle, 72).x}
            y2={d(minAngle, 72).y}
            stroke="#1a1a1a"
            strokeWidth={3}
            strokeLinecap="square"
          />
          <line
            x1={d(secAngle + 180, 16).x}
            y1={d(secAngle + 180, 16).y}
            x2={d(secAngle, 74).x}
            y2={d(secAngle, 74).y}
            stroke="#cc1f1f"
            strokeWidth={1.8}
            strokeLinecap="square"
          />
          <rect x={91} y={91} width={8} height={8} fill="#cc1f1f" />
        </svg>
      );
    },
  },

  // ── 8: Digital LCD (Amber) ────────────────────────────────────────────────
  {
    name: "Digital LCD",
    hideDigital: true,
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const h = padZ(now.getHours());
      const m = padZ(now.getMinutes());
      const s = padZ(now.getSeconds());
      const day = (
        ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as string[]
      )[now.getDay()];
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="lcd_bg" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#0d1c0a" />
              <stop offset="100%" stopColor="#060d04" />
            </radialGradient>
          </defs>
          <rect
            x={4}
            y={4}
            width={182}
            height={182}
            rx={18}
            fill="url(#lcd_bg)"
          />
          <rect
            x={4}
            y={4}
            width={182}
            height={182}
            rx={18}
            fill="none"
            stroke="#1a3012"
            strokeWidth={1.5}
          />
          {Array.from({ length: 91 }, (_, i) => (
            <line
              key={i}
              x1={4}
              y1={4 + i * 2}
              x2={186}
              y2={4 + i * 2}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={1}
            />
          ))}
          <text
            x={95}
            y={92}
            textAnchor="middle"
            fill="rgba(180,140,20,0.1)"
            fontSize={54}
            fontFamily="'Courier New',monospace"
            fontWeight="bold"
          >
            88:88
          </text>
          <text
            x={95}
            y={92}
            textAnchor="middle"
            fill="#d8a820"
            fontSize={54}
            fontFamily="'Courier New',monospace"
            fontWeight="bold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {h}:{m}
          </text>
          <text
            x={95}
            y={128}
            textAnchor="middle"
            fill="rgba(216,168,32,0.5)"
            fontSize={28}
            fontFamily="'Courier New',monospace"
            fontWeight="bold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {s}
          </text>
          <text
            x={95}
            y={160}
            textAnchor="middle"
            fill="rgba(216,168,32,0.32)"
            fontSize={11}
            fontFamily="'Courier New',monospace"
            letterSpacing="0.1em"
          >
            {day} {dd}/{mm}
          </text>
        </svg>
      );
    },
  },

  // ── 9: Neon Tokyo ─────────────────────────────────────────────────────────
  {
    name: "Neon Tokyo",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <filter id="nt_glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="nt_strong">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="nt_bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#080c14" />
              <stop offset="100%" stopColor="#020408" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={95} r={R + 3} fill="rgba(0,0,0,0.6)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#nt_bg)" />
          <circle
            cx={95}
            cy={95}
            r={R}
            fill="none"
            stroke="#00f5ff"
            strokeWidth={1.5}
            filter="url(#nt_glow)"
            opacity={0.7}
          />
          <circle
            cx={95}
            cy={95}
            r={R}
            fill="none"
            stroke="#00f5ff"
            strokeWidth={0.5}
          />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 1);
            const inn = d(a, maj ? R - 10 : R - 5);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke={maj ? "#00f5ff" : "#7040ff"}
                strokeWidth={maj ? 1.5 : 0.8}
                filter={maj ? "url(#nt_glow)" : undefined}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const p = d((i / 12) * 360, R - 18);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="#00f5ff"
                filter="url(#nt_glow)"
              />
            );
          })}
          <line
            x1={d(hrAngle + 180, 10).x}
            y1={d(hrAngle + 180, 10).y}
            x2={d(hrAngle, 44).x}
            y2={d(hrAngle, 44).y}
            stroke="#ff2090"
            strokeWidth={3}
            strokeLinecap="round"
            filter="url(#nt_strong)"
          />
          <line
            x1={d(hrAngle + 180, 10).x}
            y1={d(hrAngle + 180, 10).y}
            x2={d(hrAngle, 44).x}
            y2={d(hrAngle, 44).y}
            stroke="#ff80c0"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 12).x}
            y1={d(minAngle + 180, 12).y}
            x2={d(minAngle, 62).x}
            y2={d(minAngle, 62).y}
            stroke="#00f5ff"
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#nt_glow)"
          />
          <line
            x1={d(minAngle + 180, 12).x}
            y1={d(minAngle + 180, 12).y}
            x2={d(minAngle, 62).x}
            y2={d(minAngle, 62).y}
            stroke="#a0faff"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 16).x}
            y1={d(secAngle + 180, 16).y}
            x2={d(secAngle, 68).x}
            y2={d(secAngle, 68).y}
            stroke="#aaff00"
            strokeWidth={1.5}
            strokeLinecap="round"
            filter="url(#nt_glow)"
          />
          <circle
            cx={95}
            cy={95}
            r={5}
            fill="#00f5ff"
            filter="url(#nt_strong)"
          />
          <circle cx={95} cy={95} r={2.5} fill="#fff" />
        </svg>
      );
    },
  },

  // ── 10: Pilot / Flieger ───────────────────────────────────────────────────
  {
    name: "Pilot",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="pl_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#0c0c0c" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 4} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 3} fill="url(#pl_case)" />
          <circle cx={95} cy={95} r={R - 2} fill="#111" />
          <circle cx={95} cy={95} r={R - 4} fill="#0e0e0e" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 5);
            const inn = d(a, maj ? R - 16 : R - 10);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(255,255,255,0.75)"
                strokeWidth={maj ? 2.2 : 1}
                strokeLinecap="butt"
              />
            );
          })}
          <polygon points="95,27 87,44 103,44" fill="rgba(255,255,255,0.92)" />
          {([3, 6, 9] as number[]).map((i) => {
            const a = (i / 12) * 360;
            const p = d(a, R - 26);
            return (
              <g key={i} transform={`rotate(${a},${p.x},${p.y})`}>
                <rect
                  x={p.x - 4}
                  y={p.y - 10}
                  width={8}
                  height={18}
                  rx={1}
                  fill="rgba(255,255,255,0.88)"
                />
              </g>
            );
          })}
          {([1, 2, 4, 5, 7, 8, 10, 11] as number[]).map((i) => {
            const p = d((i / 12) * 360, R - 26);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="rgba(255,255,255,0.72)"
              />
            );
          })}
          <line
            x1={d(hrAngle + 180, 10).x}
            y1={d(hrAngle + 180, 10).y}
            x2={d(hrAngle, 46).x}
            y2={d(hrAngle, 46).y}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={d(hrAngle, 22).x}
            y1={d(hrAngle, 22).y}
            x2={d(hrAngle, 42).x}
            y2={d(hrAngle, 42).y}
            stroke="#9ecf60"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.8}
          />
          <line
            x1={d(minAngle + 180, 12).x}
            y1={d(minAngle + 180, 12).y}
            x2={d(minAngle, 70).x}
            y2={d(minAngle, 70).y}
            stroke="rgba(255,255,255,0.88)"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle, 40).x}
            y1={d(minAngle, 40).y}
            x2={d(minAngle, 66).x}
            y2={d(minAngle, 66).y}
            stroke="#9ecf60"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.8}
          />
          <line
            x1={d(secAngle + 180, 18).x}
            y1={d(secAngle + 180, 18).y}
            x2={d(secAngle, 70).x}
            y2={d(secAngle, 70).y}
            stroke="#e86010"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={6} fill="#111" />
          <circle cx={95} cy={95} r={3} fill="#e86010" />
        </svg>
      );
    },
  },

  // ── 11: Moonphase ─────────────────────────────────────────────────────────
  {
    name: "Moonphase",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
          86400000,
      );
      const phase = (dayOfYear % 29.5) / 29.5;
      const moonX = 95 + 18 * Math.cos(phase * 2 * Math.PI);
      const stars: [number, number][] = [
        [40, 35],
        [150, 50],
        [160, 130],
        [30, 120],
        [120, 40],
        [70, 140],
        [165, 80],
        [25, 70],
        [80, 28],
        [155, 100],
        [50, 155],
      ];
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="mp_dial" cx="50%" cy="35%">
              <stop offset="0%" stopColor="#1a2040" />
              <stop offset="100%" stopColor="#080c1e" />
            </radialGradient>
            <radialGradient id="mp_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#5a5060" />
              <stop offset="100%" stopColor="#2a2430" />
            </radialGradient>
            <radialGradient id="mp_moon" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#f8f0d8" />
              <stop offset="100%" stopColor="#c0b080" />
            </radialGradient>
            <clipPath id="mp_clip">
              <circle cx={95} cy={138} r={18} />
            </clipPath>
          </defs>
          <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#mp_case)" />
          <circle cx={95} cy={95} r={R} fill="url(#mp_dial)" />
          {stars.map(([sx, sy], i) => (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={i % 3 === 0 ? 1.2 : 0.8}
              fill="rgba(255,255,255,0.55)"
            />
          ))}
          <circle
            cx={95}
            cy={138}
            r={20}
            fill="#040818"
            stroke="rgba(200,180,120,0.4)"
            strokeWidth={1}
          />
          <circle cx={95} cy={138} r={18} fill="url(#mp_moon)" />
          <circle
            cx={moonX}
            cy={138}
            r={18}
            fill="#040818"
            clipPath="url(#mp_clip)"
          />
          <text
            x={95}
            y={162}
            textAnchor="middle"
            fill="rgba(200,180,120,0.5)"
            fontSize={7}
            letterSpacing="0.1em"
          >
            MOON
          </text>
          {Array.from({ length: 60 }, (_, i) => {
            if (i >= 26 && i <= 34) return null;
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 1);
            const inn = d(a, maj ? R - 9 : R - 5);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke={
                  maj ? "rgba(200,200,255,0.5)" : "rgba(200,200,255,0.18)"
                }
                strokeWidth={maj ? 1.5 : 0.8}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            if (i === 6) return null;
            const p = d((i / 12) * 360, R - 14);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={2.5}
                fill="rgba(200,200,255,0.65)"
              />
            );
          })}
          <line
            x1={d(hrAngle + 180, 10).x}
            y1={d(hrAngle + 180, 10).y}
            x2={d(hrAngle, 42).x}
            y2={d(hrAngle, 42).y}
            stroke="rgba(220,215,255,0.92)"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 12).x}
            y1={d(minAngle + 180, 12).y}
            x2={d(minAngle, 60).x}
            y2={d(minAngle, 60).y}
            stroke="rgba(220,215,255,0.88)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 16).x}
            y1={d(secAngle + 180, 16).y}
            x2={d(secAngle, 64).x}
            y2={d(secAngle, 64).y}
            stroke="#d4a020"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={4.5} fill="#d4a020" />
          <circle cx={95} cy={95} r={2} fill="rgba(220,215,255,0.9)" />
        </svg>
      );
    },
  },

  // ── 12: Tide Watch (Tábua de Maré) ────────────────────────────────────────
  {
    name: "Tide Watch",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const totalMin =
        now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const tidePhase = ((totalMin / 60) % 12.42) / 12.42;
      const tideLevel = Math.sin(tidePhase * 2 * Math.PI);
      const wavePts = Array.from({ length: 50 }, (_, i) => {
        const x = 60 + (i / 49) * 70;
        const y =
          142 +
          Math.sin((i / 49) * Math.PI * 3 + tidePhase * Math.PI * 2) * 4 -
          tideLevel * 6;
        return `${x},${y}`;
      }).join(" L ");
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="td_dial" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#0a4060" />
              <stop offset="100%" stopColor="#001020" />
            </radialGradient>
            <radialGradient id="td_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#506880" />
              <stop offset="100%" stopColor="#1a2a3a" />
            </radialGradient>
            <linearGradient id="td_water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(80,180,220,0.85)" />
              <stop offset="100%" stopColor="rgba(20,80,140,0.4)" />
            </linearGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#td_case)" />
          <circle cx={95} cy={95} r={R} fill="url(#td_dial)" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 2);
            const inn = d(a, maj ? R - 9 : R - 5);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke={maj ? "rgba(200,230,255,0.7)" : "rgba(120,180,220,0.3)"}
                strokeWidth={maj ? 1.5 : 0.8}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            if (i === 6) return null;
            const num = i === 0 ? 12 : i;
            const p = d((i / 12) * 360, R - 16);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fill="rgba(180,220,255,0.85)"
                fontSize={9}
                fontWeight="bold"
              >
                {num}
              </text>
            );
          })}
          <path
            d="M 58 132 Q 95 124 132 132 L 132 158 Q 95 162 58 158 Z"
            fill="#020812"
            stroke="rgba(120,180,220,0.4)"
            strokeWidth={0.8}
          />
          <path d={`M 60 158 L ${wavePts} L 130 158 Z`} fill="url(#td_water)" />
          <text
            x={95}
            y={155}
            textAnchor="middle"
            fill="rgba(220,240,255,0.85)"
            fontSize={6}
            letterSpacing="0.1em"
            fontWeight="bold"
          >
            {tideLevel > 0 ? "FLOOD" : "EBB"}{" "}
            {Math.abs(tideLevel * 100).toFixed(0)}%
          </text>
          <line
            x1={d(hrAngle + 180, 9).x}
            y1={d(hrAngle + 180, 9).y}
            x2={d(hrAngle, 44).x}
            y2={d(hrAngle, 44).y}
            stroke="rgba(220,240,255,0.95)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 11).x}
            y1={d(minAngle + 180, 11).y}
            x2={d(minAngle, 64).x}
            y2={d(minAngle, 64).y}
            stroke="rgba(220,240,255,0.9)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 14).x}
            y1={d(secAngle + 180, 14).y}
            x2={d(secAngle, 70).x}
            y2={d(secAngle, 70).y}
            stroke="#ff8060"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={4} fill="#ff8060" />
          <circle cx={95} cy={95} r={1.8} fill="#fff" />
        </svg>
      );
    },
  },

  // ── 13: GMT World Time ────────────────────────────────────────────────────
  {
    name: "GMT World",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const utcAngle =
        ((now.getUTCHours() + now.getUTCMinutes() / 60) / 24) * 360;
      const cities = [
        "LON",
        "PAR",
        "CAI",
        "DXB",
        "KAR",
        "HKG",
        "TYO",
        "SYD",
        "HNL",
        "ANC",
        "LAX",
        "CHI",
        "NYC",
        "RIO",
        "ACR",
        "-",
      ];
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="wt_globe" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#1e4a7a" />
              <stop offset="60%" stopColor="#082040" />
              <stop offset="100%" stopColor="#020612" />
            </radialGradient>
            <radialGradient id="wt_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#3a3025" />
              <stop offset="100%" stopColor="#1a1208" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#wt_case)" />
          <circle cx={95} cy={95} r={R - 2} fill="url(#wt_globe)" />
          <g transform={`rotate(${-utcAngle},95,95)`}>
            <path
              d={`M 95 ${95 - R + 1} A ${R - 1} ${R - 1} 0 0 1 95 ${95 + R - 1}`}
              fill="none"
              stroke="rgba(255,200,80,0.22)"
              strokeWidth={6}
            />
            <path
              d={`M 95 ${95 + R - 1} A ${R - 1} ${R - 1} 0 0 1 95 ${95 - R + 1}`}
              fill="none"
              stroke="rgba(40,80,160,0.42)"
              strokeWidth={6}
            />
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * 360;
              const o = clkDeg(a, R - 1);
              const inn = clkDeg(a, R - 6);
              return (
                <line
                  key={i}
                  x1={o.x}
                  y1={o.y}
                  x2={inn.x}
                  y2={inn.y}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={i % 6 === 0 ? 1 : 0.5}
                />
              );
            })}
            {Array.from({ length: 24 }, (_, i) => {
              if (i % 2 !== 0) return null;
              const a = (i / 24) * 360;
              const p = clkDeg(a, R - 12);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y + 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.55)"
                  fontSize={5}
                  fontWeight="bold"
                  transform={`rotate(${a},${p.x},${p.y})`}
                >
                  {i}
                </text>
              );
            })}
          </g>
          {cities.slice(0, 12).map((c, i) => {
            const a = (i / 12) * 360;
            const p = d(a, R + 5);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 1.5}
                textAnchor="middle"
                fill="rgba(220,210,180,0.7)"
                fontSize={5}
                fontWeight="bold"
                transform={`rotate(${a},${p.x},${p.y})`}
              >
                {c}
              </text>
            );
          })}
          <g opacity={0.45}>
            <ellipse cx={75} cy={82} rx={14} ry={8} fill="#406a40" />
            <ellipse cx={108} cy={92} rx={10} ry={6} fill="#406a40" />
            <ellipse cx={92} cy={108} rx={9} ry={5} fill="#406a40" />
            <circle cx={120} cy={75} r={4} fill="#406a40" />
            <circle cx={68} cy={108} r={3} fill="#406a40" />
          </g>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 360;
            const p = d(a, R - 24);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={1.2}
                fill="rgba(255,255,255,0.5)"
              />
            );
          })}
          <line
            x1={95}
            y1={95}
            x2={d(utcAngle, R - 28).x}
            y2={d(utcAngle, R - 28).y}
            stroke="#ff8030"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <polygon
            points={`${d(utcAngle, R - 28).x - 2},${d(utcAngle, R - 28).y} ${d(utcAngle, R - 22).x},${d(utcAngle, R - 22).y} ${d(utcAngle, R - 28).x + 2},${d(utcAngle, R - 28).y}`}
            fill="#ff8030"
          />
          <line
            x1={d(hrAngle + 180, 8).x}
            y1={d(hrAngle + 180, 8).y}
            x2={d(hrAngle, 38).x}
            y2={d(hrAngle, 38).y}
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 10).x}
            y1={d(minAngle + 180, 10).y}
            x2={d(minAngle, 56).x}
            y2={d(minAngle, 56).y}
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 12).x}
            y1={d(secAngle + 180, 12).y}
            x2={d(secAngle, 64).x}
            y2={d(secAngle, 64).y}
            stroke="#ffcc00"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={3.5} fill="#fff" />
          <circle cx={95} cy={95} r={1.5} fill="#000" />
        </svg>
      );
    },
  },

  // ── 14: Chronograph (Speedmaster) ─────────────────────────────────────────
  {
    name: "Chronograph",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const sd = (
        cx: number,
        cy: number,
        sdR: number,
        divs: number,
        handAngle: number,
      ) => (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={sdR}
            fill="#0a0a0a"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={0.7}
          />
          <circle
            cx={cx}
            cy={cy}
            r={sdR - 1}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.4}
          />
          {Array.from({ length: divs }, (_, i) => {
            const a = (i / divs) * 360;
            const o = clkDeg(a, sdR - 1, cx, cy);
            const inn = clkDeg(a, sdR - 3, cx, cy);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={i % (divs / 4) === 0 ? 0.9 : 0.4}
              />
            );
          })}
          <line
            x1={cx}
            y1={cy}
            x2={clkDeg(handAngle, sdR - 4, cx, cy).x}
            y2={clkDeg(handAngle, sdR - 4, cx, cy).y}
            stroke="#fff"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={1.2} fill="#fff" />
        </g>
      );
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="cr_dial" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="cr_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#5a5a5a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 4} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 3} fill="url(#cr_case)" />
          <circle cx={95} cy={95} r={R + 1} fill="#080808" />
          <circle cx={95} cy={95} r={R} fill="url(#cr_dial)" />
          <circle
            cx={95}
            cy={95}
            r={R - 0.5}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.4}
          />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 1);
            const inn = d(a, maj ? R - 6 : R - 3);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke={maj ? "#fff" : "rgba(255,255,255,0.5)"}
                strokeWidth={maj ? 1 : 0.5}
              />
            );
          })}
          {[40, 50, 65, 80, 100, 120, 150, 200].map((tac, i) => {
            const a = (i / 12) * 360 + 15;
            const p = d(a, R - 8);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 1.5}
                textAnchor="middle"
                fill="rgba(220,40,40,0.85)"
                fontSize={4.5}
                fontWeight="bold"
                transform={`rotate(${a},${p.x},${p.y})`}
              >
                {tac}
              </text>
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            if (i === 3 || i === 6 || i === 9) return null;
            const a = (i / 12) * 360;
            const p = d(a, R - 16);
            return (
              <rect
                key={i}
                x={p.x - 1.4}
                y={p.y - 5}
                width={2.8}
                height={10}
                fill="rgba(255,255,255,0.92)"
                transform={`rotate(${a},${p.x},${p.y})`}
              />
            );
          })}
          {sd(60, 95, 16, 12, secAngle)}
          {sd(130, 95, 16, 12, (now.getMinutes() / 30) * 360)}
          {sd(95, 130, 16, 12, ((now.getHours() % 12) / 12) * 360)}
          {(
            [
              ["60", 60, 78],
              ["30", 130, 78],
              ["12", 95, 113],
            ] as Array<[string, number, number]>
          ).map(([label, x, y]) => (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              fill="rgba(180,180,180,0.5)"
              fontSize={4}
              fontWeight="bold"
            >
              {label}
            </text>
          ))}
          <line
            x1={d(hrAngle + 180, 9).x}
            y1={d(hrAngle + 180, 9).y}
            x2={d(hrAngle, 40).x}
            y2={d(hrAngle, 40).y}
            stroke="#fff"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 11).x}
            y1={d(minAngle + 180, 11).y}
            x2={d(minAngle, 60).x}
            y2={d(minAngle, 60).y}
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 18).x}
            y1={d(secAngle + 180, 18).y}
            x2={d(secAngle, 72).x}
            y2={d(secAngle, 72).y}
            stroke="#ff3030"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle
            cx={d(secAngle, 70).x}
            cy={d(secAngle, 70).y}
            r={2.5}
            fill="#ff3030"
          />
          <circle cx={95} cy={95} r={4} fill="#ff3030" />
          <circle cx={95} cy={95} r={1.8} fill="#0a0a0a" />
        </svg>
      );
    },
  },

  // ── 15: Regulator ─────────────────────────────────────────────────────────
  {
    name: "Regulator",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number, cx = 95, cy = 95) =>
        clkDeg(a, r, cx, cy);
      const RM = 78;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="rg_dial" cx="50%" cy="35%">
              <stop offset="0%" stopColor="#fdfaf3" />
              <stop offset="100%" stopColor="#ede4cc" />
            </radialGradient>
            <radialGradient id="rg_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#9a7250" />
              <stop offset="100%" stopColor="#3a2820" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={87} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={86} fill="url(#rg_case)" />
          <circle cx={95} cy={95} r={82} fill="url(#rg_dial)" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, RM);
            const inn = d(a, maj ? RM - 7 : RM - 3);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="#2a1810"
                strokeWidth={maj ? 1.2 : 0.5}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 360;
            const p = d(a, RM - 14);
            const num = i * 5 === 0 ? 60 : i * 5;
            if (i === 0 || i === 3 || i === 6 || i === 9) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 2.5}
                textAnchor="middle"
                fill="#2a1810"
                fontSize={6.5}
                fontFamily="serif"
                fontWeight="bold"
              >
                {num}
              </text>
            );
          })}
          <circle
            cx={95}
            cy={55}
            r={20}
            fill="rgba(245,235,210,0.6)"
            stroke="#3a2820"
            strokeWidth={1.3}
          />
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
            const a = (i / 12) * 360;
            const p = d(a, 16, 95, 55);
            const roman = [
              "XII",
              "I",
              "II",
              "III",
              "IV",
              "V",
              "VI",
              "VII",
              "VIII",
              "IX",
              "X",
              "XI",
            ][i];
            return (
              <text
                key={n}
                x={p.x}
                y={p.y + 2}
                textAnchor="middle"
                fill="#2a1810"
                fontSize={4.5}
                fontFamily="serif"
                fontWeight="bold"
              >
                {roman}
              </text>
            );
          })}
          <line
            x1={95}
            y1={55}
            x2={d(hrAngle, 14, 95, 55).x}
            y2={d(hrAngle, 14, 95, 55).y}
            stroke="#1a3060"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <circle cx={95} cy={55} r={1.3} fill="#1a3060" />
          <text
            x={95}
            y={36}
            textAnchor="middle"
            fill="#5a3e2a"
            fontSize={4.2}
            letterSpacing="0.18em"
            fontFamily="serif"
          >
            HEURES
          </text>
          <circle
            cx={95}
            cy={140}
            r={16}
            fill="rgba(245,235,210,0.6)"
            stroke="#3a2820"
            strokeWidth={1.1}
          />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 360;
            const o = clkDeg(a, 15, 95, 140);
            const inn = clkDeg(a, 13, 95, 140);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="#2a1810"
                strokeWidth={i % 3 === 0 ? 0.8 : 0.4}
              />
            );
          })}
          {[0, 15, 30, 45].map((n, i) => {
            const a = i * 90;
            const p = d(a, 11, 95, 140);
            return (
              <text
                key={n}
                x={p.x}
                y={p.y + 1.5}
                textAnchor="middle"
                fill="#2a1810"
                fontSize={3.2}
                fontFamily="serif"
              >
                {n}
              </text>
            );
          })}
          <line
            x1={95}
            y1={140}
            x2={d(secAngle, 12, 95, 140).x}
            y2={d(secAngle, 12, 95, 140).y}
            stroke="#1a3060"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <circle cx={95} cy={140} r={1} fill="#1a3060" />
          <text
            x={95}
            y={163}
            textAnchor="middle"
            fill="#5a3e2a"
            fontSize={4.2}
            letterSpacing="0.18em"
            fontFamily="serif"
          >
            SECONDES
          </text>
          <line
            x1={d(minAngle + 180, 8).x}
            y1={d(minAngle + 180, 8).y}
            x2={d(minAngle, 72).x}
            y2={d(minAngle, 72).y}
            stroke="#1a3060"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <polygon
            points={`${d(minAngle, 72).x - 2},${d(minAngle, 72).y - 6} ${d(minAngle, 78).x},${d(minAngle, 78).y} ${d(minAngle, 72).x + 2},${d(minAngle, 72).y - 6}`}
            fill="#1a3060"
            transform={`rotate(${minAngle - 180},${d(minAngle, 75).x},${d(minAngle, 75).y})`}
          />
          <circle cx={95} cy={95} r={3.5} fill="#1a3060" />
          <circle cx={95} cy={95} r={1.5} fill="#fff" />
        </svg>
      );
    },
  },

  // ── 16: QLOCKTWO Word Clock ───────────────────────────────────────────────
  {
    name: "Word Clock",
    hideDigital: true,
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const grid = [
        "ITLISASTIME",
        "ACQUARTERDC",
        "TWENTYFIVEX",
        "HALFSTENFTO",
        "PASTERUNINE",
        "ONESIXTHREE",
        "FOURFIVETWO",
        "EIGHTELEVEN",
        "SEVENTWELVE",
        "TENSEOCLOCK",
      ];
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const active = new Set<string>();
      const activate = (row: number, col: number, len: number) => {
        for (let i = 0; i < len; i++) active.add(`${row},${col + i}`);
      };
      activate(0, 0, 2);
      activate(0, 3, 2);
      let displayHour = h;
      const block = Math.floor(m / 5);
      if (block === 0) {
        activate(9, 5, 6);
      } else {
        if (block === 1) activate(2, 6, 4);
        else if (block === 2) activate(3, 5, 3);
        else if (block === 3) {
          activate(1, 1, 1);
          activate(1, 2, 7);
        } else if (block === 4) activate(2, 0, 6);
        else if (block === 5) {
          activate(2, 0, 6);
          activate(2, 6, 4);
        } else if (block === 6) activate(3, 0, 4);
        else if (block === 7) {
          activate(2, 0, 6);
          activate(2, 6, 4);
        } else if (block === 8) activate(2, 0, 6);
        else if (block === 9) {
          activate(1, 1, 1);
          activate(1, 2, 7);
        } else if (block === 10) activate(3, 5, 3);
        else if (block === 11) activate(2, 6, 4);
        if (block <= 6) activate(4, 0, 4);
        else {
          activate(3, 9, 2);
          displayHour = (h + 1) % 12;
        }
      }
      const hourWords: Record<number, [number, number, number]> = {
        0: [8, 5, 6],
        1: [5, 0, 3],
        2: [6, 8, 3],
        3: [5, 6, 5],
        4: [6, 0, 4],
        5: [6, 4, 4],
        6: [5, 3, 3],
        7: [8, 0, 5],
        8: [7, 0, 5],
        9: [4, 7, 4],
        10: [9, 0, 3],
        11: [7, 5, 6],
      };
      const hw = hourWords[displayHour] ?? hourWords[0] ?? [0, 0, 0];
      activate(hw[0], hw[1], hw[2]);
      const cellW = 14;
      const cellH = 13;
      const startGX = 16;
      const startGY = 24;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="qc_bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <filter id="qc_glow">
              <feGaussianBlur stdDeviation="0.7" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            x={4}
            y={4}
            width={182}
            height={182}
            rx={8}
            fill="url(#qc_bg)"
            stroke="#2a2a2a"
            strokeWidth={1.2}
          />
          <rect
            x={10}
            y={10}
            width={170}
            height={170}
            rx={3}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
          {grid.map((row, ri) =>
            row.split("").map((char, ci) => {
              const isActive = active.has(`${ri},${ci}`);
              const x = startGX + ci * cellW + cellW / 2;
              const y = startGY + ri * cellH + cellH / 2 + 3;
              return (
                <text
                  key={`${ri}-${ci}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fill={isActive ? "#fafafa" : "rgba(255,255,255,0.09)"}
                  fontSize={9}
                  fontFamily="'Helvetica Neue',Arial,sans-serif"
                  fontWeight="bold"
                  letterSpacing="0.05em"
                  filter={isActive ? "url(#qc_glow)" : undefined}
                >
                  {char}
                </text>
              );
            }),
          )}
          {(
            [
              [14, 14],
              [176, 14],
              [176, 176],
              [14, 176],
            ] as Array<[number, number]>
          ).map(([cx, cy], i) => {
            const lit = m % 5 > i;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={1.8}
                fill={lit ? "#fafafa" : "rgba(255,255,255,0.1)"}
                filter={lit ? "url(#qc_glow)" : undefined}
              />
            );
          })}
        </svg>
      );
    },
  },

  // ── 17: Binary Watch ──────────────────────────────────────────────────────
  {
    name: "Binary",
    hideDigital: true,
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const cols = [
        Math.floor(now.getHours() / 10),
        now.getHours() % 10,
        Math.floor(now.getMinutes() / 10),
        now.getMinutes() % 10,
        Math.floor(now.getSeconds() / 10),
        now.getSeconds() % 10,
      ];
      const rows = [8, 4, 2, 1];
      const dotR = 6.5;
      const gapX = 22;
      const gapY = 26;
      const colX = (i: number) => 40 + i * gapX;
      const rowY = (i: number) => 40 + i * gapY;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="bn_bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#1a2818" />
              <stop offset="100%" stopColor="#050a04" />
            </radialGradient>
            <radialGradient id="bn_led_on" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#ff7060" />
              <stop offset="100%" stopColor="#a01010" />
            </radialGradient>
            <filter id="bn_glow">
              <feGaussianBlur stdDeviation="1.4" />
            </filter>
          </defs>
          <rect
            x={4}
            y={4}
            width={182}
            height={182}
            rx={14}
            fill="url(#bn_bg)"
            stroke="#2a3828"
            strokeWidth={1.5}
          />
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={i}
              x1={4}
              y1={6 + i * 8}
              x2={186}
              y2={6 + i * 8}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={0.5}
            />
          ))}
          <text
            x={(colX(0) + colX(1)) / 2}
            y={24}
            textAnchor="middle"
            fill="rgba(150,180,140,0.75)"
            fontSize={6.5}
            letterSpacing="0.15em"
            fontWeight="bold"
          >
            HRS
          </text>
          <text
            x={(colX(2) + colX(3)) / 2}
            y={24}
            textAnchor="middle"
            fill="rgba(150,180,140,0.75)"
            fontSize={6.5}
            letterSpacing="0.15em"
            fontWeight="bold"
          >
            MIN
          </text>
          <text
            x={(colX(4) + colX(5)) / 2}
            y={24}
            textAnchor="middle"
            fill="rgba(150,180,140,0.75)"
            fontSize={6.5}
            letterSpacing="0.15em"
            fontWeight="bold"
          >
            SEC
          </text>
          {rows.map((v, ri) => (
            <text
              key={ri}
              x={20}
              y={rowY(ri) + 2.5}
              textAnchor="middle"
              fill="rgba(150,180,140,0.55)"
              fontSize={7.5}
              fontFamily="'Courier New',monospace"
              fontWeight="bold"
            >
              {v}
            </text>
          ))}
          <line
            x1={(colX(1) + colX(2)) / 2}
            y1={32}
            x2={(colX(1) + colX(2)) / 2}
            y2={130}
            stroke="rgba(150,180,140,0.18)"
            strokeWidth={0.5}
          />
          <line
            x1={(colX(3) + colX(4)) / 2}
            y1={32}
            x2={(colX(3) + colX(4)) / 2}
            y2={130}
            stroke="rgba(150,180,140,0.18)"
            strokeWidth={0.5}
          />
          {cols.map((val, ci) =>
            rows.map((bit, ri) => {
              const lit = (val & bit) !== 0;
              const cx = colX(ci);
              const cy = rowY(ri);
              return (
                <g key={`${ci}-${ri}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={dotR}
                    fill="#1a1410"
                    stroke="#2a2418"
                    strokeWidth={0.6}
                  />
                  {lit && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={dotR + 2}
                      fill="#ff5050"
                      opacity={0.4}
                      filter="url(#bn_glow)"
                    />
                  )}
                  {lit && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={dotR - 1}
                      fill="url(#bn_led_on)"
                    />
                  )}
                  {lit && (
                    <circle
                      cx={cx - 1.5}
                      cy={cy - 1.5}
                      r={1.3}
                      fill="rgba(255,200,200,0.75)"
                    />
                  )}
                </g>
              );
            }),
          )}
          <text
            x={95}
            y={170}
            textAnchor="middle"
            fill="rgba(150,180,140,0.5)"
            fontSize={6.5}
            fontFamily="'Courier New',monospace"
            letterSpacing="0.18em"
            fontWeight="bold"
          >
            BCD BINARY
          </text>
        </svg>
      );
    },
  },

  // ── 18: Skeleton Tourbillon ───────────────────────────────────────────────
  {
    name: "Tourbillon",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const gear = (
        cx: number,
        cy: number,
        gr: number,
        teeth: number,
        spokes: number,
        rot: number,
      ) => (
        <g transform={`rotate(${rot},${cx},${cy})`}>
          <circle cx={cx} cy={cy} r={gr + 1.5} fill="#5a4810" />
          <circle cx={cx} cy={cy} r={gr} fill="url(#sk_gear)" />
          {Array.from({ length: teeth }, (_, i) => {
            const a = (i / teeth) * 360;
            const p = clkDeg(a, gr, cx, cy);
            return (
              <rect
                key={i}
                x={p.x - 0.9}
                y={p.y - 2}
                width={1.8}
                height={3.5}
                fill="#9a8050"
                transform={`rotate(${a},${p.x},${p.y})`}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={gr * 0.65} fill="#1a1612" />
          {Array.from({ length: spokes }, (_, i) => {
            const a = (i / spokes) * 360;
            const p = clkDeg(a, gr * 0.62, cx, cy);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="rgba(216,200,144,0.7)"
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={cx} cy={cy} r={1.8} fill="#d8c890" />
        </g>
      );
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="sk_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#d8c890" />
              <stop offset="100%" stopColor="#7a6230" />
            </radialGradient>
            <radialGradient id="sk_gear" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#e8d8a0" />
              <stop offset="100%" stopColor="#9a8050" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#sk_case)" />
          <circle cx={95} cy={95} r={R} fill="#1a1612" />
          <circle
            cx={95}
            cy={95}
            r={R - 1}
            fill="none"
            stroke="rgba(216,200,144,0.4)"
            strokeWidth={0.8}
          />
          {Array.from({ length: 12 }, (_, i) => {
            if (i === 6) return null;
            const a = (i / 12) * 360;
            const p = d(a, R - 11);
            const num =
              i === 0
                ? "XII"
                : [
                    "I",
                    "II",
                    "III",
                    "IV",
                    "V",
                    "VI",
                    "VII",
                    "VIII",
                    "IX",
                    "X",
                    "XI",
                  ][i - 1];
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 2.5}
                textAnchor="middle"
                fill="rgba(216,200,144,0.85)"
                fontSize={7}
                fontFamily="serif"
                fontWeight="bold"
              >
                {num}
              </text>
            );
          })}
          {gear(53, 95, 13, 16, 5, secAngle * 0.5)}
          {gear(135, 73, 9, 12, 4, -secAngle)}
          {gear(140, 110, 8, 10, 4, secAngle * 0.7)}
          <circle
            cx={95}
            cy={138}
            r={22}
            fill="#0a0806"
            stroke="#5a4810"
            strokeWidth={1}
          />
          <circle
            cx={95}
            cy={138}
            r={21}
            fill="none"
            stroke="rgba(216,200,144,0.3)"
            strokeWidth={0.5}
          />
          <g transform={`rotate(${secAngle},95,138)`}>
            {[0, 120, 240].map((a) => {
              const p1 = clkDeg(a, 20, 95, 138);
              const p2 = clkDeg(a + 180, 20, 95, 138);
              return (
                <line
                  key={a}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="rgba(216,200,144,0.7)"
                  strokeWidth={1.2}
                />
              );
            })}
            <circle
              cx={95}
              cy={138}
              r={11}
              fill="none"
              stroke="#d8c890"
              strokeWidth={1.5}
            />
            {[0, 90, 180, 270].map((a) => {
              const p = clkDeg(a, 11, 95, 138);
              return <circle key={a} cx={p.x} cy={p.y} r={2} fill="#d8c890" />;
            })}
            <line
              x1={clkDeg(180, 8, 95, 138).x}
              y1={clkDeg(180, 8, 95, 138).y}
              x2={clkDeg(0, 11, 95, 138).x}
              y2={clkDeg(0, 11, 95, 138).y}
              stroke="#ff8030"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
            <circle cx={95} cy={138} r={2} fill="#ff8030" />
          </g>
          <text
            x={95}
            y={167}
            textAnchor="middle"
            fill="rgba(216,200,144,0.5)"
            fontSize={4}
            letterSpacing="0.2em"
            fontFamily="serif"
          >
            TOURBILLON
          </text>
          <line
            x1={d(hrAngle + 180, 8).x}
            y1={d(hrAngle + 180, 8).y}
            x2={d(hrAngle, 38).x}
            y2={d(hrAngle, 38).y}
            stroke="#d8c890"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <line
            x1={d(hrAngle + 180, 6).x}
            y1={d(hrAngle + 180, 6).y}
            x2={d(hrAngle, 36).x}
            y2={d(hrAngle, 36).y}
            stroke="#1a1612"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 10).x}
            y1={d(minAngle + 180, 10).y}
            x2={d(minAngle, 60).x}
            y2={d(minAngle, 60).y}
            stroke="#d8c890"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 8).x}
            y1={d(minAngle + 180, 8).y}
            x2={d(minAngle, 58).x}
            y2={d(minAngle, 58).y}
            stroke="#1a1612"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={4} fill="#d8c890" />
          <circle cx={95} cy={95} r={2} fill="#1a1612" />
        </svg>
      );
    },
  },

  // ── 19: Nixie Tube ────────────────────────────────────────────────────────
  {
    name: "Nixie Tube",
    hideDigital: true,
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const digits = [
        Math.floor(now.getHours() / 10),
        now.getHours() % 10,
        Math.floor(now.getMinutes() / 10),
        now.getMinutes() % 10,
        Math.floor(now.getSeconds() / 10),
        now.getSeconds() % 10,
      ];
      const tubeW = 22;
      const tubeH = 56;
      const groupGap = 8;
      const tubeGap = 3;
      const startX = 16;
      const groupW = tubeW * 2 + tubeGap;
      const tubeX = (i: number) => {
        const grp = Math.floor(i / 2);
        const inGrp = i % 2;
        return startX + grp * (groupW + groupGap) + inGrp * (tubeW + tubeGap);
      };
      const yT = 60;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="nx_bg" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#2a2018" />
              <stop offset="100%" stopColor="#0a0805" />
            </radialGradient>
            <linearGradient id="nx_tube" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,200,100,0.08)" />
              <stop offset="50%" stopColor="rgba(60,40,20,0.4)" />
              <stop offset="100%" stopColor="rgba(40,30,15,0.55)" />
            </linearGradient>
            <linearGradient id="nx_glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
            </linearGradient>
            <linearGradient id="nx_brass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a48030" />
              <stop offset="50%" stopColor="#5a4218" />
              <stop offset="100%" stopColor="#2a1e0a" />
            </linearGradient>
            <filter id="nx_glow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          <rect
            x={4}
            y={4}
            width={182}
            height={182}
            rx={14}
            fill="url(#nx_bg)"
            stroke="#3a2818"
            strokeWidth={1.5}
          />
          {Array.from({ length: 28 }, (_, i) => (
            <line
              key={i}
              x1={4}
              y1={6 + i * 6.5}
              x2={186}
              y2={6 + i * 6.5}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={0.5}
            />
          ))}
          {digits.map((digit, i) => {
            const x = tubeX(i);
            return (
              <g key={i}>
                <rect
                  x={x - 1}
                  y={yT + tubeH - 2}
                  width={tubeW + 2}
                  height={9}
                  rx={1.5}
                  fill="url(#nx_brass)"
                />
                <rect
                  x={x + 2}
                  y={yT + tubeH + 7}
                  width={tubeW - 4}
                  height={2}
                  fill="#0a0804"
                />
                <rect
                  x={x}
                  y={yT}
                  width={tubeW}
                  height={tubeH}
                  rx={tubeW / 2}
                  fill="url(#nx_tube)"
                />
                <ellipse
                  cx={x + tubeW / 2}
                  cy={yT + 1}
                  rx={tubeW / 2 - 1}
                  ry={2.5}
                  fill="#1a1208"
                />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => {
                  if (g === digit) return null;
                  return (
                    <text
                      key={g}
                      x={x + tubeW / 2}
                      y={yT + tubeH / 2 + 7 + (g - 4.5) * 0.6}
                      textAnchor="middle"
                      fill="rgba(255,140,40,0.06)"
                      fontSize={20}
                      fontFamily="serif"
                      fontWeight="bold"
                    >
                      {g}
                    </text>
                  );
                })}
                <text
                  x={x + tubeW / 2}
                  y={yT + tubeH / 2 + 9}
                  textAnchor="middle"
                  fill="#ff8a20"
                  fontSize={26}
                  fontFamily="serif"
                  fontWeight="bold"
                  filter="url(#nx_glow)"
                  opacity={0.6}
                >
                  {digit}
                </text>
                <text
                  x={x + tubeW / 2}
                  y={yT + tubeH / 2 + 9}
                  textAnchor="middle"
                  fill="#ffaa50"
                  fontSize={26}
                  fontFamily="serif"
                  fontWeight="bold"
                >
                  {digit}
                </text>
                <rect
                  x={x}
                  y={yT}
                  width={tubeW}
                  height={tubeH}
                  rx={tubeW / 2}
                  fill="url(#nx_glass)"
                />
              </g>
            );
          })}
          {[1, 2].map((idx) => {
            const x = tubeX(idx * 2) - groupGap / 2 - 1;
            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={yT + 18}
                  r={2}
                  fill="#ff8a20"
                  filter="url(#nx_glow)"
                  opacity={0.6}
                />
                <circle cx={x} cy={yT + 18} r={1.4} fill="#ffaa50" />
                <circle
                  cx={x}
                  cy={yT + 38}
                  r={2}
                  fill="#ff8a20"
                  filter="url(#nx_glow)"
                  opacity={0.6}
                />
                <circle cx={x} cy={yT + 38} r={1.4} fill="#ffaa50" />
              </g>
            );
          })}
          <text
            x={95}
            y={150}
            textAnchor="middle"
            fill="rgba(255,140,40,0.55)"
            fontSize={6.5}
            letterSpacing="0.22em"
            fontFamily="serif"
            fontWeight="bold"
          >
            IN-12 NIXIE
          </text>
        </svg>
      );
    },
  },

  // ── 20: Retrograde Sector ─────────────────────────────────────────────────
  {
    name: "Retrograde",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();
      const hArcStart = 270,
        hArcSpan = 90;
      const mArcStart = 0,
        mArcSpan = 90;
      const sArcStart = 135,
        sArcSpan = 90;
      const hHandAngle = hArcStart + ((h + m / 60) / 12) * hArcSpan;
      const mHandAngle = mArcStart + ((m + s / 60) / 60) * mArcSpan;
      const sHandAngle = sArcStart + (s / 60) * sArcSpan;
      const arcPath = (start: number, span: number, r: number) => {
        const sp = clkDeg(start, r);
        const ep = clkDeg(start + span, r);
        return `M ${sp.x} ${sp.y} A ${r} ${r} 0 0 1 ${ep.x} ${ep.y}`;
      };
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="rt_dial" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#1a1812" />
              <stop offset="100%" stopColor="#080604" />
            </radialGradient>
            <radialGradient id="rt_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#7a6020" />
              <stop offset="100%" stopColor="#2a1c08" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={87} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={86} fill="url(#rt_case)" />
          <circle cx={95} cy={95} r={82} fill="url(#rt_dial)" />
          <path
            d={arcPath(hArcStart, hArcSpan, 60)}
            fill="none"
            stroke="rgba(216,200,144,0.3)"
            strokeWidth={2}
          />
          {Array.from({ length: 13 }, (_, i) => {
            const a = hArcStart + (i / 12) * hArcSpan;
            const o = clkDeg(a, 60);
            const inn = clkDeg(a, i % 3 === 0 ? 54 : 56);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(216,200,144,0.65)"
                strokeWidth={i % 3 === 0 ? 1.3 : 0.6}
              />
            );
          })}
          {[0, 3, 6, 9, 12].map((i) => {
            const a = hArcStart + (i / 12) * hArcSpan;
            const p = clkDeg(a, 70);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 2}
                textAnchor="middle"
                fill="rgba(216,200,144,0.85)"
                fontSize={6.5}
                fontWeight="bold"
              >
                {i === 0 ? 12 : i}
              </text>
            );
          })}
          <text
            x={clkDeg(hArcStart + hArcSpan / 2, 80).x}
            y={clkDeg(hArcStart + hArcSpan / 2, 80).y}
            textAnchor="middle"
            fill="rgba(216,200,144,0.5)"
            fontSize={4.5}
            letterSpacing="0.15em"
          >
            HOURS
          </text>
          <line
            x1={95}
            y1={95}
            x2={clkDeg(hHandAngle, 56).x}
            y2={clkDeg(hHandAngle, 56).y}
            stroke="#d8c890"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle
            cx={clkDeg(hHandAngle, 56).x}
            cy={clkDeg(hHandAngle, 56).y}
            r={1.5}
            fill="#d8c890"
          />
          <path
            d={arcPath(mArcStart, mArcSpan, 60)}
            fill="none"
            stroke="rgba(216,200,144,0.3)"
            strokeWidth={2}
          />
          {Array.from({ length: 61 }, (_, i) => {
            const a = mArcStart + (i / 60) * mArcSpan;
            const o = clkDeg(a, 60);
            const inn = clkDeg(a, i % 5 === 0 ? 54 : 57);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(216,200,144,0.5)"
                strokeWidth={i % 15 === 0 ? 1.3 : 0.4}
              />
            );
          })}
          {[0, 15, 30, 45, 60].map((i) => {
            const a = mArcStart + (i / 60) * mArcSpan;
            const p = clkDeg(a, 70);
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 2}
                textAnchor="middle"
                fill="rgba(216,200,144,0.85)"
                fontSize={6.5}
                fontWeight="bold"
              >
                {i}
              </text>
            );
          })}
          <text
            x={clkDeg(mArcStart + mArcSpan / 2, 80).x}
            y={clkDeg(mArcStart + mArcSpan / 2, 80).y}
            textAnchor="middle"
            fill="rgba(216,200,144,0.5)"
            fontSize={4.5}
            letterSpacing="0.15em"
          >
            MINUTES
          </text>
          <line
            x1={95}
            y1={95}
            x2={clkDeg(mHandAngle, 56).x}
            y2={clkDeg(mHandAngle, 56).y}
            stroke="#d8c890"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle
            cx={clkDeg(mHandAngle, 56).x}
            cy={clkDeg(mHandAngle, 56).y}
            r={1.5}
            fill="#d8c890"
          />
          <path
            d={arcPath(sArcStart, sArcSpan, 50)}
            fill="none"
            stroke="rgba(216,200,144,0.25)"
            strokeWidth={1.4}
          />
          {Array.from({ length: 13 }, (_, i) => {
            const a = sArcStart + (i / 12) * sArcSpan;
            const o = clkDeg(a, 50);
            const inn = clkDeg(a, i % 3 === 0 ? 45 : 47);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(216,200,144,0.5)"
                strokeWidth={i % 3 === 0 ? 1 : 0.4}
              />
            );
          })}
          <text
            x={95}
            y={170}
            textAnchor="middle"
            fill="rgba(216,200,144,0.5)"
            fontSize={4.5}
            letterSpacing="0.15em"
          >
            SECONDS
          </text>
          <line
            x1={95}
            y1={95}
            x2={clkDeg(sHandAngle, 47).x}
            y2={clkDeg(sHandAngle, 47).y}
            stroke="#ff8030"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={4} fill="#d8c890" />
          <circle cx={95} cy={95} r={2} fill="#1a1612" />
        </svg>
      );
    },
  },

  // ── 21: Sundial ───────────────────────────────────────────────────────────
  {
    name: "Sundial",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ now }: ClockAngles) {
      const hour = now.getHours() + now.getMinutes() / 60;
      const isDay = hour >= 6 && hour <= 18;
      const sunHourAngle = (hour - 12) * 15;
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="sd_stone" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#d8d0c0" />
              <stop offset="100%" stopColor="#7a7260" />
            </radialGradient>
            <radialGradient id="sd_dial" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#e8e0c8" />
              <stop offset="100%" stopColor="#a89878" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={87} fill="rgba(0,0,0,0.4)" />
          <circle cx={95} cy={95} r={86} fill="url(#sd_stone)" />
          <circle cx={95} cy={95} r={82} fill="url(#sd_dial)" />
          {Array.from({ length: 28 }, (_, i) => {
            const ang = (i * 137.5) % 360;
            const rad = 25 + ((i * 41) % 55);
            const p = clkDeg(ang, rad);
            const sz = (i % 3) * 0.6 + 0.7;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={sz}
                fill={`rgba(${90 + (i % 50)},${80 + (i % 40)},${60 + (i % 30)},${0.18 + (i % 5) * 0.04})`}
              />
            );
          })}
          {Array.from({ length: 13 }, (_, i) => {
            const a = (i - 6) * 15;
            const o = clkDeg(180 + a, 78);
            const inn = clkDeg(180 + a, 22);
            return (
              <line
                key={i}
                x1={inn.x}
                y1={inn.y}
                x2={o.x}
                y2={o.y}
                stroke="#3a2818"
                strokeWidth={i === 6 ? 1.8 : i % 3 === 0 ? 1.4 : 0.8}
              />
            );
          })}
          {Array.from({ length: 13 }, (_, i) => {
            if (i === 6) return null;
            const a = (i - 6) * 15;
            const p = clkDeg(180 + a, 70);
            const h = i + 6;
            const display = h <= 12 ? h : h - 12;
            const roman = [
              "VI",
              "VII",
              "VIII",
              "IX",
              "X",
              "XI",
              "XII",
              "I",
              "II",
              "III",
              "IV",
              "V",
            ][
              display === 0
                ? 6
                : display === 12
                  ? 6
                  : h <= 12
                    ? display
                    : display
            ];
            const finalRoman =
              h === 12
                ? "XII"
                : h < 12
                  ? ["VI", "VII", "VIII", "IX", "X", "XI"][i]
                  : ["I", "II", "III", "IV", "V", "VI"][i - 7];
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 2.5}
                textAnchor="middle"
                fill="#2a1810"
                fontSize={7}
                fontFamily="serif"
                fontWeight="bold"
              >
                {finalRoman ?? roman}
              </text>
            );
          })}
          {isDay &&
            (() => {
              const shadowAngle = 180 + sunHourAngle;
              const tip = clkDeg(shadowAngle, 70);
              const baseLeft = clkDeg(shadowAngle - 90, 4, 95, 95);
              const baseRight = clkDeg(shadowAngle + 90, 4, 95, 95);
              return (
                <polygon
                  points={`${baseLeft.x},${baseLeft.y} ${tip.x},${tip.y} ${baseRight.x},${baseRight.y}`}
                  fill="rgba(0,0,0,0.5)"
                />
              );
            })()}
          <polygon
            points="91,95 99,95 95,30"
            fill="#3a2818"
            stroke="#1a0808"
            strokeWidth={0.8}
          />
          <polygon points="91,95 95,30 95,95" fill="rgba(255,240,200,0.18)" />
          <polygon points="95,30 99,95 95,95" fill="rgba(0,0,0,0.25)" />
          <circle cx={95} cy={95} r={4} fill="#3a2818" />
          <circle cx={95} cy={95} r={2} fill="#1a0808" />
          <text
            x={95}
            y={170}
            textAnchor="middle"
            fill="#2a1810"
            fontSize={5}
            letterSpacing="0.25em"
            fontFamily="serif"
            fontWeight="bold"
          >
            SOLARIUM · TEMPUS FUGIT
          </text>
          <text
            x={95}
            y={28}
            textAnchor="middle"
            fill="rgba(42,24,16,0.55)"
            fontSize={6}
            letterSpacing="0.2em"
            fontWeight="bold"
          >
            N
          </text>
        </svg>
      );
    },
  },

  // ── 22: Yacht Timer (Regatta) ─────────────────────────────────────────────
  {
    name: "Yacht Timer",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const totalSec = now.getMinutes() * 60 + now.getSeconds();
      const cdPos = totalSec % 300;
      const cdRem = 300 - cdPos;
      const sectorColors: readonly string[] = [
        "#d83020",
        "#e88030",
        "#f0c040",
        "#80c050",
        "#308040",
      ];
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="yt_dial" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#fafaf6" />
              <stop offset="100%" stopColor="#c8c4b8" />
            </radialGradient>
            <radialGradient id="yt_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#e8c060" />
              <stop offset="100%" stopColor="#7a5410" />
            </radialGradient>
          </defs>
          <circle cx={95} cy={97} r={R + 4} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 3} fill="url(#yt_case)" />
          <circle cx={95} cy={95} r={R} fill="url(#yt_dial)" />
          {sectorColors.map((color, i) => {
            const startA = (i / 5) * 360;
            const endA = ((i + 1) / 5) * 360;
            const startP = clkDeg(startA, R);
            const endP = clkDeg(endA, R);
            const innerStartP = clkDeg(startA, R - 9);
            const innerEndP = clkDeg(endA, R - 9);
            return (
              <path
                key={i}
                d={`M ${startP.x} ${startP.y} A ${R} ${R} 0 0 1 ${endP.x} ${endP.y} L ${innerEndP.x} ${innerEndP.y} A ${R - 9} ${R - 9} 0 0 0 ${innerStartP.x} ${innerStartP.y} Z`}
                fill={color}
                opacity={0.9}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={0.5}
              />
            );
          })}
          {[5, 4, 3, 2, 1].map((n, i) => {
            const a = (i / 5) * 360 + 36;
            const p = d(a, R - 4);
            return (
              <text
                key={n}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fill="#fff"
                fontSize={9}
                fontWeight="bold"
                style={{ textShadow: "0 0 2px rgba(0,0,0,0.5)" }}
              >
                {n}
              </text>
            );
          })}
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * 360;
            const maj = i % 5 === 0;
            const o = d(a, R - 14);
            const inn = d(a, maj ? R - 22 : R - 17);
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={inn.x}
                y2={inn.y}
                stroke="rgba(58,40,20,0.7)"
                strokeWidth={maj ? 1.2 : 0.5}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 360;
            const p = d(a, R - 30);
            const num = i === 0 ? 12 : i;
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fill="rgba(58,40,20,0.92)"
                fontSize={9}
                fontWeight="bold"
                fontFamily="serif"
              >
                {num}
              </text>
            );
          })}
          <line
            x1={d((cdPos / 300) * 360, R - 32).x}
            y1={d((cdPos / 300) * 360, R - 32).y}
            x2={d((cdPos / 300) * 360, R - 9).x}
            y2={d((cdPos / 300) * 360, R - 9).y}
            stroke="#0a4a8a"
            strokeWidth={2.8}
            strokeLinecap="round"
          />
          <polygon
            points={`${d((cdPos / 300) * 360, R - 7).x},${d((cdPos / 300) * 360, R - 7).y} ${clkDeg((cdPos / 300) * 360 - 5, R - 14).x},${clkDeg((cdPos / 300) * 360 - 5, R - 14).y} ${clkDeg((cdPos / 300) * 360 + 5, R - 14).x},${clkDeg((cdPos / 300) * 360 + 5, R - 14).y}`}
            fill="#0a4a8a"
          />
          <rect
            x={66}
            y={132}
            width={58}
            height={18}
            rx={3}
            fill="#0a1a2a"
            stroke="#0a4a8a"
            strokeWidth={0.8}
          />
          <text
            x={95}
            y={146}
            textAnchor="middle"
            fill="#80c0ff"
            fontSize={12}
            fontFamily="'Courier New',monospace"
            fontWeight="bold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {Math.floor(cdRem / 60)}:{padZ(cdRem % 60)}
          </text>
          <text
            x={95}
            y={160}
            textAnchor="middle"
            fill="rgba(58,40,20,0.5)"
            fontSize={4.5}
            letterSpacing="0.18em"
            fontWeight="bold"
          >
            REGATTA · 5 MIN
          </text>
          <line
            x1={d(hrAngle + 180, 8).x}
            y1={d(hrAngle + 180, 8).y}
            x2={d(hrAngle, 38).x}
            y2={d(hrAngle, 38).y}
            stroke="rgba(40,30,15,0.95)"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <line
            x1={d(minAngle + 180, 10).x}
            y1={d(minAngle + 180, 10).y}
            x2={d(minAngle, 56).x}
            y2={d(minAngle, 56).y}
            stroke="rgba(40,30,15,0.9)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={d(secAngle + 180, 12).x}
            y1={d(secAngle + 180, 12).y}
            x2={d(secAngle, 60).x}
            y2={d(secAngle, 60).y}
            stroke="#0a4a8a"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={95} cy={95} r={4} fill="#0a4a8a" />
          <circle cx={95} cy={95} r={2} fill="#e8c060" />
        </svg>
      );
    },
  },

  // ── 23: Solar System (Planetarium) ────────────────────────────────────────
  {
    name: "Planetarium",
    caseA: "",
    caseB: "",
    bezel: "",
    dialA: "",
    dialB: "",
    marker: "",
    markerType: "rect",
    hrColor: "",
    minColor: "",
    secColor: "",
    majTick: "",
    minTick: "",
    render({ hrAngle, minAngle, secAngle, now }: ClockAngles) {
      const d = (a: number, r: number) => clkDeg(a, r);
      const R = 84;
      const totalSec =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const dayProgress = totalSec / 86400;
      const stars: Array<[number, number, number]> = [];
      for (let i = 0; i < 45; i++) {
        const x = ((i * 47) % 170) + 10;
        const y = ((i * 89) % 170) + 10;
        const dx = x - 95,
          dy = y - 95;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 16 && dist < 80) stars.push([x, y, (i % 4) * 0.25 + 0.4]);
      }
      const mercA = secAngle;
      const venusA = minAngle;
      const earthA = hrAngle;
      const marsA =
        (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * 360;
      const jupA = dayProgress * 360;
      const earthP = d(earthA, 40);
      const moonP = clkDeg((secAngle * 6) % 360, 6, earthP.x, earthP.y);
      const jupP = d(jupA, 70);
      return (
        <svg viewBox="0 0 190 190" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="sl_bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#1a0a2a" />
              <stop offset="60%" stopColor="#080418" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="sl_sun" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#fff8a0" />
              <stop offset="50%" stopColor="#ffaa20" />
              <stop offset="100%" stopColor="#cc4400" />
            </radialGradient>
            <radialGradient id="sl_case" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#5a4870" />
              <stop offset="100%" stopColor="#1a1028" />
            </radialGradient>
            <filter id="sl_glow">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <filter id="sl_starblur">
              <feGaussianBlur stdDeviation="0.4" />
            </filter>
          </defs>
          <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.5)" />
          <circle cx={95} cy={95} r={R + 2} fill="url(#sl_case)" />
          <circle cx={95} cy={95} r={R} fill="url(#sl_bg)" />
          {stars.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="rgba(255,255,255,0.7)"
              filter="url(#sl_starblur)"
            />
          ))}
          {[18, 28, 40, 54, 70].map((r, i) => (
            <circle
              key={i}
              cx={95}
              cy={95}
              r={r}
              fill="none"
              stroke="rgba(180,140,255,0.2)"
              strokeWidth={0.6}
              strokeDasharray={i === 0 ? "" : "1,2"}
            />
          ))}
          <circle
            cx={95}
            cy={95}
            r={14}
            fill="url(#sl_sun)"
            filter="url(#sl_glow)"
            opacity={0.55}
          />
          <circle cx={95} cy={95} r={9} fill="url(#sl_sun)" />
          <circle cx={95} cy={95} r={6} fill="#fff8c0" />
          {(() => {
            const p = d(mercA, 18);
            return (
              <g>
                <circle cx={p.x} cy={p.y} r={1.8} fill="#a08070" />
              </g>
            );
          })()}
          {(() => {
            const p = d(venusA, 28);
            return (
              <g>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill="#e8c080"
                  filter="url(#sl_glow)"
                  opacity={0.5}
                />
                <circle cx={p.x} cy={p.y} r={2.4} fill="#e8c080" />
              </g>
            );
          })()}
          <g>
            <circle cx={earthP.x} cy={earthP.y} r={3.2} fill="#3060a0" />
            <ellipse
              cx={earthP.x - 1}
              cy={earthP.y - 0.5}
              rx={1.3}
              ry={0.9}
              fill="#40a050"
            />
            <ellipse
              cx={earthP.x + 0.5}
              cy={earthP.y + 1}
              rx={1}
              ry={0.6}
              fill="#40a050"
            />
            <circle cx={moonP.x} cy={moonP.y} r={1.1} fill="#d8d8d0" />
          </g>
          {(() => {
            const p = d(marsA, 54);
            return (
              <g>
                <circle cx={p.x} cy={p.y} r={2.6} fill="#c84020" />
                <ellipse
                  cx={p.x - 0.5}
                  cy={p.y - 0.3}
                  rx={0.8}
                  ry={0.5}
                  fill="rgba(255,200,180,0.4)"
                />
              </g>
            );
          })()}
          <g>
            <circle cx={jupP.x} cy={jupP.y} r={5} fill="#d8a060" />
            <ellipse
              cx={jupP.x}
              cy={jupP.y - 0.8}
              rx={5}
              ry={0.5}
              fill="rgba(120,80,40,0.55)"
            />
            <ellipse
              cx={jupP.x}
              cy={jupP.y + 0.8}
              rx={5}
              ry={0.5}
              fill="rgba(120,80,40,0.45)"
            />
            <ellipse
              cx={jupP.x - 1}
              cy={jupP.y + 0.5}
              rx={1.2}
              ry={0.6}
              fill="rgba(220,120,60,0.7)"
            />
            <ellipse
              cx={jupP.x}
              cy={jupP.y}
              rx={7}
              ry={1.2}
              fill="none"
              stroke="rgba(220,180,100,0.4)"
              strokeWidth={0.4}
              transform={`rotate(${jupA - 20},${jupP.x},${jupP.y})`}
            />
          </g>
          <g opacity={0.32}>
            <circle cx={155} cy={28} r={1} fill="rgba(180,200,255,0.7)" />
            <circle cx={163} cy={32} r={1.2} fill="rgba(180,200,255,0.7)" />
            <circle cx={170} cy={38} r={1} fill="rgba(180,200,255,0.7)" />
            <circle cx={175} cy={48} r={1.3} fill="rgba(180,200,255,0.7)" />
            <line
              x1={155}
              y1={28}
              x2={163}
              y2={32}
              stroke="rgba(180,200,255,0.4)"
              strokeWidth={0.3}
            />
            <line
              x1={163}
              y1={32}
              x2={170}
              y2={38}
              stroke="rgba(180,200,255,0.4)"
              strokeWidth={0.3}
            />
            <line
              x1={170}
              y1={38}
              x2={175}
              y2={48}
              stroke="rgba(180,200,255,0.4)"
              strokeWidth={0.3}
            />
          </g>
          <text
            x={95}
            y={165}
            textAnchor="middle"
            fill="rgba(180,140,255,0.55)"
            fontSize={5.5}
            letterSpacing="0.2em"
            fontWeight="bold"
          >
            DIES · {String(Math.floor(dayProgress * 100)).padStart(2, "0")}%
          </text>
        </svg>
      );
    },
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function RelogioApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();
  const notify = useNotify();

  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<TabId>("clock");
  const [now, setNow] = useState(() => new Date());
  const [clockStyle, setClockStyle] = useState(0);

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
  );

  // ── Stopwatch ──
  const [swBase, setSwBase] = useState(0);
  const [swStartedAt, setSwStartedAt] = useState<number | null>(null);
  const [swRunning, setSwRunning] = useState(false);
  const [swLaps, setSwLaps] = useState<number[]>([]);

  // ── Timer ──
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerBase, setTimerBase] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [timerCustomInput, setTimerCustomInput] = useState("");

  // ── Alarms ──
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [alarmModal, setAlarmModal] = useState<{
    isEdit: boolean;
    alarm: Alarm;
  } | null>(null);
  const firedAlarmsRef = useRef(new Set<string>());

  // ── Pomodoro ──
  const [pomoCfg, setPomoCfg] = useState<PomoCfg>(DEFAULT_POMO_CFG);
  const [pomoMode, setPomoMode] = useState<PomoMode>("focus");
  const [pomoBase, setPomoBase] = useState(DEFAULT_POMO_CFG.focusMin * 60);
  const [pomoStartedAt, setPomoStartedAt] = useState<number | null>(null);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoCycles, setPomoCycles] = useState(0);
  const [pomoSettingsOpen, setPomoSettingsOpen] = useState(false);
  const pomoSessionStartRef = useRef<Date | null>(null);

  const pomoModeRef = useRef<PomoMode>("focus");
  const pomoCfgRef = useRef<PomoCfg>(DEFAULT_POMO_CFG);
  const pomoCyclesRef = useRef(0);
  pomoModeRef.current = pomoMode;
  pomoCfgRef.current = pomoCfg;
  pomoCyclesRef.current = pomoCycles;

  // ── World Clocks ──
  const [worldClocks, setWorldClocks] =
    useState<WorldClock[]>(DEFAULT_WORLD_CLOCKS);
  const [worldSearch, setWorldSearch] = useState("");

  const prefsLoaded = useRef(false);

  // ── Browser limit warning ──
  const [browserWarnOpen, setBrowserWarnOpen] = useState(false);

  // ─── DB: load alarms ───────────────────────────────────────────────────────

  const loadAlarms = useCallback(async () => {
    if (!drivers?.data || !userId || !companyId) return;
    const { data } = await drivers.data
      .from("alarms")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("time");
    if (data) {
      setAlarms(
        (data as Record<string, unknown>[]).map((r) => ({
          id: r["id"] as string,
          title: r["title"] as string,
          time: r["time"] as string,
          repeat_days: (r["repeat_days"] ?? []) as number[],
          is_enabled: r["is_enabled"] as boolean,
          last_triggered_at: (r["last_triggered_at"] as string | null) ?? null,
        })),
      );
    }
  }, [drivers, userId, companyId]);

  const loadPrefs = useCallback(async () => {
    if (!drivers?.data || !userId || !companyId || prefsLoaded.current) return;
    const { data } = await drivers.data
      .from("clock_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!data) return;
    prefsLoaded.current = true;
    const cfg: PomoCfg = {
      focusMin: (data.pomodoro_focus_minutes as number) ?? 25,
      shortBreakMin: (data.pomodoro_short_break_minutes as number) ?? 5,
      longBreakMin: (data.pomodoro_long_break_minutes as number) ?? 15,
      cyclesBeforeLong: (data.pomodoro_cycles_before_long as number) ?? 4,
    };
    setPomoCfg(cfg);
    setPomoBase(cfg.focusMin * 60);
    const wc = data.world_clocks as string | null;
    if (wc && wc !== "[]") {
      try {
        setWorldClocks(JSON.parse(wc) as WorldClock[]);
      } catch {
        /* keep default */
      }
    }
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadAlarms();
    void loadPrefs();
  }, [loadAlarms, loadPrefs]);

  const savePrefs = useCallback(
    (cfg: PomoCfg, wc?: WorldClock[]) => {
      if (!drivers?.data || !userId || !companyId) return;
      void drivers.data.from("clock_preferences").upsert(
        {
          user_id: userId,
          company_id: companyId,
          pomodoro_focus_minutes: cfg.focusMin,
          pomodoro_short_break_minutes: cfg.shortBreakMin,
          pomodoro_long_break_minutes: cfg.longBreakMin,
          pomodoro_cycles_before_long: cfg.cyclesBeforeLong,
          world_clocks: JSON.stringify(wc ?? worldClocks),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,company_id" },
      );
    },
    [drivers, userId, companyId, worldClocks],
  );

  function savePomoSession(
    mode: PomoMode,
    startedAt: Date,
    cfg: PomoCfg,
    cycles: number,
  ) {
    if (!drivers?.data || !userId || !companyId) return;
    void drivers.data.from("pomodoro_sessions").insert({
      user_id: userId,
      company_id: companyId,
      mode,
      focus_minutes: cfg.focusMin,
      short_break_minutes: cfg.shortBreakMin,
      long_break_minutes: cfg.longBreakMin,
      cycles_completed: cycles,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
    });
  }

  // ─── Main tick ────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 100);
    return () => clearInterval(id);
  }, []);

  // ─── Timer done check ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!timerRunning || timerStartedAt === null || timerDone) return;
    const elapsed = Math.floor((now.getTime() - timerStartedAt) / 1000);
    if (elapsed < timerBase) return;
    setTimerRunning(false);
    setTimerStartedAt(null);
    setTimerBase(0);
    setTimerDone(true);
    playDoneSound();
    sendNotif("Timer concluído", "Seu timer chegou ao fim!");
    void notify({
      type: "info",
      title: "Timer concluído",
      body: "Seu timer chegou ao fim!",
      source_app: "relogio",
    });
  }, [now, timerRunning, timerStartedAt, timerBase, timerDone, notify]);

  // ─── Pomodoro done check ──────────────────────────────────────────────────

  useEffect(() => {
    if (!pomoRunning || pomoStartedAt === null) return;
    const elapsed = Math.floor((now.getTime() - pomoStartedAt) / 1000);
    if (elapsed < pomoBase) return;
    const mode = pomoModeRef.current;
    const cfg = pomoCfgRef.current;
    const cycles = pomoCyclesRef.current;
    const startedAt =
      pomoSessionStartRef.current ?? new Date(now.getTime() - pomoBase * 1000);
    const newCycles = mode === "focus" ? cycles + 1 : cycles;
    const isLong =
      mode === "focus" &&
      newCycles > 0 &&
      newCycles % cfg.cyclesBeforeLong === 0;
    const nextMode: PomoMode =
      mode === "focus" ? (isLong ? "long" : "short") : "focus";
    const nextSec =
      nextMode === "focus"
        ? cfg.focusMin * 60
        : nextMode === "short"
          ? cfg.shortBreakMin * 60
          : cfg.longBreakMin * 60;
    if (mode === "focus") savePomoSession(mode, startedAt, cfg, newCycles);
    setPomoRunning(false);
    setPomoStartedAt(null);
    setPomoCycles(newCycles);
    setPomoMode(nextMode);
    setPomoBase(nextSec);
    pomoSessionStartRef.current = null;
    playPomoSound(nextMode === "focus");
    sendNotif(
      mode === "focus" ? "Foco concluído!" : "Pausa concluída!",
      nextMode === "focus" ? "Hora de focar novamente." : "Hora de descansar!",
    );
  }, [now, pomoRunning, pomoStartedAt, pomoBase]);

  // ─── Alarm check ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (alarms.length === 0 || now.getSeconds() !== 0) return;
    const hhmm = fmtHHMM(now);
    const dayOfWeek = now.getDay();
    const dateStr = now.toDateString();
    alarms.forEach((alarm) => {
      if (!alarm.is_enabled || alarm.time !== hhmm) return;
      const key = `${alarm.id}:${hhmm}:${dateStr}`;
      if (firedAlarmsRef.current.has(key)) return;
      const shouldFire =
        alarm.repeat_days.length === 0 || alarm.repeat_days.includes(dayOfWeek);
      if (!shouldFire) return;
      firedAlarmsRef.current.add(key);
      playAlarmSound();
      sendNotif(`Alarme: ${alarm.title}`, `São ${hhmm}`);
      void notify({
        type: "info",
        title: `Alarme: ${alarm.title}`,
        body: `São ${hhmm}`,
        source_app: "relogio",
        source_id: alarm.id,
      });
      if (drivers?.data && userId && companyId) {
        void drivers.data
          .from("alarms")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", alarm.id);
      }
    });
  }, [now, alarms, drivers, userId, companyId, notify]);

  // ─── Stopwatch ────────────────────────────────────────────────────────────

  function swToggle() {
    if (swRunning) {
      const elapsed = swStartedAt !== null ? Date.now() - swStartedAt : 0;
      setSwBase((b) => b + elapsed);
      setSwStartedAt(null);
    } else {
      setSwStartedAt(Date.now());
    }
    setSwRunning((r) => !r);
  }

  function swReset() {
    setSwBase(0);
    setSwStartedAt(null);
    setSwRunning(false);
    setSwLaps([]);
  }

  function swLap() {
    if (!swRunning) return;
    const elapsed =
      swBase + (swStartedAt !== null ? Date.now() - swStartedAt : 0);
    setSwLaps((laps) => [...laps, elapsed]);
  }

  const swElapsed =
    swRunning && swStartedAt !== null
      ? swBase + (now.getTime() - swStartedAt)
      : swBase;

  const swLapStart: number =
    swLaps.length > 0 ? (swLaps[swLaps.length - 1] ?? 0) : 0;
  const swCurrentLap = swElapsed - swLapStart;

  // ─── Timer ───────────────────────────────────────────────────────────────

  function timerSet(seconds: number) {
    setTimerTotal(seconds);
    setTimerBase(seconds);
    setTimerStartedAt(null);
    setTimerRunning(false);
    setTimerDone(false);
  }

  function timerToggle() {
    if (timerBase === 0 && !timerRunning) return;
    if (timerRunning) {
      const elapsed =
        timerStartedAt !== null
          ? Math.floor((Date.now() - timerStartedAt) / 1000)
          : 0;
      setTimerBase((b) => Math.max(0, b - elapsed));
      setTimerStartedAt(null);
    } else {
      setTimerDone(false);
      setTimerStartedAt(Date.now());
    }
    setTimerRunning((r) => !r);
  }

  function timerReset() {
    setTimerBase(timerTotal);
    setTimerStartedAt(null);
    setTimerRunning(false);
    setTimerDone(false);
  }

  function timerParseCustom(): number {
    const parts = timerCustomInput.split(":").map(Number);
    if (parts.length === 2) {
      const [m, s] = parts;
      return (m ?? 0) * 60 + (s ?? 0);
    }
    if (parts.length === 1) return (parts[0] ?? 0) * 60;
    return 0;
  }

  const timerRemaining =
    timerRunning && timerStartedAt !== null
      ? Math.max(
          0,
          timerBase - Math.floor((now.getTime() - timerStartedAt) / 1000),
        )
      : timerBase;

  const timerProgress = timerTotal > 0 ? 1 - timerRemaining / timerTotal : 0;

  // ─── Alarms ───────────────────────────────────────────────────────────────

  async function alarmSave(form: AlarmForm) {
    if (!drivers?.data || !userId || !companyId) return;
    if (alarmModal?.isEdit) {
      await drivers.data
        .from("alarms")
        .update({
          title: form.title,
          time: form.time,
          repeat_days: form.repeat_days,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alarmModal.alarm.id);
    } else {
      await drivers.data.from("alarms").insert({
        user_id: userId,
        company_id: companyId,
        title: form.title,
        time: form.time,
        repeat_days: form.repeat_days,
        is_enabled: true,
        last_triggered_at: null,
      });
    }
    setAlarmModal(null);
    await loadAlarms();
  }

  async function alarmDelete(id: string) {
    if (!drivers?.data) return;
    await drivers.data.from("alarms").delete().eq("id", id);
    await loadAlarms();
  }

  async function alarmToggle(alarm: Alarm) {
    if (!drivers?.data) return;
    await drivers.data
      .from("alarms")
      .update({
        is_enabled: !alarm.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", alarm.id);
    await loadAlarms();
  }

  async function handleRequestNotif() {
    const perm = await requestNotifPermission();
    setNotifPerm(perm);
  }

  // ─── Pomodoro ────────────────────────────────────────────────────────────

  function pomoToggle() {
    if (pomoRunning) {
      const elapsed =
        pomoStartedAt !== null
          ? Math.floor((Date.now() - pomoStartedAt) / 1000)
          : 0;
      setPomoBase((b) => Math.max(0, b - elapsed));
      setPomoStartedAt(null);
    } else {
      if (pomoSessionStartRef.current === null)
        pomoSessionStartRef.current = new Date();
      setPomoStartedAt(Date.now());
    }
    setPomoRunning((r) => !r);
  }

  function pomoReset() {
    setPomoRunning(false);
    setPomoStartedAt(null);
    setPomoBase(pomoCfg.focusMin * 60);
    setPomoMode("focus");
    setPomoCycles(0);
    pomoSessionStartRef.current = null;
  }

  function pomoSkip() {
    const mode = pomoModeRef.current;
    const cfg = pomoCfgRef.current;
    const cycles = pomoCyclesRef.current;
    const newCycles = mode === "focus" ? cycles + 1 : cycles;
    const isLong =
      mode === "focus" &&
      newCycles > 0 &&
      newCycles % cfg.cyclesBeforeLong === 0;
    const nextMode: PomoMode =
      mode === "focus" ? (isLong ? "long" : "short") : "focus";
    const nextSec =
      nextMode === "focus"
        ? cfg.focusMin * 60
        : nextMode === "short"
          ? cfg.shortBreakMin * 60
          : cfg.longBreakMin * 60;
    setPomoRunning(false);
    setPomoStartedAt(null);
    setPomoCycles(newCycles);
    setPomoMode(nextMode);
    setPomoBase(nextSec);
    pomoSessionStartRef.current = null;
  }

  function pomoSaveCfg(cfg: PomoCfg) {
    setPomoCfg(cfg);
    setPomoBase(cfg.focusMin * 60);
    setPomoMode("focus");
    setPomoCycles(0);
    setPomoRunning(false);
    setPomoStartedAt(null);
    savePrefs(cfg);
  }

  const pomoRemaining =
    pomoRunning && pomoStartedAt !== null
      ? Math.max(
          0,
          pomoBase - Math.floor((now.getTime() - pomoStartedAt) / 1000),
        )
      : pomoBase;

  const pomoTotal =
    pomoMode === "focus"
      ? pomoCfg.focusMin * 60
      : pomoMode === "short"
        ? pomoCfg.shortBreakMin * 60
        : pomoCfg.longBreakMin * 60;

  const pomoProgress = pomoTotal > 0 ? 1 - pomoRemaining / pomoTotal : 0;

  // ─── World Clocks ─────────────────────────────────────────────────────────

  function wcAdd(entry: { city: string; tz: string }) {
    if (worldClocks.some((w) => w.tz === entry.tz && w.city === entry.city))
      return;
    const updated = [...worldClocks, { ...entry, favorite: false }];
    setWorldClocks(updated);
    setWorldSearch("");
    savePrefs(pomoCfg, updated);
  }

  function wcRemove(tz: string, city: string) {
    const updated = worldClocks.filter(
      (w) => !(w.tz === tz && w.city === city),
    );
    setWorldClocks(updated);
    savePrefs(pomoCfg, updated);
  }

  function wcToggleFav(tz: string, city: string) {
    const updated = worldClocks.map((w) =>
      w.tz === tz && w.city === city ? { ...w, favorite: !w.favorite } : w,
    );
    setWorldClocks(updated);
    savePrefs(pomoCfg, updated);
  }

  const tzResults =
    worldSearch.trim().length > 1
      ? ALL_TIMEZONES.filter(
          (t) =>
            t.city.toLowerCase().includes(worldSearch.toLowerCase()) ||
            t.tz.toLowerCase().includes(worldSearch.toLowerCase()),
        ).slice(0, 8)
      : [];

  const sortedWorldClocks = [...worldClocks].sort((a, b) =>
    a.favorite === b.favorite ? 0 : a.favorite ? -1 : 1,
  );

  // ─── Tab definitions ──────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "clock",
      label: "Relógio",
      icon: <Clock size={15} strokeWidth={1.8} />,
    },
    {
      id: "stopwatch",
      label: "Cronômetro",
      icon: <Timer size={15} strokeWidth={1.8} />,
    },
    {
      id: "timer",
      label: "Timer",
      icon: <Hourglass size={15} strokeWidth={1.8} />,
    },
    {
      id: "alarm",
      label: "Despertador",
      icon: <AlarmClock size={15} strokeWidth={1.8} />,
    },
    {
      id: "pomodoro",
      label: "Pomodoro",
      icon: <Coffee size={15} strokeWidth={1.8} />,
    },
    {
      id: "worldclock",
      label: "Fusos",
      icon: <Globe size={15} strokeWidth={1.8} />,
    },
  ];

  const activeTab = TABS.find((t) => t.id === tab);

  // ─── Tab renders ──────────────────────────────────────────────────────────

  function ClockTab() {
    const ms = now.getTime() % 1000;
    const secSmooth = now.getSeconds() + ms / 1000;
    const minSmooth = now.getMinutes() + secSmooth / 60;
    const hrSmooth = (now.getHours() % 12) + minSmooth / 60;
    const secAngle = (secSmooth / 60) * 360;
    const minAngle = (minSmooth / 60) * 360;
    const hrAngle = (hrSmooth / 12) * 360;

    const st = CLOCK_STYLES[clockStyle] ?? CLOCK_STYLES[0];
    if (!st) return null;
    const R = 84;
    const deg = (d: number, r: number) => ({
      x: 95 + r * Math.sin((d * Math.PI) / 180),
      y: 95 - r * Math.cos((d * Math.PI) / 180),
    });
    const angles: ClockAngles = { hrAngle, minAngle, secAngle, now };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          paddingBottom: 8,
        }}
      >
        {/* Analog SVG clock */}
        <div style={{ width: 240, height: 240, flexShrink: 0 }}>
          {st.render ? (
            st.render(angles)
          ) : (
            <svg
              viewBox="0 0 190 190"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <radialGradient id="clkDialBg" cx="45%" cy="35%">
                  <stop offset="0%" stopColor={st.dialA} />
                  <stop offset="100%" stopColor={st.dialB} />
                </radialGradient>
                <radialGradient id="clkCaseGrad" cx="38%" cy="28%">
                  <stop offset="0%" stopColor={st.caseA} />
                  <stop offset="100%" stopColor={st.caseB} />
                </radialGradient>
              </defs>
              {/* Case shadow */}
              <circle cx={95} cy={97} r={R + 3} fill="rgba(0,0,0,0.4)" />
              {/* Case */}
              <circle cx={95} cy={95} r={R + 2} fill="url(#clkCaseGrad)" />
              {/* Bezel ring */}
              <circle cx={95} cy={95} r={R} fill={st.bezel} />
              {/* Minute ticks */}
              {Array.from({ length: 60 }, (_, i) => {
                const a = (i / 60) * 360;
                const maj = i % 5 === 0;
                const outer = deg(a, R - 1);
                const inner = deg(a, maj ? R - 10 : R - 6);
                return (
                  <line
                    key={i}
                    x1={outer.x}
                    y1={outer.y}
                    x2={inner.x}
                    y2={inner.y}
                    stroke={maj ? st.majTick : st.minTick}
                    strokeWidth={maj ? 1.8 : 0.9}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Dial face */}
              <circle cx={95} cy={95} r={R - 12} fill="url(#clkDialBg)" />
              {/* Hour markers */}
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * 360;
                const p = deg(a, R - 20);
                return (
                  <g key={i} transform={`rotate(${a}, ${p.x}, ${p.y})`}>
                    {st.markerType === "dot" ? (
                      <circle cx={p.x} cy={p.y} r={3.5} fill={st.marker} />
                    ) : (
                      <rect
                        x={p.x - 3}
                        y={p.y - 8}
                        width={6}
                        height={14}
                        rx={1.5}
                        fill={st.marker}
                      />
                    )}
                  </g>
                );
              })}
              {/* Hour hand */}
              <line
                x1={deg(hrAngle + 180, 10).x}
                y1={deg(hrAngle + 180, 10).y}
                x2={deg(hrAngle, 46).x}
                y2={deg(hrAngle, 46).y}
                stroke={st.hrColor}
                strokeWidth={5}
                strokeLinecap="round"
              />
              {/* Minute hand */}
              <line
                x1={deg(minAngle + 180, 12).x}
                y1={deg(minAngle + 180, 12).y}
                x2={deg(minAngle, 63).x}
                y2={deg(minAngle, 63).y}
                stroke={st.minColor}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              {/* Seconds hand */}
              <line
                x1={deg(secAngle + 180, 18).x}
                y1={deg(secAngle + 180, 18).y}
                x2={deg(secAngle, 68).x}
                y2={deg(secAngle, 68).y}
                stroke={st.secColor}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              {/* Center cap */}
              <circle cx={95} cy={95} r={5} fill={st.secColor} />
              <circle cx={95} cy={95} r={2} fill={st.hrColor} />
            </svg>
          )}
        </div>

        {/* Style navigator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              aria-label="Estilo anterior"
              onClick={() =>
                setClockStyle(
                  (clockStyle - 1 + CLOCK_STYLES.length) % CLOCK_STYLES.length,
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
            >
              <ChevronLeft size={14} />
            </button>

            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {CLOCK_STYLES.map((s, i) => (
                <button
                  key={i}
                  aria-label={s.name}
                  onClick={() => setClockStyle(i)}
                  style={{
                    width: i === clockStyle ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: "none",
                    cursor: "pointer",
                    background:
                      i === clockStyle
                        ? "var(--text-primary)"
                        : "rgba(255,255,255,0.22)",
                    transition: "all 200ms ease",
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            <button
              aria-label="Próximo estilo"
              onClick={() =>
                setClockStyle((clockStyle + 1) % CLOCK_STYLES.length)
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {st.name}
          </span>
        </div>

        {!st.hideDigital && (
          <>
            {/* Digital time */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 1,
                lineHeight: 1,
                marginTop: 12,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 200,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--text-primary)",
                }}
              >
                {padZ(now.getHours())}:{padZ(now.getMinutes())}
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 300,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 2,
                  color: "var(--text-secondary)",
                }}
              >
                :{padZ(now.getSeconds())}
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginTop: 10,
                fontWeight: 400,
              }}
            >
              {fmtDate(now)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </>
        )}
      </div>
    );
  }

  function StopwatchTab() {
    const lapTimes = swLaps.map((lap, i) => ({
      lap: i + 1,
      elapsed: lap,
      delta: i === 0 ? lap : lap - (swLaps[i - 1] ?? 0),
    }));
    const minLap =
      lapTimes.length > 1 ? Math.min(...lapTimes.map((l) => l.delta)) : -1;
    const maxLap =
      lapTimes.length > 1 ? Math.max(...lapTimes.map((l) => l.delta)) : -1;

    const totalCs = Math.floor(swElapsed / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 1,
            lineHeight: 1,
            marginBottom: swLaps.length > 0 ? 8 : 32,
          }}
        >
          <span
            style={{
              fontSize: 76,
              fontWeight: 200,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              color: swRunning
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              transition: "color 200ms",
            }}
          >
            {padZ(min)}:{padZ(sec)}
          </span>
          <span
            style={{
              fontSize: 38,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              marginBottom: 4,
              color: swRunning ? "#6366f1" : "rgba(99,102,241,0.45)",
              transition: "color 200ms",
            }}
          >
            .{padZ(cs)}
          </span>
        </div>

        {swLaps.length > 0 && (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
              marginBottom: 28,
            }}
          >
            Volta atual: {fmtMs(swCurrentLap)}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 36,
          }}
        >
          <button
            type="button"
            onClick={swLap}
            disabled={!swRunning}
            aria-label="Marcar volta"
            style={{
              ...BTN,
              width: 52,
              height: 52,
              borderRadius: "50%",
              padding: 0,
              background: swRunning
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.03)",
              color: swRunning
                ? "var(--text-secondary)"
                : "var(--text-tertiary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <Flag size={16} />
          </button>
          <button
            type="button"
            onClick={swToggle}
            aria-label={
              swRunning ? "Pausar" : swElapsed > 0 ? "Continuar" : "Iniciar"
            }
            style={{
              ...BTN,
              width: 72,
              height: 72,
              borderRadius: "50%",
              padding: 0,
              background: swRunning ? "rgba(239,68,68,0.18)" : "#6366f1",
              color: swRunning ? "#f87171" : "#fff",
              border: swRunning ? "1px solid rgba(239,68,68,0.25)" : "none",
              boxShadow: swRunning ? "none" : "0 0 0 5px rgba(99,102,241,0.15)",
              transition: "all 150ms",
            }}
          >
            {swRunning ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button
            type="button"
            onClick={swReset}
            disabled={swRunning}
            aria-label="Zerar cronômetro"
            style={{
              ...BTN,
              width: 52,
              height: 52,
              borderRadius: "50%",
              padding: 0,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {lapTimes.length > 0 && (
          <div style={{ maxWidth: 480, width: "100%", textAlign: "left" }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Voltas ({lapTimes.length})
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column-reverse",
                gap: 3,
              }}
            >
              {lapTimes.map((l) => {
                const isBest = l.delta === minLap && lapTimes.length > 1;
                const isWorst = l.delta === maxLap && lapTimes.length > 1;
                return (
                  <div
                    key={l.lap}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isBest
                        ? "rgba(34,197,94,0.07)"
                        : isWorst
                          ? "rgba(239,68,68,0.07)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isBest ? "rgba(34,197,94,0.18)" : isWorst ? "rgba(239,68,68,0.13)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        width: 56,
                      }}
                    >
                      Volta {l.lap}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontVariantNumeric: "tabular-nums",
                        color: isBest
                          ? "#86efac"
                          : isWorst
                            ? "#fca5a5"
                            : "var(--text-secondary)",
                      }}
                    >
                      +{fmtMs(l.delta)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                        width: 90,
                        textAlign: "right",
                      }}
                    >
                      {fmtMs(l.elapsed)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  function TimerTab() {
    const R = 96;
    const SZ = 224;
    const C = SZ / 2;
    const circumference = 2 * Math.PI * R;
    const dash = circumference * (1 - timerProgress);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: 22,
          }}
        >
          <svg width={SZ} height={SZ} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={7}
            />
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={timerDone ? "#22c55e" : "#6366f1"}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              style={{
                transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease",
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 200,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color: timerDone
                  ? "#86efac"
                  : timerRunning
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                transition: "color 300ms",
              }}
            >
              {fmtSec(timerRemaining)}
            </div>
            {timerDone && (
              <div
                style={{
                  fontSize: 12,
                  color: "#86efac",
                  marginTop: 6,
                  fontWeight: 500,
                }}
              >
                Concluído!
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {TIMER_PRESETS.map((min) => (
            <button
              type="button"
              key={min}
              onClick={() => timerSet(min * 60)}
              style={{
                ...BTN,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                background:
                  timerTotal === min * 60
                    ? "rgba(99,102,241,0.22)"
                    : "rgba(255,255,255,0.05)",
                color:
                  timerTotal === min * 60 ? "#a5b4fc" : "var(--text-secondary)",
                border:
                  timerTotal === min * 60
                    ? "1px solid rgba(99,102,241,0.38)"
                    : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {min}min
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 22,
            maxWidth: 260,
            width: "100%",
          }}
        >
          <input
            value={timerCustomInput}
            onChange={(e) => setTimerCustomInput(e.target.value)}
            placeholder="MM:SS ou minutos"
            style={{ ...INPUT, textAlign: "center", fontSize: 13, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => {
              const s = timerParseCustom();
              if (s > 0) timerSet(s);
            }}
            style={{
              ...BTN,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: "#6366f1",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            OK
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={timerReset}
            disabled={timerTotal === 0}
            aria-label="Reiniciar timer"
            style={{
              ...BTN,
              width: 52,
              height: 52,
              borderRadius: "50%",
              padding: 0,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={timerDone ? timerReset : timerToggle}
            disabled={timerBase === 0 && !timerRunning && !timerDone}
            aria-label={
              timerDone ? "Novo timer" : timerRunning ? "Pausar" : "Iniciar"
            }
            style={{
              ...BTN,
              width: 72,
              height: 72,
              borderRadius: "50%",
              padding: 0,
              background: timerDone
                ? "#22c55e"
                : timerRunning
                  ? "rgba(239,68,68,0.18)"
                  : "#6366f1",
              color: timerRunning ? "#f87171" : "#fff",
              border: timerRunning ? "1px solid rgba(239,68,68,0.25)" : "none",
              boxShadow: timerDone
                ? "0 0 0 5px rgba(34,197,94,0.15)"
                : !timerRunning && timerBase > 0
                  ? "0 0 0 5px rgba(99,102,241,0.15)"
                  : "none",
              transition: "all 150ms",
            }}
          >
            {timerDone ? (
              <RotateCcw size={22} />
            ) : timerRunning ? (
              <Pause size={22} />
            ) : (
              <Play size={22} />
            )}
          </button>
        </div>
      </div>
    );
  }

  function AlarmTab() {
    const emptyAlarm: Alarm = {
      id: "",
      title: "Alarme",
      time: fmtHHMM(now),
      repeat_days: [],
      is_enabled: true,
      last_triggered_at: null,
    };

    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Browser limitation notice */}
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 9,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setBrowserWarnOpen((o) => !o)}
            style={{
              ...BTN,
              background: "none",
              padding: 0,
              width: "100%",
              justifyContent: "space-between",
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangle size={13} />
              Alarmes só disparam com o app aberto
            </div>
            {browserWarnOpen ? (
              <ChevronUp size={13} />
            ) : (
              <ChevronDown size={13} />
            )}
          </button>
          {browserWarnOpen && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 10,
                lineHeight: 1.65,
              }}
            >
              <p style={{ margin: "0 0 8px" }}>
                Alarmes web{" "}
                <strong style={{ color: "#fbbf24" }}>
                  só disparam se o app estiver aberto
                </strong>{" "}
                no navegador — é uma limitação estrutural de aplicações web, não
                um bug.
              </p>
              <p style={{ margin: 0 }}>
                Para um despertador nativo, uma versão Electron/mobile está
                planejada para versões futuras do Aethereos.
              </p>
            </div>
          )}
        </div>

        {/* Notification permission */}
        {notifPerm !== "granted" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              marginBottom: 16,
              borderRadius: 8,
              background:
                notifPerm === "denied"
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(99,102,241,0.08)",
              border: `1px solid ${notifPerm === "denied" ? "rgba(239,68,68,0.18)" : "rgba(99,102,241,0.2)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: notifPerm === "denied" ? "#fca5a5" : "#a5b4fc",
              }}
            >
              {notifPerm === "denied" ? (
                <BellOff size={13} />
              ) : (
                <Bell size={13} />
              )}
              {notifPerm === "denied"
                ? "Notificações bloqueadas. Ative nas configurações do site."
                : "Permitir notificações para alertas de alarme"}
            </div>
            {notifPerm !== "denied" && (
              <button
                type="button"
                onClick={() => {
                  void handleRequestNotif();
                }}
                style={{
                  ...BTN,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  background: "#6366f1",
                  color: "#fff",
                }}
              >
                Permitir
              </button>
            )}
          </div>
        )}

        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {alarms.length === 0
              ? "Nenhum alarme"
              : `${alarms.filter((a) => a.is_enabled).length} de ${alarms.length} ativo${alarms.length !== 1 ? "s" : ""}`}
          </span>
          <button
            type="button"
            onClick={() => setAlarmModal({ isEdit: false, alarm: emptyAlarm })}
            style={{
              ...BTN,
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: "#6366f1",
              color: "#fff",
            }}
          >
            <Plus size={13} /> Novo alarme
          </button>
        </div>

        {alarms.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "48px 0 32px",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                marginBottom: 14,
                background: "rgba(99,102,241,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlarmClock size={24} style={{ color: "#6366f1" }} />
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.75)",
                margin: "0 0 6px",
              }}
            >
              Nenhum alarme configurado
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                margin: "0 0 16px",
                lineHeight: 1.6,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              Crie alarmes para ser lembrado de compromissos e horários
              importantes.
            </p>
            <button
              type="button"
              onClick={() =>
                setAlarmModal({ isEdit: false, alarm: emptyAlarm })
              }
              style={{
                ...BTN,
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: "#6366f1",
                color: "#fff",
              }}
            >
              <Plus size={14} /> Novo alarme
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 11,
                  background: alarm.is_enabled
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${alarm.is_enabled ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
                  transition: "all 120ms",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      color: alarm.is_enabled
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                      transition: "color 200ms",
                    }}
                  >
                    {alarm.time}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    {alarm.title}
                    <span
                      style={{ marginLeft: 8, color: "var(--text-tertiary)" }}
                    >
                      {alarm.repeat_days.length > 0
                        ? alarm.repeat_days
                            .map((d) => DAY_NAMES_SHORT[d])
                            .join(", ")
                        : "Uma vez"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    type="button"
                    aria-label="Editar alarme"
                    onClick={() => setAlarmModal({ isEdit: true, alarm })}
                    style={{
                      ...BTN,
                      background: "none",
                      color: "var(--text-tertiary)",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir alarme"
                    onClick={() => {
                      void alarmDelete(alarm.id);
                    }}
                    style={{
                      ...BTN,
                      background: "none",
                      color: "var(--text-tertiary)",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={
                      alarm.is_enabled ? "Desativar alarme" : "Ativar alarme"
                    }
                    onClick={() => {
                      void alarmToggle(alarm);
                    }}
                    style={{
                      ...BTN,
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      padding: 0,
                      position: "relative",
                      background: alarm.is_enabled
                        ? "#6366f1"
                        : "rgba(255,255,255,0.12)",
                      flexShrink: 0,
                      transition: "background 150ms",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 150ms ease",
                        left: alarm.is_enabled ? 21 : 3,
                      }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function PomodoroTab() {
    const color = POMO_COLORS[pomoMode];
    const R = 92;
    const SZ = 208;
    const C = SZ / 2;
    const circumference = 2 * Math.PI * R;
    const dash = circumference * (1 - pomoProgress);
    const cyclesInSet = pomoCycles % pomoCfg.cyclesBeforeLong;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Mode badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 16px",
            borderRadius: 20,
            marginBottom: 20,
            background: `${color}1a`,
            border: `1px solid ${color}45`,
            fontSize: 13,
            fontWeight: 600,
            color,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: color,
              display: "inline-block",
            }}
          />
          {POMO_LABELS[pomoMode]}
        </div>

        {/* Ring */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: 14,
          }}
        >
          <svg width={SZ} height={SZ} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={7}
            />
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              style={{
                transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease",
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 200,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color,
                transition: "color 300ms",
              }}
            >
              {fmtSec(pomoRemaining)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 6,
              }}
            >
              Ciclo {pomoCycles + 1}
            </div>
          </div>
        </div>

        {/* Cycle dots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 6,
          }}
        >
          {Array.from({ length: pomoCfg.cyclesBeforeLong }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                transition: "all 300ms",
                background:
                  i < cyclesInSet ? "#ef4444" : "rgba(255,255,255,0.10)",
                border:
                  i < cyclesInSet ? "none" : "1px solid rgba(255,255,255,0.14)",
                boxShadow:
                  i < cyclesInSet ? "0 0 6px rgba(239,68,68,0.50)" : "none",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 22,
          }}
        >
          {cyclesInSet} de {pomoCfg.cyclesBeforeLong} ciclos · {pomoCycles}{" "}
          sessões totais
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            aria-label="Reiniciar Pomodoro"
            onClick={pomoReset}
            style={{
              ...BTN,
              width: 52,
              height: 52,
              borderRadius: "50%",
              padding: 0,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={pomoToggle}
            aria-label={pomoRunning ? "Pausar" : "Iniciar"}
            style={{
              ...BTN,
              width: 72,
              height: 72,
              borderRadius: "50%",
              padding: 0,
              background: pomoRunning ? "rgba(239,68,68,0.18)" : color,
              color: pomoRunning ? "#f87171" : "#fff",
              border: pomoRunning ? "1px solid rgba(239,68,68,0.25)" : "none",
              boxShadow: pomoRunning
                ? "none"
                : `0 0 0 5px ${color}28, 0 0 22px ${color}22`,
              transition: "all 150ms",
            }}
          >
            {pomoRunning ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button
            type="button"
            aria-label="Pular etapa"
            onClick={pomoSkip}
            style={{
              ...BTN,
              width: 52,
              height: 52,
              borderRadius: "50%",
              padding: 0,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Settings link */}
        <button
          type="button"
          onClick={() => setPomoSettingsOpen(true)}
          style={{
            ...BTN,
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 11,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-tertiary)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Settings size={12} />
          {pomoCfg.focusMin}m foco · {pomoCfg.shortBreakMin}m curta ·{" "}
          {pomoCfg.longBreakMin}m longa
        </button>
      </div>
    );
  }

  function WorldClockTab() {
    return (
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <div
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          >
            <Search size={13} />
          </div>
          <input
            value={worldSearch}
            onChange={(e) => setWorldSearch(e.target.value)}
            placeholder="Buscar cidade ou fuso..."
            style={{ ...INPUT, paddingLeft: 34 }}
          />
          {worldSearch && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setWorldSearch("")}
              style={{
                ...BTN,
                position: "absolute",
                right: 9,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                color: "var(--text-tertiary)",
                padding: 2,
                borderRadius: 4,
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {tzResults.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {tzResults.map((t) => (
              <button
                type="button"
                key={`${t.city}-${t.tz}`}
                onClick={() => wcAdd(t)}
                style={{
                  ...BTN,
                  width: "100%",
                  justifyContent: "space-between",
                  textAlign: "left",
                  padding: "9px 14px",
                  background: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                }}
              >
                <span>{t.city}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {t.tz} · {getTimeInZone(t.tz, now)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sortedWorldClocks.map((wc) => {
            const daytime = isDaytime(wc.tz, now);
            return (
              <div
                key={`${wc.city}-${wc.tz}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: daytime
                      ? "rgba(251,191,36,0.10)"
                      : "rgba(99,102,241,0.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  {daytime ? "☀️" : "🌙"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 300,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        color: "var(--text-primary)",
                      }}
                    >
                      {getTimeInZone(wc.tz, now)}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      {getOffsetLabel(wc.tz, now)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    {wc.city}
                    <span
                      style={{ color: "var(--text-tertiary)", marginLeft: 6 }}
                    >
                      {getDateInZone(wc.tz, now)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    type="button"
                    aria-label={
                      wc.favorite ? "Remover dos favoritos" : "Favoritar"
                    }
                    onClick={() => wcToggleFav(wc.tz, wc.city)}
                    style={{
                      ...BTN,
                      background: "none",
                      padding: 6,
                      borderRadius: 6,
                      color: wc.favorite ? "#fbbf24" : "var(--text-tertiary)",
                    }}
                  >
                    <Star
                      size={14}
                      fill={wc.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${wc.city}`}
                    onClick={() => wcRemove(wc.tz, wc.city)}
                    style={{
                      ...BTN,
                      background: "none",
                      padding: 6,
                      borderRadius: 6,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {worldClocks.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "48px 0 32px",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  marginBottom: 14,
                  background: "rgba(99,102,241,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Globe size={24} style={{ color: "#6366f1" }} />
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  margin: "0 0 6px",
                }}
              >
                Nenhum fuso adicionado
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  margin: 0,
                  lineHeight: 1.6,
                  textAlign: "center",
                  maxWidth: 280,
                }}
              >
                Busque uma cidade acima para acompanhar horários ao redor do
                mundo.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        position: "relative",
        background: "#191d21",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar wrapper — animated width */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <aside style={ASIDE_STYLE}>
          {/* App header */}
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
            <Clock
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
                Relógio
              </span>
            )}
          </div>

          {collapsed ? (
            /* Icon-only nav */
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px 0",
                gap: 2,
                flex: 1,
              }}
            >
              {TABS.map((t) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    onClick={() => setTab(t.id)}
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
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
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
                    {t.icon}
                  </button>
                );
              })}
              {notifPerm !== "granted" && (
                <>
                  <div
                    style={{
                      height: 1,
                      width: 28,
                      background: "rgba(255,255,255,0.08)",
                      margin: "4px 0",
                    }}
                  />
                  <button
                    type="button"
                    title={
                      notifPerm === "denied"
                        ? "Notificações bloqueadas"
                        : "Permitir notificações"
                    }
                    onClick={() => {
                      void handleRequestNotif();
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: notifPerm === "denied" ? "default" : "pointer",
                      flexShrink: 0,
                      border: "1px solid transparent",
                      background: "transparent",
                      color: notifPerm === "denied" ? "#fca5a5" : "#a5b4fc",
                    }}
                  >
                    {notifPerm === "denied" ? (
                      <BellOff size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </button>
                </>
              )}
            </nav>
          ) : (
            /* Expanded */
            <>
              {/* Mini live clock */}
              <div style={{ padding: "0 14px 14px" }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: "var(--text-primary)",
                  }}
                >
                  {padZ(now.getHours())}:{padZ(now.getMinutes())}
                  <span
                    style={{
                      fontSize: 16,
                      color: "var(--text-tertiary)",
                      marginLeft: 2,
                      fontWeight: 600,
                    }}
                  >
                    :{padZ(now.getSeconds())}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 5,
                  }}
                >
                  {DAY_NAMES_SHORT[now.getDay()]}, {now.getDate()} de{" "}
                  {MONTH_NAMES[now.getMonth()]}
                </div>
              </div>

              {/* Nav */}
              <nav style={{ flex: 1, padding: "4px 0 16px 8px" }}>
                {TABS.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        transition:
                          "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
                        marginBottom: 2,
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
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)";
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
                      <span
                        style={{
                          color: "currentColor",
                          flexShrink: 0,
                          display: "flex",
                        }}
                      >
                        {t.icon}
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </nav>

              {/* Notification status */}
              {notifPerm !== "granted" && (
                <div style={{ padding: "8px 10px 12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRequestNotif();
                    }}
                    style={{
                      ...BTN,
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 7,
                      fontSize: 11,
                      border:
                        notifPerm === "denied"
                          ? "1px solid rgba(239,68,68,0.2)"
                          : "1px solid rgba(99,102,241,0.22)",
                      background:
                        notifPerm === "denied"
                          ? "rgba(239,68,68,0.07)"
                          : "rgba(99,102,241,0.08)",
                      color: notifPerm === "denied" ? "#fca5a5" : "#a5b4fc",
                      cursor: notifPerm === "denied" ? "default" : "pointer",
                    }}
                  >
                    {notifPerm === "denied" ? (
                      <BellOff size={11} />
                    ) : (
                      <Bell size={11} />
                    )}
                    {notifPerm === "denied"
                      ? "Notif. bloqueadas"
                      : "Permitir notificações"}
                  </button>
                </div>
              )}
            </>
          )}
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

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Content header */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {
            (
              {
                clock: (
                  <Clock
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
                stopwatch: (
                  <Timer
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
                timer: (
                  <Hourglass
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
                alarm: (
                  <AlarmClock
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
                pomodoro: (
                  <Coffee
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
                worldclock: (
                  <Globe
                    size={14}
                    style={{ color: "#6366f1", flexShrink: 0 }}
                  />
                ),
              } as Record<TabId, React.ReactNode>
            )[tab]
          }
          <h2
            style={{
              margin: "0 12px 0 0",
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            {activeTab?.label}
          </h2>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            padding: "32px 28px 160px",
          }}
        >
          {tab === "clock" && ClockTab()}
          {tab === "stopwatch" && <StopwatchTab />}
          {tab === "timer" && <TimerTab />}
          {tab === "alarm" && <AlarmTab />}
          {tab === "pomodoro" && <PomodoroTab />}
          {tab === "worldclock" && <WorldClockTab />}
        </div>
      </div>

      {/* Modals */}
      {alarmModal && (
        <AlarmModal
          initial={{
            title: alarmModal.alarm.title,
            time: alarmModal.alarm.time,
            repeat_days: alarmModal.alarm.repeat_days,
          }}
          isEdit={alarmModal.isEdit}
          onSave={(f) => {
            void alarmSave(f);
          }}
          onClose={() => setAlarmModal(null)}
        />
      )}
      {pomoSettingsOpen && (
        <PomoSettings
          cfg={pomoCfg}
          onSave={pomoSaveCfg}
          onClose={() => setPomoSettingsOpen(false)}
        />
      )}
    </div>
  );
}
