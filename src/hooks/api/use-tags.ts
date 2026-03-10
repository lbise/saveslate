import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Tag } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const tagKeys = {
  all: ['tags'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all tags. */
export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: () => api.get<Tag[]>('/api/tags'),
  });
}

/** Create a new tag. */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post<Tag>('/api/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/** Update a tag. */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.put<Tag>(`/api/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/** Delete a tag. */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
