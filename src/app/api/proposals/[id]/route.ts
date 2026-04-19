import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, proposalMoodBoardImages } from "@/lib/db/schema";
import { and } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, proposalBodySchema } from "@/lib/validators/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermissionApi("proposals:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;
  const { id } = await params;

  try {
    // Load the proposal + order + enquiry via the relational query.
    // Mood board images are fetched separately below so that a broken
    // relation (e.g. mid-migration) can't take down the proposal
    // detail page -- we degrade to an empty board rather than 500.
    const proposal = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, id),
        eq(proposals.companyId, ctx.companyId)
      ),
      with: {
        order: {
          with: {
            enquiry: true,
          },
        },
      },
    });
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    let moodBoardImages: Array<{
      id: string;
      url: string;
      caption: string | null;
      position: number;
    }> = [];
    try {
      moodBoardImages = await db
        .select({
          id: proposalMoodBoardImages.id,
          url: proposalMoodBoardImages.url,
          caption: proposalMoodBoardImages.caption,
          position: proposalMoodBoardImages.position,
        })
        .from(proposalMoodBoardImages)
        .where(eq(proposalMoodBoardImages.proposalId, proposal.id))
        .orderBy(asc(proposalMoodBoardImages.position));
    } catch (err) {
      // Mood board table may not exist yet in very old DBs, or the
      // relation could temporarily fail during a migration. Don't
      // let that bring the whole proposal view down.
      console.warn(
        "Mood board fetch failed, returning empty:",
        err instanceof Error ? err.message : err
      );
    }

    return NextResponse.json({ ...proposal, moodBoardImages });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("Error fetching proposal:", detail);
    return NextResponse.json(
      { error: "Failed to fetch proposal", detail },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermissionApi("proposals:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;
  const { id } = await params;

  const parsed = await parseJsonBody(
    request,
    proposalBodySchema.partial().omit({ orderId: true })
  );
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    const existing = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, id),
        eq(proposals.companyId, ctx.companyId)
      ),
      columns: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(proposals)
      .set({
        ...data,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(proposals.id, id),
          eq(proposals.companyId, ctx.companyId)
        )
      )
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Error updating proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update proposal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermissionApi("proposals:delete");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;
  const { id } = await params;

  try {
    const existing = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, id),
        eq(proposals.companyId, ctx.companyId)
      ),
      columns: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of draft proposals. Sent/accepted/rejected
    // proposals are part of the client communication record.
    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          error: `Cannot delete a proposal with status "${existing.status}". Only draft proposals can be deleted.`,
        },
        { status: 409 }
      );
    }

    await db
      .delete(proposals)
      .where(
        and(
          eq(proposals.id, id),
          eq(proposals.companyId, ctx.companyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error deleting proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}
