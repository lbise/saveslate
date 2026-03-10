import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ImportBatch } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const importBatchKeys = {
  all: ['importBatches'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all import batches. */
export function useImportBatches() {
  return useQuery({
    queryKey: importBatchKeys.all,
    queryFn: () => api.get<ImportBatch[]>('/api/import-batches'),
  });
}

/** Rename an import batch. */
export function useUpdateImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<ImportBatch>(`/api/import-batches/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importBatchKeys.all });
    },
  });
}

/** Delete an import batch and all its linked transactions. */
export function useDeleteImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/import-batches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importBatchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
