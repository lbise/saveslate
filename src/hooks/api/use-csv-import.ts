import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Transaction, ParsedRow } from '@/types';

// ─── Response Types ──────────────────────────────────────────────────

export interface CsvPreviewResult {
  rows: ParsedRow[];
  errors: string[];
  detectedAccount?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Preview a CSV file without importing. Returns parsed rows for review. */
export function useCsvPreview() {
  return useMutation({
    mutationFn: ({ file, parserId }: { file: File; parserId?: string }) =>
      api.upload<CsvPreviewResult>('/api/import/preview', file, parserId ? { parserId } : undefined),
  });
}

/** Import a CSV file: parse, create import batch, create transactions. */
export function useCsvImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      accountId,
      parserId,
      applyRules = true,
      currency = 'CHF',
    }: {
      file: File;
      accountId: string;
      parserId?: string;
      applyRules?: boolean;
      currency?: string;
    }) =>
      api.upload<Transaction[]>('/api/import', file, {
        accountId,
        parserId,
        applyRules,
        currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['importBatches'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
