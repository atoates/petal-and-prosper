import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      with: {
        enquiry: true,
        items: true,
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const body = await request.json();

    const { enquiryId, status, version, totalPrice, items } = body;

    const updated = await db.transaction(async (tx) => {
      // Update the order, scoped to tenant
      const updateResult = await tx
        .update(orders)
        .set({
          enquiryId: enquiryId || null,
          status: status || "draft",
          version: version || 1,
          totalPrice: totalPrice ? parseFloat(totalPrice).toString() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)))
        .returning();

      if (updateResult.length === 0) {
        return null;
      }

      // Update order items if provided
      if (items && Array.isArray(items)) {
        const newItemIds = items
          .filter((item: { id?: string }) => item.id && !item.id.startsWith("new-"))
          .map((item: { id: string }) => item.id);

        const existingItems = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, params.id));

        const itemsToDelete = existingItems.filter(
          (item) => !newItemIds.includes(item.id)
        );

        for (const item of itemsToDelete) {
          await tx.delete(orderItems).where(eq(orderItems.id, item.id));
        }

        for (const item of items) {
          if (item.id && !item.id.startsWith("new-")) {
            await tx
              .update(orderItems)
              .set({
                description: item.description,
                category: item.category || null,
                quantity: item.quantity,
                unitPrice: parseFloat(item.unitPrice).toString(),
                totalPrice: parseFloat(item.totalPrice).toString(),
              })
              .where(eq(orderItems.id, item.id));
          } else {
            await tx.insert(orderItems).values({
              id: crypto.randomUUID(),
              orderId: params.id,
              description: item.description,
              category: item.category || null,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unitPrice).toString(),
              totalPrice: parseFloat(item.totalPrice).toString(),
            });
          }
        }
      }

      return tx.query.orders.findFirst({
        where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
        with: {
          enquiry: true,
          items: true,
        },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    // Verify order belongs to this tenant before touching items
    const existing = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.orderId, params.id));
      await tx
        .delete(orders)
        .where(and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
