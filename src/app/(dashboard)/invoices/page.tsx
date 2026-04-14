"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UkDateInput } from "@/components/ui/uk-date-input";
import { Plus, Download, CreditCard, Loader2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { InlineSelect } from "@/components/ui/inline-select";
import { Can } from "@/components/auth/can";
import { formatUkDate } from "@/lib/format-date";

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  status: string;
  subtotal?: string | null;
  vatRate?: string | null;
  vatAmount?: string | null;
  totalAmount: string;
  amountPaid?: string | null;
  paymentMethod?: string | null;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  order?: {
    enquiry?: {
      clientName: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  enquiry?: {
    clientName: string;
  };
}

interface CreateInvoiceFormData {
  orderId: string;
  // `invoiceNumber` and `totalAmount` are optional overrides --
  // the API will auto-generate both if left blank (INV-{year}-{0001}
  // per-company sequence, total pulled from the order's line items).
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string;
  status: string;
}

type SortField = "invoiceNumber" | "client" | "status" | "totalAmount" | "dueDate" | "paidDate" | null;
type SortDirection = "asc" | "desc";

// Helper functions
const formatPrice = (amount: string | number): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateInvoiceFormData>({
    orderId: "",
    invoiceNumber: "",
    totalAmount: "",
    dueDate: "",
    status: "draft",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Payment recording modal state. When `paymentInvoice` is set, the
  // modal renders with that invoice preloaded. We track the form
  // locally so "cancel" doesn't leak into the invoice list rows.
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank transfer");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/invoices");
        if (!response.ok) {
          throw new Error("Failed to fetch invoices");
        }
        const data = await response.json();
        setInvoices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setSubmitError(null);
    setFormData({
      orderId: "",
      invoiceNumber: "",
      totalAmount: "",
      dueDate: "",
      status: "draft",
    });
    fetchOrders();
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      orderId: "",
      invoiceNumber: "",
      totalAmount: "",
      dueDate: "",
      status: "draft",
    });
    setSubmitError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId || !formData.dueDate) {
      setSubmitError("Order and due date are required");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      // Only pass invoiceNumber / totalAmount when the user has supplied an
      // override -- otherwise let the API generate them from the order.
      const payload: Record<string, unknown> = {
        orderId: formData.orderId,
        dueDate: formData.dueDate,
        status: formData.status,
      };
      if (formData.invoiceNumber.trim()) {
        payload.invoiceNumber = formData.invoiceNumber.trim();
      }
      if (formData.totalAmount.trim()) {
        payload.totalAmount = parseFloat(formData.totalAmount);
      }

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create invoice");
      }

      const newInvoice = await response.json();
      setInvoices((prev) => [newInvoice, ...prev]);
      handleCloseCreateModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Open the payment modal preloaded with the outstanding balance.
  // Defaulting to the remaining amount (not the full total) makes
  // partial payments obvious -- if a deposit was already recorded,
  // the florist sees the balance by default.
  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    const paid = parseFloat(invoice.amountPaid ?? "0") || 0;
    const total = parseFloat(invoice.totalAmount) || 0;
    const remaining = Math.max(0, total - paid);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod(invoice.paymentMethod || "bank transfer");
    setPaymentError(null);
  };

  const handleClosePaymentModal = () => {
    setPaymentInvoice(null);
    setPaymentError(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    const amountNum = parseFloat(paymentAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPaymentError("Enter a positive amount");
      return;
    }

    try {
      setPaymentSubmitting(true);
      setPaymentError(null);
      // The API computes the cumulative amountPaid for us -- we just
      // pass the incremental payment and let the server add it to
      // whatever was already recorded. Actually: the PATCH endpoint
      // stores the value as-is, so we add client-side here and send
      // the new running total.
      const previousPaid = parseFloat(paymentInvoice.amountPaid ?? "0") || 0;
      const newPaid = previousPaid + amountNum;

      const response = await fetch(
        `/api/invoices/${paymentInvoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountPaid: newPaid.toFixed(2),
            paymentMethod,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record payment");
      }
      const updated = await response.json();
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === updated.id ? { ...inv, ...updated } : inv
        )
      );
      handleClosePaymentModal();
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const response = await fetch(`/api/invoices/${id}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedInvoices = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      const invoiceNum = invoice.invoiceNumber.toLowerCase();
      const clientName = (invoice.order?.enquiry?.clientName || "").toLowerCase();
      const status = invoice.status.toLowerCase();
      const search = searchTerm.toLowerCase();
      return invoiceNum.includes(search) || clientName.includes(search) || status.includes(search);
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number = "";
        let bValue: string | number = "";

        switch (sortField) {
          case "invoiceNumber":
            aValue = a.invoiceNumber.toLowerCase();
            bValue = b.invoiceNumber.toLowerCase();
            break;
          case "client":
            aValue = (a.order?.enquiry?.clientName || "").toLowerCase();
            bValue = (b.order?.enquiry?.clientName || "").toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "totalAmount":
            aValue = parseFloat(a.totalAmount) || 0;
            bValue = parseFloat(b.totalAmount) || 0;
            break;
          case "dueDate":
            aValue = a.dueDate || "";
            bValue = b.dueDate || "";
            break;
          case "paidDate":
            aValue = a.paidAt || "";
            bValue = b.paidAt || "";
            break;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [invoices, searchTerm, sortField, sortDirection]);


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Create and manage invoices</p>
        </div>
        <Can permission="invoices:create">
          <Button variant="primary" type="button" onClick={handleOpenCreateModal}>
            <Plus size={20} className="mr-2" />
            New Invoice
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
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by invoice number, client name, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
            />
          </div>
        </div>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 animate-spin" size={20} />
              <span className="text-gray-600">Loading invoices...</span>
            </div>
          ) : displayedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No invoices found. Create your first invoice to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("invoiceNumber")}
                  >
                    <div className="flex items-center gap-2">
                      Invoice Number
                      {sortField === "invoiceNumber" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center gap-2">
                      Client
                      {sortField === "client" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortField === "status" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center gap-2">
                      Total Amount
                      {sortField === "totalAmount" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-2">
                      Due Date
                      {sortField === "dueDate" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("paidDate")}
                  >
                    <div className="flex items-center gap-2">
                      Paid Date
                      {sortField === "paidDate" && (
                        sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colours">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{invoice.order?.enquiry?.clientName || "Unknown"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <InlineSelect
                        ariaLabel="Invoice status"
                        value={invoice.status}
                        options={[
                          { value: "draft", label: "Draft", className: "bg-gray-100 text-gray-700 border border-gray-200" },
                          { value: "sent", label: "Sent", className: "bg-blue-50 text-blue-700 border border-blue-200" },
                          { value: "paid", label: "Paid", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
                          { value: "overdue", label: "Overdue", className: "bg-red-50 text-red-700 border border-red-200" },
                        ]}
                        onChange={async (next) => {
                          const res = await fetch(`/api/invoices/${invoice.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: next }),
                          });
                          if (!res.ok) throw new Error("Failed to update status");
                          setInvoices((prev) =>
                            prev.map((inv) =>
                              inv.id === invoice.id
                                ? { ...inv, status: next }
                                : inv
                            )
                          );
                          toast.success("Status updated");
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">£{formatPrice(invoice.totalAmount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatUkDate(invoice.dueDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatUkDate(invoice.paidAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(invoice.id)}
                          disabled={downloadingId === invoice.id}
                          className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 disabled:opacity-50 transition-colours"
                          title="Download PDF"
                          aria-label="Download invoice PDF"
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                        {invoice.status !== "paid" && (
                          <button
                            onClick={() => handleOpenPaymentModal(invoice)}
                            className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 transition-colours"
                            title="Record payment"
                            aria-label="Record payment"
                          >
                            <CreditCard size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-gray-900">Create Invoice</h2>
            </CardHeader>

            <CardBody className="space-y-4">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmitCreateInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  {ordersLoading ? (
                    <div className="text-sm text-gray-600">Loading orders...</div>
                  ) : ordersError ? (
                    <div className="text-sm text-red-600">{ordersError}</div>
                  ) : (
                    <select
                      name="orderId"
                      value={formData.orderId}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an order</option>
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} {order.enquiry?.clientName ? `- ${order.enquiry.clientName}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                    placeholder="Auto: INV-YYYY-0001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to auto-generate the next number for your company.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleFormChange}
                    placeholder="Auto from order"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to pull the total from the order&apos;s line items.
                  </p>
                </div>

                <div>
                  <UkDateInput
                    label="Due Date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, dueDate: v }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </form>
            </CardBody>

            <CardFooter className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCloseCreateModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitCreateInvoice}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Invoice"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {paymentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-gray-900">
                Record Payment
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {paymentInvoice.invoiceNumber} ·{" "}
                {paymentInvoice.order?.enquiry?.clientName || "Unknown"}
              </p>
            </CardHeader>
            <form onSubmit={handleSubmitPayment}>
              <CardBody className="space-y-4">
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-800 text-sm">{paymentError}</p>
                  </div>
                )}

                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>£{parseFloat(paymentInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already paid</span>
                    <span>
                      £
                      {(parseFloat(paymentInvoice.amountPaid ?? "0") || 0).toFixed(
                        2
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount received now
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the amount this payment covers. Partial payments are
                    supported.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  >
                    <option value="bank transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </CardBody>
              <CardFooter className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClosePaymentModal}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? "Recording..." : "Record Payment"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
