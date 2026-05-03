import { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Star,
  ExternalLink,
  History,
  Bookmark,
  AlertTriangle,
  Search,
  Settings,
  Trash2,
  Home,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabState {
  id: string;
  urlStack: string[];
  urlIndex: number;
  title: string;
  loading: boolean;
  blocked: boolean;
}

interface BrowserBookmark {
  id: string;
  title: string;
  url: string;
  favicon_url: string | null;
}

interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visited_at: string;
}

type SearchEngine = "google" | "bing" | "duckduckgo";
type SidePanel = "none" | "bookmarks" | "history";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOME = "about:blank";

const ENGINES: Record<
  SearchEngine,
  { label: string; fn: (q: string) => string }
> = {
  google: {
    label: "Google",
    fn: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  bing: {
    label: "Bing",
    fn: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  duckduckgo: {
    label: "DuckDuckGo",
    fn: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
};

// Domínios que sabidamente bloqueiam iframe — abre direto externamente
const BLOCKED_DOMAINS = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "github.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "reddit.com",
  "youtube.com",
  "netflix.com",
  "notion.so",
  "figma.com",
  "linear.app",
  "vercel.com",
];

function isKnownBlocked(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return BLOCKED_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}

// Sites curados que geralmente permitem embedding
const COMPATIBLE_SITES = [
  { label: "Wikipedia", url: "https://en.wikipedia.org", icon: "🌐" },
  { label: "OpenStreetMap", url: "https://www.openstreetmap.org", icon: "🗺️" },
  { label: "Archive.org", url: "https://archive.org", icon: "📚" },
  { label: "MDN Web Docs", url: "https://developer.mozilla.org", icon: "📖" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTab(url: string = HOME): TabState {
  return {
    id: crypto.randomUUID(),
    urlStack: [url],
    urlIndex: 0,
    title: url === HOME ? "Nova Aba" : hostnameOf(url),
    loading: url !== HOME,
    blocked: false,
  };
}

function resolveUrl(raw: string, engine: SearchEngine): string {
  const s = raw.trim();
  if (!s || s === HOME) return HOME;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z]{2,})(\/|$)/i.test(s) && !s.includes(" "))
    return `https://${s}`;
  return ENGINES[engine].fn(s);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function faviconOf(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
}

function displayUrl(url: string): string {
  return url === HOME ? "" : url;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NavegadorApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [tabs, setTabs] = useState<TabState[]>(() => [makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(
    () => tabs[0]?.id ?? "",
  );
  const [addressInput, setAddressInput] = useState("");
  const [addressFocused, setAddressFocused] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [engine, setEngine] = useState<SearchEngine>("google");
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const addressRef = useRef<HTMLInputElement>(null);
  const reloadKeys = useRef<Map<string, number>>(new Map());

  const activeTab =
    tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? makeTab();
  const currentUrl = activeTab.urlStack[activeTab.urlIndex] ?? HOME;
  const canGoBack = activeTab.urlIndex > 0;
  const canGoForward = activeTab.urlIndex < activeTab.urlStack.length - 1;

  useEffect(() => {
    if (!addressFocused) setAddressInput(displayUrl(currentUrl));
  }, [activeTabId, currentUrl, addressFocused]);

  useEffect(() => {
    if (!drivers || !userId || !companyId) return;
    void fetchBookmarks();
    void fetchHistory();
  }, [drivers, userId, companyId]);

  async function fetchBookmarks() {
    if (!drivers) return;
    const { data } = await drivers.data
      .from("browser_bookmarks")
      .select("id,title,url,favicon_url")
      .order("created_at", { ascending: false });
    if (data) setBookmarks(data as BrowserBookmark[]);
  }

  async function fetchHistory() {
    if (!drivers) return;
    const { data } = await drivers.data
      .from("browser_history")
      .select("id,title,url,visited_at")
      .order("visited_at", { ascending: false })
      .limit(200);
    if (data) setHistory(data as HistoryEntry[]);
  }

  // ── Tab mutations ────────────────────────────────────────────────────────────

  function patchTab(id: string, patch: Partial<TabState>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function openTab(url: string = HOME) {
    const tab = makeTab(url);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const next =
        prev.length === 1 ? [makeTab()] : prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const idx = Math.max(0, prev.findIndex((t) => t.id === id) - 1);
        setTimeout(() => setActiveTabId(next[idx]?.id ?? next[0]?.id ?? ""), 0);
      }
      return next;
    });
  }

  function navigate(raw: string, tabId?: string) {
    const tid = tabId ?? activeTabId;
    const url = resolveUrl(raw, engine);

    // Domínios sabidamente bloqueados → abrir diretamente no browser externo
    if (url !== HOME && isKnownBlocked(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        const stack = [...t.urlStack.slice(0, t.urlIndex + 1), url];
        return {
          ...t,
          urlStack: stack,
          urlIndex: stack.length - 1,
          title: url === HOME ? "Nova Aba" : hostnameOf(url),
          loading: url !== HOME,
          blocked: false,
        };
      }),
    );
    if (!addressFocused) setAddressInput(displayUrl(url));
  }

  function goBack() {
    patchTab(activeTabId, {
      urlIndex: activeTab.urlIndex - 1,
      loading: true,
      blocked: false,
    });
  }

  function goForward() {
    patchTab(activeTabId, {
      urlIndex: activeTab.urlIndex + 1,
      loading: true,
      blocked: false,
    });
  }

  function reload() {
    const key = (reloadKeys.current.get(activeTabId) ?? 0) + 1;
    reloadKeys.current.set(activeTabId, key);
    patchTab(activeTabId, { loading: currentUrl !== HOME, blocked: false });
    setTabs((p) => [...p]);
  }

  // ── iframe events ────────────────────────────────────────────────────────────

  const handleLoad = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      const url = tab.urlStack[tab.urlIndex] ?? HOME;
      const iframe = iframeRefs.current.get(tabId);

      // Detecta bloqueio por X-Frame-Options / CSP frame-ancestors:
      // quando bloqueado, o iframe permanece em about:blank mesmo com src real.
      if (url !== HOME) {
        try {
          const loc = iframe?.contentWindow?.location.href;
          if (loc === "about:blank") {
            patchTab(tabId, { loading: false, blocked: true });
            return;
          }
        } catch {
          // SecurityError = frame cross-origin mas carregou normalmente
        }
      }

      let title = hostnameOf(url);
      try {
        const t = iframe?.contentDocument?.title;
        if (t) title = t;
      } catch {
        // cross-origin
      }
      patchTab(tabId, { loading: false, title });
      if (url !== HOME) void saveHistory(url, title);
    },
    [tabs],
  );

  const handleError = useCallback((tabId: string) => {
    patchTab(tabId, { loading: false, blocked: true });
  }, []);

  // ── External open ────────────────────────────────────────────────────────────

  function openExternal(url?: string) {
    const target = url ?? currentUrl;
    if (target && target !== HOME)
      window.open(target, "_blank", "noopener,noreferrer");
  }

  // ── Address bar ──────────────────────────────────────────────────────────────

  function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(addressInput);
    addressRef.current?.blur();
    setAddressFocused(false);
  }

  function handleAddressFocus() {
    setAddressFocused(true);
    setAddressInput(currentUrl === HOME ? "" : currentUrl);
    setTimeout(() => addressRef.current?.select(), 0);
  }

  function handleAddressBlur() {
    setAddressFocused(false);
    setAddressInput(displayUrl(currentUrl));
  }

  // ── Bookmarks ────────────────────────────────────────────────────────────────

  const isBookmarked = bookmarks.some(
    (b) => b.url === currentUrl && currentUrl !== HOME,
  );

  async function toggleBookmark() {
    if (!drivers || currentUrl === HOME) return;
    if (isBookmarked) {
      const bm = bookmarks.find((b) => b.url === currentUrl);
      if (!bm) return;
      await drivers.data.from("browser_bookmarks").delete().eq("id", bm.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
    } else {
      const title = activeTab.title || hostnameOf(currentUrl);
      const { data } = await drivers.data
        .from("browser_bookmarks")
        .insert({
          user_id: userId,
          company_id: companyId,
          title,
          url: currentUrl,
          favicon_url: faviconOf(currentUrl),
        })
        .select("id,title,url,favicon_url")
        .single();
      if (data) setBookmarks((prev) => [data as BrowserBookmark, ...prev]);
    }
  }

  async function deleteBookmark(id: string) {
    if (!drivers) return;
    await drivers.data.from("browser_bookmarks").delete().eq("id", id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  // ── History ──────────────────────────────────────────────────────────────────

  async function saveHistory(url: string, title: string) {
    if (!drivers || !userId || !companyId) return;
    const { data } = await drivers.data
      .from("browser_history")
      .insert({ user_id: userId, company_id: companyId, url, title })
      .select("id,title,url,visited_at")
      .single();
    if (data)
      setHistory((prev) => [data as HistoryEntry, ...prev.slice(0, 199)]);
  }

  async function clearHistory() {
    if (!drivers || !userId) return;
    await drivers.data.from("browser_history").delete().eq("user_id", userId);
    setHistory([]);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const sidePanelOpen = sidePanel !== "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#191d21",
        color: "var(--text-primary)",
        fontSize: 13,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background:
            "linear-gradient(180deg, rgba(232,176,40,0.12), rgba(232,176,40,0.06))",
          borderBottom: "1px solid rgba(232,176,40,0.18)",
          fontSize: 11,
          color: "rgba(255,220,160,0.85)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12 }}>⚠️</span>
        <span>
          <strong style={{ fontWeight: 600 }}>Plano gratuito:</strong> navegação
          limitada — muitos sites bloqueiam exibição em iframe
          (X-Frame-Options/CSP). Capacidade plena (proxy + sandbox completo)
          disponível apenas no{" "}
          <strong style={{ fontWeight: 600, color: "rgba(255,235,180,1)" }}>
            plano pago
          </strong>
          .
        </span>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "#11161c",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          minHeight: 36,
          gap: 1,
          padding: "0 4px",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const tabUrl = tab.urlStack[tab.urlIndex] ?? HOME;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px 4px 8px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                maxWidth: 180,
                minWidth: 100,
                background: active ? "#191d21" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {tabUrl !== HOME ? (
                <img
                  src={faviconOf(tabUrl)}
                  width={14}
                  height={14}
                  style={{ borderRadius: 2, flexShrink: 0 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <Home size={12} style={{ flexShrink: 0 }} />
              )}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  textAlign: "left",
                }}
              >
                {tab.loading ? "Carregando…" : tab.title}
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label="Fechar aba"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  flexShrink: 0,
                }}
              >
                <X size={11} />
              </span>
            </button>
          );
        })}

        <button
          onClick={() => openTab()}
          title="Nova aba"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Plus size={14} />
        </button>

        <div style={{ flex: 1 }} />
        <PanelToggle
          icon={<Bookmark size={14} />}
          active={sidePanel === "bookmarks"}
          title="Favoritos"
          onClick={() =>
            setSidePanel((p) => (p === "bookmarks" ? "none" : "bookmarks"))
          }
        />
        <PanelToggle
          icon={<History size={14} />}
          active={sidePanel === "history"}
          title="Histórico"
          onClick={() =>
            setSidePanel((p) => (p === "history" ? "none" : "history"))
          }
        />
        <PanelToggle
          icon={<Settings size={14} />}
          active={showSettings}
          title="Configurações"
          onClick={() => setShowSettings((p) => !p)}
        />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 8px",
          background: "#13181e",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <ToolBtn onClick={goBack} disabled={!canGoBack} title="Voltar">
          <ChevronLeft size={15} />
        </ToolBtn>
        <ToolBtn onClick={goForward} disabled={!canGoForward} title="Avançar">
          <ChevronRight size={15} />
        </ToolBtn>
        <ToolBtn onClick={reload} title="Recarregar">
          <RotateCcw size={13} />
        </ToolBtn>

        <form
          onSubmit={handleAddressSubmit}
          style={{ flex: 1, margin: "0 4px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#191d21",
              border: `1px solid ${addressFocused ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8,
              padding: "0 10px",
              gap: 6,
              height: 30,
              transition: "border-color 0.15s",
            }}
          >
            {currentUrl === HOME ? (
              <Search
                size={12}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            ) : (
              <Globe
                size={12}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            )}
            <input
              ref={addressRef}
              value={addressInput}
              onChange={(e) => setAddressInput(e.currentTarget.value)}
              onFocus={handleAddressFocus}
              onBlur={handleAddressBlur}
              placeholder={`Pesquisar no ${ENGINES[engine].label} ou digitar URL`}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            />
            {addressFocused && addressInput && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  openExternal(resolveUrl(addressInput, engine));
                }}
                title="Abrir no navegador do sistema"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontSize: 10,
                  flexShrink: 0,
                  padding: "0 2px",
                  whiteSpace: "nowrap",
                }}
              >
                <ArrowUpRight size={11} /> externo
              </button>
            )}
          </div>
        </form>

        <ToolBtn
          onClick={toggleBookmark}
          title={isBookmarked ? "Remover favorito" : "Adicionar favorito"}
          active={isBookmarked}
        >
          {isBookmarked ? (
            <Star size={14} fill="currentColor" />
          ) : (
            <Star size={14} />
          )}
        </ToolBtn>
        <ToolBtn
          onClick={() => openExternal()}
          title="Abrir no navegador do sistema"
        >
          <ExternalLink size={13} />
        </ToolBtn>
      </div>

      {/* ── Settings panel ───────────────────────────────────────────────────── */}
      {showSettings && (
        <div
          style={{
            padding: "10px 14px",
            background: "#11161c",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-tertiary)" }}>Pesquisa:</span>
          {(Object.keys(ENGINES) as SearchEngine[]).map((e) => (
            <button
              key={e}
              onClick={() => setEngine(e)}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: engine === e ? "#6366f1" : "rgba(255,255,255,0.1)",
                background:
                  engine === e ? "rgba(99,102,241,0.2)" : "transparent",
                color: engine === e ? "#a5b4fc" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {ENGINES[e].label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {tabs.map((tab) => {
            const tabUrl = tab.urlStack[tab.urlIndex] ?? HOME;
            const isActive = tab.id === activeTabId;
            const reloadKey = reloadKeys.current.get(tab.id) ?? 0;

            return (
              <div
                key={tab.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: isActive ? "flex" : "none",
                  flexDirection: "column",
                }}
              >
                {tabUrl === HOME ? (
                  <NewTabPage
                    engine={engine}
                    bookmarks={bookmarks}
                    onNavigate={(url) => navigate(url, tab.id)}
                    onOpenExternal={(url) => openExternal(url)}
                    onDeleteBookmark={deleteBookmark}
                  />
                ) : tab.blocked ? (
                  <BlockedPage
                    url={tabUrl}
                    onOpenExternal={() => openExternal(tabUrl)}
                  />
                ) : (
                  <>
                    {tab.loading && <LoadingBar />}
                    <iframe
                      key={`${tab.id}-${reloadKey}`}
                      ref={(el) => {
                        if (el) iframeRefs.current.set(tab.id, el);
                        else iframeRefs.current.delete(tab.id);
                      }}
                      src={tabUrl}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                      referrerPolicy="no-referrer"
                      onLoad={() => handleLoad(tab.id)}
                      onError={() => handleError(tab.id)}
                      style={{
                        flex: 1,
                        border: "none",
                        width: "100%",
                        height: "100%",
                        background: "#fff",
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        {sidePanelOpen && (
          <div
            style={{
              width: 280,
              background: "#11161c",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {sidePanel === "bookmarks" && (
              <BookmarksPanel
                bookmarks={bookmarks}
                onOpen={(url) => navigate(url)}
                onDelete={deleteBookmark}
                onOpenExternal={openExternal}
              />
            )}
            {sidePanel === "history" && (
              <HistoryPanel
                entries={history}
                onOpen={(url) => navigate(url)}
                onClear={clearHistory}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolBtn({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: active ? "rgba(99,102,241,0.2)" : "transparent",
        color: disabled
          ? "var(--text-tertiary)"
          : active
            ? "#a5b4fc"
            : "var(--text-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {children}
    </button>
  );
}

function PanelToggle({
  icon,
  active,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: active ? "rgba(99,102,241,0.2)" : "transparent",
        color: active ? "#a5b4fc" : "var(--text-tertiary)",
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

function LoadingBar() {
  return (
    <div
      style={{
        height: 2,
        background: "rgba(255,255,255,0.05)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "40%",
          background: "#6366f1",
          borderRadius: 1,
          animation: "navLoadBar 1.2s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes navLoadBar{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
    </div>
  );
}

function BlockedPage({
  url,
  onOpenExternal,
}: {
  url: string;
  onOpenExternal: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 32,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(245,158,11,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldAlert size={24} style={{ color: "#f59e0b" }} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {hostnameOf(url)} bloqueou a incorporação
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
          }}
        >
          Este site usa{" "}
          <code
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            X-Frame-Options
          </code>{" "}
          ou{" "}
          <code
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            CSP frame-ancestors
          </code>{" "}
          para impedir abertura em outros sistemas. É uma medida de segurança do
          próprio site.
        </p>
      </div>
      <button
        onClick={onOpenExternal}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 20px",
          borderRadius: 8,
          border: "none",
          background: "#6366f1",
          color: "#fff",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <ExternalLink size={14} /> Abrir no navegador
      </button>
    </div>
  );
}

function NewTabPage({
  engine,
  bookmarks,
  onNavigate,
  onOpenExternal,
  onDeleteBookmark: _onDeleteBookmark,
}: {
  engine: SearchEngine;
  bookmarks: BrowserBookmark[];
  onNavigate: (url: string) => void;
  onOpenExternal: (url: string) => void;
  onDeleteBookmark: (id: string) => void;
}) {
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent, external = false) {
    e.preventDefault();
    if (!q.trim()) return;
    const url = ENGINES[engine].fn(q);
    if (external) onOpenExternal(url);
    else onNavigate(url);
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 160px",
        gap: 32,
        background: "#191d21",
        overflowY: "auto",
      }}
    >
      {/* Search */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Globe size={32} style={{ color: "#6366f1" }} />
        <p
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Nova Aba
        </p>

        <form onSubmit={(e) => handleSearch(e)} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#11161c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "0 12px",
              gap: 8,
              height: 44,
            }}
          >
            <Search
              size={14}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              placeholder={`Pesquisar no ${ENGINES[engine].label} ou digitar URL`}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 14,
              }}
            />
          </div>
        </form>

        {/* Dual action */}
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button
            type="button"
            onClick={(e) => handleSearch(e)}
            disabled={!q.trim()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(99,102,241,0.15)",
              color: "#a5b4fc",
              cursor: q.trim() ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 500,
              opacity: q.trim() ? 1 : 0.4,
            }}
          >
            <Globe size={13} /> Tentar incorporado
          </button>
          <button
            type="button"
            onClick={(e) => handleSearch(e, true)}
            disabled={!q.trim()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: q.trim() ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              opacity: q.trim() ? 1 : 0.4,
            }}
          >
            <ArrowUpRight size={13} /> Abrir no navegador
          </button>
        </div>
      </div>

      {/* Sites compatíveis */}
      <div style={{ width: "100%", maxWidth: 520 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          Sites compatíveis com incorporação
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          {COMPATIBLE_SITES.map((s) => (
            <button
              key={s.url}
              onClick={() => onNavigate(s.url)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.07)",
                background: "#11161c",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontWeight: 500 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 10,
          padding: "12px 14px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle
          size={14}
          style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>
            Por que sites bloqueiam a incorporação?
          </strong>{" "}
          Sites como Google, GitHub, YouTube e redes sociais definem o cabeçalho
          HTTP{" "}
          <code
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            X-Frame-Options
          </code>{" "}
          no servidor — isso faz com que <em>qualquer</em> navegador (Chrome,
          Firefox, Chromium, Edge) bloqueie o embed. Instalar um navegador
          diferente não resolve. Use{" "}
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>
            "Abrir no navegador"
          </strong>{" "}
          para esses sites. Sites menores, wikis e ferramentas internas
          geralmente funcionam incorporados.
        </p>
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div style={{ width: "100%", maxWidth: 520 }}>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            Favoritos
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {bookmarks.slice(0, 12).map((bm) => (
              <button
                key={bm.id}
                onClick={() => onNavigate(bm.url)}
                title={bm.url}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "#11161c",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 12,
                  maxWidth: 160,
                }}
              >
                {bm.favicon_url ? (
                  <img
                    src={bm.favicon_url}
                    width={14}
                    height={14}
                    style={{ borderRadius: 2 }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <Globe size={12} />
                )}
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bm.title || hostnameOf(bm.url)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookmarksPanel({
  bookmarks,
  onOpen,
  onDelete,
  onOpenExternal,
}: {
  bookmarks: BrowserBookmark[];
  onOpen: (url: string) => void;
  onDelete: (id: string) => void;
  onOpenExternal: (url: string) => void;
}) {
  return (
    <>
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Bookmark size={13} style={{ color: "#818cf8" }} />
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          Favoritos
        </span>
        <span
          style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 4 }}
        >
          {bookmarks.length}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {bookmarks.length === 0 ? (
          <p
            style={{
              padding: "20px 14px",
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            Nenhum favorito salvo
          </p>
        ) : (
          bookmarks.map((bm) => (
            <SidePanelItem
              key={bm.id}
              {...(bm.favicon_url !== null ? { favicon: bm.favicon_url } : {})}
              title={bm.title || hostnameOf(bm.url)}
              subtitle={hostnameOf(bm.url)}
              onClick={() => onOpen(bm.url)}
              onExternal={() => onOpenExternal(bm.url)}
              onDelete={() => onDelete(bm.id)}
            />
          ))
        )}
      </div>
    </>
  );
}

function HistoryPanel({
  entries,
  onOpen,
  onClear,
}: {
  entries: HistoryEntry[];
  onOpen: (url: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <History size={13} style={{ color: "#818cf8" }} />
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          Histórico
        </span>
        <div style={{ flex: 1 }} />
        {entries.length > 0 && (
          <button
            onClick={onClear}
            title="Limpar histórico"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            <Trash2 size={11} /> Limpar
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {entries.length === 0 ? (
          <p
            style={{
              padding: "20px 14px",
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            Sem histórico
          </p>
        ) : (
          entries.map((entry) => (
            <SidePanelItem
              key={entry.id}
              favicon={faviconOf(entry.url)}
              title={entry.title || hostnameOf(entry.url)}
              subtitle={timeAgo(entry.visited_at)}
              onClick={() => onOpen(entry.url)}
            />
          ))
        )}
      </div>
    </>
  );
}

function SidePanelItem({
  favicon,
  title,
  subtitle,
  onClick,
  onExternal,
  onDelete,
}: {
  favicon?: string;
  title: string;
  subtitle?: string;
  onClick: () => void;
  onExternal?: () => void;
  onDelete?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        cursor: "pointer",
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
      }}
    >
      {favicon ? (
        <img
          src={favicon}
          width={14}
          height={14}
          style={{ borderRadius: 2, flexShrink: 0 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Globe
          size={12}
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {hovered && (
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {onExternal && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onExternal();
              }}
              title="Abrir externamente"
              style={{
                padding: 3,
                borderRadius: 4,
                color: "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              <ExternalLink size={11} />
            </span>
          )}
          {onDelete && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Remover"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onDelete();
                }
              }}
              style={{
                padding: 3,
                borderRadius: 4,
                color: "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={11} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
