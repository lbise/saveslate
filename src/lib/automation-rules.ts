import { inferTransactionType, UNCATEGORIZED_CATEGORY_ID } from './transaction-type';
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationMatchMode,
  AutomationRule,
  AutomationTrigger,
  Transaction,
} from '../types';

const AUTOMATION_RULES_KEY = 'melomoney:automation-rules';

export const AUTOMATION_RULES_EXPORT_SCHEMA_VERSION = 1;

export const AUTOMATION_TRIGGER_OPTIONS: Array<{
  value: AutomationTrigger;
  label: string;
  description: string;
}> = [
  {
    value: 'on-import',
    label: 'On import',
    description: 'Run automatically when new transactions are imported.',
  },
  {
    value: 'manual-run',
    label: 'Manual run',
    description: 'Run when you click "Run rules now".',
  },
  {
    value: 'on-create',
    label: 'On create',
    description: 'Reserved for future manual transaction creation flow.',
  },
];

export const AUTOMATION_OPERATOR_OPTIONS: Array<{
  value: AutomationConditionOperator;
  label: string;
}> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not-equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not-contains', label: 'Does not contain' },
  { value: 'starts-with', label: 'Starts with' },
  { value: 'ends-with', label: 'Ends with' },
  { value: 'regex', label: 'Regex matches' },
  { value: 'not-regex', label: 'Regex does not match' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'exists', label: 'Has value' },
  { value: 'not-exists', label: 'Is empty' },
];

export const RULE_FIELD_SUGGESTIONS = [
  'description',
  'amount',
  'currency',
  'date',
  'time',
  'accountId',
  'categoryId',
  'goalId',
  'importBatchId',
  'type',
  'metadata.merchant',
  'metadata.counterparty',
  'raw.Description',
] as const;

type RuleDraft = Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>;

interface RuleRunStat {
  ruleId: string;
  ruleName: string;
  matchedCount: number;
  changedCount: number;
}

export interface AutomationRunResult {
  transactions: Transaction[];
  evaluatedCount: number;
  matchedCount: number;
  changedCount: number;
  ruleStats: RuleRunStat[];
}

