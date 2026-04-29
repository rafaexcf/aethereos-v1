import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session.js";
import { useDrivers } from "../../lib/drivers-context.js";
import type { RealtimeSubscription } from "@aethereos/drivers-supabase/browser";

// ---------------------------------------------------------------------------
// Tipos de domínio
// ---------------------------------------------------------------------------

interface Channel {
  id: string;
  name: string;
  kind: "channel" | "dm";
}

interface Message {
  id: string;
  channelId: string;
  senderUserId: string;
  senderName: string;
  body: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapChannel(row: Record<string, unknown>): Channel {
  return {
    id: row["id"] as string,
    name: (row["name"] as string | null) ?? "(sem nome)",
    kind: (row["kind"] as "channel" | "dm") ?? "channel",
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  const meta = (row["metadata"] ?? {}) as Record<string, unknown>;
  return {
    id: row["id"] as string,
    channelId: row["channel_id"] as string,
    senderUserId: row["sender_user_id"] as string,
    senderName:
      typeof meta["sender_name"] === "string"
        ? meta["sender_name"]
        : (row["sender_user_id"] as string).slice(0, 8),
    body: row["body"] as string,
    createdAt: new Date(row["created_at"] as string),
  };
}

// ---------------------------------------------------------------------------
// Sub-componente: ChannelList
// ---------------------------------------------------------------------------

interface ChannelListProps {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateChannel: () => void;
}

function ChannelList({
  channels,
  activeId,
  onSelect,
  onCreateChannel,
}: ChannelListProps) {
  return (
    <div className="flex flex-col p-2">
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Canais
        </span>
        <button
          type="button"
          onClick={onCreateChannel}
          className="text-xs text-zinc-600 hover:text-zinc-300"
          title="Novo canal"
        >
          +
        </button>
      </div>
      {channels.map((ch) => (
        <button
          key={ch.id}
          type="button"
          onClick={() => onSelect(ch.id)}
          className={[
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors text-left",
            activeId === ch.id
              ? "bg-violet-600/20 text-violet-300"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          ].join(" ")}
        >
          <span className="text-zinc-600">#</span>
          <span className="truncate">{ch.name}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: MessageList
// ---------------------------------------------------------------------------

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
}

function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        Nenhuma mensagem ainda. Seja o primeiro a escrever!
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
      {messages.map((msg) => {
        const isOwn = msg.senderUserId === currentUserId;
        return (
          <div key={msg.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span
                className={[
                  "text-xs font-semibold",
                  isOwn ? "text-violet-400" : "text-zinc-300",
                ].join(" ")}
              >
                {isOwn ? "Você" : msg.senderName}
              </span>
              <span className="text-xs text-zinc-700">
                {msg.createdAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-200">{msg.body}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatApp principal
// ---------------------------------------------------------------------------

export function ChatApp() {
  const { userId, email, activeCompanyId } = useSessionStore();
  const drivers = useDrivers();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const realtimeRef = useRef<RealtimeSubscription | null>(null);

  // Carrega canais do usuário
  useEffect(() => {
    if (drivers === null || userId === null) return;
    setLoading(true);

    drivers.data
      .from("chat_channels")
      .select("id,name,kind")
      .order("name")
      .then(({ data }) => {
        setLoading(false);
        const chs = (data ?? []).map((r) =>
          mapChannel(r as Record<string, unknown>),
        );
        setChannels(chs);
        if (chs.length > 0 && activeChannelId === null) {
          setActiveChannelId(chs[0]?.id ?? null);
        }
      });
  }, [drivers, userId]);

  // Carrega mensagens do canal ativo + subscreve Realtime
  useEffect(() => {
    if (drivers === null || activeChannelId === null) return;

    // Cancela subscription anterior
    realtimeRef.current?.unsubscribe();
    realtimeRef.current = null;
    setMessages([]);

    // Carrega histórico
    drivers.data
      .from("chat_messages")
      .select("id,channel_id,sender_user_id,body,metadata,created_at")
      .eq("channel_id", activeChannelId)
      .order("created_at")
      .limit(100)
      .then(({ data }) => {
        setMessages(
          (data ?? []).map((r) => mapMessage(r as Record<string, unknown>)),
        );
      });

    // Realtime: escuta novas mensagens neste canal
    realtimeRef.current = drivers.data.subscribeToTable({
      table: "chat_messages",
      event: "INSERT",
      filter: `channel_id=eq.${activeChannelId}`,
      onData: (payload) => {
        const newRow = payload.new as Record<string, unknown> | null;
        if (newRow === null) return;
        setMessages((prev) => {
          // Evita duplicar se o insert já chegou via query inicial
          if (prev.some((m) => m.id === (newRow["id"] as string))) return prev;
          return [...prev, mapMessage(newRow)];
        });
      },
    });

    return () => {
      realtimeRef.current?.unsubscribe();
      realtimeRef.current = null;
    };
  }, [drivers, activeChannelId]);

  const displayName = email?.split("@")[0] ?? "Usuário";

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (
      body.length === 0 ||
      activeChannelId === null ||
      drivers === null ||
      userId === null
    )
      return;

    setDraft("");

    const { data: inserted } = await drivers.data
      .from("chat_messages")
      .insert({
        channel_id: activeChannelId,
        sender_user_id: userId,
        body,
        metadata: { sender_name: displayName },
      })
      .select("id")
      .single();
    // Realtime traz a mensagem de volta via subscription

    if (inserted !== null && activeCompanyId !== null) {
      const msgId = (inserted as { id: string }).id;
      void drivers.scp.publishEvent("platform.chat.message_sent", {
        message_id: msgId,
        channel_id: activeChannelId,
        company_id: activeCompanyId,
        sender_user_id: userId,
        body_length: body.length,
      });
    }
  }, [draft, activeChannelId, drivers, userId, displayName, activeCompanyId]);

  const handleCreateChannel = useCallback(async () => {
    if (drivers === null || userId === null) return;
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (name.length === 0) return;

    const { data: inserted } = await drivers.data
      .from("chat_channels")
      .insert({ name, kind: "channel", created_by: userId })
      .select("id,name,kind")
      .single();

    if (inserted !== null) {
      const ch = mapChannel(inserted as Record<string, unknown>);

      // Adiciona o criador como membro
      await drivers.data
        .from("chat_channel_members")
        .insert({ channel_id: ch.id, user_id: userId });

      setChannels((prev) => [...prev, ch]);
      setActiveChannelId(ch.id);

      if (activeCompanyId !== null) {
        void drivers.scp.publishEvent("platform.chat.channel_created", {
          channel_id: ch.id,
          company_id: activeCompanyId,
          kind: "channel",
          name: ch.name,
          created_by: userId,
        });
      }
    }

    setNewChannelName("");
    setShowNewChannel(false);
  }, [drivers, userId, newChannelName, activeCompanyId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeMessages = messages.filter(
    (m) => m.channelId === activeChannelId,
  );

  return (
    <AppShell
      title={activeChannel !== undefined ? `#${activeChannel.name}` : "Chat"}
      subtitle={
        loading ? "Carregando…" : `${activeMessages.length} mensagem(s)`
      }
      sidebar={
        <ChannelList
          channels={channels}
          activeId={activeChannelId}
          onSelect={(id) => {
            setActiveChannelId(id);
            inputRef.current?.focus();
          }}
          onCreateChannel={() => setShowNewChannel(true)}
        />
      }
      sidebarWidth={200}
    >
      {/* Modal novo canal */}
      {showNewChannel && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">#</span>
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateChannel();
                if (e.key === "Escape") setShowNewChannel(false);
              }}
              placeholder="nome-do-canal"
              autoFocus
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={() => void handleCreateChannel()}
              className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setShowNewChannel(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mensagens */}
      <MessageList messages={activeMessages} currentUserId={userId} />

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              activeChannel !== undefined
                ? `Mensagem em #${activeChannel.name}`
                : drivers === null
                  ? "Aguardando sessão…"
                  : "Selecione um canal"
            }
            disabled={activeChannelId === null || drivers === null}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              draft.trim().length === 0 ||
              activeChannelId === null ||
              drivers === null
            }
            className="shrink-0 rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-700">
          Enter para enviar · Realtime ativo via Supabase
        </p>
      </div>
    </AppShell>
  );
}
