import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CsvParser } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const csvParserKeys = {
  all: ['csvParsers'] as const,
  detail: (id: string) => ['csvParsers', id] as const,
};

// ─── Transformers ────────────────────────────────────────────────────
// Backend stores parser settings in a nested `config` JSONB column.
// Frontend CsvParser type has those fields at the top level.

/** Top-level (non-config) fields on the API response. */
const META_FIELDS = new Set(['id', 'name', 'createdAt', 'updatedAt']);

/** API response shape after camelCase key conversion. */
interface ApiCsvParser {
  id: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Flatten API response: spread config fields to top level. */
function transformCsvParser(raw: ApiCsvParser): CsvParser {
  const { config, ...meta } = raw;
  return { ...meta, ...config } as CsvParser;
}

/** Extract config fields from a flat CsvParser for API write. */
export function toCsvParserConfig(parser: Partial<CsvParser>): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parser)) {
    if (!META_FIELDS.has(key) && value !== undefined) {
      config[key] = value;
    }
  }
  return config;
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all CSV parsers. */
export function useCsvParsers() {
  return useQuery({
    queryKey: csvParserKeys.all,
    queryFn: async () => {
      const raw = await api.get<ApiCsvParser[]>('/api/csv-parsers');
      return raw.map(transformCsvParser);
    },
  });
}

/** Get a single CSV parser by ID. */
export function useCsvParser(id: string | undefined) {
  return useQuery({
    queryKey: csvParserKeys.detail(id!),
    queryFn: async () => {
      const raw = await api.get<ApiCsvParser>(`/api/csv-parsers/${id}`);
      return transformCsvParser(raw);
    },
    enabled: !!id,
  });
}

/** Create a new CSV parser. */
export function useCreateCsvParser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; config: Record<string, unknown> }) =>
      api.post<ApiCsvParser>('/api/csv-parsers', data).then(transformCsvParser),
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
      api.put<ApiCsvParser>(`/api/csv-parsers/${id}`, data).then(transformCsvParser),
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
