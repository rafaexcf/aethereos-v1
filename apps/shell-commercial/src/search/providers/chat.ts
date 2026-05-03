import type { SearchProvider, SearchResult } from "../types";

interface ChatChannelRow {
  id: string;
  name: string | null;
  kind: string;
}

interface ChatMessageRow {
  id: string;
  channel_id: string;
  body: string;
}

export const chatProvider: SearchProvider = {
  id: "chat",
  label: "Mensagens",
  icon: "MessageSquare",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const q = query.toLowerCase();
      const [chRes, msgRes] = await Promise.all([
        ctx.drivers.data
          .from("chat_channels")
          .select("id,name,kind") as unknown as Promise<{
          data: ChatChannelRow[] | null;
          error: unknown;
        }>,
        ctx.drivers.data
          .from("chat_messages")
          .select("id,channel_id,body") as unknown as Promise<{
          data: ChatMessageRow[] | null;
          error: unknown;
        }>,
      ]);

      const channels = chRes.data ?? [];
      const messages = msgRes.data ?? [];

      const channelMatches = channels
        .filter((c) => c.name !== null && c.name.toLowerCase().includes(q))
        .slice(0, 3)
        .map<SearchResult>((c) => ({
          id: `chat-channel-${c.id}`,
          type: "action",
          title: c.name ?? "Canal sem nome",
          subtitle: c.kind === "dm" ? "Mensagem direta" : "Canal",
          icon: "Hash",
          iconColor: "#06b6d4",
          action: () => {
            ctx.openApp("chat", "Mensagens");
            ctx.closeSearch();
          },
        }));

      const channelMap = new Map(channels.map((c) => [c.id, c]));
      const messageMatches = messages
        .filter((m) => m.body.toLowerCase().includes(q))
        .slice(0, 5 - channelMatches.length)
        .map<SearchResult>((m) => {
          const ch = channelMap.get(m.channel_id);
          const subtitle =
            m.body.length > 60 ? `${m.body.slice(0, 60)}...` : m.body;
          return {
            id: `chat-msg-${m.id}`,
            type: "action",
            title:
              ch?.name !== undefined && ch?.name !== null
                ? `#${ch.name}`
                : "Mensagem",
            subtitle,
            icon: "MessageSquare",
            iconColor: "#06b6d4",
            action: () => {
              ctx.openApp("chat", "Mensagens");
              ctx.closeSearch();
            },
          };
        });

      return [...channelMatches, ...messageMatches];
    } catch {
      return [];
    }
  },
};
