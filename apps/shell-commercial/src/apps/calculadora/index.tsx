import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Trash2,
  Copy,
  Check,
  Search,
  Calculator,
  FlaskConical,
  DollarSign,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  Sigma,
  Ruler,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

type CalcMode = "standard" | "scientific" | "hp12c";

interface StdState {
  exprParts: string;
  cur: string;
  isResult: boolean;
  isError: boolean;
  prevExpr: string;
}

interface HPRegs {
  n: number | null;
  i: number | null;
  pv: number | null;
  pmt: number | null;
  fv: number | null;
}

interface HP12CState {
  x: string;
  y: number;
  z: number;
  t: number;
  inputMode: boolean;
  liftFlag: boolean;
  regs: HPRegs;
  shiftF: boolean;
  shiftG: boolean;
  isError: boolean;
}

interface HistEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

function safeCalc(raw: string): number {
  const s = raw
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  let pos = 0;
  const peek = () => s[pos] ?? "";
  const eat = () => s[pos++] ?? "";

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = eat();
      v = op === "+" ? v + parseTerm() : v - parseTerm();
    }
    return v;
  }
  function parseTerm(): number {
    let v = parsePow();
    while (peek() === "*" || peek() === "/") {
      const op = eat();
      const r = parsePow();
      if (op === "/") {
        if (r === 0) throw new Error("Divisão por zero");
        v /= r;
      } else v *= r;
    }
    return v;
  }
  function parsePow(): number {
    const base = parseUnary();
    if (peek() === "^") {
      eat();
      return Math.pow(base, parsePow());
    }
    return base;
  }
  function parseUnary(): number {
    if (peek() === "-") {
      eat();
      return -parsePrimary();
    }
    if (peek() === "+") {
      eat();
      return parsePrimary();
    }
    return parsePrimary();
  }
  function parsePrimary(): number {
    const ch = peek();
    if (ch === "(") {
      eat();
      const v = parseExpr();
      if (peek() === ")") eat();
      return v;
    }
    if (/[0-9.]/.test(ch)) {
      let n = "";
      while (/[0-9.]/.test(peek())) n += eat();
      const num = parseFloat(n);
      if (isNaN(num)) throw new Error("Número inválido");
      return num;
    }
    throw new Error(`Caractere inesperado: "${ch || "fim"}"`);
  }
  if (!s) throw new Error("Expressão vazia");
  const result = parseExpr();
  if (pos < s.length) throw new Error(`Inesperado: "${s.slice(pos)}"`);
  return result;
}

function fmt(n: number): string {
  if (isNaN(n)) return "Erro";
  if (!isFinite(n)) return n > 0 ? "+∞" : "-∞";
  const parsed = parseFloat(n.toPrecision(12));
  if (
    Math.abs(parsed) >= 1e13 ||
    (Math.abs(parsed) > 0 && Math.abs(parsed) < 1e-9)
  )
    return parsed.toExponential(6);
  return parsed.toString();
}

