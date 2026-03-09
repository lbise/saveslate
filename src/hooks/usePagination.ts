import { useMemo, useState } from 'react';

const PAGE_SIZES = [20, 50, 100] as const;

interface UsePaginationOptions {
  totalItems: number;
}

interface UsePaginationReturn {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  pageSizes: readonly number[];
}

export function usePagination({ totalItems }: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pageSizes: PAGE_SIZES,
  };
}
