import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Save,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertTriangle,
  Check,
  Pencil,
  Filter,
  CircleHelp,
} from "lucide-react";
import { cn, formatDate } from "../../lib/utils";
import { useFormatCurrency } from "../../hooks";
import {
  detectDelimiter,
  parseRawCsv,
  extractHeadersAndData,
  validateMappings,
  applyParser,
  extractAccountIdentifier,
  DATE_FORMAT_PRESETS,
  DATE_TIME_FORMAT_PRESETS,
  TIME_FORMAT_PRESETS,
} from "../../lib/csv";
import { saveParser, updateParser } from "../../lib/parser-storage";
import { CsvPreviewTable } from "./CsvPreviewTable";
import { PaginationButtons } from "../ui";
import type {
  CsvDelimiter,
  AmountFormat,
  TransactionField,
  ColumnMapping,
  CsvParser,
  ParsedRow,
  FieldTransform,
  TransformableField,
  MetadataMapping,
} from "../../types";
import { TRANSACTION_FIELD_LABELS } from "../../types";

interface ParserEditorProps {
  rawContent: string;
  /** If provided, we're editing an existing parser */
  existingParser?: CsvParser;
  onSave: (parser: CsvParser) => void;
  onCancel: () => void;
}

const DELIMITER_OPTIONS: { value: CsvDelimiter; label: string }[] = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
];

const SEPARATOR_OPTIONS: { value: string; label: string }[] = [
  { value: " ", label: "Space" },
  { value: ", ", label: "Comma + space" },
  { value: " - ", label: "Dash" },
  { value: " / ", label: "Slash" },
  { value: "", label: "None (concat)" },
];

/** Fields that support mapping to multiple CSV columns (string concatenation). */
const MULTI_COLUMN_FIELDS: Set<TransactionField> = new Set([
  "description",
  "category",
]);

/** All assignable fields (excluding 'ignore'). */
type AssignableField = Exclude<TransactionField, "ignore">;

/** Fields grouped by required / optional, and by amount format. */
function getFieldRows(
  amountFormat: AmountFormat,
  timeMode: CsvParser["timeMode"],
): { field: AssignableField; required: boolean }[] {
  const rows: { field: AssignableField; required: boolean }[] = [
    { field: "description", required: true },
    { field: "transactionId", required: false },
    { field: "date", required: true },
  ];

  if (timeMode === "separate-column") {
    rows.push({ field: "time", required: true });
  }

  if (amountFormat === "single") {
    rows.push({ field: "amount", required: true });
  } else if (amountFormat === "amount-type") {
    rows.push({ field: "amount", required: true });
    rows.push({ field: "amountType", required: true });
  } else {
    rows.push({ field: "debit", required: true });
    rows.push({ field: "credit", required: true });
  }

  rows.push({ field: "category", required: false });
  rows.push({ field: "currency", required: false });

  return rows;
}

