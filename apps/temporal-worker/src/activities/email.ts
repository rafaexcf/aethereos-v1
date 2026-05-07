export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

const RESEND_API_KEY = process.env["RESEND_API_KEY"] ?? "";
const FROM_DEFAULT = process.env["EMAIL_FROM"] ?? "no-reply@aethereos.io";

function jlog(event: string, fields: Record<string, unknown>): void {
  process.stdout.write(
    JSON.stringify({
      ts: new Date().toISOString(),
      component: "activity:sendEmail",
      event,
      ...fields,
    }) + "\n",
  );
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ delivered: boolean; provider: string }> {
  const from = params.from ?? FROM_DEFAULT;

  if (!RESEND_API_KEY) {
    jlog("dev_log_only", {
      to: params.to,
      subject: params.subject,
      body_preview: params.body.slice(0, 80),
    });
    return { delivered: false, provider: "console" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    jlog("resend_error", { status: res.status, body: text.slice(0, 200) });
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }

  jlog("delivered", { to: params.to, provider: "resend" });
  return { delivered: true, provider: "resend" };
}
