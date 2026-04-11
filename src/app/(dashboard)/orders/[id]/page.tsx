"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { Can } from "@/components/auth/can";

type TabKey =
  | "enquiry"
  | "items"
  | "proposals"
  | "wholesale"
  | "production"
  | "delivery"
  | "invoice";

interface OrderItem {
  id: string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface Enquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventType?: string;
  eventDate?: string;
  venueA?: string;
  venueB?: string;
  progress?: string;
  notes?: string;
}

interface OrderDetail {
  id: string;
  enquiryId?: string;
  status: string;
  version?: number;
  totalPrice?: string;
  createdAt: string;
  updatedAt?: string;
  enquiry?: Enquiry;
  items?: OrderItem[];
}

interface ProposalRow {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  subject?: string | null;
  publicToken?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
}

interface WholesaleRow {
  id: string;
  orderId: string;
  supplier: string;
  status: string;
  orderDate?: string;
  items?: string;
}

interface ProductionRow {
  id: string;
  orderId: string;
  status: string;
  eventDate?: string;
  notes?: string;
}

interface DeliveryRow {
  id: string;
  orderId: string;
  status: string;
  eventDate?: string;
  deliveryAddress?: string;
}

interface InvoiceRow {
  id: string;
  orderId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: string;
  dueDate?: string;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(value?: string | null) {
  if (!value) return "-";
  return `£${parseFloat(value).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "enquiry", label: "Enquiry" },
  { key: "items", label: "Line items" },
  { key: "proposals", label: "Proposals" },
  { key: "wholesale", label: "Wholesale" },
  { key: "production", label: "Production" },
  { key: "delivery", label: "Delivery" },
  { key: "invoice", label: "Invoice" },
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("enquiry");

  const [applyingPricing, setApplyingPricing] = useState(false);
  const [sendingProposalId, setSendingProposalId] = useState<string | null>(
    null
  );
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [wholesale, setWholesale] = useState<WholesaleRow[]>([]);
  const [production, setProduction] = useState<ProductionRow[]>([]);
  const [delivery, setDelivery] = useState<DeliveryRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [
          orderRes,
          proposalsRes,
          wholesaleRes,
          productionRes,
          deliveryRes,
          invoicesRes,
        ] = await Promise.all([
          fetch(`/api/orders/${id}`),
          fetch("/api/proposals"),
          fetch("/api/wholesale"),
          fetch("/api/production"),
          fetch("/api/delivery"),
          fetch("/api/invoices"),
        ]);

        if (!orderRes.ok) throw new Error("Failed to load order");
        const orderData = await orderRes.json();
        setOrder(orderData);

        if (proposalsRes.ok) {
          const data: ProposalRow[] = await proposalsRes.json();
          setProposals(data.filter((p) => p.orderId === id));
        }
        if (wholesaleRes.ok) {
          const data: WholesaleRow[] = await wholesaleRes.json();
          setWholesale(data.filter((w) => w.orderId === id));
        }
        if (productionRes.ok) {
          const data: ProductionRow[] = await productionRes.json();
          setProduction(data.filter((p) => p.orderId === id));
        }
        if (deliveryRes.ok) {
          const data: DeliveryRow[] = await deliveryRes.json();
          setDelivery(data.filter((d) => d.orderId === id));
        }
        if (invoicesRes.ok) {
          const data: InvoiceRow[] = await invoicesRes.json();
          setInvoices(data.filter((i) => i.orderId === id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleApplyPricing = async () => {
    if (!order) return;
    if (
      !confirm(
        "Re-price line items using your pricing rules? Current unit prices will be treated as costs and marked up."
      )
    ) {
      return;
    }
    try {
      setApplyingPricing(true);
      const res = await fetch(`/api/orders/${id}/apply-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to apply pricing");
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply pricing");
    } finally {
      setApplyingPricing(false);
    }
  };

  const handleSendProposal = async (proposalId: string) => {
    if (
      !confirm(
        "Send this proposal to the client via email? They'll get a link to accept or decline."
      )
    ) {
      return;
    }
    try {
      setSendingProposalId(proposalId);
      const res = await fetch(`/api/proposals/${proposalId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send proposal");
      }
      const data = await res.json();
      // Refresh the proposals list so the UI reflects the new
      // sent state + stored publicToken.
      const refreshed = await fetch("/api/proposals");
      if (refreshed.ok) {
        const all: ProposalRow[] = await refreshed.json();
        setProposals(all.filter((p) => p.orderId === id));
      }
      alert(
        `Proposal sent (${data.provider}). Public link:\n${data.publicLink}`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send proposal");
    } finally {
      setSendingProposalId(null);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          status: "draft",
          // invoiceNumber + totalAmount auto-populated server-side
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create invoice");
      }
      const inv = await res.json();
      setInvoices((prev) => [...prev, inv]);
      setActiveTab("invoice");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardBody>
          <p className="text-red-800">Error: {error || "Order not found"}</p>
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.push("/orders")}
            className="mt-4"
          >
            Back to orders
          </Button>
        </CardBody>
      </Card>
    );
  }

  const clientName = order.enquiry?.clientName || "Unknown client";
  const itemsTotal = (order.items || []).reduce(
    (sum, it) => sum + parseFloat(it.totalPrice),
    0
  );

  return (
    <div>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1B4332] mb-4"
      >
        <ArrowLeft size={16} />
        Back to orders
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
            {clientName}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <span>Order {order.id.slice(0, 8)}</span>
            <span>&middot;</span>
            <Badge variant="primary">{order.status}</Badge>
            {order.enquiry?.eventDate && (
              <>
                <span>&middot;</span>
                <span>{formatDate(order.enquiry.eventDate)}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold text-[#1B4332]">
            {formatPrice(
              order.totalPrice || (itemsTotal > 0 ? itemsTotal.toFixed(2) : undefined)
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#1B4332] text-[#1B4332]"
                  : "border-transparent text-gray-600 hover:text-[#1B4332]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "enquiry" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-serif font-semibold text-gray-900">
              Enquiry details
            </h2>
          </CardHeader>
          <CardBody>
            {!order.enquiry ? (
              <p className="text-sm text-gray-500">
                No enquiry linked to this order.
              </p>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Client</dt>
                  <dd className="text-gray-900 font-medium">
                    {order.enquiry.clientName}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900">{order.enquiry.clientEmail}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-900">
                    {order.enquiry.clientPhone || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Event type</dt>
                  <dd className="text-gray-900">
                    {order.enquiry.eventType || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Event date</dt>
                  <dd className="text-gray-900">
                    {formatDate(order.enquiry.eventDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Progress</dt>
                  <dd className="text-gray-900">
                    {order.enquiry.progress || "-"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Venue</dt>
                  <dd className="text-gray-900">
                    {order.enquiry.venueA || "-"}
                    {order.enquiry.venueB ? ` / ${order.enquiry.venueB}` : ""}
                  </dd>
                </div>
                {order.enquiry.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Notes</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">
                      {order.enquiry.notes}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Link
                    href={`/enquiries/${order.enquiryId}`}
                    className="text-sm text-[#2D6A4F] hover:underline"
                  >
                    Open full enquiry &rarr;
                  </Link>
                </div>
              </dl>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "items" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-serif font-semibold text-gray-900">
                  Line items
                </h2>
                <div className="text-sm text-gray-500">
                  {order.items?.length || 0} items &middot;{" "}
                  {formatPrice(
                    itemsTotal > 0 ? itemsTotal.toFixed(2) : undefined
                  )}
                </div>
              </div>
              <Can permission="orders:update">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyPricing}
                  disabled={applyingPricing || !order.items || order.items.length === 0}
                >
                  {applyingPricing ? "Applying..." : "Apply pricing rules"}
                </Button>
              </Can>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {!order.items || order.items.length === 0 ? (
              <p className="text-sm text-gray-500 p-6">
                No line items yet. Use the Edit button on the order row to add
                items.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {item.category || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-right">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatPrice(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "proposals" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Proposals
              </h2>
              <Can permission="proposals:create">
                <Link href={`/proposals?orderId=${id}`}>
                  <Button variant="primary" type="button">
                    <Plus size={16} className="mr-1" />
                    New Proposal
                  </Button>
                </Link>
              </Can>
            </div>
          </CardHeader>
          <CardBody>
            {proposals.length === 0 ? (
              <p className="text-sm text-gray-500">No proposals yet.</p>
            ) : (
              <ul className="space-y-3">
                {proposals.map((p) => {
                  const canSend =
                    p.status === "draft" || p.status === "sent";
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 last:border-0"
                    >
                      <div>
                        <div className="text-gray-900 font-medium">
                          {p.subject || `Proposal ${p.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {formatDate(p.createdAt)}
                          {p.sentAt && ` · Sent ${formatDate(p.sentAt)}`}
                          {p.acceptedAt &&
                            ` · Accepted ${formatDate(p.acceptedAt)}`}
                          {p.rejectedAt &&
                            ` · Declined ${formatDate(p.rejectedAt)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary">{p.status}</Badge>
                        <Can permission="proposals:update">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleSendProposal(p.id)}
                            disabled={
                              !canSend || sendingProposalId === p.id
                            }
                          >
                            {sendingProposalId === p.id
                              ? "Sending..."
                              : p.sentAt
                              ? "Re-send"
                              : "Send"}
                          </Button>
                        </Can>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "wholesale" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Wholesale orders
              </h2>
              <Can permission="wholesale:create">
                <Link href={`/wholesale?orderId=${id}`}>
                  <Button variant="primary" type="button">
                    <Plus size={16} className="mr-1" />
                    New Wholesale
                  </Button>
                </Link>
              </Can>
            </div>
          </CardHeader>
          <CardBody>
            {wholesale.length === 0 ? (
              <p className="text-sm text-gray-500">
                No wholesale orders yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {wholesale.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        {w.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        Ordered {formatDate(w.orderDate)}
                      </div>
                    </div>
                    <Badge variant="primary">{w.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "production" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Production schedule
              </h2>
              <Can permission="production:create">
                <Link href={`/production?orderId=${id}`}>
                  <Button variant="primary" type="button">
                    <Plus size={16} className="mr-1" />
                    New Schedule
                  </Button>
                </Link>
              </Can>
            </div>
          </CardHeader>
          <CardBody>
            {production.length === 0 ? (
              <p className="text-sm text-gray-500">
                No production schedule yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {production.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        Scheduled for {formatDate(p.eventDate)}
                      </div>
                      {p.notes && (
                        <div className="text-xs text-gray-500">{p.notes}</div>
                      )}
                    </div>
                    <Badge variant="primary">{p.status.replace(/_/g, " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "delivery" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Delivery schedule
              </h2>
              <Can permission="delivery:create">
                <Link href={`/delivery?orderId=${id}`}>
                  <Button variant="primary" type="button">
                    <Plus size={16} className="mr-1" />
                    New Delivery
                  </Button>
                </Link>
              </Can>
            </div>
          </CardHeader>
          <CardBody>
            {delivery.length === 0 ? (
              <p className="text-sm text-gray-500">
                No delivery scheduled yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {delivery.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        {formatDate(d.eventDate)}
                      </div>
                      {d.deliveryAddress && (
                        <div className="text-xs text-gray-500">
                          {d.deliveryAddress}
                        </div>
                      )}
                    </div>
                    <Badge variant="primary">{d.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "invoice" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-gray-900">
                Invoices
              </h2>
              <Can permission="invoices:create">
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleCreateInvoice}
                >
                  <Plus size={16} className="mr-1" />
                  Raise Invoice
                </Button>
              </Can>
            </div>
          </CardHeader>
          <CardBody>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">
                No invoices raised yet. Raising one will auto-number it and
                pull the total from the order.
              </p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-gray-500">
                        Due {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 font-medium">
                        {formatPrice(inv.totalAmount)}
                      </span>
                      <Badge variant="primary">{inv.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
