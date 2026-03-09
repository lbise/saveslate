import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationButtonsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationButtons({ page, totalPages, onPageChange }: PaginationButtonsProps) {
  const isAtStart = page <= 0;
  const isAtEnd = page >= totalPages - 1;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(0)}
        disabled={isAtStart}
        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-dimmed"
        title="First page"
        aria-label="Go to first page"
      >
        <ChevronsLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={isAtStart}
        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-dimmed"
        title="Previous page"
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={isAtEnd}
        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-dimmed"
        title="Next page"
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(totalPages - 1, 0))}
        disabled={isAtEnd}
        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-dimmed"
        title="Last page"
        aria-label="Go to last page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
