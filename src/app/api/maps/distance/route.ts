import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { getDistance } from "@/lib/google-maps";
import { parseJsonBody } from "@/lib/validators/api";
import { z } from "zod";

const distanceBodySchema = z.object({
  origin: z.string().min(1, "Origin address is required"),
  destination: z.string().min(1, "Destination address is required"),
});

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;

  const parsed = await parseJsonBody(request, distanceBodySchema);
  if (!parsed.success) return parsed.response;
  const { origin, destination } = parsed.data;

  try {
    const result = await getDistance(origin, destination);

    if (!result) {
      return NextResponse.json(
        { error: "Could not calculate distance between addresses" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error calculating distance:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to calculate distance" },
      { status: 500 }
    );
  }
}
