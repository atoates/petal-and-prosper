/**
 * Pricing engine
 * ===============
 *
 * Turns raw line-item costs into marked-up sell prices using the company's
 * configured pricing rules. Historically these rules lived on the
 * `priceSettings` table but were never applied to orders -- the
 * `/pricing` page was effectively decorative. This module fixes that.
 *
 * The calculation is intentionally pure and deterministic: given the same
 * inputs it always returns the same outputs, and it never touches the
 * database. Call it from API route handlers (or server components) and
 * persist the result + the snapshot of rules that produced it, so a given
 * order's pricing remains reproducible even if settings change later.
 *
 * Rules applied per flower/foliage line:
 *   sellUnit = baseCost * flowerBuffer * multiple
 *
 * Rules applied per non-flower line (sundry/container/ribbon/accessory):
 *   sellUnit = baseCost * multiple   (no buffer -- buffer exists to cover
 *                                     flower wastage, not hard goods)
 *
 * Order-level additions:
 *   fuelCost   = (milesRoundTrip / milesPerGallon) * (fuelCostPerLitre * 4.546)
 *   labourCost = (hours * staffCostPerHour) * staffMargin
 *
 * These are added as synthetic line items on the returned quote so they
 * survive through invoicing and so the customer sees what they're paying
 * for. The caller decides whether to persist them as real order_items or
 * just display them.
 */

export interface PricingRules {
  multiple: number;
  flowerBuffer: number;
  fuelCostPerLitre: number;
  milesPerGallon: number;
  staffCostPerHour: number;
  staffMargin: number;
}

export interface PricingInput {
  description: string;
  category?: string | null;
  quantity: number;
  /**
   * What the florist pays for one unit (ex-VAT). The engine marks this
   * up to produce the customer-facing unit price.
   */
  baseCost: number;
}

export interface PricedLine {
  description: string;
  category: string | null;
  quantity: number;
  baseCost: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PricingOptions {
  /** Round-trip miles for delivery. Omit for no fuel line. */
  deliveryMiles?: number;
  /** Labour hours (design + production + deliver). Omit for no labour line. */
  labourHours?: number;
}

export interface PricingResult {
  lines: PricedLine[];
  fuelLine?: PricedLine;
  labourLine?: PricedLine;
  subtotal: number;
  total: number;
  /**
   * The snapshot of rules that produced this quote. Persist this with the
   * order so you can always recreate the calculation later even if the
   * company's price_settings row has changed in the meantime.
   */
  rulesApplied: PricingRules;
}

const FLOWER_CATEGORIES = new Set(["flower", "foliage"]);
// 1 UK gallon = 4.546 litres
const LITRES_PER_GALLON = 4.546;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function markupForCategory(category: string | null, rules: PricingRules): number {
  const cat = (category || "").toLowerCase();
  if (FLOWER_CATEGORIES.has(cat)) {
    return rules.flowerBuffer * rules.multiple;
  }
  return rules.multiple;
}

export function priceLine(
  input: PricingInput,
  rules: PricingRules
): PricedLine {
  const markup = markupForCategory(input.category ?? null, rules);
  const unitPrice = round2(input.baseCost * markup);
  const totalPrice = round2(unitPrice * input.quantity);
  return {
    description: input.description,
    category: input.category ?? null,
    quantity: input.quantity,
    baseCost: round2(input.baseCost),
    unitPrice,
    totalPrice,
  };
}

export function fuelSurcharge(
  deliveryMiles: number,
  rules: PricingRules
): PricedLine | null {
  if (!deliveryMiles || deliveryMiles <= 0 || rules.milesPerGallon <= 0) {
    return null;
  }
  const gallons = deliveryMiles / rules.milesPerGallon;
  const litres = gallons * LITRES_PER_GALLON;
  const cost = round2(litres * rules.fuelCostPerLitre);
  return {
    description: `Delivery fuel (${deliveryMiles} mi round trip)`,
    category: "delivery",
    quantity: 1,
    baseCost: cost,
    unitPrice: cost,
    totalPrice: cost,
  };
}

export function labourLine(
  hours: number,
  rules: PricingRules
): PricedLine | null {
  if (!hours || hours <= 0) return null;
  const rawCost = hours * rules.staffCostPerHour;
  const withMargin = round2(rawCost * rules.staffMargin);
  return {
    description: `Labour (${hours}h)`,
    category: "labour",
    quantity: 1,
    baseCost: round2(rawCost),
    unitPrice: withMargin,
    totalPrice: withMargin,
  };
}

export function applyPricing(
  inputs: PricingInput[],
  rules: PricingRules,
  opts: PricingOptions = {}
): PricingResult {
  const lines = inputs.map((i) => priceLine(i, rules));
  const fuel = opts.deliveryMiles ? fuelSurcharge(opts.deliveryMiles, rules) : null;
  const labour = opts.labourHours ? labourLine(opts.labourHours, rules) : null;

  const itemsSubtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
  const extras =
    (fuel?.totalPrice ?? 0) + (labour?.totalPrice ?? 0);

  return {
    lines,
    fuelLine: fuel ?? undefined,
    labourLine: labour ?? undefined,
    subtotal: round2(itemsSubtotal),
    total: round2(itemsSubtotal + extras),
    rulesApplied: { ...rules },
  };
}

/**
 * Helper for consumers that load priceSettings from the DB. The DB stores
 * numeric columns as strings, so we parse them into a strict-number shape
 * and fall back to sensible defaults if a column is missing.
 */
export function rulesFromPriceSettings(row: {
  multiple?: string | null;
  flowerBuffer?: string | null;
  fuelCostPerLitre?: string | null;
  milesPerGallon?: number | null;
  staffCostPerHour?: string | null;
  staffMargin?: string | null;
}): PricingRules {
  const toNumber = (v: string | null | undefined, fallback: number) => {
    if (v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    multiple: toNumber(row.multiple, 2.5),
    flowerBuffer: toNumber(row.flowerBuffer, 1.15),
    fuelCostPerLitre: toNumber(row.fuelCostPerLitre, 1.8),
    milesPerGallon: row.milesPerGallon ?? 45,
    staffCostPerHour: toNumber(row.staffCostPerHour, 15),
    staffMargin: toNumber(row.staffMargin, 1.5),
  };
}
