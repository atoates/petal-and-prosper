"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track whether a mousedown originated inside the dropdown so we
  // can suppress the close-on-blur that would otherwise fire.
  const interactingRef = useRef(false);

  // Position state for the portal-based dropdown
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 420),
    });
  }, []);

  // Keep the search input focused whenever the dropdown is open.
  // We set interactingRef first so the main input's onBlur handler
  // knows focus is transferring internally and doesn't close the
  // dropdown.
  const focusSearch = useCallback(() => {
    interactingRef.current = true;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      // Clear the flag after a tick so future blur events from
      // genuine outside clicks are handled normally.
      requestAnimationFrame(() => {
        interactingRef.current = false;
      });
    });
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

    if (!activeCategory && searchTerm.trim().length === 0) {
      for (const cat of categories) {
        items.push({ type: "category", ...cat });
      }
    } else if (activeCategory === "_bundles") {
      for (const b of filteredBundles) {
        items.push({ type: "bundle", bundle: b });
      }
    } else {
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

  // Click-outside handler: close only if click is outside BOTH
  // the wrapper AND the portal dropdown.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inWrapper && !inDropdown) {
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
      updatePosition();
      focusSearch();
    } else {
      setActiveCategory(null);
      setSearchTerm("");
    }
  }, [isOpen, focusSearch, updatePosition]);

  // Re-focus search when drilling into a category
  useEffect(() => {
    if (isOpen && activeCategory !== null) {
      focusSearch();
    }
  }, [activeCategory, isOpen, focusSearch]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updatePosition]);

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

  // The dropdown is rendered via a portal so it escapes any
  // overflow:hidden / overflow:auto ancestor (e.g. the order modal).
  const dropdown = isOpen && typeof document !== "undefined" ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: Math.min(dropdownPos.width, window.innerWidth - 32),
        position: "absolute",
      }}
      onMouseDown={(e) => {
        // Prevent focus from leaving the search input when
        // clicking anywhere inside the dropdown.
        e.preventDefault();
        interactingRef.current = true;
      }}
      onMouseUp={() => {
        interactingRef.current = false;
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
            e.stopPropagation();
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
                  e.stopPropagation();
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
                  e.stopPropagation();
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
                e.stopPropagation();
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
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
          setSearchTerm(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // If focus is transferring to the dropdown (either via
          // click or programmatic focusSearch), interactingRef is
          // already set -- don't close.
          if (interactingRef.current) return;
          // Small delay to allow mousedown / focusSearch to set the
          // flag before we check.
          setTimeout(() => {
            if (!interactingRef.current) {
              setIsOpen(false);
            }
          }, 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        title={value}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}
