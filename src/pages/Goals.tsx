import { useMemo, useState, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { Calendar, ChevronDown, Plus, Search, Target, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Icon, TransactionItem } from '../components/ui';
import {
  getGoalProgress,
  getTransactionsWithDetails,
} from '../data/mock';
import { formatCurrency, formatDate } from '../lib/utils';
import type { ContributionFrequency, Goal, GoalProgress } from '../types';

type TargetMethod = 'fixed' | 'contribution';

interface GoalFormState {
  name: string;
  description: string;
  icon: string;
  targetMethod: TargetMethod;
  dueDate: string;
  startingAmount: string;
  targetAmount: string;
  expectedContributionAmount: string;
  expectedContributionFrequency: ContributionFrequency;
}

const DEFAULT_FORM_STATE: GoalFormState = {
  name: '',
  description: '',
  icon: 'Target',
  targetMethod: 'fixed',
  dueDate: '',
  startingAmount: '0',
  targetAmount: '',
  expectedContributionAmount: '',
  expectedContributionFrequency: 'monthly',
};

function parseAmount(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function getContributionPeriods(
  contributionFrequency: ContributionFrequency,
  dueDate: string,
): number {
  if (!dueDate) {
    return contributionFrequency === 'weekly' ? 52 : 12;
  }

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const parsedDueDate = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsedDueDate.getTime()) || parsedDueDate <= startDate) {
    return 1;
  }

  if (contributionFrequency === 'weekly') {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const dayDiff = Math.floor((parsedDueDate.getTime() - startDate.getTime()) / millisecondsPerDay);
    return Math.max(1, Math.floor(dayDiff / 7));
  }

  const monthDiff =
    (parsedDueDate.getFullYear() - startDate.getFullYear()) * 12
    + parsedDueDate.getMonth()
    - startDate.getMonth();
  const adjustedMonthDiff = parsedDueDate.getDate() < startDate.getDate()
    ? monthDiff - 1
    : monthDiff;
  return Math.max(1, adjustedMonthDiff);
}

function getDerivedTargetAmount(contributionAmount: number, contributionPeriods: number): number {
  return contributionAmount * contributionPeriods;
}

function formatContributionPeriods(
  contributionFrequency: ContributionFrequency,
  contributionPeriods: number,
): string {
  const label = contributionFrequency === 'weekly' ? 'week' : 'month';
  return `${contributionPeriods} ${label}${contributionPeriods === 1 ? '' : 's'}`;
}

