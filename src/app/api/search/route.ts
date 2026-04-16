import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { db } from "@/lib/db";
import {
  enquiries,
  orders,
  contacts,
  invoices,
  proposals,
  deliverySchedules,
} from "@/lib/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { formatUkDate } from "@/lib/format-date";

interface SearchResult {
  id: string;
  type: "enquiry" | "order" | "contact" | "invoice" | "proposal" | "delivery";
  title: string;
  subtitle: string;
  url: string;
}

export async function GET(request: NextRequest) {
  // Check permissions
  const gate = await requirePermissionApi("enquiries:read");
  if ("response" in gate) return gate.response;

  const { ctx } = gate;
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const category = request.nextUrl.searchParams.get("category");

  // Return empty array if query is too short
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${q}%`;
  const results: SearchResult[] = [];

  try {
    // Search enquiries
    if (!category || category === "enquiry") {
      const enquiryResults = await db
        .select({
          id: enquiries.id,
          clientName: enquiries.clientName,
          eventType: enquiries.eventType,
          eventDate: enquiries.eventDate,
        })
        .from(enquiries)
        .where(
          and(
            eq(enquiries.companyId, ctx.companyId),
            or(
              ilike(enquiries.clientName, searchPattern),
              ilike(enquiries.clientEmail, searchPattern),
              ilike(enquiries.eventType, searchPattern)
            )
          )
        )
        .limit(5);

      results.push(
        ...enquiryResults.map((row) => ({
          id: row.id,
          type: "enquiry" as const,
          title: row.clientName,
          subtitle: `${row.eventType || "Event"}${row.eventDate ? ` - ${formatUkDate(row.eventDate)}` : ""}`,
          url: "/enquiries",
        }))
      );
    }

    // Search orders (via enquiry's clientName). We pull clientName
    // from the same join rather than re-querying enquiries per row
    // (was an N+1 before).
    if (!category || category === "order") {
      const orderResults = await db
        .select({
          id: orders.id,
          status: orders.status,
          clientName: enquiries.clientName,
        })
        .from(orders)
        .innerJoin(enquiries, eq(orders.enquiryId, enquiries.id))
        .where(
          and(
            eq(orders.companyId, ctx.companyId),
            ilike(enquiries.clientName, searchPattern)
          )
        )
        .limit(5);

      results.push(
        ...orderResults.map((row) => ({
          id: row.id,
          type: "order" as const,
          title: row.clientName,
          subtitle: `Order - ${row.status || ""}`,
          url: `/orders/${row.id}`,
        }))
      );
    }

    // Search contacts
    if (!category || category === "contact") {
      const contactResults = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          companyName: contacts.companyName,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.companyId, ctx.companyId),
            or(
              ilike(contacts.firstName, searchPattern),
              ilike(contacts.lastName, searchPattern),
              ilike(contacts.email, searchPattern),
              ilike(contacts.companyName, searchPattern)
            )
          )
        )
        .limit(5);

      results.push(
        ...contactResults.map((row) => ({
          id: row.id,
          type: "contact" as const,
          title: `${row.firstName}${row.lastName ? ` ${row.lastName}` : ""}`,
          subtitle: row.companyName || row.email || "",
          url: "/contacts",
        }))
      );
    }

    // Search invoices
    if (!category || category === "invoice") {
      const invoiceResults = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, ctx.companyId),
            ilike(invoices.invoiceNumber, searchPattern)
          )
        )
        .limit(5);

      results.push(
        ...invoiceResults.map((row) => ({
          id: row.id,
          type: "invoice" as const,
          title: row.invoiceNumber,
          subtitle: `${row.status || "draft"} - £${row.totalAmount || "0.00"}`,
          url: "/invoices",
        }))
      );
    }

    // Search proposals (via related order/enquiry clientName). One
    // join chain, no second fan-out per row.
    if (!category || category === "proposal") {
      const proposalResults = await db
        .select({
          id: proposals.id,
          status: proposals.status,
          clientName: enquiries.clientName,
        })
        .from(proposals)
        .innerJoin(orders, eq(proposals.orderId, orders.id))
        .innerJoin(enquiries, eq(orders.enquiryId, enquiries.id))
        .where(
          and(
            eq(proposals.companyId, ctx.companyId),
            ilike(enquiries.clientName, searchPattern)
          )
        )
        .limit(5);

      results.push(
        ...proposalResults.map((row) => ({
          id: row.id,
          type: "proposal" as const,
          title: row.clientName,
          subtitle: `Proposal - ${row.status || "draft"}`,
          url: "/proposals",
        }))
      );
    }

    // Search delivery schedules (via related order/enquiry or
    // deliveryAddress). We keep leftJoin here because a delivery can
    // be matched by its address alone, without a linked order.
    if (!category || category === "delivery") {
      const deliveryResults = await db
        .select({
          id: deliverySchedules.id,
          deliveryDate: deliverySchedules.deliveryDate,
          deliveryAddress: deliverySchedules.deliveryAddress,
          status: deliverySchedules.status,
          clientName: enquiries.clientName,
        })
        .from(deliverySchedules)
        .leftJoin(orders, eq(deliverySchedules.orderId, orders.id))
        .leftJoin(enquiries, eq(orders.enquiryId, enquiries.id))
        .where(
          and(
            eq(deliverySchedules.companyId, ctx.companyId),
            or(
              ilike(enquiries.clientName, searchPattern),
              ilike(deliverySchedules.deliveryAddress, searchPattern)
            )
          )
        )
        .limit(5);

      results.push(
        ...deliveryResults.map((row) => ({
          id: row.id,
          type: "delivery" as const,
          title: row.clientName ?? row.deliveryAddress ?? "",
          subtitle: `${formatUkDate(row.deliveryDate, undefined, "")} - ${row.status || "pending"}`,
          url: "/delivery",
        }))
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error(
      "Search error:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
