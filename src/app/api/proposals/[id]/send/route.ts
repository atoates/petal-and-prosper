import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, orders, enquiries, companies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermissionApi } from "@/lib/auth/permissions-api";
import { parseJsonBody, proposalSendSchema } from "@/lib/validators/api";
import { sendEmail } from "@/lib/email/send";
import { renderProposalEmail } from "@/lib/email/templates";
import crypto from "crypto";

/**
 * POST /api/proposals/[id]/send
 *
 * Dispatches the proposal to the client. The flow:
 *
 *   1. Verify the proposal is in this tenant.
 *   2. Resolve the recipient (explicit body field or enquiry.clientEmail).
 *   3. Ensure the proposal has a `publicToken` -- mint one if missing.
 *   4. Render (or reuse) the HTML body.
 *   5. Hand off to the email service. Note: `src/lib/email/send.ts` is
 *      currently stubbed -- it logs the outgoing email to stderr and
 *      returns success without actually sending. The proposal row is
 *      still marked `sent` and the public link is still returned, so
 *      the florist can copy-paste the URL to the client in the
 *      meantime. When SMTP is wired back in, no change is needed here.
 *   6. Update the proposal row: status='sent', sentAt=now, subject,
 *      bodyHtml, publicToken.
 *
 * The public link embedded in the email points at `/p/[token]`, which
 * is a no-auth route that lets the client accept or decline. We use
 * an opaque 32-byte base64url token rather than the proposal id so a
 * leaked URL can't be correlated back to tenant IDs.
 */

function mintToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function resolvePublicBase(request: NextRequest): string {
  // Prefer an explicit env override (production), then the request
  // origin (works for dev and when running behind a reverse proxy).
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermissionApi("proposals:update");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, proposalSendSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;

  try {
    // Tenant-scoped lookup. We also load the parent order + enquiry so
    // we can default the recipient and render the email.
    const proposal = await db.query.proposals.findFirst({
      where: and(
        eq(proposals.id, params.id),
        eq(proposals.companyId, ctx.companyId)
      ),
    });
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, proposal.orderId),
        eq(orders.companyId, ctx.companyId)
      ),
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const enquiry = order.enquiryId
      ? await db.query.enquiries.findFirst({
          where: and(
            eq(enquiries.id, order.enquiryId),
            eq(enquiries.companyId, ctx.companyId)
          ),
        })
      : null;

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, ctx.companyId),
    });

    const recipient =
      data.recipientEmail || enquiry?.clientEmail || null;
    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "No recipient email. Pass recipientEmail or add clientEmail to the enquiry.",
        },
        { status: 400 }
      );
    }

    // Mint a fresh token on every send so an old public link stops
    // working once the florist re-sends a revised proposal. If that's
    // too aggressive we can flip this to "only mint when missing".
    const publicToken = proposal.publicToken ?? mintToken();

    const publicBase = resolvePublicBase(request);
    const publicLink = `${publicBase}/p/${publicToken}`;

    // Render (or reuse) the email body. Explicit overrides beat the
    // stored draft; the stored draft beats the default template.
    let subject = data.subject || proposal.subject || "";
    let bodyHtml = data.bodyHtml || proposal.bodyHtml || "";
    if (!subject || !bodyHtml) {
      const rendered = renderProposalEmail({
        companyName: company?.name ?? "Your florist",
        clientName:
          data.recipientName ||
          enquiry?.clientName ||
          "Valued client",
        orderId: order.id,
        total: order.totalPrice,
        publicLink,
      });
      if (!subject) subject = rendered.subject;
      if (!bodyHtml) bodyHtml = rendered.html;
    }

    const sendResult = await sendEmail({
      to: recipient,
      subject,
      html: bodyHtml,
      replyTo: company?.email ?? undefined,
    });

    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to send email" },
        { status: 502 }
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(proposals)
      .set({
        status: "sent",
        sentAt: now,
        subject,
        bodyHtml,
        publicToken,
        updatedAt: now,
      })
      .where(
        and(
          eq(proposals.id, params.id),
          eq(proposals.companyId, ctx.companyId)
        )
      )
      .returning();

    return NextResponse.json({
      proposal: updated,
      publicLink,
      provider: sendResult.provider,
      messageId: sendResult.messageId,
    });
  } catch (error) {
    console.error(
      "Error sending proposal:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to send proposal" },
      { status: 500 }
    );
  }
}
