import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toNumber } from '@/lib/api-client';
import type { Transaction, ParsedRow } from '@/types';

// ─── Response Types ──────────────────────────────────────────────────

export interface CsvPreviewResult {
  rows: ParsedRow[];
  headers: string[];
  totalRows: number;
  errorCount: number;
  skippedRows: number;
  detectedDelimiter: string;
  accountIdentifier?: string;
}

type RawParsedRow = Omit<ParsedRow, 'amount'> & {
  amount: string | number;
};

type RawCsvPreviewResult = Omit<CsvPreviewResult, 'rows'> & {
  rows: RawParsedRow[];
};

export function transformCsvPreviewResult(raw: RawCsvPreviewResult): CsvPreviewResult {
  return {
    ...raw,
    rows: raw.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
    })),
  };
}

export interface CsvImportTransferLink {
  rowIndex: number;
  matchedTransactionId: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Preview a CSV file without importing. Returns parsed rows for review. */
export function useCsvPreview() {
  return useMutation({
    mutationFn: async ({ file, parserId }: { file: File; parserId?: string }) => {
      const raw = await api.upload<RawCsvPreviewResult>(
        '/api/import/preview',
        file,
        parserId ? { parserId } : undefined,
      );
      return transformCsvPreviewResult(raw);
    },
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
      importName,
      selectedRowIndexes,
      transferLinks = [],
    }: {
      file: File;
      accountId: string;
      parserId?: string;
      applyRules?: boolean;
      currency?: string;
      importName?: string;
      selectedRowIndexes?: number[];
      transferLinks?: CsvImportTransferLink[];
    }) =>
      api.upload<Transaction[]>('/api/import', file, undefined, {
        payload: {
          accountId,
          parserId,
          applyRules,
          currency,
          importName,
          selectedRowIndexes,
          transferLinks,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['importBatches'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
