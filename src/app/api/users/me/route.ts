import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth/permissions-api";
import { updateProfileSchema } from "@/lib/validators/user";

export async function GET(_request: NextRequest) {
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const [me] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, ctx.userId));

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(me);
  } catch (error) {
    console.error("Error fetching own profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const parsed = updateProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
