import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, venueBodySchema } from "@/lib/validators/api";

/**
 * /api/venues
 *
 * Saved venue book used by the delivery schedule workflow. Rather
 * than inventing a dedicated `venues:*` permission set, we piggy-
 * back on the existing `delivery:*` permissions -- venues only
 * exist to speed up delivery entry, so the access control surface
 * should track delivery.
 */
export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db
      .select()
      .from(venues)
      .where(eq(venues.companyId, ctx.companyId))
      .orderBy(asc(venues.name));
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching venues:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:create");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, venueBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const [created] = await db
      .insert(venues)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId,
        name: data.name,
        address: data.address,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        notes: data.notes,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating venue:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create venue" },
      { status: 500 }
    );
  }
}
