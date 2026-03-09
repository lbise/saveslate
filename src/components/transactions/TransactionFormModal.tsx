import { useMemo, useState, type FormEvent } from 'react';
import { Tag, Users } from 'lucide-react';
import { getCurrencyOptionsWithFallback } from '../../lib/currencies';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createTransactionFormState,
  toTransactionFormSubmitPayload,
  type TransactionFormSubmitPayload,
  type TransactionFormState,
} from './transaction-form';
import type {
  Account,
  Category,
  Goal,
  Tag as TransactionTag,
  Transaction,
} from '../../types';

interface TransactionFormModalProps {
  mode: 'create' | 'edit';
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  tags: TransactionTag[];
  onCancel: () => void;
  onSubmit: (payload: TransactionFormSubmitPayload) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

function withFallbackOption(
  options: SelectOption[],
  selectedValue: string,
  fallbackLabelPrefix: string,
): SelectOption[] {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options;
  }

  return [
    {
      value: selectedValue,
      label: `${fallbackLabelPrefix} (${selectedValue})`,
    },
    ...options,
  ];
}

export function TransactionFormModal({
  mode,
  transaction,
  accounts,
  categories,
  goals,
  tags,
  onCancel,
  onSubmit,
}: TransactionFormModalProps) {
  const [form, setForm] = useState<TransactionFormState>(() => createTransactionFormState({
    transaction,
    accounts,
    categories,
  }));
  const [formError, setFormError] = useState<string | null>(null);

  const accountOptions = useMemo(() => {
    const options = [...accounts]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency})`,
      }));

    return withFallbackOption(options, form.accountId, 'Unknown account');
  }, [accounts, form.accountId]);

  const categoryOptions = useMemo(() => {
    const options = [...categories]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((category) => ({
        value: category.id,
        label: category.name,
      }));

    return withFallbackOption(options, form.categoryId, 'Unknown category');
  }, [categories, form.categoryId]);

  const goalOptions = useMemo(() => {
    const options = [...goals]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((goal) => ({
        value: goal.id,
        label: goal.isArchived ? `${goal.name} (archived)` : goal.name,
      }));

    return withFallbackOption(options, form.goalId, 'Unknown goal');
  }, [form.goalId, goals]);

  const tagOptions = useMemo(() => {
    const options = [...tags]
      .sort((left, right) => left.name.localeCompare(right.name));

    const selectedTagIds = new Set(form.selectedTagIds);
    if (selectedTagIds.size === 0) {
      return options;
    }

    const existingTagIds = new Set(options.map((tag) => tag.id));
    const fallbackTags = Array.from(selectedTagIds)
      .filter((tagId) => !existingTagIds.has(tagId))
      .map((tagId) => ({
        id: tagId,
        name: `Unknown tag (${tagId})`,
        color: '#7E9AB3',
        createdAt: '',
        updatedAt: '',
      }));

    return [...fallbackTags, ...options];
  }, [form.selectedTagIds, tags]);

  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(form.currency),
    [form.currency],
  );

  const isEditing = mode === 'edit';
  const isLinkedTransfer = Boolean(transaction?.transferPairId);
  const canSave = accountOptions.length > 0 && categoryOptions.length > 0;

  function handleTagToggle(tagId: string) {
    setForm((current) => {
      const nextTagIds = new Set(current.selectedTagIds);
      if (nextTagIds.has(tagId)) {
        nextTagIds.delete(tagId);
      } else {
        nextTagIds.add(tagId);
      }

      return {
        ...current,
        selectedTagIds: Array.from(nextTagIds),
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toTransactionFormSubmitPayload(form, {
      accounts,
      categories,
      goals,
      tags,
    });

    if (!payload) {
      setFormError('Please complete all required fields with valid values.');
      return;
    }

    setFormError(null);
    onSubmit(payload);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transaction' : 'Create Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-description">
                Description
              </Label>
              <Input
                id="transaction-description"
                placeholder="Coffee with team"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-reference">
                Transaction reference (optional)
              </Label>
              <Input
                id="transaction-reference"
                placeholder="Bank transaction ID"
                value={form.transactionId}
                onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-direction">
                Type
              </Label>
              <Select value={form.direction} onValueChange={(value) => setForm((current) => ({
                ...current,
                direction: value as 'expense' | 'income',
              }))}>
                <SelectTrigger id="transaction-direction" disabled={isLinkedTransfer}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-amount">
                Amount
              </Label>
              <Input
                id="transaction-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-currency">
                Currency
              </Label>
              <Select value={form.currency} onValueChange={(value) => setForm((current) => ({ ...current, currency: value }))}>
                <SelectTrigger id="transaction-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.label} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLinkedTransfer && (
            <p className="text-sm text-warning">
              This transaction is linked to a transfer pair. Type stays derived from the pair.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-date">
                Date
              </Label>
              <Input
                id="transaction-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-time">
                Time (optional)
              </Label>
              <Input
                id="transaction-time"
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-account">
                Account
              </Label>
              <Select value={form.accountId} onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}>
                <SelectTrigger id="transaction-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="transaction-category">
                Category
              </Label>
              <Select value={form.categoryId} onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}>
                <SelectTrigger id="transaction-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block" htmlFor="transaction-goal">
              Goal (optional)
            </Label>
            <Select value={form.goalId || "__none__"} onValueChange={(value) => setForm((current) => ({ ...current, goalId: value === "__none__" ? "" : value }))}>
              <SelectTrigger id="transaction-goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No goal</SelectItem>
                {goalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} className="text-dimmed" />
              <span className="text-base text-foreground">Tags</span>
            </div>
            {tagOptions.length === 0 ? (
              <p className="text-sm text-dimmed">No tags yet. You can create tags from Transactions.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tagOptions.map((tagOption) => {
                  const isSelected = form.selectedTagIds.includes(tagOption.id);
                  return (
                    <label
                      key={tagOption.id}
                      className="flex items-center gap-2 rounded-(--radius-sm) border border-border px-2.5 py-2 cursor-pointer transition-colors duration-150 hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTagToggle(tagOption.id)}
                      />
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tagOption.color }}
                      />
                      <span className="text-sm text-foreground truncate">{tagOption.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSplit}
                onChange={(event) => setForm((current) => ({ ...current, hasSplit: event.target.checked }))}
              />
              <span className="inline-flex items-center gap-2 text-base text-foreground">
                <Users size={14} className="text-dimmed" />
                Split transaction with someone
              </span>
            </label>

            {form.hasSplit && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                  <Label className="mb-1.5 block" htmlFor="transaction-split-person">
                    Person
                  </Label>
                  <Input
                    id="transaction-split-person"
                    placeholder="Alex"
                    value={form.splitWithPerson}
                    onChange={(event) => setForm((current) => ({ ...current, splitWithPerson: event.target.value }))}
                    required={form.hasSplit}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block" htmlFor="transaction-split-ratio">
                    Your share (%)
                  </Label>
                  <Input
                    id="transaction-split-ratio"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    value={form.splitRatioPercent}
                    onChange={(event) => setForm((current) => ({ ...current, splitRatioPercent: event.target.value }))}
                    required={form.hasSplit}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block" htmlFor="transaction-split-status">
                    Status
                  </Label>
                  <Select value={form.splitStatus} onValueChange={(value) => setForm((current) => ({
                    ...current,
                    splitStatus: value as 'pending' | 'reimbursed',
                  }))}>
                    <SelectTrigger id="transaction-split-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reimbursed">Reimbursed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>

          {!canSave && (
            <p className="text-sm text-warning">
              You need at least one account and one category before saving a transaction.
            </p>
          )}

          {formError && (
            <p className="text-sm text-expense">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {isEditing ? 'Save Changes' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
