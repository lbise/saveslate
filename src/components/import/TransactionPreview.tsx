import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { ACCOUNTS } from '../../data/mock/accounts';
import type { ParsedRow } from '../../types';

interface TransactionPreviewProps {
  rows: ParsedRow[];
  onConfirm: (selectedRows: ParsedRow[], accountId: string, importName: string) => void;
  onBack: () => void;
  detectedIdentifier?: string;
  fileName?: string;
}

const PREVIEW_PAGE_SIZES = [20, 25, 50] as const;

export function TransactionPreview({ rows, onConfirm, onBack, detectedIdentifier, fileName }: TransactionPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(() => {
    // Pre-select all rows without errors
    const set = new Set<number>();
    rows.forEach((r, i) => {
      if (r.errors.length === 0) set.add(i);
    });
    return set;
  });
  const [accountId, setAccountId] = useState(ACCOUNTS[0]?.id ?? '');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PREVIEW_PAGE_SIZES[0]);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [importName, setImportName] = useState(fileName ?? '');

  // Reset to first page when rows or filter changes
  useEffect(() => { setPage(0); }, [rows, showWarningsOnly]);

  // Find matching account ID based on detected identifier
  const matchedAccountId = useMemo(() => {
    if (!detectedIdentifier) return undefined;
    const normalized = detectedIdentifier.replace(/\s/g, '');
    return ACCOUNTS.find(acc => 
      acc.accountIdentifier?.replace(/\s/g, '') === normalized
    )?.id;
  }, [detectedIdentifier]);

  // Auto-select account when an identifier is detected
  useEffect(() => {
    if (matchedAccountId) {
      setAccountId(matchedAccountId);
    }
  }, [matchedAccountId]);

  const hasCurrency = useMemo(
    () => rows.some((r) => r.currency),
    [rows],
  );

  const toggleRow = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((_, i) => i)));
    }
  };

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    
    // Count ALL errors, not just selected ones
    const errorCount = rows.filter(r => r.errors.length > 0).length;

    for (const [i, row] of rows.entries()) {
      if (!selected.has(i)) continue;
      count++;
      if (row.amount >= 0) income += row.amount;
      else expense += Math.abs(row.amount);
    }

    return { income, expense, count, errorCount };
  }, [rows, selected]);

  const handleConfirm = () => {
    const selectedRows = rows.filter((_, i) => selected.has(i));
    onConfirm(selectedRows, accountId, importName);
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <span className="text-ui text-text-muted">
            {stats.count} of {rows.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-income" />
          <span className="text-ui text-text-muted">
            Income: <span className="text-text font-medium">{formatCurrency(stats.income)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <span className="text-ui text-text-muted">
            Expense: <span className="text-text font-medium">{formatCurrency(stats.expense)}</span>
          </span>
        </div>
      </div>

      {/* Account selector and import name */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Import name</label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder={fileName ?? 'Optional name for this import'}
              className="input text-sm max-w-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Import into</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="select text-sm max-w-xs"
            >
              {ACCOUNTS.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}){acc.id === matchedAccountId ? ' — matched' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warnings filter */}
      {stats.errorCount > 0 && (
        <div className="flex items-center px-1">
          <button
            onClick={() => setShowWarningsOnly(!showWarningsOnly)}
            className={cn(
              "flex items-center gap-2 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showWarningsOnly ? "opacity-100" : "opacity-60 hover:opacity-100"
            )}
          >
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-ui text-warning font-medium hover:underline">
              {stats.errorCount} with warnings{showWarningsOnly ? ' (filtered)' : ''}
            </span>
            <Filter size={12} className="text-warning" />
          </button>
        </div>
      )}

      {/* Transaction table */}
      {(() => {
        // Filter rows if warnings-only mode is active
        const filteredRows = showWarningsOnly
          ? rows.filter(r => r.errors.length > 0)
          : rows;

        const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
        const start = page * pageSize;
        const end = Math.min(start + pageSize, filteredRows.length);
        const displayRows = filteredRows.slice(start, end);

        return (
          <div className="overflow-x-auto rounded-(--radius-md) border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-3 py-2.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length}
                      onChange={toggleAll}
                      className="cursor-pointer accent-text"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">Description</th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">Category</th>
                  {hasCurrency && (
                    <th className="px-3 py-2.5 text-left text-text-muted font-medium">Currency</th>
                  )}
                  <th className="px-3 py-2.5 text-right text-text-muted font-medium">Amount</th>
                  <th className="px-3 py-2.5 text-center text-text-muted font-medium w-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  // Find the original index in the full rows array
                  const idx = rows.indexOf(row);
                  const isSelected = selected.has(idx);
                  const hasErrors = row.errors.length > 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => toggleRow(idx)}
                      className={cn(
                        'border-b border-border last:border-b-0 cursor-pointer transition-colors',
                        isSelected
                          ? 'hover:bg-surface-hover/50'
                          : 'opacity-40 hover:opacity-60',
                        hasErrors && isSelected && 'bg-warning/[0.03]',
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(idx)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer accent-text"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                        {row.date ? formatDate(row.date) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-text">
                        <span className="break-words">{row.description || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">
                        {row.category || '—'}
                      </td>
                      {hasCurrency && (
                        <td className="px-3 py-2.5 text-text-muted">
                          {row.currency || '—'}
                        </td>
                      )}
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
                            <AlertTriangle size={14} className="text-warning inline" />
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
            {filteredRows.length > PREVIEW_PAGE_SIZES[0] && (
              <div className="flex items-center justify-between px-3 py-2 text-ui text-text-muted bg-surface border-t border-border">
                <div className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer"
                  >
                    {PREVIEW_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <span>{start + 1}–{end} of {filteredRows.length}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="p-0.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-text-muted"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-0.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-text-muted"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={stats.count === 0 || !accountId}
          className="btn-primary"
        >
          Import {stats.count} transaction{stats.count !== 1 ? 's' : ''}
        </button>
        <button onClick={onBack} className="btn-secondary">
          <X size={14} />
          Back
        </button>
      </div>
    </div>
  );
}
