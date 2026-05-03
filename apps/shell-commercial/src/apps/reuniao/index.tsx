import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Video,
  Plus,
  LogOut,
  Copy,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Link2,
  Circle,
  Square,
  Mic,
  MicOff,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useNotify } from "../../hooks/useNotify";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { EmptyState } from "../../components/shared/EmptyState";
import { DeleteConfirmModal } from "../../components/shared/DeleteConfirmModal";

interface Meeting {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  room_id: string;
  description: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
}

const MEETINGS_BUCKET = "kernel-meetings";
const SIDEBAR_W = 260;
const SIDEBAR_ICON_W = 48;

const ASIDE_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#11161c",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
  scrollbarWidth: "none",
};

const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function fmtDateTime(iso: string | null): string {
  if (iso === null) return "Sem horário";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bestVideoMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

interface NewMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    scheduled_at: string | null;
  }) => Promise<void>;
}

function NewMeetingModal({ open, onClose, onSubmit }: NewMeetingModalProps) {
  const ref = useModalA11y<HTMLDivElement>({ open, onClose });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (title.trim() === "") return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        scheduled_at:
          scheduledAt === "" ? null : new Date(scheduledAt).toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nova reunião"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 24,
          width: 420,
          maxWidth: "90vw",
          color: "var(--text-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(14,165,233,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Video size={18} color="#0ea5e9" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            Nova reunião
          </h3>
        </div>

        <label
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Título
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Revisão semanal"
          style={{ ...INPUT_STYLE, marginBottom: 14 }}
          maxLength={120}
        />

        <label
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Agendada para{" "}
          <span
            style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}
          >
            (opcional)
          </span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          style={{ ...INPUT_STYLE, marginBottom: 14 }}
        />

        <label
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Descrição{" "}
          <span
            style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}
          >
            (opcional)
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Pauta, participantes esperados…"
          style={{
            ...INPUT_STYLE,
            marginBottom: 20,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          maxLength={500}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || title.trim() === ""}
            style={{
              background:
                title.trim() === "" || submitting
                  ? "rgba(14,165,233,0.30)"
                  : "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                title.trim() === "" || submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitting ? (
              <>
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Criando…
              </>
            ) : (
              <>
                <Video size={13} /> Criar e entrar
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface MeetingListItemProps {
  meeting: Meeting;
  active: boolean;
  onClick: () => void;
}

function MeetingListItem({ meeting, active, onClick }: MeetingListItemProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        width: "100%",
        padding: "8px 10px",
        marginBottom: 2,
        borderRadius: 8,
        border: "1px solid transparent",
        background: active
          ? "rgba(14,165,233,0.12)"
          : hovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
        color: "inherit",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {meeting.title}
      </span>
      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
        {fmtDateTime(meeting.scheduled_at ?? meeting.created_at)}
      </span>
    </button>
  );
}

export function ReuniaoApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();
  const notify = useNotify();

  const [collapsed, setCollapsed] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inMeetingId, setInMeetingId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);

  const [recordingState, setRecordingState] = useState<
    "idle" | "starting" | "recording" | "saving"
  >("idle");
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionSupported] = useState<boolean>(
    () => getSpeechRecognitionCtor() !== null,
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const transcriptFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inMeetingIdRef = useRef<string | null>(null);
  inMeetingIdRef.current = inMeetingId;

  const loadMeetings = useCallback(async () => {
    if (drivers === null || userId === null || companyId === null) return;
    setLoading(true);
    const { data, error } = await drivers.data
      .from("meetings")
      .select(
        "id,user_id,company_id,title,room_id,description,scheduled_at,started_at,ended_at,recording_url,transcript,created_at,updated_at",
      )
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error === null && data !== null) {
      setMeetings(data as unknown as Meeting[]);
    }
    setLoading(false);
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const stopRecorderTracks = useCallback(() => {
    recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
    recorderStreamRef.current = null;
  }, []);

  const flushTranscript = useCallback(async () => {
    const id = inMeetingIdRef.current;
    if (drivers === null || id === null) return;
    const text = transcriptBufferRef.current;
    if (text.trim() === "") return;
    await drivers.data
      .from("meetings")
      .update({ transcript: text })
      .eq("id", id);
  }, [drivers]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current !== null) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (transcriptFlushTimerRef.current !== null) {
      clearTimeout(transcriptFlushTimerRef.current);
      transcriptFlushTimerRef.current = null;
    }
    setTranscribing(false);
    void flushTranscript();
  }, [flushTranscript]);

  useEffect(() => {
    return () => {
      stopRecorderTracks();
      if (recorderRef.current?.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (recognitionRef.current !== null) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (transcriptFlushTimerRef.current !== null) {
        clearTimeout(transcriptFlushTimerRef.current);
      }
    };
  }, [stopRecorderTracks]);

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    return meetings.filter(
      (m) => m.scheduled_at !== null && m.scheduled_at >= now,
    );
  }, [meetings]);

  const past = useMemo(() => {
    const now = new Date().toISOString();
    return meetings.filter(
      (m) => m.scheduled_at === null || m.scheduled_at < now,
    );
  }, [meetings]);

  const selected = useMemo(
    () => meetings.find((m) => m.id === selectedId) ?? null,
    [meetings, selectedId],
  );

  const inMeeting = useMemo(
    () => meetings.find((m) => m.id === inMeetingId) ?? null,
    [meetings, inMeetingId],
  );

  async function handleCreateMeeting(input: {
    title: string;
    description: string;
    scheduled_at: string | null;
  }) {
    if (drivers === null || userId === null || companyId === null) return;
    const slug = slugify(input.title) || "reuniao";
    const room_id = `aethereos-${slug}-${randomSuffix()}`;
    const payload = {
      user_id: userId,
      company_id: companyId,
      title: input.title,
      room_id,
      description: input.description === "" ? null : input.description,
      scheduled_at: input.scheduled_at,
    };
    const { data, error } = await drivers.data
      .from("meetings")
      .insert(payload)
      .select(
        "id,user_id,company_id,title,room_id,description,scheduled_at,started_at,ended_at,recording_url,transcript,created_at,updated_at",
      )
      .single();
    if (error !== null || data === null) {
      void notify({
        type: "error",
        title: "Falha ao criar reunião",
        body: error?.message ?? "Erro desconhecido",
        source_app: "reuniao",
      });
      return;
    }
    const created = data as unknown as Meeting;
    setMeetings((prev) => [created, ...prev]);
    setShowNewModal(false);
    setSelectedId(created.id);
    void enterMeeting(created);
  }

  async function enterMeeting(meeting: Meeting) {
    if (drivers !== null && meeting.started_at === null) {
      const startedAt = new Date().toISOString();
      await drivers.data
        .from("meetings")
        .update({ started_at: startedAt })
        .eq("id", meeting.id);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meeting.id ? { ...m, started_at: startedAt } : m,
        ),
      );
    }
    setInMeetingId(meeting.id);
    setSelectedId(meeting.id);
  }

  async function leaveMeeting() {
    if (recordingState === "recording") {
      await stopRecording();
    }
    stopTranscription();
    if (drivers !== null && inMeetingId !== null) {
      const endedAt = new Date().toISOString();
      await drivers.data
        .from("meetings")
        .update({ ended_at: endedAt })
        .eq("id", inMeetingId);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === inMeetingId ? { ...m, ended_at: endedAt } : m,
        ),
      );
    }
    setInMeetingId(null);
  }

  async function copyLink(meeting: Meeting) {
    const url = `https://meet.jit.si/${meeting.room_id}`;
    try {
      await navigator.clipboard.writeText(url);
      void notify({
        type: "success",
        title: "Link copiado",
        body: url,
        source_app: "reuniao",
      });
    } catch {
      void notify({
        type: "error",
        title: "Falha ao copiar link",
        source_app: "reuniao",
      });
    }
  }

  async function confirmDelete(meeting: Meeting) {
    if (drivers === null) return;
    if (inMeetingId === meeting.id) {
      setInMeetingId(null);
    }
    if (meeting.recording_url !== null && meeting.recording_url !== "") {
      const client = drivers.data.getClient();
      await client.storage
        .from(MEETINGS_BUCKET)
        .remove([meeting.recording_url]);
    }
    await drivers.data.from("meetings").delete().eq("id", meeting.id);
    setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
    if (selectedId === meeting.id) setSelectedId(null);
    setDeleteTarget(null);
  }

  async function startRecording() {
    if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
      void notify({
        type: "error",
        title: "Gravação não suportada",
        body: "Este navegador não suporta captura de tela.",
        source_app: "reuniao",
      });
      return;
    }
    setRecordingState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch {
      setRecordingState("idle");
      void notify({
        type: "warning",
        title: "Permissão negada",
        body: "Captura de tela cancelada pelo usuário.",
        source_app: "reuniao",
      });
      return;
    }
    recorderStreamRef.current = stream;
    const mime = bestVideoMime();
    const recorder = new MediaRecorder(
      stream,
      mime !== "" ? { mimeType: mime } : undefined,
    );
    recorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      void persistRecording(mime);
    };

    stream.getVideoTracks().forEach((t) => {
      t.onended = () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      };
    });

    recorder.start(1000);
    setRecordingState("recording");
  }

  async function persistRecording(mime: string) {
    const meetingId = inMeetingIdRef.current;
    if (
      drivers === null ||
      userId === null ||
      companyId === null ||
      meetingId === null
    ) {
      stopRecorderTracks();
      setRecordingState("idle");
      return;
    }
    setRecordingState("saving");
    const baseMime =
      mime !== "" ? (mime.split(";")[0] ?? "video/webm") : "video/webm";
    const blob = new Blob(recordedChunksRef.current, { type: baseMime });
    const ext = baseMime.includes("mp4") ? "mp4" : "webm";
    const path = `${userId}/${companyId}/${meetingId}-${Date.now()}.${ext}`;
    const client = drivers.data.getClient();
    const { error: uploadErr } = await client.storage
      .from(MEETINGS_BUCKET)
      .upload(path, blob, { contentType: baseMime, upsert: false });
    stopRecorderTracks();
    recorderRef.current = null;
    recordedChunksRef.current = [];
    if (uploadErr !== null) {
      setRecordingState("idle");
      void notify({
        type: "error",
        title: "Falha ao salvar gravação",
        body: uploadErr.message,
        source_app: "reuniao",
      });
      return;
    }
    const { error: updateErr } = await drivers.data
      .from("meetings")
      .update({ recording_url: path })
      .eq("id", meetingId);
    if (updateErr !== null) {
      await client.storage.from(MEETINGS_BUCKET).remove([path]);
      setRecordingState("idle");
      void notify({
        type: "error",
        title: "Falha ao salvar gravação",
        body: updateErr.message,
        source_app: "reuniao",
      });
      return;
    }
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, recording_url: path } : m)),
    );
    setRecordingState("idle");
    void notify({
      type: "success",
      title: "Gravação salva",
      body: "Disponível no card da reunião.",
      source_app: "reuniao",
    });
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder === null) return;
    if (recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }
  }

  function startTranscription() {
    const Ctor = getSpeechRecognitionCtor();
    if (Ctor === null) return;
    if (recognitionRef.current !== null) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "pt-BR";
    recognition.onresult = (e) => {
      let appended = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result !== undefined && result.isFinal) {
          appended += result[0].transcript + " ";
        }
      }
      if (appended === "") return;
      transcriptBufferRef.current =
        transcriptBufferRef.current +
        (transcriptBufferRef.current === "" ? "" : "") +
        appended;
      if (transcriptFlushTimerRef.current !== null) {
        clearTimeout(transcriptFlushTimerRef.current);
      }
      transcriptFlushTimerRef.current = setTimeout(() => {
        void flushTranscript();
      }, 1500);
    };
    recognition.onerror = () => {
      // ignore transient errors
    };
    recognition.onend = () => {
      if (
        recognitionRef.current === recognition &&
        inMeetingIdRef.current !== null
      ) {
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
          setTranscribing(false);
        }
      }
    };
    const current = inMeeting;
    transcriptBufferRef.current = current?.transcript ?? "";
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setTranscribing(true);
    } catch {
      recognitionRef.current = null;
      setTranscribing(false);
    }
  }

  if (drivers === null || userId === null || companyId === null) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#191d21",
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
      >
        Carregando…
      </div>
    );
  }

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
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <aside style={ASIDE_STYLE}>
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
            <Video
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
                }}
              >
                Reuniões
              </span>
            )}
          </div>

          {collapsed ? (
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px 0",
                gap: 2,
              }}
            >
              <button
                type="button"
                title="Nova reunião"
                aria-label="Nova reunião"
                onClick={() => setShowNewModal(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "1px solid transparent",
                  background: "rgba(14,165,233,0.15)",
                  color: "#0ea5e9",
                }}
              >
                <Plus size={16} />
              </button>
            </nav>
          ) : (
            <>
              <div style={{ padding: "0 10px 8px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0ea5e9",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <Plus size={14} />
                  Nova reunião
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  padding: "2px 8px 160px",
                }}
              >
                {loading ? (
                  <div
                    style={{
                      padding: "20px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-tertiary)",
                      fontSize: 12,
                    }}
                  >
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Carregando…
                  </div>
                ) : meetings.length === 0 ? (
                  <div style={{ padding: "16px 12px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Nenhuma reunião ainda.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 6px 4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        Próximas
                      </span>
                      <span
                        style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                      >
                        {upcoming.length}
                      </span>
                    </div>
                    {upcoming.length === 0 ? (
                      <p
                        style={{
                          margin: "0 6px 12px",
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Nada agendado.
                      </p>
                    ) : (
                      upcoming.map((m) => (
                        <MeetingListItem
                          key={m.id}
                          meeting={m}
                          active={selectedId === m.id}
                          onClick={() => setSelectedId(m.id)}
                        />
                      ))
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 6px 4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        Anteriores
                      </span>
                      <span
                        style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                      >
                        {past.length}
                      </span>
                    </div>
                    {past.length === 0 ? (
                      <p
                        style={{
                          margin: "0 6px 12px",
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Sem histórico.
                      </p>
                    ) : (
                      past.map((m) => (
                        <MeetingListItem
                          key={m.id}
                          meeting={m}
                          active={selectedId === m.id}
                          onClick={() => setSelectedId(m.id)}
                        />
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

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
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        )}
      </button>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {inMeeting !== null ? (
          <ActiveMeetingView
            meeting={inMeeting}
            onLeave={() => void leaveMeeting()}
            recordingState={recordingState}
            transcribing={transcribing}
            transcriptionSupported={transcriptionSupported}
            onStartRecording={() => void startRecording()}
            onStopRecording={() => void stopRecording()}
            onStartTranscription={startTranscription}
            onStopTranscription={stopTranscription}
          />
        ) : selected !== null ? (
          <MeetingDetail
            meeting={selected}
            onEnter={() => void enterMeeting(selected)}
            onCopy={() => void copyLink(selected)}
            onDelete={() => setDeleteTarget(selected)}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="Video"
              title="Reuniões"
              description="Crie uma nova reunião ou selecione uma existente para entrar."
              action={
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  style={{
                    marginTop: 8,
                    background: "#0ea5e9",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} /> Nova reunião
                </button>
              }
            />
          </div>
        )}
      </div>

      <NewMeetingModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateMeeting}
      />

      <DeleteConfirmModal
        open={deleteTarget !== null}
        title="Excluir reunião"
        message={`Excluir "${deleteTarget?.title ?? ""}"? Esta ação não pode ser desfeita.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget !== null) void confirmDelete(deleteTarget);
        }}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-rec { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
      `}</style>
    </div>
  );
}

interface MeetingDetailProps {
  meeting: Meeting;
  onEnter: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function MeetingDetail({
  meeting,
  onEnter,
  onCopy,
  onDelete,
}: MeetingDetailProps) {
  const url = `https://meet.jit.si/${meeting.room_id}`;
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "none",
        padding: "32px 32px 160px",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(14,165,233,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Video size={22} color="#0ea5e9" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {meeting.title}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <CalendarIcon size={11} /> {fmtDateTime(meeting.scheduled_at)}
              </span>
              {meeting.started_at !== null && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={11} /> Iniciada {fmtDateTime(meeting.started_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        {meeting.description !== null && meeting.description !== "" && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              margin: "0 0 16px",
            }}
          >
            {meeting.description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            marginBottom: 18,
          }}
        >
          <Link2
            size={14}
            color="var(--text-tertiary)"
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onEnter}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <PlayCircle size={14} /> Entrar
          </button>
          <button
            type="button"
            onClick={onCopy}
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 9,
              padding: "9px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Copy size={13} /> Copiar link
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: "rgba(239,68,68,0.10)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.20)",
              borderRadius: 9,
              padding: "9px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={13} /> Excluir
          </button>
        </div>

        {meeting.recording_url !== null && meeting.recording_url !== "" && (
          <div
            style={{
              marginTop: 20,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.18)",
              fontSize: 12,
              color: "#86efac",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Circle size={10} fill="#22c55e" color="#22c55e" />
            Gravação disponível em{" "}
            <code
              style={{ fontFamily: "ui-monospace, monospace", opacity: 0.85 }}
            >
              {meeting.recording_url}
            </code>
          </div>
        )}

        {meeting.transcript !== null && meeting.transcript !== "" && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 8,
              }}
            >
              Transcrição
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {meeting.transcript}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActiveMeetingViewProps {
  meeting: Meeting;
  onLeave: () => void;
  recordingState: "idle" | "starting" | "recording" | "saving";
  transcribing: boolean;
  transcriptionSupported: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStartTranscription: () => void;
  onStopTranscription: () => void;
}

function ActiveMeetingView({
  meeting,
  onLeave,
  recordingState,
  transcribing,
  transcriptionSupported,
  onStartRecording,
  onStopRecording,
  onStartTranscription,
  onStopTranscription,
}: ActiveMeetingViewProps) {
  const jitsiUrl = `https://meet.jit.si/${meeting.room_id}#config.prejoinPageEnabled=false`;
  const recording = recordingState === "recording";
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "#11161c",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <Video size={16} color="#0ea5e9" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meeting.title}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            sala: {meeting.room_id}
          </div>
        </div>

        {recording && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#fca5a5",
              padding: "3px 9px",
              borderRadius: 20,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.20)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef4444",
                animation: "pulse-rec 1s ease-in-out infinite",
              }}
            />
            Gravando
          </span>
        )}

        <button
          type="button"
          onClick={recording ? onStopRecording : onStartRecording}
          disabled={
            recordingState === "starting" || recordingState === "saving"
          }
          style={{
            background: recording
              ? "rgba(239,68,68,0.12)"
              : "rgba(255,255,255,0.05)",
            color: recording ? "#fca5a5" : "var(--text-secondary)",
            border: `1px solid ${recording ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.10)"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            cursor:
              recordingState === "starting" || recordingState === "saving"
                ? "not-allowed"
                : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {recordingState === "starting" || recordingState === "saving" ? (
            <Loader2
              size={12}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : recording ? (
            <Square size={12} fill="#fca5a5" />
          ) : (
            <Circle size={10} fill="#ef4444" color="#ef4444" />
          )}
          {recordingState === "starting"
            ? "Iniciando…"
            : recordingState === "saving"
              ? "Salvando…"
              : recording
                ? "Parar gravação"
                : "Iniciar gravação"}
        </button>

        <button
          type="button"
          onClick={transcribing ? onStopTranscription : onStartTranscription}
          disabled={!transcriptionSupported}
          title={
            transcriptionSupported
              ? ""
              : "Transcrição não suportada neste navegador"
          }
          style={{
            background: transcribing
              ? "rgba(99,102,241,0.14)"
              : "rgba(255,255,255,0.05)",
            color: !transcriptionSupported
              ? "var(--text-tertiary)"
              : transcribing
                ? "#a5b4fc"
                : "var(--text-secondary)",
            border: `1px solid ${transcribing ? "rgba(99,102,241,0.24)" : "rgba(255,255,255,0.10)"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            cursor: transcriptionSupported ? "pointer" : "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {transcribing ? <Mic size={12} /> : <MicOff size={12} />}
          {transcriptionSupported
            ? transcribing
              ? "Parar transcrição"
              : "Iniciar transcrição"
            : "Transcrição indisponível"}
        </button>

        <button
          type="button"
          onClick={onLeave}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <LogOut size={12} /> Sair
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", background: "#000" }}>
        <iframe
          key={meeting.room_id}
          title={`Reunião ${meeting.title}`}
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </div>

      {!transcriptionSupported && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--text-tertiary)",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 6,
            pointerEvents: "none",
          }}
        >
          <X size={11} /> Transcrição não suportada neste navegador
        </div>
      )}
    </>
  );
}
