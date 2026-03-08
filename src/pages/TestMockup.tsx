import { useMemo } from 'react';
import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACCOUNT_TYPE_LABELS } from '../components/accounts';
import { PageHeader } from '../components/layout';
import {
  Badge,
  EntityCard,
  EntityCardActionButton,
  EntityCardDetailList,
  EntityCardSection,
} from '../components/ui';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  getAccounts,
  getCategoryById,
  getGoalProgress,
  getTransactionsWithDetails,
} from '../lib/data-service';
import {
  AUTOMATION_TRIGGER_OPTIONS,
  automationOperatorNeedsValue,
  loadAutomationRules,
} from '../lib/automation-rules';
import {
  cn,
  formatDate,
  formatRelativeDate,
} from '../lib/utils';
import { useFormatCurrency } from '../hooks';
import type {
  EntityCardDetailItem,
  EntityCardDetailTone,
  EntityCardTone,
} from '../components/ui';
import type {
  Account,
  AutomationAction,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationRule,
  Category,
  Goal,
  GoalProgress,
  TransactionWithDetails,
} from '../types';

type MockBadgeVariant = 'default' | 'income' | 'expense' | 'transfer' | 'split' | 'muted';

interface MockCardBadge {
  label: string;
  variant?: MockBadgeVariant;
}

interface ActivityPreviewItem {
  description: string;
  date: string;
  amount: string;
  tone?: EntityCardDetailTone;
}

interface MockCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  tone: EntityCardTone;
  metric?: string;
  metricTone?: EntityCardDetailTone;
  badges?: MockCardBadge[];
  details: EntityCardDetailItem[];
  activityPreview?: {
    label: string;
    linkTo: string;
    linkLabel?: string;
    items: ActivityPreviewItem[];
  };
  progress?: {
    percentage: number;
    tone?: EntityCardDetailTone;
  };
  locked?: boolean;
}

interface MockSectionConfig {
  id: string;
  title: string;
  description: string;
  sourceLabel: string;
  countLabel: string;
  cards: MockCard[];
}

interface MockSectionProps {
  section: MockSectionConfig;
}

const LOCKED_CATEGORY_IDS = new Set(['transfer']);
const MAX_CARDS_PER_SECTION = 3;

const ACCOUNT_TONES: Record<Account['type'], EntityCardTone> = {
  checking: 'transfer',
  savings: 'income',
  credit: 'expense',
  cash: 'warning',
  investment: 'goal',
  retirement: 'accent',
};

const ACCOUNT_BADGE_VARIANT_BY_TYPE: Record<Account['type'], MockBadgeVariant> = {
  checking: 'transfer',
  savings: 'income',
  credit: 'expense',
  cash: 'muted',
  investment: 'default',
  retirement: 'default',
};

const OPERATOR_LABELS: Record<AutomationConditionOperator, string> = {
  equals: 'equals',
  'not-equals': 'does not equal',
  contains: 'contains',
  'not-contains': 'does not contain',
  'starts-with': 'starts with',
  'ends-with': 'ends with',
  regex: 'matches regex',
  'not-regex': 'does not match regex',
  gt: 'is greater than',
  gte: 'is greater or equal',
  lt: 'is less than',
  lte: 'is less or equal',
  exists: 'has value',
  'not-exists': 'is empty',
};

const metricToneClasses: Record<EntityCardDetailTone, string> = {
  default: 'text-text-secondary',
  strong: 'text-text',
  muted: 'text-text-muted',
  accent: 'text-accent',
  goal: 'text-goal',
  income: 'text-income',
  transfer: 'text-transfer',
  warning: 'text-warning',
  expense: 'text-expense',
};

function resolveCategoryOrFallback(categoryId: string): Category {
  return getCategoryById(categoryId) ?? {
    id: categoryId,
    name: 'Unknown Category',
    icon: 'CircleHelp',
  };
}

