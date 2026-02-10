import { useMemo, useState } from 'react';
import { Check, ChevronDown, FileQuestion, Plus, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { findBestParser } from '../../lib/csv';
import { loadParsers } from '../../lib/parser-storage';
import type { CsvParser } from '../../types';

interface ParserMatcherProps {
  headers: string[];
  onSelectParser: (parser: CsvParser) => void;
  onCreateNew: () => void;
}

export function ParserMatcher({ headers, onSelectParser, onCreateNew }: ParserMatcherProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const { parsers, matchedParser, matchScore } = useMemo(() => {
    const saved = loadParsers();
    let matched: CsvParser | null = null;
    let score = 0;

    if (saved.length > 0) {
      const result = findBestParser(saved, headers);
      if (result) {
        matched = result.parser;
        score = Math.round(result.score * 100);
      }
    }

    return { parsers: saved, matchedParser: matched, matchScore: score };
  }, [headers]);

  const hasExistingParsers = parsers.length > 0;

  // Parser was auto-matched
  if (matchedParser) {
    return (
      <div className="space-y-4">
        {/* Match banner */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-(--radius-md) bg-income/10 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-income" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text font-medium">
                Parser matched: {matchedParser.name}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {matchScore}% header match
                &middot; {matchedParser.columnMappings.filter((m) => m.field !== 'ignore').length} mapped columns
                &middot; {matchedParser.amountFormat === 'single' ? 'Single amount' : 'Debit/Credit'} format
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onSelectParser(matchedParser)}
              className="btn-primary"
            >
              <Check size={14} />
              Use this parser
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="btn-secondary"
              >
                Choose different
                <ChevronDown size={14} />
              </button>
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
          </div>
        </div>
      </div>
    );
  }

  // No match found
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-(--radius-md) bg-expense/10 flex items-center justify-center shrink-0">
          <FileQuestion size={18} className="text-expense" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-text font-medium">
            {hasExistingParsers
              ? 'No parser matches this file format'
              : 'No parsers configured yet'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasExistingParsers
              ? 'Create a new parser or select an existing one to map the columns.'
              : 'Create a parser to define how columns in this CSV map to transaction fields.'}
          </p>

          <div className="flex gap-2 mt-4">
            <button onClick={onCreateNew} className="btn-primary">
              <Plus size={14} />
              Create new parser
            </button>
            {hasExistingParsers && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="btn-secondary"
                >
                  Select existing
                  <ChevronDown size={14} />
                </button>
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
          </div>
        </div>
      </div>
    </div>
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
      <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md)">
        {filtered.map((parser) => (
          <button
            key={parser.id}
            onClick={() => onSelect(parser)}
            className={cn(
              'flex flex-col w-full px-3 py-2.5 text-left bg-transparent border-none cursor-pointer',
              'hover:bg-surface-hover transition-colors',
            )}
          >
            <span className="text-xs text-text font-medium">{parser.name}</span>
            <span className="text-xs text-text-muted mt-0.5">
              {parser.columnMappings.filter((m) => m.field !== 'ignore').length} columns
              &middot; delimiter: {parser.delimiter === '\t' ? 'tab' : `"${parser.delimiter}"`}
            </span>
          </button>
        ))}
        {filtered.length > 0 && <div className="h-px bg-border mx-2 my-1" />}
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-transparent border-none cursor-pointer text-xs text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
        >
          <Plus size={12} />
          Create new parser
        </button>
      </div>
    </>
  );
}
