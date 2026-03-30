import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, companies, invoiceSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    const { id } = params;

    // Fetch invoice with related data
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
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
      where: eq(companies.id, COMPANY_ID),
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch invoice settings
    const settings = await db.query.invoiceSettings.findFirst({
      where: eq(invoiceSettings.companyId, COMPANY_ID),
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
