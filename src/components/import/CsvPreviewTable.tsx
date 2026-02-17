import { useState, useEffect } from 'react';
import { PaginationButtons } from '../ui';
import { cn } from '../../lib/utils';

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

interface CsvPreviewTableProps {
  headers: string[];
  rows: string[][];
  /** If provided, highlight columns with assigned fields */
  columnHighlights?: Map<number, string>;
}

export function CsvPreviewTable({
  headers,
  rows,
  columnHighlights,
}: CsvPreviewTableProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  // Reset to first page when rows change
  useEffect(() => { setPage(0); }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const start = page * pageSize;
  const end = Math.min(start + pageSize, rows.length);
  const displayRows = rows.slice(start, end);

  return (
    <div className="overflow-x-auto rounded-(--radius-md) border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, i) => {
              const highlight = columnHighlights?.get(i);
              return (
                <th
                  key={i}
                  className={cn(
                    'px-3 py-2.5 text-left font-medium whitespace-nowrap',
                    highlight
                      ? 'text-text bg-text/5'
                      : 'text-text-muted bg-surface',
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="truncate max-w-[160px]">{h}</span>
                    {highlight && (
                      <span className="text-ui text-income font-normal">{highlight}</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-border last:border-b-0 hover:bg-surface-hover/30 transition-colors"
            >
              {headers.map((_, colIdx) => {
                const highlight = columnHighlights?.get(colIdx);
                return (
                  <td
                    key={colIdx}
                    className={cn(
                      'px-3 py-2 whitespace-nowrap text-text-secondary',
                      highlight && 'bg-text/[0.02]',
                    )}
                  >
                    <span className="truncate block max-w-[200px]">
                      {row[colIdx] ?? ''}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PAGE_SIZE_OPTIONS[0] && (
        <div className="flex items-center justify-between px-3 py-2 text-ui text-text-muted bg-surface border-t border-border">
          <div className="flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span>{start + 1}–{end} of {rows.length}</span>
          <PaginationButtons page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
