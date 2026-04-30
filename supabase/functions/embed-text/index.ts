// Edge Function: embed-text
// Gera embedding vetorial para um texto via LiteLLM gateway.
// Modo degradado: se LiteLLM offline ou sem chave, retorna 503.
// Dimensão padrão: 1536 (text-embedding-3-small OpenAI / Anthropic compatible).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface RequestBody {
  text: string;
  model?: string;
}

interface LiteLLMEmbedResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const { text, model = "text-embedding-3-small" } = body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return jsonResponse(
      { error: "text é obrigatório e não pode ser vazio" },
      400,
    );
  }

  const litellmUrl = Deno.env.get("LITELLM_URL") ?? "";
  const litellmKey = Deno.env.get("LITELLM_MASTER_KEY") ?? "";

  if (litellmUrl === "") {
    console.warn("[embed-text] LITELLM_URL not configured — degraded mode");
    return jsonResponse(
      {
        error: "embedder degraded — LITELLM_URL not configured",
        degraded: true,
      },
      503,
    );
  }

  try {
    const response = await fetch(`${litellmUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${litellmKey}`,
      },
      body: JSON.stringify({ input: text, model }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.warn("[embed-text] litellm error", {
        status: response.status,
        error: errorText,
      });
      return jsonResponse(
        {
          error: "embedder degraded — litellm returned error",
          degraded: true,
          litellm_status: response.status,
        },
        503,
      );
    }

    const result = (await response.json()) as LiteLLMEmbedResponse;
    const embedding = result.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      return jsonResponse(
        {
          error: "embedder degraded — empty embedding returned",
          degraded: true,
        },
        503,
      );
    }

    return jsonResponse(
      {
        embedding,
        model_used: result.model,
        token_count: result.usage.total_tokens,
        dimensions: embedding.length,
      },
      200,
    );
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
    console.warn("[embed-text] litellm unreachable", {
      error: isTimeout ? "timeout" : String(e),
    });
    return jsonResponse(
      {
        error: isTimeout
          ? "embedder degraded — litellm timeout"
          : "embedder degraded — litellm unreachable",
        degraded: true,
      },
      503,
    );
  }
});
