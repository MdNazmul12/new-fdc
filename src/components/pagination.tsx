'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className = ''
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center space-x-2 text-xs text-[var(--muted-foreground)] ${className}`}>
      <span>Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-2.5 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === -1 ? 'All' : opt}
          </option>
        ))}
      </select>
      <span>entries</span>
    </div>
  );
}

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = ''
}: DataTablePaginationProps) {
  const from = totalItems === 0 ? 0 : pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1;
  const to = totalItems === 0 ? 0 : pageSize === -1 ? totalItems : Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]/70 text-xs ${className}`}>
      {/* Left: Entries info */}
      <div className="text-[var(--muted-foreground)] text-xs">
        Showing <span className="font-semibold text-[var(--foreground)]">{from}</span> to{' '}
        <span className="font-semibold text-[var(--foreground)]">{to}</span> of{' '}
        <span className="font-semibold text-[var(--foreground)]">{totalItems}</span> entries
      </div>

      {/* Right: Pagination buttons */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1 self-center sm:self-auto flex-wrap gap-y-1">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] bg-[var(--background)] hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center space-x-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Previous</span>
          </button>

          {/* Numbered buttons */}
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2.5 py-1 text-xs text-[var(--muted-foreground)] select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500'
                    : 'bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--accent)] hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] bg-[var(--background)] hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center space-x-1 cursor-pointer"
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable hook for client-side pagination
 */
export function usePagination<T>(items: T[], initialPageSize: number = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const paginatedItems = useMemo(() => {
    if (pageSize === -1) return items;
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalPages,
    totalItems,
    paginatedItems
  };
}