export function Goals() {
  const [goals, setGoals] = useState<GoalProgress[]>(() => getGoalProgress());
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM_STATE);

  const allTransactions = getTransactionsWithDetails();
  const allIconNames = useMemo(
    () => Object.keys(LucideIcons.icons).sort((a, b) => a.localeCompare(b)),
    [],
  );
  const filteredIconNames = useMemo(() => {
    const query = iconSearchQuery.trim().toLowerCase();
    if (!query) {
      return allIconNames;
    }

    return allIconNames.filter((iconName) => iconName.toLowerCase().includes(query));
  }, [allIconNames, iconSearchQuery]);

  const startingAmount = useMemo(() => parseAmount(form.startingAmount), [form.startingAmount]);
  const explicitTargetAmount = useMemo(() => parseAmount(form.targetAmount), [form.targetAmount]);
  const expectedContributionAmount = useMemo(
    () => parseAmount(form.expectedContributionAmount),
    [form.expectedContributionAmount],
  );
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const hasExpectedContribution =
    form.targetMethod === 'contribution' && expectedContributionAmount > 0;
  const contributionPeriods = useMemo(
    () => getContributionPeriods(form.expectedContributionFrequency, form.dueDate),
    [form.expectedContributionFrequency, form.dueDate],
  );
  const contributionPeriodsLabel = useMemo(
    () => formatContributionPeriods(form.expectedContributionFrequency, contributionPeriods),
    [contributionPeriods, form.expectedContributionFrequency],
  );
  const derivedTargetAmount = useMemo(() => {
    if (!hasExpectedContribution) {
      return 0;
    }

    return getDerivedTargetAmount(expectedContributionAmount, contributionPeriods);
  }, [
    contributionPeriods,
    hasExpectedContribution,
    expectedContributionAmount,
  ]);

  const previewTargetAmount = form.targetMethod === 'fixed'
    ? explicitTargetAmount
    : derivedTargetAmount;
  const amountLeftToSave = Math.max(previewTargetAmount - startingAmount, 0);
  const isTargetConfigValid = form.targetMethod === 'fixed'
    ? explicitTargetAmount > 0
    : expectedContributionAmount > 0;
  const canSubmit = form.name.trim().length > 0 && isTargetConfigValid;
  const hasTarget = previewTargetAmount > 0;

  const resetForm = () => {
    setForm(DEFAULT_FORM_STATE);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
  };

  const handleCreateGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName || !canSubmit) {
      return;
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      name: trimmedName,
      description: form.description.trim() || undefined,
      icon: form.icon,
      startingAmount,
      targetAmount: previewTargetAmount,
      hasTarget,
      deadline: form.dueDate || undefined,
      expectedContribution: form.targetMethod === 'contribution' && hasExpectedContribution
        ? {
            amount: expectedContributionAmount,
            frequency: form.expectedContributionFrequency,
          }
        : undefined,
      createdAt: new Date().toISOString().split('T')[0],
      isArchived: false,
    };

    const initialPercentage =
      hasTarget && previewTargetAmount > 0
        ? Math.min((startingAmount / previewTargetAmount) * 100, 100)
        : 0;

    setGoals((previousGoals) => [
      ...previousGoals,
      {
        goal: newGoal,
        currentAmount: startingAmount,
        percentage: initialPercentage,
        transactionCount: 0,
      },
    ]);

    resetForm();
    setIsCreateMenuOpen(false);
  };

  return (
    <div className="page-container">
      <PageHeader title="Goals">
        <button
          className="btn-primary"
          onClick={() => setIsCreateMenuOpen(true)}
        >
          <Plus size={16} />
          New Goal
        </button>
      </PageHeader>

      {isCreateMenuOpen && (
        <section className="card p-5" style={{ marginTop: '-32px' }}>
          <div className="section-header mb-4">
            <h2 className="heading-3 text-text">Create Goal</h2>
            <button className="btn-icon" onClick={() => setIsCreateMenuOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleCreateGoal}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block" htmlFor="goal-name">Goal name</label>
                <input
                  id="goal-name"
                  className="input"
                  placeholder="Emergency Fund"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div className="relative">
                <label className="label mb-1.5 block" htmlFor="goal-icon-search">Icon</label>
                <button
                  type="button"
                  className="input flex items-center justify-between"
                  onClick={() => setIsIconPickerOpen((current) => !current)}
                  aria-expanded={isIconPickerOpen}
                  aria-controls="goal-icon-picker"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon name={form.icon} size={16} className="text-text" />
                    <span className="text-body text-text truncate">{form.icon}</span>
                  </span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>

                {isIconPickerOpen && (
                  <div
                    id="goal-icon-picker"
                    className="card absolute z-20 mt-2 w-full p-3"
                  >
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="goal-icon-search"
                        className="input pl-9"
                        placeholder="Search icon"
                        value={iconSearchQuery}
                        onChange={(event) => setIconSearchQuery(event.target.value)}
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
                      {filteredIconNames.map((iconName) => {
                        const isSelected = form.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({ ...current, icon: iconName }));
                              setIsIconPickerOpen(false);
                            }}
                            className={[
                              'w-full flex items-center gap-2 px-3 py-2 text-left border-none bg-transparent',
                              'transition-colors duration-150',
                              isSelected
                                ? 'bg-surface-hover text-text'
                                : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                            ].join(' ')}
                          >
                            <Icon name={iconName} size={16} />
                            <span className="text-ui">{iconName}</span>
                          </button>
                        );
                      })}

                      {filteredIconNames.length === 0 && (
                        <div className="px-3 py-4 text-ui text-text-muted">No icons found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="goal-description">Description</label>
              <textarea
                id="goal-description"
                className="input min-h-20 resize-y"
                placeholder="Why are you saving for this goal?"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block" htmlFor="goal-starting-amount">Starting amount</label>
                <input
                  id="goal-starting-amount"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.startingAmount}
                  onChange={(event) => setForm((current) => ({ ...current, startingAmount: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label mb-1.5 block" htmlFor="goal-due-date">Due date (optional)</label>
                <input
                  id="goal-due-date"
                  className="input"
                  type="date"
                  min={todayDate}
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Target setup</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, targetMethod: 'fixed' }))}
                  className={[
                    'card p-3 text-left transition-colors duration-150 border',
                    form.targetMethod === 'fixed'
                      ? 'border-text bg-surface-hover'
                      : 'border-border hover:border-text-muted',
                  ].join(' ')}
                >
                  <div className="text-body text-text font-medium">Fixed Target Amount</div>
                  <div className="text-ui text-text-muted">Set one exact target value.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, targetMethod: 'contribution' }))}
                  className={[
                    'card p-3 text-left transition-colors duration-150 border',
                    form.targetMethod === 'contribution'
                      ? 'border-text bg-surface-hover'
                      : 'border-border hover:border-text-muted',
                  ].join(' ')}
                >
                  <div className="text-body text-text font-medium">Contribution Plan</div>
                  <div className="text-ui text-text-muted">Derive target from contribution schedule.</div>
                </button>
              </div>
            </div>

            {form.targetMethod === 'fixed' && (
              <div>
                <label className="label mb-1.5 block" htmlFor="goal-target-amount">Target amount</label>
                <input
                  id="goal-target-amount"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1200"
                  value={form.targetAmount}
                  onChange={(event) => setForm((current) => ({ ...current, targetAmount: event.target.value }))}
                  required={form.targetMethod === 'fixed'}
                />
              </div>
            )}

            {form.targetMethod === 'contribution' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5 block" htmlFor="goal-contribution-amount">
                    Expected contribution
                  </label>
                  <input
                    id="goal-contribution-amount"
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100"
                    value={form.expectedContributionAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expectedContributionAmount: event.target.value,
                      }))
                    }
                    required={form.targetMethod === 'contribution'}
                  />
                </div>

                <div>
                  <label className="label mb-1.5 block" htmlFor="goal-contribution-frequency">Contribution frequency</label>
                  <select
                    id="goal-contribution-frequency"
                    className="select"
                    value={form.expectedContributionFrequency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expectedContributionFrequency: event.target.value as ContributionFrequency,
                      }))
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}

            <div className="card p-3.5 bg-bg">
              <div className="text-ui text-text-muted">Target preview</div>
              <div className="text-body text-text mt-1">{formatCurrency(previewTargetAmount)}</div>
              <div className="text-ui text-text-muted mt-2">Already saved: {formatCurrency(startingAmount)}</div>
              <div className="text-ui text-text-muted">Left to save: {formatCurrency(amountLeftToSave)}</div>
              {form.targetMethod === 'contribution' && (
                <div className="text-ui text-text-muted mt-2">
                  Horizon: {form.dueDate ? `until due date (${contributionPeriodsLabel})` : `default 12-month window (${contributionPeriodsLabel})`}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  resetForm();
                  setIsCreateMenuOpen(false);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!canSubmit}>Create Goal</button>
            </div>
          </form>
        </section>
      )}

      <div className="flex flex-wrap gap-8 mb-2" style={{ marginTop: isCreateMenuOpen ? 0 : '-32px' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {goals.length}
            </span>
            <span className="text-ui text-text-muted">Active Goals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </span>
            <span className="text-ui text-text-muted">Total Saved</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-muted" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(
                goals.reduce((sum, g) => sum + (g.goal.hasTarget === false ? 0 : g.goal.targetAmount), 0),
              )}
            </span>
            <span className="text-ui text-text-muted">Total Target</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {goals.map((gp) => {
          const goalTransactions = allTransactions
            .filter((tx) => tx.goalId === gp.goal.id)
            .slice(0, 4);
          const isOpenEnded = gp.goal.hasTarget === false;

          return (
            <div
              key={gp.goal.id}
              className="p-5 bg-surface rounded-(--radius-lg)"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-(--radius-md) flex items-center justify-center bg-goal/15"
                  >
                    <Icon name={gp.goal.icon} size={20} className="text-goal" />
                  </div>
                  <div>
                    <div className="text-body font-medium text-text">{gp.goal.name}</div>
                    {gp.goal.description && (
                      <div className="text-ui text-text-muted mt-0.5">{gp.goal.description}</div>
                    )}
                    {gp.goal.deadline && (
                      <div className="flex items-center gap-1 text-ui text-text-muted mt-0.5">
                        <Calendar size={10} />
                        <span>Due {formatDate(gp.goal.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-body font-medium text-text"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {isOpenEnded ? 'Open' : `${gp.percentage.toFixed(0)}%`}
                  </div>
                </div>
              </div>

              {!isOpenEnded && (
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-[width] duration-400 ease-out bg-goal"
                    style={{ width: `${gp.percentage}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between text-ui mb-5">
                <span className="text-text-secondary">
                  {formatCurrency(gp.currentAmount)} saved
                </span>
                {isOpenEnded ? (
                  <span className="text-text-muted">No fixed target</span>
                ) : (
                  <span className="text-text-muted">
                    of {formatCurrency(gp.goal.targetAmount)}
                  </span>
                )}
              </div>

              {gp.goal.expectedContribution && (
                <div className="text-ui text-text-muted mb-4">
                  Planned contribution: {formatCurrency(gp.goal.expectedContribution.amount)} {gp.goal.expectedContribution.frequency}
                </div>
              )}

              {goalTransactions.length > 0 && (
                <div className="border-t border-border pt-4">
                  <div className="text-ui text-text-muted uppercase tracking-wider mb-3">
                    Recent Contributions
                  </div>
                  <div className="flex flex-col">
                    {goalTransactions.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        description={tx.description}
                        type={tx.category.type}
                        amount={formatCurrency(tx.amount)}
                        categoryName={tx.category.name}
                        isSplit={!!tx.split}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-surface rounded-(--radius-lg) flex items-center justify-center mb-4">
            <Target size={24} className="text-text-muted" />
          </div>
          <div className="text-body mb-1">No goals yet</div>
          <div className="text-ui text-text-muted">
            Create your first savings goal to get started.
          </div>
        </div>
      )}
    </div>
  );
}
