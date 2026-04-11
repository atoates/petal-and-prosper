"use client";

import React, { useState, useRef, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  wholesalePrice?: string;
  retailPrice?: string;
  colour?: string;
  unit?: string;
}

interface ProductAutocompleteProps {
  value: string;
  products: Product[];
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductAutocomplete({
  value,
  products,
  onChange,
  onSelect,
  placeholder = "Start typing to search products...",
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = value.length > 0
    ? products.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        (p.colour && p.colour.toLowerCase().includes(value.toLowerCase()))
      )
    : products;

  const showDropdown = isOpen && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [value]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      onSelect(filtered[highlightIndex]);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const formatPrice = (price?: string) => {
    if (!price) return "";
    return `£${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-colors text-sm"
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtered.map((product, idx) => (
            <li
              key={product.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(product);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                idx === highlightIndex
                  ? "bg-[#1B4332] bg-opacity-10 text-[#1B4332]"
                  : "hover:bg-gray-50 text-gray-900"
              }`}
            >
              <span className="font-medium truncate">
                {product.name}
                {product.colour && (
                  <span className="text-gray-500 font-normal"> — {product.colour}</span>
                )}
              </span>
              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                {product.category}
                {product.retailPrice && ` · ${formatPrice(product.retailPrice)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
