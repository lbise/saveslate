import { useState, useMemo, useCallback } from "react";
import { Save, RotateCcw, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCreateCsvParser, useUpdateCsvParser, toCsvParserConfig } from "../../hooks/api";
import { CsvPreviewTable } from "./CsvPreviewTable";
import { MetadataMappingRow } from "./MetadataMappingRow";
import { FieldMappingRow } from "./FieldMappingRow";
import { ParsedTransactionPreview } from "./ParsedTransactionPreview";
import { TransformRuleEditor } from "./TransformRuleEditor";
import type {
  CsvDelimiter,
  AmountFormat,
  TransactionField,
  ColumnMapping,
  CsvParser,
  ParsedRow,
  FieldTransform,
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

const EMPTY_SEPARATOR_SENTINEL = "__empty__";

const SEPARATOR_OPTIONS: { value: string; label: string }[] = [
  { value: " ", label: "Space" },
  { value: ", ", label: "Comma + space" },
  { value: " - ", label: "Dash" },
  { value: " / ", label: "Slash" },
  { value: EMPTY_SEPARATOR_SENTINEL, label: "None (concat)" },
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

  // ─── Mutations ─────────────────────────────────────────────
  const createParserMutation = useCreateCsvParser();
  const updateParserMutation = useUpdateCsvParser();

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
  const handleSave = async () => {
    if (hasValidationErrors || nameError) return;

    // Build header patterns from current headers + mapped columns
    const mappedColIndices = new Set<number>();
    for (const indices of fieldMappings.values()) {
      for (const i of indices) mappedColIndices.add(i);
    }
    const headerPatterns = headers
      .filter((_, i) => mappedColIndices.has(i))
      .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape for regex

    const parserFields: Partial<CsvParser> = {
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

    const config = toCsvParserConfig(parserFields);

    try {
      if (existingParser) {
        const updated = await updateParserMutation.mutateAsync({
          id: existingParser.id,
          name: name.trim(),
          config,
        });
        toast.success("Parser updated");
        onSave(updated);
      } else {
        const created = await createParserMutation.mutateAsync({
          name: name.trim(),
          config,
        });
        toast.success("Parser created");
        onSave(created);
      }
    } catch {
      toast.error("Failed to save parser");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
          {existingParser ? <Pencil size={18} /> : <Plus size={18} />}
          {existingParser ? "Edit parser" : "Create new parser"}
        </h2>
        <Button variant="ghost" onClick={onCancel}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>

      {/* Parser name */}
      <div>
        <Label className="mb-1.5 block">Parser name</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. UBS Export, PostFinance CSV..."
          className="max-w-sm"
        />
        {nameError && name.length > 0 && (
          <p className="text-sm text-expense mt-1">{nameError}</p>
        )}
      </div>

      {/* Configuration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Delimiter */}
        <div>
          <Label className="mb-1.5 block">Delimiter</Label>
          <Select value={delimiter} onValueChange={(value) => setDelimiter(value as CsvDelimiter)}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELIMITER_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Header row */}
        <div>
          <Label className="mb-1.5 block">Header row</Label>
          <button
            onClick={() => setHasHeaderRow(!hasHeaderRow)}
            className={cn(
              "w-full px-3 py-2.5 rounded-(--radius-md) border text-sm font-medium transition-colors cursor-pointer",
              hasHeaderRow
                ? "bg-foreground/10 text-foreground border-foreground/20"
                : "bg-card text-dimmed border-border hover:border-dimmed",
            )}
          >
            {hasHeaderRow ? "Yes" : "No"}
          </button>
        </div>

        {/* Skip rows */}
        <div>
          <Label className="mb-1.5 block">Skip rows</Label>
          <Input
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
            className="text-sm"
          />
        </div>

        {/* Amount format */}
        <div>
          <Label className="mb-1.5 block">Amount format</Label>
          <Select value={amountFormat} onValueChange={(value) => setAmountFormat(value as AmountFormat)}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single column</SelectItem>
              <SelectItem value="amount-type">Amount + indicator</SelectItem>
              <SelectItem value="debit-credit">Debit / Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time source */}
        <div>
          <Label className="mb-1.5 block">Time source</Label>
          <Select value={timeMode} onValueChange={(value) => setTimeMode(value as CsvParser["timeMode"])}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No time</SelectItem>
              <SelectItem value="separate-column">Separate column</SelectItem>
              <SelectItem value="in-date-column">In date column</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date format */}
        <div>
          <Label className="mb-1.5 block">
            {timeMode === "in-date-column" ? "Date/time format" : "Date format"}
          </Label>
          <Select value={effectiveDateFormat} onValueChange={(value) => setDateFormat(value)}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFormatOptions.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time format (separate column mode) */}
        {timeMode === "separate-column" && (
          <div>
            <Label className="mb-1.5 block">Time format</Label>
            <Select value={effectiveTimeFormat ?? TIME_FORMAT_PRESETS[0].value} onValueChange={(value) => setTimeFormat(value)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Decimal separator */}
        <div>
          <Label className="mb-1.5 block">Decimal sep.</Label>
          <Select value={decimalSeparator} onValueChange={(value) => setDecimalSeparator(value as "." | ",")}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=".">Dot (.)</SelectItem>
              <SelectItem value=",">Comma (,)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Account match — only when skipRows > 0 */}
      {skipRows > 0 && (
        <div>
          <Label>
            Account match
            <span className="text-dimmed font-normal ml-2">
              Auto-match imports to an account
            </span>
          </Label>
          <div className="flex flex-col gap-2 mt-3">
            <Input
              type="text"
              value={accountPattern}
              onChange={(e) => setAccountPattern(e.target.value)}
              placeholder="e.g. IBAN: or (CH[0-9]{2}[\\s0-9]+)"
              className="text-sm max-w-md font-mono"
            />

            {accountPatternPreview ? (
              <div className="flex items-center gap-1.5 text-sm text-dimmed">
                <span>Detected:</span>
                <span className="font-mono text-muted-foreground">
                  {accountPatternPreview}
                </span>
              </div>
            ) : accountPattern ? (
              <div className="flex items-center gap-1.5 text-sm text-dimmed">
                <span>No match found in skipped rows</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Field mapping (field-centric) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>
            Column mapping
            <span className="text-dimmed font-normal ml-2">
              Assign CSV columns to each transaction field
            </span>
          </Label>
          {/* Multi-column separator selector */}
          {Array.from(fieldMappings.entries()).some(
            ([f, indices]) => MULTI_COLUMN_FIELDS.has(f) && indices.length >= 2,
          ) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-dimmed shrink-0">
                Merge separator
              </span>
              <Select value={multiColumnSeparator || EMPTY_SEPARATOR_SENTINEL} onValueChange={(value) => setMultiColumnSeparator(value === EMPTY_SEPARATOR_SENTINEL ? "" : value)}>
                <SelectTrigger className="text-sm w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEPARATOR_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {!hasSampleData && (
            <p className="text-sm text-dimmed">
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
          <Label>
            Metadata fields
            <span className="text-dimmed font-normal ml-2">
              Key/value data extracted from selected CSV columns
            </span>
          </Label>
          <Button
            variant="ghost"
            type="button"
            onClick={addMetadataMapping}
          >
            <Plus size={14} />
            Add metadata
          </Button>
        </div>

        {metadataMappings.length === 0 ? (
          <p className="text-sm text-dimmed">
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
          <Label>
            Field transforms
            <span className="text-dimmed font-normal ml-2">
              Use transforms when your CSV needs cleanup or custom extraction
            </span>
          </Label>
          <Button variant="ghost" onClick={addTransform}>
            <Plus size={14} />
            Add rule
          </Button>
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
          <p className="text-sm text-dimmed">
            No transforms configured yet.
          </p>
        )}
      </div>

      {/* Preview table with highlights */}
      {hasSampleData && (
        <div>
          <Label className="mb-2 block">Data preview</Label>
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
        <Button
          onClick={handleSave}
          disabled={hasValidationErrors || !name.trim()}
        >
          <Save size={14} />
          Save parser
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
