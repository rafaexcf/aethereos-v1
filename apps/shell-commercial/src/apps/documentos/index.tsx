import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Link,
  PanelLeftClose,
  PanelLeftOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Trash2,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { moveToTrash } from "../../lib/trash";

interface Document {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

type SaveStatus = "saved" | "saving" | "idle";

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;
const AUTOSAVE_DELAY = 1500;
const ACCENT = "#3b82f6";
const ACCENT_HOVER = "#2563eb";

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

function countWords(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function countChars(html: string): number {
  return html.replace(/<[^>]*>/g, "").length;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function Divider() {
  return (
    <span
      style={{
        width: 1,
        height: 18,
        background: "rgba(255,255,255,0.12)",
        display: "inline-block",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

function ToolBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 6,
        padding: "4px 8px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        background: active
          ? "rgba(59,130,246,0.15)"
          : hovered
            ? "rgba(255,255,255,0.06)"
            : "none",
        color: active ? ACCENT : "var(--text-secondary)",
        transition: "background 120ms, color 120ms",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 28,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ParagraphSelect({
  onExec,
}: {
  onExec: (cmd: string, val: string) => void;
}) {
  return (
    <select
      aria-label="Estilo de parágrafo"
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (v !== "") {
          onExec("formatBlock", v);
          e.target.value = "";
        }
      }}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 6,
        color: "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 6px",
        cursor: "pointer",
        outline: "none",
        height: 28,
        flexShrink: 0,
      }}
    >
      <option value="" disabled>
        Parágrafo
      </option>
      <option value="p">Normal</option>
      <option value="h1">Título 1</option>
      <option value="h2">Título 2</option>
      <option value="h3">Título 3</option>
    </select>
  );
}

function EmptyDoc({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(59,130,246,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText size={24} color={ACCENT} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 6px",
          }}
        >
          Nenhum documento aberto
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            margin: 0,
          }}
        >
          Crie um novo documento ou selecione um existente.
        </p>
      </div>
      <button
        type="button"
        onClick={onNew}
        style={{
          display: "flex",
          alignItems: "center",
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
        Novo documento
      </button>
    </div>
  );
}

function EditorStyles() {
  return (
    <style>{`
      .doc-editor h1 { font-size: 28px; font-weight: 700; margin: 0.75em 0 0.4em; color: inherit; }
      .doc-editor h2 { font-size: 22px; font-weight: 600; margin: 0.7em 0 0.4em; color: inherit; }
      .doc-editor h3 { font-size: 18px; font-weight: 600; margin: 0.65em 0 0.35em; color: inherit; }
      .doc-editor p  { margin: 0 0 0.6em; }
      .doc-editor ul { padding-left: 1.6em; margin: 0 0 0.6em; }
      .doc-editor ol { padding-left: 1.6em; margin: 0 0 0.6em; }
      .doc-editor li { margin-bottom: 0.2em; }
      .doc-editor a  { color: ${ACCENT}; text-decoration: underline; }
      .doc-editor:empty::before {
        content: "Comece a escrever...";
        color: rgba(255,255,255,0.20);
        pointer-events: none;
      }
    `}</style>
  );
}

export function DocumentosApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [docs, setDocs] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = activeCompanyId;

    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await d.data
        .from("documents")
        .select("*")
        .eq("user_id", uid)
        .eq("company_id", cid)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      setDocs((data ?? []) as Document[]);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  useEffect(() => {
    if (editorRef.current === null) return;
    if (activeDoc === null) {
      editorRef.current.innerHTML = "";
      return;
    }
    if (editorRef.current.innerHTML !== activeDoc.content) {
      editorRef.current.innerHTML = activeDoc.content;
    }
  }, [activeDocId, activeDoc]);

  useEffect(() => {
    if (titleEditing) {
      titleInputRef.current?.select();
    }
  }, [titleEditing]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? "");
    editorRef.current?.focus();
  }, []);

  async function persistCreate(title: string): Promise<Document | null> {
    if (drivers === null || userId === null || activeCompanyId === null)
      return null;
    const { data, error } = await drivers.data
      .from("documents")
      .insert({
        title,
        content: "",
        word_count: 0,
        user_id: userId,
        company_id: activeCompanyId,
      })
      .select()
      .single();
    if (error !== null || data === null) return null;
    return data as Document;
  }

  async function persistUpdate(
    id: string,
    patch: { title?: string; content?: string; word_count?: number },
  ) {
    if (drivers === null) return;
    await drivers.data.from("documents").update(patch).eq("id", id);
  }

  async function persistDelete(doc: Document) {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    await moveToTrash({
      drivers,
      userId,
      companyId: activeCompanyId,
      appId: "documentos",
      itemType: "document",
      itemName: doc.title.trim() !== "" ? doc.title : "(Sem título)",
      itemData: doc as unknown as Record<string, unknown>,
      originalId: doc.id,
    });
    await drivers.data.from("documents").delete().eq("id", doc.id);
  }

  async function handleNewDoc() {
    const doc = await persistCreate("Documento sem título");
    if (doc === null) return;
    setDocs((prev) => [doc, ...prev]);
    setActiveDocId(doc.id);
    setTitleDraft(doc.title);
    setTitleEditing(true);
  }

  function handleSelectDoc(id: string) {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (activeDocId !== null && editorRef.current !== null) {
      const html = editorRef.current.innerHTML;
      const wc = countWords(html);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === activeDocId ? { ...d, content: html, word_count: wc } : d,
        ),
      );
      void persistUpdate(activeDocId, { content: html, word_count: wc });
    }
    setActiveDocId(id);
    setTitleEditing(false);
  }

  function handleEditorInput() {
    if (activeDocId === null || editorRef.current === null) return;
    const html = editorRef.current.innerHTML;
    const wc = countWords(html);

    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDocId ? { ...d, content: html, word_count: wc } : d,
      ),
    );
    setSaveStatus("saving");

    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistUpdate(activeDocId, { content: html, word_count: wc }).then(
        () => {
          setSaveStatus("saved");
          setDocs((prev) =>
            prev.map((d) =>
              d.id === activeDocId
                ? { ...d, updated_at: new Date().toISOString() }
                : d,
            ),
          );
        },
      );
    }, AUTOSAVE_DELAY);
  }

  function commitTitle() {
    if (activeDocId === null) return;
    const trimmed = titleDraft.trim() || "Documento sem título";
    setTitleEditing(false);
    setDocs((prev) =>
      prev.map((d) => (d.id === activeDocId ? { ...d, title: trimmed } : d)),
    );
    void persistUpdate(activeDocId, { title: trimmed });
  }

  function handleDeleteDoc(id: string) {
    const doc = docs.find((d) => d.id === id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (activeDocId === id) setActiveDocId(null);
    if (doc !== undefined) void persistDelete(doc);
  }

  function handleInsertLink() {
    const url = window.prompt("URL do link:");
    if (url !== null && url.trim() !== "") {
      exec("createLink", url.trim());
    }
  }

  const filteredDocs = docs.filter((d) =>
    search.trim() === ""
      ? true
      : d.title.toLowerCase().includes(search.toLowerCase()),
  );

  const editorHtml = activeDoc?.content ?? "";
  const wordCount = activeDoc?.word_count ?? 0;
  const charCount = countChars(editorHtml);

  if (drivers === null || userId === null || activeCompanyId === null) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#191d21",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        Carregando...
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
      <EditorStyles />

      {/* ─── Sidebar ─── */}
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
          {/* Identity header */}
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
            <FileText
              size={18}
              strokeWidth={1.6}
              style={{ color: ACCENT, flexShrink: 0 }}
            />
            {!collapsed && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Documentos
              </span>
            )}
          </div>

          {collapsed ? (
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
                aria-label="Novo documento"
                title="Novo documento"
                onClick={() => void handleNewDoc()}
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
              {/* Novo documento button */}
              <div style={{ padding: "10px 10px 4px" }}>
                <button
                  type="button"
                  onClick={() => void handleNewDoc()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = ACCENT_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = ACCENT;
                  }}
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
                >
                  <Plus size={13} />
                  Novo documento
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: "4px 10px 6px", flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 7,
                    padding: "4px 8px",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Search size={12} color="var(--text-tertiary)" />
                  <input
                    type="search"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar documentos"
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      width: "100%",
                    }}
                  />
                </div>
              </div>

              {/* Document list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingBottom: 160,
                  scrollbarWidth: "none",
                }}
              >
                {loading ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      padding: "16px 12px",
                      margin: 0,
                    }}
                  >
                    Carregando...
                  </p>
                ) : filteredDocs.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      padding: "16px 12px",
                      margin: 0,
                      textAlign: "center",
                    }}
                  >
                    {search.trim() !== ""
                      ? "Nenhum resultado"
                      : "Nenhum documento ainda."}
                  </p>
                ) : (
                  filteredDocs.map((doc) => {
                    const isActive = doc.id === activeDocId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectDoc(doc.id)}
                        title={doc.title}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          width: "100%",
                          padding: "8px 12px",
                          background: isActive
                            ? "rgba(59,130,246,0.10)"
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
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                          }}
                        >
                          {doc.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {formatDate(doc.updated_at)} · {doc.word_count}{" "}
                          palavras
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

      {/* ─── Main content ─── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
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
          <FileText size={14} style={{ color: ACCENT, flexShrink: 0 }} />
          {activeDoc !== null && titleEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              aria-label="Título do documento"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleEditing(false);
                  setTitleDraft(activeDoc.title);
                }
              }}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${ACCENT}80`,
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 15,
                fontWeight: 600,
                padding: "1px 0",
                minWidth: 80,
              }}
            />
          ) : (
            <h2
              onClick={() => {
                if (activeDoc !== null) {
                  setTitleDraft(activeDoc.title);
                  setTitleEditing(true);
                }
              }}
              title={activeDoc !== null ? "Clique para renomear" : undefined}
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.75)",
                minWidth: 80,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: activeDoc !== null ? "text" : "default",
              }}
            >
              {activeDoc !== null ? activeDoc.title : "Documentos"}
            </h2>
          )}

          {activeDoc !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {saveStatus === "saving"
                  ? "Salvando..."
                  : saveStatus === "saved"
                    ? "Salvo"
                    : ""}
              </span>
              <button
                type="button"
                title="Excluir documento"
                aria-label="Excluir documento"
                onClick={() => {
                  if (window.confirm(`Excluir "${activeDoc.title}"?`)) {
                    handleDeleteDoc(activeDoc.id);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(239,68,68,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: 5,
                  transition: "color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(239,68,68,0.6)";
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {activeDoc === null ? (
          <EmptyDoc onNew={() => void handleNewDoc()} />
        ) : (
          <>
            {/* Formatting toolbar */}
            <div
              style={{
                background: "#11161c",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                padding: "5px 16px",
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              <ParagraphSelect onExec={exec} />
              <Divider />
              <ToolBtn title="Negrito (Ctrl+B)" onClick={() => exec("bold")}>
                <strong>B</strong>
              </ToolBtn>
              <ToolBtn title="Itálico (Ctrl+I)" onClick={() => exec("italic")}>
                <em style={{ fontStyle: "italic" }}>I</em>
              </ToolBtn>
              <ToolBtn
                title="Sublinhado (Ctrl+U)"
                onClick={() => exec("underline")}
              >
                <span style={{ textDecoration: "underline" }}>U</span>
              </ToolBtn>
              <ToolBtn title="Tachado" onClick={() => exec("strikeThrough")}>
                <span style={{ textDecoration: "line-through" }}>S</span>
              </ToolBtn>
              <Divider />
              <ToolBtn
                title="Lista com marcadores"
                onClick={() => exec("insertUnorderedList")}
              >
                <List size={13} />
              </ToolBtn>
              <ToolBtn
                title="Lista numerada"
                onClick={() => exec("insertOrderedList")}
              >
                <ListOrdered size={13} />
              </ToolBtn>
              <Divider />
              <ToolBtn
                title="Alinhar à esquerda"
                onClick={() => exec("justifyLeft")}
              >
                <AlignLeft size={13} />
              </ToolBtn>
              <ToolBtn
                title="Centralizar"
                onClick={() => exec("justifyCenter")}
              >
                <AlignCenter size={13} />
              </ToolBtn>
              <ToolBtn
                title="Alinhar à direita"
                onClick={() => exec("justifyRight")}
              >
                <AlignRight size={13} />
              </ToolBtn>
              <Divider />
              <ToolBtn title="Inserir link" onClick={handleInsertLink}>
                <Link size={13} />
              </ToolBtn>
            </div>

            {/* Editor area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: "#1a1f25",
              }}
            >
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="doc-editor"
                onInput={handleEditorInput}
                aria-label="Área de edição do documento"
                aria-multiline="true"
                style={{
                  flex: 1,
                  outline: "none",
                  padding: "32px 80px",
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--text-primary)",
                  fontFamily: "Georgia, serif",
                  maxWidth: 860,
                  margin: "0 auto",
                  minHeight: "100%",
                  paddingBottom: 160,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Status bar */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "4px 20px",
                display: "flex",
                gap: 16,
                fontSize: 11,
                color: "var(--text-tertiary)",
                flexShrink: 0,
              }}
            >
              <span>{wordCount} palavras</span>
              <span>{charCount} caracteres</span>
              <span>
                Editado: {formatDate(activeDoc.updated_at)} às{" "}
                {formatTime(activeDoc.updated_at)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
