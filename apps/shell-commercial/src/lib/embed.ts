// Detects embed mode from URL query param: ?embed=true
// Evaluated once at module load time. Host page sets this to embed the shell
// inside an iframe within a SaaS standalone app.
export const isEmbedMode: boolean =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embed") === "true";

// Sends a typed message to the parent window (no-op when not embedded).
// Ref: EMBED_PROTOCOL.md — eventos canônicos do protocolo embed
export function postEmbedMessage(payload: Record<string, unknown>): void {
  if (!isEmbedMode) return;
  window.parent.postMessage(payload, "*");
}
