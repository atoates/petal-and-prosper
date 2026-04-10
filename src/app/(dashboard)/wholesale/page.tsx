"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/can";

interface WholesaleOrder {
  id: string;
  orderId: string;
  supplier: string;
  items?: string;
  status: string;
  orderDate: string;
  receivedDate?: string;
  createdAt: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
}

export default function WholesalePage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/wholesale");
        if (!response.ok) {
          throw new Error("Failed to fetch wholesale orders");
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const statusColors: Record<string, "primary" | "success" | "warning" | "danger" | "secondary"> = {
    pending: "warning",
    ordered: "primary",
    received: "success",
    cancelled: "danger",
    partial: "warning",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getItemsSummary = (itemsJson?: string) => {
    if (!itemsJson) return "-";
    try {
      const items = JSON.parse(itemsJson);
      if (Array.isArray(items)) {
        return `${items.length} item${items.length !== 1 ? "s" : ""}`;
      }
      return "-";
    } catch {
      return "-";
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Wholesale</h1>
          <p className="text-gray-600 mt-1">Manage supplier orders and stock</p>
        </div>
        <Can permission="wholesale:create">
          <Button variant="primary" type="button">
            <Plus size={20} className="mr-2" />
            New Wholesale Order
          </Button>
        </Can>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
                <p className="mt-4 text-gray-600">Loading wholesale orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No wholesale orders yet</p>
                <p className="text-gray-400 mt-1">Create your first wholesale order to get started</p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Event Client
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.supplier}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.order?.enquiry?.clientName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getItemsSummary(order.items)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