function fmtExpr(e: string): string {
  return e.replace(/\*/g, "×").replace(/\//g, "÷");
}

function toRad(deg: number, useDeg: boolean): number {
  return useDeg ? (deg * Math.PI) / 180 : deg;
}

function tvmFV(n: number, i: number, pv: number, pmt: number): number {
  if (Math.abs(i) < 1e-10) return -pv - pmt * n;
  const f = Math.pow(1 + i, n);
  return -pv * f - (pmt * (f - 1)) / i;
}

function tvmPV(n: number, i: number, pmt: number, fv: number): number {
  if (Math.abs(i) < 1e-10) return -pmt * n - fv;
  const f = Math.pow(1 + i, n);
  return (-fv - (pmt * (f - 1)) / i) / f;
}

function tvmPMT(n: number, i: number, pv: number, fv: number): number {
  if (Math.abs(n) < 1e-10) throw new Error("n = 0");
  if (Math.abs(i) < 1e-10) return -(pv + fv) / n;
  const f = Math.pow(1 + i, n);
  if (Math.abs(f - 1) < 1e-10) throw new Error("Sem solução");
  return (-(pv * f + fv) * i) / (f - 1);
}

function tvmN(i: number, pv: number, pmt: number, fv: number): number {
  if (Math.abs(i) < 1e-10) {
    if (Math.abs(pmt) < 1e-10) throw new Error("PMT = 0");
    return -(pv + fv) / pmt;
  }
  const pmtI = pmt / i;
  const den = pv + pmtI;
  if (Math.abs(den) < 1e-10) throw new Error("Sem solução");
  const ratio = (pmtI - fv) / den;
  if (ratio <= 0) throw new Error("Sem solução real");
  return Math.log(ratio) / Math.log(1 + i);
}

function tvmI(n: number, pv: number, pmt: number, fv: number): number {
  let i = 0.1;
  for (let k = 0; k < 300; k++) {
    const f = Math.pow(1 + i, n);
    const fn = pv * f + (pmt * (f - 1)) / i + fv;
    const df =
      pv * n * Math.pow(1 + i, n - 1) +
      (pmt * (n * Math.pow(1 + i, n - 1) * i - (f - 1))) / (i * i);
    if (Math.abs(df) < 1e-15) break;
    const delta = fn / df;
    i -= delta;
    if (i <= -1) i = 1e-6;
    if (Math.abs(delta) < 1e-12) break;
  }
  if (!isFinite(i) || isNaN(i) || i <= -1) throw new Error("Sem solução");
  return i;
}

const INIT_HP12C: HP12CState = {
  x: "0",
  y: 0,
  z: 0,
  t: 0,
  inputMode: false,
  liftFlag: false,
  regs: { n: null, i: null, pv: null, pmt: null, fv: null },
  shiftF: false,
  shiftG: false,
  isError: false,
};

function hpX(s: HP12CState): number {
  const n = parseFloat(s.x);
  return isNaN(n) ? 0 : n;
}

function clearShifts(p: HP12CState): HP12CState {
  return { ...p, shiftF: false, shiftG: false };
}

function hpDigit(d: string, p: HP12CState): HP12CState {
  if (p.isError)
    return { ...INIT_HP12C, x: d === "0" ? "0" : d, inputMode: true };
  if (p.liftFlag)
    return clearShifts({
      ...p,
      t: p.z,
      z: p.y,
      y: hpX(p),
      x: d === "0" ? "0" : d,
      inputMode: true,
      liftFlag: false,
    });
  if (!p.inputMode)
    return clearShifts({ ...p, x: d === "0" ? "0" : d, inputMode: true });
  return clearShifts({ ...p, x: p.x === "0" ? d : p.x + d });
}

function hpDot(p: HP12CState): HP12CState {
  if (p.isError) return { ...INIT_HP12C, x: "0.", inputMode: true };
  if (p.liftFlag)
    return clearShifts({
      ...p,
      t: p.z,
      z: p.y,
      y: hpX(p),
      x: "0.",
      inputMode: true,
      liftFlag: false,
    });
  if (!p.inputMode) return clearShifts({ ...p, x: "0.", inputMode: true });
  if (p.x.includes(".")) return p;
  return clearShifts({ ...p, x: p.x + "." });
}

function hpEnter(p: HP12CState): HP12CState {
  const xv = hpX(p);
  return clearShifts({
    ...p,
    t: p.z,
    z: p.y,
    y: xv,
    x: fmt(xv),
    inputMode: false,
    liftFlag: true,
    isError: false,
  });
}

function hpBinOp(op: "+" | "-" | "*" | "/", p: HP12CState): HP12CState {
  const xv = hpX(p);
  const yv = p.y;
  try {
    let r = 0;
    if (op === "+") r = yv + xv;
    else if (op === "-") r = yv - xv;
    else if (op === "*") r = yv * xv;
    else {
      if (Math.abs(xv) < 1e-15) throw new Error("Divisão por zero");
      r = yv / xv;
    }
    return clearShifts({
      ...p,
      x: fmt(r),
      y: p.z,
      z: p.t,
      t: p.t,
      inputMode: false,
      liftFlag: true,
      isError: false,
    });
  } catch (e) {
    return clearShifts({
      ...p,
      x: e instanceof Error ? e.message : "Erro",
      isError: true,
    });
  }
}

function hpCHS(p: HP12CState): HP12CState {
  if (p.isError) return p;
  return clearShifts({
    ...p,
    x: p.x.startsWith("-") ? p.x.slice(1) : "-" + p.x,
  });
}

function hpCLX(p: HP12CState): HP12CState {
  return clearShifts({
    ...p,
    x: "0",
    inputMode: false,
    liftFlag: false,
    isError: false,
  });
}

function hpRollDown(p: HP12CState): HP12CState {
  const xv = hpX(p);
  return clearShifts({
    ...p,
    x: fmt(p.y),
    y: p.z,
    z: p.t,
    t: xv,
    inputMode: false,
    liftFlag: false,
  });
}

type FinKey = "n" | "i" | "pv" | "pmt" | "fv";

function hpFinKey(key: FinKey, p: HP12CState): HP12CState {
  if (p.shiftF) {
    try {
      const { n, i, pv, pmt, fv } = p.regs;
      const n_ = n ?? 0;
      const ir = (i ?? 0) / 100;
      const pv_ = pv ?? 0;
      const pmt_ = pmt ?? 0;
      const fv_ = fv ?? 0;
      let result: number;
      if (key === "n") result = tvmN(ir, pv_, pmt_, fv_);
      else if (key === "i") result = tvmI(n_, pv_, pmt_, fv_) * 100;
      else if (key === "pv") result = tvmPV(n_, ir, pmt_, fv_);
      else if (key === "pmt") result = tvmPMT(n_, ir, pv_, fv_);
      else result = tvmFV(n_, ir, pv_, pmt_);
      return clearShifts({
        ...p,
        x: fmt(result),
        regs: { ...p.regs, [key]: result },
        inputMode: false,
        liftFlag: true,
        isError: false,
      });
    } catch (e) {
      return clearShifts({
        ...p,
        x: e instanceof Error ? e.message : "Erro",
        isError: true,
      });
    }
  }
  return clearShifts({
    ...p,
    regs: { ...p.regs, [key]: hpX(p) },
    inputMode: false,
    liftFlag: true,
  });
}

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

type BtnKind = "num" | "op" | "special" | "eq" | "mem" | "sci";

const BTN_COLORS: Record<
  BtnKind,
  { bg: string; hover: string; active: string; color: string }
> = {
  num: {
    bg: "rgba(255,255,255,0.07)",
    hover: "rgba(255,255,255,0.13)",
    active: "rgba(255,255,255,0.05)",
    color: "var(--text-primary)",
  },
  op: {
    bg: "rgba(249,115,22,0.18)",
    hover: "rgba(249,115,22,0.28)",
    active: "rgba(249,115,22,0.12)",
    color: "#fb923c",
  },
  special: {
    bg: "rgba(255,255,255,0.10)",
    hover: "rgba(255,255,255,0.17)",
    active: "rgba(255,255,255,0.07)",
    color: "var(--text-secondary)",
  },
  eq: { bg: "#f97316", hover: "#fb8537", active: "#ea6c0f", color: "#fff" },
  mem: {
    bg: "rgba(99,102,241,0.14)",
    hover: "rgba(99,102,241,0.24)",
    active: "rgba(99,102,241,0.09)",
    color: "#a5b4fc",
  },
  sci: {
    bg: "rgba(255,255,255,0.05)",
    hover: "rgba(255,255,255,0.10)",
    active: "rgba(255,255,255,0.03)",
    color: "var(--text-secondary)",
  },
};

function CalcBtn({
  label,
  onClick,
  kind,
  wide,
  disabled,
}: {
  label: React.ReactNode;
  onClick: () => void;
  kind: BtnKind;
  wide?: boolean;
  disabled?: boolean;
}) {
  const c = BTN_COLORS[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        gridColumn: wide ? "span 2" : "span 1",
        background: c.bg,
        border: "none",
        borderRadius: 10,
        color: c.color,
        fontSize: 15,
        fontWeight: 500,
        height: 48,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        transition: "background 70ms, transform 70ms",
        opacity: disabled ? 0.3 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = c.hover;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = c.bg;
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = c.active;
          e.currentTarget.style.transform = "scale(0.93)";
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = c.hover;
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
    >
      {label}
    </button>
  );
}

interface HPKeyProps {
  main: string;
  fLabel?: string;
  gLabel?: string;
  onClick: () => void;
  variant?: "black" | "wide" | "fkey" | "gkey" | "topfin";
  fontScale?: number;
}

function HPKey({
  main,
  fLabel,
  gLabel,
  onClick,
  variant = "black",
  fontScale = 1,
}: HPKeyProps) {
  const isFKey = variant === "fkey";
  const isGKey = variant === "gkey";
  const isWide = variant === "wide";
  const isTopFin = variant === "topfin";

  // HP-12C autentico:
  //   - f key: laranja brilhante (#f48a1a) com texto preto
  //   - g key: azul (#1f6dc4) com texto branco
  //   - topfin (n, i, PV, PMT, FV): prata escovado, texto branco
  //   - demais teclas: dark grey/preto, texto branco creme
  const baseBg = isFKey
    ? "linear-gradient(180deg, #f9a838 0%, #ed8a18 50%, #c66a08 100%)"
    : isGKey
      ? "linear-gradient(180deg, #4a8edc 0%, #1f6dc4 50%, #0e4d96 100%)"
      : isTopFin
        ? "linear-gradient(180deg, #5e5854 0%, #423d39 55%, #2e2a26 100%)"
        : "linear-gradient(180deg, #2c2a28 0%, #1a1816 60%, #0c0b0a 100%)";

  const labelColor = isFKey
    ? "#1a0a00"
    : isGKey
      ? "#ffffff"
      : isTopFin
        ? "#f4ece0"
        : "#f0e8d8";
  // Anotação superior (f label) em laranja, inferior (g label) em azul claro
  const topAnnotationColor = "#f4a020";
  const bottomAnnotationColor = "#7ec0f4";

  const mainSize =
    (isWide ? 11 : main.length > 3 ? 9 : main.length > 1 ? 11 : 13) * fontScale;
  const annotationSize = 7 * fontScale;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        gridColumn: isWide ? "span 2" : "span 1",
      }}
    >
      <div
        style={{
          height: 9,
          fontSize: annotationSize,
          fontWeight: 700,
          color: topAnnotationColor,
          letterSpacing: "0.04em",
          lineHeight: 1,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {fLabel ?? " "}
      </div>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          height: 30,
          borderRadius: 3,
          background: baseBg,
          border: "1px solid #000",
          boxShadow:
            "0 2px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.45)",
          color: labelColor,
          fontSize: mainSize,
          fontWeight: 700,
          fontFamily:
            "'Helvetica Neue', 'Helvetica', 'Arial Narrow', sans-serif",
          letterSpacing: "0.01em",
          cursor: "pointer",
          userSelect: "none",
          transition: "transform 60ms, box-shadow 60ms",
          padding: 0,
          textTransform: isTopFin ? "none" : undefined,
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "translateY(2px)";
          e.currentTarget.style.boxShadow =
            "0 0 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.5)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow =
            "0 2px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow =
            "0 2px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)";
        }}
      >
        {main}
      </button>
      <div
        style={{
          height: 9,
          fontSize: annotationSize,
          fontWeight: 700,
          color: bottomAnnotationColor,
          letterSpacing: "0.04em",
          lineHeight: 1,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {gLabel ?? " "}
      </div>
    </div>
  );
}

