import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Bell,
  Pencil,
  Trash2,
  Check,
  AlignLeft,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  MONTH_NAMES,
  DAY_HEADERS_SHORT,
  getMonthDays,
  isSameDay,
  todayMidnight,
} from "./calendarUtils";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  date: Date;
  calendarId: string;
  color: string;
  time?: string;
  endTime?: string;
  allDay?: boolean;
  description?: string;
  reminders?: number[];
}

interface CalendarDef {
  id: string;
  label: string;
  color: string;
}

type ViewMode = "month" | "week" | "day";

type ModalState =
  | { type: "create"; date: Date; time?: string }
  | { type: "edit"; event: CalEvent }
  | { type: "detail"; event: CalEvent }
  | { type: "calendarCreate" }
  | { type: "calendarEdit"; calendar: CalendarDef };

// ─── Constants ───────────────────────────────────────────────────────────────

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

const COLOR_PALETTE = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#f97316",
  "#84cc16",
];

const REMINDER_OPTIONS = [
  { value: "", label: "Sem lembrete" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
];

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00–22:00
const HOUR_H = 60; // px per hour in time-grid views
const TODAY = todayMidnight();

// ─── Default calendar seed (created on first use) ─────────────────────────────

const DEFAULT_CALENDARS = [
  { label: "Pessoal", color: "#8b5cf6" },
  { label: "Trabalho", color: "#06b6d4" },
  { label: "Time", color: "#10b981" },
  { label: "Externos", color: "#f59e0b" },
];

// ─── DB row types ─────────────────────────────────────────────────────────────

interface DbCalDef {
  id: string;
  label: string;
  color: string;
}
interface DbCalEvent {
  id: string;
  calendar_def_id: string | null;
  title: string;
  event_date: string;
  time_start: string | null;
  time_end: string | null;
  all_day: boolean;
  description: string | null;
  reminders: number[];
  color: string;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateToInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inputToDate(s: string): Date {
  const parts = s.split("-");
  const y = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "1");
  const d = Number(parts[2] ?? "1");
  return new Date(y, m - 1, d);
}

function timeToMins(t: string): number {
  const parts = t.split(":");
  const h = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "0");
  return h * 60 + m;
}

function getWeekStart(d: Date): Date {
  const day = new Date(d);
  day.setDate(d.getDate() - d.getDay());
  day.setHours(0, 0, 0, 0);
  return day;
}

function uid(): string {
  return crypto.randomUUID();
}

// ─── Shared input style ───────────────────────────────────────────────────────

