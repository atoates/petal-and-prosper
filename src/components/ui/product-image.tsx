"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Info, X, ImageOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductImageProps {
  /** URL of the product image. If falsy, shows a placeholder. */
  imageUrl?: string | null;
  /** Product name shown in the popover title. */
  name: string;
  /** Optional extra details shown beneath the image. */
  category?: string | null;
  colour?: string | null;
  season?: string | null;
  supplier?: string | null;
  /** Size of the trigger icon (default 15). */
  iconSize?: number;
  /** When true, renders an inline thumbnail instead of the info icon. */
  showThumbnail?: boolean;
  /** Thumbnail width/height in pixels (default 32). */
  thumbnailSize?: number;
}

/* ------------------------------------------------------------------ */
/*  Thumbnail sub-component                                            */
/* ------------------------------------------------------------------ */

function Thumbnail({
  src,
  alt,
  size = 32,
}: {
  src?: string | null;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  const rounding = size >= 48 ? "rounded-lg" : "rounded";

  if (!src || failed) {
    return (
      <div
        className={`${rounding} bg-gray-100 flex items-center justify-center shrink-0`}
        style={{ width: size, height: size }}
      >
        <ImageOff size={size * 0.4} className="text-gray-300" />
      </div>
    );
  }

  // `unoptimized` keeps the component source-agnostic: product
  // images come from internal /api routes, OpenAI's CDN, and
  // occasionally user-pasted URLs, so we skip the Next.js image
  // optimiser rather than maintain an exhaustive remotePatterns
  // list. We still get native lazy-loading and explicit dimensions
  // to prevent layout shift on list pages.
  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      width={size}
      height={size}
      unoptimized
      className={`${rounding} object-cover shrink-0`}
      style={{ width: size, height: size }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * ProductImage renders either:
 *  - A small info icon (default) that opens a popover with the full
 *    product image and details on click.
 *  - An inline thumbnail (when `showThumbnail` is true) that also
 *    opens the popover on click.
 *
 * The popover is portal-free and positions itself relative to the
 * trigger, closing on outside click or Escape.
 */
export function ProductImage({
  imageUrl,
  name,
  category,
  colour,
  season,
  supplier,
  iconSize = 15,
  showThumbnail = false,
  thumbnailSize = 32,
}: ProductImageProps) {
  const [open, setOpen] = useState(false);
  const [popoverImageFailed, setPopoverImageFailed] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Position the popover relative to the trigger's bounding box in the
  // viewport. Using position:fixed + a portal avoids getting clipped by
  // an ancestor with overflow:hidden (e.g. the order modal body).
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 288; // matches w-72
    const viewportWidth = window.innerWidth;
    const gap = 8;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    // Keep within viewport
    if (left < gap) left = gap;
    if (left + popoverWidth > viewportWidth - gap) {
      left = viewportWidth - popoverWidth - gap;
    }
    const top = rect.bottom + gap;
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(e.target as Node) &&
      triggerRef.current &&
      !triggerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClickOutside, handleKeyDown]);

  const details = [
    category && { label: "Category", value: category },
    colour && { label: "Colour", value: colour },
    season && { label: "Season", value: season },
    supplier && { label: "Supplier", value: supplier },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <span className="relative inline-flex items-center">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => {
            if (!prev) setPopoverImageFailed(false);
            return !prev;
          });
        }}
        className={
          showThumbnail
            ? "rounded hover:ring-2 hover:ring-[#1B4332]/20 transition-all cursor-pointer"
            : "text-gray-400 hover:text-[#1B4332] transition-colors cursor-pointer p-0.5 rounded hover:bg-gray-100"
        }
        title={`View ${name}`}
        aria-label={`View image for ${name}`}
      >
        {showThumbnail ? (
          <Thumbnail src={imageUrl} alt={name} size={thumbnailSize} />
        ) : (
          <Info size={iconSize} />
        )}
      </button>

      {/* Popover — rendered in a portal with fixed positioning so it
          escapes modal clipping and overflow ancestors. */}
      {open && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          className="z-[9999] w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>

          {/* Image area */}
          {imageUrl && !popoverImageFailed ? (
            <div className="w-full aspect-square bg-gray-50 relative overflow-hidden">
              <Image
                src={imageUrl}
                alt={name}
                fill
                sizes="288px"
                unoptimized
                className="object-cover"
                onError={() => setPopoverImageFailed(true)}
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <ImageOff size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs">
                  {imageUrl ? "Image unavailable" : "No image available"}
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-3">
            <h4 className="font-semibold text-sm text-gray-900 mb-1 leading-tight">
              {name}
            </h4>
            {details.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {details.map((d) => (
                  <div key={d.label} className="text-xs">
                    <span className="text-gray-400">{d.label}:</span>{" "}
                    <span className="text-gray-600 capitalize">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}

/**
 * Standalone thumbnail component for use in tables and lists.
 * Does not include the popover behaviour.
 */
export function ProductThumbnail({
  src,
  alt,
  size = 32,
}: {
  src?: string | null;
  alt: string;
  size?: number;
}) {
  return <Thumbnail src={src} alt={alt} size={size} />;
}