interface Formula {
  name: string;
  formula: string;
  apply?: (input: number) => number;
}
interface FormulaCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  formulas: Formula[];
}

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    id: "financeiras",
    name: "Financeiras",
    icon: DollarSign,
    formulas: [
      { name: "Valor Presente (PV)", formula: "PV = FV / (1+i)ⁿ" },
      { name: "Valor Futuro (FV)", formula: "FV = PV × (1+i)ⁿ" },
      { name: "Parcela (PMT)", formula: "PMT = PV·i / [1−(1+i)⁻ⁿ]" },
      { name: "NPV (VPL)", formula: "NPV = Σ FCₜ/(1+i)ᵗ − I₀" },
      { name: "IRR (TIR)", formula: "0 = Σ FCₜ/(1+IRR)ᵗ − I₀" },
      { name: "Taxa equivalente", formula: "iₑq = (1+i)^(n₁/n₂) − 1" },
      {
        name: "Juros simples",
        formula: "J = P × i × t",
        apply: (n) => n * 0.01,
      },
      { name: "Juros compostos", formula: "M = P × (1+i)ᵗ" },
      { name: "Amortização Price", formula: "PMT = PV · i / [1−(1+i)⁻ⁿ]" },
      { name: "Amortização SAC", formula: "Aₜ = PV/n + saldoₜ · i" },
      { name: "VPL", formula: "VPL = Σ FCₜ/(1+i)ᵗ" },
      { name: "Payback simples", formula: "Σ FCₜ ≥ I₀" },
      { name: "Nominal → Efetiva", formula: "iₑ = (1 + i/m)ᵐ − 1" },
      { name: "Efetiva → Nominal", formula: "i = m·[(1+iₑ)^(1/m) − 1]" },
    ],
  },
  {
    id: "estatisticas",
    name: "Estatísticas",
    icon: Sigma,
    formulas: [
      { name: "Média", formula: "x̄ = Σxᵢ / n" },
      { name: "Mediana", formula: "x_(n+1)/2" },
      { name: "Moda", formula: "valor mais frequente" },
      { name: "Desvio padrão", formula: "σ = √(Σ(xᵢ−x̄)² / n)" },
      { name: "Variância", formula: "σ² = Σ(xᵢ−x̄)² / n" },
      { name: "Coef. variação", formula: "CV = σ / x̄" },
      { name: "Regressão linear", formula: "y = a + b·x" },
      { name: "Correlação", formula: "r = Σ(xy) / √(Σx²·Σy²)" },
    ],
  },
  {
    id: "conversoes",
    name: "Conversões",
    icon: Ruler,
    formulas: [
      { name: "USD → BRL", formula: "$ × cotação_USD = R$" },
      {
        name: "EUR → BRL",
        formula: "€ × cotação_EUR = R$",
        apply: (n) => n * 5.4,
      },
      {
        name: "Metros → Pés",
        formula: "ft = m × 3.28084",
        apply: (n) => n * 3.28084,
      },
      {
        name: "Kg → Libras",
        formula: "lb = kg × 2.20462",
        apply: (n) => n * 2.20462,
      },
      {
        name: "Celsius → Fahrenheit",
        formula: "°F = °C × 9/5 + 32",
        apply: (n) => (n * 9) / 5 + 32,
      },
      {
        name: "Fahrenheit → Celsius",
        formula: "°C = (°F − 32) × 5/9",
        apply: (n) => ((n - 32) * 5) / 9,
      },
      {
        name: "Litros → Galões",
        formula: "gal = L × 0.264172",
        apply: (n) => n * 0.264172,
      },
      {
        name: "kWh → Joules",
        formula: "J = kWh × 3.6e6",
        apply: (n) => n * 3.6e6,
      },
    ],
  },
  {
    id: "matematica",
    name: "Matemática",
    icon: Calculator,
    formulas: [
      {
        name: "Seno (graus)",
        formula: "sin(θ)",
        apply: (n) => Math.sin(toRad(n, true)),
      },
      {
        name: "Cosseno (graus)",
        formula: "cos(θ)",
        apply: (n) => Math.cos(toRad(n, true)),
      },
      {
        name: "Tangente (graus)",
        formula: "tan(θ)",
        apply: (n) => Math.tan(toRad(n, true)),
      },
      {
        name: "Arco-seno",
        formula: "asin(x)",
        apply: (n) => (Math.asin(n) * 180) / Math.PI,
      },
      {
        name: "Arco-cosseno",
        formula: "acos(x)",
        apply: (n) => (Math.acos(n) * 180) / Math.PI,
      },
      {
        name: "Arco-tangente",
        formula: "atan(x)",
        apply: (n) => (Math.atan(n) * 180) / Math.PI,
      },
      {
        name: "Logaritmo natural",
        formula: "ln(x)",
        apply: (n) => Math.log(n),
      },
      {
        name: "Logaritmo decimal",
        formula: "log₁₀(x)",
        apply: (n) => Math.log10(n),
      },
      { name: "Exponencial", formula: "eˣ", apply: (n) => Math.exp(n) },
      {
        name: "Fatorial",
        formula: "n!",
        apply: (n) => {
          if (n < 0 || !Number.isInteger(n)) return NaN;
          let r = 1;
          for (let i = 2; i <= n; i++) r *= i;
          return r;
        },
      },
      { name: "Combinação C(n,k)", formula: "n! / (k!·(n−k)!)" },
      { name: "Permutação P(n,k)", formula: "n! / (n−k)!" },
      { name: "MMC (a,b)", formula: "|a·b| / mdc(a,b)" },
      { name: "MDC (a,b)", formula: "Algoritmo de Euclides" },
    ],
  },
  {
    id: "negocios",
    name: "Negócios",
    icon: Briefcase,
    formulas: [
      {
        name: "Margem (%)",
        formula: "M = (Preço − Custo) / Preço",
        apply: (n) => n / 100,
      },
      { name: "Markup (%)", formula: "Mk = (Preço − Custo) / Custo" },
      {
        name: "Desconto (%)",
        formula: "Pf = P × (1 − d)",
        apply: (n) => n * 0.9,
      },
      { name: "ROI", formula: "ROI = (Ganho − Custo) / Custo" },
      { name: "Lucro líquido", formula: "LL = Receita − Custos − Imp." },
      { name: "Ponto de equilíbrio", formula: "PE = CF / (P − CV)" },
      {
        name: "ICMS",
        formula: "ICMS = Base × alíquota",
        apply: (n) => n * 0.18,
      },
      { name: "Simples Nacional", formula: "DAS = RBT12 × alíq − PD" },
      { name: "Lucro Presumido", formula: "IRPJ = (Receita × %pres) × 15%" },
    ],
  },
  {
    id: "datas",
    name: "Datas",
    icon: CalendarDays,
    formulas: [
      { name: "Diferença em dias", formula: "Δ = (d₂ − d₁) / 86400000" },
      { name: "Dias úteis (BR)", formula: "exclui sáb/dom + feriados" },
      { name: "Idade (anos)", formula: "anos = ⌊hoje − nasc⌋ / 365.25" },
      { name: "Dias corridos", formula: "Δ_total = d₂ − d₁" },
      { name: "Dia da semana", formula: "Zeller / Date.getDay()" },
    ],
  },
];

