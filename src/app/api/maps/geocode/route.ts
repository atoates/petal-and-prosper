import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { geocodeAddress } from "@/lib/google-maps";
import { parseJsonBody } from "@/lib/validators/api";
import { z } from "zod";

const geocodeBodySchema = z.object({
  address: z.string().min(1, "Address is required"),
});

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;

  const parsed = await parseJsonBody(request, geocodeBodySchema);
  if (!parsed.success) return parsed.response;
  const { address } = parsed.data;

  try {
    const result = await geocodeAddress(address);

    if (!result) {
      return NextResponse.json(
        { error: "Could not geocode address" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error geocoding address:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
