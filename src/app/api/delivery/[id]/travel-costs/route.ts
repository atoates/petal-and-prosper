import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverySchedules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody } from "@/lib/validators/api";
import { z } from "zod";

const travelCostsPutSchema = z.object({
  // Setup/delivery leg
  setupVehicles: z.number().int().min(0),
  setupDistanceMiles: z.number().min(0),
  setupStaff: z.number().int().min(0),
  setupTravelTimeMins: z.number().int().min(0),
  setupTimeOnSiteMins: z.number().int().min(0),
  setupCostCalculated: z.string(),
  setupCostManual: z.string().nullable(),
  useManualSetupCost: z.boolean(),

  // Collection/teardown leg
  collectionVehicles: z.number().int().min(0),
  collectionDistanceMiles: z.number().min(0),
  collectionStaff: z.number().int().min(0),
  collectionTravelTimeMins: z.number().int().min(0),
  collectionTimeOnSiteMins: z.number().int().min(0),
  collectionCostCalculated: z.string(),
  collectionCostManual: z.string().nullable(),
  useManualCollectionCost: z.boolean(),
});

/**
 * GET /api/delivery/[id]/travel-costs
 *
 * Fetches the travel cost fields for a delivery schedule.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const schedule = await db.query.deliverySchedules.findFirst({
      where: and(
        eq(deliverySchedules.id, params.id),
        eq(deliverySchedules.companyId, ctx.companyId)
      ),
      columns: {
        setupVehicles: true,
        setupDistanceMiles: true,
        setupStaff: true,
        setupTravelTimeMins: true,
        setupTimeOnSiteMins: true,
        setupCostCalculated: true,
        setupCostManual: true,
        useManualSetupCost: true,
        collectionVehicles: true,
        collectionDistanceMiles: true,
        collectionStaff: true,
        collectionTravelTimeMins: true,
        collectionTimeOnSiteMins: true,
        collectionCostCalculated: true,
        collectionCostManual: true,
        useManualCollectionCost: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Delivery schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(
      "Error fetching travel costs:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch travel costs" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/delivery/[id]/travel-costs
 *
 * Updates the travel cost fields for a delivery schedule.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("delivery:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, travelCostsPutSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // Verify the delivery schedule exists and belongs to the company
    const existing = await db.query.deliverySchedules.findFirst({
      where: and(
        eq(deliverySchedules.id, params.id),
        eq(deliverySchedules.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Delivery schedule not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(deliverySchedules)
      .set({
        setupVehicles: data.setupVehicles,
        setupDistanceMiles: String(data.setupDistanceMiles),
        setupStaff: data.setupStaff,
        setupTravelTimeMins: data.setupTravelTimeMins,
        setupTimeOnSiteMins: data.setupTimeOnSiteMins,
        setupCostCalculated: data.setupCostCalculated,
        setupCostManual: data.setupCostManual,
        useManualSetupCost: data.useManualSetupCost,
        collectionVehicles: data.collectionVehicles,
        collectionDistanceMiles: String(data.collectionDistanceMiles),
        collectionStaff: data.collectionStaff,
        collectionTravelTimeMins: data.collectionTravelTimeMins,
        collectionTimeOnSiteMins: data.collectionTimeOnSiteMins,
        collectionCostCalculated: data.collectionCostCalculated,
        collectionCostManual: data.collectionCostManual,
        useManualCollectionCost: data.useManualCollectionCost,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(deliverySchedules.id, params.id),
          eq(deliverySchedules.companyId, ctx.companyId)
        )
      )
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating travel costs:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update travel costs" },
      { status: 500 }
    );
  }
}
