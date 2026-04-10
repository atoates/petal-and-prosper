import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, companies, invoiceSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { requirePermissionApi } from "@/lib/auth/permissions-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("invoices:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const { id } = params;

    // Scope the fetch to the caller's tenant -- previously this was keyed on
    // id alone, letting any authenticated caller pull another tenant's PDF.
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.companyId, ctx.companyId)),
      with: {
        order: {
          with: {
            enquiry: true,
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch company info
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, ctx.companyId),
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch invoice settings
    const settings = await db.query.invoiceSettings.findFirst({
      where: eq(invoiceSettings.companyId, ctx.companyId),
    });

    // Calculate totals
    const items = invoice.order.items || [];
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0);
    const total = subtotal;

    // Prepare data for PDF generation
    const pdfData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      company: {
        name: company.name,
        email: company.email || undefined,
        contactNo: company.contactNo || undefined,
        website: company.website || undefined,
        logoUrl: company.logoUrl || undefined,
      },
      clientName: invoice.order.enquiry?.clientName || "Unknown Client",
      clientEmail: invoice.order.enquiry?.clientEmail || "",
      eventType: invoice.order.enquiry?.eventType || undefined,
      eventDate: invoice.order.enquiry?.eventDate || undefined,
      venue: invoice.order.enquiry?.venueA || undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal,
      total,
      dueDate: invoice.dueDate || undefined,
      paidDate: invoice.paidAt || undefined,
      status: invoice.status || "pending",
      paymentTerms: settings?.paymentTerms || undefined,
      bankDetails: settings?.bankDetails || undefined,
      notes: settings?.notes || undefined,
    };

    // Generate PDF
    const pdf = generateInvoicePdf(pdfData);
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}
