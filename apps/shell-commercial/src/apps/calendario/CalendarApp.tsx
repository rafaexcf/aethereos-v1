import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  MONTH_NAMES,
  DAY_HEADERS_SHORT,
  getMonthDays,
  isSameDay,
  todayMidnight,
} from "./calendarUtils";

interface CalEvent {
  id: string;
  title: string;
  date: Date;
  color: string;
  time?: string;
  allDay?: boolean;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const TODAY = todayMidnight();

const EVENTS: CalEvent[] = [
  {
    id: "1",
    title: "Reunião de planejamento",
    date: addDays(TODAY, 0),
    color: "#8b5cf6",
    time: "09:00",
  },
  {
    id: "2",
    title: "Review do sprint",
    date: addDays(TODAY, 1),
    color: "#06b6d4",
    time: "14:00",
  },
  {
    id: "3",
    title: "1:1 com Felipe",
    date: addDays(TODAY, 2),
    color: "#10b981",
    time: "10:30",
  },
  {
    id: "4",
    title: "Apresentação de produto",
    date: addDays(TODAY, -1),
    color: "#f59e0b",
    time: "15:00",
  },
  {
    id: "5",
    title: "Demo para cliente",
    date: addDays(TODAY, 3),
    color: "#ef4444",
    time: "11:00",
  },
  {
    id: "6",
    title: "Alinhamento estratégico",
    date: addDays(TODAY, 5),
    color: "#8b5cf6",
    time: "09:30",
  },
  {
    id: "7",
    title: "Onboarding novo membro",
    date: addDays(TODAY, -3),
    color: "#06b6d4",
    allDay: true,
  },
  {
    id: "8",
    title: "Checkpoint produto Q2",
    date: addDays(TODAY, 7),
    color: "#f59e0b",
    time: "16:00",
  },
  {
    id: "9",
    title: "Entrega relatório Q2",
    date: addDays(TODAY, -5),
    color: "#ef4444",
    allDay: true,
  },
  {
    id: "10",
    title: "Workshop de UX",
    date: addDays(TODAY, 10),
    color: "#10b981",
    time: "13:00",
  },
  {
    id: "11",
    title: "Sync time de dados",
    date: addDays(TODAY, 0),
    color: "#06b6d4",
    time: "16:30",
  },
  {
    id: "12",
    title: "Revisão de contrato",
    date: addDays(TODAY, 4),
    color: "#f59e0b",
    time: "11:00",
  },
  {
    id: "13",
    title: "Feedback de produto",
    date: addDays(TODAY, -2),
    color: "#10b981",
    time: "14:00",
  },
  {
    id: "14",
    title: "Planning Q3",
    date: addDays(TODAY, 14),
    color: "#8b5cf6",
    allDay: true,
  },
];

const MY_CALENDARS = [
  { id: "personal", label: "Pessoal", color: "#8b5cf6" },
  { id: "work", label: "Trabalho", color: "#06b6d4" },
  { id: "team", label: "Time", color: "#10b981" },
  { id: "external", label: "Externos", color: "#f59e0b" },
];

type ViewMode = "month" | "week" | "day";

const ghostBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 6,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
};

