import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

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
    console.error("Error fetching orders:", error);
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

  try {
    const body = await request.json();

    const { enquiryId, status, totalPrice } = body;

    const result = await db
      .insert(orders)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        enquiryId: enquiryId || null,
        status: status || "draft",
        totalPrice: totalPrice ? parseFloat(totalPrice).toString() : null,
        version: 1,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
