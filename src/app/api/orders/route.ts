import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, enquiries } from "@/lib/db/schema";
import { eq, and, desc, ilike, sql, inArray } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, orderCreateSchema } from "@/lib/validators/api";
import {
  loadRules,
  priceItemForCompany,
  recomputeOrderTotal,
} from "@/lib/pricing/server";
import {
  buildPaginationMeta,
  LEGACY_SAFETY_LIMIT,
  parsePagination,
} from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("orders:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const pagination = parsePagination(searchParams);

  try {
    // Search resolves client names to enquiry IDs in a single
    // upstream query, then filters orders by that ID set. This lets
    // us keep the cheap `orders.findMany` path for the common case
    // while still supporting "search by client name" without
    // re-building the join into every query.
    let enquiryIdFilter: string[] | null = null;
    if (q) {
      const matches = await db
        .select({ id: enquiries.id })
        .from(enquiries)
        .where(
          and(
            eq(enquiries.companyId, ctx.companyId),
            ilike(enquiries.clientName, `%${q}%`)
          )
        );
      enquiryIdFilter = matches.map((row) => row.id);
      if (enquiryIdFilter.length === 0) {
        // Nothing matches -- short-circuit to an empty response in
        // the right shape instead of issuing a doomed IN (...) query.
        return pagination
          ? NextResponse.json({
              data: [],
              pagination: buildPaginationMeta(pagination, 0),
            })
          : NextResponse.json([]);
      }
    }

    const whereClause = enquiryIdFilter
      ? and(
          eq(orders.companyId, ctx.companyId),
          inArray(orders.enquiryId, enquiryIdFilter)
        )
      : eq(orders.companyId, ctx.companyId);

    if (!pagination) {
      const result = await db.query.orders.findMany({
        where: whereClause,
        with: { enquiry: true },
        orderBy: desc(orders.createdAt),
        limit: LEGACY_SAFETY_LIMIT,
      });
      return NextResponse.json(result);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(orders)
      .where(whereClause);

    const data = await db.query.orders.findMany({
      where: whereClause,
      with: { enquiry: true },
      orderBy: desc(orders.createdAt),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(pagination, total),
    });
  } catch (error) {
    console.error(
      "Error fetching orders:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("orders:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, orderCreateSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // If an enquiry is referenced, it must belong to the caller's tenant.
    if (data.enquiryId) {
      const parent = await db.query.enquiries.findFirst({
        where: and(
          eq(enquiries.id, data.enquiryId),
          eq(enquiries.companyId, ctx.companyId)
        ),
        columns: { id: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Enquiry not found" },
          { status: 404 }
        );
      }
    }

    // Load the tenant's pricing rules once so we can price any
    // incoming items in one pass rather than hitting price_settings
    // per-row. Rules may be null for a brand-new tenant that hasn't
    // visited the Pricing page yet; in that case priceItemForCompany()
    // falls back to "no markup" so the order still saves.
    const rules = await loadRules(ctx.companyId);
    const orderId = crypto.randomUUID();

    const inserted = await db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(orders)
        .values({
          id: orderId,
          companyId: ctx.companyId,
          enquiryId: data.enquiryId,
          status: data.status,
          totalPrice: data.totalPrice ?? "0",
          version: 1,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      if (data.items && data.items.length > 0) {
        for (const raw of data.items) {
          const priced = priceItemForCompany(
            {
              description: raw.description,
              category: raw.category,
              quantity: raw.quantity,
              baseCost: raw.baseCost,
              unitPrice: raw.unitPrice,
            },
            rules
          );
          await tx.insert(orderItems).values({
            id: crypto.randomUUID(),
            orderId,
            description: priced.description,
            category: priced.category,
            quantity: priced.quantity,
            baseCost: priced.baseCost,
            unitPrice: priced.unitPrice,
            totalPrice: priced.totalPrice,
            imageUrl: raw.imageUrl ?? null,
            bundleId: raw.bundleId ?? null,
            bundleName: raw.bundleName ?? null,
            baseQuantity: raw.baseQuantity ?? null,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          });
        }
        await recomputeOrderTotal(tx, orderId, ctx.companyId);
      }

      // Advance the parent enquiry's progress to "Order" inside the
      // same transaction. "Order" is the terminal state in the enquiry
      // funnel, so overwriting unconditionally is correct. Keeping
      // this inside the transaction means we never have an order
      // without its parent enquiry advanced, or vice versa.
      if (data.enquiryId) {
        await tx
          .update(enquiries)
          .set({ progress: "Order", updatedBy: ctx.userId, updatedAt: new Date() })
          .where(
            and(
              eq(enquiries.id, data.enquiryId),
              eq(enquiries.companyId, ctx.companyId)
            )
          );
      }

      return orderRow;
    });

    // Re-fetch so the caller sees the final totalPrice after any
    // item-driven recompute.
    const fresh = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId)),
      with: { items: true, enquiry: true },
    });

    return NextResponse.json(fresh ?? inserted, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
