import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  enquiries,
  orders,
  proposals,
  invoices,
  deliverySchedules,
  productionSchedules,
  priceSettings,
  companies,
  users,
} from "@/lib/db/schema";
import { and, eq, gte, lte, desc, inArray } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth/permissions-api";

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDayUtc(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  );
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export async function GET(_request: NextRequest) {
  // Any authenticated user in a tenant can see the dashboard -- widgets
  // filter by their own company and RBAC on individual actions still
  // gates destructive/edit operations downstream.
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const now = new Date();
    const todayStart = startOfDayUtc(now);
    const todayEnd = endOfDayUtc(now);
    const weekEnd = endOfDayUtc(addDays(now, 7));

    const [
      todaysDeliveries,
      todaysProduction,
      thisWeekProduction,
      thisWeekDeliveries,
      pendingProposals,
      newEnquiries,
      overdueInvoices,
      draftOrders,
      company,
      priceCfg,
      teamMembers,
      anyEnquiry,
    ] = await Promise.all([
      db.query.deliverySchedules.findMany({
        where: and(
          eq(deliverySchedules.companyId, ctx.companyId),
          gte(deliverySchedules.eventDate, todayStart),
          lte(deliverySchedules.eventDate, todayEnd)
        ),
        with: { order: { with: { enquiry: true } } },
      }),
      db.query.productionSchedules.findMany({
        where: and(
          eq(productionSchedules.companyId, ctx.companyId),
          gte(productionSchedules.eventDate, todayStart),
          lte(productionSchedules.eventDate, todayEnd)
        ),
        with: { order: { with: { enquiry: true } } },
      }),
      db.query.productionSchedules.findMany({
        where: and(
          eq(productionSchedules.companyId, ctx.companyId),
          gte(productionSchedules.eventDate, todayStart),
          lte(productionSchedules.eventDate, weekEnd)
        ),
        with: { order: { with: { enquiry: true } } },
      }),
      db.query.deliverySchedules.findMany({
        where: and(
          eq(deliverySchedules.companyId, ctx.companyId),
          gte(deliverySchedules.eventDate, todayStart),
          lte(deliverySchedules.eventDate, weekEnd)
        ),
        with: { order: { with: { enquiry: true } } },
      }),
      db.query.proposals.findMany({
        where: and(
          eq(proposals.companyId, ctx.companyId),
          inArray(proposals.status, ["draft", "sent"])
        ),
        with: { order: { with: { enquiry: true } } },
        orderBy: desc(proposals.createdAt),
        limit: 10,
      }),
      db.query.enquiries.findMany({
        where: and(
          eq(enquiries.companyId, ctx.companyId),
          inArray(enquiries.progress, ["New", "TBD"])
        ),
        orderBy: desc(enquiries.createdAt),
        limit: 10,
      }),
      db.query.invoices.findMany({
        where: and(
          eq(invoices.companyId, ctx.companyId),
          inArray(invoices.status, ["sent", "overdue"])
        ),
        orderBy: desc(invoices.dueDate),
        limit: 10,
      }),
      db.query.orders.findMany({
        where: and(
          eq(orders.companyId, ctx.companyId),
          eq(orders.status, "draft")
        ),
        with: { enquiry: true },
        orderBy: desc(orders.createdAt),
        limit: 10,
      }),
      db.query.companies.findFirst({
        where: eq(companies.id, ctx.companyId),
      }),
      db.query.priceSettings.findFirst({
        where: eq(priceSettings.companyId, ctx.companyId),
      }),
      db.query.users.findMany({
        where: eq(users.companyId, ctx.companyId),
      }),
      db.query.enquiries.findFirst({
        where: eq(enquiries.companyId, ctx.companyId),
      }),
    ]);

    const overdueFiltered = overdueInvoices.filter((inv) => {
      if (inv.status === "overdue") return true;
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < todayStart;
    });

    return NextResponse.json({
      today: {
        deliveries: todaysDeliveries.map((d) => ({
          id: d.id,
          orderId: d.orderId,
          status: d.status,
          clientName: d.order?.enquiry?.clientName || "Unknown",
          venue: d.order?.enquiry?.venueA || null,
          eventDate: d.eventDate,
        })),
        production: todaysProduction.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          status: p.status,
          clientName: p.order?.enquiry?.clientName || "Unknown",
          eventDate: p.eventDate,
        })),
      },
      thisWeek: {
        production: thisWeekProduction.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          status: p.status,
          clientName: p.order?.enquiry?.clientName || "Unknown",
          eventDate: p.eventDate,
        })),
        deliveries: thisWeekDeliveries.map((d) => ({
          id: d.id,
          orderId: d.orderId,
          status: d.status,
          clientName: d.order?.enquiry?.clientName || "Unknown",
          eventDate: d.eventDate,
        })),
      },
      needsAttention: {
        newEnquiries: newEnquiries.map((e) => ({
          id: e.id,
          clientName: e.clientName,
          eventType: e.eventType,
          eventDate: e.eventDate,
          progress: e.progress,
          createdAt: e.createdAt,
        })),
        pendingProposals: pendingProposals.map((p) => ({
          id: p.id,
          status: p.status,
          clientName: p.order?.enquiry?.clientName || "Unknown",
          eventDate: p.order?.enquiry?.eventDate || null,
          createdAt: p.createdAt,
        })),
        overdueInvoices: overdueFiltered.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          dueDate: inv.dueDate,
          status: inv.status,
        })),
        draftOrders: draftOrders.map((o) => ({
          id: o.id,
          clientName: o.enquiry?.clientName || "Unknown",
          createdAt: o.createdAt,
        })),
      },
      onboarding: {
        hasLogo: Boolean(company?.logoUrl),
        hasPricingConfigured: Boolean(
          priceCfg &&
            priceCfg.multiple &&
            priceCfg.fuelCostPerLitre &&
            priceCfg.staffCostPerHour
        ),
        hasTeamMember: teamMembers.length > 1,
        hasEnquiry: Boolean(anyEnquiry),
      },
    });
  } catch (error) {
    console.error(
      "Error fetching dashboard:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
