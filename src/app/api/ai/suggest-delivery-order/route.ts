import { NextRequest, NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { suggestDeliverySchedule } from "@/lib/anthropic";
import { parseJsonBody } from "@/lib/validators/api";
import { z } from "zod";

const deliverySchema = z.object({
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  timeWindow: z.string().optional(),
});

const suggestDeliveryOrderBodySchema = z.object({
  deliveries: z
    .array(deliverySchema)
    .min(1, "At least one delivery is required"),
});

export async function POST(request: NextRequest) {
  const gate = await requirePermissionApi("delivery:read");
  if ("response" in gate) return gate.response;

  const parsed = await parseJsonBody(request, suggestDeliveryOrderBodySchema);
  if (!parsed.success) return parsed.response;
  const { deliveries } = parsed.data;

  try {
    const suggestion = await suggestDeliverySchedule(deliveries);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error(
      "Error suggesting delivery order:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to suggest delivery order" },
      { status: 500 }
    );
  }
}
