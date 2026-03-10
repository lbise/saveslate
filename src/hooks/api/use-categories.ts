import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Category } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const categoryKeys = {
  all: ['categories'] as const,
  list: (visible?: boolean) => ['categories', { visible }] as const,
};

// ─── Transformer ─────────────────────────────────────────────────────

function transformCategory(raw: Record<string, unknown>): Category {
  return {
    ...(raw as unknown as Category),
    // API returns isHidden, frontend uses hidden
    hidden: (raw.isHidden as boolean) ?? false,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all categories, optionally filtered to visible only. */
export function useCategories(visible?: boolean) {
  return useQuery({
    queryKey: categoryKeys.list(visible),
    queryFn: async () => {
      const params = visible !== undefined ? { visible } : undefined;
      const data = await api.get<Record<string, unknown>[]>('/api/categories', params);
      return data.map(transformCategory);
    },
  });
}

/** Create a new category. */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      icon?: string;
      groupId?: string;
      isDefault?: boolean;
    }) => api.post<Record<string, unknown>>('/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Update a category. */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      icon?: string;
      groupId?: string;
      isDefault?: boolean;
      isHidden?: boolean;
    }) => api.put<Record<string, unknown>>(`/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Delete a category. */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Seed preset categories (minimal or full). Used during onboarding. */
export function useSeedCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preset: 'minimal' | 'full') =>
      api.post<Record<string, unknown>[]>('/api/categories/seed', { preset }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['categoryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