export function CalendarApp() {
  const realNow = new Date();
  const [year, setYear] = useState(realNow.getFullYear());
  const [month, setMonth] = useState(realNow.getMonth());
  const [view, setView] = useState<ViewMode>("month");
  const [miniYear, setMiniYear] = useState(realNow.getFullYear());
  const [miniMonth, setMiniMonth] = useState(realNow.getMonth());
  const [activeCalendars, setActiveCalendars] = useState(
    new Set(MY_CALENDARS.map((c) => c.id)),
  );

  const cells = getMonthDays(year, month);
  const miniCells = getMonthDays(miniYear, miniMonth);

  function prevMain() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMain() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(realNow.getFullYear());
    setMonth(realNow.getMonth());
  }

  function prevMini() {
    if (miniMonth === 0) {
      setMiniYear((y) => y - 1);
      setMiniMonth(11);
    } else setMiniMonth((m) => m - 1);
  }
  function nextMini() {
    if (miniMonth === 11) {
      setMiniYear((y) => y + 1);
      setMiniMonth(0);
    } else setMiniMonth((m) => m + 1);
  }

  function toggleCalendar(id: string) {
    setActiveCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getEventsForDay(date: Date): CalEvent[] {
    return EVENTS.filter((e) => isSameDay(e.date, date));
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "#08090e",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "inherit",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 10px",
          overflowY: "auto",
          gap: 18,
        }}
      >
        {/* Create event */}
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "9px 0",
            borderRadius: 10,
            background: "#8b5cf6",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            boxShadow: "0 2px 12px rgba(139,92,246,0.35)",
          }}
        >
          <Plus size={14} />
          Criar evento
        </button>

        {/* Mini calendar */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {MONTH_NAMES[miniMonth]?.slice(0, 3)} {miniYear}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              <button
                type="button"
                onClick={prevMini}
                style={{ ...ghostBtn, width: 20, height: 20, borderRadius: 4 }}
              >
                <ChevronLeft size={10} />
              </button>
              <button
                type="button"
                onClick={nextMini}
                style={{ ...ghostBtn, width: 20, height: 20, borderRadius: 4 }}
              >
                <ChevronRight size={10} />
              </button>
            </div>
          </div>

          {/* Day header row */}
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
                  color: "rgba(255,255,255,0.25)",
                  paddingBottom: 3,
                }}
              >
                {h[0]}
              </span>
            ))}
          </div>

          {/* Mini grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px 0",
            }}
          >
            {miniCells.map((cell, i) => {
              const isToday = isSameDay(cell.date, TODAY);
              const isActive =
                cell.date.getFullYear() === year &&
                cell.date.getMonth() === month &&
                !isToday;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const y = cell.date.getFullYear();
                    const m = cell.date.getMonth();
                    setYear(y);
                    setMonth(m);
                    setMiniYear(y);
                    setMiniMonth(m);
                  }}
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
                      : isActive
                        ? "rgba(139,92,246,0.15)"
                        : "transparent",
                    color: isToday
                      ? "#fff"
                      : !cell.isCurrentMonth
                        ? "rgba(255,255,255,0.18)"
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

        {/* My Calendars */}
        <div>
          <p
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Meus Calendários
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {MY_CALENDARS.map((cal) => {
              const active = activeCalendars.has(cal.id);
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => toggleCalendar(cal.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "5px 6px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
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
                    }}
                  >
                    {active && (
                      <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
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
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}
                  >
                    {cal.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Header toolbar */}
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
          <div style={{ display: "flex", gap: 4 }}>
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
              padding: "4px 12px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
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
              color: "rgba(255,255,255,0.9)",
              margin: 0,
            }}
          >
            {MONTH_NAMES[month]} {year}
          </h2>

          {/* View switcher */}
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {(["month", "week", "day"] as ViewMode[]).map((v, vi) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  background:
                    view === v ? "rgba(139,92,246,0.18)" : "transparent",
                  border: "none",
                  borderRight:
                    vi < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                  color: view === v ? "#a78bfa" : "rgba(255,255,255,0.42)",
                  cursor: "pointer",
                  transition: "background 120ms, color 120ms",
                }}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>

        {/* Month view */}
        {view === "month" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
              }}
            >
              {DAY_HEADERS_SHORT.map((h) => (
                <div
                  key={h}
                  style={{
                    padding: "6px 10px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.28)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* 6 × 7 day grid */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gridTemplateRows: "repeat(6, minmax(0, 1fr))",
                overflow: "hidden",
              }}
            >
              {cells.map((cell, i) => {
                const isToday = isSameDay(cell.date, TODAY);
                const dayEvents = getEventsForDay(cell.date);
                const visible = dayEvents.slice(0, 2);
                const overflow = dayEvents.length - 2;

                return (
                  <div
                    key={i}
                    style={{
                      borderRight:
                        (i + 1) % 7 !== 0
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      borderBottom:
                        i < 35 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      padding: "5px 6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      overflow: "hidden",
                      background: !cell.isCurrentMonth
                        ? "rgba(0,0,0,0.1)"
                        : "transparent",
                    }}
                  >
                    {/* Day number */}
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
                          ? "rgba(255,255,255,0.2)"
                          : isToday
                            ? "#fff"
                            : "rgba(255,255,255,0.8)",
                        boxShadow: isToday
                          ? "0 0 8px rgba(139,92,246,0.5)"
                          : "none",
                      }}
                    >
                      {cell.date.getDate()}
                    </div>

                    {/* Events */}
                    {visible.map((ev) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        style={{
                          padding: "1px 5px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 500,
                          color: "#fff",
                          background: ev.color + "cc",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {ev.time != null ? `${ev.time} ` : ""}
                        {ev.title}
                      </div>
                    ))}

                    {overflow > 0 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.35)",
                          paddingLeft: 2,
                          cursor: "pointer",
                        }}
                      >
                        +{overflow} mais
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week / Day — placeholder */}
        {view !== "month" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 36, opacity: 0.12 }}>📅</span>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.22)" }}>
              Visão {view === "week" ? "semanal" : "diária"} em breve
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
