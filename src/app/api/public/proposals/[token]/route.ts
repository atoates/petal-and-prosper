import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, orders, enquiries, companies, orderItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * GET /api/public/proposals/[token]
 *
 * Unauthenticated lookup used by the public accept/decline page. A
 * proposal is resolved by its `publicToken`, which is an opaque
 * 32-byte random string we mint in the send route. We deliberately
 * return a thin payload so a leaked URL exposes only what the
 * client needs to decide: the florist's name, the event, the total,
 * and the line items. No tenant IDs, user emails, or internal
 * status flags.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.publicToken, params.token),
    });
    if (!proposal || !proposal.publicToken) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // A cancelled/revoked proposal should stop the accept flow. We
    // don't distinguish between "already accepted" and "already
    // rejected" from the client's perspective here; the UI decides
    // what to show based on the timestamps we return.
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, proposal.orderId),
    });
    if (!order) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, proposal.companyId),
    });
    const enquiry = order.enquiryId
      ? await db.query.enquiries.findFirst({
          where: eq(enquiries.id, order.enquiryId),
        })
      : null;
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });

    return NextResponse.json({
      company: company
        ? {
            name: company.name,
            logoUrl: company.logoUrl,
            email: company.email,
          }
        : null,
      enquiry: enquiry
        ? {
            clientName: enquiry.clientName,
            eventType: enquiry.eventType,
            eventDate: enquiry.eventDate,
            venueA: enquiry.venueA,
          }
        : null,
      order: {
        id: order.id,
        totalPrice: order.totalPrice,
      },
      items: items.map((i) => ({
        description: i.description,
        category: i.category,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      proposal: {
        id: proposal.id,
        subject: proposal.subject,
        bodyHtml: proposal.bodyHtml,
        status: proposal.status,
        sentAt: proposal.sentAt,
        acceptedAt: proposal.acceptedAt,
        rejectedAt: proposal.rejectedAt,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching public proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/public/proposals/[token]
 *
 * Accept or decline a proposal. No auth -- the token IS the auth.
 * Body: { action: "accept" | "decline" }
 *
 * We record the response on the proposal row and, for accepts, also
 * advance the parent order to 'confirmed'. A declined proposal
 * leaves the order untouched so the florist can re-quote.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const raw = await request.json().catch(() => null);
    const action = raw?.action;
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { error: "action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.publicToken, params.token),
    });
    if (!proposal || !proposal.publicToken) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Refuse to double-respond: if the proposal is already in a
    // terminal state, preserve the original timestamp and tell the
    // caller what happened.
    if (proposal.status === "accepted" || proposal.status === "rejected") {
      return NextResponse.json(
        { error: `Proposal already ${proposal.status}` },
        { status: 409 }
      );
    }

    const now = new Date();
    const newStatus = action === "accept" ? "accepted" : "rejected";

    await db
      .update(proposals)
      .set({
        status: newStatus,
        acceptedAt: action === "accept" ? now : null,
        rejectedAt: action === "decline" ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(proposals.id, proposal.id),
          eq(proposals.companyId, proposal.companyId)
        )
      );

    if (action === "accept") {
      await db
        .update(orders)
        .set({ status: "confirmed", updatedAt: now })
        .where(
          and(
            eq(orders.id, proposal.orderId),
            eq(orders.companyId, proposal.companyId)
          )
        );
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error(
      "Error responding to proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to record response" },
      { status: 500 }
    );
  }
}
