/**
 * Email body templates
 * =====================
 *
 * Small helpers that assemble the HTML we send out. We keep these
 * separate from `send.ts` so callers can pre-render the body, let the
 * user tweak it, and only then pass it to the send pipeline.
 *
 * These templates are intentionally inline-styled and simple. Modern
 * Outlook / Gmail strip most CSS; tables and inline styles are the
 * safest subset. Nothing here depends on React -- it's all string
 * interpolation so it runs inside API routes without a render cycle.
 */

export interface ProposalEmailInputs {
  companyName: string;
  clientName: string;
  orderId: string;
  total?: string | null;
  publicLink: string;
  customIntro?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderProposalEmail(inputs: ProposalEmailInputs): {
  subject: string;
  html: string;
} {
  const subject = `Your floral proposal from ${inputs.companyName}`;
  const intro =
    inputs.customIntro?.trim() ||
    `Thank you for your enquiry. We've prepared a proposal for your event and would love to hear what you think.`;
  const totalLine = inputs.total
    ? `<p style="margin:0 0 12px 0;"><strong>Estimated total:</strong> £${escapeHtml(
        inputs.total
      )}</p>`
    : "";
  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;font-family:Georgia,serif;background:#FDF8F9;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF8F9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1B4332;color:#ffffff;padding:24px 32px;">
                <h1 style="margin:0;font-size:22px;font-weight:600;">${escapeHtml(
                  inputs.companyName
                )}</h1>
                <p style="margin:4px 0 0 0;font-size:14px;opacity:0.8;">A proposal for ${escapeHtml(
                  inputs.clientName
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;">Dear ${escapeHtml(
                  inputs.clientName
                )},</p>
                <p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
                ${totalLine}
                <p style="margin:24px 0;">
                  <a href="${escapeHtml(inputs.publicLink)}"
                     style="display:inline-block;background:#1B4332;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">
                    View proposal
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">
                  When you're ready, you can accept or decline directly from the
                  proposal page. We'll be in touch either way.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#FDF8F9;padding:16px 32px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6;">
                Sent from ${escapeHtml(inputs.companyName)} via Petal &amp; Prosper.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
  return { subject, html };
}
