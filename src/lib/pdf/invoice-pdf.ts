import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatUkDate } from "@/lib/format-date";

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
  vatNumber?: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  company: CompanyInfo;
  clientName: string;
  clientEmail: string;
  eventType?: string;
  eventDate?: Date | string;
  venue?: string;
  items: OrderItem[];
  subtotal: number;
  // VAT rate is a percentage (20 = 20 %). vatAmount is the actual
  // money value of VAT applied to the subtotal. total is subtotal
  // + vatAmount (or whatever override was persisted on the row).
  vatRate?: number;
  vatAmount?: number;
  total: number;
  amountPaid?: number;
  paymentMethod?: string;
  dueDate?: Date | string;
  paidDate?: Date | string;
  status: string;
  paymentTerms?: string;
  bankDetails?: string;
  notes?: string;
}

const PRIMARY_COLOUR = "#1B4332";

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
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
  pdf.text("INVOICE", pageWidth - margin - 40, 25);

  currentY = 55;

  // Invoice details
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Invoice Number: ${data.invoiceNumber}`, margin, currentY);
  currentY += 6;

  if (data.company.vatNumber) {
    pdf.text(`VAT Number: ${data.company.vatNumber}`, margin, currentY);
    currentY += 6;
  }

  pdf.text(`Date: ${formatUkDate(new Date())}`, margin, currentY);
  currentY += 6;

  if (data.dueDate) {
    pdf.text(`Due Date: ${formatUkDate(data.dueDate)}`, margin, currentY);
    currentY += 6;
  }

  // Status badge
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  let statusColor: [number, number, number] = [200, 200, 200];
  if (data.status === "paid") {
    statusColor = [27, 67, 50];
  } else if (data.status === "overdue") {
    statusColor = [220, 38, 38];
  }
  pdf.setTextColor(...statusColor);
  pdf.text(`Status: ${data.status.toUpperCase()}`, pageWidth - margin - 50, currentY - 6);

  currentY += 8;

  // Client details section
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(27, 67, 50);
  pdf.text("Bill To:", margin, currentY);
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
  });

  currentY = (pdf as any).lastAutoTable.finalY + 10;

  // Totals section -- subtotal, VAT (if applicable), total, and any
  // recorded payment. VAT line only appears when there is actually a
  // non-zero rate so VAT-exempt tenants don't see an "0 VAT" row.
  const totalX = pageWidth - margin - 50;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Subtotal:", totalX, currentY);
  pdf.text(`GBP ${data.subtotal.toFixed(2)}`, pageWidth - margin, currentY, {
    align: "right",
  });
  currentY += 7;

  if (data.vatRate && data.vatRate > 0) {
    const vatLabel = `VAT (${data.vatRate.toFixed(2)}%):`;
    const vatValue = (data.vatAmount ?? 0).toFixed(2);
    pdf.text(vatLabel, totalX, currentY);
    pdf.text(`GBP ${vatValue}`, pageWidth - margin, currentY, {
      align: "right",
    });
    currentY += 7;
  }

  pdf.setFontSize(12);
  pdf.setTextColor(27, 67, 50);
  pdf.text("TOTAL:", totalX, currentY);
  pdf.text(`GBP ${data.total.toFixed(2)}`, pageWidth - margin, currentY, {
    align: "right",
  });
  currentY += 7;

  if (data.amountPaid && data.amountPaid > 0) {
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Paid:", totalX, currentY);
    pdf.text(
      `GBP ${data.amountPaid.toFixed(2)}`,
      pageWidth - margin,
      currentY,
      { align: "right" }
    );
    currentY += 6;
    const outstanding = Math.max(0, data.total - data.amountPaid);
    if (outstanding > 0) {
      pdf.text("Outstanding:", totalX, currentY);
      pdf.text(
        `GBP ${outstanding.toFixed(2)}`,
        pageWidth - margin,
        currentY,
        { align: "right" }
      );
      currentY += 6;
    }
    if (data.paymentMethod) {
      pdf.setFontSize(9);
      pdf.text(
        `Method: ${data.paymentMethod}`,
        totalX,
        currentY
      );
      currentY += 6;
    }
  }

  currentY += 15;

  // Payment terms
  if (data.paymentTerms) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Payment Terms", margin, currentY);
    currentY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const splitTerms = pdf.splitTextToSize(data.paymentTerms, pageWidth - 2 * margin);
    pdf.text(splitTerms, margin, currentY);
    currentY += splitTerms.length * 4 + 8;
  }

  // Bank details
  if (data.bankDetails) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(27, 67, 50);
    pdf.text("Bank Details", margin, currentY);
    currentY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    const splitBank = pdf.splitTextToSize(data.bankDetails, pageWidth - 2 * margin);
    pdf.text(splitBank, margin, currentY);
    currentY += splitBank.length * 4 + 8;
  }

  // Notes
  if (data.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(27, 67, 50);
    pdf.text("Notes", margin, currentY);
    currentY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    const splitNotes = pdf.splitTextToSize(data.notes, pageWidth - 2 * margin);
    pdf.text(splitNotes, margin, currentY);
  }

  return pdf;
}
