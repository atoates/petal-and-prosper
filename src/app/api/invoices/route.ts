import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("invoices:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.invoices.findMany({
      where: eq(invoices.companyId, ctx.companyId),
      with: {
        order: true,
      },
      orderBy: desc(invoices.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("invoices:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const body = await request.json();

    const { orderId, invoiceNumber, status, totalAmount, dueDate, paidAt } =
      body;

    if (!orderId || !invoiceNumber || !totalAmount) {
      return NextResponse.json(
        {
          error: "Order ID, invoice number, and total amount are required",
        },
        { status: 400 }
      );
    }

    // Ensure the referenced order belongs to the caller's tenant -- otherwise
    // a client could mint an invoice against another tenant's order.
    const parentOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId)),
      columns: { id: true },
    });
    if (!parentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const result = await db
      .insert(invoices)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId,
        invoiceNumber,
        status: status || "draft",
        totalAmount: parseFloat(totalAmount).toString(),
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
