import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CsvParser } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const csvParserKeys = {
  all: ['csvParsers'] as const,
  detail: (id: string) => ['csvParsers', id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all CSV parsers. */
export function useCsvParsers() {
  return useQuery({
    queryKey: csvParserKeys.all,
    queryFn: () => api.get<CsvParser[]>('/api/csv-parsers'),
  });
}

/** Get a single CSV parser by ID. */
export function useCsvParser(id: string | undefined) {
  return useQuery({
    queryKey: csvParserKeys.detail(id!),
    queryFn: () => api.get<CsvParser>(`/api/csv-parsers/${id}`),
    enabled: !!id,
  });
}

/** Create a new CSV parser. */
export function useCreateCsvParser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; config: Record<string, unknown> }) =>
      api.post<CsvParser>('/api/csv-parsers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csvParserKeys.all });
    },
  });
}

/** Update a CSV parser. */
export function useUpdateCsvParser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; config?: Record<string, unknown> }) =>
      api.put<CsvParser>(`/api/csv-parsers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csvParserKeys.all });
      queryClient.invalidateQueries({ queryKey: csvParserKeys.detail(variables.id) });
    },
  });
}

/** Delete a CSV parser. */
export function useDeleteCsvParser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/csv-parsers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csvParserKeys.all });
    },
  });
}
