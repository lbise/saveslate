import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowUpRight, ChevronDown, Pencil, Search, Target, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, PageHeaderActions } from '../components/layout';
import {
  Badge,
  EntityCard,
  EntityCardActionButton,
  EntityCardDetailList,
  EntityCardSection,
  Icon,
  Modal,
  TransactionItem,
} from '../components/ui';
import {
  getGoalProgress,
  getTransactionsWithDetails,
} from '../lib/data-service';
import { addGoal, deleteGoal, mergeGoals, updateGoal } from '../lib/goal-storage';
import { loadTransactions, saveTransactions } from '../lib/transaction-storage';
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

interface ExportedGoalProgress {
  goal: Goal;
  currentAmount: number;
  transactionCount: number;
}

interface ExportedGoalsFile {
  schemaVersion: number;
  exportedAt: string;
  goalCount: number;
  goals: ExportedGoalProgress[];
}

const GOALS_EXPORT_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNonNegativeNumber(value: unknown, fallback = 0): number {
  if (
    typeof value !== 'number'
    || Number.isNaN(value)
    || !Number.isFinite(value)
    || value < 0
  ) {
    return fallback;
  }

  return value;
}

function parseFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function parseNonNegativeInteger(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function parseDateString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const normalized = value.trim();
  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return normalized;
}

function isContributionFrequency(value: unknown): value is ContributionFrequency {
  return value === 'weekly' || value === 'monthly';
}

function parseExpectedContribution(value: unknown): Goal['expectedContribution'] {
  if (!isRecord(value)) {
    return undefined;
  }

  const amount = parseNonNegativeNumber(value.amount, 0);
  if (amount <= 0 || !isContributionFrequency(value.frequency)) {
    return undefined;
  }

  return {
    amount,
    frequency: value.frequency,
  };
}

function calculateGoalPercentage(goal: Goal, currentAmount: number): number {
  if (goal.hasTarget === false || goal.targetAmount <= 0) {
    return 0;
  }

  return Math.max(0, Math.min((currentAmount / goal.targetAmount) * 100, 100));
}

function parseImportedGoalEntry(entry: unknown, index: number): GoalProgress {
  if (!isRecord(entry) || !isRecord(entry.goal)) {
    throw new Error(`Goal #${index + 1} is missing goal details.`);
  }

  const rawGoal = entry.goal;
  const name = typeof rawGoal.name === 'string' ? rawGoal.name.trim() : '';
  if (!name) {
    throw new Error(`Goal #${index + 1} is missing a name.`);
  }

  const icon = typeof rawGoal.icon === 'string' && rawGoal.icon.trim().length > 0
    ? rawGoal.icon.trim()
    : 'Target';
  const targetAmount = parseNonNegativeNumber(rawGoal.targetAmount, 0);
  const hasTarget = typeof rawGoal.hasTarget === 'boolean'
    ? rawGoal.hasTarget && targetAmount > 0
    : targetAmount > 0;
  const createdAt = parseDateString(rawGoal.createdAt) ?? new Date().toISOString().split('T')[0];
  const startingAmount = parseFiniteNumber(rawGoal.startingAmount, 0);
  const expectedContribution = parseExpectedContribution(rawGoal.expectedContribution);
  const isContributionPlan = Boolean(expectedContribution);
  const description = typeof rawGoal.description === 'string'
    ? rawGoal.description.trim() || undefined
    : undefined;

  const goal: Goal = {
    id: typeof rawGoal.id === 'string' ? rawGoal.id.trim() : '',
    name,
    description,
    icon,
    startingAmount,
    targetAmount: isContributionPlan ? 0 : (hasTarget ? targetAmount : 0),
    hasTarget: isContributionPlan ? false : hasTarget,
    deadline: parseDateString(rawGoal.deadline),
    expectedContribution,
    createdAt,
    isArchived: typeof rawGoal.isArchived === 'boolean' ? rawGoal.isArchived : false,
  };

  const importedCurrentAmount = parseFiniteNumber(entry.currentAmount, startingAmount);
  const currentAmount = importedCurrentAmount;
  const transactionCount = parseNonNegativeInteger(entry.transactionCount, 0);

  return {
    goal,
    currentAmount,
    percentage: calculateGoalPercentage(goal, currentAmount),
    transactionCount,
  };
}

