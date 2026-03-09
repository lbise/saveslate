import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(0)}
        disabled={isAtStart}
        className="size-6 text-dimmed"
        title="First page"
        aria-label="Go to first page"
      >
        <ChevronsLeft size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={isAtStart}
        className="size-6 text-dimmed"
        title="Previous page"
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={isAtEnd}
        className="size-6 text-dimmed"
        title="Next page"
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(Math.max(totalPages - 1, 0))}
        disabled={isAtEnd}
        className="size-6 text-dimmed"
        title="Last page"
        aria-label="Go to last page"
      >
        <ChevronsRight size={16} />
      </Button>
    </div>
  );
}