function SidebarFormulaItem({
  formula,
  onClick,
  applicable,
}: {
  formula: Formula;
  onClick: () => void;
  applicable: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        padding: "6px 8px 6px 24px",
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        marginRight: 8,
        marginBottom: 1,
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        {formula.name}
        {applicable && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              color: "#22c55e",
              fontWeight: 600,
            }}
          >
            •
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.01em",
        }}
      >
        {formula.formula}
      </span>
    </button>
  );
}

const INIT_STATE: StdState = {
  exprParts: "",
  cur: "0",
  isResult: false,
  isError: false,
  prevExpr: "",
};

export function CalculadoraApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [mode, setMode] = useState<CalcMode>("standard");
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(["financeiras", "estatisticas"]),
  );

  const [calc, setCalc] = useState<StdState>(INIT_STATE);
  const [memory, setMemory] = useState(0);
  const [hasMemory, setHasMemory] = useState(false);
  const [degMode, setDegMode] = useState(true);
  const [hp, setHp] = useState<HP12CState>(INIT_HP12C);
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calcRef = useRef(calc);
  calcRef.current = calc;
  const degRef = useRef(degMode);
  degRef.current = degMode;
  const memRef = useRef({ memory, hasMemory });
  memRef.current = { memory, hasMemory };
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const hpRef = useRef(hp);
  hpRef.current = hp;

  useEffect(() => {
    if (!drivers?.data || !userId || !companyId) return;
    void (async () => {
      const { data } = await drivers.data
        .from("calculator_history")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (data) setHistory(data as HistEntry[]);
    })();
  }, [drivers, userId, companyId]);

  function saveToDb(expression: string, result: string) {
    if (!drivers?.data || !userId || !companyId) return;
    const entry: HistEntry = {
      id: crypto.randomUUID(),
      expression,
      result,
      created_at: new Date().toISOString(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, 60));
    void drivers.data
      .from("calculator_history")
      .insert({ user_id: userId, company_id: companyId, expression, result });
  }

  function appendDigit(d: string) {
    setCalc((prev) => {
      if (prev.isError || prev.isResult)
        return { ...INIT_STATE, cur: d === "0" ? "0" : d };
      return { ...prev, cur: prev.cur === "0" ? d : prev.cur + d };
    });
  }

  function appendDecimal() {
    setCalc((prev) => {
      if (prev.isError || prev.isResult) return { ...INIT_STATE, cur: "0." };
      if (prev.cur.includes(".")) return prev;
      return { ...prev, cur: (prev.cur || "0") + "." };
    });
  }

  function pressOperator(op: string) {
    setCalc((prev) => {
      if (prev.isError) return prev;
      const curVal = prev.cur || "0";
      if (prev.isResult)
        return { ...INIT_STATE, exprParts: prev.cur + " " + op + " ", cur: "" };
      if (prev.cur === "" && prev.exprParts !== "") {
        const trimmed = prev.exprParts.replace(/\s*[+\-*/÷×^]\s*$/, "");
        return { ...prev, exprParts: trimmed + " " + op + " " };
      }
      return {
        ...prev,
        exprParts: prev.exprParts + curVal + " " + op + " ",
        cur: "",
      };
    });
  }

  function openParen() {
    setCalc((prev) => {
      if (prev.isError || prev.isResult)
        return { ...INIT_STATE, exprParts: "(" };
      if (prev.cur && prev.cur !== "0")
        return {
          ...prev,
          exprParts: prev.exprParts + prev.cur + " * (",
          cur: "",
        };
      return { ...prev, exprParts: prev.exprParts + "(", cur: "" };
    });
  }

  function closeParen() {
    setCalc((prev) => {
      if (prev.isError || prev.isResult) return prev;
      return {
        ...prev,
        exprParts: prev.exprParts + (prev.cur || "0") + ")",
        cur: "",
      };
    });
  }

  function pressEquals() {
    const s = calcRef.current;
    if (s.isError) return;
    const curVal = s.cur || "0";
    const fullExpr = (s.exprParts + curVal).trim();
    if (!fullExpr || fullExpr === "0") return;
    try {
      const n = safeCalc(fullExpr);
      const resultStr = fmt(n);
      setCalc({
        exprParts: "",
        cur: resultStr,
        isResult: true,
        isError: false,
        prevExpr: fullExpr,
      });
      saveToDb(fmtExpr(fullExpr), resultStr);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      setCalc((prev) => ({
        ...prev,
        cur: msg,
        isResult: false,
        isError: true,
        prevExpr: fmtExpr(prev.exprParts + curVal),
      }));
    }
  }

  function clearAll() {
    setCalc(INIT_STATE);
  }

  function deleteLast() {
    setCalc((prev) => {
      if (prev.isResult || prev.isError) return INIT_STATE;
      if (prev.cur.length > 1) return { ...prev, cur: prev.cur.slice(0, -1) };
      if (prev.cur.length === 1) return { ...prev, cur: "0" };
      return {
        ...prev,
        exprParts: prev.exprParts.replace(/\s*[+\-*/÷×^]\s*$/, "").trimEnd(),
        cur: "0",
      };
    });
  }

  function toggleSign() {
    setCalc((prev) => {
      if (prev.isError || !prev.cur || prev.cur === "0") return prev;
      return {
        ...prev,
        cur: prev.cur.startsWith("-") ? prev.cur.slice(1) : "-" + prev.cur,
      };
    });
  }

  function percent() {
    setCalc((prev) => {
      if (prev.isError || !prev.cur) return prev;
      const n = parseFloat(prev.cur);
      if (isNaN(n)) return prev;
      return { ...prev, cur: fmt(n / 100) };
    });
  }

  function applySci(fn: (n: number) => number) {
    setCalc((prev) => {
      if (prev.isError) return prev;
      const n = parseFloat(prev.cur || "0");
      if (isNaN(n)) return prev;
      try {
        const r = fn(n);
        if (!isFinite(r) || isNaN(r)) throw new Error("Indefinido");
        return { ...prev, cur: fmt(r), isResult: false };
      } catch {
        return { ...prev, cur: "Indefinido", isError: true };
      }
    });
  }

  function applyFormula(formula: Formula) {
    if (!formula.apply) return;
    if (mode === "hp12c") {
      setHp((prev) => {
        if (prev.isError) return prev;
        const xv = hpX(prev);
        const apply = formula.apply;
        if (!apply) return prev;
        try {
          const r = apply(xv);
          if (!isFinite(r) || isNaN(r)) throw new Error("Indefinido");
          return clearShifts({
            ...prev,
            x: fmt(r),
            inputMode: false,
            liftFlag: true,
            isError: false,
          });
        } catch {
          return clearShifts({ ...prev, x: "Indefinido", isError: true });
        }
      });
      return;
    }
    applySci(formula.apply);
  }

  function memClear() {
    setMemory(0);
    setHasMemory(false);
  }
  function memRecall() {
    setCalc((prev) => {
      if (prev.isResult || prev.isError)
        return { ...INIT_STATE, cur: fmt(memRef.current.memory) };
      return { ...prev, cur: fmt(memRef.current.memory) };
    });
  }
  function memAdd() {
    const n = parseFloat(calcRef.current.cur || "0");
    if (!isNaN(n)) {
      setMemory((m) => m + n);
      setHasMemory(true);
    }
  }
  function memSub() {
    const n = parseFloat(calcRef.current.cur || "0");
    if (!isNaN(n)) {
      setMemory((m) => m - n);
      setHasMemory(true);
    }
  }

  function copyResult() {
    const val =
      modeRef.current === "hp12c" ? hpRef.current.x : calcRef.current.cur;
    void navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    });
  }

  function clearHistory() {
    setHistory([]);
    if (!drivers?.data || !userId || !companyId) return;
    void drivers.data
      .from("calculator_history")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", companyId);
  }

  function useHistEntry(entry: HistEntry) {
    setCalc({
      ...INIT_STATE,
      cur: entry.result,
      isResult: true,
      prevExpr: entry.expression,
    });
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (modeRef.current === "hp12c") return;
    const { key } = e;
    if (key >= "0" && key <= "9") {
      appendDigit(key);
      return;
    }
    if (key === ".") {
      appendDecimal();
      return;
    }
    if (key === "+") {
      pressOperator("+");
      return;
    }
    if (key === "-") {
      pressOperator("-");
      return;
    }
    if (key === "*") {
      pressOperator("*");
      return;
    }
    if (key === "^") {
      pressOperator("^");
      return;
    }
    if (key === "(") {
      openParen();
      return;
    }
    if (key === ")") {
      closeParen();
      return;
    }
    if (key === "%") {
      percent();
      return;
    }
    if (key === "Enter" || key === "=") {
      e.preventDefault();
      pressEquals();
      return;
    }
    if (key === "Backspace") {
      deleteLast();
      return;
    }
    if (key === "Escape") {
      clearAll();
      return;
    }
    if (key === "/") {
      e.preventDefault();
      pressOperator("/");
      return;
    }
    if (key === "c" || key === "C") {
      copyResult();
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const displayExpr = calc.isResult
    ? fmtExpr(calc.prevExpr) + " ="
    : calc.isError
      ? fmtExpr(calc.prevExpr)
      : fmtExpr(calc.exprParts);
  const displayMain = calc.isError ? calc.cur : calc.cur || "0";
  const mainFontSize =
    displayMain.length > 12 ? 20 : displayMain.length > 9 ? 24 : 30;
  const isSci = mode === "scientific";
  const hpDisplay = hp.isError ? hp.x : hp.x || "0";
  const hpFontSize =
    hpDisplay.length > 12 ? 22 : hpDisplay.length > 9 ? 26 : 32;
  const fmtReg = (v: number | null) => (v === null ? "—" : fmt(v));

  const modeLabels: Record<CalcMode, string> = {
    standard: "Padrão",
    scientific: "Científica",
    hp12c: "HP 12C Financeira",
  };

  const sciRows: React.ReactNode[] = isSci
    ? [
        <CalcBtn
          key="sin"
          label="sin"
          kind="sci"
          onClick={() => applySci((n) => Math.sin(toRad(n, degRef.current)))}
        />,
        <CalcBtn
          key="cos"
          label="cos"
          kind="sci"
          onClick={() => applySci((n) => Math.cos(toRad(n, degRef.current)))}
        />,
        <CalcBtn
          key="tan"
          label="tan"
          kind="sci"
          onClick={() => applySci((n) => Math.tan(toRad(n, degRef.current)))}
        />,
        <CalcBtn
          key="log"
          label="log"
          kind="sci"
          onClick={() =>
            applySci((n) => {
              if (n <= 0) throw new Error("Indefinido");
              return Math.log10(n);
            })
          }
        />,
        <CalcBtn key="mc" label="MC" kind="mem" onClick={memClear} />,
        <CalcBtn
          key="mr"
          label="MR"
          kind="mem"
          onClick={memRecall}
          disabled={!hasMemory}
        />,
        <CalcBtn key="mm" label="M−" kind="mem" onClick={memSub} />,
        <CalcBtn key="mp" label="M+" kind="mem" onClick={memAdd} />,
      ]
    : [];

  const stdButtons: React.ReactNode[] = [
    <CalcBtn key="c" label="C" kind="special" onClick={clearAll} />,
    <CalcBtn key="del" label="⌫" kind="special" onClick={deleteLast} />,
    <CalcBtn key="pct" label="%" kind="special" onClick={percent} />,
    <CalcBtn
      key="div"
      label="÷"
      kind="op"
      onClick={() => pressOperator("/")}
    />,
    <CalcBtn key="7" label="7" kind="num" onClick={() => appendDigit("7")} />,
    <CalcBtn key="8" label="8" kind="num" onClick={() => appendDigit("8")} />,
    <CalcBtn key="9" label="9" kind="num" onClick={() => appendDigit("9")} />,
    <CalcBtn
      key="mul"
      label="×"
      kind="op"
      onClick={() => pressOperator("*")}
    />,
    <CalcBtn key="4" label="4" kind="num" onClick={() => appendDigit("4")} />,
    <CalcBtn key="5" label="5" kind="num" onClick={() => appendDigit("5")} />,
    <CalcBtn key="6" label="6" kind="num" onClick={() => appendDigit("6")} />,
    <CalcBtn
      key="sub"
      label="−"
      kind="op"
      onClick={() => pressOperator("-")}
    />,
    <CalcBtn key="1" label="1" kind="num" onClick={() => appendDigit("1")} />,
    <CalcBtn key="2" label="2" kind="num" onClick={() => appendDigit("2")} />,
    <CalcBtn key="3" label="3" kind="num" onClick={() => appendDigit("3")} />,
    <CalcBtn
      key="add"
      label="+"
      kind="op"
      onClick={() => pressOperator("+")}
    />,
    isSci ? (
      <CalcBtn
        key="sqrt"
        label="√"
        kind="sci"
        onClick={() =>
          applySci((n) => {
            if (n < 0) throw new Error("Indefinido");
            return Math.sqrt(n);
          })
        }
      />
    ) : (
      <CalcBtn key="sgn" label="±" kind="special" onClick={toggleSign} />
    ),
    <CalcBtn key="lp" label="(" kind="special" onClick={openParen} />,
    <CalcBtn key="rp" label=")" kind="special" onClick={closeParen} />,
    <CalcBtn
      key="pow"
      label="xⁿ"
      kind="sci"
      onClick={() => pressOperator("^")}
    />,
    <CalcBtn
      key="0"
      label="0"
      kind="num"
      wide
      onClick={() => appendDigit("0")}
    />,
    <CalcBtn key="dot" label="." kind="num" onClick={appendDecimal} />,
    <CalcBtn key="eq" label="=" kind="eq" onClick={pressEquals} />,
  ];

  const navItems: { id: CalcMode; label: string; icon: LucideIcon }[] = [
    { id: "standard", label: "Padrão", icon: Calculator },
    { id: "scientific", label: "Científica", icon: FlaskConical },
    { id: "hp12c", label: "HP 12C", icon: DollarSign },
  ];

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FORMULA_CATEGORIES;
    return FORMULA_CATEGORIES.map((cat) => ({
      ...cat,
      formulas: cat.formulas.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.formula.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.formulas.length > 0);
  }, [search]);

  const totalFormulasCount = useMemo(
    () => FORMULA_CATEGORIES.reduce((sum, cat) => sum + cat.formulas.length, 0),
    [],
  );

  const expandedSidebar = (
    <aside style={{ ...ASIDE_STYLE, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          flexShrink: 0,
        }}
      >
        <Calculator
          size={18}
          strokeWidth={1.6}
          style={{ color: "var(--text-primary)", flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display)",
          }}
        >
          Calculadora
        </span>
      </div>

      <div style={{ padding: "4px 0 8px 8px" }}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              style={{
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
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 8px 4px 16px",
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
          Fórmulas
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            paddingRight: 8,
          }}
        >
          {totalFormulasCount}
        </span>
      </div>

      <div style={{ padding: "0 8px 0 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 8,
            padding: "5px 8px",
            marginBottom: 6,
          }}
        >
          <Search size={11} color="rgba(255,255,255,0.30)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fórmula..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.80)",
              fontSize: 11,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ padding: "0 0 160px 8px", flex: 1 }}>
        {filteredCategories.map((cat) => {
          const isExpanded =
            expandedCats.has(cat.id) || search.trim().length > 0;
          const Icon = cat.icon;
          return (
            <div key={cat.id} style={{ marginBottom: 2 }}>
              <button
                type="button"
                onClick={() =>
                  setExpandedCats((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  })
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  background: "transparent",
                  border: "1px solid transparent",
                  borderRadius: 8,
                  marginRight: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
                <Icon
                  size={13}
                  style={{ flexShrink: 0, color: "var(--text-tertiary)" }}
                />
                <span style={{ flex: 1 }}>{cat.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontWeight: 400,
                  }}
                >
                  {cat.formulas.length}
                </span>
              </button>
              {isExpanded &&
                cat.formulas.map((f) => (
                  <SidebarFormulaItem
                    key={f.name}
                    formula={f}
                    applicable={!!f.apply}
                    onClick={() => applyFormula(f)}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );

  const collapsedSidebar = (
    <aside style={{ ...ASIDE_STYLE, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 14px 12px",
          flexShrink: 0,
        }}
      >
        <Calculator
          size={18}
          strokeWidth={1.6}
          style={{ color: "var(--text-primary)" }}
        />
      </div>
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 0",
          gap: 2,
        }}
      >
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setMode(id)}
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
        <div
          style={{
            height: 1,
            width: 28,
            background: "rgba(255,255,255,0.08)",
            margin: "4px 0",
          }}
        />
        {FORMULA_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              title={cat.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
              }}
            >
              <Icon size={14} />
            </div>
          );
        })}
      </nav>
    </aside>
  );

  const historyPanel = (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(249,115,22,0.10)",
            border: "1px solid rgba(249,115,22,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Clock size={13} style={{ color: "#fb923c" }} />
        </div>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Histórico
        </span>
        <button
          type="button"
          aria-label="Limpar histórico"
          onClick={clearHistory}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "flex",
            padding: 3,
            borderRadius: 5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div
        style={{ overflowY: "auto", maxHeight: 520, scrollbarWidth: "thin" }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
            }}
          >
            Nenhum cálculo ainda
          </div>
        ) : (
          history.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => useHistEntry(h)}
              style={{
                width: "100%",
                textAlign: "right",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                padding: "8px 12px",
                cursor: "pointer",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fmtExpr(h.expression)}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {h.result}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const hp12cCalc = (
    <div
      style={{
        width: 420,
        borderRadius: 14,
        // HP-12C clássico: corpo bronze/preto com gradiente sutil
        background:
          "linear-gradient(180deg, #2b2520 0%, #1f1a16 22%, #14110e 100%)",
        border: "1px solid #050403",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(220,180,120,0.18), inset 0 -1px 0 rgba(0,0,0,0.6)",
        overflow: "hidden",
        padding: "0 0 16px 0",
        fontFamily: "var(--font-display, 'Helvetica Neue', sans-serif)",
        position: "relative",
      }}
    >
      {/* Faixa dourada fina no topo — assinatura visual do HP-12C */}
      <div
        style={{
          height: 4,
          background:
            "linear-gradient(180deg, #e6c878 0%, #c89030 50%, #8a5e18 100%)",
          boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.45)",
        }}
      />

      {/* Header: HEWLETT · PACKARD + hp 12c em dourado */}
      <div
        style={{
          padding: "10px 18px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: "#c89438",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          HEWLETT · PACKARD
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontStyle: "italic",
              fontSize: 26,
              fontWeight: 700,
              color: "#e8c878",
              letterSpacing: "-0.05em",
              lineHeight: 1,
              textShadow: "0 1px 0 rgba(0,0,0,0.5)",
            }}
          >
            hp
          </span>
          <span
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#e8c878",
              letterSpacing: "0.04em",
              lineHeight: 1,
              textShadow: "0 1px 0 rgba(0,0,0,0.5)",
            }}
          >
            12C
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "0 18px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: "#9c7028",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          Financial Calculator
        </span>
      </div>

      <div
        style={{
          // LCD verde-acinzentado clássico HP-12C
          margin: "0 18px 14px",
          background:
            "linear-gradient(180deg, #b6c4a8 0%, #9bab8e 60%, #8a9c80 100%)",
          border: "2px solid #0a0806",
          borderRadius: 3,
          boxShadow:
            "inset 0 2px 5px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(220,180,120,0.10)",
          padding: "9px 14px 7px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "#3a4030",
            textAlign: "right",
            minHeight: 11,
            marginBottom: 2,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {hp.y !== 0 ? `y: ${fmt(hp.y)}` : " "}
        </div>
        <div
          style={{
            fontSize: hpFontSize,
            fontWeight: 700,
            textAlign: "right",
            color: hp.isError ? "#3a0a0a" : "#1a1a1a",
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            letterSpacing: "0.04em",
            lineHeight: 1.05,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {hpDisplay}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              fontSize: 8,
              color: "#3a4030",
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            {hp.shiftF && <span style={{ color: "#a05010" }}>f</span>}
            {hp.shiftG && <span style={{ color: "#1e4080" }}>g</span>}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(
              [
                ["n", "n"],
                ["i", "i"],
                ["PV", "pv"],
                ["PMT", "pmt"],
                ["FV", "fv"],
              ] as [string, FinKey][]
            ).map(([lbl, key]) => (
              <span
                key={key}
                style={{
                  fontSize: 8,
                  padding: "1px 4px",
                  borderRadius: 2,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  background:
                    hp.regs[key] !== null
                      ? "rgba(60,80,40,0.25)"
                      : "transparent",
                  color: hp.regs[key] !== null ? "#1a3010" : "#5a6048",
                }}
              >
                {lbl}={fmtReg(hp.regs[key])}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 4px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 5,
          }}
        >
          <HPKey
            main="N"
            fLabel="AMORT"
            gLabel="12×"
            onClick={() => setHp((p) => hpFinKey("n", p))}
            variant="topfin"
          />
          <HPKey
            main="i"
            fLabel="INT"
            gLabel="12÷"
            onClick={() => setHp((p) => hpFinKey("i", p))}
            variant="topfin"
          />
          <HPKey
            main="PV"
            fLabel="NPV"
            gLabel="CFo"
            onClick={() => setHp((p) => hpFinKey("pv", p))}
            variant="topfin"
          />
          <HPKey
            main="PMT"
            fLabel="RND"
            gLabel="CFj"
            onClick={() => setHp((p) => hpFinKey("pmt", p))}
            variant="topfin"
          />
          <HPKey
            main="FV"
            fLabel="IRR"
            gLabel="Nj"
            onClick={() => setHp((p) => hpFinKey("fv", p))}
            variant="topfin"
          />

          <HPKey
            main="CHS"
            fLabel="RPN"
            gLabel="DEC"
            onClick={() => setHp((p) => hpCHS(p))}
          />
          <HPKey
            main="7"
            fLabel="BEG"
            gLabel="LSTx"
            onClick={() => setHp((p) => hpDigit("7", p))}
          />
          <HPKey
            main="8"
            fLabel="END"
            gLabel="x≷y"
            onClick={() => setHp((p) => hpDigit("8", p))}
          />
          <HPKey
            main="9"
            fLabel="MEM"
            gLabel="R↓"
            onClick={() => setHp((p) => hpDigit("9", p))}
          />
          <HPKey
            main="÷"
            fLabel="MOD"
            gLabel="x²"
            onClick={() => setHp((p) => hpBinOp("/", p))}
          />

          <HPKey
            main="CLX"
            fLabel="REG"
            gLabel="PRGM"
            onClick={() => setHp((p) => hpCLX(p))}
          />
          <HPKey
            main="4"
            fLabel="D.MY"
            gLabel="ΔDYS"
            onClick={() => setHp((p) => hpDigit("4", p))}
          />
          <HPKey
            main="5"
            fLabel="M.DY"
            gLabel="DATE"
            onClick={() => setHp((p) => hpDigit("5", p))}
          />
          <HPKey
            main="6"
            fLabel="WTD"
            gLabel="%T"
            onClick={() => setHp((p) => hpDigit("6", p))}
          />
          <HPKey
            main="×"
            fLabel="x̄,σ"
            gLabel="x²"
            onClick={() => setHp((p) => hpBinOp("*", p))}
          />

          <HPKey
            main="ENTER"
            fLabel="PSE"
            gLabel="(i)"
            onClick={() => setHp((p) => hpEnter(p))}
            variant="wide"
          />
          <HPKey
            main="1"
            fLabel="x≷y"
            gLabel="∑+"
            onClick={() => setHp((p) => hpDigit("1", p))}
          />
          <HPKey
            main="2"
            fLabel="R↓"
            gLabel="∑−"
            onClick={() => setHp((p) => hpDigit("2", p))}
          />
          <HPKey
            main="3"
            fLabel="R↑"
            gLabel="ŷ,r"
            onClick={() => setHp((p) => hpDigit("3", p))}
          />
          <HPKey
            main="−"
            fLabel="Σ"
            gLabel="EEX"
            onClick={() => setHp((p) => hpBinOp("-", p))}
          />

          <HPKey
            main="f"
            onClick={() =>
              setHp((p) => ({ ...p, shiftF: !p.shiftF, shiftG: false }))
            }
            variant="fkey"
          />
          <HPKey
            main="g"
            onClick={() =>
              setHp((p) => ({ ...p, shiftG: !p.shiftG, shiftF: false }))
            }
            variant="gkey"
          />
          <HPKey
            main="0"
            fLabel="x!"
            gLabel="MEAN"
            onClick={() => setHp((p) => hpDigit("0", p))}
          />
          <HPKey
            main="."
            fLabel="ŷ,r"
            gLabel="s"
            onClick={() => setHp((p) => hpDot(p))}
          />
          <HPKey
            main="+"
            fLabel="LST"
            gLabel="R↓"
            onClick={() => setHp((p) => hpRollDown(p))}
          />
        </div>
      </div>

      <div style={{ padding: "10px 18px 0" }}>
        <button
          type="button"
          onClick={() =>
            setHp((p) =>
              clearShifts({
                ...p,
                regs: { n: null, i: null, pv: null, pmt: null, fv: null },
              }),
            )
          }
          style={{
            width: "100%",
            padding: "5px",
            borderRadius: 3,
            border: "1px solid #000",
            background:
              "linear-gradient(180deg, #1c1a18 0%, #110f0d 60%, #060504 100%)",
            color: "#c89438",
            fontSize: 8,
            cursor: "pointer",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
            boxShadow:
              "0 1px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(220,180,120,0.14)",
          }}
        >
          Limpar Registros Financeiros
        </button>
      </div>
    </div>
  );

  const stdCalc = (
    <div
      style={{
        width: 320,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.02)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ padding: "14px 14px 12px", background: "rgba(0,0,0,0.2)" }}>
        <div
          style={{
            minHeight: 14,
            textAlign: "right",
            marginBottom: 4,
            fontSize: 11,
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayExpr || " "}
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: mainFontSize,
            fontWeight: 700,
            color: calc.isError ? "#f87171" : "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "font-size 100ms",
          }}
        >
          {displayMain}
        </div>
        {isSci && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {hasMemory ? (
              <span style={{ fontSize: 10, color: "#a5b4fc" }}>
                M = {fmt(memory)}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setDegMode((v) => !v)}
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                border: "none",
                background: "rgba(255,255,255,0.07)",
                color: "var(--text-tertiary)",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {degMode ? "DEG" : "RAD"}
            </button>
          </div>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 4,
          padding: "8px 10px 12px",
        }}
      >
        {sciRows}
        {stdButtons}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "#191d21",
        color: "var(--text-primary)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "visible",
          transition: "width 250ms ease",
          position: "relative",
        }}
      >
        {collapsed ? collapsedSidebar : expandedSidebar}

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
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
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
          {mode === "standard" && (
            <Calculator size={14} style={{ color: "#fb923c", flexShrink: 0 }} />
          )}
          {mode === "scientific" && (
            <FlaskConical
              size={14}
              style={{ color: "#a5b4fc", flexShrink: 0 }}
            />
          )}
          {mode === "hp12c" && (
            <DollarSign size={14} style={{ color: "#e8b840", flexShrink: 0 }} />
          )}
          <h2
            style={{
              margin: "0 12px 0 0",
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
              minWidth: 80,
            }}
          >
            {modeLabels[mode]}
          </h2>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontWeight: 400,
              whiteSpace: "nowrap",
            }}
          >
            {mode === "hp12c"
              ? "RPN · Notação Polonesa Reversa"
              : mode === "scientific"
                ? "Funções avançadas"
                : "Aritmética básica"}
          </span>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={copyResult}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.09)",
              background: copied
                ? "rgba(16,185,129,0.15)"
                : "rgba(255,255,255,0.05)",
              color: copied ? "#6ee7b7" : "rgba(255,255,255,0.65)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 120ms",
              fontWeight: 500,
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px 160px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {mode === "hp12c" ? hp12cCalc : stdCalc}
            </div>
            {historyPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
