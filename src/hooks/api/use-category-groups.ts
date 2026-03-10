import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CategoryGroup } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const categoryGroupKeys = {
  all: ['categoryGroups'] as const,
};

// ─── Transformer ─────────────────────────────────────────────────────

function transformCategoryGroup(raw: Record<string, unknown>): CategoryGroup {
  return {
    ...(raw as unknown as CategoryGroup),
    hidden: (raw.isHidden as boolean) ?? false,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all category groups. */
export function useCategoryGroups() {
  return useQuery({
    queryKey: categoryGroupKeys.all,
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>[]>('/api/category-groups');
      return data.map(transformCategoryGroup);
    },
  });
}

/** Create a new category group. */
export function useCreateCategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      icon?: string;
      order?: number;
      isDefault?: boolean;
    }) => api.post<Record<string, unknown>>('/api/category-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
    },
  });
}

/** Update a category group. */
export function useUpdateCategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      icon?: string;
      order?: number;
      isDefault?: boolean;
      isHidden?: boolean;
    }) => api.put<Record<string, unknown>>(`/api/category-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
    },
  });
}

/** Delete a category group. */
export function useDeleteCategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/category-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryGroupKeys.all });
    },
  });
}
