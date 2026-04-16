import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  invoices,
  orders,
  orderItems,
  invoiceSettings,
} from "@/lib/db/schema";
import { eq, and, desc, like, sql, ilike } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, invoiceBodySchema } from "@/lib/validators/api";
import {
  buildPaginationMeta,
  LEGACY_SAFETY_LIMIT,
  parsePagination,
} from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("invoices:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const pagination = parsePagination(searchParams);

  try {
    const searchClause = q
      ? ilike(invoices.invoiceNumber, `%${q}%`)
      : undefined;

    const whereClause = and(
      eq(invoices.companyId, ctx.companyId),
      searchClause
    );

    if (!pagination) {
      const result = await db.query.invoices.findMany({
        where: whereClause,
        with: { order: { with: { enquiry: true } } },
        orderBy: desc(invoices.createdAt),
        limit: LEGACY_SAFETY_LIMIT,
      });
      return NextResponse.json(result);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(invoices)
      .where(whereClause);

    const data = await db.query.invoices.findMany({
      where: whereClause,
      with: { order: { with: { enquiry: true } } },
      orderBy: desc(invoices.createdAt),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(pagination, total),
    });
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
 * format. A 4-digit zero-padded suffix gives 9999 invoices/year
 * headroom -- more than enough for a floristry SaaS tenant.
 *
 * Implementation: a single aggregate query asks Postgres for the max
 * numeric suffix among matching rows. Only rows whose suffix is purely
 * numeric are considered (the `~` regex guard), so a manually-edited
 * invoice number can't wedge auto-numbering. We avoid loading every
 * invoice row into Node just to find the max.
 */
async function nextInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const suffixStart = prefix.length + 1; // Postgres SUBSTRING is 1-indexed

  const [row] = await db
    .select({
      maxSeq: sql<number | null>`MAX(
        CASE
          WHEN SUBSTRING(${invoices.invoiceNumber} FROM ${suffixStart}) ~ '^[0-9]+$'
          THEN CAST(SUBSTRING(${invoices.invoiceNumber} FROM ${suffixStart}) AS INTEGER)
          ELSE NULL
        END
      )`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        like(invoices.invoiceNumber, `${prefix}%`)
      )
    );

  const maxSeq = row?.maxSeq ?? 0;
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

    // Resolve subtotal from the order's line items (or fall back to
    // orders.totalPrice for back-compat). The subtotal is the pre-VAT
    // figure; VAT is added on top below. The caller can still override
    // the final totalAmount after the fact if they want to fudge the
    // numbers for a manual adjustment.
    let subtotal = data.subtotal;
    if (!subtotal) {
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
        subtotal = itemsTotal.toFixed(2);
      } else if (parentOrder.totalPrice) {
        subtotal = parseFloat(parentOrder.totalPrice).toFixed(2);
      } else {
        subtotal = "0.00";
      }
    }

    // Resolve VAT rate: body override beats tenant default. Rate is a
    // percentage -- "20" means 20 %, not 0.20.
    let vatRate = data.vatRate;
    if (vatRate === null || vatRate === undefined) {
      const settings = await db.query.invoiceSettings.findFirst({
        where: eq(invoiceSettings.companyId, ctx.companyId),
        columns: { defaultVatRate: true },
      });
      vatRate = settings?.defaultVatRate ?? "0";
    }

    const subtotalNum = parseFloat(subtotal);
    const rateNum = parseFloat(vatRate);
    const vatAmountNum = Number(((subtotalNum * rateNum) / 100).toFixed(2));
    const computedTotal = Number((subtotalNum + vatAmountNum).toFixed(2));

    // An explicit totalAmount in the body wins (useful for discounts
    // or manual adjustments), otherwise we use subtotal + VAT.
    const totalAmount =
      data.totalAmount ?? computedTotal.toFixed(2);

    const result = await db
      .insert(invoices)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId: data.orderId,
        invoiceNumber,
        status: data.status,
        subtotal,
        vatRate,
        vatAmount: vatAmountNum.toFixed(2),
        totalAmount,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
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