export interface UpsertQuickCategoryRuleResult {
  rule: AutomationRule;
  created: boolean;
  conditionAdded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAutomationTrigger(value: unknown): value is AutomationTrigger {
  return value === 'on-import' || value === 'manual-run' || value === 'on-create';
}

function isAutomationMatchMode(value: unknown): value is AutomationMatchMode {
  return value === 'all' || value === 'any';
}

function isAutomationOperator(value: unknown): value is AutomationConditionOperator {
  return value === 'equals'
    || value === 'not-equals'
    || value === 'contains'
    || value === 'not-contains'
    || value === 'starts-with'
    || value === 'ends-with'
    || value === 'regex'
    || value === 'not-regex'
    || value === 'gt'
    || value === 'gte'
    || value === 'lt'
    || value === 'lte'
    || value === 'exists'
    || value === 'not-exists';
}

export function automationOperatorNeedsValue(operator: AutomationConditionOperator): boolean {
  return operator !== 'exists' && operator !== 'not-exists';
}

export function createAutomationConditionId(): string {
  return `condition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createUniqueAutomationRuleId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

function parseCondition(value: unknown): AutomationCondition | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = typeof value.field === 'string' ? value.field.trim() : '';
  if (!field || !isAutomationOperator(value.operator)) {
    return null;
  }

  const condition: AutomationCondition = {
    id: typeof value.id === 'string' && value.id.trim()
      ? value.id.trim()
      : createAutomationConditionId(),
    field,
    operator: value.operator,
  };

  if (typeof value.value === 'string' && value.value.trim()) {
    condition.value = value.value.trim();
  }

  return condition;
}

function parseAction(value: unknown): AutomationAction | null {
  if (!isRecord(value) || value.type !== 'set-category') {
    return null;
  }

  const categoryId = typeof value.categoryId === 'string' ? value.categoryId.trim() : '';
  if (!categoryId) {
    return null;
  }

  return {
    type: 'set-category',
    categoryId,
  };
}

function normalizeRule(value: unknown): AutomationRule | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  const triggers = Array.isArray(value.triggers)
    ? value.triggers.filter((trigger): trigger is AutomationTrigger => isAutomationTrigger(trigger))
    : [];
  if (triggers.length === 0) {
    return null;
  }

  const conditions = Array.isArray(value.conditions)
    ? value.conditions
      .map((condition) => parseCondition(condition))
      .filter((condition): condition is AutomationCondition => condition !== null)
    : [];
  if (conditions.length === 0) {
    return null;
  }

  const action = parseAction(value.action);
  if (!action) {
    return null;
  }

  const createdAt = typeof value.createdAt === 'string' && value.createdAt.trim()
    ? value.createdAt
    : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' && value.updatedAt.trim()
    ? value.updatedAt
    : createdAt;

  return {
    id,
    name,
    isEnabled: value.isEnabled !== false,
    triggers,
    matchMode: isAutomationMatchMode(value.matchMode) ? value.matchMode : 'all',
    conditions,
    action,
    applyToUncategorizedOnly: value.applyToUncategorizedOnly !== false,
    createdAt,
    updatedAt,
  };
}

export function saveAutomationRules(rules: AutomationRule[]): void {
  localStorage.setItem(AUTOMATION_RULES_KEY, JSON.stringify(rules));
}

export function loadAutomationRules(): AutomationRule[] {
  try {
    const raw = localStorage.getItem(AUTOMATION_RULES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalizedRules = parsed
      .map((rule) => normalizeRule(rule))
      .filter((rule): rule is AutomationRule => rule !== null);

    if (normalizedRules.length !== parsed.length) {
      saveAutomationRules(normalizedRules);
    }

    return normalizedRules;
  } catch {
    return [];
  }
}

export function addAutomationRule(ruleDraft: RuleDraft): AutomationRule {
  const rules = loadAutomationRules();
  const existingIds = new Set(rules.map((rule) => rule.id));
  const now = new Date().toISOString();

  const rule: AutomationRule = {
    ...ruleDraft,
    id: createUniqueAutomationRuleId(existingIds),
    createdAt: now,
    updatedAt: now,
  };

  rules.push(rule);
  saveAutomationRules(rules);
  return rule;
}

export function updateAutomationRule(
  id: string,
  updates: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>,
): AutomationRule | null {
  const rules = loadAutomationRules();
  const ruleIndex = rules.findIndex((rule) => rule.id === id);
  if (ruleIndex === -1) {
    return null;
  }

  const currentRule = rules[ruleIndex];
  const nextRule: AutomationRule = {
    ...currentRule,
    ...updates,
    id: currentRule.id,
    createdAt: currentRule.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const normalizedRule = normalizeRule(nextRule);
  if (!normalizedRule) {
    return null;
  }

  rules[ruleIndex] = normalizedRule;
  saveAutomationRules(rules);
  return normalizedRule;
}

export function deleteAutomationRule(id: string): boolean {
  const rules = loadAutomationRules();
  const remainingRules = rules.filter((rule) => rule.id !== id);
  if (remainingRules.length === rules.length) {
    return false;
  }

  saveAutomationRules(remainingRules);
  return true;
}

export function parseAutomationRulesFile(rawContent: string): AutomationRule[] {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (!Array.isArray(parsedContent) && !isRecord(parsedContent)) {
    throw new Error('Invalid rules file format.');
  }

  if (
    isRecord(parsedContent)
    && 'schemaVersion' in parsedContent
    && parsedContent.schemaVersion !== AUTOMATION_RULES_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported rules file version.');
  }

  const rawRules = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent.rules;

  if (!Array.isArray(rawRules)) {
    throw new Error('Rules file is missing a rules array.');
  }

  const parsedRules = rawRules
    .map((rule) => normalizeRule(rule))
    .filter((rule): rule is AutomationRule => rule !== null);

  if (parsedRules.length === 0) {
    throw new Error('No valid rules found in file.');
  }

  return parsedRules;
}

export function mergeAutomationRules(incomingRules: AutomationRule[]): AutomationRule[] {
  const existingRules = loadAutomationRules();
  const existingRuleIds = new Set(existingRules.map((rule) => rule.id));

  const mergedRules = [
    ...existingRules,
    ...incomingRules.map((incomingRule) => {
      const nextId = incomingRule.id && !existingRuleIds.has(incomingRule.id)
        ? incomingRule.id
        : createUniqueAutomationRuleId(existingRuleIds);
      existingRuleIds.add(nextId);

      return {
        ...incomingRule,
        id: nextId,
      };
    }),
  ];

  saveAutomationRules(mergedRules);
  return mergedRules;
}

function resolveMetadataValue(transaction: Transaction, metadataKey: string): string | undefined {
  const normalizedKey = metadataKey.trim().toLowerCase();
  if (!normalizedKey || !transaction.metadata) {
    return undefined;
  }

  return transaction.metadata.find((entry) => entry.key.trim().toLowerCase() === normalizedKey)?.value;
}

function resolveRawValue(transaction: Transaction, rawKey: string): string | undefined {
  const normalizedKey = rawKey.trim().toLowerCase();
  if (!normalizedKey || !transaction.rawData) {
    return undefined;
  }

  const directValue = transaction.rawData[rawKey];
  if (directValue !== undefined) {
    return directValue;
  }

  const matchingEntry = Object.entries(transaction.rawData)
    .find(([key]) => key.trim().toLowerCase() === normalizedKey);

  return matchingEntry?.[1];
}

function resolveFieldValue(transaction: Transaction, field: string): unknown {
  const normalizedField = field.trim();
  if (!normalizedField) {
    return undefined;
  }

  if (normalizedField === 'type') {
    return inferTransactionType(transaction);
  }

  if (normalizedField.startsWith('metadata.')) {
    return resolveMetadataValue(transaction, normalizedField.slice('metadata.'.length));
  }

  if (normalizedField.startsWith('raw.')) {
    return resolveRawValue(transaction, normalizedField.slice('raw.'.length));
  }

  return (transaction as unknown as Record<string, unknown>)[normalizedField];
}

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function parseComparableValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const numericPattern = /^[-+]?\d+(?:[.,]\d+)?$/;
  if (numericPattern.test(trimmedValue)) {
    const asNumber = Number(trimmedValue.replace(',', '.'));
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  const asTimestamp = Date.parse(trimmedValue);
  return Number.isNaN(asTimestamp) ? null : asTimestamp;
}

function evaluateCondition(transaction: Transaction, condition: AutomationCondition): boolean {
  const fieldValue = resolveFieldValue(transaction, condition.field);
  const fieldText = normalizeText(fieldValue);
  const expectedText = normalizeText(condition.value);

  switch (condition.operator) {
    case 'exists':
      return fieldText.length > 0;
    case 'not-exists':
      return fieldText.length === 0;
    case 'equals': {
      const left = parseComparableValue(fieldValue);
      const right = parseComparableValue(condition.value);
      if (left !== null && right !== null) {
        return left === right;
      }

      return fieldText.toLowerCase() === expectedText.toLowerCase();
    }
    case 'not-equals': {
      const left = parseComparableValue(fieldValue);
      const right = parseComparableValue(condition.value);
      if (left !== null && right !== null) {
        return left !== right;
      }

      return fieldText.toLowerCase() !== expectedText.toLowerCase();
    }
    case 'contains':
      return expectedText.length > 0
        && fieldText.toLowerCase().includes(expectedText.toLowerCase());
    case 'not-contains':
      return expectedText.length > 0
        && !fieldText.toLowerCase().includes(expectedText.toLowerCase());
    case 'starts-with':
      return expectedText.length > 0
        && fieldText.toLowerCase().startsWith(expectedText.toLowerCase());
    case 'ends-with':
      return expectedText.length > 0
        && fieldText.toLowerCase().endsWith(expectedText.toLowerCase());
    case 'regex': {
      if (!expectedText) {
        return false;
      }

      try {
        return new RegExp(expectedText, 'i').test(fieldText);
      } catch {
        return false;
      }
    }
    case 'not-regex': {
      if (!expectedText) {
        return false;
      }

      try {
        return !new RegExp(expectedText, 'i').test(fieldText);
      } catch {
        return false;
      }
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = parseComparableValue(fieldValue);
      const right = parseComparableValue(condition.value);
      if (left === null || right === null) {
        return false;
      }

      if (condition.operator === 'gt') {
        return left > right;
      }
      if (condition.operator === 'gte') {
        return left >= right;
      }
      if (condition.operator === 'lt') {
        return left < right;
      }
      return left <= right;
    }
    default:
      return false;
  }
}

function canRuleApplyToTransaction(rule: AutomationRule, transaction: Transaction): boolean {
  if (rule.action.type === 'set-category') {
    return rule.applyToUncategorizedOnly !== false
      ? transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      : true;
  }

  return true;
}

function doesRuleMatch(rule: AutomationRule, transaction: Transaction): boolean {
  if (rule.conditions.length === 0) {
    return false;
  }

  if (!canRuleApplyToTransaction(rule, transaction)) {
    return false;
  }

  const evaluations = rule.conditions.map((condition) => evaluateCondition(transaction, condition));
  return rule.matchMode === 'any'
    ? evaluations.some(Boolean)
    : evaluations.every(Boolean);
}

function applyRuleAction(transaction: Transaction, action: AutomationAction): {
  transaction: Transaction;
  changed: boolean;
} {
  if (action.type === 'set-category') {
    if (transaction.categoryId === action.categoryId) {
      return {
        transaction,
        changed: false,
      };
    }

    return {
      transaction: {
        ...transaction,
        categoryId: action.categoryId,
      },
      changed: true,
    };
  }

  return {
    transaction,
    changed: false,
  };
}

export function applyAutomationRules(
  transactions: Transaction[],
  rules: AutomationRule[],
  trigger: AutomationTrigger,
): AutomationRunResult {
  const activeRules = rules
    .filter((rule) => rule.isEnabled && rule.triggers.includes(trigger))
    .sort((leftRule, rightRule) => leftRule.createdAt.localeCompare(rightRule.createdAt));

  const ruleStats: RuleRunStat[] = activeRules.map((rule) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    matchedCount: 0,
    changedCount: 0,
  }));

  if (activeRules.length === 0 || transactions.length === 0) {
    return {
      transactions,
      evaluatedCount: transactions.length,
      matchedCount: 0,
      changedCount: 0,
      ruleStats,
    };
  }

  const nextTransactions = [...transactions];
  let matchedCount = 0;
  let changedCount = 0;

  for (let transactionIndex = 0; transactionIndex < nextTransactions.length; transactionIndex += 1) {
    let currentTransaction = nextTransactions[transactionIndex];
    let hasMatched = false;

    for (let ruleIndex = 0; ruleIndex < activeRules.length; ruleIndex += 1) {
      const rule = activeRules[ruleIndex];
      const stats = ruleStats[ruleIndex];
      if (!doesRuleMatch(rule, currentTransaction)) {
        continue;
      }

      hasMatched = true;
      stats.matchedCount += 1;

      const actionResult = applyRuleAction(currentTransaction, rule.action);
      if (actionResult.changed) {
        stats.changedCount += 1;
        changedCount += 1;
        currentTransaction = actionResult.transaction;
        nextTransactions[transactionIndex] = currentTransaction;
      }

      break;
    }

    if (hasMatched) {
      matchedCount += 1;
    }
  }

  return {
    transactions: nextTransactions,
    evaluatedCount: transactions.length,
    matchedCount,
    changedCount,
    ruleStats,
  };
}

function isQuickCategoryRuleCandidate(rule: AutomationRule, categoryId: string): boolean {
  if (rule.action.type !== 'set-category' || rule.action.categoryId !== categoryId) {
    return false;
  }

  if (rule.matchMode !== 'any' || rule.applyToUncategorizedOnly === false) {
    return false;
  }

  if (!rule.triggers.includes('on-import') || !rule.triggers.includes('manual-run')) {
    return false;
  }

  if (rule.conditions.length === 0) {
    return false;
  }

  return rule.conditions.every((condition) => {
    return condition.field === 'description'
      && condition.operator === 'contains'
      && typeof condition.value === 'string'
      && condition.value.trim().length > 0;
  });
}

export function upsertQuickCategoryContainsRule(options: {
  categoryId: string;
  categoryName?: string;
  keyword: string;
}): UpsertQuickCategoryRuleResult {
  const categoryId = options.categoryId.trim();
  const keyword = options.keyword.trim();

  if (!categoryId) {
    throw new Error('Category is required.');
  }
  if (!keyword) {
    throw new Error('Keyword is required.');
  }

  const existingRules = loadAutomationRules()
    .filter((rule) => isQuickCategoryRuleCandidate(rule, categoryId))
    .sort((leftRule, rightRule) => leftRule.createdAt.localeCompare(rightRule.createdAt));

  const candidateRule = existingRules[0];
  if (!candidateRule) {
    const categoryLabel = options.categoryName?.trim() || categoryId;
    const createdRule = addAutomationRule({
      name: `Auto category: ${categoryLabel}`,
      isEnabled: true,
      triggers: ['on-import', 'manual-run'],
      matchMode: 'any',
      conditions: [
        {
          id: createAutomationConditionId(),
          field: 'description',
          operator: 'contains',
          value: keyword,
        },
      ],
      action: {
        type: 'set-category',
        categoryId,
      },
      applyToUncategorizedOnly: true,
    });

    return {
      rule: createdRule,
      created: true,
      conditionAdded: true,
    };
  }

  const normalizedKeyword = keyword.toLowerCase();
  const hasExistingKeyword = candidateRule.conditions.some((condition) => {
    return condition.operator === 'contains'
      && condition.field === 'description'
      && (condition.value ?? '').trim().toLowerCase() === normalizedKeyword;
  });

  if (hasExistingKeyword) {
    return {
      rule: candidateRule,
      created: false,
      conditionAdded: false,
    };
  }

  const updatedRule = updateAutomationRule(candidateRule.id, {
    isEnabled: true,
    triggers: Array.from(new Set([...candidateRule.triggers, 'on-import', 'manual-run'])),
    matchMode: 'any',
    applyToUncategorizedOnly: true,
    conditions: [
      ...candidateRule.conditions,
      {
        id: createAutomationConditionId(),
        field: 'description',
        operator: 'contains',
        value: keyword,
      },
    ],
  });

  if (!updatedRule) {
    throw new Error('Failed to update existing automation rule.');
  }

  return {
    rule: updatedRule,
    created: false,
    conditionAdded: true,
  };
}
