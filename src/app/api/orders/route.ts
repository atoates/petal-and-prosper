import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, enquiries } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, orderCreateSchema } from "@/lib/validators/api";

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
    console.error(
      "Error fetching orders:",
      error instanceof Error ? error.message : "unknown"
    );
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

  const parsed = await parseJsonBody(request, orderCreateSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // If an enquiry is referenced, it must belong to the caller's tenant.
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

    const result = await db
      .insert(orders)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        enquiryId: data.enquiryId,
        status: data.status,
        totalPrice: data.totalPrice,
        version: 1,
      })
      .returning();

    // Auto-advance the parent enquiry's progress to "Order" whenever
    // an order is created from it. "Order" is the terminal state in
    // the enquiry funnel, so overwriting unconditionally is correct:
    // nothing is further along than "an order exists". Tenant
    // scoping is already guaranteed by the check above.
    if (data.enquiryId) {
      await db
        .update(enquiries)
        .set({ progress: "Order", updatedAt: new Date() })
        .where(
          and(
            eq(enquiries.id, data.enquiryId),
            eq(enquiries.companyId, ctx.companyId)
          )
        );
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
