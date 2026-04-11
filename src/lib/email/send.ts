/**
 * Email sending — stubbed until SMTP is configured.
 * All sends fall through to console so nothing breaks at runtime.
 */

export interface EmailEnvelope {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
}

export interface EmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  provider: "console" | "smtp";
}

export async function sendEmail(envelope: EmailEnvelope): Promise<EmailResult> {
  const plainPreview = envelope.html.replace(/<[^>]+>/g, " ").slice(0, 400);
  console.warn(
    "[email:stub]",
    JSON.stringify({ to: envelope.to, subject: envelope.subject, preview: plainPreview })
  );
  return { ok: true, provider: "console", messageId: `stub-${Date.now()}` };
}
