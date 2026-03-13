import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, CircleHelp } from "lucide-react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRANSACTION_FIELD_LABELS } from "../../types";
import type { TransactionField } from "../../types";

/** All assignable fields (excluding 'ignore'). */
type AssignableField = Exclude<TransactionField, "ignore">;

export interface FieldMappingRowProps {
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

export function FieldMappingRow({
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
        "flex flex-col gap-3 p-3 rounded-(--radius-md) border sm:flex-row sm:items-center sm:gap-4",
        error
          ? "border-expense/40 bg-expense/[0.03]"
          : hasValue
            ? "border-foreground/15 bg-foreground/[0.03]"
            : "border-border bg-card",
      )}
    >
      {/* Field label */}
      <div
        className={cn(
          "w-full sm:shrink-0",
          field === "transactionId" ? "sm:w-56" : "sm:w-28",
        )}
      >
        <span className="text-sm font-medium text-foreground">
          {TRANSACTION_FIELD_LABELS[field]}
        </span>
        {required && <span className="text-expense ml-0.5">*</span>}
        {error && <p className="text-sm text-expense mt-0.5">{error}</p>}
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
              "focus:outline-none focus:ring-1 focus:ring-dimmed",
              dropdownOpen
                ? "border-foreground/30 bg-card"
                : hasValue
                  ? "border-foreground/15 bg-card hover:border-foreground/25"
                  : "border-border bg-card hover:border-dimmed",
            )}
          >
            {assignedIndices.length === 0 && (
              <span className="text-sm text-dimmed">
                Select column{isMulti ? "s" : ""}...
              </span>
            )}
            {assignedIndices.map((colIdx) => (
              <span
                key={colIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-(--radius-sm) bg-foreground/10 text-sm text-foreground"
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
                  className="shrink-0 hover:text-expense transition-colors" aria-label="Remove column"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <ChevronDown
              size={14}
              className={cn(
                "ml-auto shrink-0 text-dimmed transition-transform",
                dropdownOpen && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <ScrollArea className="absolute top-full left-0 mt-1 z-20 max-h-80 w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-(--radius-md) border border-border bg-card py-1 shadow-(--shadow-md) sm:w-max sm:min-w-full sm:max-w-[32rem]">
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
                        "flex w-full min-w-0 flex-col border-none bg-transparent px-3 py-2 text-left transition-colors",
                        disabled
                          ? "opacity-30 cursor-not-allowed"
                          : "cursor-pointer hover:bg-secondary",
                        alreadyAssigned && isMulti && "bg-foreground/5",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          title={header || `Column ${idx + 1}`}
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            alreadyAssigned
                              ? "text-foreground font-medium"
                              : "text-foreground",
                          )}
                        >
                          {header || `Column ${idx + 1}`}
                        </span>
                        {alreadyAssigned && isMulti && (
                          <span className="text-sm text-income">selected</span>
                        )}
                      </span>
                      {sampleValue && (
                        <span className="text-sm text-dimmed truncate mt-0.5 max-w-full">
                          {sampleValue}
                        </span>
                      )}
                    </button>
                  );
                },
              )}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────

function FieldHelpTooltip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center text-dimmed hover:text-foreground cursor-help"
      title={text}
      aria-label={text}
    >
      <CircleHelp size={12} />
    </span>
  );
}
