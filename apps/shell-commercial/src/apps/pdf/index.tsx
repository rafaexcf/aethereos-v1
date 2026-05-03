import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Bot, Send, X, Loader2, Trash2 } from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdfNote {
  id: string;
  user_id: string;
  company_id: string;
  file_name: string;
  notes: string;
  ai_summary: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#ef4444";
const ACCENT_HOVER = "#dc2626";
const STORAGE_BUCKET = "kernel-pdfs";
const SIGNED_URL_TTL_SECONDS = 3600;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToNote(row: Record<string, unknown>): PdfNote {
  const rawPath = row["storage_path"];
  return {
    id: String(row["id"] ?? ""),
    user_id: String(row["user_id"] ?? ""),
    company_id: String(row["company_id"] ?? ""),
    file_name: String(row["file_name"] ?? ""),
    notes: String(row["notes"] ?? ""),
    ai_summary: String(row["ai_summary"] ?? ""),
    storage_path:
      typeof rawPath === "string" && rawPath.length > 0 ? rawPath : null,
    created_at: String(row["created_at"] ?? ""),
    updated_at: String(row["updated_at"] ?? ""),
  };
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void;
  uploading: boolean;
  recents: PdfNote[];
  onOpenRecent: (note: PdfNote) => void;
  onDeleteRecent: (note: PdfNote) => void;
}

function DropZone({
  onFile,
  uploading,
  recents,
  onOpenRecent,
  onDeleteRecent,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (file.type === "application/pdf") {
      onFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        margin: 24,
        gap: 16,
        overflow: "hidden",
      }}
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading) fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label="Abrir um arquivo PDF"
        aria-busy={uploading}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            fileInputRef.current?.click();
          }
        }}
        style={{
          flex: recents.length > 0 ? "0 0 auto" : 1,
          minHeight: 240,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: `2px dashed ${dragging ? ACCENT : "rgba(239,68,68,0.3)"}`,
          borderRadius: 16,
          cursor: uploading ? "wait" : "pointer",
          transition: "border-color 150ms",
          background: dragging ? "rgba(239,68,68,0.04)" : "transparent",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(239,68,68,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {uploading ? (
            <Loader2
              size={28}
              style={{ color: ACCENT, animation: "spin 1s linear infinite" }}
            />
          ) : (
            <FileText size={28} style={{ color: ACCENT }} />
          )}
        </div>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            margin: "0 0 6px",
          }}
        >
          {uploading ? "Enviando PDF…" : "Abrir um PDF"}
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
          {uploading
            ? "Aguarde enquanto o arquivo é salvo."
            : "Arraste e solte um arquivo PDF aqui, ou clique para selecionar."}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
      </div>

      {recents.length > 0 && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#11161c",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Recentes
            </span>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "6px 6px 160px",
              scrollbarWidth: "none",
            }}
          >
            {recents.map((note) => (
              <div
                key={note.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onClick={() => onOpenRecent(note)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${note.file_name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenRecent(note);
                  }
                }}
              >
                <FileText size={14} style={{ color: ACCENT, flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {note.file_name}
                </span>
                <button
                  type="button"
                  aria-label={`Excluir ${note.file_name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRecent(note);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 4,
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function PdfApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [currentNote, setCurrentNote] = useState<PdfNote | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlIssuedAt, setSignedUrlIssuedAt] = useState<number | null>(
    null,
  );
  const [recents, setRecents] = useState<PdfNote[]>([]);
  const [notes, setNotes] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const noteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Scroll chat to bottom ─────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load list of recents (rows that have a storage_path) ──────────────────

  const loadRecents = useCallback(async () => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const res = await drivers.data
      .from("pdf_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", activeCompanyId)
      .order("updated_at", { ascending: false });

    const rows = (res.data ?? []) as unknown[];
    const mapped = rows
      .map((r) => rowToNote(r as Record<string, unknown>))
      .filter((n) => n.storage_path !== null);
    setRecents(mapped);
  }, [drivers, userId, activeCompanyId]);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  // ── Open a saved PDF: fetch signed URL ────────────────────────────────────

  const openNote = useCallback(
    async (note: PdfNote) => {
      if (drivers === null || note.storage_path === null) return;
      setLoadingDoc(true);
      setCurrentNote(note);
      setNotes(note.notes);
      setMessages([]);
      setInput("");
      setSignedUrl(null);
      setSignedUrlIssuedAt(null);
      try {
        const client = drivers.data.getClient();
        const { data } = await client.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(note.storage_path, SIGNED_URL_TTL_SECONDS);
        if (data?.signedUrl !== undefined) {
          setSignedUrl(data.signedUrl);
          setSignedUrlIssuedAt(Date.now());
        }
      } finally {
        setLoadingDoc(false);
      }
    },
    [drivers],
  );

  useEffect(() => {
    if (drivers === null) return;
    if (currentNote === null) return;
    const path = currentNote.storage_path;
    if (path === null) return;
    const intervalId = window.setInterval(() => {
      const issuedAt = signedUrlIssuedAt;
      if (issuedAt === null) return;
      if (Date.now() - issuedAt <= 50 * 60_000) return;
      void (async () => {
        const client = drivers.data.getClient();
        const { data } = await client.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (data?.signedUrl !== undefined) {
          setSignedUrl(data.signedUrl);
          setSignedUrlIssuedAt(Date.now());
        }
      })();
    }, 5 * 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [drivers, currentNote, signedUrlIssuedAt]);

  // ── Pick a new file: upload + insert row + open ───────────────────────────

  const handlePickFile = useCallback(
    async (file: File) => {
      if (
        drivers === null ||
        userId === null ||
        activeCompanyId === null ||
        uploading
      ) {
        return;
      }
      setUploading(true);
      try {
        const ins = await drivers.data
          .from("pdf_notes")
          .insert({
            user_id: userId,
            company_id: activeCompanyId,
            file_name: file.name,
            notes: "",
            ai_summary: "",
          })
          .select("*")
          .single();

        if (ins.data === null) {
          setUploading(false);
          return;
        }

        const created = rowToNote(ins.data as Record<string, unknown>);
        const path = `${userId}/${activeCompanyId}/${created.id}.pdf`;

        const client = drivers.data.getClient();
        const { error: uploadErr } = await client.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadErr !== null) {
          await drivers.data
            .from("pdf_notes")
            .delete()
            .eq("id", created.id)
            .eq("user_id", userId)
            .eq("company_id", activeCompanyId);
          setUploading(false);
          return;
        }

        await drivers.data
          .from("pdf_notes")
          .update({ storage_path: path })
          .eq("id", created.id)
          .eq("user_id", userId)
          .eq("company_id", activeCompanyId);

        const persisted: PdfNote = { ...created, storage_path: path };
        await loadRecents();
        await openNote(persisted);
      } finally {
        setUploading(false);
      }
    },
    [drivers, userId, activeCompanyId, uploading, loadRecents, openNote],
  );

  // ── Auto-save notes (debounced 1.5s) ──────────────────────────────────────

  const scheduleNoteSave = useCallback(
    (text: string) => {
      if (
        drivers === null ||
        userId === null ||
        activeCompanyId === null ||
        currentNote === null
      ) {
        return;
      }
      if (noteSaveTimerRef.current !== null)
        clearTimeout(noteSaveTimerRef.current);
      setSavingNote(true);
      noteSaveTimerRef.current = setTimeout(() => {
        void drivers.data
          .from("pdf_notes")
          .update({ notes: text, updated_at: new Date().toISOString() })
          .eq("id", currentNote.id)
          .eq("user_id", userId)
          .eq("company_id", activeCompanyId)
          .then(() => setSavingNote(false));
      }, 1500);
    },
    [drivers, userId, activeCompanyId, currentNote],
  );

  function handleNotesChange(text: string) {
    setNotes(text);
    scheduleNoteSave(text);
  }

  // ── Close current document (back to drop zone) ────────────────────────────

  function handleClose() {
    setCurrentNote(null);
    setSignedUrl(null);
    setSignedUrlIssuedAt(null);
    setNotes("");
    setMessages([]);
    setInput("");
    void loadRecents();
  }

  // ── Delete a saved PDF (storage object + row) ─────────────────────────────

  const handleDelete = useCallback(
    async (note: PdfNote) => {
      if (drivers === null || userId === null || activeCompanyId === null)
        return;
      const client = drivers.data.getClient();
      if (note.storage_path !== null) {
        await client.storage.from(STORAGE_BUCKET).remove([note.storage_path]);
      }
      await drivers.data
        .from("pdf_notes")
        .delete()
        .eq("id", note.id)
        .eq("user_id", userId)
        .eq("company_id", activeCompanyId);
      if (currentNote !== null && currentNote.id === note.id) {
        setCurrentNote(null);
        setSignedUrl(null);
        setSignedUrlIssuedAt(null);
        setNotes("");
        setMessages([]);
      }
      await loadRecents();
    },
    [drivers, userId, activeCompanyId, currentNote, loadRecents],
  );

  // ── AI Chat ───────────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || thinking) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const litellmUrl =
        (import.meta.env["VITE_LITELLM_URL"] as string | undefined) ?? "";
      const model =
        (import.meta.env["VITE_AI_MODEL"] as string | undefined) ??
        "gpt-4o-mini";

      if (!litellmUrl) {
        throw new Error("VITE_LITELLM_URL not configured");
      }

      const response = await fetch(`${litellmUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente que responde perguntas sobre documentos PDF. Responda de forma clara e objetiva em português.",
            },
            ...messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: trimmed },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content =
        data.choices?.[0]?.message?.content ?? "Sem resposta do assistente.";

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content:
            "Assistente IA não disponível no momento. Verifique a configuração.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
        Carregando…
      </div>
    );
  }

  const hasOpenDoc = currentNote !== null;

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
      {/* ── Content header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          background: "#11161c",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <FileText size={14} style={{ color: ACCENT, flexShrink: 0 }} />
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hasOpenDoc ? currentNote.file_name : "PDF Reader"}
        </h2>

        {!hasOpenDoc ? (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 12px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${ACCENT}`,
              color: ACCENT,
              fontSize: 12,
              fontWeight: 500,
              cursor: uploading ? "wait" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Enviando…" : "Abrir PDF"}
            <input
              type="file"
              accept=".pdf"
              disabled={uploading}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePickFile(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar arquivo"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <X size={12} />
            Fechar
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {/* ── Left: PDF viewer ── */}
        <div
          style={{
            flex: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {!hasOpenDoc ? (
            <DropZone
              onFile={(f) => void handlePickFile(f)}
              uploading={uploading}
              recents={recents}
              onOpenRecent={(n) => void openNote(n)}
              onDeleteRecent={(n) => void handleDelete(n)}
            />
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  background: "rgba(0,0,0,0.2)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Use Ctrl+Scroll ou os controles nativos do PDF para zoom
                </span>
              </div>

              {loadingDoc || signedUrl === null ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Carregando PDF…
                </div>
              ) : (
                <iframe
                  src={signedUrl}
                  title={currentNote.file_name}
                  style={{
                    flex: 1,
                    width: "100%",
                    border: "none",
                    display: "block",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* ── Right: Notes + AI ── */}
        <div
          style={{
            flex: 1,
            minWidth: 280,
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Notes section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: "0 0 auto",
              maxHeight: "45%",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                padding: "10px 14px 6px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Notas
              </span>
              {savingNote && (
                <Loader2
                  size={10}
                  style={{
                    color: "var(--text-tertiary)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={
                hasOpenDoc
                  ? "Anote observações sobre este PDF…"
                  : "Abra um PDF para começar a anotar."
              }
              disabled={!hasOpenDoc}
              aria-label="Notas sobre o PDF"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                lineHeight: 1.6,
                padding: "6px 14px 12px",
                resize: "none",
                outline: "none",
                opacity: hasOpenDoc ? 1 : 0.4,
                scrollbarWidth: "none",
              }}
            />
          </div>

          {/* AI Chat section */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: "10px 14px 6px",
                flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Bot size={13} style={{ color: ACCENT, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Assistente IA
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: "0 0 3px",
                  lineHeight: 1.5,
                }}
              >
                Faça perguntas sobre o documento. O assistente usa o contexto do
                PDF para responder.
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: 0,
                  lineHeight: 1.5,
                  opacity: 0.7,
                }}
              >
                Para melhores resultados, o texto do PDF precisa ser
                selecionável (não escaneado).
              </p>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 14px 160px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                scrollbarWidth: "none",
              }}
            >
              {messages.length === 0 && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {hasOpenDoc
                    ? "Nenhuma mensagem ainda. Pergunte algo sobre o PDF."
                    : "Abra um PDF para usar o assistente IA."}
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "7px 10px",
                      borderRadius:
                        msg.role === "user"
                          ? "10px 10px 2px 10px"
                          : "10px 10px 10px 2px",
                      background:
                        msg.role === "user"
                          ? "rgba(239,68,68,0.15)"
                          : msg.role === "error"
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.06)",
                      border:
                        msg.role === "user"
                          ? `1px solid rgba(239,68,68,0.25)`
                          : msg.role === "error"
                            ? "1px solid rgba(239,68,68,0.2)"
                            : "1px solid rgba(255,255,255,0.08)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      color:
                        msg.role === "error"
                          ? "rgba(239,68,68,0.85)"
                          : "var(--text-secondary)",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {thinking && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                  }}
                >
                  <Loader2
                    size={12}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  pensando…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 14px 10px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={
                  hasOpenDoc ? "Pergunte sobre o PDF…" : "Abra um PDF primeiro"
                }
                disabled={!hasOpenDoc || thinking}
                aria-label="Mensagem para o assistente IA"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  outline: "none",
                  opacity: hasOpenDoc ? 1 : 0.4,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ACCENT;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              />
              <button
                type="button"
                aria-label="Enviar mensagem"
                onClick={() => void handleSend()}
                disabled={!input.trim() || thinking || !hasOpenDoc}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    !input.trim() || thinking || !hasOpenDoc
                      ? "rgba(255,255,255,0.06)"
                      : ACCENT,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor:
                    !input.trim() || thinking || !hasOpenDoc
                      ? "not-allowed"
                      : "pointer",
                  flexShrink: 0,
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !thinking && hasOpenDoc) {
                    e.currentTarget.style.background = ACCENT_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  if (input.trim() && !thinking && hasOpenDoc) {
                    e.currentTarget.style.background = ACCENT;
                  }
                }}
              >
                <Send
                  size={13}
                  style={{
                    color:
                      !input.trim() || thinking || !hasOpenDoc
                        ? "var(--text-tertiary)"
                        : "#fff",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe for spinner (injected inline) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
