import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatUkDate } from "@/lib/format-date";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

interface OrderItem {
  description: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
}

interface CompanyInfo {
  name: string;
  email?: string;
  contactNo?: string;
  website?: string;
  logoUrl?: string;
}

interface ProposalData {
  id: string;
  company: CompanyInfo;
  clientName: string;
  clientEmail: string;
  eventType?: string;
  eventDate?: Date | string;
  venue?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  headerText?: string;
  footerText?: string;
  termsAndConditions?: string;
}

const PRIMARY_COLOUR = "#1B4332";

export function generateProposalPdf(data: ProposalData): jsPDF {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Header with company info
  pdf.setFillColor(27, 67, 50);
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(data.company.name, margin, 25);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("PROPOSAL", pageWidth - margin - 40, 25);

  currentY = 55;

  // Proposal ID and date
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Proposal ID: ${data.id.slice(0, 8)}`, margin, currentY);
  pdf.text(`Date: ${formatUkDate(new Date())}`, pageWidth - margin - 50, currentY);
  currentY += 10;

  // Client details section
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(27, 67, 50);
  pdf.text("Client Details", margin, currentY);
  currentY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Name: ${data.clientName}`, margin, currentY);
  currentY += 6;
  pdf.text(`Email: ${data.clientEmail}`, margin, currentY);
  currentY += 6;

  if (data.eventType) {
    pdf.text(`Event Type: ${data.eventType}`, margin, currentY);
    currentY += 6;
  }

  if (data.eventDate) {
    pdf.text(`Event Date: ${formatUkDate(data.eventDate)}`, margin, currentY);
    currentY += 6;
  }

  if (data.venue) {
    pdf.text(`Venue: ${data.venue}`, margin, currentY);
    currentY += 6;
  }

  currentY += 5;

  // Items table
  const tableData = data.items.map((item) => [
    item.description,
    item.quantity.toString(),
    `GBP ${parseFloat(item.unitPrice.toString()).toFixed(2)}`,
    `GBP ${parseFloat(item.totalPrice.toString()).toFixed(2)}`,
  ]);

  autoTable(pdf, {
    startY: currentY,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: PRIMARY_COLOUR,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // This is handled by the final position update
    },
  });

  currentY = (pdf as JsPDFWithAutoTable).lastAutoTable?.finalY ?? 0 + 10;

  // Totals section
  const totalX = pageWidth - margin - 50;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Subtotal:", totalX, currentY);
  pdf.text(`GBP ${data.subtotal.toFixed(2)}`, pageWidth - margin, currentY, {
    align: "right",
  });
  currentY += 7;

  pdf.setFontSize(12);
  pdf.setTextColor(27, 67, 50);
  pdf.text("TOTAL:", totalX, currentY);
  pdf.text(`GBP ${data.total.toFixed(2)}`, pageWidth - margin, currentY, {
    align: "right",
  });

  currentY += 15;

  // Terms and conditions
  if (data.termsAndConditions) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Terms and Conditions", margin, currentY);
    currentY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const splitTerms = pdf.splitTextToSize(data.termsAndConditions, pageWidth - 2 * margin);
    pdf.text(splitTerms, margin, currentY);
  }

  // Footer
  if (data.footerText) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const footerY = pageHeight - 10;
    const splitFooter = pdf.splitTextToSize(data.footerText, pageWidth - 2 * margin);
    pdf.text(splitFooter, margin, footerY);
  }

  return pdf;
}
