import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Check, ChevronDown, Download, Edit, FileQuestion, Plus, Upload, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/separator';
import { findBestParserFromRaw } from '../../lib/csv';
import { exportParser, importParserFromFile, loadParsers } from '../../lib/parser-storage';
import type { CsvParser } from '../../types';

interface ParserMatcherProps {
  rawContent: string;
  onSelectParser: (parser: CsvParser) => void;
  onEditParser: (parser: CsvParser) => void;
  onCreateNew: () => void;
}

export function ParserMatcher({ rawContent, onSelectParser, onEditParser, onCreateNew }: ParserMatcherProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const parserFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenImportPicker = () => {
    setImportError(null);
    parserFileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setShowDropdown(false);

    try {
      const importedParser = await importParserFromFile(file);
      onSelectParser(importedParser);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import parser file.');
    } finally {
      setIsImporting(false);
    }
  };

  const { parsers, matchedParser, matchScore } = useMemo(() => {
    const saved = loadParsers();
    let matched: CsvParser | null = null;
    let score = 0;

    if (saved.length > 0) {
      const result = findBestParserFromRaw(saved, rawContent);
      if (result) {
        matched = result.parser;
        score = Math.round(result.score * 100);
      }
    }

    return { parsers: saved, matchedParser: matched, matchScore: score };
  }, [rawContent]);

  const hasExistingParsers = parsers.length > 0;

  // Parser was auto-matched
  if (matchedParser) {
    return (
      <div className="space-y-4">
        <input
          ref={parserFileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void handleImportFile(event);
          }}
          className="hidden"
        />

        {/* Match banner */}
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-(--radius-md) bg-income/10 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-income" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base text-foreground font-medium">
                Parser matched: {matchedParser.name}
              </p>
              <p className="text-sm text-dimmed mt-1">
                {matchScore}% header match
                &middot; {matchedParser.columnMappings.filter((m) => m.field !== 'ignore').length} mapped columns
                &middot; {matchedParser.amountFormat === 'single' ? 'Single amount' : 'Debit/Credit'} format
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              onClick={() => onSelectParser(matchedParser)}
            >
              <Check size={14} />
              Use this parser
            </Button>
            <Button
              variant="outline"
              onClick={() => onEditParser(matchedParser)}
            >
              <Edit size={14} />
              Edit parser
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                Choose different
                <ChevronDown size={14} />
              </Button>
              {showDropdown && (
                <ParserDropdown
                  parsers={parsers}
                  excludeId={matchedParser.id}
                  onSelect={(p) => {
                    setShowDropdown(false);
                    onSelectParser(p);
                  }}
                  onCreateNew={() => {
                    setShowDropdown(false);
                    onCreateNew();
                  }}
                  onClose={() => setShowDropdown(false)}
                />
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => exportParser(matchedParser)}
            >
              <Download size={14} />
              Export parser
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenImportPicker}
              disabled={isImporting}
            >
              <Upload size={14} />
              {isImporting ? 'Importing...' : 'Import parser'}
            </Button>
          </div>

          {importError && (
            <p className="text-sm text-expense mt-3">{importError}</p>
          )}
        </Card>
      </div>
    );
  }

  // No match found
  return (
    <Card className="p-5">
      <input
        ref={parserFileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportFile(event);
        }}
        className="hidden"
      />

      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-(--radius-md) bg-expense/10 flex items-center justify-center shrink-0">
          <FileQuestion size={18} className="text-expense" />
        </div>
        <div className="flex-1">
          <p className="text-base text-foreground font-medium">
            {hasExistingParsers
              ? 'No parser matches this file format'
              : 'No parsers configured yet'}
          </p>
          <p className="text-sm text-dimmed mt-1">
            {hasExistingParsers
              ? 'Create a new parser or select an existing one to map the columns.'
              : 'Create a parser to define how columns in this CSV map to transaction fields.'}
          </p>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button onClick={onCreateNew}>
              <Plus size={14} />
              Create new parser
            </Button>
            {hasExistingParsers && (
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  Select existing
                  <ChevronDown size={14} />
                </Button>
                {showDropdown && (
                  <ParserDropdown
                    parsers={parsers}
                    onSelect={(p) => {
                      setShowDropdown(false);
                      onSelectParser(p);
                    }}
                    onCreateNew={() => {
                      setShowDropdown(false);
                      onCreateNew();
                    }}
                    onClose={() => setShowDropdown(false)}
                  />
                )}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenImportPicker}
              disabled={isImporting}
            >
              <Upload size={14} />
              {isImporting ? 'Importing...' : 'Import parser'}
            </Button>
          </div>

          {importError && (
            <p className="text-sm text-expense mt-3">{importError}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Parser Dropdown ─────────────────────────────────────────

interface ParserDropdownProps {
  parsers: CsvParser[];
  excludeId?: string;
  onSelect: (parser: CsvParser) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function ParserDropdown({ parsers, excludeId, onSelect, onCreateNew, onClose }: ParserDropdownProps) {
  const filtered = excludeId ? parsers.filter((p) => p.id !== excludeId) : parsers;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md)">
        {filtered.map((parser) => (
          <div key={parser.id} className="flex items-center gap-1 px-1">
            <button
              onClick={() => onSelect(parser)}
              className={cn(
                'flex flex-col flex-1 px-2 py-2.5 text-left bg-transparent border-none cursor-pointer rounded-(--radius-sm)',
                'hover:bg-secondary transition-colors',
              )}
            >
              <span className="text-sm text-foreground font-medium">{parser.name}</span>
              <span className="text-sm text-dimmed mt-0.5">
                {parser.columnMappings.filter((m) => m.field !== 'ignore').length} columns
                &middot; delimiter: {parser.delimiter === '\t' ? 'tab' : `"${parser.delimiter}"`}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => exportParser(parser)}
              className="size-7 shrink-0 text-dimmed hover:text-foreground"
              aria-label={`Export parser ${parser.name}`}
              title={`Export parser ${parser.name}`}
            >
              <Download size={12} />
            </Button>
          </div>
        ))}
        {filtered.length > 0 && <Separator className="mx-2 my-1" />}
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-transparent border-none cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Plus size={12} />
          Create new parser
        </button>
      </div>
    </>
  );
}
