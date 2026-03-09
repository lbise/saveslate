import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTransactionFilters } from '../../src/hooks';

describe('useTransactionFilters', () => {
  describe('default initial state', () => {
    it('returns all filters at their defaults', () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.typeFilter).toBe('all');
      expect(result.current.categoryFilterIds).toEqual([]);
      expect(result.current.tagFilterIds).toEqual([]);
      expect(result.current.sourceFilterIds).toEqual([]);
      expect(result.current.goalFilterIds).toEqual([]);
      expect(result.current.accountFilterIds).toEqual([]);
      expect(result.current.showUncategorizedOnly).toBe(false);
      expect(result.current.sortField).toBe('date');
      expect(result.current.sortDirection).toBe('desc');
      expect(result.current.showAdvancedFilters).toBe(false);
      expect(result.current.dateFrom).toBe('');
      expect(result.current.dateTo).toBe('');
      expect(result.current.amountMin).toBe('');
      expect(result.current.amountMax).toBe('');
    });

    it('has hasAnyFilter as false', () => {
      const { result } = renderHook(() => useTransactionFilters());
      expect(result.current.hasAnyFilter).toBe(false);
    });

    it('has advancedFilterCount as 0', () => {
      const { result } = renderHook(() => useTransactionFilters());
      expect(result.current.advancedFilterCount).toBe(0);
    });
  });

  describe('initial options', () => {
    it('applies initialTypeFilter', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialTypeFilter: 'expense' }),
      );
      expect(result.current.typeFilter).toBe('expense');
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies initialCategoryFilterIds', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialCategoryFilterIds: ['cat-1', 'cat-2'] }),
      );
      expect(result.current.categoryFilterIds).toEqual(['cat-1', 'cat-2']);
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies initialTagFilterIds', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialTagFilterIds: ['tag-1'] }),
      );
      expect(result.current.tagFilterIds).toEqual(['tag-1']);
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies initialSourceFilterIds', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialSourceFilterIds: ['src-1'] }),
      );
      expect(result.current.sourceFilterIds).toEqual(['src-1']);
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies initialGoalFilterIds', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialGoalFilterIds: ['goal-1'] }),
      );
      expect(result.current.goalFilterIds).toEqual(['goal-1']);
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies initialAccountFilterIds', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({ initialAccountFilterIds: ['acc-1'] }),
      );
      expect(result.current.accountFilterIds).toEqual(['acc-1']);
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('applies multiple initial options at once', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({
          initialTypeFilter: 'income',
          initialCategoryFilterIds: ['cat-1'],
          initialTagFilterIds: ['tag-1'],
          initialSourceFilterIds: ['src-1'],
          initialGoalFilterIds: ['goal-1'],
          initialAccountFilterIds: ['acc-1'],
        }),
      );

      expect(result.current.typeFilter).toBe('income');
      expect(result.current.categoryFilterIds).toEqual(['cat-1']);
      expect(result.current.tagFilterIds).toEqual(['tag-1']);
      expect(result.current.sourceFilterIds).toEqual(['src-1']);
      expect(result.current.goalFilterIds).toEqual(['goal-1']);
      expect(result.current.accountFilterIds).toEqual(['acc-1']);
      expect(result.current.hasAnyFilter).toBe(true);
    });
  });

  describe('hasAnyFilter', () => {
    it('is true when searchQuery is set', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setSearchQuery('rent'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when typeFilter is not all', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setTypeFilter('expense'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when categoryFilterIds is non-empty', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setCategoryFilterIds(['cat-1']));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when tagFilterIds is non-empty', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setTagFilterIds(['tag-1']));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when sourceFilterIds is non-empty', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setSourceFilterIds(['src-1']));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when goalFilterIds is non-empty', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setGoalFilterIds(['goal-1']));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when accountFilterIds is non-empty', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setAccountFilterIds(['acc-1']));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when dateFrom is set', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setDateFrom('2025-01-01'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when dateTo is set', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setDateTo('2025-12-31'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when amountMin is set', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setAmountMin('100'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is true when amountMax is set', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setAmountMax('5000'));
      expect(result.current.hasAnyFilter).toBe(true);
    });

    it('is false when all filters are at defaults', () => {
      const { result } = renderHook(() => useTransactionFilters());
      expect(result.current.hasAnyFilter).toBe(false);
    });
  });

  describe('advancedFilterCount', () => {
    it('counts dateFrom as 1', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setDateFrom('2025-01-01'));
      expect(result.current.advancedFilterCount).toBe(1);
    });

    it('counts dateTo as 1', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setDateTo('2025-12-31'));
      expect(result.current.advancedFilterCount).toBe(1);
    });

    it('counts amountMin as 1', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setAmountMin('50'));
      expect(result.current.advancedFilterCount).toBe(1);
    });

    it('counts amountMax as 1', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setAmountMax('1000'));
      expect(result.current.advancedFilterCount).toBe(1);
    });

    it('counts all four advanced filters', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => {
        result.current.setDateFrom('2025-01-01');
        result.current.setDateTo('2025-12-31');
        result.current.setAmountMin('50');
        result.current.setAmountMax('1000');
      });
      expect(result.current.advancedFilterCount).toBe(4);
    });

    it('counts partial advanced filters correctly', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => {
        result.current.setDateFrom('2025-03-01');
        result.current.setAmountMax('500');
      });
      expect(result.current.advancedFilterCount).toBe(2);
    });

    it('does not count non-advanced filters', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => {
        result.current.setSearchQuery('groceries');
        result.current.setTypeFilter('expense');
        result.current.setCategoryFilterIds(['cat-1']);
      });
      expect(result.current.advancedFilterCount).toBe(0);
    });
  });

  describe('clearAllFilters', () => {
    it('resets all filters to defaults', () => {
      const { result } = renderHook(() =>
        useTransactionFilters({
          initialTypeFilter: 'income',
          initialCategoryFilterIds: ['cat-1'],
          initialTagFilterIds: ['tag-1'],
          initialSourceFilterIds: ['src-1'],
          initialGoalFilterIds: ['goal-1'],
          initialAccountFilterIds: ['acc-1'],
        }),
      );

      // Set additional filters
      act(() => {
        result.current.setSearchQuery('salary');
        result.current.setDateFrom('2025-01-01');
        result.current.setDateTo('2025-12-31');
        result.current.setAmountMin('100');
        result.current.setAmountMax('5000');
        result.current.setShowUncategorizedOnly(true);
      });

      expect(result.current.hasAnyFilter).toBe(true);

      act(() => result.current.clearAllFilters());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.typeFilter).toBe('all');
      expect(result.current.categoryFilterIds).toEqual([]);
      expect(result.current.tagFilterIds).toEqual([]);
      expect(result.current.sourceFilterIds).toEqual([]);
      expect(result.current.goalFilterIds).toEqual([]);
      expect(result.current.accountFilterIds).toEqual([]);
      expect(result.current.dateFrom).toBe('');
      expect(result.current.dateTo).toBe('');
      expect(result.current.amountMin).toBe('');
      expect(result.current.amountMax).toBe('');
      expect(result.current.showUncategorizedOnly).toBe(false);
      expect(result.current.hasAnyFilter).toBe(false);
      expect(result.current.advancedFilterCount).toBe(0);
    });

    it('does not reset sort settings', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.setSortField('amount');
        result.current.setSortDirection('asc');
      });

      act(() => result.current.clearAllFilters());

      expect(result.current.sortField).toBe('amount');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('does not reset showAdvancedFilters', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.setShowAdvancedFilters(true));
      act(() => result.current.clearAllFilters());

      expect(result.current.showAdvancedFilters).toBe(true);
    });
  });

  describe('toggleSort', () => {
    it('defaults to date desc', () => {
      const { result } = renderHook(() => useTransactionFilters());
      expect(result.current.sortField).toBe('date');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('toggles direction when same field is toggled (desc -> asc)', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.toggleSort('date'));

      expect(result.current.sortField).toBe('date');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('toggles direction back (asc -> desc)', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('asc');

      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('desc');
    });

    it('cycles desc -> asc -> desc on repeated toggles', () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.sortDirection).toBe('desc');

      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('asc');

      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('desc');

      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('asc');
    });

    it('switches to a different field with desc direction', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.toggleSort('amount'));

      expect(result.current.sortField).toBe('amount');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('resets direction to desc when switching fields even if current is asc', () => {
      const { result } = renderHook(() => useTransactionFilters());

      // Toggle date to asc
      act(() => result.current.toggleSort('date'));
      expect(result.current.sortDirection).toBe('asc');

      // Switch to amount — should reset to desc
      act(() => result.current.toggleSort('amount'));
      expect(result.current.sortField).toBe('amount');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('can toggle the new field after switching', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.toggleSort('amount'));
      expect(result.current.sortField).toBe('amount');
      expect(result.current.sortDirection).toBe('desc');

      act(() => result.current.toggleSort('amount'));
      expect(result.current.sortField).toBe('amount');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('can switch back to original field', () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => result.current.toggleSort('amount'));
      act(() => result.current.toggleSort('date'));

      expect(result.current.sortField).toBe('date');
      expect(result.current.sortDirection).toBe('desc');
    });
  });

  describe('individual setters', () => {
    it('updates searchQuery', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setSearchQuery('test'));
      expect(result.current.searchQuery).toBe('test');
    });

    it('updates typeFilter', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setTypeFilter('transfer'));
      expect(result.current.typeFilter).toBe('transfer');
    });

    it('updates showUncategorizedOnly', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setShowUncategorizedOnly(true));
      expect(result.current.showUncategorizedOnly).toBe(true);
    });

    it('updates showAdvancedFilters', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setShowAdvancedFilters(true));
      expect(result.current.showAdvancedFilters).toBe(true);
    });

    it('supports functional updates on setSearchQuery', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setSearchQuery('hello'));
      act(() => result.current.setSearchQuery((prev) => prev + ' world'));
      expect(result.current.searchQuery).toBe('hello world');
    });

    it('supports functional updates on setCategoryFilterIds', () => {
      const { result } = renderHook(() => useTransactionFilters());
      act(() => result.current.setCategoryFilterIds(['a']));
      act(() => result.current.setCategoryFilterIds((prev) => [...prev, 'b']));
      expect(result.current.categoryFilterIds).toEqual(['a', 'b']);
    });
  });
});
