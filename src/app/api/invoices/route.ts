import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.invoices.findMany({
      where: eq(invoices.companyId, COMPANY_ID),
      with: {
        order: true,
      },
      orderBy: desc(invoices.createdAt),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const { orderId, invoiceNumber, status, totalAmount, dueDate, paidAt } =
      body;

    if (!orderId || !invoiceNumber || !totalAmount) {
      return NextResponse.json(
        {
          error: "Order ID, invoice number, and total amount are required",
        },
        { status: 400 }
      );
    }

    const result = await db
      .insert(invoices)
      .values({
        id: crypto.randomUUID(),
        companyId: COMPANY_ID,
        orderId,
        invoiceNumber,
        status: status || "draft",
        totalAmount: parseFloat(totalAmount).toString(),
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
