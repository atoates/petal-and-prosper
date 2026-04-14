"use client";

/**
 * Public proposal accept/decline page
 * ====================================
 *
 * This lives outside every route group so it's not wrapped in the
 * dashboard chrome and so middleware's explicit allowlist leaves it
 * public. The token in the URL is the only thing that authenticates
 * the viewer -- there's no login, no session, nothing to remember.
 *
 * The page fetches the thin public payload from
 * /api/public/proposals/[token], shows the client-facing summary,
 * and lets them hit Accept or Decline. Responses are posted back to
 * the same endpoint. Once a response is recorded the UI swaps into
 * a "thanks" state and disables the buttons.
 *
 * Deliberately minimal styling: we're not trying to compete with a
 * real proposal-builder tool yet, just confirm the florist's
 * client can get a number, say yes, and move on.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  formatUkDate,
  UK_DATE_DAY_MONTH_LONG,
} from "@/lib/format-date";

interface PublicProposalData {
  company: {
    name: string;
    logoUrl?: string | null;
    email?: string | null;
  } | null;
  enquiry: {
    clientName: string;
    eventType?: string | null;
    eventDate?: string | null;
    venueA?: string | null;
  } | null;
  order: {
    id: string;
    totalPrice?: string | null;
  };
  items: Array<{
    description: string;
    category?: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  proposal: {
    id: string;
    subject?: string | null;
    bodyHtml?: string | null;
    status: string;
    sentAt?: string | null;
    acceptedAt?: string | null;
    rejectedAt?: string | null;
  };
}

function formatPrice(value?: string | null) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PublicProposalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<PublicProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<"accepted" | "rejected" | null>(
    null
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/proposals/${token}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "This proposal link is no longer valid."
              : "Failed to load proposal"
          );
        }
        const json = (await res.json()) as PublicProposalData;
        setData(json);
        if (json.proposal.status === "accepted") setResponse("accepted");
        if (json.proposal.status === "rejected") setResponse("rejected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleRespond = async (action: "accept" | "decline") => {
    if (!token) return;
    if (
      action === "decline" &&
      !confirm("Are you sure you want to decline this proposal?")
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/proposals/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to record response");
      }
      setResponse(action === "accept" ? "accepted" : "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F9]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading your proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F9] p-6">
        <div className="max-w-md bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-serif font-bold text-gray-900">
            Proposal unavailable
          </h1>
          <p className="text-gray-600 mt-2">
            {error || "This proposal link is no longer valid."}
          </p>
        </div>
      </div>
    );
  }

  const eventDateRaw = formatUkDate(
    data.enquiry?.eventDate,
    UK_DATE_DAY_MONTH_LONG,
    ""
  );
  const eventDate = eventDateRaw || null;
  const total = formatPrice(data.order.totalPrice);

  return (
    <div className="min-h-screen bg-[#FDF8F9] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg border border-gray-200 border-b-0 px-8 py-6 flex items-center gap-4">
          {data.company?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={data.company.logoUrl}
              alt={data.company.name}
              className="h-12 w-auto"
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              {data.company?.name || "Floral proposal"}
            </h1>
            {data.enquiry?.clientName && (
              <p className="text-gray-600 text-sm mt-1">
                Prepared for {data.enquiry.clientName}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white border border-gray-200 px-8 py-6 space-y-6">
          {(data.enquiry?.eventType || eventDate || data.enquiry?.venueA) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {data.enquiry?.eventType && (
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wide">
                    Event
                  </div>
                  <div className="text-gray-900 mt-1">
                    {data.enquiry.eventType}
                  </div>
                </div>
              )}
              {eventDate && (
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wide">
                    Date
                  </div>
                  <div className="text-gray-900 mt-1">{eventDate}</div>
                </div>
              )}
              {data.enquiry?.venueA && (
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wide">
                    Venue
                  </div>
                  <div className="text-gray-900 mt-1">
                    {data.enquiry.venueA}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.items.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Line items
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="py-2 pr-4 font-medium text-right">Qty</th>
                      <th className="py-2 pr-4 font-medium text-right">
                        Unit
                      </th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-900">
                          {item.description}
                          {item.category && (
                            <span className="text-gray-400 text-xs ml-2">
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-600">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          {formatPrice(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {total && (
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-3 text-right font-semibold">
                          Total
                        </td>
                        <td className="py-3 text-right font-semibold text-[#1B4332]">
                          {total}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Response panel */}
        <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 px-8 py-6">
          {response === "accepted" ? (
            <div className="text-center">
              <h3 className="text-lg font-serif font-semibold text-[#1B4332]">
                Thank you!
              </h3>
              <p className="text-gray-600 mt-1">
                We&apos;ve let {data.company?.name || "the florist"} know you
                accepted. They&apos;ll be in touch to confirm next steps.
              </p>
            </div>
          ) : response === "rejected" ? (
            <div className="text-center">
              <h3 className="text-lg font-serif font-semibold text-gray-900">
                Response recorded
              </h3>
              <p className="text-gray-600 mt-1">
                Thanks for letting us know. We&apos;ve passed your decision on
                to {data.company?.name || "the florist"}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-600">
                Ready to go ahead? Let us know below.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRespond("decline")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => handleRespond("accept")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#1B4332] text-white hover:bg-[#163529] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Accept proposal"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="text-red-600 text-sm mt-3 text-center">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sent via Petal &amp; Prosper
        </p>
      </div>
    </div>
  );
}
