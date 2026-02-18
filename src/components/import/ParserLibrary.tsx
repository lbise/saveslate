import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Download, Edit, Plus, Upload } from 'lucide-react';
import {
  exportParser,
  importParserFromFile,
  loadParsers,
} from '../../lib/parser-storage';
import type { CsvParser } from '../../types';

interface ParserLibraryProps {
  onParserImported?: (parser: CsvParser) => void;
  onEditParser?: (parser: CsvParser) => void;
  onCreateParser?: () => void;
}

export function ParserLibrary({
  onParserImported,
  onEditParser,
  onCreateParser,
}: ParserLibraryProps) {
  const parserFileInputRef = useRef<HTMLInputElement>(null);
  const [parsers, setParsers] = useState<CsvParser[]>(() => loadParsers());
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const sortedParsers = useMemo(
    () => [...parsers].sort((left, right) => left.name.localeCompare(right.name)),
    [parsers],
  );

  const handleOpenImportPicker = () => {
    setImportError(null);
    parserFileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const importedParser = await importParserFromFile(file);
      setParsers(loadParsers());
      onParserImported?.(importedParser);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Failed to import parser file.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <input
        ref={parserFileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportFile(event);
        }}
        className="hidden"
      />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="section-title">Parser library</h3>
          <p className="text-ui text-text-muted mt-1">
            Import and export parser presets without uploading a CSV first.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onCreateParser && (
            <button
              type="button"
              onClick={onCreateParser}
              className="btn-secondary"
            >
              <Plus size={14} />
              Create parser
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenImportPicker}
            className="btn-secondary"
            disabled={isImporting}
          >
            <Upload size={14} />
            {isImporting ? 'Importing...' : 'Import parser'}
          </button>
        </div>
      </div>

      {importError && <p className="text-ui text-expense">{importError}</p>}

      {sortedParsers.length === 0 ? (
        <p className="text-ui text-text-muted">
          No parsers saved yet. Import one now, then pick it after you upload a CSV.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {sortedParsers.map((parser) => (
            <div
              key={parser.id}
              className="flex items-center gap-2 p-2 rounded-(--radius-md) border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-ui text-text font-medium truncate">{parser.name}</p>
              </div>

              <div className="flex items-center gap-2">
                {onEditParser && (
                  <button
                    type="button"
                    onClick={() => onEditParser(parser)}
                    className="btn-secondary"
                    title={`Edit parser ${parser.name}`}
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportParser(parser)}
                  className="btn-secondary"
                  title={`Export parser ${parser.name}`}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
