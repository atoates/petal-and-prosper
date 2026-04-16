"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (next: number) => void;
}

/**
 * Compact page-navigator used under server-paginated tables on the
 * dashboard. Keeps its own styling decisions out of the parent so the
 * three list pages (orders / contacts / invoices) stay visually
 * consistent without copy-pasting the same <nav> every time.
 */
export function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationControlsProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 py-3 text-sm text-gray-600"
    >
      <span>
        {total === 0
          ? "No results"
          : `Showing ${start}–${end} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="px-3 text-sm text-gray-500">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
