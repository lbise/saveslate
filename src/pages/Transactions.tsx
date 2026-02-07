import { useState, useMemo } from 'react';
import {
  Search, ArrowUpDown, ChevronDown, X, Upload, Plus,
  MoreHorizontal, Pencil, Copy, Trash2, Check,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge, Icon, SplitBadge } from '../components/ui';
import { getTransactionsWithDetails, TAGS, } from '../data/mock';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import type { TransactionType, TransactionWithDetails as TxDetails, Tag } from '../types';

const TYPE_ICON_CLASS: Record<TransactionType, string> = {
  income: 'text-income bg-income/10',
  expense: 'text-expense bg-expense/10',
  transfer: 'text-transfer bg-transfer/10',
};

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

const NON_GOAL_TAGS = TAGS.filter((t) => !t.goalId);

export function Transactions() {
  // Mutable local state so inline edits (tag toggle, delete, duplicate) work
  const [transactions, setTransactions] = useState(() => getTransactionsWithDetails());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Popover state — at most one open at a time
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);

  const hasPopover = openActionId !== null || editingTagsId !== null;

  const closePopovers = () => {
    setOpenActionId(null);
    setEditingTagsId(null);
  };

  const toggleAction = (txId: string) => {
    setEditingTagsId(null);
    setOpenActionId((prev) => (prev === txId ? null : txId));
  };

  const toggleTagEdit = (txId: string) => {
    setOpenActionId(null);
    setEditingTagsId((prev) => (prev === txId ? null : txId));
  };

  const handleToggleTag = (txId: string, tagId: string) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;
        const hasTag = tx.tagIds.includes(tagId);
        const newTagIds = hasTag
          ? tx.tagIds.filter((id) => id !== tagId)
          : [...tx.tagIds, tagId];
        const newTags = newTagIds
          .map((id) => TAGS.find((t) => t.id === id))
          .filter((t): t is Tag => t !== undefined);
        return { ...tx, tagIds: newTagIds, tags: newTags };
      }),
    );
  };

  const handleAction = (txId: string, action: 'edit' | 'duplicate' | 'delete') => {
    closePopovers();
    if (action === 'delete') {
      setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
    } else if (action === 'duplicate') {
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId);
        if (!tx) return prev;
        const dup = { ...tx, id: `${tx.id}-dup-${Date.now()}` };
        const idx = prev.findIndex((t) => t.id === txId);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return next;
      });
    }
    // edit: no-op for mockup
  };

  // Computed stats from local state
  const pendingSplitTotal = useMemo(
    () =>
      transactions
        .filter((t) => t.split?.status === 'pending')
        .reduce((sum, t) => sum + t.amount * (1 - t.split!.ratio), 0),
    [transactions],
  );

  // Filtered and sorted
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.name.toLowerCase().includes(query)),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (selectedTagIds.length > 0) {
      result = result.filter((t) =>
        t.tagIds.some((tagId) => selectedTagIds.includes(tagId)),
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [transactions, searchQuery, typeFilter, selectedTagIds, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const clearTagFilters = () => {
    setSelectedTagIds([]);
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="page-container">
      {/* Backdrop — closes any open popover on click */}
      {hasPopover && (
        <div className="fixed inset-0 z-10" onClick={closePopovers} />
      )}

      {/* Header */}
      <PageHeader title="Transactions">
        <button className="btn-ghost">
          <Plus size={16} />
          New
        </button>
        <button className="btn-primary">
          <Upload size={16} />
          Import
        </button>
      </PageHeader>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {filteredTransactions.length}
            </span>
            <span className="text-xs text-text-muted">Transactions</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              +{formatCurrency(totalIncome)}
            </span>
            <span className="text-xs text-text-muted">Income</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              -{formatCurrency(totalExpenses)}
            </span>
            <span className="text-xs text-text-muted">Expenses</span>
          </div>
        </div>
        {pendingSplitTotal > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-base font-medium text-text"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatCurrency(pendingSplitTotal)}
              </span>
              <span className="text-xs text-text-muted">Pending Splits</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
              className="select"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Tag Multi-Select — monochromatic */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted uppercase tracking-wider">Tags</span>
            {selectedTagIds.length > 0 && (
              <button onClick={clearTagFilters} className="section-action">
                Clear <X size={10} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {NON_GOAL_TAGS.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer',
                    isActive
                      ? 'bg-text/10 text-text border-text/20'
                      : 'bg-surface text-text-secondary border-border opacity-60 hover:opacity-100',
                  )}
                >
                  {tag.name}
                  {isActive && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden lg:flex items-center gap-4 px-1 text-[11px] text-text-muted uppercase tracking-wider">
        <div className="w-[34px]" />
        <div className="flex-1">Description</div>
        <button
          onClick={() => toggleSort('date')}
          className="flex items-center gap-1 w-24 bg-transparent border-none text-text-muted hover:text-text cursor-pointer transition-colors text-[11px] uppercase tracking-wider"
        >
          Date
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <div className="w-40">Tags</div>
        <button
          onClick={() => toggleSort('amount')}
          className="flex items-center gap-1 w-28 justify-end bg-transparent border-none text-text-muted hover:text-text cursor-pointer transition-colors text-[11px] uppercase tracking-wider"
        >
          Amount
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <div className="w-8" />
      </div>

      {/* Transaction Rows */}
      <div className="flex flex-col">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted text-sm">
              No transactions found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isActionOpen={openActionId === tx.id}
              isTagEditing={editingTagsId === tx.id}
              onToggleAction={() => toggleAction(tx.id)}
              onToggleTagEdit={() => toggleTagEdit(tx.id)}
              onToggleTag={(tagId) => handleToggleTag(tx.id, tagId)}
              onAction={(action) => handleAction(tx.id, action)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TransactionRow                                                     */
/* ------------------------------------------------------------------ */

interface TransactionRowProps {
  transaction: TxDetails;
  isActionOpen: boolean;
  isTagEditing: boolean;
  onToggleAction: () => void;
  onToggleTagEdit: () => void;
  onToggleTag: (tagId: string) => void;
  onAction: (action: 'edit' | 'duplicate' | 'delete') => void;
}

function TransactionRow({
  transaction,
  isActionOpen,
  isTagEditing,
  onToggleAction,
  onToggleTagEdit,
  onToggleTag,
  onAction,
}: TransactionRowProps) {
  const primaryTag = transaction.tags[0];

  return (
    <div className="group flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover/30 relative">
      {/* Icon — category shape, colored by transaction type */}
      <div className={cn("w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0 hidden lg:flex", TYPE_ICON_CLASS[transaction.type])}>
        {primaryTag ? (
          <Icon name={primaryTag.icon} size={16} />
        ) : (
          <div className="w-4 h-4 rounded-full bg-current opacity-40" />
        )}
      </div>

      {/* -------- Mobile layout -------- */}
      <div className="flex items-start gap-3 lg:hidden flex-1 min-w-0">
        {/* Icon — colored by transaction type */}
        <div className={cn("w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0", TYPE_ICON_CLASS[transaction.type])}>
          {primaryTag ? (
            <Icon name={primaryTag.icon} size={16} />
          ) : (
            <div className="w-4 h-4 rounded-full bg-current opacity-40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-text truncate">{transaction.description}</span>
            {transaction.split && (
              <SplitBadge status={transaction.split.status} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {transaction.tags.map((tag) => (
              <Badge key={tag.id} variant="muted" className="text-[10px]">
                {tag.name}
              </Badge>
            ))}
            {transaction.tags.length === 0 && (
              <span className="text-[11px] text-text-muted italic">No tags</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTagEdit(); }}
              className="w-5 h-5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text shrink-0"
            >
              <Pencil size={10} />
            </button>
            <span className="text-[11px] text-text-muted">
              {formatDate(transaction.date)}
            </span>
          </div>

          {/* Tag edit dropdown — mobile */}
          {isTagEditing && (
            <TagEditDropdown
              tagIds={transaction.tagIds}
              onToggleTag={onToggleTag}
              className="left-0 mt-1"
            />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'text-[13px] font-medium',
              transaction.type === 'income' ? 'text-income' : 'text-expense',
            )}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </span>

          {/* Action button — mobile */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAction(); }}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-opacity',
                isActionOpen ? 'opacity-100' : 'opacity-60',
              )}
            >
              <MoreHorizontal size={14} />
            </button>
            {isActionOpen && <ActionMenu onAction={onAction} className="right-0" />}
          </div>
        </div>
      </div>

      {/* -------- Desktop layout -------- */}
      <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-1 min-w-0">
        {/* Description + account */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-text truncate">{transaction.description}</span>
            {transaction.split && (
              <SplitBadge status={transaction.split.status} />
            )}
          </div>
          <span className="text-[11px] text-text-muted">{transaction.account.name}</span>
        </div>

        {/* Date */}
        <div className="w-24 text-[13px] text-text-secondary">
          {formatDate(transaction.date)}
        </div>

        {/* Tags + inline edit */}
        <div className="w-40 relative">
          <div className="flex items-center gap-1 flex-wrap">
            {transaction.tags.map((tag) => (
              <Badge key={tag.id} variant="muted" className="text-[10px]">
                {tag.name}
              </Badge>
            ))}
            {transaction.tags.length === 0 && (
              <span className="text-[11px] text-text-muted italic">No tags</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTagEdit(); }}
              className={cn(
                'w-5 h-5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text shrink-0 transition-opacity',
                isTagEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <Pencil size={10} />
            </button>
          </div>

          {/* Tag edit dropdown — desktop */}
          {isTagEditing && (
            <TagEditDropdown
              tagIds={transaction.tagIds}
              onToggleTag={onToggleTag}
              className="left-0 mt-1"
            />
          )}
        </div>

        {/* Amount */}
        <span
          className={cn(
            'w-28 text-right text-[13px] font-medium',
            transaction.type === 'income' ? 'text-income' : 'text-expense',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>

        {/* Action menu trigger */}
        <div className="relative w-8 flex items-center justify-center shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAction(); }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-opacity',
              isActionOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          {isActionOpen && <ActionMenu onAction={onAction} className="right-0" />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Edit Dropdown                                                  */
/* ------------------------------------------------------------------ */

interface TagEditDropdownProps {
  tagIds: string[];
  onToggleTag: (tagId: string) => void;
  className?: string;
}

function TagEditDropdown({ tagIds, onToggleTag, className }: TagEditDropdownProps) {
  return (
    <div
      className={cn(
        'absolute top-full w-52 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md) max-h-64 overflow-y-auto',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 text-[11px] text-text-muted uppercase tracking-wider">
        Edit Tags
      </div>
      {NON_GOAL_TAGS.map((tag) => {
        const isSelected = tagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left bg-transparent border-none cursor-pointer text-[12px] hover:bg-surface-hover transition-colors"
          >
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                isSelected ? 'bg-text border-text' : 'border-border',
              )}
            >
              {isSelected && <Check size={10} className="text-bg" />}
            </div>
            <span className={isSelected ? 'text-text' : 'text-text-secondary'}>
              {tag.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Menu                                                        */
/* ------------------------------------------------------------------ */

interface ActionMenuProps {
  onAction: (action: 'edit' | 'duplicate' | 'delete') => void;
  className?: string;
}

function ActionMenu({ onAction, className }: ActionMenuProps) {
  const itemClass =
    'flex items-center gap-2.5 w-full px-3 py-2 text-left bg-transparent border-none cursor-pointer text-[12px] hover:bg-surface-hover transition-colors';

  return (
    <div
      className={cn(
        'absolute top-full w-40 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md)',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => onAction('edit')} className={cn(itemClass, 'text-text-secondary hover:text-text')}>
        <Pencil size={12} />
        Edit
      </button>
      <button onClick={() => onAction('duplicate')} className={cn(itemClass, 'text-text-secondary hover:text-text')}>
        <Copy size={12} />
        Duplicate
      </button>
      <div className="h-px bg-border mx-2 my-1" />
      <button onClick={() => onAction('delete')} className={cn(itemClass, 'text-expense hover:text-expense')}>
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );
}
