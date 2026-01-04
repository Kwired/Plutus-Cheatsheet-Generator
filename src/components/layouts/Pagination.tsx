// import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  siblingCount?: number; // how many pages to show around current
};

function range(from: number, to: number) {
  const res = [];
  for (let i = from; i <= to; i++) res.push(i);
  return res;
}

/**
 * Simple pagination rendering with ellipsis.
 */
export default function Pagination({
  total,
  page,
  perPage,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  if (totalPages === 1) {
    return (
      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <div>Showing {start} to {end} of {total} results</div>
        <nav aria-label="Pagination" />
      </div>
    );
  }

  // build pagination window (with ellipsis)
  const pages: Array<number | "left-ellipsis" | "right-ellipsis"> = [];
  const left = Math.max(1, page - siblingCount);
  const right = Math.min(totalPages, page + siblingCount);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push("left-ellipsis");
  }

  pages.push(...range(left, right));

  if (right < totalPages) {
    if (right < totalPages - 1) pages.push("right-ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="text-sm text-gray-600">
        Showing <span className="font-medium text-gray-900">{start}</span> to{" "}
        <span className="font-medium text-gray-900">{end}</span> of{" "}
        <span className="font-medium text-gray-900">{total}</span> results
      </div>

      <nav
        aria-label="Pagination"
        className="flex items-center justify-center space-x-2"
      >
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className={`inline-flex items-center px-3 py-2 rounded-md border ${
            page === 1
              ? "text-gray-400 border-gray-200 bg-white cursor-not-allowed"
              : "text-gray-700 border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center space-x-2">
          {pages.map((p, idx) => {
            if (p === "left-ellipsis" || p === "right-ellipsis") {
              return (
                <span
                  key={`${p}-${idx}`}
                  className="px-3 py-2 text-sm text-gray-500"
                >
                  …
                </span>
              );
            }
            const num = p as number;
            const active = num === page;
            return (
              <button
                key={num}
                onClick={() => onPageChange(num)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center justify-center min-w-[36px] h-9 px-3 rounded-md text-sm border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className={`inline-flex items-center px-3 py-2 rounded-md border ${
            page === totalPages
              ? "text-gray-400 border-gray-200 bg-white cursor-not-allowed"
              : "text-gray-700 border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
