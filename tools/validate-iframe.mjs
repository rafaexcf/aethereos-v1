#!/usr/bin/env node
// Sprint 25 MX136 — valida quais URLs aceitam ser embedadas em iframe.
//
// Para cada URL: faz GET (HEAD nem sempre retorna headers), inspeciona:
//  - X-Frame-Options: DENY | SAMEORIGIN  -> bloqueia iframe
//  - Content-Security-Policy: frame-ancestors 'none' | 'self' -> bloqueia
// Sem header de bloqueio = provavelmente embedavel.
//
// Saida JSON em tools/validate-iframe-results.json com
//   { url, mode: 'iframe' | 'weblink', reason, status }
//
// R8: na duvida, default para weblink.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const URLS = [
  "https://excalidraw.com",
  "https://app.diagrams.net",
  "https://www.tldraw.com",
  "https://stackedit.io/app",
  "https://mermaid.live",
  "https://markmap.js.org/repl",
  "https://hoppscotch.io",
  "https://editor.swagger.io",
  "https://jsoncrack.com/editor",
  "https://jsonhero.io",
  "https://gchq.github.io/CyberChef",
  "https://it-tools.tech",
  "https://squoosh.app",
  "https://jakearchibald.github.io/svgomg/",
  "https://viliusle.github.io/miniPaint/",
  "https://audiomass.co",
  "https://www.sharedrop.io",
  "https://snapdrop.net",
  "https://monkeytype.com",
  "https://play2048.co",
  "https://hexgl.bkcore.com",
  "https://hextris.io",
  "https://lichess.org",
  "https://openscope.co",
  "https://www.photopea.com",
  "https://studio.polotno.com",
  "https://sqlime.org",
  "https://webhook.site",
  "https://regex101.com",
  "https://vscode.dev",
  "https://app.affine.pro",
  "https://pomofocus.io",
  "https://loremipsum.io",
  // Lista extra do MX137 (apps proprietarios + jogos) — quase todos sao
  // weblink mas validamos por consistencia.
  "https://cal.com",
  "https://rallly.co",
  "https://sli.dev",
  "https://www.canva.com",
  "https://www.figma.com",
  "https://claude.ai",
  "https://chat.openai.com",
  "https://gemini.google.com",
  "https://www.perplexity.ai",
  "https://huggingface.co/chat",
  "https://puter.com",
  "https://poe.com",
  "https://copilot.microsoft.com",
  "https://grok.x.ai",
  "https://fast.com",
  "https://www.qrcode-monkey.com",
  "https://colorhunt.co",
  "https://emojipedia.org",
  "https://www.remove.bg",
  "https://tinypng.com",
  "https://temp-mail.org",
  "https://passer-by.com/pacman/",
  "https://www.chess.com",
  "https://www.nytimes.com/games/wordle",
  "https://sudoku.com",
  "https://www.nytimes.com/crosswords",
  "https://minesweeper.online",
  "https://solitaire.io",
  "https://slither.io",
  "https://agar.io",
  "https://www.geoguessr.com",
];

const TIMEOUT_MS = 8000;

function classify(headers, status) {
  const xfo = headers.get("x-frame-options");
  const csp = headers.get("content-security-policy");

  if (xfo) {
    const v = xfo.toUpperCase();
    if (v.includes("DENY"))
      return { mode: "weblink", reason: `XFO: ${xfo}` };
    if (v.includes("SAMEORIGIN"))
      return { mode: "weblink", reason: `XFO: ${xfo}` };
  }

  if (csp) {
    const m = csp.match(/frame-ancestors\s+([^;]+)/i);
    if (m) {
      const directive = m[1].trim().toLowerCase();
      // Permissive: contains "*" or http/https wildcard
      const permissive =
        directive === "*" ||
        directive.includes(" *") ||
        directive.startsWith("*") ||
        /https?:\s*$/.test(directive);
      if (!permissive) {
        if (
          directive.includes("'none'") ||
          directive.includes("'self'") ||
          directive.split(/\s+/).every((t) => t.startsWith("'") || t.startsWith("http"))
        ) {
          return { mode: "weblink", reason: `CSP frame-ancestors: ${directive}` };
        }
      }
    }
  }

  if (status >= 400) {
    return {
      mode: "weblink",
      reason: `HTTP ${status} — default seguro`,
    };
  }

  return { mode: "iframe", reason: "Sem bloqueio detectado" };
}

async function check(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AethereosBot/1.0; +https://aethereos.io)",
      },
    });
    const result = classify(res.headers, res.status);
    return { url, status: res.status, ...result };
  } catch (err) {
    return {
      url,
      status: 0,
      mode: "weblink",
      reason: `fetch error: ${err.message ?? err.name}`,
    };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const results = [];
  let iframeCount = 0;
  let weblinkCount = 0;

  for (const url of URLS) {
    const r = await check(url);
    results.push(r);
    if (r.mode === "iframe") iframeCount++;
    else weblinkCount++;
    const tag = r.mode === "iframe" ? "IFRAME " : "WEBLINK";
    process.stdout.write(`${tag}  ${url}  — ${r.reason}\n`);
  }

  const outPath = resolve(__dirname, "validate-iframe-results.json");
  await writeFile(
    outPath,
    JSON.stringify(
      { generated_at: new Date().toISOString(), summary: { total: results.length, iframe: iframeCount, weblink: weblinkCount }, results },
      null,
      2,
    ),
    "utf8",
  );
  console.log("\n---");
  console.log(`Total: ${results.length}  iframe: ${iframeCount}  weblink: ${weblinkCount}`);
  console.log(`Saved: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
