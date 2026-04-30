import { supabase, ignoreConflict } from "./client.js";
import type { SeedUser } from "./users.js";

interface FileSpec {
  name: string;
  kind: "folder" | "file";
  mime_type?: string;
  size_bytes?: number;
  children?: FileSpec[];
}

const FILE_TREE: FileSpec[] = [
  {
    name: "Documentos",
    kind: "folder",
    children: [
      {
        name: "Contrato Social.pdf",
        kind: "file",
        mime_type: "application/pdf",
        size_bytes: 245_000,
      },
      {
        name: "Proposta Comercial Q1.docx",
        kind: "file",
        mime_type:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size_bytes: 85_400,
      },
      {
        name: "NDA Template.pdf",
        kind: "file",
        mime_type: "application/pdf",
        size_bytes: 112_000,
      },
      {
        name: "Ata Reunião Abril.md",
        kind: "file",
        mime_type: "text/markdown",
        size_bytes: 3_200,
      },
    ],
  },
  {
    name: "Financeiro",
    kind: "folder",
    children: [
      {
        name: "Balanço 2025.xlsx",
        kind: "file",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 420_000,
      },
      {
        name: "DRE Q1 2026.xlsx",
        kind: "file",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 380_000,
      },
      {
        name: "Fluxo de Caixa.json",
        kind: "file",
        mime_type: "application/json",
        size_bytes: 18_000,
      },
    ],
  },
  {
    name: "Projetos",
    kind: "folder",
    children: [
      {
        name: "Roadmap 2026.md",
        kind: "file",
        mime_type: "text/markdown",
        size_bytes: 9_800,
      },
      {
        name: "Especificação Técnica v2.txt",
        kind: "file",
        mime_type: "text/plain",
        size_bytes: 24_600,
      },
      {
        name: "Diagrama Arquitetura.png",
        kind: "file",
        mime_type: "image/png",
        size_bytes: 1_240_000,
      },
    ],
  },
  {
    name: "RH",
    kind: "folder",
    children: [
      {
        name: "Organograma.pdf",
        kind: "file",
        mime_type: "application/pdf",
        size_bytes: 195_000,
      },
      {
        name: "Política de Férias.md",
        kind: "file",
        mime_type: "text/markdown",
        size_bytes: 4_100,
      },
    ],
  },
];

async function insertTree(
  tree: FileSpec[],
  companyId: string,
  createdBy: string,
  parentId: string | null,
): Promise<void> {
  for (const spec of tree) {
    const { data, error } = await (supabase
      .from("files")
      .upsert(
        {
          company_id: companyId,
          parent_id: parentId,
          kind: spec.kind,
          name: spec.name,
          mime_type: spec.mime_type ?? null,
          size_bytes: spec.size_bytes ?? null,
          storage_path:
            spec.kind === "file" ? `seed/${companyId}/${spec.name}` : null,
          created_by: createdBy,
        },
        { onConflict: "company_id,parent_id,name" },
      )
      .select("id")
      .single() as unknown as Promise<{
      data: { id: string } | null;
      error: { message: string; code?: string } | null;
    }>);

    if (error !== null) {
      if (!ignoreConflict(error)) {
        console.warn(`    warn: files.upsert(${spec.name}):`, error.message);
      }
      continue;
    }

    if (data !== null && spec.children && spec.children.length > 0) {
      await insertTree(spec.children, companyId, createdBy, data.id);
    }
  }
}

export async function seedFiles(users: SeedUser[]): Promise<void> {
  console.log("  → Seeding files...");

  const ownerByCompany: Record<string, string> = {};
  for (const u of users) {
    if (u.role === "owner") ownerByCompany[u.companyId] = u.authId;
  }

  const companyIds = [...new Set(users.map((u) => u.companyId))];
  let total = 0;

  for (const companyId of companyIds) {
    const owner = ownerByCompany[companyId];
    if (!owner) continue;
    await insertTree(FILE_TREE, companyId, owner, null);
    // count: 4 folders + 10 files = 14 items
    total += 14;
  }

  console.log(`  ✓ ~${total} files/folders (${companyIds.length} companies)`);
}