const INP: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "rgba(255,255,255,0.9)",
  outline: "none",
  boxSizing: "border-box",
  colorScheme: "dark",
  fontFamily: "inherit",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(255,255,255,0.30)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({
  event,
  defaultDate,
  defaultTime,
  calendars,
  onSave,
  onDelete,
  onClose,
}: {
  event: CalEvent | null;
  defaultDate?: Date;
  defaultTime?: string;
  calendars: CalendarDef[];
  onSave: (ev: CalEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = event !== null;
  const [title, setTitle] = useState(event?.title ?? "");
  const [dateVal, setDateVal] = useState(
    event
      ? dateToInput(event.date)
      : defaultDate
        ? dateToInput(defaultDate)
        : dateToInput(TODAY),
  );
  const [timeVal, setTimeVal] = useState(event?.time ?? defaultTime ?? "09:00");
  const [endTimeVal, setEndTimeVal] = useState(event?.endTime ?? "10:00");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [calId, setCalId] = useState(
    event?.calendarId ?? calendars[0]?.id ?? "",
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const [reminders, setReminders] = useState<string[]>(
    event?.reminders?.map(String) ?? [],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calDropOpen, setCalDropOpen] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  const calColor = calendars.find((c) => c.id === calId)?.color ?? "#8b5cf6";
  const calLabel = calendars.find((c) => c.id === calId)?.label ?? "";

  function toggleReminder(val: string) {
    setReminders((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }

  function handleSave() {
    if (!title.trim()) return;
    const built: CalEvent = {
      id: event?.id ?? uid(),
      title: title.trim(),
      date: inputToDate(dateVal),
      calendarId: calId,
      color: calColor,
    };
    if (!allDay) {
      built.time = timeVal;
      built.endTime = endTimeVal;
    }
    if (allDay) built.allDay = true;
    if (description.trim()) built.description = description.trim();
    if (reminders.length > 0) built.reminders = reminders.map(Number);
    onSave(built);
    onClose();
  }

  const dropStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 50,
    background: "#0d1824",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Editar evento" : "Novo evento"}
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 16px",
          background: "#0d1421",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {isEdit ? "Editar evento" : "Novo evento"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.38)",
              display: "flex",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
          onClick={() => setCalDropOpen(false)}
        >
          <div>
            <label style={LABEL}>Título</label>
            <input
              autoFocus
              type="text"
              placeholder="Título do evento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              style={INP}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <label style={LABEL}>Data</label>
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                style={INP}
              />
            </div>
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: allDay
                  ? "rgba(139,92,246,0.18)"
                  : "rgba(255,255,255,0.05)",
                border: allDay
                  ? "1px solid rgba(139,92,246,0.35)"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                fontSize: 12,
                color: allDay ? "#a78bfa" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {allDay && <Check size={12} />}
              Dia todo
            </button>
          </div>

          {!allDay && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label style={LABEL}>Início</label>
                <input
                  type="time"
                  value={timeVal}
                  onChange={(e) => setTimeVal(e.target.value)}
                  style={INP}
                />
              </div>
              <div>
                <label style={LABEL}>Fim</label>
                <input
                  type="time"
                  value={endTimeVal}
                  onChange={(e) => setEndTimeVal(e.target.value)}
                  style={INP}
                />
              </div>
            </div>
          )}

          {/* Calendar — custom dropdown */}
          <div>
            <label style={LABEL}>Calendário</label>
            <div
              style={{ position: "relative" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setCalDropOpen((v) => !v)}
                style={{
                  ...INP,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: calColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                  }}
                >
                  {calLabel}
                </span>
                <ChevronDown
                  size={13}
                  style={{
                    color: "rgba(255,255,255,0.30)",
                    transform: calDropOpen ? "rotate(180deg)" : "none",
                    transition: "transform 150ms",
                  }}
                />
              </button>
              {calDropOpen && (
                <div style={dropStyle}>
                  {calendars.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCalId(c.id);
                        setCalDropOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "9px 12px",
                        background:
                          c.id === calId
                            ? "rgba(255,255,255,0.06)"
                            : "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (c.id !== calId)
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (c.id !== calId)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: c.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{c.label}</span>
                      {c.id === calId && (
                        <Check size={13} style={{ color: "#a78bfa" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reminders — multi-select chips */}
          <div>
            <label style={LABEL}>Lembretes</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REMINDER_OPTIONS.filter((o) => o.value !== "").map((o) => {
                const active = reminders.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleReminder(o.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 11px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      background: active
                        ? "rgba(139,92,246,0.18)"
                        : "rgba(255,255,255,0.05)",
                      border: active
                        ? "1px solid rgba(139,92,246,0.38)"
                        : "1px solid rgba(255,255,255,0.09)",
                      color: active ? "#a78bfa" : "rgba(255,255,255,0.42)",
                      cursor: "pointer",
                      transition:
                        "background 120ms, border-color 120ms, color 120ms",
                    }}
                  >
                    {active && <Check size={10} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
            {reminders.length === 0 && (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.22)",
                }}
              >
                Nenhum lembrete selecionado
              </p>
            )}
          </div>

          <div>
            <label style={LABEL}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas adicionais…"
              rows={3}
              style={{ ...INP, resize: "vertical", minHeight: 70 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {isEdit ? (
            confirmDelete ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(event.id);
                    onClose();
                  }}
                  style={{
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.28)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "rgba(239,68,68,0.65)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Excluir evento
              </button>
            )
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              style={{
                background: "#8b5cf6",
                border: "none",
                borderRadius: 8,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: title.trim() ? "pointer" : "not-allowed",
                opacity: title.trim() ? 1 : 0.4,
              }}
            >
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── CalendarModal ────────────────────────────────────────────────────────────

function CalendarModal({
  calendar,
  onSave,
  onDelete,
  onClose,
}: {
  calendar: CalendarDef | null;
  onSave: (cal: CalendarDef) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(calendar?.label ?? "");
  const [color, setColor] = useState(calendar?.color ?? "#8b5cf6");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function handleSave() {
    if (!label.trim()) return;
    onSave({ id: calendar?.id ?? uid(), label: label.trim(), color });
    onClose();
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={calendar !== null ? "Editar calendário" : "Novo calendário"}
        style={{
          width: "100%",
          maxWidth: 370,
          margin: "0 16px",
          background: "#0d1421",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {calendar !== null ? "Editar calendário" : "Novo calendário"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.38)",
              display: "flex",
              padding: 4,
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <label style={LABEL}>Nome</label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="Nome do calendário"
              style={INP}
            />
          </div>
          <div>
            <label style={LABEL}>Cor</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: c,
                    border:
                      color === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer",
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                    transition: "outline 120ms",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {calendar !== null && onDelete != null ? (
            confirmDelete ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(calendar.id);
                    onClose();
                  }}
                  style={{
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.28)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "rgba(239,68,68,0.65)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Excluir
              </button>
            )
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!label.trim()}
              style={{
                background: color,
                border: "none",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: label.trim() ? "pointer" : "not-allowed",
                opacity: label.trim() ? 1 : 0.4,
              }}
            >
              {calendar !== null ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── EventDetailModal ─────────────────────────────────────────────────────────

function EventDetailModal({
  event,
  calendars,
  onEdit,
  onDelete,
  onClose,
}: {
  event: CalEvent;
  calendars: CalendarDef[];
  onEdit: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const cal = calendars.find((c) => c.id === event.calendarId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.50)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do evento"
        style={{
          width: "100%",
          maxWidth: 400,
          margin: "0 16px",
          background: "#0d1421",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 4, background: event.color }} />
        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1.3,
                flex: 1,
                paddingRight: 12,
              }}
            >
              {event.title}
            </h3>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onEdit}
                aria-label="Editar evento"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 7,
                  padding: "5px 8px",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.50)",
                  display: "flex",
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.38)",
                  display: "flex",
                  padding: 5,
                  borderRadius: 6,
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CalendarDays
                size={14}
                style={{ color: "rgba(255,255,255,0.32)", flexShrink: 0 }}
                strokeWidth={1.8}
              />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>
                {MONTH_NAMES[event.date.getMonth()]} {event.date.getDate()},{" "}
                {event.date.getFullYear()}
                {!event.allDay &&
                  event.time != null &&
                  ` · ${event.time}${event.endTime != null ? ` – ${event.endTime}` : ""}`}
                {event.allDay === true && " · Dia todo"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: event.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>
                {cal?.label ?? "Calendário"}
              </span>
            </div>
            {event.reminders != null && event.reminders.length > 0 && (
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <Bell
                  size={14}
                  style={{
                    color: "rgba(255,255,255,0.32)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  strokeWidth={1.8}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {event.reminders.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(139,92,246,0.14)",
                        border: "1px solid rgba(139,92,246,0.25)",
                        color: "#a78bfa",
                      }}
                    >
                      {REMINDER_OPTIONS.find((o) => o.value === String(r))
                        ?.label ?? `${r}min`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {event.description != null && event.description !== "" && (
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <AlignLeft
                  size={14}
                  style={{
                    color: "rgba(255,255,255,0.32)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                  strokeWidth={1.8}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.70)",
                    lineHeight: 1.55,
                  }}
                >
                  {event.description}
                </span>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "12px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            gap: 8,
          }}
        >
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
                style={{
                  background: "rgba(239,68,68,0.16)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#f87171",
                  cursor: "pointer",
                }}
              >
                Confirmar exclusão
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                fontSize: 12,
                color: "rgba(239,68,68,0.60)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Excluir evento
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── MonthView ─────────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  activeCalendars,
  onEventClick,
  onDayClick,
}: {
  year: number;
  month: number;
  events: CalEvent[];
  activeCalendars: Set<string>;
  onEventClick: (ev: CalEvent) => void;
  onDayClick: (date: Date) => void;
}) {
  const cells = getMonthDays(year, month);
  const visible = events.filter((e) => activeCalendars.has(e.calendarId));

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 14px 14px",
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {DAY_HEADERS_SHORT.map((h) => (
          <div
            key={h}
            style={{
              padding: "8px 8px",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.26)",
              letterSpacing: "0.07em",
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {/* 6×7 grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: "repeat(6, minmax(0,1fr))",
          overflow: "hidden",
        }}
      >
        {cells.map((cell, i) => {
          const isToday = isSameDay(cell.date, TODAY);
          const dayEvs = visible.filter((e) => isSameDay(e.date, cell.date));
          const shown = dayEvs.slice(0, 3);
          const extra = dayEvs.length - 3;
          return (
            <div
              key={i}
              onClick={() => onDayClick(cell.date)}
              style={{
                borderRight:
                  (i + 1) % 7 !== 0
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
                borderBottom:
                  i < 35 ? "1px solid rgba(255,255,255,0.05)" : "none",
                padding: "6px 5px 4px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: "hidden",
                background: !cell.isCurrentMonth
                  ? "rgba(0,0,0,0.10)"
                  : "transparent",
                cursor: "pointer",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = cell.isCurrentMonth
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(0,0,0,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = !cell.isCurrentMonth
                  ? "rgba(0,0,0,0.10)"
                  : "transparent";
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: isToday ? "#8b5cf6" : "transparent",
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 400,
                  color: !cell.isCurrentMonth
                    ? "rgba(255,255,255,0.18)"
                    : isToday
                      ? "#fff"
                      : "rgba(255,255,255,0.80)",
                  boxShadow: isToday ? "0 0 10px rgba(139,92,246,0.5)" : "none",
                }}
              >
                {cell.date.getDate()}
              </div>
              {shown.map((ev) => (
                <div
                  key={ev.id}
                  title={ev.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                  style={{
                    padding: "2px 5px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#fff",
                    background: ev.color + "d0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {ev.allDay !== true && ev.time != null ? `${ev.time} ` : ""}
                  {ev.title}
                </div>
              ))}
              {extra > 0 && (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.32)",
                    paddingLeft: 2,
                    flexShrink: 0,
                  }}
                >
                  +{extra} mais
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TimeGrid (shared by Week and Day) ───────────────────────────────────────

function TimeGrid({
  days,
  events,
  activeCalendars,
  onEventClick,
  onSlotClick,
}: {
  days: Date[];
  events: CalEvent[];
  activeCalendars: Set<string>;
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const visible = events.filter((e) => activeCalendars.has(e.calendarId));

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `48px repeat(${days.length}, 1fr)`,
          minHeight: HOURS.length * HOUR_H,
        }}
      >
        {/* Hour labels column */}
        <div style={{ position: "relative" }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: (h - 6) * HOUR_H - 8,
                left: 0,
                right: 0,
                textAlign: "right",
                paddingRight: 8,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.22)",
                  fontWeight: 500,
                  userSelect: "none",
                }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const dayEvs = visible.filter(
            (e) =>
              isSameDay(e.date, day) && e.allDay !== true && e.time != null,
          );
          const isToday = isSameDay(day, TODAY);
          return (
            <div
              key={di}
              style={{
                position: "relative",
                borderLeft: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Hour cells */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: (h - 6) * HOUR_H,
                    left: 0,
                    right: 0,
                    height: HOUR_H,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    onSlotClick(day, `${String(h).padStart(2, "0")}:00`)
                  }
                />
              ))}
              {/* Current time line */}
              {isToday &&
                (() => {
                  const now = new Date();
                  const mins = now.getHours() * 60 + now.getMinutes() - 6 * 60;
                  if (mins < 0 || mins > HOURS.length * 60) return null;
                  const top = (mins / 60) * HOUR_H;
                  return (
                    <div
                      style={{
                        position: "absolute",
                        top,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#ef4444",
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: -4,
                          top: -3,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                        }}
                      />
                    </div>
                  );
                })()}
              {/* Events */}
              {dayEvs.map((ev) => {
                const startMins = timeToMins(ev.time ?? "00:00") - 6 * 60;
                const endMins =
                  ev.endTime != null
                    ? timeToMins(ev.endTime) - 6 * 60
                    : startMins + 60;
                const top = (startMins / 60) * HOUR_H;
                const height = Math.max(
                  ((endMins - startMins) / 60) * HOUR_H,
                  22,
                );
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    style={{
                      position: "absolute",
                      top,
                      left: 3,
                      right: 3,
                      height,
                      borderRadius: 7,
                      background: ev.color + "cc",
                      borderLeft: `3px solid ${ev.color}`,
                      padding: "3px 7px",
                      overflow: "hidden",
                      cursor: "pointer",
                      zIndex: 5,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ev.title}
                    </div>
                    {height > 34 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.70)",
                          marginTop: 1,
                        }}
                      >
                        {ev.time}
                        {ev.endTime != null ? ` – ${ev.endTime}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  events,
  activeCalendars,
  onEventClick,
  onSlotClick,
}: {
  weekStart: Date;
  events: CalEvent[];
  activeCalendars: Set<string>;
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const allDayEvs = events.filter(
    (e) =>
      activeCalendars.has(e.calendarId) &&
      e.allDay === true &&
      days.some((d) => isSameDay(e.date, d)),
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 14px 14px",
      }}
    >
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px repeat(7, 1fr)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          paddingBottom: 8,
          paddingTop: 6,
        }}
      >
        <div />
        {days.map((day, i) => {
          const isToday = isSameDay(day, TODAY);
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.26)",
                  letterSpacing: "0.06em",
                }}
              >
                {DAY_HEADERS_SHORT[i]}
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? "#8b5cf6" : "transparent",
                  boxShadow: isToday ? "0 0 10px rgba(139,92,246,0.5)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? "#fff" : "rgba(255,255,255,0.78)",
                  }}
                >
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {/* All-day row */}
      {allDayEvs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px repeat(7, 1fr)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "6px 0",
            flexShrink: 0,
          }}
        >
          <div style={{ paddingTop: 3, textAlign: "right", paddingRight: 8 }}>
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.18)",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              TUDO
            </span>
          </div>
          {days.map((day, di) => {
            const evs = allDayEvs.filter((e) => isSameDay(e.date, day));
            return (
              <div
                key={di}
                style={{
                  paddingRight: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {evs.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{
                      borderRadius: 4,
                      background: ev.color + "cc",
                      padding: "2px 6px",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#fff",
                      cursor: "pointer",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <TimeGrid
        days={days}
        events={events}
        activeCalendars={activeCalendars}
        onEventClick={onEventClick}
        onSlotClick={onSlotClick}
      />
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  date,
  events,
  activeCalendars,
  onEventClick,
  onSlotClick,
}: {
  date: Date;
  events: CalEvent[];
  activeCalendars: Set<string>;
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const isToday = isSameDay(date, TODAY);
  const allDayEvs = events.filter(
    (e) =>
      activeCalendars.has(e.calendarId) &&
      e.allDay === true &&
      isSameDay(e.date, date),
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 14px 14px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          paddingBottom: 10,
          paddingTop: 8,
        }}
      >
        <div />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isToday ? "#8b5cf6" : "rgba(255,255,255,0.06)",
              boxShadow: isToday ? "0 0 10px rgba(139,92,246,0.5)" : "none",
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? "#fff" : "rgba(255,255,255,0.80)",
              }}
            >
              {date.getDate()}
            </span>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.26)",
                letterSpacing: "0.06em",
              }}
            >
              {DAY_HEADERS_SHORT[date.getDay()]}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
            </p>
          </div>
        </div>
      </div>
      {/* All-day row */}
      {allDayEvs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "6px 0",
            flexShrink: 0,
            gap: 0,
          }}
        >
          <div style={{ textAlign: "right", paddingRight: 8, paddingTop: 3 }}>
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.18)",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              TUDO
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {allDayEvs.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                style={{
                  borderRadius: 5,
                  background: ev.color + "cc",
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      )}
      <TimeGrid
        days={[date]}
        events={events}
        activeCalendars={activeCalendars}
        onEventClick={onEventClick}
        onSlotClick={onSlotClick}
      />
    </div>
  );
}

// ─── CalendarApp ──────────────────────────────────────────────────────────────

export function CalendarApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const realNow = new Date();
  const [year, setYear] = useState(realNow.getFullYear());
  const [month, setMonth] = useState(realNow.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [view, setView] = useState<ViewMode>("month");
  const [miniYear, setMiniYear] = useState(realNow.getFullYear());
  const [miniMonth, setMiniMonth] = useState(realNow.getMonth());

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarDef[]>([]);
  const [activeCalendars, setActiveCalendars] = useState<Set<string>>(
    new Set(),
  );
  const [hoveredCal, setHoveredCal] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<ModalState | null>(null);
  const firedRef = useRef(new Set<string>());

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!drivers || !userId || !companyId) return;
    setLoading(true);
    try {
      const { data: calRows, error: calErr } = await (drivers.data
        .from("calendar_defs")
        .select("id,label,color")
        .order("created_at") as unknown as Promise<{
        data: DbCalDef[] | null;
        error: unknown;
      }>);
      if (calErr) throw calErr;

      let calDefs: CalendarDef[] = (calRows ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        color: r.color,
      }));

      if (calDefs.length === 0) {
        const toInsert = DEFAULT_CALENDARS.map((d) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          company_id: companyId,
          label: d.label,
          color: d.color,
        }));
        await (drivers.data
          .from("calendar_defs")
          .insert(toInsert) as unknown as Promise<unknown>);
        calDefs = toInsert.map((r) => ({
          id: r.id,
          label: r.label,
          color: r.color,
        }));
      }

      setCalendars(calDefs);
      setActiveCalendars(new Set(calDefs.map((c) => c.id)));

      const { data: evRows, error: evErr } = await (drivers.data
        .from("calendar_events")
        .select(
          "id,calendar_def_id,title,event_date,time_start,time_end,all_day,description,reminders,color",
        )
        .order("event_date") as unknown as Promise<{
        data: DbCalEvent[] | null;
        error: unknown;
      }>);
      if (evErr) throw evErr;

      const calColorMap = new Map(calDefs.map((c) => [c.id, c.color]));
      const evs: CalEvent[] = (evRows ?? []).map((r) => {
        const ev: CalEvent = {
          id: r.id,
          title: r.title,
          date: inputToDate(r.event_date),
          calendarId: r.calendar_def_id ?? "",
          color: calColorMap.get(r.calendar_def_id ?? "") ?? r.color,
        };
        if (r.time_start != null) ev.time = r.time_start;
        if (r.time_end != null) ev.endTime = r.time_end;
        if (r.all_day) ev.allDay = true;
        if (r.description != null) ev.description = r.description;
        if (Array.isArray(r.reminders) && r.reminders.length > 0)
          ev.reminders = r.reminders;
        return ev;
      });
      setEvents(evs);
    } catch {
      // silently degrade — calendar still usable with empty state
    } finally {
      setLoading(false);
    }
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Request notification permission
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }
  }, []);

  // Reminder check every 30 seconds
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      events.forEach((ev) => {
        if (!ev.reminders?.length || ev.time == null) return;
        const evMs = ev.date.getTime() + timeToMins(ev.time) * 60000;
        ev.reminders.forEach((r) => {
          const fireMs = evMs - r * 60000;
          const key = `${ev.id}-${r}`;
          if (
            !firedRef.current.has(key) &&
            fireMs <= now &&
            now < fireMs + 60000
          ) {
            firedRef.current.add(key);
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              const label =
                REMINDER_OPTIONS.find((o) => o.value === String(r))?.label ??
                "";
              new Notification(`🔔 ${ev.title}`, {
                body: `${ev.time} · ${label}`,
              });
            }
          }
        });
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [events]);

  // Mini calendar cells
  const miniCells = getMonthDays(miniYear, miniMonth);

  // Navigation
  function prevMain() {
    if (view === "month") {
      if (month === 0) {
        setYear((y) => y - 1);
        setMonth(11);
      } else setMonth((m) => m - 1);
    } else if (view === "week") {
      setSelectedDate((d) => addDays(d, -7));
    } else {
      setSelectedDate((d) => addDays(d, -1));
    }
  }
  function nextMain() {
    if (view === "month") {
      if (month === 11) {
        setYear((y) => y + 1);
        setMonth(0);
      } else setMonth((m) => m + 1);
    } else if (view === "week") {
      setSelectedDate((d) => addDays(d, 7));
    } else {
      setSelectedDate((d) => addDays(d, 1));
    }
  }
  function goToday() {
    setYear(realNow.getFullYear());
    setMonth(realNow.getMonth());
    setSelectedDate(TODAY);
    setMiniYear(realNow.getFullYear());
    setMiniMonth(realNow.getMonth());
  }

  function handleMiniClick(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    setYear(y);
    setMonth(m);
    setMiniYear(y);
    setMiniMonth(m);
    setSelectedDate(date);
  }

  function toggleCalendar(id: string) {
    setActiveCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Event CRUD ────────────────────────────────────────────────────────────

  async function saveEvent(ev: CalEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === ev.id);
      if (idx >= 0) return prev.map((e) => (e.id === ev.id ? ev : e));
      return [...prev, ev];
    });
    if (!drivers || !userId || !companyId) return;
    await (drivers.data.from("calendar_events").upsert({
      id: ev.id,
      user_id: userId,
      company_id: companyId,
      calendar_def_id: ev.calendarId || null,
      title: ev.title,
      event_date: dateToInput(ev.date),
      time_start: ev.time ?? null,
      time_end: ev.endTime ?? null,
      all_day: ev.allDay ?? false,
      description: ev.description ?? null,
      reminders: ev.reminders ?? [],
      color: ev.color,
    }) as unknown as Promise<unknown>);
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (!drivers) return;
    await (drivers.data
      .from("calendar_events")
      .delete()
      .eq("id", id) as unknown as Promise<unknown>);
  }

  // ── Calendar CRUD ─────────────────────────────────────────────────────────

  async function saveCalendar(cal: CalendarDef) {
    setCalendars((prev) => {
      const idx = prev.findIndex((c) => c.id === cal.id);
      if (idx >= 0) return prev.map((c) => (c.id === cal.id ? cal : c));
      return [...prev, cal];
    });
    setActiveCalendars((prev) => new Set([...prev, cal.id]));
    setEvents((prev) =>
      prev.map((e) =>
        e.calendarId === cal.id ? { ...e, color: cal.color } : e,
      ),
    );
    if (!drivers || !userId || !companyId) return;
    await (drivers.data.from("calendar_defs").upsert({
      id: cal.id,
      user_id: userId,
      company_id: companyId,
      label: cal.label,
      color: cal.color,
    }) as unknown as Promise<unknown>);
  }

  async function deleteCalendar(id: string) {
    setCalendars((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) => prev.filter((e) => e.calendarId !== id));
    setActiveCalendars((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!drivers) return;
    await (drivers.data
      .from("calendar_defs")
      .delete()
      .eq("id", id) as unknown as Promise<unknown>);
  }

  function getHeaderTitle(): string {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "week") {
      const ws = getWeekStart(selectedDate);
      const we = addDays(ws, 6);
      const wsMonth = MONTH_NAMES[ws.getMonth()] ?? "";
      const weMonth = MONTH_NAMES[we.getMonth()] ?? "";
      if (ws.getMonth() === we.getMonth())
        return `${wsMonth} ${ws.getFullYear()}`;
      return `${wsMonth.slice(0, 3)} – ${weMonth.slice(0, 3)} ${we.getFullYear()}`;
    }
    return `${selectedDate.getDate()} de ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }

  const ghostBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.50)",
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#191d21",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        Carregando calendário…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "#191d21",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "inherit",
        position: "relative",
      }}
    >
      {/* ── Sidebar animated wrapper (configurações pattern) ─────────── */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
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
            <CalendarDays
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
                Calendário
              </span>
            )}
          </div>

          {collapsed ? (
            /* ── Collapsed: icon-only ── */
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 0",
                gap: 2,
              }}
            >
              {/* Create */}
              <button
                type="button"
                onClick={() => setModal({ type: "create", date: selectedDate })}
                title="Criar evento"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#8b5cf6",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(139,92,246,0.38)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#7c3aed";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#8b5cf6";
                }}
              >
                <Plus size={16} />
              </button>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.07)",
                  width: 28,
                  margin: "4px 0",
                }}
              />

              {/* Calendar dots */}
              {calendars.map((cal) => {
                const active = activeCalendars.has(cal.id);
                return (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => toggleCalendar(cal.id)}
                    title={cal.label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        background: active ? cal.color : "transparent",
                        border: `2px solid ${cal.color}`,
                        transition: "background 120ms",
                        flexShrink: 0,
                      }}
                    />
                  </button>
                );
              })}

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.07)",
                  width: 28,
                  margin: "4px 0",
                }}
              />

              {/* New calendar */}
              <button
                type="button"
                onClick={() => setModal({ type: "calendarCreate" })}
                title="Novo calendário"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.35)",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Plus size={14} />
              </button>
            </nav>
          ) : (
            /* ── Expanded: full sidebar ── */
            <>
              {/* Create event button */}
              <div style={{ padding: "10px 10px 4px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setModal({ type: "create", date: selectedDate })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#8b5cf6",
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#7c3aed";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#8b5cf6";
                  }}
                >
                  <Plus size={13} />
                  Criar evento
                </button>
              </div>

              {/* Mini calendar */}
              <div style={{ padding: "4px 12px 12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.50)",
                    }}
                  >
                    {MONTH_NAMES[miniMonth]?.slice(0, 3)} {miniYear}
                  </span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[
                      {
                        onClick: () => {
                          if (miniMonth === 0) {
                            setMiniYear((y) => y - 1);
                            setMiniMonth(11);
                          } else setMiniMonth((m) => m - 1);
                        },
                        Icon: ChevronLeft,
                      },
                      {
                        onClick: () => {
                          if (miniMonth === 11) {
                            setMiniYear((y) => y + 1);
                            setMiniMonth(0);
                          } else setMiniMonth((m) => m + 1);
                        },
                        Icon: ChevronRight,
                      },
                    ].map(({ onClick, Icon }, ki) => (
                      <button
                        key={ki}
                        type="button"
                        onClick={onClick}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.09)",
                          color: "rgba(255,255,255,0.40)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={10} />
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    marginBottom: 2,
                  }}
                >
                  {DAY_HEADERS_SHORT.map((h) => (
                    <span
                      key={h}
                      style={{
                        textAlign: "center",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.20)",
                        paddingBottom: 3,
                      }}
                    >
                      {h[0]}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "2px 0",
                  }}
                >
                  {miniCells.map((cell, i) => {
                    const isToday = isSameDay(cell.date, TODAY);
                    const isSel =
                      isSameDay(cell.date, selectedDate) && !isToday;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleMiniClick(cell.date)}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: "50%",
                          border: "none",
                          fontSize: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isToday
                            ? "#8b5cf6"
                            : isSel
                              ? "rgba(139,92,246,0.20)"
                              : "transparent",
                          color: isToday
                            ? "#fff"
                            : !cell.isCurrentMonth
                              ? "rgba(255,255,255,0.16)"
                              : "rgba(255,255,255,0.72)",
                          cursor: "pointer",
                          fontWeight: isToday ? 700 : 400,
                          padding: 0,
                        }}
                      >
                        {cell.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
              />

              {/* My Calendars */}
              <div style={{ padding: "0 0 16px 8px", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 8px 4px",
                  }}
                >
                  <p
                    style={{
                      flex: 1,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Meus Calendários
                  </p>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "calendarCreate" })}
                    title="Novo calendário"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.32)",
                      display: "flex",
                      padding: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {calendars.map((cal) => {
                    const active = activeCalendars.has(cal.id);
                    return (
                      <div
                        key={cal.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 8,
                          padding: "4px 4px 4px 6px",
                          transition: "background 120ms ease",
                          background:
                            hoveredCal === cal.id
                              ? "rgba(255,255,255,0.05)"
                              : "transparent",
                        }}
                        onMouseEnter={() => setHoveredCal(cal.id)}
                        onMouseLeave={() => setHoveredCal(null)}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCalendar(cal.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            flex: 1,
                            textAlign: "left",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: active ? cal.color : "transparent",
                              border: `2px solid ${cal.color}`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 120ms",
                            }}
                          >
                            {active && (
                              <svg
                                width="7"
                                height="7"
                                viewBox="0 0 8 8"
                                fill="none"
                              >
                                <path
                                  d="M1.5 4L3 5.5L6.5 2"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {cal.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ type: "calendarEdit", calendar: cal })
                          }
                          title="Editar calendário"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.35)",
                            display: "flex",
                            padding: 3,
                            borderRadius: 4,
                            opacity: hoveredCal === cal.id ? 1 : 0,
                            transition: "opacity 120ms",
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Collapse/expand toggle (configurações pattern) ───────────── */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
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

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 3 }}>
            <button type="button" onClick={prevMain} style={ghostBtn}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={nextMain} style={ghostBtn}>
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            style={{
              padding: "5px 13px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.60)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Hoje
          </button>
          <h2
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "rgba(255,255,255,0.90)",
              margin: 0,
            }}
          >
            {getHeaderTitle()}
          </h2>
          {/* View switcher */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    view === v ? "rgba(255,255,255,0.10)" : "transparent",
                  color:
                    view === v
                      ? "rgba(255,255,255,0.80)"
                      : "rgba(255,255,255,0.35)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 120ms, color 120ms",
                }}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>

        {/* View content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {view === "month" && (
            <MonthView
              year={year}
              month={month}
              events={events}
              activeCalendars={activeCalendars}
              onEventClick={(ev) => setModal({ type: "detail", event: ev })}
              onDayClick={(date) => {
                setSelectedDate(date);
                setModal({ type: "create", date });
              }}
            />
          )}
          {view === "week" && (
            <WeekView
              weekStart={getWeekStart(selectedDate)}
              events={events}
              activeCalendars={activeCalendars}
              onEventClick={(ev) => setModal({ type: "detail", event: ev })}
              onSlotClick={(date, time) =>
                setModal({ type: "create", date, time })
              }
            />
          )}
          {view === "day" && (
            <DayView
              date={selectedDate}
              events={events}
              activeCalendars={activeCalendars}
              onEventClick={(ev) => setModal({ type: "detail", event: ev })}
              onSlotClick={(date, time) =>
                setModal({ type: "create", date, time })
              }
            />
          )}
        </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {modal?.type === "create" && (
        <EventModal
          event={null}
          defaultDate={modal.date}
          {...(modal.time !== undefined ? { defaultTime: modal.time } : {})}
          calendars={calendars}
          onSave={saveEvent}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "edit" && (
        <EventModal
          event={modal.event}
          calendars={calendars}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "detail" && (
        <EventDetailModal
          event={modal.event}
          calendars={calendars}
          onEdit={() =>
            setModal({
              type: "edit",
              event: (modal as { type: "detail"; event: CalEvent }).event,
            })
          }
          onDelete={(id) => {
            deleteEvent(id);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "calendarCreate" && (
        <CalendarModal
          calendar={null}
          onSave={saveCalendar}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "calendarEdit" && (
        <CalendarModal
          calendar={modal.calendar}
          onSave={saveCalendar}
          onDelete={deleteCalendar}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
