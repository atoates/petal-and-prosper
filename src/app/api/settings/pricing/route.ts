import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const result = await db.query.priceSettings.findFirst({
      where: eq(priceSettings.companyId, COMPANY_ID),
    });

    if (!result) {
      return NextResponse.json(
        { error: "Price settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching price settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch price settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const {
      multiple,
      flowerBuffer,
      fuelCostPerLitre,
      milesPerGallon,
      staffCostPerHour,
      staffMargin,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (multiple !== undefined) {
      updateData.multiple = parseFloat(multiple).toString();
    }
    if (flowerBuffer !== undefined) {
      updateData.flowerBuffer = parseFloat(flowerBuffer).toString();
    }
    if (fuelCostPerLitre !== undefined) {
      updateData.fuelCostPerLitre = parseFloat(fuelCostPerLitre).toString();
    }
    if (milesPerGallon !== undefined) {
      updateData.milesPerGallon = parseInt(milesPerGallon);
    }
    if (staffCostPerHour !== undefined) {
      updateData.staffCostPerHour = parseFloat(staffCostPerHour).toString();
    }
    if (staffMargin !== undefined) {
      updateData.staffMargin = parseFloat(staffMargin).toString();
    }

    updateData.updatedAt = new Date();

    const result = await db
      .update(priceSettings)
      .set(updateData)
      .where(eq(priceSettings.companyId, COMPANY_ID))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Price settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating price settings:", error);
    return NextResponse.json(
      { error: "Failed to update price settings" },
      { status: 500 }
    );
  }
}
