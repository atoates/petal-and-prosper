import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  wholesaleOrders,
  wholesaleOrderItems,
  orders,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, wholesaleBodySchema } from "@/lib/validators/api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("wholesale:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.wholesaleOrders.findMany({
      where: eq(wholesaleOrders.companyId, ctx.companyId),
      with: {
        order: true,
        items: true,
      },
      orderBy: desc(wholesaleOrders.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching wholesale orders:",
      error instanceof Error ? error.message : "unknown"
    );
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

  const parsed = await parseJsonBody(request, wholesaleBodySchema);
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

    // Create the wholesale order and its line items in a single
    // transaction so a partial insert can't leave a header without
    // children (or vice versa) -- #16 in Process-Flow-Review.
    const wholesaleOrderId = crypto.randomUUID();
    const result = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(wholesaleOrders)
        .values({
          id: wholesaleOrderId,
          companyId: ctx.companyId,
          orderId: data.orderId,
          supplier: data.supplier,
          status: data.status,
          orderDate: data.orderDate ?? new Date(),
          receivedDate: data.receivedDate,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      if (data.items && data.items.length > 0) {
        await tx.insert(wholesaleOrderItems).values(
          data.items.map((item) => ({
            id: crypto.randomUUID(),
            wholesaleOrderId,
            productId: item.productId ?? null,
            description: item.description,
            category: item.category ?? null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? null,
            notes: item.notes ?? null,
          }))
        );
      }

      return header;
    });

    // Re-read with items so callers get a consistent shape whether
    // or not the client sent any line items on the POST.
    const full = await db.query.wholesaleOrders.findFirst({
      where: eq(wholesaleOrders.id, result.id),
      with: { items: true },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating wholesale order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create wholesale order" },
      { status: 500 }
    );
  }
}
