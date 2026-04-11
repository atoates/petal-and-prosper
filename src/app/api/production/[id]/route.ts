import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productionSchedules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, productionPatchSchema } from "@/lib/validators/api";

/**
 * PATCH /api/production/[id]
 *
 * Partial update for a single production schedule row. Used by the
 * production UI to tweak status, reassign staff, edit the task
 * breakdown, and so on. Tenant scoped via `companyId`.
 *
 * Only fields present on the body are touched; anything the client
 * omits is left alone. Tasks and items are re-serialised to JSON on
 * write so the DB column stays a plain `text` and the list endpoint
 * keeps working without a schema change.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("production:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, productionPatchSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const existing = await db.query.productionSchedules.findFirst({
      where: and(
        eq(productionSchedules.id, params.id),
        eq(productionSchedules.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Production schedule not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.productionDate !== undefined) updates.productionDate = data.productionDate;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.status !== undefined) updates.status = data.status;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.items !== undefined) {
      updates.items = data.items === null ? null : JSON.stringify(data.items);
    }
    if (data.tasks !== undefined) {
      updates.tasks = data.tasks === null ? null : JSON.stringify(data.tasks);
    }

    const [updated] = await db
      .update(productionSchedules)
      .set(updates)
      .where(
        and(
          eq(productionSchedules.id, params.id),
          eq(productionSchedules.companyId, ctx.companyId)
        )
      )
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating production schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update production schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/production/[id]
 *
 * Hard delete. Production schedules are operational records that
 * don't have downstream references, so we don't bother with soft
 * deletes.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("production:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const existing = await db.query.productionSchedules.findFirst({
      where: and(
        eq(productionSchedules.id, params.id),
        eq(productionSchedules.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Production schedule not found" },
        { status: 404 }
      );
    }

    await db
      .delete(productionSchedules)
      .where(
        and(
          eq(productionSchedules.id, params.id),
          eq(productionSchedules.companyId, ctx.companyId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Error deleting production schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete production schedule" },
      { status: 500 }
    );
  }
}
