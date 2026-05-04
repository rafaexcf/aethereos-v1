import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "../consumer.js";

const SUPPORTED_EVENTS = new Set([
  "platform.person.created",
  "platform.file.uploaded",
  "platform.folder.created",
  "platform.chat.channel_created",
]);

interface PersonCreatedPayload {
  full_name?: string;
  created_by?: string;
  company_id?: string;
}
interface FileUploadedPayload {
  name?: string;
  uploaded_by?: string;
  company_id?: string;
}
interface FolderCreatedPayload {
  name?: string;
  created_by?: string;
  company_id?: string;
}
interface ChannelCreatedPayload {
  name?: string;
  created_by?: string;
  company_id?: string;
}

interface NotificationDraft {
  user_id: string;
  company_id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  source_app: string;
  source_id: string;
}

/**
 * Sprint 18 MX94 — NotificationConsumer.
 *
 * Subscribes:
 *   - platform.person.created  → "Novo contato: {full_name}"
 *   - platform.file.uploaded   → "Arquivo enviado: {name}"
 *   - platform.folder.created  → "Pasta criada: {name}"
 *   - platform.chat.channel_created → "Canal criado: {name}"
 *
 * Idempotencia:
 *   Antes de inserir, verifica se ja existe row em kernel.notifications
 *   com (user_id, source_app, source_id) iguais. Skip silencioso se sim.
 *   Cobre o caso onde o browser ja inseriu notif inline (ex: proposal
 *   workflow do Sprint 17 que tambem notifica).
 */
export class NotificationConsumer implements InlineConsumer {
  readonly name = "NotificationConsumer";

  matches(eventType: string): boolean {
    return SUPPORTED_EVENTS.has(eventType);
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    const draft = buildDraft(envelope);
    if (draft === null) {
      // payload incompleto — skip silencioso
      return;
    }

    // Idempotencia: verifica duplicata (user_id + source_app + source_id)
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM kernel.notifications
      WHERE user_id = ${draft.user_id}
        AND source_app = ${draft.source_app}
        AND source_id = ${draft.source_id}
      LIMIT 1
    `;
    if (existing.length > 0) {
      // Ja notificado pelo browser inline — skip
      return;
    }

    try {
      await sql`
        INSERT INTO kernel.notifications
          (user_id, company_id, type, title, body, source_app, source_id)
        VALUES
          (${draft.user_id}, ${draft.company_id}, ${draft.type},
           ${draft.title}, ${draft.body},
           ${draft.source_app}, ${draft.source_id})
      `;
      jlog("info", "notification created", {
        user_id: draft.user_id,
        title: draft.title,
        source_app: draft.source_app,
      });
    } catch (e) {
      // R12: log + segue
      jlog("warn", "notification insert failed", {
        event_type: envelope.type,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

function buildDraft(envelope: EventEnvelope): NotificationDraft | null {
  const payload = (envelope.payload ?? {}) as Record<string, unknown>;
  const sourceId = envelope.id;
  const sourceApp = envelope.type.split(".")[0] ?? "platform";

  switch (envelope.type) {
    case "platform.person.created": {
      const p = payload as PersonCreatedPayload;
      const fullName = String(p.full_name ?? "").trim();
      const userId = String(p.created_by ?? "").trim();
      const companyId = String(p.company_id ?? envelope.tenant_id).trim();
      if (fullName === "" || userId === "" || companyId === "") return null;
      return {
        user_id: userId,
        company_id: companyId,
        type: "info",
        title: "Novo contato",
        body: fullName,
        source_app: sourceApp,
        source_id: sourceId,
      };
    }
    case "platform.file.uploaded": {
      const p = payload as FileUploadedPayload;
      const name = String(p.name ?? "").trim();
      const userId = String(p.uploaded_by ?? "").trim();
      const companyId = String(p.company_id ?? envelope.tenant_id).trim();
      if (name === "" || userId === "" || companyId === "") return null;
      return {
        user_id: userId,
        company_id: companyId,
        type: "info",
        title: "Arquivo enviado",
        body: name,
        source_app: sourceApp,
        source_id: sourceId,
      };
    }
    case "platform.folder.created": {
      const p = payload as FolderCreatedPayload;
      const name = String(p.name ?? "").trim();
      const userId = String(p.created_by ?? "").trim();
      const companyId = String(p.company_id ?? envelope.tenant_id).trim();
      if (name === "" || userId === "" || companyId === "") return null;
      return {
        user_id: userId,
        company_id: companyId,
        type: "info",
        title: "Pasta criada",
        body: name,
        source_app: sourceApp,
        source_id: sourceId,
      };
    }
    case "platform.chat.channel_created": {
      const p = payload as ChannelCreatedPayload;
      const name = String(p.name ?? "").trim();
      const userId = String(p.created_by ?? "").trim();
      const companyId = String(p.company_id ?? envelope.tenant_id).trim();
      if (name === "" || userId === "" || companyId === "") return null;
      return {
        user_id: userId,
        company_id: companyId,
        type: "info",
        title: "Canal criado",
        body: name,
        source_app: sourceApp,
        source_id: sourceId,
      };
    }
    default:
      return null;
  }
}
