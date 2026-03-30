import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.proposals.findMany({
      where: eq(proposals.companyId, COMPANY_ID),
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
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const { orderId, status, sentAt, content } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(proposals)
      .values({
        id: crypto.randomUUID(),
        companyId: COMPANY_ID,
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
