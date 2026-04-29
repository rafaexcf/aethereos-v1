import { headers } from "next/headers";

export type RuntimeMode = "standalone" | "embed";

export async function getServerRuntimeMode(): Promise<RuntimeMode> {
  const headersList = await headers();
  return headersList.get("x-aethereos-embed") === "true"
    ? "embed"
    : "standalone";
}

export function getClientRuntimeMode(): RuntimeMode {
  if (typeof window === "undefined") return "standalone";
  return window.location.pathname.startsWith("/embed") ? "embed" : "standalone";
}
