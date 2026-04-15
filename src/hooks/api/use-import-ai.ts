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
    }: {
      file: File;
      accountId: string;
      parserId: string;
      rowIndexes?: number[];
    }) => api.upload<ImportAiAssistResponse>('/api/import/assist', file, undefined, {
      payload: {
        accountId,
        parserId,
        rowIndexes,
      },
    }),
  });
}
