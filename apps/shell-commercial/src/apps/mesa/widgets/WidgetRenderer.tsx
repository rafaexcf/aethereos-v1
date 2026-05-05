import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useInstalledModulesStore } from "../../../stores/installedModulesStore";
import { getApp } from "../../registry";

// ─── Estilos compartilhados ───────────────────────────────────────────────

const WIDGET_BASE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 16,
  background: "rgba(8, 12, 22, 0.62)",
  border: "1px solid rgba(255,255,255,0.10)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 8px 28px rgba(0,0,0,0.32)",
  padding: 14,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  textAlign: "left",
  cursor: "pointer",
  transition: "transform 160ms ease, border-color 160ms ease",
};

const TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.55)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const PRIMARY: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: "rgba(255,255,255,0.94)",
  letterSpacing: "-0.02em",
  fontFamily: "var(--font-display, inherit)",
  lineHeight: 1.05,
};

const HINT: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.5)",
  lineHeight: 1.45,
};

function AppIconCorner({ appId }: { appId: string }) {
  const app = getApp(appId);
  if (app === undefined) return null;
  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      app.icon
    ] ?? LucideIcons.Box;
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 26,
        height: 26,
        borderRadius: 8,
        background: `${app.color}22`,
        border: `1px solid ${app.color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={14} strokeWidth={1.6} style={{ color: app.color }} />
    </div>
  );
}

// ─── Widgets individuais ──────────────────────────────────────────────────

function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  return (
    <>
      <AppIconCorner appId="relogio" />
      <span style={TITLE}>Relógio</span>
      <div style={{ ...PRIMARY, fontSize: 36 }}>{time}</div>
      <span style={{ ...HINT, textTransform: "capitalize" }}>{date}</span>
    </>
  );
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const DAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];

function CalendarWidget() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const todayDay = today.getDate();
  return (
    <>
      <AppIconCorner appId="calendar" />
      <span style={TITLE}>Calendário</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
          marginBottom: 4,
        }}
      >
        {MONTH_NAMES_SHORT[month]} {year}
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          fontSize: 9,
          flex: 1,
        }}
      >
        {DAY_HEADERS.map((h, i) => (
          <div
            key={`h-${i}`}
            style={{
              color: "rgba(255,255,255,0.32)",
              textAlign: "center",
              fontWeight: 600,
              padding: "1px 0",
            }}
          >
            {h}
          </div>
        ))}
        {cells.map((d, i) => {
          const isToday = d === todayDay;
          return (
            <div
              key={`c-${i}`}
              style={{
                textAlign: "center",
                padding: "2px 0",
                borderRadius: 4,
                color:
                  d === null
                    ? "transparent"
                    : isToday
                      ? "#fff"
                      : "rgba(255,255,255,0.7)",
                background: isToday ? "rgba(99,102,241,0.7)" : "transparent",
                fontWeight: isToday ? 700 : 400,
                fontSize: 10,
              }}
            >
              {d ?? "."}
            </div>
          );
        })}
      </div>
    </>
  );
}

function NotesWidget() {
  return (
    <>
      <AppIconCorner appId="bloco-de-notas" />
      <span style={TITLE}>Notas</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Bloco de Notas</div>
      <span style={HINT}>Clique para ver suas notas e criar uma nova.</span>
    </>
  );
}

function WeatherWidget() {
  // Sprint 26: dado stub — WeatherApp gerencia clima em estado proprio.
  // Widget abre o app pra detalhe; mostra glance neutro.
  return (
    <>
      <AppIconCorner appId="weather" />
      <span style={TITLE}>Clima</span>
      <div style={PRIMARY}>—°</div>
      <span style={HINT}>Toque para ver previsão completa.</span>
    </>
  );
}

function KanbanWidget() {
  return (
    <>
      <AppIconCorner appId="kanban" />
      <span style={TITLE}>Kanban</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Quadros</div>
      <span style={HINT}>Visualize tarefas por coluna em tempo real.</span>
    </>
  );
}

function ContatosWidget() {
  return (
    <>
      <AppIconCorner appId="agenda-telefonica" />
      <span style={TITLE}>Contatos</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Agenda</div>
      <span style={HINT}>Ramais, telefones e grupos da empresa.</span>
    </>
  );
}

function TarefasWidget() {
  return (
    <>
      <AppIconCorner appId="tarefas" />
      <span style={TITLE}>Tarefas</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Pendências</div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 4,
          flex: 1,
        }}
      >
        {["Revisar PR aberto", "Responder e-mails", "Planejar sprint"].map(
          (t) => (
            <li
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "rgba(99,102,241,0.65)",
                  flexShrink: 0,
                }}
              />
              {t}
            </li>
          ),
        )}
      </ul>
    </>
  );
}

function CalculadoraWidget() {
  return (
    <>
      <AppIconCorner appId="calculadora" />
      <span style={TITLE}>Calculadora</span>
      <div
        style={{
          ...PRIMARY,
          fontSize: 22,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        0
      </div>
      <span style={HINT}>Toque para abrir.</span>
    </>
  );
}

function GravadorWidget() {
  return (
    <>
      <AppIconCorner appId="gravador-de-voz" />
      <span style={TITLE}>Gravador</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.85)",
            border: "2px solid rgba(255,255,255,0.18)",
            flexShrink: 0,
            boxShadow: "0 0 14px rgba(239,68,68,0.45)",
          }}
        />
        <span style={{ ...PRIMARY, fontSize: 16 }}>Gravar voz</span>
      </div>
      <span style={HINT}>1 toque para iniciar uma gravação.</span>
    </>
  );
}

function MagicStoreWidget() {
  return (
    <>
      <AppIconCorner appId="magic-store" />
      <span style={TITLE}>Æ Magic Store</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Loja de apps</div>
      <span style={HINT}>Descubra apps verticais e plugins.</span>
    </>
  );
}

function MensagensWidget() {
  return (
    <>
      <AppIconCorner appId="chat" />
      <span style={TITLE}>Mensagens</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>Chat</div>
      <span style={HINT}>Conversas com sua equipe e canais.</span>
    </>
  );
}

function DriveWidget() {
  const installed = useInstalledModulesStore((s) => s.installed);
  const has = installed.has("drive");
  return (
    <>
      <AppIconCorner appId="drive" />
      <span style={TITLE}>Drive</span>
      <div style={{ ...PRIMARY, fontSize: 18 }}>
        {has ? "Arquivos" : "Drive"}
      </div>
      <span style={HINT}>Documentos e arquivos da empresa.</span>
    </>
  );
}

// ─── Renderer ─────────────────────────────────────────────────────────────

const RENDERERS: Record<string, React.FC> = {
  relogio: ClockWidget,
  calendar: CalendarWidget,
  "bloco-de-notas": NotesWidget,
  weather: WeatherWidget,
  kanban: KanbanWidget,
  "agenda-telefonica": ContatosWidget,
  tarefas: TarefasWidget,
  calculadora: CalculadoraWidget,
  "gravador-de-voz": GravadorWidget,
  "magic-store": MagicStoreWidget,
  chat: MensagensWidget,
  drive: DriveWidget,
};

export function WidgetRenderer({ appId }: { appId: string }) {
  const Component = RENDERERS[appId];
  if (Component === undefined) {
    return (
      <div style={WIDGET_BASE}>
        <span style={TITLE}>Widget desconhecido</span>
      </div>
    );
  }
  return (
    <div style={{ ...WIDGET_BASE, position: "relative" }}>
      <Component />
    </div>
  );
}
