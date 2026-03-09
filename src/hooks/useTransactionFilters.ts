import { useState } from 'react';
import type { TransactionType } from '../types';

export type SortField = 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

interface UseTransactionFiltersOptions {
  initialTypeFilter?: TransactionType | 'all';
  initialCategoryFilterIds?: string[];
  initialTagFilterIds?: string[];
  initialSourceFilterIds?: string[];
  initialGoalFilterIds?: string[];
  initialAccountFilterIds?: string[];
}

interface UseTransactionFiltersReturn {
  // Basic filters
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  typeFilter: TransactionType | 'all';
  setTypeFilter: React.Dispatch<React.SetStateAction<TransactionType | 'all'>>;
  categoryFilterIds: string[];
  setCategoryFilterIds: React.Dispatch<React.SetStateAction<string[]>>;
  tagFilterIds: string[];
  setTagFilterIds: React.Dispatch<React.SetStateAction<string[]>>;
  sourceFilterIds: string[];
  setSourceFilterIds: React.Dispatch<React.SetStateAction<string[]>>;
  showUncategorizedOnly: boolean;
  setShowUncategorizedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  sortField: SortField;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  sortDirection: SortDirection;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;

  // Advanced filters
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  goalFilterIds: string[];
  setGoalFilterIds: React.Dispatch<React.SetStateAction<string[]>>;
  accountFilterIds: string[];
  setAccountFilterIds: React.Dispatch<React.SetStateAction<string[]>>;
  dateFrom: string;
  setDateFrom: React.Dispatch<React.SetStateAction<string>>;
  dateTo: string;
  setDateTo: React.Dispatch<React.SetStateAction<string>>;
  amountMin: string;
  setAmountMin: React.Dispatch<React.SetStateAction<string>>;
  amountMax: string;
  setAmountMax: React.Dispatch<React.SetStateAction<string>>;

  // Derived values
  advancedFilterCount: number;
  hasAnyFilter: boolean;
  clearAllFilters: () => void;
  toggleSort: (field: SortField) => void;
}

export function useTransactionFilters(
  options: UseTransactionFiltersOptions = {},
): UseTransactionFiltersReturn {
  const {
    initialTypeFilter = 'all',
    initialCategoryFilterIds = [],
    initialTagFilterIds = [],
    initialSourceFilterIds = [],
    initialGoalFilterIds = [],
    initialAccountFilterIds = [],
  } = options;

  // Basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>(initialTypeFilter);
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[]>(initialCategoryFilterIds);
  const [tagFilterIds, setTagFilterIds] = useState<string[]>(initialTagFilterIds);
  const [sourceFilterIds, setSourceFilterIds] = useState<string[]>(initialSourceFilterIds);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [goalFilterIds, setGoalFilterIds] = useState<string[]>(initialGoalFilterIds);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>(initialAccountFilterIds);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Derived values
  const advancedFilterCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (amountMin ? 1 : 0) +
    (amountMax ? 1 : 0);

  const hasAnyFilter =
    categoryFilterIds.length > 0 ||
    tagFilterIds.length > 0 ||
    sourceFilterIds.length > 0 ||
    goalFilterIds.length > 0 ||
    accountFilterIds.length > 0 ||
    typeFilter !== 'all' ||
    searchQuery !== '' ||
    advancedFilterCount > 0;

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilterIds([]);
    setTagFilterIds([]);
    setSourceFilterIds([]);
    setGoalFilterIds([]);
    setAccountFilterIds([]);
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setShowUncategorizedOnly(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categoryFilterIds,
    setCategoryFilterIds,
    tagFilterIds,
    setTagFilterIds,
    sourceFilterIds,
    setSourceFilterIds,
    showUncategorizedOnly,
    setShowUncategorizedOnly,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    showAdvancedFilters,
    setShowAdvancedFilters,
    goalFilterIds,
    setGoalFilterIds,
    accountFilterIds,
    setAccountFilterIds,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    advancedFilterCount,
    hasAnyFilter,
    clearAllFilters,
    toggleSort,
  };
}
