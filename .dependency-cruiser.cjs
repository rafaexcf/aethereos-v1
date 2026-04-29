/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    moduleSystems: ["es6", "cjs", "amd"],
    // tsPreCompilationDeps e tsConfig ativados a partir de M2 quando existirem arquivos .ts
    tsPreCompilationDeps: false,
    reporterOptions: {
      archi: {
        collapsePattern: "^node_modules/(@[^/]+/[^/]+|[^/]+)",
      },
    },
  },

  forbidden: [
    // ─── Bloqueios globais de tecnologia (ADR-0014 Anexo A) ───────────────────

    {
      name: "no-inngest-anywhere",
      comment: "Event bus e NATS JetStream + Outbox. Inngest bloqueado. (ADR-0014 #2)",
      severity: "error",
      from: { path: "^(apps|packages|tooling)" },
      to: { path: "^node_modules/inngest(/|$)" },
    },
    {
      name: "no-clerk-anywhere",
      comment: "Auth e Supabase Auth como IdP. Clerk bloqueado. (ADR-0014 #4, INV)",
      severity: "error",
      from: { path: "^(apps|packages|tooling)" },
      to: { path: "^node_modules/@clerk(/|$)" },
    },
    {
      name: "no-prisma-anywhere",
      comment: "ORM e Drizzle. Prisma bloqueado. (ADR-0014 #5)",
      severity: "error",
      from: { path: "^(apps|packages|tooling)" },
      to: { path: "^node_modules/(@prisma|prisma)(/|$)" },
    },
    {
      name: "no-aws-cdk-anywhere",
      comment: "IaC e Pulumi TS. aws-cdk bloqueado. (ADR-0014 #11)",
      severity: "error",
      from: { path: "^(apps|packages|tooling|infra)" },
      to: { path: "^node_modules/(aws-cdk|cdk)(/|$)" },
    },
    {
      name: "no-terraform-anywhere",
      comment: "IaC e Pulumi TS. Terraform bloqueado. (CLAUDE.md seção 5)",
      severity: "error",
      from: { path: "^(apps|packages|tooling|infra)" },
      to: { path: "^node_modules/terraform(/|$)" },
    },

    // ─── Bloqueios específicos dos shells (Vite, não Next.js) ─────────────────

    {
      name: "no-next-in-shell",
      comment: "Shell usa Vite/React. Next.js apenas em SaaS standalone. (ADR-0014 #1, INV)",
      severity: "error",
      from: { path: "^apps/shell-(base|commercial)" },
      to: { path: "^node_modules/next(/|$)" },
    },

    // ─── Driver Model — isolamento de dependências externas ───────────────────

    {
      name: "no-direct-supabase-outside-drivers",
      comment:
        "Supabase client apenas em packages/drivers-*. Domínio usa interface Driver. (Fundamentação 4.7, INV)",
      severity: "error",
      from: {
        path: "^(apps|packages)",
        pathNot: "^packages/drivers",
      },
      to: { path: "^node_modules/@supabase/supabase-js(/|$)" },
    },

    // ─── Isolamento de camadas (Fundamentação P1, P2) ─────────────────────────

    {
      name: "kernel-no-apps",
      comment: "Kernel e agnóstico de apps — Driver Model (Fundamentação 4.7, INV)",
      severity: "error",
      from: { path: "^packages/kernel" },
      to: { path: "^apps/" },
    },
    {
      name: "drivers-interfaces-no-apps",
      comment: "Interfaces de drivers sao agnósticas de apps",
      severity: "error",
      from: { path: "^packages/drivers(/|$)" },
      to: { path: "^apps/" },
    },
    {
      name: "no-cross-app-imports",
      comment:
        "Apps sao silos — nenhum app importa de outro via package-name (P2, INV). " +
        "Captura imports npm/aliased entre apps; imports relativos intra-app sao permitidos por construcao.",
      severity: "error",
      from: { path: "^apps/" },
      to: {
        path: "^apps/",
        dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional", "aliased-workspace"],
      },
    },

    // ─── Boas práticas estruturais ────────────────────────────────────────────

    {
      name: "no-circular",
      comment: "Dependências circulares proibidas",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Módulos órfãos (sem importadores e sem importados)",
      severity: "info",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)\\.[^/]+\\.(js|cjs|mjs)$",
          "(^|/)jest\\.config",
          "(^|/)vitest\\.config",
          "(^|/)eslint\\.config",
          "(^|/)vite\\.config",
          "(^|/)tailwind\\.config",
          "(^|/)commitlint\\.config",
        ],
      },
      to: {},
    },
  ],
};