const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: 'sample-account-main',
    name: 'Main Checking',
    type: 'checking',
    balance: 1200,
    currency: 'CHF',
    icon: 'Wallet',
    accountIdentifier: 'CH93 0076 2011 6238 5295 7',
  },
  {
    id: 'sample-account-travel',
    name: 'Travel Buffer',
    type: 'savings',
    balance: 450,
    currency: 'EUR',
    icon: 'PiggyBank',
  },
];

const SAMPLE_GOAL_EMERGENCY: Goal = {
  id: 'sample-goal-emergency',
  name: 'Emergency Fund',
  description: 'Build a six-month safety cushion.',
  icon: 'ShieldCheck',
  startingAmount: 1000,
  targetAmount: 6500,
  hasTarget: true,
  deadline: '2026-12-31',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const SAMPLE_GOAL_TRIP: Goal = {
  id: 'sample-goal-trip',
  name: 'Winter Trip',
  description: 'Flexible travel budget for seasonal trips.',
  icon: 'Mountain',
  startingAmount: 700,
  targetAmount: 0,
  hasTarget: false,
  createdAt: '2026-01-14T00:00:00.000Z',
};

const SAMPLE_GOAL_PROGRESS: GoalProgress[] = [
  {
    goal: SAMPLE_GOAL_EMERGENCY,
    currentAmount: 4030,
    percentage: 62,
    transactionCount: 2,
  },
  {
    goal: SAMPLE_GOAL_TRIP,
    currentAmount: 1260,
    percentage: 0,
    transactionCount: 2,
  },
];

const SAMPLE_RULES: AutomationRule[] = [
  {
    id: 'sample-rule-coop',
    name: 'Auto-tag Coop Receipts',
    isEnabled: true,
    triggers: ['on-import', 'manual-run'],
    matchMode: 'any',
    conditions: [
      {
        id: 'sample-rule-coop-condition-1',
        field: 'description',
        operator: 'contains',
        value: 'coop',
      },
    ],
    actions: [
      {
        type: 'set-category',
        categoryId: 'groceries',
      },
    ],
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'sample-rule-goal',
    name: 'Route Savings Transfers to Emergency Fund',
    isEnabled: false,
    triggers: ['manual-run'],
    matchMode: 'all',
    conditions: [
      {
        id: 'sample-rule-goal-condition-1',
        field: 'categoryId',
        operator: 'equals',
        value: 'savings-transfer',
      },
      {
        id: 'sample-rule-goal-condition-2',
        field: 'amount',
        operator: 'gt',
        value: '100',
      },
    ],
    actions: [
      {
        type: 'set-goal',
        goalId: SAMPLE_GOAL_EMERGENCY.id,
      },
    ],
    createdAt: '2026-01-20T09:00:00.000Z',
    updatedAt: '2026-01-24T09:00:00.000Z',
  },
];

const SAMPLE_TRANSACTIONS: TransactionWithDetails[] = [
  {
    id: 'sample-tx-1',
    amount: -64.2,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Coop Market Zurich',
    date: '2026-02-24',
    accountId: SAMPLE_ACCOUNTS[0].id,
    type: 'expense',
    category: resolveCategoryOrFallback('groceries'),
    account: SAMPLE_ACCOUNTS[0],
  },
  {
    id: 'sample-tx-2',
    amount: 3850,
    currency: 'CHF',
    categoryId: 'salary',
    description: 'Monthly Salary',
    date: '2026-02-23',
    accountId: SAMPLE_ACCOUNTS[0].id,
    type: 'income',
    category: resolveCategoryOrFallback('salary'),
    account: SAMPLE_ACCOUNTS[0],
  },
  {
    id: 'sample-tx-3',
    amount: 230,
    currency: 'CHF',
    categoryId: 'savings-transfer',
    description: 'Monthly transfer to fund',
    date: '2026-02-22',
    accountId: SAMPLE_ACCOUNTS[0].id,
    goalId: SAMPLE_GOAL_EMERGENCY.id,
    type: 'income',
    category: resolveCategoryOrFallback('savings-transfer'),
    account: SAMPLE_ACCOUNTS[0],
    goal: SAMPLE_GOAL_EMERGENCY,
  },
  {
    id: 'sample-tx-4',
    amount: -340,
    currency: 'EUR',
    categoryId: 'travel',
    description: 'Flight booking',
    date: '2026-02-20',
    accountId: SAMPLE_ACCOUNTS[1].id,
    type: 'expense',
    category: resolveCategoryOrFallback('travel'),
    account: SAMPLE_ACCOUNTS[1],
  },
  {
    id: 'sample-tx-5',
    amount: 500,
    currency: 'EUR',
    categoryId: 'gifts-received',
    description: 'Trip top-up from gift',
    date: '2026-02-18',
    accountId: SAMPLE_ACCOUNTS[1].id,
    goalId: SAMPLE_GOAL_TRIP.id,
    type: 'income',
    category: resolveCategoryOrFallback('gifts-received'),
    account: SAMPLE_ACCOUNTS[1],
    goal: SAMPLE_GOAL_TRIP,
  },
  {
    id: 'sample-tx-6',
    amount: 120,
    currency: 'CHF',
    categoryId: 'savings-transfer',
    description: 'Trip savings transfer',
    date: '2026-02-17',
    accountId: SAMPLE_ACCOUNTS[0].id,
    goalId: SAMPLE_GOAL_TRIP.id,
    type: 'income',
    category: resolveCategoryOrFallback('savings-transfer'),
    account: SAMPLE_ACCOUNTS[0],
    goal: SAMPLE_GOAL_TRIP,
  },
];

function sortTransactionsByNewest(transactions: TransactionWithDetails[]): TransactionWithDetails[] {
  return [...transactions].sort((left, right) => {
    const leftWithTime = new Date(`${left.date}T${left.time ?? '00:00:00'}`).getTime();
    const rightWithTime = new Date(`${right.date}T${right.time ?? '00:00:00'}`).getTime();
    const leftTimestamp = Number.isNaN(leftWithTime) ? new Date(left.date).getTime() : leftWithTime;
    const rightTimestamp = Number.isNaN(rightWithTime) ? new Date(right.date).getTime() : rightWithTime;
    return rightTimestamp - leftTimestamp;
  });
}

function buildAccountBalances(
  accounts: Account[],
  transactions: TransactionWithDetails[],
): Map<string, number> {
  const balances = new Map<string, number>();

  accounts.forEach((account) => {
    balances.set(account.id, account.balance);
  });

  transactions.forEach((transaction) => {
    if (!balances.has(transaction.accountId)) {
      return;
    }

    balances.set(
      transaction.accountId,
      (balances.get(transaction.accountId) ?? 0) + transaction.amount,
    );
  });

  return balances;
}

function createCountLabel(visibleCount: number, totalCount: number): string {
  if (visibleCount >= totalCount) {
    return `${visibleCount} cards`;
  }

  return `${visibleCount} of ${totalCount} cards`;
}

function getTransactionAmountTone(transaction: TransactionWithDetails): EntityCardDetailTone {
  if (transaction.type === 'income') {
    return 'income';
  }

  if (transaction.type === 'expense') {
    return 'expense';
  }

  if (transaction.amount > 0) {
    return 'income';
  }

  if (transaction.amount < 0) {
    return 'expense';
  }

  return 'transfer';
}

function formatRuleCondition(condition: AutomationCondition): string {
  const operator = OPERATOR_LABELS[condition.operator];

  if (!automationOperatorNeedsValue(condition.operator)) {
    return `${condition.field} ${operator}`;
  }

  return `${condition.field} ${operator} "${condition.value ?? ''}"`;
}

function formatRuleAction(action: AutomationAction, goalNameById: Map<string, string>): string {
  if (action.type === 'set-category') {
    const categoryName = getCategoryById(action.categoryId)?.name ?? action.categoryId;
    return `Set category to ${categoryName}`;
  }

  const goalName = goalNameById.get(action.goalId) ?? action.goalId;
  return `Set goal to ${goalName}`;
}

function formatRuleConditionsSummary(conditions: AutomationCondition[]): string {
  if (conditions.length === 0) {
    return 'No conditions';
  }

  const firstCondition = formatRuleCondition(conditions[0]);
  if (conditions.length === 1) {
    return firstCondition;
  }

  return `${firstCondition} +${conditions.length - 1} more`;
}

function getTriggerLabel(trigger: AutomationRule['triggers'][number]): string {
  return AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === trigger)?.label ?? trigger;
}

