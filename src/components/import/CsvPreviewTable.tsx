import { cn } from '../../lib/utils';

interface CsvPreviewTableProps {
  headers: string[];
  rows: string[][];
  maxRows?: number;
  /** If provided, highlight columns with assigned fields */
  columnHighlights?: Map<number, string>;
}

export function CsvPreviewTable({
  headers,
  rows,
  maxRows = 8,
  columnHighlights,
}: CsvPreviewTableProps) {
  const displayRows = rows.slice(0, maxRows);

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
      {rows.length > maxRows && (
        <div className="px-3 py-2 text-ui text-text-muted bg-surface border-t border-border">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}
