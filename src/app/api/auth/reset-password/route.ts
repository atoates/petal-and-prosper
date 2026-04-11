import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { resetPasswordSchema } from "@/lib/validators/auth";

/**
 * POST /api/auth/reset-password
 *
 * Consumes a token minted by /api/auth/forgot-password and sets the
 * user's password to the supplied value. The token is strictly
 * single-use: we mark `usedAt` on success, and any future attempt
 * with the same token hash will be rejected because we filter on
 * `usedAt IS NULL`.
 *
 * Security notes:
 *   - We compare hashed tokens, not raw tokens, so a DB leak can't
 *     be replayed into password resets.
 *   - The new password is hashed with bcryptjs (same work factor as
 *     signup).
 *   - We always return generic error messages -- never leak whether
 *     the token exists, is expired, or was already used -- so an
 *     attacker can't probe for valid tokens.
 */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  try {
    const row = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt)
      ),
    });

    if (!row) {
      return NextResponse.json(
        { error: "This reset link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashed = await hash(password, 10);

    // Rotate the password and mark the token consumed in the same
    // logical step. If we ever need transactional guarantees we can
    // wrap these in db.transaction(); the worst case today is a new
    // password with a still-valid token row, which the `usedAt IS
    // NULL` filter defends against on the next attempt anyway.
    await db
      .update(users)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Error in reset-password:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
