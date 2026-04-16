import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, orders } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, proposalBodySchema } from "@/lib/validators/api";
import {
  buildPaginationMeta,
  LEGACY_SAFETY_LIMIT,
  parsePagination,
} from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("proposals:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const whereClause = eq(proposals.companyId, ctx.companyId);

  try {
    if (!pagination) {
      const result = await db.query.proposals.findMany({
        where: whereClause,
        with: { order: { with: { enquiry: true } } },
        orderBy: desc(proposals.createdAt),
        limit: LEGACY_SAFETY_LIMIT,
      });
      return NextResponse.json(result);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(proposals)
      .where(whereClause);

    const data = await db.query.proposals.findMany({
      where: whereClause,
      with: { order: { with: { enquiry: true } } },
      orderBy: desc(proposals.createdAt),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(pagination, total),
    });
  } catch (error) {
    console.error(
      "Error fetching proposals:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("proposals:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, proposalBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // Ensure the parent order is in the caller's tenant.
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

    const result = await db
      .insert(proposals)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        orderId: data.orderId,
        status: data.status,
        sentAt: data.sentAt,
        content: data.content ?? null,
        subject: data.subject ?? null,
        bodyHtml: data.bodyHtml ?? null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
