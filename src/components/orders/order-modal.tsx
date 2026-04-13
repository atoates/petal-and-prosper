"use client";

import React, { useId, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { ProductImage } from "@/components/ui/product-image";
import {
  ProductAutocomplete,
  type Bundle,
} from "./product-autocomplete";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { ORDER_STATUSES, type OrderStatus } from "@/types/orders";

interface OrderItem {
  id: string;
  description: string;
  category?: string;
  quantity: number;
  // What the florist paid for one unit, ex-VAT. When present, the
  // unit price is derived from this by applying the tenant's pricing
  // rules (markup multiple, flower buffer). When absent, the user
  // typed a unit price directly and we persist that as a manual
  // override.
  baseCost?: string;
  unitPrice: string;
  totalPrice: string;
  // Bundle grouping -- present when this item belongs to a bundle.
  // baseQuantity is the quantity from the bundle definition so that
  // changing the bundle multiplier can scale all items proportionally.
  bundleId?: string;
  bundleName?: string;
  baseQuantity?: number;
  // Product image for visual reference
  imageUrl?: string | null;
}

interface PricingRulesShape {
  multiple: number;
  flowerBuffer: number;
}

interface Order {
  id: string;
  enquiryId?: string;
  status: OrderStatus;
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
  imageUrl?: string | null;
}

interface OrderModalProps {
  isOpen: boolean;
  order?: Order | null;
  onClose: () => void;
  onSave: (order: Partial<Order>) => Promise<void>;
}

// Sourced from the shared ORDER_STATUSES constant so the modal
// dropdown, the colour map on the orders list, and the DB enum
// can't drift from each other again (#17).
const STATUS_OPTIONS = ORDER_STATUSES;
const CATEGORY_OPTIONS = [
  "flower",
  "foliage",
  "sundry",
  "container",
  "ribbon",
  "accessory",
];

const FLOWER_CATEGORIES = new Set(["flower", "foliage"]);

/**
 * Mirror of the server-side markup-for-category rule. We duplicate
 * the tiny calculation here so the modal can preview the marked-up
 * sell price as the user types, without round-tripping to the API
 * on every keystroke. The server always re-runs the calculation
 * authoritatively on save.
 */
function deriveUnitPrice(
  baseCost: number,
  category: string | undefined,
  rules: PricingRulesShape | null
): number {
  if (!rules) return baseCost;
  const cat = (category || "").toLowerCase();
  const markup = FLOWER_CATEGORIES.has(cat)
    ? rules.flowerBuffer * rules.multiple
    : rules.multiple;
  return Math.round(baseCost * markup * 100) / 100;
}

/** Reusable row for a single line item (standalone or inside a bundle). */
function LineItemRow({
  item,
  index,
  onItemChange,
  onRemove,
  compact,
}: {
  item: OrderItem;
  index: number;
  onItemChange: (index: number, field: string, value: string | number) => void;
  onRemove: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "border border-gray-200 rounded-lg p-4 space-y-3"
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <div className="flex items-center gap-1.5">
            {item.imageUrl && (
              <ProductImage
                imageUrl={item.imageUrl}
                name={item.description}
                category={item.category}
                iconSize={14}
              />
            )}
            <input
              type="text"
              value={item.description}
              onChange={(e) => onItemChange(index, "description", e.target.value)}
              placeholder="Item description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={item.category || ""}
            onChange={(e) =>
              onItemChange(index, "category", e.target.value)
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
              onItemChange(
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
          <label
            className="block text-xs font-medium text-gray-700 mb-1"
            title="What you pay for one unit. Sell price is derived from this."
          >
            Cost
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">£</span>
            <input
              type="number"
              value={item.baseCost || ""}
              onChange={(e) =>
                onItemChange(index, "baseCost", e.target.value)
              }
              step="0.01"
              min="0"
              placeholder="0.00"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
            />
          </div>
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
                onItemChange(
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
            onClick={() => onRemove(index)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderModal({ isOpen, order, onClose, onSave }: OrderModalProps) {
  const titleId = useId();
  const { dialogRef } = useModalA11y(isOpen, onClose);
  const [loading, setLoading] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [rules, setRules] = useState<PricingRulesShape | null>(null);
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

    const fetchBundles = async () => {
      try {
        const response = await fetch("/api/bundles");
        if (response.ok) {
          setBundles(await response.json());
        }
      } catch {
        // Bundles are optional
      }
    };

    // Fetch the tenant's pricing rules so the modal can preview
    // marked-up unit prices as the user types. If this fails we
    // degrade gracefully to "no markup" preview -- the server still
    // runs the real calculation on save.
    const fetchRules = async () => {
      try {
        const response = await fetch("/api/settings/pricing");
        if (response.ok) {
          const data = await response.json();
          const multiple = Number(data.multiple ?? 2.5);
          const flowerBuffer = Number(data.flowerBuffer ?? 1.15);
          setRules({
            multiple: Number.isFinite(multiple) ? multiple : 2.5,
            flowerBuffer: Number.isFinite(flowerBuffer) ? flowerBuffer : 1.15,
          });
        }
      } catch {
        // pricing rules are optional for preview purposes
      }
    };

    fetchEnquiries();
    fetchProducts();
    fetchBundles();
    fetchRules();
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

    // When the user types a base cost, auto-derive the marked-up unit
    // price using the tenant's rules (same calculation the server will
    // run on save). If they edit unitPrice directly we treat that as a
    // manual override and clear baseCost so the next save doesn't
    // silently re-apply markup on top.
    if (field === "baseCost" || field === "category" || field === "quantity") {
      const baseCost = parseFloat(item.baseCost);
      if (Number.isFinite(baseCost) && baseCost > 0) {
        const unitPrice = deriveUnitPrice(baseCost, item.category, rules);
        item.unitPrice = unitPrice.toFixed(2);
      }
    }
    if (field === "unitPrice") {
      // Manual override: wipe baseCost so the server persists the
      // typed unitPrice as-is rather than re-marking up.
      item.baseCost = "";
    }

    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    item.totalPrice = (quantity * unitPrice).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      items,
    }));
  };

  /** Add a product from the top-level search bar as a new line item. */
  const handleAddProduct = (product: Product) => {
    const baseCost = product.wholesalePrice
      ? parseFloat(product.wholesalePrice)
      : product.retailPrice
      ? parseFloat(product.retailPrice)
      : 0;
    const category = product.category || "";
    const unitPrice =
      baseCost > 0 ? deriveUnitPrice(baseCost, category, rules) : 0;
    const quantity = 1;

    const newItem: OrderItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: product.name + (product.colour ? ` - ${product.colour}` : ""),
      category,
      baseCost: baseCost > 0 ? baseCost.toFixed(2) : "",
      quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: (quantity * unitPrice).toFixed(2),
      imageUrl: product.imageUrl,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const handleBundleSelect = (bundle: Bundle) => {
    const bundleId = `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newItems: OrderItem[] = bundle.items.map((bi) => {
      // Use the linked product's wholesale price as base cost when available
      const prod = bi.product;
      const baseCost = prod?.wholesalePrice
        ? parseFloat(prod.wholesalePrice)
        : prod?.retailPrice
        ? parseFloat(prod.retailPrice)
        : 0;
      const category = bi.category || prod?.category || "";
      const unitPrice =
        baseCost > 0 ? deriveUnitPrice(baseCost, category, rules) : 0;
      const quantity = bi.quantity || 1;

      return {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description:
          prod
            ? prod.name + (prod.colour ? ` — ${prod.colour}` : "")
            : bi.description,
        category,
        baseCost: baseCost > 0 ? baseCost.toFixed(2) : "",
        quantity,
        baseQuantity: quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: (quantity * unitPrice).toFixed(2),
        bundleId,
        bundleName: bundle.name,
        imageUrl: prod?.imageUrl,
      };
    });

    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), ...newItems],
    }));

    toast.success(`Added ${bundle.name} (${newItems.length} items)`);
  };

  // Change the multiplier for every item in a bundle. The base
  // quantity (from the bundle definition) is scaled by the new
  // multiplier so that "2x" a bundle with 3 roses gives 6 roses.
  const handleBundleQuantityChange = (bundleId: string, multiplier: number) => {
    const items = [...(formData.items || [])].map((item) => {
      if (item.bundleId !== bundleId) return item;
      const baseQty = item.baseQuantity || item.quantity;
      const newQty = Math.max(1, Math.round(baseQty * multiplier));
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return {
        ...item,
        quantity: newQty,
        totalPrice: (newQty * unitPrice).toFixed(2),
      };
    });
    setFormData((prev) => ({ ...prev, items }));
  };

  // Remove all items belonging to a bundle
  const handleRemoveBundle = (bundleId: string) => {
    const items = (formData.items || []).filter(
      (item) => item.bundleId !== bundleId
    );
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
      toast.error("Please select an enquiry");
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
      toast.error("Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const total = calculateTotal();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2
            id={titleId}
            className="text-2xl font-serif font-bold text-gray-900"
          >
            {order ? "Edit Order" : "New Order"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
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
            <div className="mb-4">
              <h3 className="text-lg font-serif font-semibold text-gray-900 mb-3">
                Line Items
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProductAutocomplete
                    value=""
                    products={products}
                    bundles={bundles}
                    onChange={() => {}}
                    onSelect={handleAddProduct}
                    onSelectBundle={handleBundleSelect}
                    placeholder="Search products or bundles to add..."
                    clearOnSelect
                  />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Select to add
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const items = formData.items || [];
                // Group items: standalone items render individually,
                // bundle items are collected under their bundleId.
                const rendered: React.ReactNode[] = [];
                const seenBundles = new Set<string>();

                items.forEach((item, index) => {
                  // Standalone item (no bundle)
                  if (!item.bundleId) {
                    rendered.push(
                      <LineItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onItemChange={handleItemChange}
                        onRemove={handleRemoveItem}
                      />
                    );
                    return;
                  }

                  // Bundle group -- render once per bundleId
                  if (seenBundles.has(item.bundleId)) return;
                  seenBundles.add(item.bundleId);

                  const bundleItems = items
                    .map((bi, i) => ({ item: bi, index: i }))
                    .filter((bi) => bi.item.bundleId === item.bundleId);

                  const bundleTotal = bundleItems.reduce(
                    (sum, bi) => sum + parseFloat(bi.item.totalPrice || "0"),
                    0
                  );

                  // Work out the current multiplier from the first
                  // item's quantity vs its base quantity.
                  const firstItem = bundleItems[0].item;
                  const multiplier =
                    firstItem.baseQuantity && firstItem.baseQuantity > 0
                      ? firstItem.quantity / firstItem.baseQuantity
                      : 1;

                  const isExpanded = expandedBundles.has(item.bundleId);

                  rendered.push(
                    <div
                      key={item.bundleId}
                      className="border border-[#1B4332] border-opacity-30 rounded-lg overflow-hidden"
                    >
                      {/* Bundle header */}
                      <div className="bg-sage-50 px-4 py-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBundles((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.bundleId!)) {
                                next.delete(item.bundleId!);
                              } else {
                                next.add(item.bundleId!);
                              }
                              return next;
                            })
                          }
                          className="text-[#1B4332] hover:text-[#143826] transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        <Package size={16} className="text-[#1B4332]" />
                        <span className="text-sm font-semibold text-gray-900 flex-1">
                          {item.bundleName || "Bundle"}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-600">Qty</label>
                            <input
                              type="number"
                              value={multiplier}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val > 0 && item.bundleId) {
                                  handleBundleQuantityChange(
                                    item.bundleId,
                                    val
                                  );
                                }
                              }}
                              min="1"
                              step="1"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-500">
                            {bundleItems.length} items
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            £{bundleTotal.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              item.bundleId &&
                              handleRemoveBundle(item.bundleId)
                            }
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible bundle items */}
                      {isExpanded && (
                        <div className="p-4 space-y-3 border-t border-gray-200">
                          {bundleItems.map(({ item: bi, index: idx }) => (
                            <LineItemRow
                              key={bi.id}
                              item={bi}
                              index={idx}
                              onItemChange={handleItemChange}
                              onRemove={handleRemoveItem}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });

                return rendered.length > 0 ? (
                  rendered
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items added yet. Search for a product or bundle above to get started.</p>
                  </div>
                );
              })()}
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
