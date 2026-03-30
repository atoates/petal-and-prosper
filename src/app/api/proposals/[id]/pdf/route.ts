import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, companies, proposalSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateProposalPdf } from "@/lib/pdf/proposal-pdf";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const COMPANY_ID = await getCompanyId();
    const { id } = params;

    // Fetch proposal with related data
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, id),
      with: {
        order: {
          with: {
            enquiry: true,
            items: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
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

    // Fetch proposal settings
    const settings = await db.query.proposalSettings.findFirst({
      where: eq(proposalSettings.companyId, COMPANY_ID),
    });

    // Calculate totals
    const items = proposal.order.items || [];
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice.toString()), 0);
    const total = subtotal;

    // Prepare data for PDF generation
    const pdfData = {
      id: proposal.id,
      company: {
        name: company.name,
        email: company.email || undefined,
        contactNo: company.contactNo || undefined,
        website: company.website || undefined,
        logoUrl: company.logoUrl || undefined,
      },
      clientName: proposal.order.enquiry?.clientName || "Unknown Client",
      clientEmail: proposal.order.enquiry?.clientEmail || "",
      eventType: proposal.order.enquiry?.eventType || undefined,
      eventDate: proposal.order.enquiry?.eventDate || undefined,
      venue: proposal.order.enquiry?.venueA || undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal,
      total,
      headerText: settings?.headerText || undefined,
      footerText: settings?.footerText || undefined,
      termsAndConditions: settings?.termsAndConditions || undefined,
    };

    // Generate PDF
    const pdf = generateProposalPdf(pdfData);
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${proposal.id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating proposal PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate proposal PDF" },
      { status: 500 }
    );
  }
}
