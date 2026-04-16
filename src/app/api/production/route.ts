import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  productionSchedules,
  productionScheduleItems,
  orders,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, productionBodySchema } from "@/lib/validators/api";
import {
  buildPaginationMeta,
  LEGACY_SAFETY_LIMIT,
  parsePagination,
} from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("production:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const whereClause = eq(productionSchedules.companyId, ctx.companyId);

  try {
    if (!pagination) {
      const result = await db.query.productionSchedules.findMany({
        where: whereClause,
        with: {
          order: { with: { enquiry: true } },
          items: true,
        },
        orderBy: desc(productionSchedules.createdAt),
        limit: LEGACY_SAFETY_LIMIT,
      });
      return NextResponse.json(result);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(productionSchedules)
      .where(whereClause);

    const data = await db.query.productionSchedules.findMany({
      where: whereClause,
      with: {
        order: { with: { enquiry: true } },
        items: true,
      },
      orderBy: desc(productionSchedules.createdAt),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(pagination, total),
    });
  } catch (error) {
    console.error(
      "Error fetching production schedules:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch production schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("production:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, productionBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const parentOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!parentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Write the header and items atomically so a partial insert
    // can't leave a schedule without children (#16).
    const productionScheduleId = crypto.randomUUID();
    const result = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(productionSchedules)
        .values({
          id: productionScheduleId,
          companyId: ctx.companyId,
          orderId: data.orderId,
          productionDate: data.productionDate,
          assignedTo: data.assignedTo,
          // Tasks are still stored as JSON (lightweight checklist
          // with no reporting use case). Items moved to a child table.
          tasks:
            data.tasks === undefined || data.tasks === null
              ? null
              : JSON.stringify(data.tasks),
          notes: data.notes,
          status: data.status,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      if (data.items && data.items.length > 0) {
        await tx.insert(productionScheduleItems).values(
          data.items.map((item) => ({
            id: crypto.randomUUID(),
            productionScheduleId,
            orderItemId: item.orderItemId ?? null,
            description: item.description,
            category: item.category ?? null,
            quantity: item.quantity ?? 1,
            notes: item.notes ?? null,
          }))
        );
      }

      return header;
    });

    const full = await db.query.productionSchedules.findFirst({
      where: eq(productionSchedules.id, result.id),
      with: { items: true },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating production schedule:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create production schedule" },
      { status: 500 }
    );
  }
}
