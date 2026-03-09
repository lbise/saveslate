import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MetadataMapping } from "../../types";

export interface MetadataMappingRowProps {
  mapping: MetadataMapping;
  headers: string[];
  dataRows: string[][];
  mappedColumnIndices: Set<number>;
  onKeyChange: (value: string) => void;
  onToggleColumn: (columnIndex: number) => void;
  onRemove: () => void;
}

export function MetadataMappingRow({
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
          ? "border-foreground/15 bg-foreground/[0.03]"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Input
          type="text"
          value={mapping.key}
          onChange={(event) => onKeyChange(event.target.value)}
          placeholder="Metadata field name (e.g. Merchant)"
          className="text-sm flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onRemove}
          className="size-7 text-dimmed hover:text-expense"
          aria-label="Remove metadata field" title="Remove metadata field"
        >
          <X size={12} />
        </Button>
      </div>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((previous) => !previous)}
          className={cn(
            "flex items-center flex-wrap gap-1.5 w-full min-h-[36px] px-3 py-1.5 rounded-(--radius-md) border text-left cursor-pointer transition-colors",
            dropdownOpen
              ? "border-foreground/30 bg-card"
              : hasColumns
                ? "border-foreground/15 bg-card hover:border-foreground/25"
                : "border-border bg-card hover:border-dimmed",
          )}
        >
          {!hasColumns && (
            <span className="text-sm text-dimmed">
              Select one or more columns...
            </span>
          )}
          {mapping.columnIndices.map((columnIndex) => (
            <span
              key={columnIndex}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-(--radius-sm) bg-foreground/10 text-sm text-foreground"
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

        {dropdownOpen && (
            <ScrollArea className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md) max-h-80">
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
                      : "cursor-pointer hover:bg-secondary",
                    isSelected && "bg-foreground/5",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        isSelected ? "text-foreground font-medium" : "text-foreground",
                      )}
                    >
                      {header || `Column ${columnIndex + 1}`}
                    </span>
                    {isDisabled && (
                      <span className="text-sm text-dimmed">
                        Mapped field
                      </span>
                    )}
                    {isSelected && (
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
            })}
          </ScrollArea>
        )}
      </div>

      {(!hasKey || !hasColumns) && (
        <p className="text-sm text-dimmed mt-2">
          Set a field name and choose at least one column.
        </p>
      )}
    </div>
  );
}
