import { useRef, useState, type ChangeEvent } from 'react';

interface UseImportExportOptions<TImported> {
  parseFile: (content: string) => TImported;
  onImportSuccess: (data: TImported) => void | Promise<void>;
}

interface UseImportExportReturn {
  importError: string | null;
  isImporting: boolean;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportJsonFile: (fileName: string, payload: unknown) => void;
}

export function useImportExport<TImported>({
  parseFile,
  onImportSuccess,
}: UseImportExportOptions<TImported>): UseImportExportReturn {
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const fileContent = await file.text();
      const parsed = parseFile(fileContent);
      await onImportSuccess(parsed);
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to import file.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const exportJsonFile = (fileName: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return {
    importError,
    isImporting,
    importInputRef,
    openFilePicker,
    handleFileChange,
    exportJsonFile,
  };
}
