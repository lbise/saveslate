import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toNumber } from '@/lib/api-client';
import type { Goal } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const goalKeys = {
  all: ['goals'] as const,
  list: (archived?: boolean) => ['goals', { archived }] as const,
  detail: (id: string) => ['goals', id] as const,
};

// ─── Transformer ─────────────────────────────────────────────────────

function transformGoal(raw: Record<string, unknown>): Goal {
  return {
    ...(raw as unknown as Goal),
    startingAmount: toNumber(raw.startingAmount as string | number),
    targetAmount: toNumber(raw.targetAmount as string | number),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** List goals, optionally filtered by archived status. */
export function useGoals(archived?: boolean) {
  return useQuery({
    queryKey: goalKeys.list(archived),
    queryFn: async () => {
      const params = archived !== undefined ? { archived } : undefined;
      const data = await api.get<Record<string, unknown>[]>('/api/goals', params);
      return data.map(transformGoal);
    },
  });
}

/** Get a single goal by ID. */
export function useGoal(id: string | undefined) {
  return useQuery({
    queryKey: goalKeys.detail(id!),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>>(`/api/goals/${id}`);
      return transformGoal(data);
    },
    enabled: !!id,
  });
}

/** Create a new goal. */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      icon?: string;
      startingAmount?: number;
      targetAmount?: number;
      hasTarget?: boolean;
      expectedContribution?: { amount: number; frequency: 'weekly' | 'monthly' };
      deadline?: string;
      isArchived?: boolean;
    }) => api.post<Record<string, unknown>>('/api/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Update an existing goal. */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      description?: string;
      icon?: string;
      startingAmount?: number;
      targetAmount?: number;
      hasTarget?: boolean;
      expectedContribution?: { amount: number; frequency: 'weekly' | 'monthly' };
      deadline?: string;
      isArchived?: boolean;
    }) => api.put<Record<string, unknown>>(`/api/goals/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Delete a goal. */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
