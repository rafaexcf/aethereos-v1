import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";
import { useEffect, useState } from "react";

export const opsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/ops",
  component: OpsPage,
});

interface ServiceHealth {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

interface ReadyzResponse {
  status: "ready" | "degraded";
  app: string;
  ts: string;
  checks: Record<string, ServiceHealth>;
}

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; data: ReadyzResponse }
  | { phase: "error"; message: string };

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {ok ? "ok" : "degraded"}
    </span>
  );
}

function OpsPage() {
  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const comercioBase =
    (import.meta.env["VITE_COMERCIO_EMBED_URL"] as string | undefined)?.replace(
      "/embed",
      "",
    ) ?? "http://localhost:3000";

  async function refresh() {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`${comercioBase}/api/readyz`);
      const data = (await res.json()) as ReadyzResponse;
      setState({ phase: "done", data });
    } catch (e) {
      setState({
        phase: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Operações</h1>
        <button
          onClick={() => void refresh()}
          disabled={state.phase === "loading"}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-40"
        >
          {state.phase === "loading" ? "Verificando…" : "Atualizar"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {state.phase === "idle" || state.phase === "loading" ? (
          <p className="text-sm text-zinc-500">Verificando serviços…</p>
        ) : state.phase === "error" ? (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">
              Erro ao verificar readiness: {state.message}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge ok={state.data.status === "ready"} />
              <span className="text-sm text-zinc-400">
                {state.data.app} —{" "}
                {new Date(state.data.ts).toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Serviço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Latência
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {Object.entries(state.data.checks).map(([name, check]) => (
                    <tr key={name} className="bg-zinc-950 hover:bg-zinc-900/50">
                      <td className="px-4 py-3 font-mono text-zinc-200">
                        {name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge ok={check.ok} />
                        {check.error !== undefined && (
                          <span className="ml-2 text-xs text-zinc-500">
                            {check.error}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">
                        {check.latency_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