export function ParserEditor({
  rawContent,
  existingParser,
  onSave,
  onCancel,
}: ParserEditorProps) {
  const hasSampleData = rawContent.trim().length > 0;

  // ─── Parser configuration state ────────────────────────────
  const detectedDelimiter = useMemo(
    () => detectDelimiter(rawContent),
    [rawContent],
  );

  const [name, setName] = useState(existingParser?.name ?? "");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(
    existingParser?.delimiter ?? detectedDelimiter,
  );
  const [hasHeaderRow, setHasHeaderRow] = useState(
    existingParser?.hasHeaderRow ?? true,
  );
  const [skipRows, setSkipRows] = useState(existingParser?.skipRows ?? 0);
  const [amountFormat, setAmountFormat] = useState<AmountFormat>(
    existingParser?.amountFormat ?? "single",
  );
  const [timeMode, setTimeMode] = useState<CsvParser["timeMode"]>(
    existingParser?.timeMode ?? "none",
  );
  const [timeFormat, setTimeFormat] = useState(
    existingParser?.timeFormat ?? "HH:mm",
  );
  const [dateFormat, setDateFormat] = useState(
    existingParser?.dateFormat ?? "DD.MM.YYYY",
  );
  const [decimalSeparator, setDecimalSeparator] = useState<"." | ",">(
    existingParser?.decimalSeparator ?? ".",
  );
  const [multiColumnSeparator, setMultiColumnSeparator] = useState(
    existingParser?.multiColumnSeparator ?? " ",
  );
  const [metadataMappings, setMetadataMappings] = useState<MetadataMapping[]>(
    () => {
      if (existingParser?.metadataMappings) {
        return existingParser.metadataMappings.map((mapping) => ({
          key: mapping.key,
          columnIndices: [...mapping.columnIndices],
        }));
      }

      const legacyMetadataColumnIndices = (
        existingParser as
          | (CsvParser & { metadataColumnIndices?: number[] })
          | undefined
      )?.metadataColumnIndices;

      if (
        !legacyMetadataColumnIndices ||
        legacyMetadataColumnIndices.length === 0
      ) {
        return [];
      }

      return legacyMetadataColumnIndices.map((columnIndex, index) => ({
        key: `Metadata ${index + 1}`,
        columnIndices: [columnIndex],
      }));
    },
  );
  const [accountPattern, setAccountPattern] = useState(
    existingParser?.accountPattern ?? "",
  );
  const dateFormatOptions = useMemo(
    () =>
      timeMode === "in-date-column"
        ? DATE_TIME_FORMAT_PRESETS
        : DATE_FORMAT_PRESETS,
    [timeMode],
  );

  const effectiveDateFormat = dateFormatOptions.some((preset) => preset.value === dateFormat)
    ? dateFormat
    : dateFormatOptions[0].value;

  const effectiveTimeFormat =
    timeMode !== "separate-column"
      ? undefined
      : TIME_FORMAT_PRESETS.some((preset) => preset.value === timeFormat)
        ? timeFormat
        : TIME_FORMAT_PRESETS[0].value;

  // ─── Parse raw CSV with current settings ───────────────────
  const rawRows = useMemo(
    () => (hasSampleData ? parseRawCsv(rawContent, delimiter) : []),
    [delimiter, hasSampleData, rawContent],
  );
  const { headers, dataRows, skippedRows } = useMemo(
    () => extractHeadersAndData(rawRows, hasHeaderRow, skipRows),
    [rawRows, hasHeaderRow, skipRows],
  );

  // ─── Account identifier extraction preview ────────────────────
  const accountPatternPreview = useMemo(() => {
    if (!accountPattern || skippedRows.length === 0) return null;
    return extractAccountIdentifier(skippedRows, accountPattern);
  }, [skippedRows, accountPattern]);

  // ─── Field mappings: field → column indices ────────────────
  const [fieldMappings, setFieldMappings] = useState<
    Map<AssignableField, number[]>
  >(() => {
    if (existingParser) {
      const map = new Map<AssignableField, number[]>();
      for (const m of existingParser.columnMappings) {
        if (m.field !== "ignore") {
          map.set(m.field as AssignableField, [...m.columnIndices]);
        }
      }
      return map;
    }
    return new Map();
  });

  // ─── Field transforms ──────────────────────────────────────
  const [transforms, setTransforms] = useState<FieldTransform[]>(
    existingParser?.transforms ?? [],
  );

  const addTransform = useCallback(() => {
    setTransforms((prev) => [
      ...prev,
      {
        sourceField: "description",
        targetField: "description",
        matchPattern: "",
        extractPattern: "",
        replacement: "",
      },
    ]);
  }, []);

  const updateTransform = useCallback(
    (index: number, update: Partial<FieldTransform>) => {
      setTransforms((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...update } : t)),
      );
    },
    [],
  );

  const removeTransform = useCallback((index: number) => {
    setTransforms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveTransform = useCallback(
    (index: number, direction: "up" | "down") => {
      setTransforms((prev) => {
        const next = [...prev];
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },
    [],
  );

  const addColumnToField = useCallback(
    (field: AssignableField, colIdx: number) => {
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
          if (
            !MULTI_COLUMN_FIELDS.has(otherField) &&
            indices.includes(colIdx)
          ) {
            next.set(
              otherField,
              indices.filter((i) => i !== colIdx),
            );
          }
        }

        return next;
      });
    },
    [],
  );

  const removeColumnFromField = useCallback(
    (field: AssignableField, colIdx: number) => {
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
    },
    [],
  );

  // ─── Build ColumnMapping array for the parser ──────────────
  const columnMappings: ColumnMapping[] = useMemo(() => {
    const result: ColumnMapping[] = [];
    for (const [field, columnIndices] of fieldMappings) {
      if (field === "time" && timeMode !== "separate-column") {
        continue;
      }
      if (columnIndices.length > 0) {
        result.push({ field, columnIndices });
      }
    }
    return result;
  }, [fieldMappings, timeMode]);

  const mappedColumnIndices = useMemo(() => {
    const set = new Set<number>();
    columnMappings.forEach((mapping) => {
      mapping.columnIndices.forEach((index) => set.add(index));
    });
    return set;
  }, [columnMappings]);

  const normalizedMetadataMappings = useMemo(() => {
    return metadataMappings
      .map((mapping) => ({
        key: mapping.key.trim(),
        columnIndices: Array.from(
          new Set(
            mapping.columnIndices.filter(
              (index) =>
                index >= 0 &&
                (headers.length === 0 || index < headers.length) &&
                !mappedColumnIndices.has(index),
            ),
          ),
        ).sort((a, b) => a - b),
      }))
      .filter((mapping) => mapping.key && mapping.columnIndices.length > 0);
  }, [headers.length, mappedColumnIndices, metadataMappings]);

  const addMetadataMapping = useCallback(() => {
    setMetadataMappings((previousMappings) => [
      ...previousMappings,
      {
        key: "",
        columnIndices: [],
      },
    ]);
  }, []);

  const updateMetadataMappingKey = useCallback(
    (mappingIndex: number, key: string) => {
      setMetadataMappings((previousMappings) =>
        previousMappings.map((mapping, index) =>
          index === mappingIndex ? { ...mapping, key } : mapping,
        ),
      );
    },
    [],
  );

  const removeMetadataMapping = useCallback((mappingIndex: number) => {
    setMetadataMappings((previousMappings) =>
      previousMappings.filter((_, index) => index !== mappingIndex),
    );
  }, []);

  const toggleMetadataMappingColumn = useCallback(
    (mappingIndex: number, columnIndex: number) => {
      if (columnIndex < 0 || columnIndex >= headers.length) {
        return;
      }

      setMetadataMappings((previousMappings) =>
        previousMappings.map((mapping, index) => {
          if (index !== mappingIndex) {
            return mapping;
          }

          const isMappedColumn = mappedColumnIndices.has(columnIndex);
          const isAlreadyAssigned = mapping.columnIndices.includes(columnIndex);
          if (isMappedColumn && !isAlreadyAssigned) {
            return mapping;
          }

          if (isAlreadyAssigned) {
            return {
              ...mapping,
              columnIndices: mapping.columnIndices.filter(
                (idx) => idx !== columnIndex,
              ),
            };
          }

          return {
            ...mapping,
            columnIndices: [...mapping.columnIndices, columnIndex].sort(
              (a, b) => a - b,
            ),
          };
        }),
      );
    },
    [headers.length, mappedColumnIndices],
  );

  // ─── Validation ────────────────────────────────────────────
  const fieldErrors = useMemo(
    () => validateMappings(columnMappings, amountFormat, timeMode),
    [columnMappings, amountFormat, timeMode],
  );
  const hasValidationErrors = fieldErrors.size > 0;

  const nameError = !name.trim() ? "Parser name is required" : "";

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
  const fieldRows = useMemo(
    () => getFieldRows(amountFormat, timeMode),
    [amountFormat, timeMode],
  );

  // ─── Parsed transaction preview ────────────────────────────
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (hasValidationErrors || columnMappings.length === 0) return [];

    // Build a temporary parser config from the current state
    const tempParser = {
      id: "",
      name: "",
      delimiter,
      hasHeaderRow,
      skipRows,
      headerPatterns: [],
      columnMappings,
      amountFormat,
      timeMode,
      timeFormat: effectiveTimeFormat,
      dateFormat: effectiveDateFormat,
      decimalSeparator,
      multiColumnSeparator,
      metadataMappings: normalizedMetadataMappings,
      transforms: transforms.filter((t) => t.matchPattern && t.extractPattern),
      createdAt: "",
      updatedAt: "",
    } satisfies CsvParser;

    return applyParser(dataRows, headers, tempParser);
  }, [
    hasValidationErrors,
    columnMappings,
    dataRows,
    headers,
    delimiter,
    hasHeaderRow,
    skipRows,
    amountFormat,
    timeMode,
    effectiveTimeFormat,
    effectiveDateFormat,
    decimalSeparator,
    multiColumnSeparator,
    normalizedMetadataMappings,
    transforms,
  ]);

  // ─── Pre-transform rows (for transform match previews) ─────
  const preTransformRows: ParsedRow[] = useMemo(() => {
    if (columnMappings.length === 0) return [];

    const tempParser = {
      id: "",
      name: "",
      delimiter,
      hasHeaderRow,
      skipRows,
      headerPatterns: [],
      columnMappings,
      amountFormat,
      timeMode,
      timeFormat: effectiveTimeFormat,
      dateFormat: effectiveDateFormat,
      decimalSeparator,
      multiColumnSeparator,
      metadataMappings: normalizedMetadataMappings,
      accountPattern: accountPattern.trim() || undefined,
      createdAt: "",
      updatedAt: "",
    } satisfies CsvParser;

    return applyParser(dataRows, headers, tempParser);
  }, [
    normalizedMetadataMappings,
    columnMappings,
    dataRows,
    headers,
    delimiter,
    hasHeaderRow,
    skipRows,
    amountFormat,
    timeMode,
    effectiveTimeFormat,
    effectiveDateFormat,
    decimalSeparator,
    multiColumnSeparator,
    accountPattern,
  ]);

  // ─── Save handler ──────────────────────────────────────────
  const handleSave = () => {
    if (hasValidationErrors || nameError) return;

    // Build header patterns from current headers + mapped columns
    const mappedColIndices = new Set<number>();
    for (const indices of fieldMappings.values()) {
      for (const i of indices) mappedColIndices.add(i);
    }
    const headerPatterns = headers
      .filter((_, i) => mappedColIndices.has(i))
      .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape for regex

    const parserData = {
      name: name.trim(),
      delimiter,
      hasHeaderRow,
      skipRows,
      headerPatterns,
      columnMappings,
      amountFormat,
      timeMode,
      timeFormat: effectiveTimeFormat,
      dateFormat: effectiveDateFormat,
      decimalSeparator,
      multiColumnSeparator,
      metadataMappings:
        normalizedMetadataMappings.length > 0
          ? normalizedMetadataMappings
          : undefined,
      transforms: transforms.filter((t) => t.matchPattern && t.extractPattern),
      accountPattern: accountPattern.trim() || undefined,
    };

    const parser = existingParser
      ? updateParser(existingParser.id, parserData)
      : saveParser(parserData);

    if (!parser) return;
    onSave(parser);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="heading-2 flex items-center gap-2">
          {existingParser ? <Pencil size={18} /> : <Plus size={18} />}
          {existingParser ? "Edit parser" : "Create new parser"}
        </h2>
        <button onClick={onCancel} className="btn-ghost">
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
          <p className="text-ui text-expense mt-1">{nameError}</p>
        )}
      </div>

      {/* Configuration grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Delimiter */}
        <div>
          <label className="label mb-1.5 block">Delimiter</label>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as CsvDelimiter)}
            className="select text-sm pl-3 pr-8"
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
              "w-full px-3 py-2.5 rounded-(--radius-md) border text-sm font-medium transition-colors cursor-pointer",
              hasHeaderRow
                ? "bg-text/10 text-text border-text/20"
                : "bg-surface text-text-muted border-border hover:border-text-muted",
            )}
          >
            {hasHeaderRow ? "Yes" : "No"}
          </button>
        </div>

        {/* Skip rows */}
        <div>
          <label className="label mb-1.5 block">Skip rows</label>
          <input
            type="text"
            inputMode="numeric"
            value={skipRows}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setSkipRows(0);
              } else {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                  setSkipRows(Math.max(0, Math.min(99, parsed)));
                }
              }
            }}
            onFocus={(e) => e.target.select()}
            className="input text-sm"
          />
        </div>

        {/* Amount format */}
        <div>
          <label className="label mb-1.5 block">Amount format</label>
          <select
            value={amountFormat}
            onChange={(e) => setAmountFormat(e.target.value as AmountFormat)}
            className="select text-sm"
          >
            <option value="single">Single column</option>
            <option value="amount-type">Amount + indicator</option>
            <option value="debit-credit">Debit / Credit</option>
          </select>
        </div>

        {/* Time source */}
        <div>
          <label className="label mb-1.5 block">Time source</label>
          <select
            value={timeMode}
            onChange={(e) =>
              setTimeMode(e.target.value as CsvParser["timeMode"])
            }
            className="select text-sm"
          >
            <option value="none">No time</option>
            <option value="separate-column">Separate column</option>
            <option value="in-date-column">In date column</option>
          </select>
        </div>

        {/* Date format */}
        <div>
          <label className="label mb-1.5 block">
            {timeMode === "in-date-column" ? "Date/time format" : "Date format"}
          </label>
          <select
            value={effectiveDateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="select text-sm"
          >
            {dateFormatOptions.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time format (separate column mode) */}
        {timeMode === "separate-column" && (
          <div>
            <label className="label mb-1.5 block">Time format</label>
            <select
              value={effectiveTimeFormat ?? TIME_FORMAT_PRESETS[0].value}
              onChange={(e) => setTimeFormat(e.target.value)}
              className="select text-sm"
            >
              {TIME_FORMAT_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Decimal separator */}
        <div>
          <label className="label mb-1.5 block">Decimal sep.</label>
          <select
            value={decimalSeparator}
            onChange={(e) => setDecimalSeparator(e.target.value as "." | ",")}
            className="select text-sm"
          >
            <option value=".">Dot (.)</option>
            <option value=",">Comma (,)</option>
          </select>
        </div>
      </div>

      {/* Account match — only when skipRows > 0 */}
      {skipRows > 0 && (
        <div>
          <label className="label">
            Account match
            <span className="text-text-muted font-normal ml-2">
              Auto-match imports to an account
            </span>
          </label>
          <div className="flex flex-col gap-2 mt-3">
            <input
              type="text"
              value={accountPattern}
              onChange={(e) => setAccountPattern(e.target.value)}
              placeholder="e.g. IBAN: or (CH[0-9]{2}[\\s0-9]+)"
              className="input text-sm max-w-md font-mono"
            />

            {accountPatternPreview ? (
              <div className="flex items-center gap-1.5 text-ui text-text-muted">
                <span>Detected:</span>
                <span className="font-mono text-text-secondary">
                  {accountPatternPreview}
                </span>
              </div>
            ) : accountPattern ? (
              <div className="flex items-center gap-1.5 text-ui text-text-muted">
                <span>No match found in skipped rows</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Field mapping (field-centric) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label">
            Column mapping
            <span className="text-text-muted font-normal ml-2">
              Assign CSV columns to each transaction field
            </span>
          </label>
          {/* Multi-column separator selector */}
          {Array.from(fieldMappings.entries()).some(
            ([f, indices]) => MULTI_COLUMN_FIELDS.has(f) && indices.length >= 2,
          ) && (
            <div className="flex items-center gap-2">
              <span className="text-ui text-text-muted shrink-0">
                Merge separator
              </span>
              <select
                value={multiColumnSeparator}
                onChange={(e) => setMultiColumnSeparator(e.target.value)}
                className="select text-sm w-auto"
              >
                {SEPARATOR_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {!hasSampleData && (
            <p className="text-ui text-text-muted">
              No sample CSV loaded. You can still update parser settings, but mapping and preview require a file.
            </p>
          )}
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
                error={fieldErrors.get(field)}
                onAdd={(colIdx) => addColumnToField(field, colIdx)}
                onRemove={(colIdx) => removeColumnFromField(field, colIdx)}
              />
            );
          })}
        </div>
      </div>

      {/* Metadata fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label">
            Metadata fields
            <span className="text-text-muted font-normal ml-2">
              Key/value data extracted from selected CSV columns
            </span>
          </label>
          <button
            type="button"
            onClick={addMetadataMapping}
            className="btn-ghost"
          >
            <Plus size={14} />
            Add metadata
          </button>
        </div>

        {metadataMappings.length === 0 ? (
          <p className="text-ui text-text-muted">
            No metadata fields configured. Add a field to map one or more CSV
            columns.
          </p>
        ) : (
          <div className="space-y-2">
            {metadataMappings.map((mapping, index) => (
              <MetadataMappingRow
                key={`metadata-${index}`}
                mapping={mapping}
                headers={headers}
                dataRows={dataRows}
                mappedColumnIndices={mappedColumnIndices}
                onKeyChange={(value) => updateMetadataMappingKey(index, value)}
                onToggleColumn={(columnIndex) =>
                  toggleMetadataMappingColumn(index, columnIndex)
                }
                onRemove={() => removeMetadataMapping(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Field transforms */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label">
            Field transforms
            <span className="text-text-muted font-normal ml-2">
              Use transforms when your CSV needs cleanup or custom extraction
            </span>
          </label>
          <button onClick={addTransform} className="btn-ghost">
            <Plus size={14} />
            Add rule
          </button>
        </div>

        {transforms.length > 0 && (
          <div className="space-y-3">
            {transforms.map((transform, idx) => (
              <TransformRuleEditor
                key={idx}
                transform={transform}
                index={idx}
                total={transforms.length}
                preTransformRows={preTransformRows}
                onChange={(update) => updateTransform(idx, update)}
                onRemove={() => removeTransform(idx)}
                onMove={(dir) => moveTransform(idx, dir)}
              />
            ))}
          </div>
        )}

        {transforms.length === 0 && (
          <p className="text-ui text-text-muted">
            No transforms configured yet.
          </p>
        )}
      </div>

      {/* Preview table with highlights */}
      {hasSampleData && (
        <div>
          <label className="label mb-2 block">Data preview</label>
          <CsvPreviewTable
            headers={headers}
            rows={dataRows}
            columnHighlights={columnHighlights}
          />
        </div>
      )}

      {/* Parsed transaction preview */}
      {hasSampleData && parsedRows.length > 0 && (
        <ParsedTransactionPreview rows={parsedRows} />
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={hasValidationErrors || !name.trim()}
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

interface MetadataMappingRowProps {
  mapping: MetadataMapping;
  headers: string[];
  dataRows: string[][];
  mappedColumnIndices: Set<number>;
  onKeyChange: (value: string) => void;
  onToggleColumn: (columnIndex: number) => void;
  onRemove: () => void;
}

function MetadataMappingRow({
  mapping,
  headers,
  dataRows,
  mappedColumnIndices,
  onKeyChange,
  onToggleColumn,
  onRemove,
}: MetadataMappingRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const hasColumns = mapping.columnIndices.length > 0;
  const hasKey = mapping.key.trim().length > 0;

  return (
    <div
      className={cn(
        "p-3 rounded-(--radius-md) border",
        hasColumns && hasKey
          ? "border-text/15 bg-text/[0.03]"
          : "border-border bg-surface",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={mapping.key}
          onChange={(event) => onKeyChange(event.target.value)}
          placeholder="Metadata field name (e.g. Merchant)"
          className="input text-sm flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          className="btn-icon w-7 h-7 text-text-muted hover:text-expense"
          title="Remove metadata field"
        >
          <X size={12} />
        </button>
      </div>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((previous) => !previous)}
          className={cn(
            "flex items-center flex-wrap gap-1.5 w-full min-h-[36px] px-3 py-1.5 rounded-(--radius-md) border text-left cursor-pointer transition-colors",
            dropdownOpen
              ? "border-text/30 bg-surface"
              : hasColumns
                ? "border-text/15 bg-surface hover:border-text/25"
                : "border-border bg-surface hover:border-text-muted",
          )}
        >
          {!hasColumns && (
            <span className="text-ui text-text-muted">
              Select one or more columns...
            </span>
          )}
          {mapping.columnIndices.map((columnIndex) => (
            <span
              key={columnIndex}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-(--radius-sm) bg-text/10 text-ui text-text"
            >
              <span className="truncate max-w-[140px]">
                {headers[columnIndex] ?? `Col ${columnIndex + 1}`}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleColumn(columnIndex);
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
              "ml-auto shrink-0 text-text-muted transition-transform",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md) max-h-80 overflow-y-auto">
            {headers.map((header, columnIndex) => {
              const isSelected = mapping.columnIndices.includes(columnIndex);
              const isMapped = mappedColumnIndices.has(columnIndex);
              const isDisabled = isMapped && !isSelected;
              const sampleValue =
                dataRows.find(
                  (row) => (row[columnIndex] ?? "").trim() !== "",
                )?.[columnIndex] ?? "";

              return (
                <button
                  key={`${header}-${columnIndex}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onToggleColumn(columnIndex)}
                  className={cn(
                    "flex flex-col w-full px-3 py-2 text-left bg-transparent border-none transition-colors",
                    isDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer hover:bg-surface-hover",
                    isSelected && "bg-text/5",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-ui",
                        isSelected ? "text-text font-medium" : "text-text",
                      )}
                    >
                      {header || `Column ${columnIndex + 1}`}
                    </span>
                    {isDisabled && (
                      <span className="text-ui text-text-muted">
                        Mapped field
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-ui text-income">selected</span>
                    )}
                  </span>
                  {sampleValue && (
                    <span className="text-ui text-text-muted truncate mt-0.5 max-w-full">
                      {sampleValue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(!hasKey || !hasColumns) && (
        <p className="text-ui text-text-muted mt-2">
          Set a field name and choose at least one column.
        </p>
      )}
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
  /** Validation error for this field (shown inline). */
  error?: string;
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
  error,
  onAdd,
  onRemove,
}: FieldMappingRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Available columns for the dropdown
  const availableColumns = headers.map((header, idx) => {
    const alreadyAssigned = assignedIndices.includes(idx);
    // Disable if already used by another single-column field (and this field is also single-column)
    const usedBySingle =
      !isMulti && assignedSingleColumns.has(idx) && !alreadyAssigned;
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
        "flex items-center gap-4 p-3 rounded-(--radius-md) border",
        error
          ? "border-expense/40 bg-expense/[0.03]"
          : hasValue
            ? "border-text/15 bg-text/[0.03]"
            : "border-border bg-surface",
      )}
    >
      {/* Field label */}
      <div
        className={cn(
          "shrink-0",
          field === "transactionId" ? "w-56" : "w-28",
        )}
      >
        <span className="text-ui font-medium text-text">
          {TRANSACTION_FIELD_LABELS[field]}
        </span>
        {required && <span className="text-expense ml-0.5">*</span>}
        {error && <p className="text-ui text-expense mt-0.5">{error}</p>}
        {field === "transactionId" && (
          <span className="inline-flex items-center ml-1.5 align-middle">
            <FieldHelpTooltip text="Recommended for reliable deduplication. Without it, imports only show possible matches." />
          </span>
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
              "flex items-center flex-wrap gap-1.5 w-full min-h-[36px] px-3 py-1.5",
              "rounded-(--radius-md) border text-left cursor-pointer transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-text-muted",
              dropdownOpen
                ? "border-text/30 bg-surface"
                : hasValue
                  ? "border-text/15 bg-surface hover:border-text/25"
                  : "border-border bg-surface hover:border-text-muted",
            )}
          >
            {assignedIndices.length === 0 && (
              <span className="text-ui text-text-muted">
                Select column{isMulti ? "s" : ""}...
              </span>
            )}
            {assignedIndices.map((colIdx) => (
              <span
                key={colIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-(--radius-sm) bg-text/10 text-ui text-text"
              >
                <span className="truncate max-w-[120px]">
                  {headers[colIdx] ?? `Col ${colIdx + 1}`}
                </span>
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
                "ml-auto shrink-0 text-text-muted transition-transform",
                dropdownOpen && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md) max-h-80 overflow-y-auto">
              {availableColumns.map(
                ({ idx, header, alreadyAssigned, disabled }) => {
                  const sampleValue = dataRows[0]?.[idx] ?? "";
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelect(idx)}
                      className={cn(
                        "flex flex-col w-full px-3 py-2 text-left bg-transparent border-none transition-colors",
                        disabled
                          ? "opacity-30 cursor-not-allowed"
                          : "cursor-pointer hover:bg-surface-hover",
                        alreadyAssigned && isMulti && "bg-text/5",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-ui",
                            alreadyAssigned
                              ? "text-text font-medium"
                              : "text-text",
                          )}
                        >
                          {header}
                        </span>
                        {alreadyAssigned && isMulti && (
                          <span className="text-ui text-income">selected</span>
                        )}
                      </span>
                      {sampleValue && (
                        <span className="text-ui text-text-muted truncate mt-0.5 max-w-full">
                          {sampleValue}
                        </span>
                      )}
                    </button>
                  );
                },
              )}
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
}

const PARSED_PAGE_SIZES = [5, 10, 25] as const;

function ParsedTransactionPreview({ rows }: ParsedTransactionPreviewProps) {
  const { formatSignedCurrency } = useFormatCurrency();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PARSED_PAGE_SIZES[0]);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  // Filter rows if warnings-only mode is active
  const filteredRows = showWarningsOnly
    ? rows.filter((r) => r.errors.length > 0)
    : rows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, filteredRows.length);
  const displayRows = filteredRows.slice(start, end);

  const hasCurrency = useMemo(() => rows.some((r) => r.currency), [rows]);

  const hasTime = useMemo(() => rows.some((r) => r.time), [rows]);

  const errorCount = useMemo(
    () => rows.filter((r) => r.errors.length > 0).length,
    [rows],
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <label className="label">Parsed preview</label>
        <span className="text-ui text-text-muted">
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
        {errorCount > 0 && (
          <button
            onClick={() => {
              setShowWarningsOnly(!showWarningsOnly);
              setPage(0);
            }}
            className={cn(
              "flex items-center gap-1 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showWarningsOnly ? "opacity-100" : "opacity-60 hover:opacity-100",
            )}
          >
            <AlertTriangle size={11} className="text-warning" />
            <span className="text-ui text-warning hover:underline">
              {errorCount} with warnings{showWarningsOnly ? " (filtered)" : ""}
            </span>
            <Filter size={10} className="text-warning" />
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-(--radius-md) border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                Date
              </th>
              {hasTime && (
                <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                  Time
                </th>
              )}
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                Description
              </th>
              <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                Category
              </th>
              {hasCurrency && (
                <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                  Currency
                </th>
              )}
              <th className="px-3 py-2.5 text-right text-text-muted font-medium">
                Amount
              </th>
              <th className="px-3 py-2.5 text-center text-text-muted font-medium w-10">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const hasErrors = row.errors.length > 0;
              // Find the original index in rows (for unique keys)
              const idx = rows.indexOf(row);
              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-border last:border-b-0 transition-colors",
                    hasErrors && "bg-warning/[0.03]",
                  )}
                >
                  <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                    {row.date ? formatDate(row.date) : "\u2014"}
                  </td>
                  {hasTime && (
                    <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                      {row.time ? row.time.slice(0, 5) : "\u2014"}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-text">
                    <span
                      className="break-words"
                      title={row.description || undefined}
                    >
                      {row.description || "\u2014"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {row.category || "\u2014"}
                  </td>
                  {hasCurrency && (
                    <td className="px-3 py-2.5 text-text-muted">
                      {row.currency || "\u2014"}
                    </td>
                  )}
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-medium whitespace-nowrap",
                      row.amount >= 0 ? "text-income" : "text-expense",
                    )}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatSignedCurrency(row.amount, row.currency || "CHF")}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {hasErrors ? (
                      <span title={row.errors.join(", ")}>
                        <AlertTriangle
                          size={14}
                          className="text-warning inline"
                        />
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
        {filteredRows.length > PARSED_PAGE_SIZES[0] && (
          <div className="flex items-center justify-between px-3 py-2 text-ui text-text-muted bg-surface border-t border-border">
            <div className="flex items-center gap-1.5">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer"
              >
                {PARSED_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <span>
              {start + 1}–{end} of {filteredRows.length}
            </span>
            <PaginationButtons
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Highlighted Source ──────────────────────────────────────

interface HighlightedSourceProps {
  source: string;
  highlights: { start: number; end: number; groupName: string }[];
}

function HighlightedSource({ source, highlights }: HighlightedSourceProps) {
  if (highlights.length === 0) {
    return <>{source}</>;
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const { start, end, groupName } of highlights) {
    if (start > cursor) {
      segments.push(source.slice(cursor, start));
    }
    segments.push(
      <span
        key={`${start}-${end}`}
        className="bg-accent/15 rounded-sm px-px"
        title={groupName}
      >
        {source.slice(start, end)}
      </span>,
    );
    cursor = end;
  }

  if (cursor < source.length) {
    segments.push(source.slice(cursor));
  }

  return <>{segments}</>;
}

// ─── Transform Rule Editor ───────────────────────────────────

const TRANSFORMABLE_FIELDS: { value: TransformableField; label: string }[] = [
  { value: "description", label: "Description" },
  { value: "category", label: "Category" },
  { value: "currency", label: "Currency" },
];

interface TransformRuleEditorProps {
  transform: FieldTransform;
  index: number;
  total: number;
  preTransformRows: ParsedRow[];
  onChange: (update: Partial<FieldTransform>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

function TransformRuleEditor({
  transform,
  index,
  total,
  preTransformRows,
  onChange,
  onRemove,
  onMove,
}: TransformRuleEditorProps) {
  const [showMatches, setShowMatches] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Compute match details from parsed field values (shows actual transaction data)
  const matchDetails = useMemo(() => {
    type MatchItem = {
      source: string;
      output?: string;
      highlights: { start: number; end: number; groupName: string }[];
    };
    if (!transform.matchPattern) {
      return {
        matched: 0,
        total: preTransformRows.length,
        valid: true,
        items: [] as MatchItem[],
      };
    }

    const values = preTransformRows.map((row) => {
      const val = row[transform.sourceField];
      return typeof val === "string" ? val : "";
    });

    try {
      const re = new RegExp(transform.matchPattern, "i");
      const items: MatchItem[] = [];

      let extractRe: RegExp | null = null;
      if (transform.extractPattern) {
        try {
          extractRe = new RegExp(transform.extractPattern, "d");
        } catch {
          /* invalid */
        }
      }

      for (const value of values) {
        if (re.test(value)) {
          let output: string | undefined;
          let highlights: { start: number; end: number; groupName: string }[] =
            [];

          if (extractRe) {
            const m = value.match(extractRe);
            if (m?.groups && Object.keys(m.groups).length > 0) {
              // Use explicit replacement template, or auto-join all named groups
              if (transform.replacement) {
                output = transform.replacement.replace(
                  /\{\{(\w+)\}\}/g,
                  (_, name) => m.groups?.[name] ?? "",
                );
              } else {
                output = Object.values(m.groups).filter(Boolean).join(" ");
              }
              // Extract highlight positions from named capture groups
              const indices = (
                m as RegExpExecArray & {
                  indices?: { groups?: Record<string, [number, number]> };
                }
              ).indices;
              if (indices?.groups) {
                highlights = Object.entries(indices.groups)
                  .filter(
                    (entry): entry is [string, [number, number]] =>
                      entry[1] != null,
                  )
                  .map(([groupName, [start, end]]) => ({
                    start,
                    end,
                    groupName,
                  }))
                  .sort((a, b) => a.start - b.start);
                // Remove overlaps: skip any span that starts before the previous one ends
                const deduped: typeof highlights = [];
                for (const h of highlights) {
                  if (
                    deduped.length === 0 ||
                    h.start >= deduped[deduped.length - 1].end
                  ) {
                    deduped.push(h);
                  }
                }
                highlights = deduped;
              }
            }
          } else {
            // No extract pattern — highlight the full match span
            const matchExec = re.exec(value);
            if (matchExec) {
              highlights = [
                {
                  start: matchExec.index,
                  end: matchExec.index + matchExec[0].length,
                  groupName: "match",
                },
              ];
            }
          }

          items.push({ source: value, output, highlights });
        }
      }

      return {
        matched: items.length,
        total: values.length,
        valid: true,
        items,
      };
    } catch {
      return {
        matched: 0,
        total: values.length,
        valid: false,
        items: [] as {
          source: string;
          output?: string;
          highlights: { start: number; end: number; groupName: string }[];
        }[],
      };
    }
  }, [
    transform.sourceField,
    transform.matchPattern,
    transform.extractPattern,
    transform.replacement,
    preTransformRows,
  ]);

  // Validate extract regex
  const extractValid = useMemo(() => {
    if (!transform.extractPattern) return true;
    try {
      new RegExp(transform.extractPattern);
      return true;
    } catch {
      return false;
    }
  }, [transform.extractPattern]);

  return (
    <div className="p-3 rounded-(--radius-md) border border-border bg-surface space-y-2.5">
      {/* Header row: label + actions */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={transform.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={`Rule ${index + 1}`}
          className="input text-sm flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {total > 1 && (
            <>
              <button
                onClick={() => onMove("up")}
                disabled={index === 0}
                className="btn-icon w-7 h-7 disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={() => onMove("down")}
                disabled={index === total - 1}
                className="btn-icon w-7 h-7 disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </>
          )}
          <button
            onClick={onRemove}
            className="btn-icon w-7 h-7 text-text-muted hover:text-expense"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Source → Target */}
      <div className="flex items-center gap-2">
        <label className="text-ui text-text-muted w-14 shrink-0">Source</label>
        <select
          value={transform.sourceField}
          onChange={(e) =>
            onChange({ sourceField: e.target.value as TransformableField })
          }
          className="select text-sm flex-1"
        >
          {TRANSFORMABLE_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="text-ui text-text-muted">&rarr;</span>
        <label className="text-ui text-text-muted w-14 shrink-0">Target</label>
        <select
          value={transform.targetField}
          onChange={(e) =>
            onChange({ targetField: e.target.value as TransformableField })
          }
          className="select text-sm flex-1"
        >
          {TRANSFORMABLE_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Match pattern */}
      <div className="flex items-center gap-2">
        <label className="text-ui text-text-muted w-14 shrink-0 inline-flex items-center gap-1">
          Match
          <FieldHelpTooltip text="Regex that decides which rows this rule applies to." />
          {!transform.matchPattern && (
            <span className="text-expense ml-0.5">*</span>
          )}
        </label>
        <input
          type="text"
          value={transform.matchPattern}
          onChange={(e) => onChange({ matchPattern: e.target.value })}
          placeholder="Regex to test (e.g. ^TWINT)"
          className={cn(
            "input text-sm font-mono flex-1",
            !matchDetails.valid && "border-expense",
          )}
        />
        {transform.matchPattern && (
          <>
            <span
              className={cn(
                "text-ui shrink-0 tabular-nums whitespace-nowrap",
                !matchDetails.valid
                  ? "text-expense"
                  : matchDetails.matched > 0
                    ? "text-income"
                    : "text-text-muted",
              )}
            >
              {!matchDetails.valid
                ? "invalid"
                : `${matchDetails.matched}/${matchDetails.total}`}
            </span>
            {matchDetails.valid && matchDetails.matched > 0 && (
              <button
                type="button"
                onClick={() => setShowMatches(!showMatches)}
                className="text-ui text-text-muted hover:text-text transition-colors shrink-0 bg-transparent border-none cursor-pointer"
              >
                {showMatches ? "Hide" : "Show"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Extract pattern */}
      <div className="flex items-center gap-2">
        <label className="text-ui text-text-muted w-14 shrink-0 inline-flex items-center gap-1">
          Extract
          <FieldHelpTooltip text="Use named capture groups, for example (?<merchant>...), to pick values from the source." />
          {!transform.extractPattern && (
            <span className="text-expense ml-0.5">*</span>
          )}
        </label>
        <input
          type="text"
          value={transform.extractPattern}
          onChange={(e) => onChange({ extractPattern: e.target.value })}
          placeholder="Regex with named groups: (?<merchant>.+)"
          className={cn(
            "input text-sm font-mono flex-1",
            !extractValid && "border-expense",
          )}
        />
        {!extractValid && (
          <span className="text-ui text-expense shrink-0">invalid</span>
        )}
      </div>

      {/* Replacement template */}
      <div className="flex items-center gap-2">
        <label className="text-ui text-text-muted w-14 shrink-0 inline-flex items-center gap-1">
          Output
          <FieldHelpTooltip text="Use templates like {{merchant}}. Leave empty to auto-join all named groups." />
        </label>
        <input
          type="text"
          value={transform.replacement}
          onChange={(e) => onChange({ replacement: e.target.value })}
          placeholder="Template: {{merchant}}"
          className="input text-sm font-mono flex-1"
        />
      </div>

      {/* Matched rows preview */}
      {showMatches && matchDetails.items.length > 0 && (
        <div className="rounded-(--radius-sm) border border-border overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {matchDetails.items
              .slice(0, showAllMatches ? undefined : 5)
              .map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-1.5 text-sm border-b border-border last:border-b-0 bg-bg/50"
                >
                  <span className="text-text-secondary break-words min-w-0 flex-1 font-mono">
                    <HighlightedSource
                      source={item.source}
                      highlights={item.highlights}
                    />
                  </span>
                  {item.output !== undefined && (
                    <>
                      <span className="text-text-muted shrink-0 mt-0.5">
                        &rarr;
                      </span>
                      <span className="text-income break-words min-w-0 flex-1 font-mono">
                        {item.output}
                      </span>
                    </>
                  )}
                </div>
              ))}
          </div>
          {matchDetails.items.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllMatches(!showAllMatches)}
              className="w-full px-2.5 py-1.5 text-ui text-text-muted hover:text-text bg-surface border-t border-border transition-colors cursor-pointer border-x-0 border-b-0"
            >
              {showAllMatches
                ? "Show less"
                : `Show all ${matchDetails.items.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldHelpTooltipProps {
  text: string;
}

function FieldHelpTooltip({ text }: FieldHelpTooltipProps) {
  return (
    <span
      className="inline-flex items-center text-text-muted hover:text-text cursor-help"
      title={text}
      aria-label={text}
    >
      <CircleHelp size={12} />
    </span>
  );
}
