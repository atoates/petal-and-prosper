import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wholesaleOrders, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("wholesale:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.wholesaleOrders.findMany({
      where: eq(wholesaleOrders.companyId, ctx.companyId),
      with: {
        order: true,
      },
      orderBy: desc(wholesaleOrders.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching wholesale orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("wholesale:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const body = await request.json();

    const { orderId, supplier, items, status, orderDate, receivedDate } =
      body;

    if (!orderId || !supplier) {
      return NextResponse.json(
        { error: "Order ID and supplier are required" },
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
      .insert(wholesaleOrders)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId,
        supplier,
        items: items ? JSON.stringify(items) : null,
        status: status || "pending",
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        receivedDate: receivedDate ? new Date(receivedDate) : null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating wholesale order:", error);
    return NextResponse.json(
      { error: "Failed to create wholesale order" },
      { status: 500 }
    );
  }
}
