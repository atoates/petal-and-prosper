import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { optimiseRoute } from "@/lib/google-maps";
import { parseJsonBody } from "@/lib/validators/api";
import { z } from "zod";

const stopSchema = z.object({
  address: z.string().min(1, "Stop address is required"),
  label: z.string().optional(),
});

const optimiseRouteBodySchema = z.object({
  origin: z.string().min(1, "Origin address is required"),
  stops: z
    .array(stopSchema)
    .min(1, "At least one stop is required"),
});

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;

  const parsed = await parseJsonBody(request, optimiseRouteBodySchema);
  if (!parsed.success) return parsed.response;
  const { origin, stops } = parsed.data;

  try {
    const result = await optimiseRoute(origin, stops);

    if (!result) {
      return NextResponse.json(
        { error: "Could not optimise route for given addresses" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error optimising route:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to optimise route" },
      { status: 500 }
    );
  }
}
