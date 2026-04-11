import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, enquiries } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, orderCreateSchema } from "@/lib/validators/api";
import {
  loadRules,
  priceItemForCompany,
  recomputeOrderTotal,
} from "@/lib/pricing/server";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("orders:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.orders.findMany({
      where: eq(orders.companyId, ctx.companyId),
      with: {
        enquiry: true,
      },
      orderBy: desc(orders.createdAt),
    });

    return NextResponse.json(result);
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
          });
        }
        // Recompute total from the freshly-inserted items so it
        // always reflects what the pricing engine produced rather
        // than whatever totalPrice the client posted.
        await recomputeOrderTotal(tx, orderId, ctx.companyId);
      }

      return orderRow;
    });

    // Auto-advance the parent enquiry's progress to "Order" whenever
    // an order is created from it. "Order" is the terminal state in
    // the enquiry funnel, so overwriting unconditionally is correct:
    // nothing is further along than "an order exists". Tenant
    // scoping is already guaranteed by the check above.
    if (data.enquiryId) {
      await db
        .update(enquiries)
        .set({ progress: "Order", updatedAt: new Date() })
        .where(
          and(
            eq(enquiries.id, data.enquiryId),
            eq(enquiries.companyId, ctx.companyId)
          )
        );
    }

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
