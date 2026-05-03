import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Download,
  CloudUpload,
  Trash2,
  Loader2,
  ZapOff,
  RefreshCw,
  X,
  Volume2,
  FileAudio,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useNotify } from "../../hooks/useNotify";
import { useSessionStore } from "../../stores/session";
import { moveToTrash } from "../../lib/trash";

// ─── Types ────────────────────────────────────────────────────────────────────

type MicState =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "paused"
  | "denied"
  | "unavailable"
  | "unsupported";

interface PendingRec {
  blob: Blob;
  url: string;
  durationMs: number;
  waveform: number[];
  title: string;
  description: string;
}

interface SavedRec {
  id: string;
  title: string;
  description: string;
  mime_type: string;
  storage_path: string;
  duration_seconds: number;
  size_bytes: number;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_BUCKET = "kernel-voice";
const NUM_VIZ_BARS = 48;

// ─── Utilities ────────────────────────────────────────────────────────────────

function isMediaSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function getBestAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function mimeToExt(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fmtSec(sec: number): string {
  return fmtMs(Math.round(sec) * 1000);
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultTitle(): string {
  return `Gravação ${new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

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

const BTN: React.CSSProperties = {
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "all 120ms ease",
  fontFamily: "inherit",
};

const INPUT_STYLE: React.CSSProperties = {
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

// ─── Visualizer ───────────────────────────────────────────────────────────────

function Visualizer({ bands, active }: { bands: number[]; active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 60 }}>
      {bands.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: 2,
            background: active
              ? `rgba(239,68,68,${Math.max(0.18, Math.min(1, 0.25 + v * 0.85))})`
              : "rgba(255,255,255,0.07)",
            height: `${Math.max(8, Math.round(v * 92))}%`,
            transition: active
              ? "height 55ms ease, background 55ms ease"
              : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── StaticWaveform ───────────────────────────────────────────────────────────

function StaticWaveform({ data }: { data: number[] }) {
  const N = 64;
  const bars =
    data.length === 0
      ? Array(N).fill(0.15)
      : Array.from({ length: N }, (_, i) => {
          const start = Math.floor((i * data.length) / N);
          const end = Math.max(
            start + 1,
            Math.floor(((i + 1) * data.length) / N),
          );
          const slice = data.slice(start, end);
          return slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length);
        });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40 }}>
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: 2,
            background: `rgba(99,102,241,${Math.max(0.18, v * 0.85)})`,
            height: `${Math.max(10, Math.round(v * 88))}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── RecListItem ──────────────────────────────────────────────────────────────

interface RecListItemProps {
  rec: SavedRec;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function RecListItem({
  rec,
  isPlaying,
  isLoading,
  onPlay,
  onDownload,
  onDelete,
}: RecListItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "7px 8px",
        borderRadius: 7,
        marginBottom: 1,
        background: isPlaying
          ? "rgba(99,102,241,0.10)"
          : hovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
        border: `1px solid ${isPlaying ? "rgba(99,102,241,0.22)" : "transparent"}`,
        transition: "background 100ms, border-color 100ms",
      }}
    >
      {/* Row 1: play + title + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={onPlay}
          aria-label={isPlaying ? "Pausar gravação" : "Reproduzir gravação"}
          style={{
            ...BTN,
            width: 24,
            height: 24,
            borderRadius: "50%",
            flexShrink: 0,
            background: isPlaying
              ? "rgba(99,102,241,0.28)"
              : "rgba(255,255,255,0.08)",
            color: isPlaying ? "#a5b4fc" : "var(--text-secondary)",
          }}
        >
          {isLoading ? (
            <Loader2
              size={11}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : isPlaying ? (
            <Pause size={11} />
          ) : (
            <Play size={11} />
          )}
        </button>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {rec.title}
        </span>
        {hovered && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              aria-label="Baixar gravação"
              style={{
                ...BTN,
                padding: 4,
                background: "none",
                color: "var(--text-tertiary)",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              <Download size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Excluir gravação"
              style={{
                ...BTN,
                padding: 4,
                background: "none",
                color: "#f87171",
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>

      {/* Row 2: metadata */}
      <div style={{ paddingLeft: 30, marginTop: 3 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtSec(rec.duration_seconds)} · {fmtDate(rec.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GravadorDeVozApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();
  const notify = useNotify();

  const [collapsed, setCollapsed] = useState(false);
  const [micState, setMicState] = useState<MicState>(
    isMediaSupported() ? "idle" : "unsupported",
  );
  const [recMs, setRecMs] = useState(0);
  const [freqBands, setFreqBands] = useState<number[]>(
    Array(NUM_VIZ_BARS).fill(0),
  );
  const [pendingRec, setPendingRec] = useState<PendingRec | null>(null);
  const [savedRecs, setSavedRecs] = useState<SavedRec[]>([]);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingPlayKey, setLoadingPlayKey] = useState<string | null>(null);
  const [savingPending, setSavingPending] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const recBaseRef = useRef<number>(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recMsRef = useRef<number>(0);
  const sampledRef = useRef<number[]>([]);
  const vizActiveRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const signedUrlCache = useRef<Map<string, string>>(new Map());
  const pendingRecRef = useRef<PendingRec | null>(null);
  pendingRecRef.current = pendingRec;

  useEffect(() => {
    recMsRef.current = recMs;
  }, [recMs]);
  isRecordingRef.current = micState === "recording";

  // ── Viz loop ──────────────────────────────────────────────────────────────

  const startVizLoop = useCallback(() => {
    vizActiveRef.current = true;
    let frame = 0;
    function tick() {
      if (!vizActiveRef.current) return;
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const step = Math.floor(data.length / NUM_VIZ_BARS);
        const bands: number[] = [];
        for (let i = 0; i < NUM_VIZ_BARS; i++) {
          let sum = 0;
          const end = Math.min((i + 1) * step, data.length);
          for (let j = i * step; j < end; j++) sum += data[j] ?? 0;
          bands.push(sum / step / 255);
        }
        setFreqBands(bands);
        frame++;
        if (isRecordingRef.current && frame % 4 === 0) {
          const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
          sampledRef.current.push(Math.min(1, avg * 3));
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopVizLoop = useCallback(() => {
    vizActiveRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setFreqBands(Array(NUM_VIZ_BARS).fill(0));
  }, []);

  const stopStream = useCallback(() => {
    stopVizLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, [stopVizLoop]);

  useEffect(() => {
    return () => {
      stopStream();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      const pr = pendingRecRef.current;
      if (pr) URL.revokeObjectURL(pr.url);
    };
  }, [stopStream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlayingKey(null);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  // ── DB ────────────────────────────────────────────────────────────────────

  const loadSavedRecs = useCallback(async () => {
    if (!drivers?.data || !userId || !companyId) return;
    const { data } = await drivers.data
      .from("voice_recordings")
      .select(
        "id,title,description,mime_type,storage_path,duration_seconds,size_bytes,created_at",
      )
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (data) {
      setSavedRecs(
        (data as Record<string, unknown>[]).map((r) => ({
          id: r["id"] as string,
          title: r["title"] as string,
          description: (r["description"] as string) ?? "",
          mime_type: r["mime_type"] as string,
          storage_path: r["storage_path"] as string,
          duration_seconds: Number(r["duration_seconds"]),
          size_bytes: Number(r["size_bytes"]),
          created_at: r["created_at"] as string,
        })),
      );
    }
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadSavedRecs();
  }, [loadSavedRecs]);

  // ── Mic / Recording ───────────────────────────────────────────────────────

  async function acquireMic(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startVizLoop();
      return stream;
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError")
        setMicState("denied");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError")
        setMicState("unavailable");
      else setMicState("denied");
      return null;
    }
  }

  function startRecorder(stream: MediaStream) {
    const mimeType = getBestAudioMime();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    chunksRef.current = [];
    sampledRef.current = [];
    recBaseRef.current = 0;
    recStartRef.current = Date.now();

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const durationMs = recMsRef.current;
      const actualMime = mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: actualMime });
      const url = URL.createObjectURL(blob);
      const waveform = [...sampledRef.current];
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      setRecMs(0);
      setPendingRec({
        blob,
        url,
        durationMs,
        waveform,
        title: defaultTitle(),
        description: "",
      });
      setMicState("ready");
    };

    recorder.start(1000);
    recTimerRef.current = setInterval(() => {
      const elapsed = recBaseRef.current + (Date.now() - recStartRef.current);
      recMsRef.current = elapsed;
      setRecMs(elapsed);
    }, 100);
    setMicState("recording");
  }

  async function handleStartRecording() {
    if (!isMediaSupported()) {
      setMicState("unsupported");
      return;
    }
    setMicState("requesting");
    let stream = streamRef.current;
    if (!stream) {
      stream = await acquireMic();
      if (!stream) return;
    }
    startRecorder(stream);
  }

  function handlePause() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      recBaseRef.current += Date.now() - recStartRef.current;
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      setMicState("paused");
    }
  }

  function handleResume() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      recStartRef.current = Date.now();
      recTimerRef.current = setInterval(() => {
        const elapsed = recBaseRef.current + (Date.now() - recStartRef.current);
        recMsRef.current = elapsed;
        setRecMs(elapsed);
      }, 100);
      setMicState("recording");
    }
  }

  function handleStop() {
    recorderRef.current?.stop();
  }

  // ── Pending ───────────────────────────────────────────────────────────────

  function discardPending() {
    if (pendingRec) URL.revokeObjectURL(pendingRec.url);
    setPendingRec(null);
    setPlayingKey(null);
  }

  function downloadPending() {
    if (!pendingRec) return;
    const ext = mimeToExt(pendingRec.blob.type);
    const a = document.createElement("a");
    a.href = pendingRec.url;
    a.download = `${pendingRec.title}.${ext}`;
    a.click();
  }

  async function downloadSaved(rec: SavedRec) {
    if (!drivers?.data) return;
    const client = drivers.data.getClient();
    const { data } = await client.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(rec.storage_path, 60);
    if (!data?.signedUrl) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `${rec.title}.${mimeToExt(rec.mime_type)}`;
    a.click();
  }

  async function savePending() {
    if (!pendingRec || !drivers?.data || !userId || !companyId) return;
    setSavingPending(true);
    const ext = mimeToExt(pendingRec.blob.type);
    const baseMime =
      (pendingRec.blob.type || "audio/webm").split(";")[0]?.trim() ||
      "audio/webm";
    const path = `${userId}/${companyId}/${crypto.randomUUID()}-${pendingRec.title.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
    const client = drivers.data.getClient();
    const { error: uploadErr } = await client.storage
      .from(VOICE_BUCKET)
      .upload(path, pendingRec.blob, { contentType: baseMime, upsert: false });
    if (uploadErr) {
      setSavingPending(false);
      void notify({
        type: "error",
        title: "Falha ao salvar gravação",
        body: uploadErr.message,
        source_app: "gravador-de-voz",
      });
      return;
    }
    const { error: insertErr } = await drivers.data
      .from("voice_recordings")
      .insert({
        user_id: userId,
        company_id: companyId,
        title: pendingRec.title,
        description: pendingRec.description,
        mime_type: baseMime,
        storage_path: path,
        duration_seconds: pendingRec.durationMs / 1000,
        size_bytes: pendingRec.blob.size,
      });
    setSavingPending(false);
    if (insertErr) {
      await client.storage.from(VOICE_BUCKET).remove([path]);
      void notify({
        type: "error",
        title: "Falha ao salvar gravação",
        body: insertErr.message,
        source_app: "gravador-de-voz",
      });
      return;
    }
    URL.revokeObjectURL(pendingRec.url);
    void notify({
      type: "success",
      title: "Gravação salva",
      body: pendingRec.title,
      source_app: "gravador-de-voz",
    });
    setPendingRec(null);
    setPlayingKey(null);
    await loadSavedRecs();
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  function playPending() {
    const audio = audioRef.current;
    const pr = pendingRec;
    if (!audio || !pr) return;
    if (playingKey === "pending") {
      audio.pause();
      setPlayingKey(null);
    } else {
      audio.src = pr.url;
      void audio.play();
      setPlayingKey("pending");
    }
  }

  async function playSaved(rec: SavedRec) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingKey === rec.id) {
      audio.pause();
      setPlayingKey(null);
      return;
    }
    setLoadingPlayKey(rec.id);
    let url = signedUrlCache.current.get(rec.id);
    if (!url && drivers?.data) {
      const client = drivers.data.getClient();
      const { data } = await client.storage
        .from(VOICE_BUCKET)
        .createSignedUrl(rec.storage_path, 3600);
      if (data?.signedUrl) {
        url = data.signedUrl;
        signedUrlCache.current.set(rec.id, url);
      }
    }
    setLoadingPlayKey(null);
    if (!url) return;
    audio.src = url;
    void audio.play();
    setPlayingKey(rec.id);
  }

  async function deleteSaved(rec: SavedRec) {
    if (!drivers?.data || !userId || !companyId) return;
    if (playingKey === rec.id) {
      audioRef.current?.pause();
      setPlayingKey(null);
    }
    const url = signedUrlCache.current.get(rec.id) ?? "";
    signedUrlCache.current.delete(rec.id);
    await moveToTrash({
      drivers,
      userId,
      companyId,
      appId: "gravador-de-voz",
      itemType: "recording",
      itemName: rec.title.trim() !== "" ? rec.title : "(Sem título)",
      itemData: {
        ...(rec as unknown as Record<string, unknown>),
        url,
        bucket: VOICE_BUCKET,
        duration: rec.duration_seconds,
      },
      originalId: rec.id,
    });
    await drivers.data.from("voice_recordings").delete().eq("id", rec.id);
    await loadSavedRecs();
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const canRecord = typeof MediaRecorder !== "undefined";
  const canStartNew =
    (micState === "idle" || micState === "ready") && !pendingRec;

  const isRecordingOrPaused = micState === "recording" || micState === "paused";
  const isPending = !!pendingRec && micState === "ready";

  // Header label / icon for main content area
  const headerLabel: string = isPending
    ? "Revisando gravação"
    : micState === "recording"
      ? "Gravando"
      : micState === "paused"
        ? "Em pausa"
        : micState === "requesting"
          ? "Aguardando permissão..."
          : micState === "denied"
            ? "Permissão negada"
            : micState === "unavailable"
              ? "Microfone indisponível"
              : micState === "unsupported"
                ? "Não suportado"
                : "Nova Gravação";

  // ─── Render ───────────────────────────────────────────────────────────────

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
      {/* ── Sidebar wrapper — animated width ── */}
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
            <Mic
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
                Gravador de Voz
              </span>
            )}
          </div>

          {collapsed ? (
            /* Icon-only state */
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
                title="Nova Gravação"
                onClick={() => {
                  if (canStartNew) void handleStartRecording();
                }}
                disabled={!canStartNew}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canStartNew ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "background 120ms ease",
                  border: "1px solid transparent",
                  background: canStartNew
                    ? "rgba(239,68,68,0.15)"
                    : "transparent",
                  color: canStartNew ? "#ef4444" : "var(--text-tertiary)",
                }}
                onMouseEnter={(e) => {
                  if (canStartNew)
                    e.currentTarget.style.background = "rgba(239,68,68,0.25)";
                }}
                onMouseLeave={(e) => {
                  if (canStartNew)
                    e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                }}
              >
                <Mic size={16} />
              </button>
              {savedRecs.length > 0 && (
                <button
                  type="button"
                  title={`${savedRecs.length} gravação${savedRecs.length !== 1 ? "ões" : ""}`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "default",
                    flexShrink: 0,
                    border: "1px solid transparent",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    position: "relative",
                  }}
                >
                  <FileAudio size={16} />
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: 1,
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "1px 3px",
                      minWidth: 12,
                      textAlign: "center",
                    }}
                  >
                    {savedRecs.length}
                  </span>
                </button>
              )}
            </nav>
          ) : (
            /* Expanded */
            <>
              {/* Nova Gravação button */}
              <div style={{ padding: "0 10px 8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (canStartNew) void handleStartRecording();
                  }}
                  disabled={!canStartNew}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: canStartNew
                      ? "#ef4444"
                      : "rgba(255,255,255,0.05)",
                    color: canStartNew ? "#fff" : "var(--text-tertiary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: canStartNew ? "pointer" : "not-allowed",
                    width: "100%",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    if (canStartNew)
                      e.currentTarget.style.background = "#dc2626";
                  }}
                  onMouseLeave={(e) => {
                    if (canStartNew)
                      e.currentTarget.style.background = "#ef4444";
                  }}
                >
                  <Mic size={13} />
                  Nova Gravação
                </button>
              </div>

              {/* Section label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px 4px",
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
                  Gravações
                </span>
                {savedRecs.length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    {savedRecs.length}
                  </span>
                )}
              </div>

              {/* Recording list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  padding: "2px 8px 160px",
                }}
              >
                {savedRecs.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      padding: "24px 8px",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(239,68,68,0.10)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileAudio size={18} style={{ color: "#ef4444" }} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        maxWidth: 160,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        Nenhuma gravação
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          lineHeight: 1.5,
                        }}
                      >
                        Grave e salve para listar aqui.
                      </p>
                    </div>
                  </div>
                ) : (
                  savedRecs.map((rec) => (
                    <RecListItem
                      key={rec.id}
                      rec={rec}
                      isPlaying={playingKey === rec.id}
                      isLoading={loadingPlayKey === rec.id}
                      onPlay={() => {
                        void playSaved(rec);
                      }}
                      onDownload={() => {
                        void downloadSaved(rec);
                      }}
                      onDelete={() => {
                        void deleteSaved(rec);
                      }}
                    />
                  ))
                )}
              </div>
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

      {/* ── Main content ── */}
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
          {/* State indicator dot / icon */}
          {micState === "recording" ? (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                flexShrink: 0,
                animation: "pulse 1s ease-in-out infinite",
              }}
            />
          ) : micState === "requesting" ? (
            <Loader2
              size={14}
              style={{
                color: "var(--text-tertiary)",
                animation: "spin 1s linear infinite",
                flexShrink: 0,
              }}
            />
          ) : isPending ? (
            <span style={{ color: "#22c55e", display: "flex", flexShrink: 0 }}>
              <Check size={14} />
            </span>
          ) : (
            <span style={{ color: "#ef4444", display: "flex", flexShrink: 0 }}>
              <Mic size={14} />
            </span>
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
            {headerLabel}
          </h2>
          {isPending && pendingRec && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginLeft: 2,
              }}
            >
              {fmtMs(pendingRec.durationMs)} · {fmtBytes(pendingRec.blob.size)}
            </span>
          )}
          {isRecordingOrPaused && (
            <span
              style={{
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                marginLeft: 4,
                color:
                  micState === "recording" ? "#fca5a5" : "var(--text-tertiary)",
              }}
            >
              {fmtMs(recMs)}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Error states ── */}

          {micState === "unsupported" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <ZapOff
                size={40}
                style={{
                  color: "var(--text-tertiary)",
                  marginBottom: 16,
                  opacity: 0.5,
                }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Navegador incompatível
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  maxWidth: 340,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Este navegador não suporta a API de microfone. Use Chrome, Edge
                ou Firefox atualizado.
              </p>
            </div>
          )}

          {micState === "denied" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <MicOff
                size={40}
                style={{ color: "#f87171", marginBottom: 16, opacity: 0.7 }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Permissão negada
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  maxWidth: 360,
                  lineHeight: 1.65,
                  margin: "0 0 24px",
                }}
              >
                Clique no cadeado na barra de endereço, mude o microfone para{" "}
                <strong>Permitir</strong> e recarregue a página.
              </p>
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                style={{
                  ...BTN,
                  padding: "9px 20px",
                  borderRadius: 9,
                  fontSize: 13,
                  background: "rgba(239,68,68,0.12)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.22)",
                }}
              >
                <RefreshCw size={13} /> Tentar novamente
              </button>
            </div>
          )}

          {micState === "unavailable" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <MicOff
                size={40}
                style={{ color: "#fbbf24", marginBottom: 16, opacity: 0.7 }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Nenhum microfone encontrado
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  maxWidth: 320,
                  lineHeight: 1.65,
                  margin: "0 0 24px",
                }}
              >
                Conecte um microfone e tente novamente.
              </p>
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                style={{
                  ...BTN,
                  padding: "9px 20px",
                  borderRadius: 9,
                  fontSize: 13,
                  background: "rgba(245,158,11,0.10)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245,158,11,0.18)",
                }}
              >
                <RefreshCw size={13} /> Tentar novamente
              </button>
            </div>
          )}

          {/* ── Requesting ── */}

          {micState === "requesting" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <Loader2
                size={36}
                style={{
                  color: "#6366f1",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Aguardando permissão do microfone…
              </div>
            </div>
          )}

          {/* ── Idle / Ready: no pending ── */}

          {(micState === "idle" || micState === "ready") && !pendingRec && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: "40px 24px",
              }}
            >
              {micState === "ready" && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "4px 14px",
                    borderRadius: 20,
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.18)",
                    fontSize: 11,
                    color: "#86efac",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  Microfone pronto
                </div>
              )}

              <button
                type="button"
                aria-label="Iniciar gravação"
                onClick={() => void handleStartRecording()}
                style={{
                  ...BTN,
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  flexDirection: "column",
                  background: "rgba(239,68,68,0.10)",
                  border: "2px solid rgba(239,68,68,0.32)",
                  color: "#ef4444",
                  gap: 0,
                  boxShadow:
                    "0 0 0 10px rgba(239,68,68,0.04), 0 0 0 20px rgba(239,68,68,0.02)",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.16)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 10px rgba(239,68,68,0.06), 0 0 0 20px rgba(239,68,68,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.10)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 10px rgba(239,68,68,0.04), 0 0 0 20px rgba(239,68,68,0.02)";
                }}
              >
                <Mic size={36} />
              </button>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {micState === "idle"
                    ? "Clique para iniciar gravação"
                    : "Iniciar nova gravação"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 8,
                    maxWidth: 300,
                    lineHeight: 1.65,
                  }}
                >
                  O áudio fica no dispositivo até você salvar ou baixar.
                </div>
              </div>
            </div>
          )}

          {/* ── Recording / Paused ── */}

          {isRecordingOrPaused && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 32px 160px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 480,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0,
                }}
              >
                {/* Status badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "4px 14px",
                    borderRadius: 20,
                    marginBottom: 24,
                    background:
                      micState === "recording"
                        ? "rgba(239,68,68,0.10)"
                        : "rgba(245,158,11,0.08)",
                    border: `1px solid ${micState === "recording" ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.18)"}`,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        micState === "recording" ? "#ef4444" : "#f59e0b",
                      animation:
                        micState === "recording"
                          ? "pulse 1s ease-in-out infinite"
                          : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: micState === "recording" ? "#fca5a5" : "#fbbf24",
                    }}
                  >
                    {micState === "recording" ? "Gravando" : "Pausado"}
                  </span>
                </div>

                {/* Timer */}
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    color:
                      micState === "recording"
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    marginBottom: 28,
                    transition: "color 300ms",
                  }}
                >
                  {fmtMs(recMs)}
                </div>

                {/* Visualizer */}
                <div
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.025)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 32,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Visualizer
                    bands={freqBands}
                    active={micState === "recording"}
                  />
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {micState === "recording" && canRecord && (
                    <button
                      type="button"
                      aria-label="Pausar gravação"
                      onClick={handlePause}
                      style={{
                        ...BTN,
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.07)",
                        color: "var(--text-secondary)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      <Pause size={18} />
                    </button>
                  )}
                  {micState === "paused" && (
                    <button
                      type="button"
                      aria-label="Retomar gravação"
                      onClick={handleResume}
                      style={{
                        ...BTN,
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.07)",
                        color: "var(--text-secondary)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      <Play size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Parar gravação"
                    onClick={handleStop}
                    style={{
                      ...BTN,
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#ef4444",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(239,68,68,0.30)",
                      transition: "background 120ms, box-shadow 120ms",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                    }}
                  >
                    <Square size={22} fill="#fff" style={{ color: "#fff" }} />
                  </button>
                </div>

                {!canRecord && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    MediaRecorder não suportado neste navegador.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Pending recording ── */}

          {isPending && pendingRec && (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                scrollbarWidth: "none",
                padding: "24px 28px 160px",
              }}
            >
              <div style={{ maxWidth: 520, margin: "0 auto" }}>
                {/* Waveform */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 14,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <StaticWaveform data={pendingRec.waveform} />
                </div>

                {/* Playback row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <button
                    type="button"
                    aria-label={
                      playingKey === "pending"
                        ? "Pausar reprodução"
                        : "Reproduzir gravação"
                    }
                    onClick={playPending}
                    style={{
                      ...BTN,
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        playingKey === "pending"
                          ? "rgba(99,102,241,0.28)"
                          : "#6366f1",
                      color: "#fff",
                    }}
                  >
                    {playingKey === "pending" ? (
                      <Pause size={15} />
                    ) : (
                      <Play size={15} />
                    )}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {playingKey === "pending"
                        ? "Reproduzindo…"
                        : "Ouvir antes de salvar"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {fmtMs(pendingRec.durationMs)}
                    </div>
                  </div>
                  <Volume2
                    size={13}
                    style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
                  />
                </div>

                {/* Title */}
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
                  Nome da gravação
                </label>
                <input
                  value={pendingRec.title}
                  onChange={(e) =>
                    setPendingRec((prev) =>
                      prev ? { ...prev, title: e.target.value } : null,
                    )
                  }
                  style={{ ...INPUT_STYLE, marginBottom: 14 }}
                  maxLength={80}
                />

                {/* Description */}
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
                  Descrição{" "}
                  <span
                    style={{
                      opacity: 0.5,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    (opcional)
                  </span>
                </label>
                <textarea
                  value={pendingRec.description}
                  onChange={(e) =>
                    setPendingRec((prev) =>
                      prev ? { ...prev, description: e.target.value } : null,
                    )
                  }
                  rows={2}
                  placeholder="Contexto, assunto ou observações..."
                  style={{
                    ...INPUT_STYLE,
                    resize: "vertical",
                    marginBottom: 20,
                    fontFamily: "inherit",
                  }}
                  maxLength={300}
                />

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={discardPending}
                    style={{
                      ...BTN,
                      padding: "9px 14px",
                      borderRadius: 9,
                      fontSize: 13,
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-secondary)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <X size={13} /> Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadPending()}
                    style={{
                      ...BTN,
                      padding: "9px 14px",
                      borderRadius: 9,
                      fontSize: 13,
                      flex: 1,
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-secondary)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <Download size={13} /> Baixar
                  </button>
                  <button
                    type="button"
                    onClick={() => void savePending()}
                    disabled={savingPending || !drivers?.data}
                    style={{
                      ...BTN,
                      padding: "9px 14px",
                      borderRadius: 9,
                      fontSize: 13,
                      flex: 1.4,
                      background:
                        drivers?.data && !savingPending
                          ? "#6366f1"
                          : "rgba(99,102,241,0.25)",
                      color:
                        drivers?.data && !savingPending
                          ? "#fff"
                          : "rgba(255,255,255,0.35)",
                      cursor:
                        drivers?.data && !savingPending
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    {savingPending ? (
                      <>
                        <Loader2
                          size={13}
                          style={{ animation: "spin 1s linear infinite" }}
                        />{" "}
                        Salvando…
                      </>
                    ) : (
                      <>
                        <CloudUpload size={13} /> Salvar
                      </>
                    )}
                  </button>
                </div>

                {!drivers?.data && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 10,
                      textAlign: "center",
                    }}
                  >
                    Salvamento indisponível — baixe o arquivo para guardar
                    localmente.
                  </p>
                )}

                {/* New recording link */}
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => void handleStartRecording()}
                    style={{
                      ...BTN,
                      padding: "7px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      background: "rgba(239,68,68,0.08)",
                      color: "#fca5a5",
                      border: "1px solid rgba(239,68,68,0.16)",
                    }}
                  >
                    <Mic size={12} /> Nova gravação
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: "none" }} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}