function MockSection({ section }: MockSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title text-text">{section.title}</h2>
          <p className="text-ui text-text-muted mt-0.5">{section.description}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="badge-muted">{section.countLabel}</span>
          <span className="badge-muted">{section.sourceLabel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {section.cards.map((card) => {
          const badgeItems = [...(card.badges ?? [])];
          if (card.locked) {
            badgeItems.push({ label: 'Locked', variant: 'muted' });
          }

          return (
            <EntityCard
              key={card.id}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
              tone={card.tone}
              metric={card.metric}
              metricClassName={cn('min-w-[104px]', metricToneClasses[card.metricTone ?? 'strong'])}
              badges={badgeItems.map((badge) => (
                <Badge key={`${card.id}-${badge.label}`} variant={badge.variant ?? 'muted'}>
                  {badge.label}
                </Badge>
              ))}
              actions={(
                <EntityCardActionButton icon={MoreHorizontal} label={`More actions for ${card.title}`} />
              )}
            >
              {card.details.length > 0 && <EntityCardDetailList items={card.details} />}

              {card.activityPreview && (
                <EntityCardSection
                  title={card.activityPreview.label}
                  action={(
                    <Link to={card.activityPreview.linkTo} className="text-link">
                      {card.activityPreview.linkLabel ?? 'View all'} <ArrowUpRight size={10} />
                    </Link>
                  )}
                >

                  <div className="space-y-2">
                    {card.activityPreview.items.map((item) => (
                      <div
                        key={`${card.id}-${item.description}-${item.date}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-ui text-text truncate">{item.description}</p>
                          <p className="text-ui text-text-muted">{item.date}</p>
                        </div>

                        <span
                          className={cn(
                            'text-ui font-medium shrink-0',
                            metricToneClasses[item.tone ?? 'default'],
                          )}
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </EntityCardSection>
              )}

              {card.progress && (
                <EntityCardSection
                  title="Progress"
                  action={(
                    <span
                      className={cn(
                        'text-ui font-medium',
                        metricToneClasses[card.progress.tone ?? 'goal'],
                      )}
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {Math.round(card.progress.percentage)}%
                    </span>
                  )}
                >

                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        card.progress.tone === 'income'
                          ? 'bg-income'
                          : card.progress.tone === 'warning'
                            ? 'bg-warning'
                            : card.progress.tone === 'accent'
                              ? 'bg-accent'
                              : 'bg-goal',
                      )}
                      style={{ width: `${Math.max(0, Math.min(card.progress.percentage, 100))}%` }}
                    />
                  </div>
                </EntityCardSection>
              )}
            </EntityCard>
          );
        })}
      </div>
    </section>
  );
}

export function TestMockup() {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  const liveAccounts = useMemo(() => getAccounts(), []);
  const liveGoalProgress = useMemo(() => getGoalProgress(), []);
  const liveRules = useMemo(() => loadAutomationRules(), []);
  const liveTransactions = useMemo(() => getTransactionsWithDetails(), []);

  const accounts = liveAccounts.length > 0 ? liveAccounts : SAMPLE_ACCOUNTS;
  const goals = liveGoalProgress.length > 0 ? liveGoalProgress : SAMPLE_GOAL_PROGRESS;
  const rules = liveRules.length > 0 ? liveRules : SAMPLE_RULES;
  const transactions = liveTransactions.length > 0 ? liveTransactions : SAMPLE_TRANSACTIONS;

  const sortedTransactions = useMemo(
    () => sortTransactionsByNewest(transactions),
    [transactions],
  );

  const accountBalancesById = useMemo(
    () => buildAccountBalances(accounts, sortedTransactions),
    [accounts, sortedTransactions],
  );

  const transactionsByAccountId = useMemo(() => {
    const grouped = new Map<string, TransactionWithDetails[]>();

    sortedTransactions.forEach((transaction) => {
      const existing = grouped.get(transaction.accountId) ?? [];
      existing.push(transaction);
      grouped.set(transaction.accountId, existing);
    });

    return grouped;
  }, [sortedTransactions]);

  const transactionsByGoalId = useMemo(() => {
    const grouped = new Map<string, TransactionWithDetails[]>();

    sortedTransactions.forEach((transaction) => {
      if (!transaction.goalId) {
        return;
      }

      const existing = grouped.get(transaction.goalId) ?? [];
      existing.push(transaction);
      grouped.set(transaction.goalId, existing);
    });

    return grouped;
  }, [sortedTransactions]);

  const transactionCountByCategoryId = useMemo(() => {
    const counts = new Map<string, number>();

    sortedTransactions.forEach((transaction) => {
      counts.set(
        transaction.categoryId,
        (counts.get(transaction.categoryId) ?? 0) + 1,
      );
    });

    return counts;
  }, [sortedTransactions]);

  const categoryGroupById = useMemo(
    () => new Map(CATEGORY_GROUPS.map((group) => [group.id, group] as const)),
    [],
  );

  const goalNameById = useMemo(() => {
    const goalNames = new Map<string, string>();

    goals.forEach((goalProgress) => {
      goalNames.set(goalProgress.goal.id, goalProgress.goal.name);
    });

    sortedTransactions.forEach((transaction) => {
      if (transaction.goalId && transaction.goal?.name && !goalNames.has(transaction.goalId)) {
        goalNames.set(transaction.goalId, transaction.goal.name);
      }
    });

    return goalNames;
  }, [goals, sortedTransactions]);

  const accountCards = useMemo<MockCard[]>(() => {
    return accounts.slice(0, MAX_CARDS_PER_SECTION).map((account) => {
      const accountTransactions = transactionsByAccountId.get(account.id) ?? [];
      const accountBalance = accountBalancesById.get(account.id) ?? account.balance;

      return {
        id: account.id,
        icon: account.icon,
        title: account.name,
        subtitle: account.currency,
        tone: ACCOUNT_TONES[account.type],
        metric: formatCurrency(accountBalance, account.currency),
        metricTone: accountBalance < 0 ? 'expense' : 'strong',
        badges: [
          {
            label: ACCOUNT_TYPE_LABELS[account.type],
            variant: ACCOUNT_BADGE_VARIANT_BY_TYPE[account.type],
          },
        ],
        details: [
          {
            label: 'Total transactions',
            value: String(accountTransactions.length),
            tone: 'strong',
          },
          {
            label: 'Account number',
            value: account.accountIdentifier ?? 'Not set',
            tone: account.accountIdentifier ? 'default' : 'muted',
          },
        ],
        activityPreview: accountTransactions.length > 0
          ? {
              label: 'Recent Transactions',
              linkTo: `/transactions?account=${encodeURIComponent(account.id)}`,
              items: accountTransactions.slice(0, 3).map((transaction) => ({
                description: transaction.description,
                date: formatRelativeDate(transaction.date),
                amount: formatSignedCurrency(transaction.amount, transaction.currency),
                tone: getTransactionAmountTone(transaction),
              })),
            }
          : undefined,
      };
    });
  }, [accounts, accountBalancesById, transactionsByAccountId, formatCurrency, formatSignedCurrency]);

  const goalCards = useMemo<MockCard[]>(() => {
    return goals.slice(0, MAX_CARDS_PER_SECTION).map((goalProgress) => {
      const goal = goalProgress.goal;
      const goalTransactions = transactionsByGoalId.get(goal.id) ?? [];
      const hasTarget = goal.hasTarget !== false;
      const isOpenEnded = !hasTarget;

      const details: EntityCardDetailItem[] = [
        {
          label: 'Saved',
          value: formatCurrency(goalProgress.currentAmount),
          tone: 'strong',
        },
      ];

      if (hasTarget) {
        details.push({
          label: 'Target',
          value: formatCurrency(goal.targetAmount),
          tone: 'default',
        });
      }

      if (goal.expectedContribution) {
        details.push({
          label: 'Contribution',
          value: `${formatCurrency(goal.expectedContribution.amount)} ${goal.expectedContribution.frequency}`,
          tone: 'goal',
        });
      }

      if (goal.deadline) {
        details.push({
          label: 'Due date',
          value: formatDate(goal.deadline),
          tone: 'default',
        });
      }

      const badges: MockCardBadge[] = [];
      if (goal.expectedContribution) {
        badges.push({ label: 'Contribution plan', variant: 'default' });
      }
      if (hasTarget) {
        badges.push({ label: 'Fixed target', variant: 'default' });
      } else if (isOpenEnded) {
        badges.push({ label: 'Open-ended', variant: 'muted' });
      }

      return {
        id: goal.id,
        icon: goal.icon,
        title: goal.name,
        subtitle: goal.description?.trim() || 'Savings goal',
        tone: 'goal',
        badges,
        details,
        activityPreview: goalTransactions.length > 0
          ? {
              label: 'Recent Contributions',
              linkTo: `/transactions?goal=${encodeURIComponent(goal.id)}`,
              items: goalTransactions.slice(0, 3).map((transaction) => ({
                description: transaction.description,
                date: formatRelativeDate(transaction.date),
                amount: formatSignedCurrency(transaction.amount, transaction.currency),
                tone: getTransactionAmountTone(transaction),
              })),
            }
          : undefined,
        progress: hasTarget
          ? {
              percentage: Math.max(0, Math.min(goalProgress.percentage, 100)),
              tone: goalProgress.percentage >= 100 ? 'income' : 'goal',
            }
          : undefined,
      };
    });
  }, [goals, transactionsByGoalId, formatCurrency, formatSignedCurrency]);

  const categoryCards = useMemo<MockCard[]>(() => {
    const usageSortedIds = Array.from(transactionCountByCategoryId.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([categoryId]) => categoryId);

    const selectedCategoryIds: string[] = [];

    usageSortedIds.forEach((categoryId) => {
      if (selectedCategoryIds.length >= MAX_CARDS_PER_SECTION) {
        return;
      }

      if (selectedCategoryIds.includes(categoryId)) {
        return;
      }

      if (getCategoryById(categoryId)) {
        selectedCategoryIds.push(categoryId);
      }
    });

    ['groceries', 'salary', 'transfer'].forEach((fallbackId) => {
      if (selectedCategoryIds.length >= MAX_CARDS_PER_SECTION) {
        return;
      }

      if (selectedCategoryIds.includes(fallbackId)) {
        return;
      }

      if (getCategoryById(fallbackId)) {
        selectedCategoryIds.push(fallbackId);
      }
    });

    const selectedCategories = selectedCategoryIds
      .map((categoryId) => getCategoryById(categoryId))
      .filter((category): category is Category => category !== undefined);

    return selectedCategories.map((category) => {
      const categoryGroup = category.groupId
        ? categoryGroupById.get(category.groupId)
        : undefined;

      const badges: MockCardBadge[] = [
        {
          label: category.isDefault ? 'Default' : 'Custom',
          variant: 'muted',
        },
      ];

      const isLocked = LOCKED_CATEGORY_IDS.has(category.id);

      return {
        id: category.id,
        icon: category.icon,
        title: category.name,
        subtitle: categoryGroup?.name ?? 'Ungrouped',
        tone: 'neutral',
        badges,
        locked: isLocked,
        details: [],
      };
    });
  }, [
    categoryGroupById,
    transactionCountByCategoryId,
  ]);

  const ruleCards = useMemo<MockCard[]>(() => {
    return rules.slice(0, MAX_CARDS_PER_SECTION).map((rule) => {
      const firstAction = rule.actions[0];
      const actionSummary = firstAction
        ? `${formatRuleAction(firstAction, goalNameById)}${rule.actions.length > 1 ? ` +${rule.actions.length - 1} more` : ''}`
        : 'No actions';

      return {
        id: rule.id,
        icon: 'Bot',
        title: rule.name,
        subtitle: rule.matchMode === 'all' ? 'All conditions must match' : 'Any condition can match',
        tone: rule.isEnabled ? 'income' : 'warning',
        metric: rule.isEnabled ? 'Enabled' : 'Disabled',
        metricTone: rule.isEnabled ? 'income' : 'muted',
        badges: rule.triggers.map((trigger) => ({
          label: getTriggerLabel(trigger),
          variant: 'muted',
        })),
        details: [
          {
            label: 'Match mode',
            value: rule.matchMode === 'all' ? 'All conditions must match' : 'Any condition can match',
            tone: 'default',
          },
          {
            label: 'Action',
            value: actionSummary,
            tone: firstAction ? 'default' : 'muted',
          },
          {
            label: 'Condition',
            value: formatRuleConditionsSummary(rule.conditions),
            tone: rule.conditions.length > 0 ? 'strong' : 'muted',
          },
        ],
      };
    });
  }, [goalNameById, rules]);

  const sections = useMemo<MockSectionConfig[]>(() => [
    {
      id: 'accounts',
      title: 'Accounts',
      description: 'Uses real account fields and keeps the recent transactions preview with direct filtered navigation.',
      sourceLabel: liveAccounts.length > 0 ? 'Live data' : 'Sample fallback',
      countLabel: createCountLabel(accountCards.length, accounts.length),
      cards: accountCards,
    },
    {
      id: 'categories',
      title: 'Categories',
      description: 'Category cards stay intentionally minimal with group context and quick actions.',
      sourceLabel: 'Default catalog',
      countLabel: createCountLabel(categoryCards.length, CATEGORIES.length),
      cards: categoryCards,
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'Goal cards use actual progress fields and keep recent contributions with direct goal-filter links.',
      sourceLabel: liveGoalProgress.length > 0 ? 'Live data' : 'Sample fallback',
      countLabel: createCountLabel(goalCards.length, goals.length),
      cards: goalCards,
    },
    {
      id: 'rules',
      title: 'Rules',
      description: 'Rule cards summarize real conditions, actions, and triggers while preserving the same visual rhythm.',
      sourceLabel: liveRules.length > 0 ? 'Live data' : 'Sample fallback',
      countLabel: createCountLabel(ruleCards.length, rules.length),
      cards: ruleCards,
    },
  ], [
    accountCards,
    accounts.length,
    categoryCards,
    goalCards,
    goals.length,
    liveAccounts.length,
    liveGoalProgress.length,
    liveRules.length,
    ruleCards,
    rules.length,
  ]);

  return (
    <div className="page-container">
      <PageHeader title="List Card Mockup">
        <Link to="/accounts" className="btn-secondary">
          <ArrowUpRight size={14} />
          Open Accounts
        </Link>
      </PageHeader>

      <p className="text-body text-text-muted">
        Unified list-card language for Accounts, Categories, Goals, and Rules.
        This page uses your current local data whenever available, with typed fallback data only when a section is empty.
      </p>

      {sections.map((section) => (
        <MockSection key={section.id} section={section} />
      ))}
    </div>
  );
}
