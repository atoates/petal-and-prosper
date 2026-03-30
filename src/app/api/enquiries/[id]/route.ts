import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiries, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.enquiries.findFirst({
      where: and(eq(enquiries.id, params.id), eq(enquiries.companyId, COMPANY_ID)),
    });

    if (!result) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    return NextResponse.json(
      { error: "Failed to fetch enquiry" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const {
      clientName,
      clientEmail,
      clientPhone,
      eventType,
      eventDate,
      venueA,
      venueB,
      progress,
      notes,
    } = body;

    if (!clientName || !clientEmail) {
      return NextResponse.json(
        { error: "Client name and email are required" },
        { status: 400 }
      );
    }

    const result = await db
      .update(enquiries)
      .set({
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        eventType: eventType || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        venueA: venueA || null,
        venueB: venueB || null,
        progress: progress || "New",
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(enquiries.id, params.id), eq(enquiries.companyId, COMPANY_ID))
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating enquiry:", error);
    return NextResponse.json(
      { error: "Failed to update enquiry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    // First, delete all orders associated with this enquiry
    await db
      .delete(orders)
      .where(
        and(eq(orders.enquiryId, params.id), eq(orders.companyId, COMPANY_ID))
      );

    // Then delete the enquiry
    const result = await db
      .delete(enquiries)
      .where(
        and(eq(enquiries.id, params.id), eq(enquiries.companyId, COMPANY_ID))
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    return NextResponse.json(
      { error: "Failed to delete enquiry" },
      { status: 500 }
    );
  }
}
