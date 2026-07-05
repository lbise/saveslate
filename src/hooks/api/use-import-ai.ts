import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ImportAiAssistResponse } from '@/types';

export function useImportAiAssist() {
  return useMutation({
    mutationFn: ({
      file,
      accountId,
      parserId,
      rowIndexes,
      cleanDescriptions,
      categorize,
      signal,
    }: {
      file: File;
      accountId: string;
      parserId: string;
      rowIndexes?: number[];
      cleanDescriptions: boolean;
      categorize: boolean;
      signal?: AbortSignal;
    }) => api.upload<ImportAiAssistResponse>(
      '/api/import/assist',
      file,
      import.meta.env.DEV ? { debug: 'true' } : undefined,
      {
        payload: {
          accountId,
          parserId,
          rowIndexes,
          cleanDescriptions,
          categorize,
        },
      },
      signal,
    ),
  });
}
