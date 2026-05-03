import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Grid3x3,
  Plus,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type CellAlign = "left" | "center" | "right";

interface CellData {
  value: string;
  formula: string;
  bold: boolean;
  italic: boolean;
  align: CellAlign;
  bg: string;
}

type CellMap = Record<string, CellData>;

interface SheetTab {
  name: string;
  cells: CellMap;
}

interface Spreadsheet {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  sheets: SheetTab[];
  created_at: string;
  updated_at: string;
}

interface DbSpreadsheet {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  sheets: SheetTab[];
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;
const COLS = 26; // A-Z
const ROWS = 50;
const COL_W = 80;
const ROW_H = 26;
const ROW_HEADER_W = 44;
const COL_HEADER_H = 26;
const ACCENT = "#10b981";

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

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18];

const CELL_BG_COLORS = [
  "transparent",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

// ─── Formula Engine ───────────────────────────────────────────────────────────

function colIndexToLetter(idx: number): string {
  return String.fromCharCode(65 + idx);
}

function cellRefToCoords(ref: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase());
  if (!match || !match[1] || !match[2]) return null;
  const colStr: string = match[1];
  const rowNum = parseInt(match[2], 10) - 1;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;
  return { row: rowNum, col };
}

function expandRange(
  startRef: string,
  endRef: string,
  cells: CellMap,
): number[] {
  const start = cellRefToCoords(startRef);
  const end = cellRefToCoords(endRef);
  if (!start || !end) return [];
  const values: number[] = [];
  for (let r = start.row; r <= end.row; r++) {
    for (let c = start.col; c <= end.col; c++) {
      const ref = `${colIndexToLetter(c)}${r + 1}`;
      const raw = cells[ref]?.value ?? "";
      const n = parseFloat(raw);
      if (!isNaN(n)) values.push(n);
    }
  }
  return values;
}

function getCellNumericValue(ref: string, cells: CellMap): number {
  const cell = cells[ref.toUpperCase()];
  if (!cell) return 0;
  const n = parseFloat(cell.value);
  return isNaN(n) ? 0 : n;
}

function evaluateFormula(formula: string, cells: CellMap): string {
  if (!formula.startsWith("=")) return formula;
  const expr = formula.slice(1).trim();

  // SUM, AVERAGE, COUNT, MAX, MIN with range
  const fnRangeMatch =
    /^(SUM|AVERAGE|COUNT|MAX|MIN)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i.exec(expr);
  if (fnRangeMatch && fnRangeMatch[1] && fnRangeMatch[2] && fnRangeMatch[3]) {
    const fn: string = fnRangeMatch[1].toUpperCase();
    const nums = expandRange(fnRangeMatch[2], fnRangeMatch[3], cells);
    if (nums.length === 0) return "0";
    switch (fn) {
      case "SUM":
        return String(nums.reduce((a, b) => a + b, 0));
      case "AVERAGE":
        return String(nums.reduce((a, b) => a + b, 0) / nums.length);
      case "COUNT":
        return String(nums.length);
      case "MAX":
        return String(Math.max(...nums));
      case "MIN":
        return String(Math.min(...nums));
    }
  }

  // Simple binary: A1+B1, A1-B1, A1*B1, A1/B1, A1*2, 3*B2
  const binMatch =
    /^([A-Z]+\d+|\d+(?:\.\d+)?)\s*([+\-*/])\s*([A-Z]+\d+|\d+(?:\.\d+)?)$/i.exec(
      expr,
    );
  if (binMatch && binMatch[1] && binMatch[2] && binMatch[3]) {
    const leftRaw: string = binMatch[1];
    const op: string = binMatch[2];
    const rightRaw: string = binMatch[3];

    const leftVal = /^[A-Z]/i.test(leftRaw)
      ? getCellNumericValue(leftRaw.toUpperCase(), cells)
      : parseFloat(leftRaw);
    const rightVal = /^[A-Z]/i.test(rightRaw)
      ? getCellNumericValue(rightRaw.toUpperCase(), cells)
      : parseFloat(rightRaw);

    if (isNaN(leftVal) || isNaN(rightVal)) return "#VALUE!";
    switch (op) {
      case "+":
        return String(leftVal + rightVal);
      case "-":
        return String(leftVal - rightVal);
      case "*":
        return String(leftVal * rightVal);
      case "/":
        return rightVal === 0 ? "#DIV/0!" : String(leftVal / rightVal);
    }
  }

  // Cell reference only: =A1
  const singleRef = /^([A-Z]+\d+)$/i.exec(expr);
  if (singleRef && singleRef[1]) {
    return cells[singleRef[1].toUpperCase()]?.value ?? "";
  }

  // Numeric literal: =42
  const numLit = /^(\d+(?:\.\d+)?)$/.exec(expr);
  if (numLit && numLit[1]) return numLit[1];

  return "#ERROR!";
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.35)",
        fontSize: 13,
      }}
    >
      Carregando…
    </div>
  );
}

