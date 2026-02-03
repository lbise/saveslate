import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Card, CardContent, Badge, CategoryIcon } from '../components/ui';
import {
  getTransactionsWithDetails,
  CATEGORIES,
} from '../data/mock';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import type { TransactionWithDetails, TransactionType } from '../types';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export function Transactions() {
  const allTransactions = getTransactionsWithDetails();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.category.name.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }

    // Sort
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
  }, [allTransactions, searchQuery, typeFilter, categoryFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="page-container max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="heading-1">Transactions</h1>
        <p className="text-body mt-1">
          Your money's journey, one transaction at a time
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted">Transactions</p>
            <p className="text-2xl font-bold text-text-primary">
              {filteredTransactions.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted">Income</p>
            <p className="text-2xl font-bold text-income">
              +{formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-muted">Expenses</p>
            <p className="text-2xl font-bold text-expense">
              -{formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
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
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted z-10" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
                className="select pl-10"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        {/* Table Header */}
        <div className="hidden lg:flex items-center gap-4 px-5 py-3 border-b border-border bg-bg-secondary">
          <div className="w-10" /> {/* Icon space */}
          <div className="flex-1 text-sm font-medium text-text-muted">
            Description
          </div>
          <button
            onClick={() => toggleSort('date')}
            className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary transition-colors w-28"
          >
            Date
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <div className="text-sm font-medium text-text-muted w-28">
            Category
          </div>
          <button
            onClick={() => toggleSort('amount')}
            className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary transition-colors w-28 justify-end"
          >
            Amount
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-border-light">
          {filteredTransactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-text-muted">
                No transactions found. Try adjusting your filters!
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionWithDetails }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-5 py-4 hover:bg-bg-hover transition-colors">
      <CategoryIcon
        icon={transaction.category.icon}
        color={transaction.category.color}
        size="sm"
        className="hidden lg:flex"
      />

      {/* Mobile layout */}
      <div className="flex items-start gap-3 lg:hidden">
        <CategoryIcon
          icon={transaction.category.icon}
          color={transaction.category.color}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {transaction.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge color={transaction.category.color} className="text-[10px]">
              {transaction.category.name}
            </Badge>
            <span className="text-xs text-text-muted">
              {formatDate(transaction.date)}
            </span>
          </div>
        </div>
        <p
          className={cn(
            'text-sm font-semibold whitespace-nowrap',
            transaction.type === 'income' ? 'text-income' : 'text-expense'
          )}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {transaction.description}
          </p>
          <p className="text-xs text-text-muted">
            {transaction.account.name}
          </p>
        </div>
        <div className="w-28 text-sm text-text-secondary">
          {formatDate(transaction.date)}
        </div>
        <div className="w-28">
          <Badge color={transaction.category.color} className="text-xs">
            {transaction.category.name}
          </Badge>
        </div>
        <p
          className={cn(
            'w-28 text-right text-sm font-semibold',
            transaction.type === 'income' ? 'text-income' : 'text-expense'
          )}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
      </div>
    </div>
  );
}
