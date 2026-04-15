"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineSelect } from "@/components/ui/inline-select";
import { Can } from "@/components/auth/can";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { formatUkDate } from "@/lib/format-date";
import { wholesaleStatusColours, formatStatus } from "@/lib/status-colours";

interface WholesaleItem {
  id: string;
  description: string;
  category?: string | null;
  quantity: number;
  unitPrice?: string | null;
  notes?: string | null;
}

interface WholesaleOrder {
  id: string;
  orderId: string;
  supplier: string;
  status: string;
  orderDate?: string | null;
  receivedDate?: string | null;
  createdAt: string;
  items?: WholesaleItem[];
  order?: {
    id: string;
    enquiry?: {
      clientName: string;
      eventType?: string | null;
      eventDate?: string | null;
    } | null;
  } | null;
}

export default function WholesaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<WholesaleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wholesale/${params.id}`);
      if (!res.ok) throw new Error("Failed to load wholesale order");
      setOrder(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (next: string) => {
    if (!order) return;
    try {
      const res = await fetch(`/api/wholesale/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setOrder((prev) => (prev ? { ...prev, status: next } : prev));
      toast.success(`Status updated to ${formatStatus(next)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm("Delete this wholesale order? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wholesale/${order.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Wholesale order deleted");
      router.push("/wholesale");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (val?: string | null) => {
    if (!val) return "-";
    const n = parseFloat(val);
    return isNaN(n) ? "-" : `\u00a3${n.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-green" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error || "Wholesale order not found"}</p>
        <Link
          href="/wholesale"
          className="mt-4 inline-block text-sm text-primary-green hover:underline"
        >
          Back to wholesale
        </Link>
      </div>
    );
  }

  const enquiry = order.order?.enquiry;
  const items = order.items ?? [];
  const totalCost = items.reduce((sum, i) => {
    const price = parseFloat(i.unitPrice ?? "0") || 0;
    return sum + price * i.quantity;
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/wholesale"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to wholesale"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
              {order.supplier}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Order{" "}
              <Link
                href={`/orders/${order.orderId}`}
                className="text-primary-green hover:underline"
              >
                {order.orderId.slice(0, 8)}...
              </Link>
              {enquiry?.clientName && ` · ${enquiry.clientName}`}
            </p>
          </div>
        </div>

        <Can permission="wholesale:delete">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-200 hover:bg-red-50"
            aria-label="Delete wholesale order"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </Can>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Status
            </p>
            <Can permission="wholesale:update">
              <InlineSelect
                ariaLabel="Wholesale status"
                value={order.status}
                options={[
                  { value: "pending", label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
                  { value: "confirmed", label: "Confirmed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                  { value: "dispatched", label: "Dispatched", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                  { value: "received", label: "Received", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                  { value: "cancelled", label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
                ]}
                onChange={(next) => handleStatusChange(next)}
              />
            </Can>
            <Can permission="wholesale:update" fallback={
              <Badge variant={wholesaleStatusColours[order.status] || "secondary"}>
                {formatStatus(order.status)}
              </Badge>
            }>
              <></>
            </Can>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Order date
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatUkDate(order.orderDate)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Received date
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatUkDate(order.receivedDate) || "Not yet"}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Total cost
            </p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {totalCost > 0 ? `\u00a3${totalCost.toFixed(2)}` : "-"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardBody className="p-0">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Items ({items.length})
            </h2>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No items on this order.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Category
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold">
                    Qty
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold">
                    Unit price
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const lineTotal =
                    (parseFloat(item.unitPrice ?? "0") || 0) * item.quantity;
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3 text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">
                        {item.category || "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-900 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3 text-gray-900 text-right tabular-nums">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-gray-900 text-right tabular-nums font-medium">
                        {lineTotal > 0 ? `\u00a3${lineTotal.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalCost > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td
                      colSpan={4}
                      className="px-5 py-3 text-right text-gray-700"
                    >
                      Total
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900 tabular-nums">
                      {`\u00a3${totalCost.toFixed(2)}`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
