import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("proposals:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.proposals.findMany({
      where: eq(proposals.companyId, ctx.companyId),
      with: {
        order: true,
      },
      orderBy: desc(proposals.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching proposals:", error);
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

  try {
    const body = await request.json();

    const { orderId, status, sentAt, content } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Ensure the parent order is in the caller's tenant.
    const parentOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId)),
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
        orderId,
        status: status || "draft",
        sentAt: sentAt ? new Date(sentAt) : null,
        content: content || null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
