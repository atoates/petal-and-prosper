"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Plus } from "lucide-react";
import { ProductAutocomplete } from "./product-autocomplete";

interface OrderItem {
  id: string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface Order {
  id: string;
  enquiryId?: string;
  status: string;
  version: number;
  totalPrice?: string;
  items?: OrderItem[];
  enquiry?: {
    clientName: string;
  };
  createdAt: string;
}

interface Enquiry {
  id: string;
  clientName: string;
  clientEmail: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  wholesalePrice?: string;
  retailPrice?: string;
  colour?: string;
  unit?: string;
}

interface OrderModalProps {
  isOpen: boolean;
  order?: Order | null;
  onClose: () => void;
  onSave: (order: Partial<Order>) => Promise<void>;
}

const STATUS_OPTIONS = ["draft", "quote", "confirmed", "cancelled", "completed"];
const CATEGORY_OPTIONS = [
  "flower",
  "foliage",
  "sundry",
  "container",
  "ribbon",
  "accessory",
];

export function OrderModal({ isOpen, order, onClose, onSave }: OrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<Partial<Order>>({
    enquiryId: "",
    status: "draft",
    version: 1,
    totalPrice: "",
    items: [],
  });

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const response = await fetch("/api/enquiries");
        if (response.ok) {
          const data = await response.json();
          setEnquiries(data);
        }
      } catch (error) {
        console.error("Error fetching enquiries:", error);
      } finally {
        setEnquiriesLoading(false);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          setProducts(data.filter((p: Product) => p.category));
        }
      } catch {
        // Products are optional — autocomplete just won't show suggestions
      }
    };

    fetchEnquiries();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (order) {
      setFormData({
        enquiryId: order.enquiryId || "",
        status: order.status || "draft",
        version: order.version || 1,
        totalPrice: order.totalPrice || "",
        items: order.items || [],
      });
    } else {
      setFormData({
        enquiryId: "",
        status: "draft",
        version: 1,
        totalPrice: "",
        items: [],
      });
    }
  }, [order, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleItemChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const items = [...(formData.items || [])];
    const item = items[index] as any;

    item[field] = value;

    // Recalculate total price if quantity or unit price changed
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      item.totalPrice = (quantity * unitPrice).toFixed(2);
    }

    setFormData((prev) => ({
      ...prev,
      items,
    }));
  };

  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: `new-${Date.now()}`,
      description: "",
      category: "",
      quantity: 1,
      unitPrice: "0.00",
      totalPrice: "0.00",
    };

    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const handleProductSelect = (index: number, product: Product) => {
    const items = [...(formData.items || [])];
    const item = items[index];
    if (!item) return;

    const unitPrice = product.retailPrice
      ? parseFloat(product.retailPrice)
      : 0;
    const quantity = parseFloat(String(item.quantity)) || 1;

    items[index] = {
      ...item,
      description: product.name + (product.colour ? ` — ${product.colour}` : ""),
      category: product.category || item.category,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: (quantity * unitPrice).toFixed(2),
    };

    setFormData((prev) => ({ ...prev, items }));
  };

  const handleRemoveItem = (index: number) => {
    const items = (formData.items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      items,
    }));
  };

  const calculateTotal = () => {
    return (formData.items || [])
      .reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0)
      .toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.enquiryId) {
      alert("Please select an enquiry");
      return;
    }

    const totalPrice = calculateTotal();

    setLoading(true);
    try {
      await onSave({
        ...formData,
        totalPrice,
      });
      onClose();
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const total = calculateTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-serif font-bold text-gray-900">
            {order ? "Edit Order" : "New Order"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enquiry *
              </label>
              {enquiriesLoading ? (
                <div className="text-gray-500 text-sm">Loading enquiries...</div>
              ) : (
                <select
                  name="enquiryId"
                  value={formData.enquiryId || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select an enquiry</option>
                  {enquiries.map((enquiry) => (
                    <option key={enquiry.id} value={enquiry.id}>
                      {enquiry.clientName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status || "draft"}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Version"
              name="version"
              type="number"
              value={formData.version || 1}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-semibold text-gray-900">
                Line Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {(formData.items || []).map((item, index) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <ProductAutocomplete
                        value={item.description}
                        products={products}
                        onChange={(val) =>
                          handleItemChange(index, "description", val)
                        }
                        onSelect={(product) =>
                          handleProductSelect(index, product)
                        }
                        placeholder="Search products or type freely..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={item.category || ""}
                        onChange={(e) =>
                          handleItemChange(index, "category", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
                      >
                        <option value="">Select</option>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            e.target.value ? parseFloat(e.target.value) : 0
                          )
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">£</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "unitPrice",
                              e.target.value ? parseFloat(e.target.value) : 0
                            )
                          }
                          step="0.01"
                          min="0"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-900">
                          £{parseFloat(item.totalPrice).toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(formData.items || []).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-end mb-6">
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Total Price</p>
                <p className="text-3xl font-serif font-bold text-[#1B4332]">
                  £{total}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
