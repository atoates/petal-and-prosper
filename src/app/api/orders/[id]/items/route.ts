import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import {
  parseJsonBody,
  orderItemCreateSchema,
} from "@/lib/validators/api";

async function assertOrderBelongsToTenant(
  orderId: string,
  companyId: string
): Promise<boolean> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.companyId, companyId)),
    columns: { id: true },
  });
  return !!order;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const { id } = params;

    if (!(await assertOrderBelongsToTenant(id, ctx.companyId))) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const result = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, id),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching order items:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch order items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, orderItemCreateSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const { id } = params;

    if (!(await assertOrderBelongsToTenant(id, ctx.companyId))) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const result = await db
      .insert(orderItems)
      .values({
        id: crypto.randomUUID(),
        orderId: id,
        description: data.description,
        category: data.category,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating order item:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create order item" },
      { status: 500 }
    );
  }
}
