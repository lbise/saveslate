import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { ACCOUNTS } from '../../data/mock/accounts';
import type { ParsedRow } from '../../types';

interface TransactionPreviewProps {
  rows: ParsedRow[];
  onConfirm: (selectedRows: ParsedRow[], accountId: string) => void;
  onBack: () => void;
  detectedIban?: string;
}

export function TransactionPreview({ rows, onConfirm, onBack, detectedIban }: TransactionPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(() => {
    // Pre-select all rows without errors
    const set = new Set<number>();
    rows.forEach((r, i) => {
      if (r.errors.length === 0) set.add(i);
    });
    return set;
  });
  const [accountId, setAccountId] = useState(ACCOUNTS[0]?.id ?? '');

  // Auto-select account when IBAN is detected
  useEffect(() => {
    if (!detectedIban) return;
    
    const normalizedIban = detectedIban.replace(/\s/g, '');
    const matchingAccount = ACCOUNTS.find(acc => {
      if (!acc.iban) return false;
      return acc.iban.replace(/\s/g, '') === normalizedIban;
    });
    
    if (matchingAccount) {
      setAccountId(matchingAccount.id);
    }
  }, [detectedIban]);

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
    let errorCount = 0;

    for (const [i, row] of rows.entries()) {
      if (!selected.has(i)) continue;
      count++;
      if (row.errors.length > 0) errorCount++;
      if (row.amount >= 0) income += row.amount;
      else expense += Math.abs(row.amount);
    }

    return { income, expense, count, errorCount };
  }, [rows, selected]);

  const handleConfirm = () => {
    const selectedRows = rows.filter((_, i) => selected.has(i));
    onConfirm(selectedRows, accountId);
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
        {stats.errorCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-ui text-amber-400">
              {stats.errorCount} with warnings
            </span>
          </div>
        )}
      </div>

      {/* Account selector */}
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
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>
        {detectedIban && (
          <div className="flex items-center gap-1.5 text-ui text-text-muted pl-[calc(theme(spacing.14)+theme(spacing.3))]">
            <span>IBAN detected:</span>
            <span className="font-mono text-text-secondary">{detectedIban}</span>
          </div>
        )}
      </div>

      {/* Transaction table */}
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
            {rows.map((row, idx) => {
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
                    hasErrors && isSelected && 'bg-amber-400/[0.03]',
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
                    <span className="truncate block max-w-[300px]" title={row.description || undefined}>{row.description || '—'}</span>
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
      </div>

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
