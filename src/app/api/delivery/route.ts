import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  deliverySchedules,
  deliveryScheduleItems,
  orders,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, deliveryBodySchema } from "@/lib/validators/api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.deliverySchedules.findMany({
      where: eq(deliverySchedules.companyId, ctx.companyId),
      with: {
        order: {
          with: {
            enquiry: true,
          },
        },
        venue: true,
        items: true,
      },
      orderBy: desc(deliverySchedules.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching delivery schedules:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch delivery schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, deliveryBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const parentOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!parentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Header and items go in together (#16). If nothing is sent for
    // items the child insert is skipped entirely.
    const deliveryScheduleId = crypto.randomUUID();
    const result = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(deliverySchedules)
        .values({
          id: deliveryScheduleId,
          companyId: ctx.companyId,
          orderId: data.orderId,
          deliveryDate: data.deliveryDate,
          deliveryAddress: data.deliveryAddress,
          venueId: data.venueId,
          driverId: data.driverId,
          timeSlot: data.timeSlot,
          notes: data.notes,
          status: data.status,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      if (data.items && data.items.length > 0) {
        await tx.insert(deliveryScheduleItems).values(
          data.items.map((item) => ({
            id: crypto.randomUUID(),
            deliveryScheduleId,
            orderItemId: item.orderItemId ?? null,
            description: item.description,
            category: item.category ?? null,
            quantity: item.quantity ?? 1,
            notes: item.notes ?? null,
          }))
        );
      }

      return header;
    });

    const full = await db.query.deliverySchedules.findFirst({
      where: eq(deliverySchedules.id, result.id),
      with: { items: true },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating delivery schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create delivery schedule" },
      { status: 500 }
    );
  }
}
