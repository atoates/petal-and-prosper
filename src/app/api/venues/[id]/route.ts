import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, venuePatchSchema } from "@/lib/validators/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, venuePatchSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const existing = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, params.id),
        eq(venues.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.contactName !== undefined) updates.contactName = data.contactName;
    if (data.contactPhone !== undefined)
      updates.contactPhone = data.contactPhone;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db
      .update(venues)
      .set(updates)
      .where(
        and(eq(venues.id, params.id), eq(venues.companyId, ctx.companyId))
      )
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating venue:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update venue" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const existing = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, params.id),
        eq(venues.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    await db
      .delete(venues)
      .where(
        and(eq(venues.id, params.id), eq(venues.companyId, ctx.companyId))
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Error deleting venue:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete venue" },
      { status: 500 }
    );
  }
}
