import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { getApp } from "../../apps/registry";

export function AppLoader({ appId }: { appId: string }) {
  const app = getApp(appId);

  if (app?.hasInternalNav) {
    return (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{ background: "var(--bg-base)" }}
      >
        <div
          className="flex flex-col shrink-0"
          style={{
            width: 220,
            background: "var(--bg-base)",
            borderRight: "1px solid var(--border-subtle)",
            padding: "12px 8px",
          }}
        >
          <div className="flex items-center gap-3 px-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl animate-pulse shrink-0"
              style={{ backgroundColor: `${app.color}25` }}
            />
            <div className="flex flex-col gap-1.5">
              <div
                className="h-3.5 w-16 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div
                className="h-2.5 w-24 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {[108, 88, 96, 72, 104].map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2 animate-pulse"
                style={{
                  height: 34,
                  padding: "0 10px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  className="w-4 h-4 rounded shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div
                  className="h-3 rounded"
                  style={{
                    width: w,
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div
            className="shrink-0 px-5 pt-4 pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-12 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-2.5 w-2 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
              <div
                className="h-2.5 w-20 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-6 py-5">
            <div className="max-w-[1100px] mx-auto space-y-4">
              <div
                className="h-6 w-48 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-3 w-72 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 animate-pulse"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                      <div className="flex-1 space-y-2">
                        <div
                          className="h-3.5 w-32 rounded"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        />
                        <div
                          className="h-2.5 w-56 rounded"
                          style={{ background: "rgba(255,255,255,0.04)" }}
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
        <Icon
          size={40}
          style={{ color: app.color, opacity: 0.4 }}
          className="animate-pulse"
        />
      ) : (
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "rgba(255,255,255,0.3)" }}
        />
      )}
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
        Carregando{app ? ` ${app.name}` : ""}…
      </p>
    </div>
  );
}
