"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Smartphone,
  Globe,
  Building2,
  MapPin,
  FileText,
  ShoppingCart,
  Tag,
  BookUser,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { ContactModal } from "@/components/contacts/contact-modal";
import { formatUkDate } from "@/lib/format-date";

type ContactType = "customer" | "supplier" | "both";

interface Order {
  id: string;
  status: string;
  totalPrice: string | number | null;
  createdAt: string;
}

interface Enquiry {
  id: string;
  clientName: string;
  eventType?: string | null;
  eventDate?: string | null;
  progress: string;
  createdAt: string;
  orders?: Order[];
}

interface Contact {
  id: string;
  type: ContactType;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  vatNumber?: string | null;
  accountRef?: string | null;
  tags?: string | null;
  notes?: string | null;
  enquiries?: Enquiry[];
  createdAt: string;
  updatedAt?: string | null;
}

const statusColours: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "secondary"
> = {
  New: "warning",
  TBD: "secondary",
  Live: "success",
  Done: "primary",
  Placed: "primary",
  Order: "success",
  draft: "secondary",
  quote: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "primary",
};

const typeColour: Record<ContactType, "primary" | "warning" | "success"> = {
  customer: "primary",
  supplier: "warning",
  both: "success",
};

function formatCurrency(value: string | number | null | undefined) {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchContact = async () => {
    try {
      const response = await fetch(`/api/contacts/${id}`);
      if (!response.ok) throw new Error("Contact not found");
      const data = await response.json();
      setContact(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (data: Partial<Contact>) => {
    const response = await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update contact");
    await fetchContact();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete contact");
      toast.success("Contact deleted");
      router.push("/contacts");
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]" />
          <p className="mt-4 text-gray-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 text-lg">{error || "Contact not found"}</p>
        <Link
          href="/contacts"
          className="text-[#1B4332] hover:underline mt-4 inline-block"
        >
          Back to Address Book
        </Link>
      </div>
    );
  }

  const displayName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  const addressParts = [
    contact.addressLine1,
    contact.addressLine2,
    contact.city,
    contact.county,
    contact.postcode,
    contact.country,
  ].filter(Boolean);

  const allOrders =
    contact.enquiries?.flatMap((e) =>
      (e.orders || []).map((o) => ({
        ...o,
        enquiryId: e.id,
        eventType: e.eventType,
      }))
    ) || [];

  const totalRevenue = allOrders.reduce((sum, o) => {
    const val =
      typeof o.totalPrice === "string"
        ? parseFloat(o.totalPrice)
        : o.totalPrice || 0;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div>
      {/* Breadcrumb and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts"
            className="p-2 text-gray-500 hover:text-[#1B4332] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
              {displayName}
              <Badge variant={typeColour[contact.type]}>
                {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
              </Badge>
            </h1>
            {contact.companyName && (
              <p className="text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Building2 size={14} /> {contact.companyName}
                {contact.jobTitle ? ` \u2014 ${contact.jobTitle}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Can permission="contacts:update">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              <Edit2 size={16} />
              Edit
            </Button>
          </Can>
          <Can permission="contacts:delete">
            <Button variant="danger" type="button" onClick={handleDelete}>
              <Trash2 size={16} />
              Delete
            </Button>
          </Can>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">
              {contact.enquiries?.length || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              Enquiries
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">
              {allOrders.length}
            </p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              Orders
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              Total Revenue
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">
              {formatUkDate(contact.createdAt)}
            </p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              Since
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: contact info */}
        <div className="space-y-6">
          {/* Contact details */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <BookUser size={16} className="text-primary-green" />
                Contact Details
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-[#1B4332] hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700">{contact.phone}</span>
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-3 text-sm">
                  <Smartphone size={16} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700">{contact.mobile}</span>
                </div>
              )}
              {contact.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe size={16} className="text-gray-400 shrink-0" />
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1B4332] hover:underline"
                  >
                    {contact.website}
                  </a>
                </div>
              )}
              {addressParts.length > 0 && (
                <div className="flex items-start gap-3 text-sm pt-2 border-t border-gray-100">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {addressParts.join(", ")}
                  </span>
                </div>
              )}
              {!contact.email &&
                !contact.phone &&
                !contact.mobile &&
                !contact.website &&
                addressParts.length === 0 && (
                  <p className="text-gray-400 text-sm">
                    No contact details recorded
                  </p>
                )}
            </CardBody>
          </Card>

          {/* Business details */}
          {(contact.paymentTerms || contact.vatNumber || contact.accountRef) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Business Details
                </h2>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                {contact.paymentTerms && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Terms</span>
                    <span className="text-gray-900 font-medium">
                      {contact.paymentTerms}
                    </span>
                  </div>
                )}
                {contact.vatNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">VAT Number</span>
                    <span className="text-gray-900 font-medium">
                      {contact.vatNumber}
                    </span>
                  </div>
                )}
                {contact.accountRef && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Ref</span>
                    <span className="text-gray-900 font-medium">
                      {contact.accountRef}
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Tags */}
          {contact.tags && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Tag size={16} className="text-primary-green" />
                  Tags
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.split(",").map((tag) => (
                    <span
                      key={tag.trim()}
                      className="px-2.5 py-1 bg-sage-100 text-sage-800 text-xs font-medium rounded-full"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Notes
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right column: enquiries and orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enquiries */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <FileText size={16} className="text-primary-green" />
                Enquiries ({contact.enquiries?.length || 0})
              </h2>
            </CardHeader>
            {contact.enquiries && contact.enquiries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contact.enquiries.map((enq) => (
                      <tr
                        key={enq.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                          {enq.eventType || "General"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {formatUkDate(enq.eventDate)}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <Badge
                            variant={
                              statusColours[enq.progress] || "secondary"
                            }
                          >
                            {enq.progress}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {formatUkDate(enq.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardBody>
                <p className="text-gray-400 text-sm text-center py-4">
                  No enquiries linked to this contact
                </p>
              </CardBody>
            )}
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary-green" />
                Orders ({allOrders.length})
              </h2>
            </CardHeader>
            {allOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-[#1B4332] hover:underline font-medium"
                          >
                            {order.id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {order.eventType || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <Badge
                            variant={
                              statusColours[order.status] || "secondary"
                            }
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right">
                          {formatCurrency(order.totalPrice)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {formatUkDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardBody>
                <p className="text-gray-400 text-sm text-center py-4">
                  No orders yet
                </p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      <ContactModal
        isOpen={isModalOpen}
        contact={contact}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
