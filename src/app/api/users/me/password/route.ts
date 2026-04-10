import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { requireSessionApi } from "@/lib/auth/permissions-api";
import { changePasswordSchema } from "@/lib/validators/user";

export async function POST(request: NextRequest) {
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, ctx.userId));

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If the user already has a password set, require the current one to
    // match. Users created via OAuth or pre-migration may have a null
    // password and can set one without a current-password check.
    if (existing.password) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }
      const ok = await compare(parsed.data.currentPassword, existing.password);
      if (!ok) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    const newHash = await hash(parsed.data.newPassword, 10);
    await db
      .update(users)
      .set({ password: newHash, updatedAt: new Date() })
      .where(eq(users.id, ctx.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
