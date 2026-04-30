// Edge Function: cnpj-lookup
// Lookup público de CNPJ via BrasilAPI com fallback ReceitaWS.
// NÃO requer autenticação — rate limit por IP é dívida futura.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  atividade_principal: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string | null;
  email: string | null;
}

function cleanCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function fromBrasilApi(cnpj: string): Promise<CnpjData> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { "User-Agent": "AETHEREOS/1.0" },
  });
  if (!res.ok) throw new Error(`BrasilAPI ${res.status}`);
  const d = (await res.json()) as Record<string, unknown>;

  const atividade = Array.isArray(d.cnae_fiscal_descricao)
    ? String(d.cnae_fiscal_descricao)
    : String(d.cnae_fiscal_descricao ?? "");

  return {
    cnpj,
    razao_social: String(d.razao_social ?? ""),
    nome_fantasia: d.nome_fantasia ? String(d.nome_fantasia) : null,
    situacao: String(d.descricao_situacao_cadastral ?? ""),
    atividade_principal: atividade,
    logradouro: String(d.logradouro ?? ""),
    numero: String(d.numero ?? ""),
    complemento: String(d.complemento ?? ""),
    bairro: String(d.bairro ?? ""),
    municipio: String(d.municipio ?? ""),
    uf: String(d.uf ?? ""),
    cep: String(d.cep ?? ""),
    telefone: d.ddd_telefone_1 ? String(d.ddd_telefone_1) : null,
    email: d.email ? String(d.email) : null,
  };
}

async function fromReceitaWS(cnpj: string): Promise<CnpjData> {
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { "User-Agent": "AETHEREOS/1.0" },
  });
  if (!res.ok) throw new Error(`ReceitaWS ${res.status}`);
  const d = (await res.json()) as Record<string, unknown>;
  if (d.status === "ERROR")
    throw new Error(String(d.message ?? "CNPJ inválido"));

  const atividades = d.atividade_principal as
    | Array<{ text: string }>
    | undefined;

  return {
    cnpj,
    razao_social: String(d.nome ?? ""),
    nome_fantasia: d.fantasia ? String(d.fantasia) : null,
    situacao: String(d.situacao ?? ""),
    atividade_principal: atividades?.[0]?.text ?? "",
    logradouro: String(d.logradouro ?? ""),
    numero: String(d.numero ?? ""),
    complemento: String(d.complemento ?? ""),
    bairro: String(d.bairro ?? ""),
    municipio: String(d.municipio ?? ""),
    uf: String(d.uf ?? ""),
    cep: String(d.cep ?? ""),
    telefone: d.telefone ? String(d.telefone) : null,
    email: d.email ? String(d.email) : null,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const rawCnpj = url.searchParams.get("cnpj") ?? "";
  const cnpj = cleanCnpj(rawCnpj);

  if (cnpj.length !== 14) {
    return new Response(JSON.stringify({ error: "CNPJ deve ter 14 dígitos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let data: CnpjData;
  try {
    data = await fromBrasilApi(cnpj);
  } catch {
    try {
      data = await fromReceitaWS(cnpj);
    } catch {
      return new Response(
        JSON.stringify({ error: "CNPJ não encontrado nas fontes disponíveis" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
