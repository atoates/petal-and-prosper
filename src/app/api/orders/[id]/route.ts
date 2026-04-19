import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, enquiries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, orderUpdateSchema } from "@/lib/validators/api";
import {
  loadRules,
  priceItemForCompany,
  recomputeOrderTotal,
} from "@/lib/pricing/server";
import {
  autoGenerateProductionSchedule,
  autoGenerateWholesaleOrders,
} from "@/lib/order-confirm-hooks";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      with: {
        enquiry: true,
        items: true,
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, orderUpdateSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // If swapping the linked enquiry, re-verify tenant ownership.
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

    // Pricing rules are loaded once before the transaction so that
    // every item update/insert goes through the same snapshot of the
    // tenant's markup config, rather than one item racing a concurrent
    // Pricing page save.
    const rules = await loadRules(ctx.companyId);

    const updated = await db.transaction(async (tx) => {
      // Read the pre-update status so we can fire the confirm hooks
      // only on a true transition into 'confirmed', not on every save
      // while already-confirmed. Also serves as a tenant-scoped
      // existence check before we mutate anything.
      const previous = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, params.id),
          eq(orders.companyId, ctx.companyId)
        ),
        columns: { id: true, status: true },
      });
      if (!previous) return null;

      // Update the order, scoped to tenant
      const updateResult = await tx
        .update(orders)
        .set({
          enquiryId: data.enquiryId,
          status: data.status,
          version: data.version ?? 1,
          totalPrice: data.totalPrice,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(
          and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId))
        )
        .returning();

      if (updateResult.length === 0) {
        return null;
      }

      // Update order items if provided
      if (data.items && Array.isArray(data.items)) {
        const incoming = data.items;
        const newItemIds = incoming
          .filter(
            (item): item is typeof item & { id: string } =>
              !!item.id && !item.id.startsWith("new-")
          )
          .map((item) => item.id);

        const existingItems = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, params.id));

        const itemsToDelete = existingItems.filter(
          (item) => !newItemIds.includes(item.id)
        );

        for (const item of itemsToDelete) {
          await tx
            .delete(orderItems)
            .where(
              and(eq(orderItems.id, item.id), eq(orderItems.orderId, params.id))
            );
        }

        for (const item of incoming) {
          const priced = priceItemForCompany(
            {
              description: item.description,
              category: item.category,
              quantity: item.quantity,
              baseCost: item.baseCost,
              unitPrice: item.unitPrice,
            },
            rules
          );
          if (item.id && !item.id.startsWith("new-")) {
            await tx
              .update(orderItems)
              .set({
                description: priced.description,
                category: priced.category,
                quantity: priced.quantity,
                baseCost: priced.baseCost,
                unitPrice: priced.unitPrice,
                totalPrice: priced.totalPrice,
                imageUrl: item.imageUrl ?? null,
                bundleId: item.bundleId ?? null,
                bundleName: item.bundleName ?? null,
                baseQuantity: item.baseQuantity ?? null,
                updatedBy: ctx.userId,
              })
              .where(
                and(
                  eq(orderItems.id, item.id),
                  eq(orderItems.orderId, params.id)
                )
              );
          } else {
            await tx.insert(orderItems).values({
              id: crypto.randomUUID(),
              orderId: params.id,
              description: priced.description,
              category: priced.category,
              quantity: priced.quantity,
              baseCost: priced.baseCost,
              unitPrice: priced.unitPrice,
              totalPrice: priced.totalPrice,
              imageUrl: item.imageUrl ?? null,
              bundleId: item.bundleId ?? null,
              bundleName: item.bundleName ?? null,
              baseQuantity: item.baseQuantity ?? null,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            });
          }
        }

        // Any time the items change, recompute the order total from
        // the authoritative set of items rather than trusting the
        // totalPrice in the request body.
        await recomputeOrderTotal(tx, params.id, ctx.companyId);
      }

      // Fire confirmation hooks on the draft -> confirmed transition.
      // We run them inside the same transaction so the whole confirm
      // (status flip + downstream artefacts) is atomic.
      if (
        data.status === "confirmed" &&
        previous.status !== "confirmed"
      ) {
        const hookCtx = {
          orderId: params.id,
          companyId: ctx.companyId,
          userId: ctx.userId,
        };
        await autoGenerateProductionSchedule(tx, hookCtx);
        await autoGenerateWholesaleOrders(tx, hookCtx);
      }

      return tx.query.orders.findFirst({
        where: and(
          eq(orders.id, params.id),
          eq(orders.companyId, ctx.companyId)
        ),
        with: {
          enquiry: true,
          items: true,
        },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("orders:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    // Verify order belongs to this tenant before touching items
    const existing = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId)),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.orderId, params.id));
      await tx
        .delete(orders)
        .where(
          and(eq(orders.id, params.id), eq(orders.companyId, ctx.companyId))
        );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error deleting order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
