import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { sendEmail } from "@/lib/email/send";

/**
 * POST /api/auth/forgot-password
 *
 * Public endpoint. Accepts an email and, if it matches a real user,
 * mints a single-use reset token valid for 60 minutes and emails the
 * reset link. To avoid leaking which emails exist, we always return
 * the same 200 response regardless of whether the user was found.
 *
 * Tokens are 32 random bytes (hex). We store only the sha256 hash in
 * the DB so that a stolen backup can't be replayed into a password
 * reset -- the raw token only ever exists in the email body.
 *
 * Email dispatch uses the shared stub in `src/lib/email/send.ts`, so
 * during development the reset link is printed to stderr rather than
 * actually sent. When SMTP is wired in, no change is needed here.
 */
function mintRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function resolveAppBase(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, firstName: true },
    });

    // Only mint a token if the user actually exists. We still return
    // the same generic success response either way so callers can't
    // enumerate accounts.
    if (user) {
      const rawToken = mintRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const base = resolveAppBase(request);
      const resetLink = `${base}/reset-password/${rawToken}`;

      await sendEmail({
        to: user.email,
        subject: "Reset your Petal & Prosper password",
        html: `
          <p>Hello${user.firstName ? ` ${user.firstName}` : ""},</p>
          <p>
            We received a request to reset the password on your Petal &amp;
            Prosper account. Click the link below to set a new password.
            This link expires in 60 minutes and can only be used once.
          </p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>
            If you didn't request this, you can safely ignore this email --
            your password won't change.
          </p>
        `,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error(
      "Error in forgot-password:",
      error instanceof Error ? error.message : "unknown"
    );
    // Even on internal error we surface a generic success message so
    // the client UX is consistent; the real failure is logged above.
    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    });
  }
}
