import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { updateRoleSchema } from "@/lib/validators/user";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("users:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const parsed = updateRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid role" },
        { status: 400 }
      );
    }
    const newRole = parsed.data.role;

    // Prevent a lone admin from demoting themselves and locking the company
    // out of admin access.
    if (params.id === ctx.userId && newRole !== "admin") {
      const otherAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.companyId, ctx.companyId),
            eq(users.role, "admin"),
            ne(users.id, ctx.userId)
          )
        );
      if (otherAdmins.length === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining admin" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(and(eq(users.id, params.id), eq(users.companyId, ctx.companyId)))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating team member role:", error);
    return NextResponse.json(
      { error: "Failed to update team member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("users:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  // Cannot remove yourself -- prevents accidental company lockout.
  if (params.id === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  try {
    const deleted = await db
      .delete(users)
      .where(and(eq(users.id, params.id), eq(users.companyId, ctx.companyId)))
      .returning({ id: users.id });

    if (!deleted.length) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
