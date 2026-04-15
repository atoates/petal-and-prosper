"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Edit2,
  FilePlus,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";
import { EnquiryModal } from "@/components/enquiries/enquiry-modal";
import { formatUkDate } from "@/lib/format-date";

// Thin shape mirroring what GET /api/enquiries/[id] returns, with
// optionals typed as `string | undefined` so we can hand the
// enquiry straight to EnquiryModal (whose props use that same
// shape). DB nulls get normalised to undefined on fetch.
interface Enquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventType?: string;
  eventDate?: string;
  venueA?: string;
  venueB?: string;
  progress: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// API returns DB rows with nullable columns. Normalise nulls to
// undefined so the downstream type is clean `string | undefined`.
function normaliseEnquiry(raw: Record<string, unknown>): Enquiry {
  const nu = (v: unknown): string | undefined =>
    v === null || v === undefined ? undefined : String(v);
  return {
    id: String(raw.id),
    clientName: String(raw.clientName),
    clientEmail: String(raw.clientEmail),
    clientPhone: nu(raw.clientPhone),
    eventType: nu(raw.eventType),
    eventDate: nu(raw.eventDate),
    venueA: nu(raw.venueA),
    venueB: nu(raw.venueB),
    progress: String(raw.progress ?? "New"),
    notes: nu(raw.notes),
    createdAt: String(raw.createdAt),
    updatedAt: nu(raw.updatedAt),
  };
}

interface LinkedOrder {
  id: string;
  status: string;
  version: number;
  totalPrice?: string | null;
  enquiryId?: string | null;
  createdAt: string;
}

import {
  enquiryProgressColours as statusColors,
  orderStatusColours as orderStatusColors,
} from "@/lib/status-colours";

function formatPrice(price?: string | null) {
  if (!price) return "-";
  return `£${parseFloat(price).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [linkedOrders, setLinkedOrders] = useState<LinkedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const fetchEnquiry = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/enquiries/${id}`);
    if (res.status === 404) {
      throw new Error("Enquiry not found");
    }
    if (!res.ok) {
      throw new Error("Failed to load enquiry");
    }
    const data = await res.json();
    setEnquiry(normaliseEnquiry(data));
  }, [id]);

  const fetchLinkedOrders = useCallback(async () => {
    if (!id) return;
    // There is no dedicated "orders for this enquiry" endpoint yet,
    // so we pull the tenant's full list and filter client-side. For
    // a single-florist workload this is fine; revisit if order
    // volume grows into the thousands.
    const res = await fetch("/api/orders");
    if (!res.ok) return;
    const data: LinkedOrder[] = await res.json();
    setLinkedOrders(data.filter((o) => o.enquiryId === id));
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchEnquiry(), fetchLinkedOrders()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchEnquiry, fetchLinkedOrders]);

  const handleSaveEnquiry = async (data: Partial<Enquiry>) => {
    if (!enquiry) return;
    const res = await fetch(`/api/enquiries/${enquiry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error("Failed to update enquiry");
    }
    await fetchEnquiry();
    toast.success("Enquiry updated");
  };

  const handleCreateOrder = async () => {
    if (!enquiry) return;
    try {
      setCreatingOrder(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId: enquiry.id, status: "draft" }),
      });
      if (!res.ok) {
        throw new Error("Failed to create order");
      }
      const created = await res.json();
      router.push(`/orders/${created.id}`);
    } catch (err) {
      console.error("Error creating order from enquiry:", err);
      toast.error("Failed to create order for this enquiry");
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading enquiry...</p>
        </div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div>
        <Link
          href="/enquiries"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B4332] mb-6"
        >
          <ArrowLeft size={16} />
          Back to enquiries
        </Link>
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">
              {error || "Enquiry not found"}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const venues = [enquiry.venueA, enquiry.venueB]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" / ");

  return (
    <div>
      <Link
        href="/enquiries"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B4332] mb-6"
      >
        <ArrowLeft size={16} />
        Back to enquiries
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
              {enquiry.clientName}
            </h1>
            <Badge
              variant={
                statusColors[enquiry.progress as keyof typeof statusColors]
              }
            >
              {enquiry.progress}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            {enquiry.eventType || "Enquiry"}
            {enquiry.eventDate ? ` · ${formatUkDate(enquiry.eventDate)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Can permission="enquiries:update">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              <Edit2 size={16} className="mr-2" />
              Edit
            </Button>
          </Can>
          {enquiry.progress !== "Order" && (
            <Can permission="orders:create">
              <Button
                variant="primary"
                type="button"
                onClick={handleCreateOrder}
                disabled={creatingOrder}
              >
                <FilePlus size={16} className="mr-2" />
                {creatingOrder ? "Creating..." : "Create order"}
              </Button>
            </Can>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Client details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 flex items-center gap-2">
                  <Mail size={14} /> Email
                </dt>
                <dd className="text-gray-900 mt-1 break-all">
                  <a
                    href={`mailto:${enquiry.clientEmail}`}
                    className="text-[#1B4332] hover:underline"
                  >
                    {enquiry.clientEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 flex items-center gap-2">
                  <Phone size={14} /> Phone
                </dt>
                <dd className="text-gray-900 mt-1">
                  {enquiry.clientPhone ? (
                    <a
                      href={`tel:${enquiry.clientPhone}`}
                      className="text-[#1B4332] hover:underline"
                    >
                      {enquiry.clientPhone}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 flex items-center gap-2">
                  <Calendar size={14} /> Event date
                </dt>
                <dd className="text-gray-900 mt-1">
                  {formatUkDate(enquiry.eventDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 flex items-center gap-2">
                  <MapPin size={14} /> Venue
                </dt>
                <dd className="text-gray-900 mt-1">{venues || "-"}</dd>
              </div>
            </dl>

            {enquiry.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {enquiry.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {formatUkDate(enquiry.createdAt)}
                </dd>
              </div>
              {enquiry.updatedAt && (
                <div>
                  <dt className="text-gray-500">Last updated</dt>
                  <dd className="text-gray-900">
                    {formatUkDate(enquiry.updatedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Linked orders
          </h2>
          {linkedOrders.length === 0 ? (
            <p className="text-sm text-gray-500">
              No orders linked to this enquiry yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {linkedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            orderStatusColors[
                              order.status as keyof typeof orderStatusColors
                            ]
                          }
                        >
                          {order.status.charAt(0).toUpperCase() +
                            order.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.version}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatPrice(order.totalPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatUkDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-[#1B4332] hover:underline"
                        >
                          View
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <EnquiryModal
        isOpen={isModalOpen}
        enquiry={enquiry}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEnquiry}
      />
    </div>
  );
}
