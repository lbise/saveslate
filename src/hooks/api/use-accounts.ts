import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toNumber } from '@/lib/api-client';
import type { Account, AccountType } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: string) => ['accounts', id] as const,
};

// ─── Transformer ─────────────────────────────────────────────────────

function transformAccount(raw: Record<string, unknown>): Account {
  return {
    ...(raw as unknown as Account),
    balance: toNumber(raw.balance as string | number),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all accounts for the current user. */
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>[]>('/api/accounts');
      return data.map(transformAccount);
    },
  });
}

/** Get a single account by ID. */
export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: accountKeys.detail(id!),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>>(`/api/accounts/${id}`);
      return transformAccount(data);
    },
    enabled: !!id,
  });
}

/** Create a new account. */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      type: AccountType;
      balance?: number;
      currency?: string;
      icon?: string;
      accountIdentifier?: string;
    }) => api.post<Record<string, unknown>>('/api/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Update an existing account. */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      type?: AccountType;
      balance?: number;
      currency?: string;
      icon?: string;
      accountIdentifier?: string;
    }) => api.put<Record<string, unknown>>(`/api/accounts/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Delete an account. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
