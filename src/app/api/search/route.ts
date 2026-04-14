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
import { eq, ilike, or, and, sql } from "drizzle-orm";
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

    // Search orders (via enquiry's clientName)
    if (!category || category === "order") {
      const orderResults = await db
        .select({
          id: orders.id,
          enquiryId: orders.enquiryId,
          status: orders.status,
        })
        .from(orders)
        .leftJoin(enquiries, eq(orders.enquiryId, enquiries.id))
        .where(
          and(
            eq(orders.companyId, ctx.companyId),
            enquiries.id
              ? ilike(enquiries.clientName, searchPattern)
              : sql`false`
          )
        )
        .limit(5);

      results.push(
        ...orderResults.map((row) => ({
          id: row.id,
          type: "order" as const,
          title: "",
          subtitle: `Order - ${row.status || ""}`,
          url: `/orders/${row.id}`,
        }))
      );

      // Fill in client names for orders
      for (const order of orderResults) {
        if (order.enquiryId) {
          const enquiryData = await db
            .select({ clientName: enquiries.clientName })
            .from(enquiries)
            .where(eq(enquiries.id, order.enquiryId))
            .limit(1);

          const result = results.find((r) => r.id === order.id);
          if (result && enquiryData.length > 0) {
            result.title = enquiryData[0].clientName;
          }
        }
      }
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

    // Search proposals (via related order/enquiry clientName)
    if (!category || category === "proposal") {
      const proposalResults = await db
        .select({
          id: proposals.id,
          orderId: proposals.orderId,
          status: proposals.status,
        })
        .from(proposals)
        .leftJoin(orders, eq(proposals.orderId, orders.id))
        .leftJoin(enquiries, eq(orders.enquiryId, enquiries.id))
        .where(
          and(
            eq(proposals.companyId, ctx.companyId),
            enquiries.id
              ? ilike(enquiries.clientName, searchPattern)
              : sql`false`
          )
        )
        .limit(5);

      results.push(
        ...proposalResults.map((row) => ({
          id: row.id,
          type: "proposal" as const,
          title: "",
          subtitle: `Proposal - ${row.status || "draft"}`,
          url: "/proposals",
        }))
      );

      // Fill in client names for proposals
      for (const proposal of proposalResults) {
        if (proposal.orderId) {
          const orderData = await db
            .select({ enquiryId: orders.enquiryId })
            .from(orders)
            .where(eq(orders.id, proposal.orderId))
            .limit(1);

          if (orderData.length > 0 && orderData[0].enquiryId) {
            const enquiryData = await db
              .select({ clientName: enquiries.clientName })
              .from(enquiries)
              .where(eq(enquiries.id, orderData[0].enquiryId))
              .limit(1);

            const result = results.find((r) => r.id === proposal.id);
            if (result && enquiryData.length > 0) {
              result.title = enquiryData[0].clientName;
            }
          }
        }
      }
    }

    // Search delivery schedules (via related order/enquiry or deliveryAddress)
    if (!category || category === "delivery") {
      const deliveryResults = await db
        .select({
          id: deliverySchedules.id,
          orderId: deliverySchedules.orderId,
          deliveryDate: deliverySchedules.deliveryDate,
          deliveryAddress: deliverySchedules.deliveryAddress,
          status: deliverySchedules.status,
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
          title: "",
          subtitle: `${formatUkDate(row.deliveryDate, undefined, "")} - ${row.status || "pending"}`,
          url: "/delivery",
        }))
      );

      // Fill in client names for deliveries
      for (const delivery of deliveryResults) {
        if (delivery.orderId) {
          const orderData = await db
            .select({ enquiryId: orders.enquiryId })
            .from(orders)
            .where(eq(orders.id, delivery.orderId))
            .limit(1);

          if (orderData.length > 0 && orderData[0].enquiryId) {
            const enquiryData = await db
              .select({ clientName: enquiries.clientName })
              .from(enquiries)
              .where(eq(enquiries.id, orderData[0].enquiryId))
              .limit(1);

            const result = results.find((r) => r.id === delivery.id);
            if (result && enquiryData.length > 0) {
              result.title = enquiryData[0].clientName;
            }
          }
        }
      }
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
