import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import {
  parseJsonBody,
  addressBodySchema,
} from "@/lib/validators/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("company:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, addressBodySchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const [updated] = await db
      .update(addresses)
      .set({
        type: data.type,
        buildingName: data.buildingName,
        street: data.street,
        town: data.town,
        city: data.city,
        postcode: data.postcode,
        country: data.country ?? "United Kingdom",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.id, params.id),
          eq(addresses.companyId, ctx.companyId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating address:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("company:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const deleted = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, params.id),
          eq(addresses.companyId, ctx.companyId)
        )
      )
      .returning({ id: addresses.id });

    if (!deleted.length) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error deleting address:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
