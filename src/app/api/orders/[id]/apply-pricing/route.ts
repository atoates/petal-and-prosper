import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, priceSettings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { applyPricing, rulesFromPriceSettings } from "@/lib/pricing/engine";
import { z } from "zod";

/**
 * POST /api/orders/[id]/apply-pricing
 *
 * Takes the order's current line items (treating their `unitPrice` field
 * as the cost the florist paid for one unit) and re-prices them using
 * the tenant's configured pricing rules. Writes the marked-up prices
 * back to order_items.unitPrice/totalPrice, recomputes orders.totalPrice,
 * and stores a JSON snapshot of the rules that produced the quote so the
 * calculation is reproducible even if pricing rules change later.
 *
 * Optional body:
 *   { deliveryMiles?: number, labourHours?: number }
 *
 * These feed the engine's fuel/labour surcharge calculations. They are
 * NOT persisted as order_items in this first cut -- they're folded into
 * orders.totalPrice and stored inside pricingSnapshot. A future UI pass
 * can materialise them as real rows once the order modal supports
 * non-flower line categories.
 */

const bodySchema = z.object({
  deliveryMiles: z.number().nonnegative().optional(),
  labourHours: z.number().nonnegative().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  let opts: { deliveryMiles?: number; labourHours?: number } = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const raw = await request.json();
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success) opts = parsed.data;
    } catch {
      // empty body is fine
    }
  }

  try {
    // Ensure the order belongs to this tenant before touching items.
    const parent = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      with: { items: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const settings = await db.query.priceSettings.findFirst({
      where: eq(priceSettings.companyId, ctx.companyId),
    });
    if (!settings) {
      return NextResponse.json(
        {
          error:
            "Pricing rules not configured. Visit /pricing to set markup, buffer, fuel and staff costs first.",
        },
        { status: 400 }
      );
    }

    const rules = rulesFromPriceSettings({
      multiple: settings.multiple,
      flowerBuffer: settings.flowerBuffer,
      fuelCostPerLitre: settings.fuelCostPerLitre,
      milesPerGallon: settings.milesPerGallon,
      staffCostPerHour: settings.staffCostPerHour,
      staffMargin: settings.staffMargin,
    });

    const inputs = (parent.items || []).map((item) => ({
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      baseCost: parseFloat(item.unitPrice),
    }));

    const result = applyPricing(inputs, rules, opts);

    // Materialise the new unit prices on each item. We update by id so we
    // stay within tenant scope and avoid touching other tenants' data.
    await db.transaction(async (tx) => {
      for (let i = 0; i < (parent.items || []).length; i++) {
        const item = parent.items![i];
        const priced = result.lines[i];
        await tx
          .update(orderItems)
          .set({
            unitPrice: priced.unitPrice.toFixed(2),
            totalPrice: priced.totalPrice.toFixed(2),
          })
          .where(
            and(eq(orderItems.id, item.id), eq(orderItems.orderId, params.id))
          );
      }

      await tx
        .update(orders)
        .set({
          totalPrice: result.total.toFixed(2),
          pricingSnapshot: JSON.stringify({
            rulesApplied: result.rulesApplied,
            inputs: opts,
            subtotal: result.subtotal,
            fuelLine: result.fuelLine ?? null,
            labourLine: result.labourLine ?? null,
            total: result.total,
            appliedAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId))
        );
    });

    const refreshed = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      with: { items: true, enquiry: true },
    });

    return NextResponse.json({
      order: refreshed,
      pricing: result,
    });
  } catch (error) {
    console.error(
      "Error applying pricing:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to apply pricing" },
      { status: 500 }
    );
  }
}
