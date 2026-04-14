"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Package, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  category: string;
  colour?: string;
}

interface BundleItemShape {
  id?: string;
  productId?: string | null;
  description: string;
  category?: string | null;
  quantity: number;
  product?: Product | null;
}

interface Bundle {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  items: BundleItemShape[];
}

interface BundleFormItem {
  key: string;
  productId: string;
  description: string;
  category: string;
  quantity: number;
}

const BUNDLE_CATEGORY_OPTIONS = [
  { value: "flower", label: "Flower" },
  { value: "foliage", label: "Foliage" },
  { value: "sundry", label: "Sundry" },
  { value: "container", label: "Container" },
  { value: "ribbon", label: "Ribbon" },
  { value: "accessory", label: "Accessory" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BundleModalProps {
  isOpen: boolean;
  bundle: Bundle | null;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

export function BundleModal({
  isOpen,
  bundle,
  products,
  onClose,
  onSaved,
}: BundleModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    items: [] as BundleFormItem[],
  });
  const [submitting, setSubmitting] = useState(false);

  // Group products by category for the selector optgroups
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      const cat = p.category || "other";
      (map[cat] ??= []).push(p);
    }
    return map;
  }, [products]);

  // Populate form when editing an existing bundle
  useEffect(() => {
    if (bundle) {
      setForm({
        name: bundle.name,
        description: bundle.description || "",
        items: bundle.items.map((bi, i) => ({
          key: `existing-${i}`,
          productId: bi.productId || "",
          description: bi.description,
          category: bi.category || "",
          quantity: bi.quantity,
        })),
      });
    } else {
      setForm({ name: "", description: "", items: [] });
    }
  }, [bundle, isOpen]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: `new-${Date.now()}-${prev.items.length}`,
          productId: "",
          description: "",
          category: "",
          quantity: 1,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };

      // When a product is selected, auto-fill description and category
      if (field === "productId" && typeof value === "string" && value) {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.description = prod.name + (prod.colour ? ` - ${prod.colour}` : "");
          item.category = prod.category || "";
        }
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Bundle name is required");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Add at least one item to the bundle");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        items: form.items
          .filter((i) => i.description.trim())
          .map((i) => ({
            productId: i.productId || null,
            description: i.description.trim(),
            category: i.category || null,
            quantity: i.quantity,
          })),
      };

      const url = bundle
        ? `/api/bundles/${bundle.id}`
        : "/api/bundles";
      const method = bundle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save bundle");
      }

      toast.success(bundle ? "Bundle updated" : "Bundle created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save bundle"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-serif font-bold text-gray-900">
            {bundle ? "Edit Bundle" : "Create Bundle"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name and description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Bridal Bouquet"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="A short description of this arrangement"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Items builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Items ({form.items.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus size={14} />
                Add item
              </Button>
            </div>

            {form.items.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <Package size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Add products to this bundle
                </p>
              </div>
            )}

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div
                  key={item.key}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Product
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, "productId", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      >
                        <option value="">Select product (or type below)</option>
                        {Object.entries(productsByCategory).map(
                          ([cat, prods]) => (
                            <optgroup
                              key={cat}
                              label={
                                BUNDLE_CATEGORY_OPTIONS.find(
                                  (c) => c.value === cat
                                )?.label || cat
                              }
                            >
                              {prods.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.colour ? ` - ${p.colour}` : ""}
                                </option>
                              ))}
                            </optgroup>
                          )
                        )}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder="Item name"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Category
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(index, "category", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      >
                        <option value="">-</option>
                        {BUNDLE_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Qty
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>

                    <div className="col-span-1 flex items-end justify-center pb-0.5">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                        aria-label={`Remove item ${item.description || index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : bundle
              ? "Update Bundle"
              : "Create Bundle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
