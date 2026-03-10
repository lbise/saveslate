import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toNumber } from '@/lib/api-client';
import type { Transaction, PaginatedResponse } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  detail: (id: string) => ['transactions', id] as const,
};

// ─── Filter Types ────────────────────────────────────────────────────

export interface TransactionFilters {
  search?: string;
  type?: 'income' | 'expense' | 'transfer';
  accountId?: string;
  categoryId?: string;
  goalId?: string;
  tagIds?: string;
  importBatchId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ─── Transformer ─────────────────────────────────────────────────────

function transformTransaction(raw: Record<string, unknown>): Transaction {
  return {
    ...(raw as unknown as Transaction),
    amount: toNumber(raw.amount as string | number),
    // API returns splitInfo, frontend also supports split
    split: (raw.splitInfo as Transaction['split']) ?? (raw.split as Transaction['split']),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Fetch paginated transactions with filters. */
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const raw = await api.get<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/api/transactions', filters as Record<string, string | number | boolean | undefined>);
      return {
        items: raw.items.map(transformTransaction),
        total: raw.total,
        page: raw.page,
        pageSize: raw.pageSize,
        totalPages: raw.totalPages,
      } as PaginatedResponse<Transaction>;
    },
  });
}

/** Fetch a single transaction by ID. */
export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(id!),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>>(`/api/transactions/${id}`);
      return transformTransaction(data);
    },
    enabled: !!id,
  });
}

/** Create a single transaction. */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Transaction> & { description: string; date: string; accountId: string }) =>
      api.post<Record<string, unknown>>('/api/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Update an existing transaction. */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Transaction>) =>
      api.put<Record<string, unknown>>(`/api/transactions/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Delete a single transaction. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Bulk create transactions (e.g. from CSV import). */
export function useBulkCreateTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactions: Array<Partial<Transaction> & { description: string; date: string; accountId: string }>) =>
      api.post<Record<string, unknown>[]>('/api/transactions/bulk', { transactions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['importBatches'] });
    },
  });
}

/** Bulk delete transactions by ID list. */
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      api.delete('/api/transactions/bulk', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
