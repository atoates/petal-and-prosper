import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import {
  parseJsonBody,
  priceSettingsUpdateSchema,
} from "@/lib/validators/api";

export async function GET(_request: NextRequest) {
  const gate = await requirePermissionApi("pricing:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const result = await db.query.priceSettings.findFirst({
      where: eq(priceSettings.companyId, ctx.companyId),
    });

    if (!result) {
      return NextResponse.json(
        { error: "Price settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching price settings:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch price settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requirePermissionApi("pricing:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, priceSettingsUpdateSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // Only include fields the caller actually sent. Using undefined for
    // a field tells Drizzle to skip it in the UPDATE.
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.multiple !== undefined && data.multiple !== null) {
      updateData.multiple = data.multiple;
    }
    if (data.flowerBuffer !== undefined && data.flowerBuffer !== null) {
      updateData.flowerBuffer = data.flowerBuffer;
    }
    if (
      data.fuelCostPerLitre !== undefined &&
      data.fuelCostPerLitre !== null
    ) {
      updateData.fuelCostPerLitre = data.fuelCostPerLitre;
    }
    if (data.milesPerGallon !== undefined && data.milesPerGallon !== null) {
      updateData.milesPerGallon = data.milesPerGallon;
    }
    if (
      data.staffCostPerHour !== undefined &&
      data.staffCostPerHour !== null
    ) {
      updateData.staffCostPerHour = data.staffCostPerHour;
    }
    if (data.staffMargin !== undefined && data.staffMargin !== null) {
      updateData.staffMargin = data.staffMargin;
    }

    const result = await db
      .update(priceSettings)
      .set(updateData)
      .where(eq(priceSettings.companyId, ctx.companyId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Price settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(
      "Error updating price settings:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update price settings" },
      { status: 500 }
    );
  }
}
