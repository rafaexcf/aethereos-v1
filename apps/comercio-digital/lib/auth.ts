import { cookies } from "next/headers";

export interface SessionInfo {
  userId: string;
  email: string;
  companyId: string | null;
}

export async function getServerSession(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!sessionCookie) return null;

  try {
    const raw = JSON.parse(atob(sessionCookie.value.split(".")[1] ?? ""));
    const userId: unknown = raw.sub;
    const email: unknown = raw.email;
    const companyId: unknown = raw.active_company_id ?? null;

    if (typeof userId !== "string" || typeof email !== "string") return null;

    return {
      userId,
      email,
      companyId: typeof companyId === "string" ? companyId : null,
    };
  } catch {
    return null;
  }
}
