import { insertSupabase } from "./supabase.js";

export interface CreateNotificationParams {
  userId: string;
  companyId: string;
  title: string;
  body: string;
  type?: "info" | "success" | "warning" | "error";
  sourceApp?: string;
  sourceId?: string;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  await insertSupabase({
    table: "kernel.notifications",
    data: {
      user_id: params.userId,
      company_id: params.companyId,
      type: params.type ?? "info",
      title: params.title,
      body: params.body,
      source_app: params.sourceApp ?? "temporal-worker",
      source_id: params.sourceId ?? "workflow",
    },
  });
}
