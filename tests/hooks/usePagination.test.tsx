import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from '../../src/hooks';

describe('usePagination', () => {
  it('initialises with page 0 and pageSize 20', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(20);
  });

  it('exposes pageSizes as [20, 50, 100]', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 0 }));

    expect(result.current.pageSizes).toEqual([20, 50, 100]);
  });

  it('calculates totalPages correctly (100 items / 20 per page = 5)', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    expect(result.current.totalPages).toBe(5);
  });

  it('returns totalPages = 1 when totalItems is 0', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 0 }));

    expect(result.current.totalPages).toBe(1);
  });

  it('rounds totalPages up (21 items / 20 per page = 2)', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 21 }));

    expect(result.current.totalPages).toBe(2);
  });

  it('updates page via setPage', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });

  it('updates pageSize via setPageSize and recalculates totalPages', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    expect(result.current.totalPages).toBe(5); // 100 / 20

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.pageSize).toBe(50);
    expect(result.current.totalPages).toBe(2); // 100 / 50
  });

  it('recalculates totalPages when totalItems prop changes', () => {
    const { result, rerender } = renderHook(
      ({ totalItems }) => usePagination({ totalItems }),
      { initialProps: { totalItems: 100 } },
    );

    expect(result.current.totalPages).toBe(5); // 100 / 20

    rerender({ totalItems: 40 });

    expect(result.current.totalPages).toBe(2); // 40 / 20
  });
});
