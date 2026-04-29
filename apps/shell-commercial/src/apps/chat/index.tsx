import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session.js";

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
// Demo state
// ---------------------------------------------------------------------------

const DEMO_CHANNELS: Channel[] = [
  { id: "ch-geral", name: "geral", kind: "channel" },
  { id: "ch-tech", name: "tecnologia", kind: "channel" },
  { id: "ch-random", name: "random", kind: "channel" },
];

const DEMO_MESSAGES: Message[] = [
  {
    id: "m1",
    channelId: "ch-geral",
    senderUserId: "u1",
    senderName: "Ana Silva",
    body: "Bom dia a todos! Sprint 6 começando 🚀",
    createdAt: new Date(Date.now() - 3_600_000),
  },
  {
    id: "m2",
    channelId: "ch-geral",
    senderUserId: "u2",
    senderName: "Carlos Mendes",
    body: "Bom dia! Tudo pronto para o dia.",
    createdAt: new Date(Date.now() - 3_200_000),
  },
  {
    id: "m3",
    channelId: "ch-tech",
    senderUserId: "u1",
    senderName: "Ana Silva",
    body: "Alguém revisou o ADR-0018? Precisamos discutir as métricas OTel.",
    createdAt: new Date(Date.now() - 1_800_000),
  },
];

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
                {msg.senderName}
              </span>
              <span className="text-xs text-zinc-700">
                {msg.createdAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-200 pl-0">{msg.body}</p>
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
  const { userId } = useSessionStore();

  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    DEMO_CHANNELS[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeMessages = messages.filter(
    (m) => m.channelId === activeChannelId,
  );

  const handleSend = useCallback(() => {
    const body = draft.trim();
    if (body.length === 0 || activeChannelId === null) return;

    const newMsg: Message = {
      id: crypto.randomUUID(),
      channelId: activeChannelId,
      senderUserId: userId ?? "me",
      senderName: "Você",
      body,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setDraft("");
    // TODO: inserir em kernel.chat_messages via SupabaseDatabaseDriver
    // + emitir platform.chat.message_sent
    // + Supabase Realtime .channel().on('postgres_changes') para receber em tempo real
  }, [draft, activeChannelId, userId]);

  function handleCreateChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (name.length === 0) return;
    const newChannel: Channel = {
      id: crypto.randomUUID(),
      name,
      kind: "channel",
    };
    setChannels((prev) => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    setNewChannelName("");
    setShowNewChannel(false);
    // TODO: inserir em kernel.chat_channels + kernel.chat_channel_members
    // + emitir platform.chat.channel_created
  }

  const unreadByChannel = new Map<string, number>();
  channels.forEach((ch) => {
    if (ch.id !== activeChannelId) {
      const count = messages.filter((m) => m.channelId === ch.id).length;
      if (count > 0) unreadByChannel.set(ch.id, count % 3); // demo: simula alguns não lidos
    }
  });

  return (
    <AppShell
      title={activeChannel !== undefined ? `#${activeChannel.name}` : "Chat"}
      subtitle={`${activeMessages.length} mensagem(s)`}
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
                if (e.key === "Enter") handleCreateChannel();
                if (e.key === "Escape") setShowNewChannel(false);
              }}
              placeholder="nome-do-canal"
              autoFocus
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleCreateChannel}
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
                handleSend();
              }
            }}
            placeholder={
              activeChannel !== undefined
                ? `Mensagem em #${activeChannel.name}`
                : "Selecione um canal"
            }
            disabled={activeChannelId === null}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={draft.trim().length === 0 || activeChannelId === null}
            className="shrink-0 rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-700">
          Enter para enviar · Realtime habilitado quando Supabase configurado
        </p>
      </div>
    </AppShell>
  );
}
