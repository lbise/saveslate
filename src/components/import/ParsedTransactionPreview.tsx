import { useState, useMemo } from "react";
import { AlertTriangle, Check, Filter } from "lucide-react";
import { cn, formatDate } from "../../lib/utils";
import { useFormatCurrency } from "../../hooks";
import { PaginationButtons } from "../ui";
import type { ParsedRow } from "../../types";

const PARSED_PAGE_SIZES = [5, 10, 25] as const;

export interface ParsedTransactionPreviewProps {
  rows: ParsedRow[];
}

export function ParsedTransactionPreview({ rows }: ParsedTransactionPreviewProps) {
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
