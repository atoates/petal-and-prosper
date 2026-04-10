import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { inviteUserSchema } from "@/lib/validators/user";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("users:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.companyId, ctx.companyId));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("users:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const parsed = inviteUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(parsed.data.password, 10);

    const [created] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: parsed.data.email,
        password: passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: parsed.data.role,
        companyId: ctx.companyId,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error inviting team member:", error);
    return NextResponse.json(
      { error: "Failed to invite team member" },
      { status: 500 }
    );
  }
}
