import { StrictMode, useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  animate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { FeatureFlagsProvider } from "@aethereos/ui-shell";
import { rootRoute } from "./routes/__root";
import { loginRoute } from "./routes/login";
import { signupRoute } from "./routes/signup";
import { registerRoute } from "./routes/register";
import { selectCompanyRoute } from "./routes/select-company";
import { indexRoute } from "./routes/index";
import { desktopRoute } from "./routes/desktop";
import { aboutRoute } from "./routes/settings/about";
import { opsRoute } from "./routes/settings/ops";
import { staffRoute } from "./routes/staff";
import { boot } from "./lib/boot";
import { DriversProvider } from "./lib/drivers-context";
import { ThemeProvider } from "./lib/theme/theme-provider";
import {
  installGlobalErrorHandlers,
  initSentryIfConfigured,
} from "./lib/observability";
import { i18nReady } from "./i18n"; // Super Sprint C / MX214 — inicializa react-i18next
import "./styles/globals.css";

// Sprint 33 / MX186: inicializa Sentry se VITE_SENTRY_DSN estiver definida.
// No-op em dev/staging sem DSN; em prod com DSN ativa captura uncaught.
initSentryIfConfigured();

// Sprint 31 / MX171: captura uncaught exceptions + unhandled rejections.
// Idempotente. Roteia para Sentry (se inicializado) ou console.error.
installGlobalErrorHandlers();

// Sprint 27 hotfix: deploy novo invalida chunks lazy (hashes mudam).
// SPA antiga em cache do browser tenta `import()` chunk que retorna 404.
// Detectamos a falha e recarregamos a página UMA VEZ pra pegar o
// index.html novo (com hashes atualizados). Flag em sessionStorage
// previne loop em caso de erro real do deploy novo.
const RELOAD_FLAG = "aethereos:chunk-reload";

function isChunkLoadError(reason: unknown): boolean {
  if (reason === null || reason === undefined) return false;
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    if (!isChunkLoadError(e.reason)) return;
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
  });
  // Limpa flag em load bem-sucedido — permite novo reload se outro
  // deploy chegar durante a sessao do user.
  window.addEventListener("load", () => {
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
  });
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  registerRoute,
  selectCompanyRoute,
  desktopRoute,
  aboutRoute,
  opsRoute,
  staffRoute,
]);

const router = createRouter({ routeTree });

// ─── Splash ───────────────────────────────────────────────────────────────────

// Mesma família usada no wordmark do TopBar (Outfit → Inter → sistema)
const WORDMARK_FONT =
  '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, sans-serif';

// Paleta suave com bordas near-white para blending gradual
const SWEEP_COLORS = [
  "rgba(255,255,255,0.90)",
  "#ddd6fe",
  "#c4b5fd",
  "#a5b4fc",
  "#7dd3fc",
  "#a5f3fc",
  "#f0abfc",
  "#c4b5fd",
  "#ddd6fe",
  "rgba(255,255,255,0.85)",
];
const BAND = 36; // meia-largura da faixa colorida em %

function buildGradient(pos: number): string {
  const lo = pos - BAND;
  const hi = pos + BAND;

  // Animação concluída — texto 100% branco
  if (lo >= 100) return "linear-gradient(90deg, #ffffff, #ffffff)";

  const stops: string[] = [];

  // Região já revelada → branco
  if (lo > 0) {
    stops.push(`#ffffff 0%`, `#ffffff ${lo.toFixed(1)}%`);
  }

  // Faixa de cor
  SWEEP_COLORS.forEach((c, i) => {
    const t = lo + (i / (SWEEP_COLORS.length - 1)) * BAND * 2;
    stops.push(`${c} ${t.toFixed(1)}%`);
  });

  // Região ainda não revelada → transparente
  if (hi < 100) {
    stops.push(`transparent ${hi.toFixed(1)}%`, `transparent 100%`);
  }

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function SplashWordmark({ onDone }: { onDone: () => void }) {
  const pos = useMotionValue(-BAND);
  const backgroundImage = useTransform(pos, buildGradient);

  useEffect(() => {
    const ctrl = animate(pos, 100 + BAND, {
      duration: 1.4,
      // ease-in-out cúbico suave
      ease: (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      onComplete: onDone,
    });
    return () => {
      ctrl.stop();
    };
  }, [pos, onDone]);

  return (
    <motion.span
      style={{
        display: "inline",
        color: "transparent",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        backgroundImage,
        backgroundSize: "100% 100%",
      }}
    >
      ÆTHEREOS
    </motion.span>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    // Espera a Outfit peso 700 estar disponível antes de iniciar o efeito.
    // Timeout de 1200ms garante que o splash nunca trava em rede lenta.
    const timer = setTimeout(() => setFontReady(true), 1200);
    void document.fonts.load('700 16px "Outfit"').then(() => {
      clearTimeout(timer);
      setFontReady(true);
    });
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeIn" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* drop-shadow on outer div — works over transparent backgroundClip:text pixels */}
      <div
        style={{
          filter:
            "drop-shadow(0 0 40px rgba(255,255,255,0.18)) drop-shadow(0 0 80px rgba(255,255,255,0.08))",
        }}
      >
        <span
          style={{
            display: "inline-block",
            borderRadius: 40,
            overflow: "hidden",
            padding: "0.06em 0.14em",
            fontFamily: WORDMARK_FONT,
            fontSize: "clamp(48px, 9vw, 108px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {fontReady ? (
            <SplashWordmark onDone={onDone} />
          ) : (
            <span style={{ color: "transparent" }}>ÆTHEREOS</span>
          )}
        </span>
      </div>
    </motion.div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

const SKIP_SPLASH =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("skipSplash");

function App() {
  const [booted, setBooted] = useState(false);
  const [animDone, setAnimDone] = useState(SKIP_SPLASH);
  const [showSplash, setShowSplash] = useState(!SKIP_SPLASH);
  const [bootError, setBootError] = useState<string | null>(null);

  const handleAnimDone = useCallback(() => setAnimDone(true), []);

  // Oculta o splash somente quando boot E animação terminaram
  useEffect(() => {
    if (booted && animDone) {
      setShowSplash(false);
    }
  }, [booted, animDone]);

  useEffect(() => {
    boot()
      .then(() => {
        setBooted(true);
        void router.navigate({
          to: router.state.location.pathname,
          replace: true,
        });
      })
      .catch((e: unknown) => {
        setBootError(String(e));
        setBooted(true);
      });
  }, []);

  return (
    <>
      {/* RouterProvider monta apenas depois que o splash saiu completamente,
          eliminando qualquer flash de rota intermediária durante o fade-out. */}
      {!showSplash && booted && bootError === null && (
        <DriversProvider>
          <FeatureFlagsProvider>
            <RouterProvider router={router} />
          </FeatureFlagsProvider>
        </DriversProvider>
      )}

      {!showSplash && booted && bootError !== null && (
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--bg-base)" }}
        >
          <p className="text-[13px] text-[var(--status-error)]">
            Erro ao iniciar: {bootError}
          </p>
        </div>
      )}

      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onDone={handleAnimDone} />}
      </AnimatePresence>
    </>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const container = document.getElementById("root");
if (container === null) throw new Error("#root not found");

// HOTFIX — Aguarda i18n inicializar antes de montar React. Sem isso,
// a primeira render de componentes que usam t() vê a chave literal
// (botão logout exibia "topbar.menu_sign_out") porque o sinal "ready"
// do i18next chega via microtask e useTranslation com useSuspense:false
// retorna a key como fallback.
void i18nReady.finally(() => {
  createRoot(container).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
});
