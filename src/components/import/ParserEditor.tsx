import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Save, RotateCcw, X, ChevronDown, AlertTriangle, Check } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import {
  detectDelimiter,
  parseRawCsv,
  extractHeadersAndData,
  validateMappings,
  applyParser,
  DATE_FORMAT_PRESETS,
} from '../../lib/csv';
import { saveParser } from '../../lib/parser-storage';
import { CsvPreviewTable } from './CsvPreviewTable';
import type {
  CsvDelimiter,
  AmountFormat,
  TransactionField,
  ColumnMapping,
  CsvParser,
  ParsedRow,
} from '../../types';
import { TRANSACTION_FIELD_LABELS } from '../../types';

interface ParserEditorProps {
  rawContent: string;
  /** If provided, we're editing an existing parser */
  existingParser?: CsvParser;
  onSave: (parser: CsvParser) => void;
  onCancel: () => void;
}

const DELIMITER_OPTIONS: { value: CsvDelimiter; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];

/** Fields that support mapping to multiple CSV columns (string concatenation). */
const MULTI_COLUMN_FIELDS: Set<TransactionField> = new Set(['description', 'category']);

/** All assignable fields (excluding 'ignore'). */
type AssignableField = Exclude<TransactionField, 'ignore'>;

/** Fields grouped by required / optional, and by amount format. */
function getFieldRows(amountFormat: AmountFormat): { field: AssignableField; required: boolean }[] {
  const rows: { field: AssignableField; required: boolean }[] = [
    { field: 'description', required: true },
    { field: 'date', required: true },
  ];

  if (amountFormat === 'single') {
    rows.push({ field: 'amount', required: true });
  } else {
    rows.push({ field: 'debit', required: true });
    rows.push({ field: 'credit', required: true });
  }

  rows.push({ field: 'category', required: false });

  return rows;
}

