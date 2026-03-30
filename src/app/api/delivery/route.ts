import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverySchedules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.deliverySchedules.findMany({
      where: eq(deliverySchedules.companyId, COMPANY_ID),
      with: {
        order: true,
      },
      orderBy: desc(deliverySchedules.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching delivery schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const { orderId, eventDate, deliveryAddress, items, notes, status } =
      body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(deliverySchedules)
      .values({
        id: crypto.randomUUID(),
        companyId: COMPANY_ID,
        orderId,
        eventDate: eventDate ? new Date(eventDate) : null,
        deliveryAddress: deliveryAddress || null,
        items: items ? JSON.stringify(items) : null,
        notes: notes || null,
        status: status || "pending",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating delivery schedule:", error);
    return NextResponse.json(
      { error: "Failed to create delivery schedule" },
      { status: 500 }
    );
  }
}
