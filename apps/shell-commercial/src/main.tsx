import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
import { DiaTextReveal } from "./components/ui/dia-text-reveal";
import "./styles/globals.css";

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

function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#08090e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: "clamp(48px, 9vw, 108px)",
          fontWeight: 900,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          fontFamily: "var(--font-display, inherit)",
        }}
      >
        <DiaTextReveal
          text="ÆTHEREOS"
          colors={["#8b5cf6", "#a78bfa", "#6366f1", "#c4b5fd", "#818cf8"]}
          textColor="rgba(255,255,255,0.95)"
          duration={1.4}
          delay={0.2}
          startOnView={false}
          once
        />
      </span>
    </motion.div>
  );
}

function App() {
  const [booted, setBooted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    boot()
      .then(() => {
        setBooted(true);
        void router.navigate({
          to: router.state.location.pathname,
          replace: true,
        });
        setTimeout(() => setShowSplash(false), 600);
      })
      .catch((e: unknown) => {
        setBootError(String(e));
        setBooted(true);
        setTimeout(() => setShowSplash(false), 600);
      });
  }, []);

  return (
    <>
      {booted && bootError === null && (
        <DriversProvider>
          <FeatureFlagsProvider>
            <RouterProvider router={router} />
          </FeatureFlagsProvider>
        </DriversProvider>
      )}
      {booted && bootError !== null && (
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--bg-base)" }}
        >
          <p className="text-[13px] text-[var(--status-error)]">
            Erro ao iniciar: {bootError}
          </p>
        </div>
      )}
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
    </>
  );
}

const container = document.getElementById("root");
if (container === null) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
