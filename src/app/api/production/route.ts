import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productionSchedules, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("production:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.productionSchedules.findMany({
      where: eq(productionSchedules.companyId, ctx.companyId),
      with: {
        order: true,
      },
      orderBy: desc(productionSchedules.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching production schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch production schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("production:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const body = await request.json();

    const { orderId, eventDate, items, notes, status } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const parentOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId)),
      columns: { id: true },
    });
    if (!parentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const result = await db
      .insert(productionSchedules)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId,
        eventDate: eventDate ? new Date(eventDate) : null,
        items: items ? JSON.stringify(items) : null,
        notes: notes || null,
        status: status || "not_started",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating production schedule:", error);
    return NextResponse.json(
      { error: "Failed to create production schedule" },
      { status: 500 }
    );
  }
}
