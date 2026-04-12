import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import {
  parseJsonBody,
  addressBodySchema,
} from "@/lib/validators/api";

// Addresses are part of the company profile, so both reading and
// mutating them reuses the existing company:read / company:update
// permissions rather than inventing a new addresses:* namespace.
// Closes #20 of Process-Flow-Review-2026-04-11.md (addresses were
// display-only in the UI; the underlying table is now a proper CRUD
// resource).

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("company:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const rows = await db.query.addresses.findMany({
      where: eq(addresses.companyId, ctx.companyId),
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error(
      "Error fetching addresses:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("company:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, addressBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const [created] = await db
      .insert(addresses)
      .values({
        id: randomUUID(),
        companyId: ctx.companyId,
        type: data.type,
        buildingName: data.buildingName,
        street: data.street,
        town: data.town,
        city: data.city,
        postcode: data.postcode,
        country: data.country ?? "United Kingdom",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating address:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
