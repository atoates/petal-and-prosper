"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { OrderModal } from "@/components/orders/order-modal";
import { Can } from "@/components/auth/can";

interface Order {
  id: string;
  enquiryId?: string;
  status: string;
  version: number;
  totalPrice?: string;
  createdAt: string;
  enquiry?: {
    clientName: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
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
    draft: "secondary",
    pending: "warning",
    confirmed: "success",
    completed: "primary",
    cancelled: "danger",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price?: string) => {
    if (!price) return "-";
    return `£${parseFloat(price).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setSelectedOrder(order);
    } else {
      setSelectedOrder(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      if (selectedOrder) {
        const response = await fetch(`/api/orders/${selectedOrder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error("Failed to update order");
        }
      } else {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error("Failed to create order");
        }
      }

      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error("Error saving order:", err);
      throw err;
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      const updatedResponse = await fetch("/api/orders");
      const data = await updatedResponse.json();
      setOrders(data);
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("Failed to delete order");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track all orders</p>
        </div>
        <Can permission="orders:create">
          <Button variant="primary" type="button" onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            New Order
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
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <CardBody>
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No orders yet</p>
                <p className="text-gray-400 mt-1">Create your first order to get started</p>
              </div>
            </CardBody>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Version
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Total Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <button
                        onClick={() => handleOpenModal(order)}
                        className="text-[#1B4332] hover:underline font-medium"
                      >
                        {order.enquiry?.clientName || "Unknown"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(order)}
                          className="p-1 text-gray-600 hover:text-[#1B4332] hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Can permission="orders:delete">
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <OrderModal
        isOpen={isModalOpen}
        order={selectedOrder}
        onClose={handleCloseModal}
        onSave={handleSaveOrder}
      />
    </div>
  );
}
