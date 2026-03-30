import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, COMPANY_ID)),
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
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const { enquiryId, status, version, totalPrice, items } = body;

    // Update the order
    const result = await db
      .update(orders)
      .set({
        enquiryId: enquiryId || null,
        status: status || "draft",
        version: version || 1,
        totalPrice: totalPrice ? parseFloat(totalPrice).toString() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, params.id), eq(orders.companyId, COMPANY_ID)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items that are not in the new list
      const newItemIds = items
        .filter((item: any) => item.id && !item.id.startsWith("new-"))
        .map((item: any) => item.id);

      const existingItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, params.id));

      const itemsToDelete = existingItems.filter(
        (item) => !newItemIds.includes(item.id)
      );

      for (const item of itemsToDelete) {
        await db.delete(orderItems).where(eq(orderItems.id, item.id));
      }

      // Insert or update items
      for (const item of items) {
        if (item.id && !item.id.startsWith("new-")) {
          // Update existing item
          await db
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
          // Insert new item
          await db.insert(orderItems).values({
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

    // Fetch the updated order with items
    const updatedOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, COMPANY_ID)),
      with: {
        enquiry: true,
        items: true,
      },
    });

    return NextResponse.json(updatedOrder);
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
  try {
    const COMPANY_ID = await getCompanyId();
    // Delete all order items
    await db.delete(orderItems).where(eq(orderItems.orderId, params.id));

    // Delete the order
    const result = await db
      .delete(orders)
      .where(and(eq(orders.id, params.id), eq(orders.companyId, COMPANY_ID)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
