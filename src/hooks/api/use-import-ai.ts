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
      signal,
    }: {
      file: File;
      accountId: string;
      parserId: string;
      rowIndexes?: number[];
      signal?: AbortSignal;
    }) => api.upload<ImportAiAssistResponse>('/api/import/assist', file, undefined, {
      payload: {
        accountId,
        parserId,
        rowIndexes,
      },
    }, signal),
  });
}