// ─── Empty state (no active spreadsheet) ─────────────────────────────────────

function EmptyContent({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 32,
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
        <Grid3x3 size={24} color={ACCENT} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Nenhuma planilha aberta
        </p>
        <p
          style={{
            color: "var(--text-tertiary)",
            fontSize: 12,
            margin: "6px 0 0",
          }}
        >
          Crie uma nova planilha ou selecione uma existente.
        </p>
      </div>
      <button
        type="button"
        onClick={onNew}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 18px",
          borderRadius: 8,
          background: ACCENT,
          border: "none",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Plus size={14} />
        Nova planilha
      </button>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

interface ToolbarProps {
  bold: boolean;
  italic: boolean;
  align: CellAlign;
  fontSize: number;
  bg: string;
  onBold: () => void;
  onItalic: () => void;
  onAlign: (a: CellAlign) => void;
  onFontSize: (s: number) => void;
  onBg: (c: string) => void;
  disabled: boolean;
}

function Toolbar({
  bold,
  italic,
  align,
  fontSize,
  bg,
  onBold,
  onItalic,
  onAlign,
  onFontSize,
  onBg,
  disabled,
}: ToolbarProps) {
  const [showBgPicker, setShowBgPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showBgPicker) return;
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowBgPicker(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showBgPicker]);

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 26,
    borderRadius: 5,
    border: "none",
    cursor: disabled ? "default" : "pointer",
    transition: "background 100ms",
    flexShrink: 0,
  };

  const separator: React.CSSProperties = {
    width: 1,
    height: 18,
    background: "rgba(255,255,255,0.10)",
    margin: "0 4px",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "4px 16px",
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {/* Bold */}
      <button
        type="button"
        aria-label="Negrito"
        aria-pressed={bold}
        disabled={disabled}
        onClick={onBold}
        style={{
          ...btnBase,
          background: bold ? "rgba(16,185,129,0.20)" : "transparent",
          color: bold ? ACCENT : "rgba(255,255,255,0.65)",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <Bold size={13} />
      </button>

      {/* Italic */}
      <button
        type="button"
        aria-label="Itálico"
        aria-pressed={italic}
        disabled={disabled}
        onClick={onItalic}
        style={{
          ...btnBase,
          background: italic ? "rgba(16,185,129,0.20)" : "transparent",
          color: italic ? ACCENT : "rgba(255,255,255,0.65)",
          fontStyle: "italic",
          fontSize: 13,
        }}
      >
        <Italic size={13} />
      </button>

      <div style={separator} />

      {/* Align left */}
      <button
        type="button"
        aria-label="Alinhar à esquerda"
        aria-pressed={align === "left"}
        disabled={disabled}
        onClick={() => onAlign("left")}
        style={{
          ...btnBase,
          background:
            align === "left" ? "rgba(16,185,129,0.20)" : "transparent",
          color: align === "left" ? ACCENT : "rgba(255,255,255,0.65)",
        }}
      >
        <AlignLeft size={13} />
      </button>

      {/* Align center */}
      <button
        type="button"
        aria-label="Centralizar"
        aria-pressed={align === "center"}
        disabled={disabled}
        onClick={() => onAlign("center")}
        style={{
          ...btnBase,
          background:
            align === "center" ? "rgba(16,185,129,0.20)" : "transparent",
          color: align === "center" ? ACCENT : "rgba(255,255,255,0.65)",
        }}
      >
        <AlignCenter size={13} />
      </button>

      {/* Align right */}
      <button
        type="button"
        aria-label="Alinhar à direita"
        aria-pressed={align === "right"}
        disabled={disabled}
        onClick={() => onAlign("right")}
        style={{
          ...btnBase,
          background:
            align === "right" ? "rgba(16,185,129,0.20)" : "transparent",
          color: align === "right" ? ACCENT : "rgba(255,255,255,0.65)",
        }}
      >
        <AlignRight size={13} />
      </button>

      <div style={separator} />

      {/* Font size */}
      <select
        aria-label="Tamanho da fonte"
        disabled={disabled}
        value={fontSize}
        onChange={(e) => onFontSize(parseInt(e.target.value, 10))}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 5,
          color: "rgba(255,255,255,0.75)",
          fontSize: 12,
          padding: "2px 4px",
          height: 26,
          cursor: disabled ? "default" : "pointer",
          outline: "none",
        }}
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div style={separator} />

      {/* Background color */}
      <div style={{ position: "relative" }} ref={pickerRef}>
        <button
          type="button"
          aria-label="Cor de fundo da célula"
          disabled={disabled}
          onClick={() => !disabled && setShowBgPicker((v) => !v)}
          style={{
            ...btnBase,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: bg === "transparent" ? "rgba(255,255,255,0.20)" : bg,
              border: "1px solid rgba(255,255,255,0.20)",
            }}
          />
        </button>
        {showBgPicker && (
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 0,
              zIndex: 200,
              background: "rgba(8,12,22,0.98)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              padding: "8px 10px",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              width: 168,
            }}
          >
            {CELL_BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c === "transparent" ? "Sem cor" : c}
                onClick={() => {
                  onBg(c);
                  setShowBgPicker(false);
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background:
                    c === "transparent" ? "rgba(255,255,255,0.12)" : c,
                  border:
                    bg === c
                      ? "2px solid white"
                      : "1.5px solid rgba(255,255,255,0.20)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sheet Grid ───────────────────────────────────────────────────────────────

interface GridProps {
  cells: CellMap;
  selectedCell: string;
  editingCell: string | null;
  editValue: string;
  fontSize: number;
  onSelectCell: (ref: string) => void;
  onStartEdit: (ref: string) => void;
  onEditChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onKeyNavigation: (ref: string, key: string) => void;
}

function SheetGrid({
  cells,
  selectedCell,
  editingCell,
  editValue,
  fontSize,
  onSelectCell,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onKeyNavigation,
}: GridProps) {
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  const colLetters = useMemo(() => {
    return Array.from({ length: COLS }, (_, i) => colIndexToLetter(i));
  }, []);

  const rowNums = useMemo(() => {
    return Array.from({ length: ROWS }, (_, i) => i + 1);
  }, []);

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLDivElement>,
    ref: string,
  ) {
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      onStartEdit(ref);
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Tab"
    ) {
      e.preventDefault();
      onKeyNavigation(ref, e.key);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      onStartEdit(ref);
    }
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    ref: string,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommitEdit();
      onKeyNavigation(ref, "ArrowDown");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onCommitEdit();
      onKeyNavigation(ref, "Tab");
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit();
    }
  }

  return (
    <div
      style={{
        flex: 1,
        overflowX: "auto",
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.12) transparent",
        paddingBottom: 160,
      }}
    >
      <div
        style={{
          display: "inline-block",
          minWidth: "100%",
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: "flex",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#191d21",
          }}
        >
          {/* Corner */}
          <div
            style={{
              width: ROW_HEADER_W,
              height: COL_HEADER_H,
              flexShrink: 0,
              borderRight: "1px solid rgba(255,255,255,0.10)",
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.02)",
            }}
          />
          {colLetters.map((letter) => (
            <div
              key={letter}
              style={{
                width: COL_W,
                height: COL_HEADER_H,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.45)",
                borderRight: "1px solid rgba(255,255,255,0.07)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.02)",
                userSelect: "none",
              }}
            >
              {letter}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rowNums.map((rowNum) => (
          <div key={rowNum} style={{ display: "flex" }}>
            {/* Row header */}
            <div
              style={{
                width: ROW_HEADER_W,
                height: ROW_H,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                borderRight: "1px solid rgba(255,255,255,0.10)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
                userSelect: "none",
                position: "sticky",
                left: 0,
                zIndex: 5,
              }}
            >
              {rowNum}
            </div>

            {/* Cells */}
            {colLetters.map((letter) => {
              const ref = `${letter}${rowNum}`;
              const cell = cells[ref];
              const isSelected = selectedCell === ref;
              const isEditing = editingCell === ref;
              const displayValue =
                cell?.formula && cell.formula.startsWith("=")
                  ? evaluateFormula(cell.formula, cells)
                  : (cell?.value ?? "");
              const cellBg =
                cell?.bg && cell.bg !== "transparent" ? cell.bg : "transparent";

              return (
                <div
                  key={ref}
                  role="gridcell"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!isEditing) onSelectCell(ref);
                  }}
                  onDoubleClick={() => onStartEdit(ref)}
                  onKeyDown={(e) => {
                    if (!isEditing) handleCellKeyDown(e, ref);
                  }}
                  style={{
                    width: COL_W,
                    height: ROW_H,
                    flexShrink: 0,
                    position: "relative",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    outline: "none",
                    background: isSelected
                      ? cellBg !== "transparent"
                        ? cellBg
                        : "rgba(16,185,129,0.08)"
                      : cellBg !== "transparent"
                        ? cellBg
                        : "transparent",
                    boxShadow: isSelected ? "inset 0 0 0 1px #10b981" : "none",
                    overflow: "hidden",
                  }}
                >
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => onEditChange(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, ref)}
                      onBlur={onCommitEdit}
                      aria-label={`Editar célula ${ref}`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        outline: "2px solid " + ACCENT,
                        background:
                          cellBg !== "transparent" ? cellBg : "#191d21",
                        color: "var(--text-primary)",
                        fontSize,
                        padding: "0 4px",
                        fontWeight: cell?.bold ? 700 : 400,
                        fontStyle: cell?.italic ? "italic" : "normal",
                        textAlign: cell?.align ?? "left",
                        zIndex: 20,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 4px",
                        fontSize,
                        fontWeight: cell?.bold ? 700 : 400,
                        fontStyle: cell?.italic ? "italic" : "normal",
                        textAlign: cell?.align ?? "left",
                        justifyContent:
                          cell?.align === "center"
                            ? "center"
                            : cell?.align === "right"
                              ? "flex-end"
                              : "flex-start",
                        color: "rgba(255,255,255,0.82)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        userSelect: "none",
                      }}
                    >
                      {displayValue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sheet Tabs ────────────────────────────────────────────────────────────────

interface SheetTabsProps {
  sheets: SheetTab[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onRename: (idx: number, name: string) => void;
}

function SheetTabs({
  sheets,
  activeIdx,
  onSelect,
  onAdd,
  onRename,
}: SheetTabsProps) {
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingIdx !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingIdx]);

  function commitRename() {
    if (renamingIdx === null) return;
    const trimmed = renameVal.trim();
    if (trimmed.length > 0) onRename(renamingIdx, trimmed);
    setRenamingIdx(null);
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        overflowX: "auto",
        scrollbarWidth: "none",
        flexShrink: 0,
        height: 34,
      }}
    >
      {sheets.map((sheet, idx) => (
        <div
          key={idx}
          style={{
            position: "relative",
            flexShrink: 0,
          }}
        >
          {renamingIdx === idx ? (
            <input
              ref={renameInputRef}
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingIdx(null);
              }}
              aria-label="Renomear aba"
              style={{
                height: 30,
                padding: "0 10px",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid " + ACCENT,
                borderRadius: 5,
                color: "white",
                fontSize: 12,
                outline: "none",
                width: 80,
                margin: "2px 2px",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelect(idx)}
              onDoubleClick={() => {
                setRenamingIdx(idx);
                setRenameVal(sheet.name);
              }}
              style={{
                height: 30,
                padding: "0 14px",
                background:
                  activeIdx === idx ? "rgba(16,185,129,0.15)" : "transparent",
                border: "none",
                borderBottom:
                  activeIdx === idx
                    ? `2px solid ${ACCENT}`
                    : "2px solid transparent",
                color: activeIdx === idx ? ACCENT : "rgba(255,255,255,0.55)",
                fontSize: 12,
                fontWeight: activeIdx === idx ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                margin: "2px 0",
                transition: "background 100ms, color 100ms",
              }}
            >
              {sheet.name}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        aria-label="Adicionar aba"
        onClick={onAdd}
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.40)",
          cursor: "pointer",
          margin: "2px 2px",
          borderRadius: 5,
          transition: "background 100ms",
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

interface FormulaBarProps {
  selectedCell: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function FormulaBar({
  selectedCell,
  value,
  isEditing,
  onChange,
  onCommit,
  onCancel,
}: FormulaBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.01)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 44,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 5,
          fontSize: 12,
          fontWeight: 600,
          color: ACCENT,
          flexShrink: 0,
          fontFamily: "monospace",
        }}
      >
        {selectedCell}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        aria-label={`Valor da célula ${selectedCell}`}
        placeholder="Valor ou fórmula (ex: =SUM(A1:A10))"
        style={{
          flex: 1,
          height: 24,
          background: isEditing
            ? "rgba(16,185,129,0.06)"
            : "rgba(255,255,255,0.04)",
          border: isEditing
            ? `1px solid ${ACCENT}`
            : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 5,
          color: "rgba(255,255,255,0.82)",
          fontSize: 12,
          padding: "0 8px",
          outline: "none",
          fontFamily: "monospace",
          transition: "border-color 120ms, background 120ms",
        }}
      />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function PlanilhasApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  // Sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarW = sidebarOpen ? SIDEBAR_W : SIDEBAR_ICON_W;

  // Spreadsheets list
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sheets state within active spreadsheet
  const [sheets, setSheets] = useState<SheetTab[]>([
    { name: "Plan1", cells: {} },
  ]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // Cell selection & editing
  const [selectedCell, setSelectedCell] = useState("A1");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Toolbar formatting state (derived from selected cell)
  const [fontSize, setFontSize] = useState(12);

  // Autosave debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  // Derived: active spreadsheet object
  const activeSpreadsheet = useMemo(
    () => spreadsheets.find((s) => s.id === activeId) ?? null,
    [spreadsheets, activeId],
  );

  // Derived: current sheet cells
  const currentSheet = sheets[activeSheetIdx] ?? { name: "Plan1", cells: {} };
  const currentCells = currentSheet.cells;

  // Derived: selected cell data
  const selectedCellData: CellData = currentCells[selectedCell] ?? {
    value: "",
    formula: "",
    bold: false,
    italic: false,
    align: "left",
    bg: "transparent",
  };

  // Formula bar value = formula if exists, otherwise value
  const formulaBarValue = editingCell
    ? editValue
    : selectedCellData.formula || selectedCellData.value;

  // ─── Load spreadsheets ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!drivers || !userId || !companyId) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const result = await (drivers.data
          .from("spreadsheets")
          .select("id,user_id,company_id,name,sheets,created_at,updated_at")
          .order("updated_at", { ascending: false }) as unknown as Promise<{
          data: DbSpreadsheet[] | null;
          error: unknown;
        }>);
        if (cancelled) return;
        if (result.data && !result.error) {
          const parsed: Spreadsheet[] = result.data.map((row) => ({
            ...row,
            sheets: Array.isArray(row.sheets)
              ? (row.sheets as SheetTab[])
              : [{ name: "Plan1", cells: {} }],
          }));
          setSpreadsheets(parsed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [drivers, userId, companyId]);

  // ─── Sync sheets from active spreadsheet (only on activeId change) ──────────

  const lastLoadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeId === null) {
      lastLoadedIdRef.current = null;
      setSheets([{ name: "Plan1", cells: {} }]);
      setActiveSheetIdx(0);
      setSelectedCell("A1");
      setEditingCell(null);
      return;
    }
    if (lastLoadedIdRef.current === activeId) return;
    const sp = spreadsheets.find((s) => s.id === activeId);
    if (sp) {
      lastLoadedIdRef.current = activeId;
      setSheets(sp.sheets);
      setActiveSheetIdx(0);
      setSelectedCell("A1");
      setEditingCell(null);
    }
  }, [activeId, spreadsheets]);

  // ─── Create spreadsheet ─────────────────────────────────────────────────────

  async function handleNewSpreadsheet() {
    if (!drivers || !userId || !companyId) return;
    const name = "Nova Planilha";
    const initialSheets: SheetTab[] = [{ name: "Plan1", cells: {} }];

    try {
      const result = await (drivers.data
        .from("spreadsheets")
        .insert({
          user_id: userId,
          company_id: companyId,
          name,
          sheets: initialSheets,
        })
        .select("id,user_id,company_id,name,sheets,created_at,updated_at")
        .single() as unknown as Promise<{
        data: DbSpreadsheet | null;
        error: unknown;
      }>);
      if (result.data && !result.error) {
        const newSp: Spreadsheet = {
          ...result.data,
          sheets: initialSheets,
        };
        setSpreadsheets((prev) => [newSp, ...prev]);
        setActiveId(newSp.id);
      }
    } catch {
      // swallow
    }
  }

  // ─── Save (debounced) ───────────────────────────────────────────────────────

  const scheduleSave = useCallback(
    (updatedSheets: SheetTab[]) => {
      if (!drivers || !activeId || !userId || !companyId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaving(true);
        void (async () => {
          try {
            await (drivers.data
              .from("spreadsheets")
              .update({ sheets: updatedSheets })
              .eq("id", activeId) as unknown as Promise<unknown>);
            setSpreadsheets((prev) =>
              prev.map((s) =>
                s.id === activeId ? { ...s, sheets: updatedSheets } : s,
              ),
            );
          } finally {
            setSaving(false);
          }
        })();
      }, 1500);
    },
    [drivers, activeId, userId, companyId],
  );

  // ─── Manual save ───────────────────────────────────────────────────────────

  async function handleManualSave() {
    if (!drivers || !activeId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    try {
      await (drivers.data
        .from("spreadsheets")
        .update({ sheets })
        .eq("id", activeId) as unknown as Promise<unknown>);
      setSpreadsheets((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, sheets } : s)),
      );
    } finally {
      setSaving(false);
    }
  }

  // ─── Modify cells ───────────────────────────────────────────────────────────

  function updateCell(ref: string, patch: Partial<CellData>) {
    setSheets((prev) => {
      const next = prev.map((sh, idx) => {
        if (idx !== activeSheetIdx) return sh;
        const existing = sh.cells[ref] ?? {
          value: "",
          formula: "",
          bold: false,
          italic: false,
          align: "left" as CellAlign,
          bg: "transparent",
        };
        return {
          ...sh,
          cells: { ...sh.cells, [ref]: { ...existing, ...patch } },
        };
      });
      scheduleSave(next);
      return next;
    });
  }

  // ─── Cell selection ─────────────────────────────────────────────────────────

  function handleSelectCell(ref: string) {
    if (editingCell) commitEdit();
    setSelectedCell(ref);
    const cellData = currentCells[ref];
    setFontSize(12); // reset; could store per-cell if desired
    void cellData;
  }

  // ─── Edit ───────────────────────────────────────────────────────────────────

  function startEdit(ref: string) {
    const cell = currentCells[ref];
    setSelectedCell(ref);
    setEditingCell(ref);
    setEditValue(cell?.formula || cell?.value || "");
  }

  function commitEdit() {
    if (!editingCell) return;
    const rawVal = editValue;
    if (rawVal.startsWith("=")) {
      updateCell(editingCell, {
        formula: rawVal,
        value: evaluateFormula(rawVal, currentCells),
      });
    } else {
      updateCell(editingCell, { formula: "", value: rawVal });
    }
    setEditingCell(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  // ─── Formula bar interactions ────────────────────────────────────────────────

  function handleFormulaBarChange(v: string) {
    if (!editingCell) {
      // Activate editing on the selected cell
      setEditingCell(selectedCell);
    }
    setEditValue(v);
  }

  function handleFormulaBarCommit() {
    commitEdit();
  }

  function handleFormulaBarCancel() {
    cancelEdit();
  }

  // ─── Keyboard navigation ────────────────────────────────────────────────────

  function handleKeyNavigation(ref: string, key: string) {
    const colMatch = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!colMatch || !colMatch[1] || !colMatch[2]) return;
    const colLetter: string = colMatch[1];
    const rowNum = parseInt(colMatch[2], 10);
    const colIdx = colLetter.charCodeAt(0) - 65;

    let newCol = colIdx;
    let newRow = rowNum;

    if (key === "ArrowUp") newRow = Math.max(1, rowNum - 1);
    else if (key === "ArrowDown") newRow = Math.min(ROWS, rowNum + 1);
    else if (key === "ArrowLeft") newCol = Math.max(0, colIdx - 1);
    else if (key === "ArrowRight" || key === "Tab")
      newCol = Math.min(COLS - 1, colIdx + 1);

    const newRef = `${colIndexToLetter(newCol)}${newRow}`;
    setSelectedCell(newRef);
  }

  // ─── Formatting ─────────────────────────────────────────────────────────────

  function toggleBold() {
    updateCell(selectedCell, { bold: !selectedCellData.bold });
  }
  function toggleItalic() {
    updateCell(selectedCell, { italic: !selectedCellData.italic });
  }
  function setAlign(a: CellAlign) {
    updateCell(selectedCell, { align: a });
  }
  function setCellBg(c: string) {
    updateCell(selectedCell, { bg: c });
  }

  // ─── Sheet management ────────────────────────────────────────────────────────

  function handleAddSheet() {
    const names = sheets.map((s) => s.name);
    let n = sheets.length + 1;
    let candidate = `Plan${n}`;
    while (names.includes(candidate)) {
      n++;
      candidate = `Plan${n}`;
    }
    const updated = [...sheets, { name: candidate, cells: {} }];
    setSheets(updated);
    setActiveSheetIdx(updated.length - 1);
    scheduleSave(updated);
  }

  function handleRenameSheet(idx: number, name: string) {
    const updated = sheets.map((s, i) => (i === idx ? { ...s, name } : s));
    setSheets(updated);
    scheduleSave(updated);
  }

  function handleSelectSheet(idx: number) {
    if (editingCell) commitEdit();
    setActiveSheetIdx(idx);
    setSelectedCell("A1");
    setEditingCell(null);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!drivers || !userId || !companyId) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#191d21",
          color: "var(--text-primary)",
          overflow: "hidden",
        }}
      >
        <LoadingState />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#191d21",
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ─── Sidebar ─── */}
      <div
        style={{
          width: sidebarW,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
          position: "relative",
        }}
      >
        <aside style={ASIDE_STYLE}>
          {/* Identity header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? undefined : "center",
              gap: sidebarOpen ? 10 : 0,
              padding: "16px 14px 12px",
              flexShrink: 0,
            }}
          >
            <Grid3x3
              size={18}
              strokeWidth={1.6}
              style={{ color: ACCENT, flexShrink: 0 }}
            />
            {sidebarOpen && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Planilhas
              </span>
            )}
          </div>

          {!sidebarOpen ? (
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px 0",
                gap: 4,
              }}
            >
              <button
                type="button"
                aria-label="Nova planilha"
                title="Nova planilha"
                onClick={() => void handleNewSpreadsheet()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: ACCENT,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} color="#fff" />
              </button>
            </nav>
          ) : (
            <>
              {/* Nova planilha button */}
              <div style={{ padding: "10px 10px 4px" }}>
                <button
                  type="button"
                  onClick={() => void handleNewSpreadsheet()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: ACCENT,
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
                    e.currentTarget.style.background = ACCENT;
                  }}
                >
                  <Plus size={13} />
                  Nova planilha
                </button>
              </div>

              {/* Spreadsheet list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  paddingBottom: 160,
                }}
              >
                {loading ? (
                  <div
                    style={{
                      padding: "20px 12px",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                    }}
                  >
                    Carregando…
                  </div>
                ) : spreadsheets.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 12px",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    Nenhuma planilha ainda.
                  </div>
                ) : (
                  spreadsheets.map((sp) => {
                    const isActive = sp.id === activeId;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setActiveId(sp.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          width: "100%",
                          padding: "8px 12px",
                          background: isActive
                            ? "rgba(16,185,129,0.10)"
                            : "transparent",
                          border: "none",
                          borderLeft: isActive
                            ? `2px solid ${ACCENT}`
                            : "2px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          gap: 2,
                          transition: "background 100ms",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: isActive
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                          }}
                        >
                          {sp.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {new Date(sp.updated_at).toLocaleDateString("pt-BR")}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Floating collapse toggle */}
      <button
        type="button"
        aria-label={sidebarOpen ? "Colapsar sidebar" : "Expandir sidebar"}
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          position: "absolute",
          left: (sidebarOpen ? SIDEBAR_W : SIDEBAR_ICON_W) - 14,
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
        {sidebarOpen ? (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        )}
      </button>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Content header */}
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
          <Grid3x3 size={14} style={{ color: ACCENT, flexShrink: 0 }} />
          <h2
            style={{
              flex: 1,
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              minWidth: 80,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeSpreadsheet ? activeSpreadsheet.name : "Planilhas"}
          </h2>
          {activeId !== null && (
            <button
              type="button"
              aria-label="Salvar planilha"
              onClick={() => void handleManualSave()}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 7,
                background: saving
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(16,185,129,0.20)",
                border: "1px solid rgba(16,185,129,0.30)",
                color: ACCENT,
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                transition: "background 100ms",
                flexShrink: 0,
              }}
            >
              <Save size={12} />
              {saving ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>

        {/* Body */}
        {!activeId ? (
          <EmptyContent onNew={() => void handleNewSpreadsheet()} />
        ) : (
          <>
            {/* Formatting toolbar */}
            <Toolbar
              bold={selectedCellData.bold}
              italic={selectedCellData.italic}
              align={selectedCellData.align}
              fontSize={fontSize}
              bg={selectedCellData.bg}
              onBold={toggleBold}
              onItalic={toggleItalic}
              onAlign={setAlign}
              onFontSize={setFontSize}
              onBg={setCellBg}
              disabled={false}
            />

            {/* Formula bar */}
            <FormulaBar
              selectedCell={selectedCell}
              value={formulaBarValue}
              isEditing={editingCell !== null}
              onChange={handleFormulaBarChange}
              onCommit={handleFormulaBarCommit}
              onCancel={handleFormulaBarCancel}
            />

            {/* Grid */}
            <SheetGrid
              cells={currentCells}
              selectedCell={selectedCell}
              editingCell={editingCell}
              editValue={editValue}
              fontSize={fontSize}
              onSelectCell={handleSelectCell}
              onStartEdit={startEdit}
              onEditChange={setEditValue}
              onCommitEdit={commitEdit}
              onCancelEdit={cancelEdit}
              onKeyNavigation={handleKeyNavigation}
            />

            {/* Sheet tabs */}
            <SheetTabs
              sheets={sheets}
              activeIdx={activeSheetIdx}
              onSelect={handleSelectSheet}
              onAdd={handleAddSheet}
              onRename={handleRenameSheet}
            />
          </>
        )}
      </div>
    </div>
  );
}
