import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  deliverySchedules,
  deliveryScheduleItems,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, deliveryPatchSchema } from "@/lib/validators/api";

/**
 * PATCH /api/delivery/[id]
 *
 * Partial update used by the delivery UI to reassign drivers, edit
 * time slots, tweak the delivery address/venue link, or flip status
 * (pending → ready → dispatched → delivered).
 *
 * Only the fields present on the body are touched; everything else
 * stays as-is. Items are re-serialised on write so the storage
 * column stays a plain `text`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, deliveryPatchSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const existing = await db.query.deliverySchedules.findFirst({
      where: and(
        eq(deliverySchedules.id, params.id),
        eq(deliverySchedules.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Delivery schedule not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };
    if (data.deliveryDate !== undefined) updates.deliveryDate = data.deliveryDate;
    if (data.deliveryAddress !== undefined)
      updates.deliveryAddress = data.deliveryAddress;
    if (data.venueId !== undefined) updates.venueId = data.venueId;
    if (data.driverId !== undefined) updates.driverId = data.driverId;
    if (data.timeSlot !== undefined) updates.timeSlot = data.timeSlot;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.status !== undefined) updates.status = data.status;

    // Items are now a child table (#16). If the client sends items
    // we do a replace-all inside a transaction so the header update
    // and the new rows land together. `items: null` or `[]` clears
    // the existing list.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(deliverySchedules)
        .set(updates)
        .where(
          and(
            eq(deliverySchedules.id, params.id),
            eq(deliverySchedules.companyId, ctx.companyId)
          )
        )
        .returning();

      if (data.items !== undefined) {
        await tx
          .delete(deliveryScheduleItems)
          .where(eq(deliveryScheduleItems.deliveryScheduleId, params.id));
        if (data.items && data.items.length > 0) {
          await tx.insert(deliveryScheduleItems).values(
            data.items.map((item) => ({
              id: crypto.randomUUID(),
              deliveryScheduleId: params.id,
              orderItemId: item.orderItemId ?? null,
              description: item.description,
              category: item.category ?? null,
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
            }))
          );
        }
      }

      return row;
    });

    const full = await db.query.deliverySchedules.findFirst({
      where: eq(deliverySchedules.id, params.id),
      with: { items: true },
    });

    return NextResponse.json(full ?? updated);
  } catch (error) {
    console.error(
      "Error updating delivery schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update delivery schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/delivery/[id]
 *
 * Hard delete. Delivery schedules are operational and don't have
 * downstream references, so there's no archive flag here.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const existing = await db.query.deliverySchedules.findFirst({
      where: and(
        eq(deliverySchedules.id, params.id),
        eq(deliverySchedules.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Delivery schedule not found" },
        { status: 404 }
      );
    }

    await db
      .delete(deliverySchedules)
      .where(
        and(
          eq(deliverySchedules.id, params.id),
          eq(deliverySchedules.companyId, ctx.companyId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Error deleting delivery schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete delivery schedule" },
      { status: 500 }
    );
  }
}
