import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, orders, orderItems } from "@/lib/db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, invoiceBodySchema } from "@/lib/validators/api";

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
    console.error(
      "Error fetching invoices:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

/**
 * Generate the next per-company invoice number in the `INV-{year}-{0001}`
 * format. We scan existing invoices for this tenant that match the current
 * year prefix, find the highest numeric suffix, and increment. A 4-digit
 * zero-padded suffix gives 9999 invoices/year headroom -- more than enough
 * for a floristry SaaS tenant and cheap to bump later.
 */
async function nextInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;

  const existing = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        like(invoices.invoiceNumber, `${prefix}%`)
      )
    );

  let maxSeq = 0;
  for (const row of existing) {
    const suffix = row.invoiceNumber.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }

  const next = (maxSeq + 1).toString().padStart(4, "0");
  return `${prefix}${next}`;
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("invoices:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, invoiceBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // Ensure the referenced order belongs to the caller's tenant -- otherwise
    // a client could mint an invoice against another tenant's order.
    const parentOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.companyId, ctx.companyId)
      ),
      columns: { id: true, totalPrice: true },
    });
    if (!parentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Resolve invoice number: use caller's if provided and non-empty,
    // otherwise generate the next per-company sequence.
    let invoiceNumber = data.invoiceNumber?.trim();
    if (!invoiceNumber) {
      invoiceNumber = await nextInvoiceNumber(ctx.companyId);
    }

    // Resolve total: use caller's if provided, otherwise pull from order's
    // line items (or fall back to orders.totalPrice for back-compat).
    let totalAmount = data.totalAmount;
    if (!totalAmount) {
      const items = await db
        .select({
          totalPrice: orderItems.totalPrice,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, data.orderId));

      const itemsTotal = items.reduce(
        (sum, it) => sum + parseFloat(it.totalPrice),
        0
      );
      if (itemsTotal > 0) {
        totalAmount = itemsTotal.toFixed(2);
      } else if (parentOrder.totalPrice) {
        totalAmount = parseFloat(parentOrder.totalPrice).toFixed(2);
      } else {
        totalAmount = "0.00";
      }
    }

    const result = await db
      .insert(invoices)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId: data.orderId,
        invoiceNumber,
        status: data.status,
        totalAmount,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating invoice:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
