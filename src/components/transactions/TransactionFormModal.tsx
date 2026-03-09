import { useMemo, useState, type FormEvent } from 'react';
import { Tag, Users, X } from 'lucide-react';
import { getCurrencyOptionsWithFallback } from '../../lib/currencies';
import { Modal } from '../ui';
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
    <Modal onClose={onCancel} panelClassName="max-w-3xl p-5">
      <section>
        <div className="section-header mb-4">
          <h2 id="modal-title" className="heading-3 text-text">
            {isEditing ? 'Edit Transaction' : 'Create Transaction'}
          </h2>
          <button type="button" className="btn-icon" onClick={onCancel} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-description">
                Description
              </label>
              <input
                id="transaction-description"
                className="input"
                placeholder="Coffee with team"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-reference">
                Transaction reference (optional)
              </label>
              <input
                id="transaction-reference"
                className="input"
                placeholder="Bank transaction ID"
                value={form.transactionId}
                onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-direction">
                Type
              </label>
              <select
                id="transaction-direction"
                className="select"
                value={form.direction}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  direction: event.target.value as 'expense' | 'income',
                }))}
                disabled={isLinkedTransfer}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-amount">
                Amount
              </label>
              <input
                id="transaction-amount"
                className="input"
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
              <label className="label mb-1.5 block" htmlFor="transaction-currency">
                Currency
              </label>
              <select
                id="transaction-currency"
                className="select"
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                required
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLinkedTransfer && (
            <p className="text-ui text-warning">
              This transaction is linked to a transfer pair. Type stays derived from the pair.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-date">
                Date
              </label>
              <input
                id="transaction-date"
                className="input"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-time">
                Time (optional)
              </label>
              <input
                id="transaction-time"
                className="input"
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-account">
                Account
              </label>
              <select
                id="transaction-account"
                className="select"
                value={form.accountId}
                onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                required
              >
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="transaction-category">
                Category
              </label>
              <select
                id="transaction-category"
                className="select"
                value={form.categoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                required
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block" htmlFor="transaction-goal">
              Goal (optional)
            </label>
            <select
              id="transaction-goal"
              className="select"
              value={form.goalId}
              onChange={(event) => setForm((current) => ({ ...current, goalId: event.target.value }))}
            >
              <option value="">No goal</option>
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} className="text-text-muted" />
              <span className="text-body text-text">Tags</span>
            </div>
            {tagOptions.length === 0 ? (
              <p className="text-ui text-text-muted">No tags yet. You can create tags from Transactions.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tagOptions.map((tagOption) => {
                  const isSelected = form.selectedTagIds.includes(tagOption.id);
                  return (
                    <label
                      key={tagOption.id}
                      className="flex items-center gap-2 rounded-(--radius-sm) border border-border px-2.5 py-2 cursor-pointer transition-colors duration-150 hover:bg-surface-hover"
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
                      <span className="text-ui text-text truncate">{tagOption.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSplit}
                onChange={(event) => setForm((current) => ({ ...current, hasSplit: event.target.checked }))}
              />
              <span className="inline-flex items-center gap-2 text-body text-text">
                <Users size={14} className="text-text-muted" />
                Split transaction with someone
              </span>
            </label>

            {form.hasSplit && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label mb-1.5 block" htmlFor="transaction-split-person">
                    Person
                  </label>
                  <input
                    id="transaction-split-person"
                    className="input"
                    placeholder="Alex"
                    value={form.splitWithPerson}
                    onChange={(event) => setForm((current) => ({ ...current, splitWithPerson: event.target.value }))}
                    required={form.hasSplit}
                  />
                </div>

                <div>
                  <label className="label mb-1.5 block" htmlFor="transaction-split-ratio">
                    Your share (%)
                  </label>
                  <input
                    id="transaction-split-ratio"
                    className="input"
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
                  <label className="label mb-1.5 block" htmlFor="transaction-split-status">
                    Status
                  </label>
                  <select
                    id="transaction-split-status"
                    className="select"
                    value={form.splitStatus}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      splitStatus: event.target.value as 'pending' | 'reimbursed',
                    }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="reimbursed">Reimbursed</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {!canSave && (
            <p className="text-ui text-warning">
              You need at least one account and one category before saving a transaction.
            </p>
          )}

          {formError && (
            <p className="text-ui text-expense">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!canSave}>
              {isEditing ? 'Save Changes' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
