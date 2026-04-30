// ADR-0024: Magic Store é launcher de Camada 2 — não hospeda verticais.
// Catálogo estático. URLs de Camada 2 configuradas por env.

export interface MagicStoreApp {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: "vertical" | "optional";
  type: "standalone" | "module";
  externalUrl?: string;
  moduleKey?: string;
  status: "available" | "coming_soon" | "beta";
  tags: string[];
}

export const MAGIC_STORE_CATALOG: MagicStoreApp[] = [
  {
    id: "comercio-digital",
    name: "Comércio Digital",
    description:
      "Catálogo, cotações e vendas online B2B com fiscais integrados.",
    longDescription:
      "App standalone para gestão completa de comércio B2B: catálogo de produtos com NCM, cotações, pedidos de venda, NF-e, integrações com transportadoras. Requer aprovação da plataforma para ativação.",
    icon: "ShoppingCart",
    color: "#f0fc05",
    category: "vertical",
    type: "standalone",
    externalUrl:
      import.meta.env["VITE_COMERCIO_DIGITAL_URL"] ??
      "https://comercio.aethereos.io",
    status: "beta",
    tags: ["vendas", "fiscal", "ncm", "nfe"],
  },
  {
    id: "logitix",
    name: "LOGITIX",
    description:
      "Logística, fretes, transportadoras e rastreamento de entregas.",
    longDescription:
      "Plataforma de gestão logística: cotação de fretes, integração com transportadoras, rastreamento em tempo real, romaneios e gestão de ocorrências.",
    icon: "Truck",
    color: "#059669",
    category: "vertical",
    type: "standalone",
    externalUrl:
      import.meta.env["VITE_LOGITIX_URL"] ?? "https://logitix.aethereos.io",
    status: "coming_soon",
    tags: ["logística", "fretes", "transporte"],
  },
  {
    id: "erp",
    name: "ERP",
    description: "Gestão financeira, fiscal e contábil para sua empresa.",
    longDescription:
      "ERP completo: contas a pagar e receber, fluxo de caixa, DRE, gestão fiscal (SPED, NFe, CTe), integração contábil e relatórios gerenciais.",
    icon: "BarChart3",
    color: "#7c3aed",
    category: "vertical",
    type: "standalone",
    externalUrl: import.meta.env["VITE_ERP_URL"] ?? "https://erp.aethereos.io",
    status: "coming_soon",
    tags: ["financeiro", "fiscal", "contábil"],
  },
  {
    id: "kwix",
    name: "Kwix CRM",
    description: "CRM de vendas, pipeline e gestão de oportunidades.",
    longDescription:
      "CRM focado em vendas B2B: pipeline Kanban, gestão de oportunidades, acompanhamento de propostas e métricas de conversão.",
    icon: "TrendingUp",
    color: "#f97316",
    category: "vertical",
    type: "standalone",
    externalUrl:
      import.meta.env["VITE_KWIX_URL"] ?? "https://kwix.aethereos.io",
    status: "coming_soon",
    tags: ["crm", "vendas", "pipeline"],
  },
  {
    id: "autergon",
    name: "Autergon",
    description: "Automações, workflows e integrações entre sistemas.",
    longDescription:
      "Plataforma de automação de processos: triggers, ações condicionais, webhooks, integração com APIs externas e orquestração de workflows.",
    icon: "Zap",
    color: "#8b5cf6",
    category: "vertical",
    type: "standalone",
    externalUrl:
      import.meta.env["VITE_AUTERGON_URL"] ?? "https://autergon.aethereos.io",
    status: "coming_soon",
    tags: ["automação", "workflows", "integrações"],
  },
];

export type MagicStoreCategory =
  | "all"
  | "vertical"
  | "optional"
  | "beta"
  | "coming_soon";

export function filterCatalog(
  catalog: MagicStoreApp[],
  category: MagicStoreCategory,
): MagicStoreApp[] {
  if (category === "all") return catalog;
  if (category === "vertical")
    return catalog.filter((a) => a.category === "vertical");
  if (category === "optional")
    return catalog.filter((a) => a.category === "optional");
  if (category === "beta") return catalog.filter((a) => a.status === "beta");
  if (category === "coming_soon")
    return catalog.filter((a) => a.status === "coming_soon");
  return catalog;
}