export function ParserEditor({
  rawContent,
  existingParser,
  onSave,
  onCancel,
}: ParserEditorProps) {
  // ─── Parser configuration state ────────────────────────────
  const detectedDelimiter = useMemo(() => detectDelimiter(rawContent), [rawContent]);

  const [name, setName] = useState(existingParser?.name ?? '');
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(existingParser?.delimiter ?? detectedDelimiter);
  const [hasHeaderRow, setHasHeaderRow] = useState(existingParser?.hasHeaderRow ?? true);
  const [skipRows, setSkipRows] = useState(existingParser?.skipRows ?? 0);
  const [amountFormat, setAmountFormat] = useState<AmountFormat>(existingParser?.amountFormat ?? 'single');
  const [dateFormat, setDateFormat] = useState(existingParser?.dateFormat ?? 'DD.MM.YYYY');
  const [decimalSeparator, setDecimalSeparator] = useState<'.' | ','>(existingParser?.decimalSeparator ?? '.');

  // ─── Parse raw CSV with current settings ───────────────────
  const rawRows = useMemo(() => parseRawCsv(rawContent, delimiter), [rawContent, delimiter]);
  const { headers, dataRows } = useMemo(
    () => extractHeadersAndData(rawRows, hasHeaderRow, skipRows),
    [rawRows, hasHeaderRow, skipRows],
  );

  // ─── Field mappings: field → column indices ────────────────
  const [fieldMappings, setFieldMappings] = useState<Map<AssignableField, number[]>>(() => {
    if (existingParser) {
      const map = new Map<AssignableField, number[]>();
      for (const m of existingParser.columnMappings) {
        if (m.field !== 'ignore') {
          map.set(m.field as AssignableField, [...m.columnIndices]);
        }
      }
      return map;
    }
    return new Map();
  });

  const addColumnToField = useCallback((field: AssignableField, colIdx: number) => {
    setFieldMappings((prev) => {
      const next = new Map(prev);
      const isMulti = MULTI_COLUMN_FIELDS.has(field);
      const current = next.get(field) ?? [];

      if (isMulti) {
        // Add to the list if not already present
        if (!current.includes(colIdx)) {
          next.set(field, [...current, colIdx]);
        }
      } else {
        // Single-column: replace
        next.set(field, [colIdx]);
      }

      // Remove this column from any OTHER single-column field that had it
      // (multi-column fields can share columns, but single-column fields should be exclusive)
      for (const [otherField, indices] of next) {
        if (otherField === field) continue;
        if (!MULTI_COLUMN_FIELDS.has(otherField) && indices.includes(colIdx)) {
          next.set(otherField, indices.filter((i) => i !== colIdx));
        }
      }

      return next;
    });
  }, []);

  const removeColumnFromField = useCallback((field: AssignableField, colIdx: number) => {
    setFieldMappings((prev) => {
      const next = new Map(prev);
      const current = next.get(field) ?? [];
      const updated = current.filter((i) => i !== colIdx);
      if (updated.length === 0) {
        next.delete(field);
      } else {
        next.set(field, updated);
      }
      return next;
    });
  }, []);

  // ─── Build ColumnMapping array for the parser ──────────────
  const columnMappings: ColumnMapping[] = useMemo(() => {
    const result: ColumnMapping[] = [];
    for (const [field, columnIndices] of fieldMappings) {
      if (columnIndices.length > 0) {
        result.push({ field, columnIndices });
      }
    }
    return result;
  }, [fieldMappings]);

  // ─── Validation ────────────────────────────────────────────
  const validationErrors = useMemo(
    () => validateMappings(columnMappings, amountFormat),
    [columnMappings, amountFormat],
  );

  const nameError = !name.trim() ? 'Parser name is required' : '';

  // ─── Column highlights for preview ─────────────────────────
  const columnHighlights = useMemo(() => {
    const map = new Map<number, string>();
    for (const [field, indices] of fieldMappings) {
      for (const colIdx of indices) {
        map.set(colIdx, TRANSACTION_FIELD_LABELS[field]);
      }
    }
    return map;
  }, [fieldMappings]);

  // ─── Columns already assigned to single-value fields ───────
  const assignedSingleColumns = useMemo(() => {
    const set = new Set<number>();
    for (const [field, indices] of fieldMappings) {
      if (!MULTI_COLUMN_FIELDS.has(field)) {
        for (const idx of indices) set.add(idx);
      }
    }
    return set;
  }, [fieldMappings]);

  // ─── Field row config ─────────────────────────────────────
  const fieldRows = useMemo(() => getFieldRows(amountFormat), [amountFormat]);

  // ─── Parsed transaction preview ────────────────────────────
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (validationErrors.length > 0 || columnMappings.length === 0) return [];

    // Build a temporary parser config from the current state
    const tempParser = {
      id: '',
      name: '',
      delimiter,
      hasHeaderRow,
      skipRows,
      headerPatterns: [],
      columnMappings,
      amountFormat,
      dateFormat,
      decimalSeparator,
      createdAt: '',
      updatedAt: '',
    } satisfies CsvParser;

    return applyParser(dataRows, headers, tempParser);
  }, [validationErrors, columnMappings, dataRows, headers, delimiter, hasHeaderRow, skipRows, amountFormat, dateFormat, decimalSeparator]);

  // ─── Save handler ──────────────────────────────────────────
  const handleSave = () => {
    if (validationErrors.length > 0 || nameError) return;

    // Build header patterns from current headers + mapped columns
    const mappedColIndices = new Set<number>();
    for (const indices of fieldMappings.values()) {
      for (const i of indices) mappedColIndices.add(i);
    }
    const headerPatterns = headers
      .filter((_, i) => mappedColIndices.has(i))
      .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape for regex

    const parserData = {
      name: name.trim(),
      delimiter,
      hasHeaderRow,
      skipRows,
      headerPatterns,
      columnMappings,
      amountFormat,
      dateFormat,
      decimalSeparator,
    };

    const parser = saveParser(parserData);
    onSave(parser);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="heading-2">
          {existingParser ? 'Edit parser' : 'Create new parser'}
        </h2>
        <button onClick={onCancel} className="btn-ghost text-xs">
          <RotateCcw size={14} />
          Back
        </button>
      </div>

      {/* Parser name */}
      <div>
        <label className="label mb-1.5 block">Parser name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. UBS Export, PostFinance CSV..."
          className="input max-w-sm"
        />
        {nameError && name.length > 0 && (
          <p className="text-xs text-expense mt-1">{nameError}</p>
        )}
      </div>

      {/* Configuration grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Delimiter */}
        <div>
          <label className="label mb-1.5 block">Delimiter</label>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as CsvDelimiter)}
            className="select text-xs"
          >
            {DELIMITER_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Header row */}
        <div>
          <label className="label mb-1.5 block">Header row</label>
          <button
            onClick={() => setHasHeaderRow(!hasHeaderRow)}
            className={cn(
              'w-full px-3 py-2.5 rounded-(--radius-md) border text-xs font-medium transition-colors cursor-pointer',
              hasHeaderRow
                ? 'bg-text/10 text-text border-text/20'
                : 'bg-surface text-text-muted border-border hover:border-text-muted',
            )}
          >
            {hasHeaderRow ? 'Yes' : 'No'}
          </button>
        </div>

        {/* Skip rows */}
        <div>
          <label className="label mb-1.5 block">Skip rows</label>
          <input
            type="number"
            min={0}
            max={20}
            value={skipRows}
            onChange={(e) => setSkipRows(Math.max(0, parseInt(e.target.value) || 0))}
            className="input text-xs"
          />
        </div>

        {/* Amount format */}
        <div>
          <label className="label mb-1.5 block">Amount format</label>
          <select
            value={amountFormat}
            onChange={(e) => setAmountFormat(e.target.value as AmountFormat)}
            className="select text-xs"
          >
            <option value="single">Single column</option>
            <option value="debit-credit">Debit / Credit</option>
          </select>
        </div>

        {/* Date format */}
        <div>
          <label className="label mb-1.5 block">Date format</label>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="select text-xs"
          >
            {DATE_FORMAT_PRESETS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Decimal separator */}
        <div>
          <label className="label mb-1.5 block">Decimal sep.</label>
          <select
            value={decimalSeparator}
            onChange={(e) => setDecimalSeparator(e.target.value as '.' | ',')}
            className="select text-xs"
          >
            <option value=".">Dot (.)</option>
            <option value=",">Comma (,)</option>
          </select>
        </div>
      </div>

      {/* Field mapping (field-centric) */}
      <div>
        <label className="label mb-3 block">
          Column mapping
          <span className="text-text-muted font-normal ml-2">
            Assign CSV columns to each transaction field
          </span>
        </label>

        <div className="space-y-2 mb-4">
          {fieldRows.map(({ field, required }) => {
            const isMulti = MULTI_COLUMN_FIELDS.has(field);
            const assignedIndices = fieldMappings.get(field) ?? [];

            return (
              <FieldMappingRow
                key={field}
                field={field}
                required={required}
                isMulti={isMulti}
                assignedIndices={assignedIndices}
                headers={headers}
                dataRows={dataRows}
                assignedSingleColumns={assignedSingleColumns}
                onAdd={(colIdx) => addColumnToField(field, colIdx)}
                onRemove={(colIdx) => removeColumnFromField(field, colIdx)}
              />
            );
          })}
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="flex flex-col gap-1 mb-4">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-xs text-expense">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* Preview table with highlights */}
      <div>
        <label className="label mb-2 block">Data preview</label>
        <CsvPreviewTable
          headers={headers}
          rows={dataRows}
          maxRows={5}
          columnHighlights={columnHighlights}
        />
      </div>

      {/* Parsed transaction preview */}
      {parsedRows.length > 0 && (
        <ParsedTransactionPreview rows={parsedRows} maxRows={5} />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={validationErrors.length > 0 || !name.trim()}
          className="btn-primary"
        >
          <Save size={14} />
          Save parser
        </button>
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Field Mapping Row ───────────────────────────────────────

interface FieldMappingRowProps {
  field: AssignableField;
  required: boolean;
  isMulti: boolean;
  assignedIndices: number[];
  headers: string[];
  dataRows: string[][];
  /** Column indices already used by single-value fields (for disabling in dropdown). */
  assignedSingleColumns: Set<number>;
  onAdd: (colIdx: number) => void;
  onRemove: (colIdx: number) => void;
}

function FieldMappingRow({
  field,
  required,
  isMulti,
  assignedIndices,
  headers,
  dataRows,
  assignedSingleColumns,
  onAdd,
  onRemove,
}: FieldMappingRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Available columns for the dropdown
  const availableColumns = headers.map((header, idx) => {
    const alreadyAssigned = assignedIndices.includes(idx);
    // Disable if already used by another single-column field (and this field is also single-column)
    const usedBySingle = !isMulti && assignedSingleColumns.has(idx) && !alreadyAssigned;
    return { idx, header, alreadyAssigned, disabled: usedBySingle };
  });

  const hasValue = assignedIndices.length > 0;

  const handleSelect = (colIdx: number) => {
    if (!isMulti) {
      // Single-column: select and close
      onAdd(colIdx);
      setDropdownOpen(false);
    } else {
      // Multi-column: toggle and keep open
      if (assignedIndices.includes(colIdx)) {
        onRemove(colIdx);
      } else {
        onAdd(colIdx);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-(--radius-md) border',
        hasValue ? 'border-text/15 bg-text/[0.03]' : 'border-border bg-surface',
      )}
    >
      {/* Field label */}
      <div className="w-28 shrink-0">
        <span className="text-xs font-medium text-text">
          {TRANSACTION_FIELD_LABELS[field]}
        </span>
        {required ? (
          <span className="text-expense ml-0.5">*</span>
        ) : (
          <span className="text-[10px] text-text-muted ml-1.5">optional</span>
        )}
        {isMulti && (
          <p className="text-[10px] text-text-muted mt-0.5">multi-column</p>
        )}
      </div>

      {/* Column picker area */}
      <div className="flex-1 min-w-0" ref={containerRef}>
        <div className="relative">
          {/* Chips + trigger */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'flex items-center flex-wrap gap-1.5 w-full min-h-[36px] px-3 py-1.5',
              'rounded-(--radius-md) border text-left cursor-pointer transition-colors',
              'focus:outline-none focus:ring-1 focus:ring-text-muted',
              dropdownOpen
                ? 'border-text/30 bg-surface'
                : hasValue
                  ? 'border-text/15 bg-surface hover:border-text/25'
                  : 'border-border bg-surface hover:border-text-muted',
            )}
          >
            {assignedIndices.length === 0 && (
              <span className="text-xs text-text-muted">Select column{isMulti ? 's' : ''}...</span>
            )}
            {assignedIndices.map((colIdx) => (
              <span
                key={colIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-(--radius-sm) bg-text/10 text-xs text-text"
              >
                <span className="truncate max-w-[120px]">{headers[colIdx] ?? `Col ${colIdx + 1}`}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(colIdx);
                  }}
                  className="shrink-0 hover:text-expense transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <ChevronDown
              size={14}
              className={cn(
                'ml-auto shrink-0 text-text-muted transition-transform',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md) max-h-52 overflow-y-auto">
              {availableColumns.map(({ idx, header, alreadyAssigned, disabled }) => {
                const sampleValue = dataRows[0]?.[idx] ?? '';
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelect(idx)}
                    className={cn(
                      'flex flex-col w-full px-3 py-2 text-left bg-transparent border-none transition-colors',
                      disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-surface-hover',
                      alreadyAssigned && isMulti && 'bg-text/5',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('text-xs', alreadyAssigned ? 'text-text font-medium' : 'text-text')}>
                        {header}
                      </span>
                      {alreadyAssigned && isMulti && (
                        <span className="text-[10px] text-income">selected</span>
                      )}
                    </span>
                    {sampleValue && (
                      <span className="text-[10px] text-text-muted truncate mt-0.5 max-w-full">
                        {sampleValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Parsed Transaction Preview ──────────────────────────────

interface ParsedTransactionPreviewProps {
  rows: ParsedRow[];
  maxRows?: number;
}

function ParsedTransactionPreview({ rows, maxRows = 8 }: ParsedTransactionPreviewProps) {
  const displayRows = rows.slice(0, maxRows);

  const errorCount = useMemo(
    () => rows.filter((r) => r.errors.length > 0).length,
    [rows],
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <label className="label">Parsed preview</label>
        <span className="text-[11px] text-text-muted">
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-amber-400">
            <AlertTriangle size={11} />
            {errorCount} with warnings
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-(--radius-md) border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">Date</th>
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">Description</th>
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">Category</th>
              <th className="px-3 py-2.5 text-right text-text-muted font-medium">Amount</th>
              <th className="px-3 py-2.5 text-center text-text-muted font-medium w-10">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const hasErrors = row.errors.length > 0;
              return (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-border last:border-b-0 transition-colors',
                    hasErrors && 'bg-amber-400/[0.03]',
                  )}
                >
                  <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                    {row.date ? formatDate(row.date) : '\u2014'}
                  </td>
                  <td className="px-3 py-2.5 text-text">
                    <span className="truncate block max-w-[300px]">{row.description || '\u2014'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {row.category || '\u2014'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right font-medium whitespace-nowrap',
                      row.amount >= 0 ? 'text-income' : 'text-expense',
                    )}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {row.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(row.amount))}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {hasErrors ? (
                      <span title={row.errors.join(', ')}>
                        <AlertTriangle size={14} className="text-amber-400 inline" />
                      </span>
                    ) : (
                      <Check size={14} className="text-income inline" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > maxRows && (
          <div className="px-3 py-2 text-[11px] text-text-muted bg-surface border-t border-border">
            Showing {maxRows} of {rows.length} rows
          </div>
        )}
      </div>
    </div>
  );
}