import { useState, useEffect, useCallback } from "react";

const CSS = `
@keyframes ae-dia-reveal {
  0% {
    background-position: 250% center;
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  100% {
    background-position: -50% center;
    opacity: 1;
  }
}

@keyframes ae-sub-fade {
  0% { opacity: 0; letter-spacing: 0.55em; }
  100% { opacity: 1; letter-spacing: 0.45em; }
}
`;

interface LoadingScreenProps {
  onDone: () => void;
}

export function LoadingScreen({ onDone }: LoadingScreenProps) {
  const [fading, setFading] = useState(false);

  const done = useCallback(() => onDone(), [onDone]);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2100);
    const t2 = setTimeout(done, 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done]);

  return (
    <>
      <style>{CSS}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0f151b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: fading ? 0 : 1,
          transition: "opacity 600ms ease",
          pointerEvents: fading ? "none" : "all",
        }}
      >
        {/* Wordmark */}
        <span
          style={{
            fontSize: "clamp(36px, 5.5vw, 80px)",
            fontWeight: 800,
            letterSpacing: "0.28em",
            display: "inline-block",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.15) 28%, rgba(255,255,255,0.96) 50%, rgba(255,255,255,0.15) 72%, rgba(255,255,255,0.15) 100%)",
            backgroundSize: "280% auto",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation:
              "ae-dia-reveal 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          ÆTHEREOS
        </span>

        {/* Subtext */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.45em",
            color: "rgba(255,255,255,0.22)",
            textTransform: "uppercase",
            animation: "ae-sub-fade 0.7s ease 1.1s both",
          }}
        >
          OS Empresarial
        </span>
      </div>
    </>
  );
}