function parseImportedGoals(rawContent: string): GoalProgress[] {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (!Array.isArray(parsedContent) && !isRecord(parsedContent)) {
    throw new Error('Invalid goals file format.');
  }

  if (
    isRecord(parsedContent)
    && 'schemaVersion' in parsedContent
    && parsedContent.schemaVersion !== GOALS_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported goals file version.');
  }

  const rawGoals = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent.goals;

  if (!Array.isArray(rawGoals)) {
    throw new Error('Goals file is missing a goals array.');
  }

  const importedGoals = rawGoals.map((goalEntry, index) => parseImportedGoalEntry(goalEntry, index));
  if (importedGoals.length === 0) {
    throw new Error('No goals found in file.');
  }

  return importedGoals;
}

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
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const effectiveDueDate = dueDate
    ? new Date(`${dueDate}T00:00:00`)
    : new Date(startDate.getFullYear(), 11, 31);

  const parsedDueDate = effectiveDueDate;
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

function getYearlyContribution(
  contributionFrequency: ContributionFrequency,
  contributionAmount: number,
): number {
  if (contributionAmount <= 0) {
    return 0;
  }

  return contributionFrequency === 'weekly'
    ? contributionAmount * 52
    : contributionAmount * 12;
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
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM_STATE);
  const importInputRef = useRef<HTMLInputElement>(null);

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
  const derivedContributionPlanAmount = useMemo(() => {
    if (!hasExpectedContribution) {
      return 0;
    }

    return getDerivedTargetAmount(expectedContributionAmount, contributionPeriods);
  }, [
    contributionPeriods,
    hasExpectedContribution,
    expectedContributionAmount,
  ]);
  const yearlyContributionAmount = useMemo(
    () => getYearlyContribution(form.expectedContributionFrequency, expectedContributionAmount),
    [expectedContributionAmount, form.expectedContributionFrequency],
  );

  const previewTargetAmount = explicitTargetAmount;
  const amountLeftToSave = Math.max(previewTargetAmount - startingAmount, 0);
  const isTargetConfigValid = form.targetMethod === 'fixed'
    ? explicitTargetAmount >= 0
    : expectedContributionAmount > 0;
  const canSubmit = form.name.trim().length > 0 && isTargetConfigValid;
  const hasTarget = form.targetMethod === 'fixed' && explicitTargetAmount > 0;

  const resetForm = () => {
    setForm(DEFAULT_FORM_STATE);
    setEditingGoalId(null);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
  };

  const openCreateGoalForm = () => {
    resetForm();
    setIsCreateMenuOpen(true);
  };

  const openEditGoalForm = (goal: Goal) => {
    setForm({
      name: goal.name,
      description: goal.description ?? '',
      icon: goal.icon,
      targetMethod: goal.expectedContribution ? 'contribution' : 'fixed',
      dueDate: goal.deadline ?? '',
      startingAmount: String(goal.startingAmount ?? 0),
      targetAmount: String(goal.targetAmount),
      expectedContributionAmount: goal.expectedContribution
        ? String(goal.expectedContribution.amount)
        : '',
      expectedContributionFrequency: goal.expectedContribution?.frequency ?? 'monthly',
    });
    setEditingGoalId(goal.id);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setIsCreateMenuOpen(true);
  };

  const closeGoalForm = () => {
    resetForm();
    setIsCreateMenuOpen(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    const deleted = deleteGoal(goalId);
    if (!deleted) {
      return;
    }

    const transactions = loadTransactions();
    const hasLinkedTransactions = transactions.some((transaction) => transaction.goalId === goalId);
    if (hasLinkedTransactions) {
      saveTransactions(
        transactions.map((transaction) => (
          transaction.goalId === goalId
            ? { ...transaction, goalId: undefined }
            : transaction
        )),
      );
    }

    setGoals(getGoalProgress());
  };

  const requestDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const closeDeleteGoalModal = () => {
    setGoalToDelete(null);
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) {
      return;
    }

    handleDeleteGoal(goalToDelete.id);
    closeDeleteGoalModal();
  };

  const handleOpenImportPicker = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleExportGoals = () => {
    if (goals.length === 0) {
      return;
    }

    const exportPayload: ExportedGoalsFile = {
      schemaVersion: GOALS_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      goalCount: goals.length,
      goals: goals.map((goalProgress) => ({
        goal: goalProgress.goal,
        currentAmount: goalProgress.currentAmount,
        transactionCount: goalProgress.transactionCount,
      })),
    };

    const fileDate = new Date().toISOString().split('T')[0];
    const fileName = `melomoney-goals-${fileDate}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportGoalsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const fileContent = await file.text();
      const importedGoals = parseImportedGoals(fileContent).map((goalProgress) => ({
        ...goalProgress.goal,
        startingAmount: goalProgress.currentAmount,
      }));

      mergeGoals(importedGoals);
      setGoals(getGoalProgress());
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import goals file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName || !canSubmit) {
      return;
    }

    const goalPayload: Goal = {
      id: editingGoalId ?? `goal-${Date.now()}`,
      name: trimmedName,
      description: form.description.trim() || undefined,
      icon: form.icon,
      startingAmount,
      targetAmount: hasTarget ? explicitTargetAmount : 0,
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

    if (editingGoalId) {
      const existingGoal = goals.find((goalProgress) => goalProgress.goal.id === editingGoalId)?.goal;
      if (!existingGoal) {
        return;
      }

      updateGoal({
        ...goalPayload,
        createdAt: existingGoal.createdAt,
        isArchived: existingGoal.isArchived,
      });
    } else {
      addGoal(goalPayload);
    }

    setGoals(getGoalProgress());

    closeGoalForm();
  };

  return (
    <div className="page-container">
      <PageHeader title="Goals">
        <PageHeaderActions
          onImport={handleOpenImportPicker}
          onExport={handleExportGoals}
          onCreate={openCreateGoalForm}
          importDisabled={isImporting}
          exportDisabled={goals.length === 0}
          importLabel={isImporting ? 'Importing...' : 'Import'}
        />
      </PageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportGoalsFile(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {isCreateMenuOpen && (
        <Modal onClose={closeGoalForm} panelClassName="max-w-3xl p-5">
          <section>
              <div className="section-header mb-4">
                <h2 className="heading-3 text-text">
                  {editingGoalId ? 'Edit Goal' : 'Create Goal'}
                </h2>
                <button className="btn-icon" onClick={closeGoalForm}>
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
                    className="w-full px-4 py-2.5 rounded-md bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-text-muted focus:border-text-muted transition-all duration-150 leading-5 min-h-16 resize-y"
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
                  <div className="text-ui text-text-muted">Set a recurring contribution without a fixed target.</div>
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
              {form.targetMethod === 'fixed' ? (
                <>
                  <div className="text-ui text-text-muted">Target preview</div>
                  <div className="text-body text-text mt-1">{formatCurrency(previewTargetAmount)}</div>
                  <div className="text-ui text-text-muted mt-2">Already saved: {formatCurrency(startingAmount)}</div>
                  <div className="text-ui text-text-muted">Left to save: {formatCurrency(amountLeftToSave)}</div>
                </>
              ) : (
                <>
                  <div className="text-ui text-text-muted">Contribution plan</div>
                  <div className="text-body text-text mt-1">
                    {formatCurrency(expectedContributionAmount)} {form.expectedContributionFrequency}
                  </div>
                  <div className="text-ui text-text-muted mt-2">
                    Yearly contribution: {formatCurrency(yearlyContributionAmount)}
                  </div>
                  <div className="text-ui text-text-muted">
                    Horizon: {form.dueDate ? `until due date (${contributionPeriodsLabel})` : `until year end (${contributionPeriodsLabel})`}
                  </div>
                  <div className="text-ui text-text-muted">
                    Planned total in horizon: {formatCurrency(derivedContributionPlanAmount)}
                  </div>
                  <div className="text-ui text-text-muted">
                    Current saved amount: {formatCurrency(startingAmount)}
                  </div>
                </>
              )}
            </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeGoalForm}
                >
                  Cancel
                </button>
              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {editingGoalId ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
              </form>
          </section>
        </Modal>
      )}

      {goalToDelete && (
        <Modal onClose={closeDeleteGoalModal} panelClassName="max-w-md p-5 space-y-4">
          <div>
              <h2 className="heading-2">Delete goal?</h2>
              <p className="text-body text-text-muted">
                This will delete <span className="text-text">{goalToDelete.name}</span> and remove its goal link from related transactions.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteGoalModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteGoal}
                  className="btn-primary"
                >
                  Delete goal
                </button>
              </div>
          </div>
        </Modal>
      )}

      <div className="flex flex-wrap gap-8 mb-2">
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
          const allGoalTransactions = allTransactions.filter((tx) => tx.goalId === gp.goal.id);
          const goalTransactions = allGoalTransactions.slice(0, 4);
          const isOpenEnded = gp.goal.hasTarget === false;
          const isContributionPlan = Boolean(gp.goal.expectedContribution);
          const shouldShowProgressBar = !isOpenEnded || isContributionPlan;
          const yearlyPlanAmount = gp.goal.expectedContribution
            ? getYearlyContribution(
              gp.goal.expectedContribution.frequency,
              gp.goal.expectedContribution.amount,
            )
            : 0;
          const currentYear = new Date().getFullYear();
          const yearStart = `${currentYear}-01-01`;
          const yearEnd = `${currentYear}-12-31`;
          const yearToDateContribution = allGoalTransactions
            .filter((transaction) => transaction.date >= yearStart && transaction.date <= yearEnd)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
          const yearlyPlanProgress = yearlyPlanAmount > 0
            ? Math.max(0, Math.min((yearToDateContribution / yearlyPlanAmount) * 100, 999))
            : 0;

          const badges: ReactNode[] = [];
          if (isContributionPlan) {
            badges.push(<Badge key="goal-plan" variant="default">Contribution plan</Badge>);
          }
          if (!isContributionPlan && !isOpenEnded) {
            badges.push(<Badge key="goal-fixed" variant="muted">Fixed target</Badge>);
          }
          if (isOpenEnded) {
            badges.push(<Badge key="goal-open" variant="muted">Open-ended</Badge>);
          }

          const detailItems = [
            {
              label: 'Saved',
              value: formatCurrency(gp.currentAmount),
              tone: gp.currentAmount < 0 ? 'expense' : 'strong',
            },
            !isOpenEnded
              ? {
                label: 'Target',
                value: formatCurrency(gp.goal.targetAmount),
                tone: 'default',
              }
              : {
                label: 'Target',
                value: 'Open-ended',
                tone: 'muted',
              },
            gp.goal.expectedContribution
              ? {
                label: 'Contribution',
                value: `${formatCurrency(gp.goal.expectedContribution.amount)} ${gp.goal.expectedContribution.frequency}`,
                tone: 'goal',
              }
              : undefined,
            gp.goal.deadline
              ? {
                label: 'Due date',
                value: formatDate(gp.goal.deadline),
                tone: 'default',
              }
              : undefined,
          ].filter((item): item is { label: string; value: string; tone: 'default' | 'strong' | 'muted' | 'goal' | 'expense' } => item !== undefined);

          return (
            <EntityCard
              key={gp.goal.id}
              icon={gp.goal.icon}
              title={gp.goal.name}
              subtitle={gp.goal.description?.trim() || (gp.goal.deadline ? `Due ${formatDate(gp.goal.deadline)}` : 'Savings goal')}
              tone="goal"
              metric={isOpenEnded ? 'Open' : `${gp.percentage.toFixed(0)}%`}
              metricClassName="text-goal"
              badges={badges.length > 0 ? badges : undefined}
              actions={(
                <>
                  <EntityCardActionButton
                    icon={Pencil}
                    label={`Edit ${gp.goal.name}`}
                    onClick={() => openEditGoalForm(gp.goal)}
                  />
                  <EntityCardActionButton
                    icon={Trash2}
                    label={`Delete ${gp.goal.name}`}
                    tone="danger"
                    onClick={() => requestDeleteGoal(gp.goal)}
                  />
                </>
              )}
            >
              <EntityCardDetailList items={detailItems} />

              {shouldShowProgressBar && (
                <EntityCardSection
                  title="Progress"
                  action={<span className="text-ui text-goal font-medium">{gp.percentage.toFixed(0)}%</span>}
                >
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-400 ease-out bg-goal"
                      style={{ width: `${Math.max(0, Math.min(gp.percentage, 100))}%` }}
                    />
                  </div>
                </EntityCardSection>
              )}

              {gp.goal.expectedContribution && (
                <EntityCardSection title="Plan">
                  <p className="text-ui text-text-muted">
                    {formatCurrency(gp.goal.expectedContribution.amount)} {gp.goal.expectedContribution.frequency}
                    {' '}
                    · {formatCurrency(yearlyPlanAmount)} yearly
                    {' '}
                    · This year: {formatCurrency(yearToDateContribution)} ({yearlyPlanProgress.toFixed(0)}%)
                  </p>
                </EntityCardSection>
              )}

              {goalTransactions.length > 0 && (
                <EntityCardSection
                  title="Recent Contributions"
                  action={(
                    <Link
                      to={`/transactions?goal=${encodeURIComponent(gp.goal.id)}`}
                      className="text-link"
                    >
                      View all <ArrowUpRight size={10} />
                    </Link>
                  )}
                >
                  <div className="flex flex-col">
                    {goalTransactions.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        description={tx.description}
                        type={tx.type}
                        amount={tx.amount}
                        currency={tx.currency}
                        categoryName={tx.category.name}
                        accountName={tx.account.name}
                        destinationAccountName={tx.destinationAccount?.name}
                        transferPairRole={tx.transferPairRole}
                        isSplit={!!tx.split}
                      />
                    ))}
                  </div>
                </EntityCardSection>
              )}
            </EntityCard>
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
