import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, orderItems, enquiries } from "@/lib/db/schema";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody } from "@/lib/validators/api";
import {
  loadRules,
  priceItemForCompany,
  recomputeOrderTotal,
} from "@/lib/pricing/server";

/**
 * POST /api/orders/[id]/duplicate
 *
 * Clone an existing order into a new draft. Source is the order in
 * the URL path; the body optionally provides a different enquiry to
 * attach the new order to. Default is `enquiryId: null` so the caller
 * can assign a fresh client after duplication.
 *
 * Pricing behaviour is controlled by `reprice` (default true). When
 * true we re-run each item through priceItemForCompany() with the
 * tenant's current rules -- so duplicating a year-old order applies
 * this year's markup rather than freezing last year's figures.
 *
 * Bundle grouping survives the copy: items that shared a bundle_id
 * on the source end up sharing a fresh bundle_id on the duplicate,
 * so editing one bundle in the new order doesn't touch the original.
 */

const duplicateBodySchema = z.object({
  enquiryId: z.string().uuid().nullish(),
  reprice: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, duplicateBodySchema);
  if (!parsed.success) return parsed.response;
  const { enquiryId, reprice = true } = parsed.data;

  try {
    // Load source -- tenant-scoped so one company can't clone another
    // company's order.
    const source = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, params.id),
        eq(orders.companyId, ctx.companyId)
      ),
      with: { items: true },
    });
    if (!source) {
      return NextResponse.json(
        { error: "Source order not found" },
        { status: 404 }
      );
    }

    // If a target enquiry was supplied, verify ownership. Null is
    // allowed (caller will assign later).
    if (enquiryId) {
      const parent = await db.query.enquiries.findFirst({
        where: and(
          eq(enquiries.id, enquiryId),
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

    const rules = reprice ? await loadRules(ctx.companyId) : null;
    const newOrderId = crypto.randomUUID();

    // Map original bundle_ids to fresh ones so bundle grouping is
    // preserved but the new order's bundles are independent of the
    // source. Items without a bundle_id stay loose.
    const bundleIdMap = new Map<string, string>();
    const freshBundleId = (sourceId: string | null): string | null => {
      if (!sourceId) return null;
      let next = bundleIdMap.get(sourceId);
      if (!next) {
        next = crypto.randomUUID();
        bundleIdMap.set(sourceId, next);
      }
      return next;
    };

    const inserted = await db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(orders)
        .values({
          id: newOrderId,
          companyId: ctx.companyId,
          enquiryId: enquiryId ?? null,
          status: "draft",
          // Start the rolling total at 0; recomputeOrderTotal below
          // replaces it once items are in place.
          totalPrice: "0",
          version: 1,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      for (const item of source.items) {
        // When repricing, rerun through the engine so markup reflects
        // current rules. When not, preserve baseCost/unitPrice/total
        // from the source verbatim.
        const priced = reprice
          ? priceItemForCompany(
              {
                description: item.description,
                category: item.category,
                quantity: item.quantity,
                baseCost: item.baseCost,
                unitPrice: item.unitPrice,
              },
              rules
            )
          : {
              description: item.description,
              category: item.category,
              quantity: item.quantity,
              baseCost: item.baseCost,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            };

        await tx.insert(orderItems).values({
          id: crypto.randomUUID(),
          orderId: newOrderId,
          description: priced.description,
          category: priced.category,
          quantity: priced.quantity,
          baseCost: priced.baseCost,
          unitPrice: priced.unitPrice,
          totalPrice: priced.totalPrice,
          imageUrl: item.imageUrl ?? null,
          bundleId: freshBundleId(item.bundleId ?? null),
          bundleName: item.bundleName ?? null,
          baseQuantity: item.baseQuantity ?? null,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        });
      }

      if (source.items.length > 0) {
        await recomputeOrderTotal(tx, newOrderId, ctx.companyId);
      }

      // If an enquiry was linked, bump its progress to "Order" like
      // the create path does. Leaves untouched enquiries alone.
      if (enquiryId) {
        await tx
          .update(enquiries)
          .set({
            progress: "Order",
            updatedBy: ctx.userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(enquiries.id, enquiryId),
              eq(enquiries.companyId, ctx.companyId)
            )
          );
      }

      return orderRow;
    });

    // Re-fetch so the caller gets the final totalPrice + items nested.
    const fresh = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, newOrderId),
        eq(orders.companyId, ctx.companyId)
      ),
      with: { items: true, enquiry: true },
    });

    return NextResponse.json(fresh ?? inserted, { status: 201 });
  } catch (error) {
    console.error(
      "Error duplicating order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to duplicate order" },
      { status: 500 }
    );
  }
}
