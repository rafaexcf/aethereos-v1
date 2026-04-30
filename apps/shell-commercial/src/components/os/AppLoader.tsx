import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { getApp } from "../../apps/registry";

const SHIMMER = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.6s ease-in-out infinite",
};

export function AppLoader({ appId }: { appId: string }) {
  const app = getApp(appId);

  if (app?.hasInternalNav) {
    return (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Sidebar skeleton */}
        <div
          className="flex flex-col shrink-0"
          style={{
            width: 220,
            background: "rgba(6,9,18,0.45)",
            borderRight: "1px solid var(--border-subtle)",
            padding: "16px 10px",
          }}
        >
          {/* App icon + name placeholder */}
          <div className="flex items-center gap-3 px-2 mb-5">
            <div
              className="rounded-xl shrink-0 animate-pulse"
              style={{ width: 36, height: 36, background: `${app.color}18` }}
            />
            <div className="flex flex-col gap-1.5">
              <div
                className="h-3 w-20 rounded-md animate-pulse"
                style={SHIMMER}
              />
              <div
                className="h-2.5 w-28 rounded-md animate-pulse"
                style={SHIMMER}
              />
            </div>
          </div>

          {/* Nav items */}
          <div className="flex flex-col gap-1">
            {[100, 80, 92, 68, 110].map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 animate-pulse"
                style={{
                  height: 32,
                  padding: "0 10px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div className="w-3.5 h-3.5 rounded shrink-0" style={SHIMMER} />
                <div
                  className="h-2.5 rounded-md"
                  style={{ width: w, ...SHIMMER }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main area skeleton */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: "var(--bg-base)" }}
        >
          {/* Breadcrumb */}
          <div
            className="shrink-0 px-5 pt-3 pb-2.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              {[48, 8, 72].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-md animate-pulse"
                  style={{ width: w, ...SHIMMER }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden px-6 py-5">
            <div className="max-w-5xl mx-auto space-y-5">
              <div
                className="h-5 w-44 rounded-lg animate-pulse"
                style={SHIMMER}
              />
              <div
                className="h-3 w-64 rounded-md animate-pulse"
                style={SHIMMER}
              />
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 animate-pulse"
                    style={{
                      background: "var(--glass-bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl shrink-0"
                        style={SHIMMER}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-36 rounded-md" style={SHIMMER} />
                        <div
                          className="h-2.5 w-56 rounded-md"
                          style={SHIMMER}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Icon = app
    ? ((LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
        app.icon
      ] ?? Loader2)
    : Loader2;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--bg-base)" }}
    >
      {app ? (
        <div
          className="flex items-center justify-center rounded-2xl animate-pulse"
          style={{
            width: 56,
            height: 56,
            background: `${app.color}14`,
            border: `1px solid ${app.color}20`,
          }}
        >
          <Icon size={28} style={{ color: app.color, opacity: 0.6 }} />
        </div>
      ) : (
        <Loader2
          size={28}
          className="animate-spin"
          style={{ color: "var(--text-tertiary)" }}
        />
      )}
      <p
        style={{
          fontSize: 13,
          color: "var(--text-tertiary)",
          letterSpacing: "-0.01em",
        }}
      >
        {app !== undefined ? `Carregando ${app.name}…` : "Carregando…"}
      </p>
    </div>
  );
}
