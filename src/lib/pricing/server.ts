/**
 * Server-side pricing helpers
 * ===========================
 *
 * Thin layer between the pure pricing engine in `./engine.ts` and the
 * database. Route handlers call these helpers so that every mutation
 * path (create order, add item, edit item, apply-pricing) goes through
 * the same rules-loading and markup logic.
 *
 * Design notes:
 *
 *   - `loadRules()` is idempotent and cheap (one row) but still async,
 *     so callers should fetch once per request and pass the result
 *     through to `priceItemForCompany()` rather than re-fetching per
 *     line item.
 *
 *   - `priceItemForCompany()` is a pure wrapper around `priceLine()`
 *     that snaps the result onto the string-formatted decimals Drizzle
 *     wants for `decimal(..)` columns. All callers persist the returned
 *     shape directly.
 *
 *   - `sumItemTotals()` re-derives the order's rolling `totalPrice`
 *     from the current set of items. Call it inside a transaction,
 *     after inserts/updates/deletes, so the order row stays in sync
 *     with its children.
 */
import { db } from "@/lib/db";
import { priceSettings, orderItems, orders } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  priceLine,
  rulesFromPriceSettings,
  type PricingRules,
} from "./engine";

export type RulesOrNull = PricingRules | null;

/**
 * Load the caller's tenant pricing rules. Returns null when the tenant
 * has no price_settings row (e.g. a brand-new signup that hasn't hit
 * the Pricing page yet). Callers should fall back to "no markup" in
 * that case -- we never block an order from being created just because
 * pricing hasn't been configured.
 */
export async function loadRules(companyId: string): Promise<RulesOrNull> {
  const row = await db.query.priceSettings.findFirst({
    where: eq(priceSettings.companyId, companyId),
  });
  if (!row) return null;
  return rulesFromPriceSettings({
    multiple: row.multiple,
    flowerBuffer: row.flowerBuffer,
    fuelCostPerLitre: row.fuelCostPerLitre,
    milesPerGallon: row.milesPerGallon,
    staffCostPerHour: row.staffCostPerHour,
    staffMargin: row.staffMargin,
  });
}

export interface IncomingItem {
  description: string;
  category?: string | null;
  quantity: number;
  /** What the florist pays for one unit, ex-VAT. Optional. */
  baseCost?: string | number | null;
  /** Manual override sell price. Only used when baseCost is not set. */
  unitPrice?: string | number | null;
}

export interface PricedItem {
  description: string;
  category: string | null;
  quantity: number;
  baseCost: string | null;
  unitPrice: string;
  totalPrice: string;
}

/**
 * Convert an incoming item shape into the exact string-formatted
 * decimals Drizzle expects for `decimal(..)` columns.
 *
 * Rules:
 *   - If the caller supplies `baseCost`, the pricing engine is run
 *     against the tenant's rules and the result is persisted.
 *   - If only `unitPrice` is supplied, we treat it as a manual
 *     override: baseCost stays null, unitPrice is persisted as-is,
 *     totalPrice is quantity * unitPrice.
 *   - If neither is supplied, we fall back to unitPrice = "0".
 *
 * This keeps the flow backwards compatible: any client that still
 * posts raw unitPrice continues to work, while the modern path that
 * posts baseCost gets auto-markup.
 */
export function priceItemForCompany(
  input: IncomingItem,
  rules: RulesOrNull
): PricedItem {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const baseCostNum = toNumberOrNull(input.baseCost);
  const manualUnitNum = toNumberOrNull(input.unitPrice);

  let unitPrice: number;
  let baseCostStr: string | null = null;

  if (baseCostNum !== null && rules) {
    const priced = priceLine(
      {
        description: input.description,
        category: input.category ?? null,
        quantity,
        baseCost: baseCostNum,
      },
      rules
    );
    unitPrice = priced.unitPrice;
    baseCostStr = baseCostNum.toFixed(2);
  } else if (baseCostNum !== null) {
    // Rules not configured -- treat baseCost as the sell price too so
    // the order is still usable. User can re-apply pricing later.
    unitPrice = baseCostNum;
    baseCostStr = baseCostNum.toFixed(2);
  } else if (manualUnitNum !== null) {
    unitPrice = manualUnitNum;
  } else {
    unitPrice = 0;
  }

  const totalPrice = round2(unitPrice * quantity);

  return {
    description: input.description,
    category: (input.category ?? null) || null,
    quantity,
    baseCost: baseCostStr,
    unitPrice: unitPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
}

/**
 * Recompute the parent order's totalPrice from its current items.
 * Call inside the same transaction that mutated the items so the
 * total stays consistent even on concurrent updates.
 */
export async function recomputeOrderTotal(
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
  companyId: string
): Promise<string> {
  const items = await (tx as typeof db)
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const sum = items.reduce(
    (acc, item) => acc + Number(item.totalPrice || 0),
    0
  );
  const total = round2(sum).toFixed(2);
  await (tx as typeof db)
    .update(orders)
    .set({ totalPrice: total, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.companyId, companyId)));
  return total;
}

function toNumberOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
