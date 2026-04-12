"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, ChevronLeft, Package, Search } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  category: string;
  wholesalePrice?: string;
  retailPrice?: string;
  colour?: string;
  unit?: string;
}

export interface BundleItem {
  id: string;
  productId?: string | null;
  description: string;
  category?: string | null;
  quantity: number;
  product?: Product | null;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string | null;
  items: BundleItem[];
}

interface ProductAutocompleteProps {
  value: string;
  products: Product[];
  bundles?: Bundle[];
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  onSelectBundle?: (bundle: Bundle) => void;
  placeholder?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  flower: "Flowers",
  foliage: "Foliage",
  sundry: "Sundries",
  container: "Containers",
  ribbon: "Ribbons",
  accessory: "Accessories",
  _bundles: "Bundles",
};

const CATEGORY_ORDER = [
  "flower",
  "foliage",
  "sundry",
  "container",
  "ribbon",
  "accessory",
];

export function ProductAutocomplete({
  value,
  products,
  bundles = [],
  onChange,
  onSelect,
  onSelectBundle,
  placeholder = "Search products or type freely...",
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep the search input focused whenever the dropdown is open
  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  // Build the category list with counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const cat = p.category?.toLowerCase() || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const cats = CATEGORY_ORDER.filter((c) => counts[c]).map((c) => ({
      key: c,
      label: CATEGORY_LABELS[c] || c,
      count: counts[c],
    }));

    // Add Bundles as a top-level category if any exist
    if (bundles.length > 0) {
      cats.push({
        key: "_bundles",
        label: "Bundles",
        count: bundles.length,
      });
    }

    return cats;
  }, [products, bundles]);

  // Filter products based on search term and active category
  const filteredProducts = useMemo(() => {
    // When browsing bundles, no products shown
    if (activeCategory === "_bundles") return [];

    let list = products;

    if (activeCategory) {
      list = list.filter(
        (p) => p.category?.toLowerCase() === activeCategory
      );
    }

    const term = searchTerm.trim().toLowerCase();
    if (term.length > 0) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.colour && p.colour.toLowerCase().includes(term)) ||
          (p.category && p.category.toLowerCase().includes(term))
      );
    }

    return list;
  }, [products, activeCategory, searchTerm]);

  // Filter bundles by search term
  const filteredBundles = useMemo(() => {
    // Show bundles when browsing the _bundles category, or when searching globally
    if (activeCategory && activeCategory !== "_bundles") return [];
    const term = searchTerm.trim().toLowerCase();
    if (term.length === 0) return bundles;
    return bundles.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term))
    );
  }, [bundles, searchTerm, activeCategory]);

  // Build a flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: "category"; key: string; label: string; count: number }
      | { type: "bundle"; bundle: Bundle }
      | { type: "product"; product: Product }
    > = [];

    // When no category is active and not searching, show category list
    if (!activeCategory && searchTerm.trim().length === 0) {
      for (const cat of categories) {
        items.push({ type: "category", ...cat });
      }
    } else if (activeCategory === "_bundles") {
      // Browsing bundles category
      for (const b of filteredBundles) {
        items.push({ type: "bundle", bundle: b });
      }
    } else {
      // Searching or inside a product category
      // Show matching bundles first when searching globally
      if (!activeCategory) {
        for (const b of filteredBundles) {
          items.push({ type: "bundle", bundle: b });
        }
      }
      for (const p of filteredProducts) {
        items.push({ type: "product", product: p });
      }
    }

    return items;
  }, [
    activeCategory,
    searchTerm,
    categories,
    filteredBundles,
    filteredProducts,
  ]);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when items change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [searchTerm, activeCategory]);

  // Focus the search input when the dropdown opens
  useEffect(() => {
    if (isOpen) {
      focusSearch();
    } else {
      setActiveCategory(null);
      setSearchTerm("");
    }
  }, [isOpen, focusSearch]);

  // Re-focus search when drilling into a category
  useEffect(() => {
    if (isOpen && activeCategory !== null) {
      focusSearch();
    }
  }, [activeCategory, isOpen, focusSearch]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      const item = flatItems[highlightIndex];
      if (item.type === "category") {
        setActiveCategory(item.key);
      } else if (item.type === "bundle") {
        onSelectBundle?.(item.bundle);
        setIsOpen(false);
      } else if (item.type === "product") {
        onSelect(item.product);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      if (activeCategory) {
        setActiveCategory(null);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Backspace" && searchTerm === "" && activeCategory) {
      setActiveCategory(null);
    }
  }

  const formatPrice = (price?: string) => {
    if (!price) return "";
    return `£${parseFloat(price).toFixed(2)}`;
  };

  const handleCategoryClick = (key: string) => {
    setActiveCategory(key);
    setSearchTerm("");
    focusSearch();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* The visible input shows the current item description */}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
          setSearchTerm(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        title={value}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
        autoComplete="off"
      />

      {isOpen && (
        <div
          className="absolute z-50 left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ width: "min(420px, 90vw)" }}
          onMouseDown={(e) => {
            // Prevent any click inside the dropdown from stealing focus
            // away from the search input and triggering a blur/close.
            e.preventDefault();
          }}
        >
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeCategory === "_bundles"
                    ? "Search bundles..."
                    : activeCategory
                    ? `Search ${CATEGORY_LABELS[activeCategory] || activeCategory}...`
                    : "Search all products..."
                }
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>

          {/* Breadcrumb when inside a category */}
          {activeCategory && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveCategory(null);
                setSearchTerm("");
                focusSearch();
              }}
              className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-[#1B4332] hover:bg-gray-50 border-b border-gray-100"
            >
              <ChevronLeft size={12} />
              Back to categories
            </button>
          )}

          {/* Scrollable items list */}
          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {flatItems.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No {activeCategory === "_bundles" ? "bundles" : "products"} found
              </div>
            )}

            {flatItems.map((item, idx) => {
              if (item.type === "category") {
                const isBundles = item.key === "_bundles";
                return (
                  <div
                    key={`cat-${item.key}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCategoryClick(item.key);
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm ${
                      idx === highlightIndex
                        ? "bg-[#1B4332] bg-opacity-10 text-[#1B4332]"
                        : "hover:bg-gray-50 text-gray-900"
                    }`}
                  >
                    <span className="font-medium capitalize flex items-center gap-2">
                      {isBundles && (
                        <Package size={14} className="text-[#1B4332]" />
                      )}
                      {item.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {item.count} {isBundles ? "bundles" : "items"}
                      <ChevronRight size={14} />
                    </span>
                  </div>
                );
              }

              if (item.type === "bundle") {
                const b = item.bundle;
                return (
                  <div
                    key={`bundle-${b.id}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectBundle?.(b);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`px-3 py-2.5 cursor-pointer text-sm ${
                      idx === highlightIndex
                        ? "bg-[#1B4332] bg-opacity-10 text-[#1B4332]"
                        : "hover:bg-gray-50 text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Package
                        size={14}
                        className="text-[#1B4332] shrink-0"
                      />
                      <span className="font-medium">{b.name}</span>
                      <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                        {b.items.length} items
                      </span>
                    </div>
                    {b.description && (
                      <p className="text-xs text-gray-500 mt-0.5 ml-6 line-clamp-1">
                        {b.description}
                      </p>
                    )}
                  </div>
                );
              }

              // product item
              const p = item.product;
              return (
                <div
                  key={`prod-${p.id}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(p);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between gap-2 ${
                    idx === highlightIndex
                      ? "bg-[#1B4332] bg-opacity-10 text-[#1B4332]"
                      : "hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <span className="font-medium min-w-0">
                    {p.name}
                    {p.colour && (
                      <span className="text-gray-500 font-normal">
                        {" "}&mdash; {p.colour}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {p.unit || "stem"}
                    {p.wholesalePrice &&
                      ` · ${formatPrice(p.wholesalePrice)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
