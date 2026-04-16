import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiries } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull, desc, ilike, or, sql } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, enquiryBodySchema } from "@/lib/validators/api";
import {
  buildPaginationMeta,
  LEGACY_SAFETY_LIMIT,
  parsePagination,
} from "@/lib/pagination";

// Query params:
//   view=active (default) | archived | all
//   page, limit -- optional; when either is provided we return
//                  { data, pagination } instead of a bare array
//   q           -- optional case-insensitive substring match on
//                  clientName / clientEmail / eventType
export async function GET(request: NextRequest) {
  const gate = await requirePermissionApi("enquiries:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "active";
  const q = searchParams.get("q")?.trim() ?? "";
  const pagination = parsePagination(searchParams);

  try {
    const archiveClause =
      view === "archived"
        ? isNotNull(enquiries.archivedAt)
        : view === "all"
          ? undefined
          : isNull(enquiries.archivedAt);

    const searchClause = q
      ? or(
          ilike(enquiries.clientName, `%${q}%`),
          ilike(enquiries.clientEmail, `%${q}%`),
          ilike(enquiries.eventType, `%${q}%`)
        )
      : undefined;

    const whereClause = and(
      eq(enquiries.companyId, ctx.companyId),
      archiveClause,
      searchClause
    );

    if (!pagination) {
      // Legacy bare-array response, with a safety cap so a tenant
      // that has never upgraded its client still can't accidentally
      // pull 100k rows in a single fetch.
      const result = await db.query.enquiries.findMany({
        where: whereClause,
        orderBy: desc(enquiries.createdAt),
        limit: LEGACY_SAFETY_LIMIT,
      });
      return NextResponse.json(result);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(whereClause);

    const data = await db.query.enquiries.findMany({
      where: whereClause,
      orderBy: desc(enquiries.createdAt),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(pagination, total),
    });
  } catch (error) {
    console.error(
      "Error fetching enquiries:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch enquiries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("enquiries:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, enquiryBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const result = await db
      .insert(enquiries)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        contactId: data.contactId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        enquiryType: data.enquiryType,
        status: data.status,
        progress: data.progress,
        eventType: data.eventType,
        eventDate: data.eventDate,
        enquiryDate: data.enquiryDate,
        colourScheme: data.colourScheme,
        guestNumbers: data.guestNumbers,
        budget: data.budget,
        venueA: data.venueA,
        venueATown: data.venueATown,
        venueAPhone: data.venueAPhone,
        venueAContact: data.venueAContact,
        venueB: data.venueB,
        venueBTown: data.venueBTown,
        venueBPhone: data.venueBPhone,
        venueBContact: data.venueBContact,
        plannerName: data.plannerName,
        plannerCompany: data.plannerCompany,
        plannerPhone: data.plannerPhone,
        plannerEmail: data.plannerEmail,
        notes: data.notes,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error(
      "Error creating enquiry:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create enquiry" },
      { status: 500 }
    );
  }
}
