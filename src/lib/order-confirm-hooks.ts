/**
 * Post-confirmation side effects for orders.
 *
 * Every time an order transitions to `status='confirmed'`, downstream
 * artefacts should spring into existence: a production schedule for
 * the workshop, a wholesale order for each supplier. This module
 * owns those hooks so the order PUT handler stays focused on order
 * bookkeeping.
 *
 * Design rules:
 *
 *   - Each hook is idempotent. If the hook has already produced its
 *     artefact for this order (detected by a simple existence check),
 *     it returns without creating a duplicate. Flipping an order
 *     draft -> confirmed -> draft -> confirmed must not spawn three
 *     production schedules.
 *
 *   - Every hook takes the same `tx` the caller is already inside,
 *     so a confirm + autogen either fully succeeds or fully rolls
 *     back. If an autogen fails mid-transaction, the confirm fails
 *     too -- which is what we want: the whole confirm should be
 *     atomic with the artefacts it implies.
 *
 *   - Bundles: a single order line item representing a bundle (e.g.
 *     "bridal bouquet" with its flower children) becomes a single
 *     production line. We don't explode bundle children into the
 *     production schedule -- the workshop cares about the arrangement,
 *     not every stem. Wholesale is the opposite: there we DO want
 *     per-stem detail so the florist orders the right quantities.
 */

import { and, eq } from "drizzle-orm";
import type { db as dbType } from "@/lib/db";
import {
  orderItems,
  productionSchedules,
  productionScheduleItems,
  products,
  wholesaleOrders,
  wholesaleOrderItems,
} from "@/lib/db/schema";

type Tx =
  | typeof dbType
  | Parameters<Parameters<typeof dbType.transaction>[0]>[0];

interface HookContext {
  orderId: string;
  companyId: string;
  userId: string;
}

/**
 * Create the first production schedule for a confirmed order if
 * none exists. Copies order items into production_schedule_items
 * with a back-reference so the workshop can see which quote line
 * each arrangement came from.
 *
 * Returns the newly-created schedule's id, or `null` if one already
 * existed and nothing was created.
 */
export async function autoGenerateProductionSchedule(
  tx: Tx,
  ctx: HookContext
): Promise<string | null> {
  // Idempotency: if any schedule already exists for this order, do
  // nothing. We deliberately don't look at its status -- if there's
  // a schedule, the workshop already has their copy.
  const existing = await (tx as typeof dbType).query.productionSchedules.findFirst({
    where: and(
      eq(productionSchedules.orderId, ctx.orderId),
      eq(productionSchedules.companyId, ctx.companyId)
    ),
    columns: { id: true },
  });
  if (existing) return null;

  // Pull the order's current items. We query here rather than take
  // them as a parameter so callers can't accidentally hand us a stale
  // pre-update list.
  const items = await (tx as typeof dbType)
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, ctx.orderId));

  const scheduleId = crypto.randomUUID();
  await (tx as typeof dbType).insert(productionSchedules).values({
    id: scheduleId,
    orderId: ctx.orderId,
    companyId: ctx.companyId,
    status: "not_started",
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });

  if (items.length > 0) {
    await (tx as typeof dbType).insert(productionScheduleItems).values(
      items.map((item) => ({
        id: crypto.randomUUID(),
        productionScheduleId: scheduleId,
        orderItemId: item.id,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        // Carry bundle_name through as a prefix so the workshop sees
        // "Bridal bouquet -- White rose spray" instead of just the
        // child flower name. Loose items render as plain description.
        notes: item.bundleName ? `Bundle: ${item.bundleName}` : null,
      }))
    );
  }

  return scheduleId;
}

/**
 * Create wholesale orders for a confirmed order if none exist. The
 * order's line items are matched to the tenant's product library
 * (by case-insensitive name), grouped by the product's `supplier`
 * column, and written as one wholesale_order per supplier.
 *
 * Items that don't match any product (ad-hoc lines typed into the
 * quote without picking from the library) fall into an explicit
 * "Unassigned" bucket. We never silently drop an item -- the florist
 * can see exactly which lines need manual triage.
 *
 * Returns the created wholesale_order ids, or `[]` if nothing was
 * created (idempotent re-run or order with zero items).
 *
 * Limitations / follow-ups:
 *   - Matching is by description string, not FK. Adding
 *     order_items.product_id would tighten this but needs a schema
 *     migration + changes to the order editor.
 *   - Bundles aren't exploded. We rely on the order modal to already
 *     have persisted bundle children as separate order_items rows,
 *     which it does today.
 */
export async function autoGenerateWholesaleOrders(
  tx: Tx,
  ctx: HookContext
): Promise<string[]> {
  // Idempotency: don't touch an order that already has wholesale rows.
  const existing = await (tx as typeof dbType).query.wholesaleOrders.findFirst({
    where: and(
      eq(wholesaleOrders.orderId, ctx.orderId),
      eq(wholesaleOrders.companyId, ctx.companyId)
    ),
    columns: { id: true },
  });
  if (existing) return [];

  const items = await (tx as typeof dbType)
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, ctx.orderId));

  if (items.length === 0) return [];

  // Pull the tenant's products once so we match without issuing
  // O(n) lookups. Case-folded name -> { supplier, productId, cost }.
  const tenantProducts = await (tx as typeof dbType)
    .select({
      id: products.id,
      name: products.name,
      supplier: products.supplier,
      wholesalePrice: products.wholesalePrice,
    })
    .from(products)
    .where(eq(products.companyId, ctx.companyId));

  const byName = new Map<
    string,
    {
      id: string;
      supplier: string | null;
      wholesalePrice: string | null;
    }
  >();
  for (const p of tenantProducts) {
    byName.set(p.name.trim().toLowerCase(), {
      id: p.id,
      supplier: p.supplier,
      wholesalePrice: p.wholesalePrice,
    });
  }

  // Group order items by supplier. Empty/missing supplier -> "Unassigned"
  // so the florist sees every line somewhere.
  interface GroupLine {
    description: string;
    category: string | null;
    quantity: number;
    unitPrice: string | null;
    productId: string | null;
    notes: string | null;
  }
  const bySupplier = new Map<string, GroupLine[]>();

  for (const item of items) {
    const match = byName.get(item.description.trim().toLowerCase());
    const supplier =
      match?.supplier && match.supplier.trim().length > 0
        ? match.supplier
        : "Unassigned";
    const line: GroupLine = {
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      // Prefer the product's wholesale price (cost); fall back to the
      // order item's baseCost so we at least have a cost number to
      // show the florist when the library is incomplete.
      unitPrice: match?.wholesalePrice ?? item.baseCost ?? null,
      productId: match?.id ?? null,
      notes: item.bundleName ? `From bundle: ${item.bundleName}` : null,
    };
    const existing = bySupplier.get(supplier);
    if (existing) existing.push(line);
    else bySupplier.set(supplier, [line]);
  }

  // Write one wholesale_order header per supplier, then its items.
  const createdIds: string[] = [];
  for (const [supplier, lines] of bySupplier) {
    const wholesaleOrderId = crypto.randomUUID();
    await (tx as typeof dbType).insert(wholesaleOrders).values({
      id: wholesaleOrderId,
      orderId: ctx.orderId,
      companyId: ctx.companyId,
      supplier,
      status: "pending",
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    await (tx as typeof dbType).insert(wholesaleOrderItems).values(
      lines.map((line) => ({
        id: crypto.randomUUID(),
        wholesaleOrderId,
        productId: line.productId,
        description: line.description,
        category: line.category,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        notes: line.notes,
      }))
    );

    createdIds.push(wholesaleOrderId);
  }

  return createdIds;
}
