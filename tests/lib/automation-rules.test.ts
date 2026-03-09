import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  AUTOMATION_RULES_EXPORT_SCHEMA_VERSION,
  AUTOMATION_TRIGGER_OPTIONS,
  AUTOMATION_OPERATOR_OPTIONS,
  automationOperatorNeedsValue,
  createAutomationConditionId,
  createUniqueAutomationRuleId,
  saveAutomationRules,
  loadAutomationRules,
  addAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  parseAutomationRulesFile,
  mergeAutomationRules,
  applyAutomationRules,
  upsertQuickCategoryContainsRule,
} from '../../src/lib/automation-rules';
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationMatchMode,
  AutomationRule,
  AutomationTrigger,
  Transaction,
} from '../../src/types';

const STORAGE_KEY = 'saveslate:automation-rules';
const UNCATEGORIZED = 'uncategorized';

// ── Helpers ──────────────────────────────────────────────────────

function makeCondition(overrides: Partial<AutomationCondition> = {}): AutomationCondition {
  return {
    id: 'cond-1',
    field: 'description',
    operator: 'contains',
    value: 'test',
    ...overrides,
  };
}

function makeAction(overrides: Partial<AutomationAction> = {}): AutomationAction {
  return {
    type: 'set-category',
    categoryId: 'cat-food',
    overwriteExisting: false,
    ...overrides,
  } as AutomationAction;
}

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    isEnabled: true,
    triggers: ['on-import'] as AutomationTrigger[],
    matchMode: 'all' as AutomationMatchMode,
    conditions: [makeCondition()],
    actions: [makeAction()],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amount: -50,
    currency: 'CHF',
    categoryId: UNCATEGORIZED,
    description: 'Grocery store test purchase',
    date: '2025-03-01',
    accountId: 'acc-1',
    ...overrides,
  };
}

function storeRules(rules: AutomationRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// ── Constants ────────────────────────────────────────────────────

describe('constants', () => {
  it('exports AUTOMATION_RULES_EXPORT_SCHEMA_VERSION as 1', () => {
    expect(AUTOMATION_RULES_EXPORT_SCHEMA_VERSION).toBe(1);
  });

  it('exports AUTOMATION_TRIGGER_OPTIONS with expected triggers', () => {
    const values = AUTOMATION_TRIGGER_OPTIONS.map((o) => o.value);
    expect(values).toContain('on-import');
    expect(values).toContain('manual-run');
    expect(values).toContain('on-create');
  });

  it('exports AUTOMATION_OPERATOR_OPTIONS with all operators', () => {
    const values = AUTOMATION_OPERATOR_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'equals', 'not-equals', 'contains', 'not-contains',
      'starts-with', 'ends-with', 'regex', 'not-regex',
      'gt', 'gte', 'lt', 'lte', 'exists', 'not-exists',
    ]);
  });
});

// ── automationOperatorNeedsValue ─────────────────────────────────

describe('automationOperatorNeedsValue', () => {
  it('returns false for exists', () => {
    expect(automationOperatorNeedsValue('exists')).toBe(false);
  });

  it('returns false for not-exists', () => {
    expect(automationOperatorNeedsValue('not-exists')).toBe(false);
  });

  it.each([
    'equals', 'not-equals', 'contains', 'not-contains',
    'starts-with', 'ends-with', 'regex', 'not-regex',
    'gt', 'gte', 'lt', 'lte',
  ] as AutomationConditionOperator[])('returns true for %s', (op) => {
    expect(automationOperatorNeedsValue(op)).toBe(true);
  });
});

// ── createAutomationConditionId ──────────────────────────────────

describe('createAutomationConditionId', () => {
  it('returns a string starting with "condition-"', () => {
    const id = createAutomationConditionId();
    expect(id).toMatch(/^condition-/);
  });

  it('returns unique ids on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createAutomationConditionId()));
    expect(ids.size).toBe(50);
  });
});

// ── createUniqueAutomationRuleId ─────────────────────────────────

describe('createUniqueAutomationRuleId', () => {
  it('returns a string starting with "rule-"', () => {
    const id = createUniqueAutomationRuleId(new Set());
    expect(id).toMatch(/^rule-/);
  });

  it('avoids collisions with existing ids', () => {
    // Pre-populate with many IDs to stress the collision avoidance.
    // We can't truly control Math.random, but we can verify the contract.
    const existing = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const id = createUniqueAutomationRuleId(existing);
      expect(existing.has(id)).toBe(false);
      existing.add(id);
    }
    expect(existing.size).toBe(20);
  });
});

// ── saveAutomationRules / loadAutomationRules ────────────────────

describe('saveAutomationRules', () => {
  it('persists rules to localStorage', () => {
    const rules = [makeRule()];
    saveAutomationRules(rules);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('rule-1');
  });
});

describe('loadAutomationRules', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(loadAutomationRules()).toEqual([]);
  });

  it('returns empty array on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    expect(loadAutomationRules()).toEqual([]);
  });

  it('returns empty array on non-array JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{"foo": "bar"}');
    expect(loadAutomationRules()).toEqual([]);
  });

  it('loads and normalizes valid rules', () => {
    storeRules([makeRule()]);
    const rules = loadAutomationRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule-1');
    expect(rules[0].name).toBe('Test Rule');
  });

  it('filters out invalid rules (missing id)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule(),
      { ...makeRule({ id: '' }), name: 'no-id' },
    ]));
    const rules = loadAutomationRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule-1');
  });

  it('filters out invalid rules (missing name)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule({ name: '' }),
    ]));
    expect(loadAutomationRules()).toEqual([]);
  });

  it('filters out invalid rules (no triggers)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule({ triggers: [] }),
    ]));
    expect(loadAutomationRules()).toEqual([]);
  });

  it('filters out invalid rules (no conditions)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule({ conditions: [] }),
    ]));
    expect(loadAutomationRules()).toEqual([]);
  });

  it('filters out invalid rules (no actions)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule({ actions: [] }),
    ]));
    expect(loadAutomationRules()).toEqual([]);
  });

  it('re-saves when some rules are filtered out', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      makeRule(),
      { ...makeRule({ id: 'rule-bad', name: '' }) },
    ]));
    loadAutomationRules();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('does not re-save when all rules are valid', () => {
    const original = JSON.stringify([makeRule()]);
    localStorage.setItem(STORAGE_KEY, original);
    loadAutomationRules();
    // The stored data should match the normalized version (same length), not be rewritten unnecessarily
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('defaults isEnabled to true when not explicitly false', () => {
    const raw = { ...makeRule() } as Record<string, unknown>;
    delete raw.isEnabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([raw]));
    const rules = loadAutomationRules();
    expect(rules[0].isEnabled).toBe(true);
  });

  it('defaults matchMode to all when missing', () => {
    const raw = { ...makeRule() } as Record<string, unknown>;
    delete raw.matchMode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([raw]));
    const rules = loadAutomationRules();
    expect(rules[0].matchMode).toBe('all');
  });
});

// ── addAutomationRule ────────────────────────────────────────────

describe('addAutomationRule', () => {
  it('adds a rule with generated id and timestamps', () => {
    const rule = addAutomationRule({
      name: 'New Rule',
      isEnabled: true,
      triggers: ['on-import'],
      matchMode: 'all',
      conditions: [makeCondition()],
      actions: [makeAction()],
    });

    expect(rule.id).toMatch(/^rule-/);
    expect(rule.name).toBe('New Rule');
    expect(rule.createdAt).toBeTruthy();
    expect(rule.updatedAt).toBe(rule.createdAt);
  });

  it('persists to localStorage', () => {
    addAutomationRule({
      name: 'Persisted Rule',
      isEnabled: true,
      triggers: ['manual-run'],
      matchMode: 'all',
      conditions: [makeCondition()],
      actions: [makeAction()],
    });

    const stored = loadAutomationRules();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Persisted Rule');
  });

  it('appends to existing rules', () => {
    storeRules([makeRule()]);
    addAutomationRule({
      name: 'Second Rule',
      isEnabled: true,
      triggers: ['on-import'],
      matchMode: 'all',
      conditions: [makeCondition()],
      actions: [makeAction()],
    });

    const stored = loadAutomationRules();
    expect(stored).toHaveLength(2);
  });
});

// ── updateAutomationRule ─────────────────────────────────────────

describe('updateAutomationRule', () => {
  beforeEach(() => {
    storeRules([makeRule({ id: 'rule-upd', name: 'Original', createdAt: '2025-01-01T00:00:00.000Z' })]);
  });

  it('updates an existing rule', () => {
    const result = updateAutomationRule('rule-upd', { name: 'Updated' });
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Updated');
  });

  it('returns null for non-existent id', () => {
    const result = updateAutomationRule('non-existent', { name: 'Nope' });
    expect(result).toBeNull();
  });

  it('preserves id and createdAt', () => {
    const result = updateAutomationRule('rule-upd', { name: 'Changed' });
    expect(result!.id).toBe('rule-upd');
    expect(result!.createdAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('updates updatedAt timestamp', () => {
    const result = updateAutomationRule('rule-upd', { name: 'Changed' });
    expect(result!.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
  });

  it('persists the update to localStorage', () => {
    updateAutomationRule('rule-upd', { name: 'Persisted Update' });
    const loaded = loadAutomationRules();
    expect(loaded[0].name).toBe('Persisted Update');
  });
});

// ── deleteAutomationRule ─────────────────────────────────────────

describe('deleteAutomationRule', () => {
  it('removes the rule and returns true', () => {
    storeRules([makeRule({ id: 'rule-del' })]);
    const result = deleteAutomationRule('rule-del');
    expect(result).toBe(true);
    expect(loadAutomationRules()).toHaveLength(0);
  });

  it('returns false if rule not found', () => {
    storeRules([makeRule({ id: 'rule-keep' })]);
    const result = deleteAutomationRule('non-existent');
    expect(result).toBe(false);
    expect(loadAutomationRules()).toHaveLength(1);
  });
});

// ── parseAutomationRulesFile ─────────────────────────────────────

describe('parseAutomationRulesFile', () => {
  it('parses valid JSON array of rules', () => {
    const rules = parseAutomationRulesFile(JSON.stringify([makeRule()]));
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule-1');
  });

  it('parses valid JSON object with rules array and schemaVersion', () => {
    const content = {
      schemaVersion: AUTOMATION_RULES_EXPORT_SCHEMA_VERSION,
      rules: [makeRule()],
    };
    const rules = parseAutomationRulesFile(JSON.stringify(content));
    expect(rules).toHaveLength(1);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAutomationRulesFile('not-json{{')).toThrow('Invalid JSON file.');
  });

  it('throws on wrong schema version', () => {
    const content = { schemaVersion: 999, rules: [makeRule()] };
    expect(() => parseAutomationRulesFile(JSON.stringify(content))).toThrow('Unsupported rules file version.');
  });

  it('throws on missing rules array in object', () => {
    const content = { schemaVersion: 1 };
    expect(() => parseAutomationRulesFile(JSON.stringify(content))).toThrow('Rules file is missing a rules array.');
  });

  it('throws when no valid rules found', () => {
    const content = [{ id: 'bad', name: '' }];
    expect(() => parseAutomationRulesFile(JSON.stringify(content))).toThrow('No valid rules found in file.');
  });

  it('throws on non-object/non-array JSON', () => {
    expect(() => parseAutomationRulesFile('"just a string"')).toThrow('Invalid rules file format.');
  });
});

// ── mergeAutomationRules ─────────────────────────────────────────

describe('mergeAutomationRules', () => {
  it('merges incoming rules with existing, preserving existing', () => {
    storeRules([makeRule({ id: 'existing-1', name: 'Existing' })]);
    const incoming = [makeRule({ id: 'incoming-1', name: 'Incoming' })];
    const merged = mergeAutomationRules(incoming);

    expect(merged).toHaveLength(2);
    expect(merged[0].name).toBe('Existing');
    expect(merged[1].name).toBe('Incoming');
  });

  it('generates new ids for conflicting ids', () => {
    storeRules([makeRule({ id: 'conflict-id' })]);
    const incoming = [makeRule({ id: 'conflict-id', name: 'Incoming Conflict' })];
    const merged = mergeAutomationRules(incoming);

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('conflict-id');
    expect(merged[1].id).not.toBe('conflict-id');
    expect(merged[1].id).toMatch(/^rule-/);
  });

  it('persists merged rules to localStorage', () => {
    storeRules([makeRule({ id: 'e1' })]);
    mergeAutomationRules([makeRule({ id: 'i1', name: 'Incoming' })]);
    const stored = loadAutomationRules();
    expect(stored).toHaveLength(2);
  });

  it('keeps original id when there is no conflict', () => {
    const incoming = [makeRule({ id: 'unique-id', name: 'No Conflict' })];
    const merged = mergeAutomationRules(incoming);
    expect(merged[0].id).toBe('unique-id');
  });
});

// ── applyAutomationRules - condition evaluation ──────────────────

describe('applyAutomationRules - condition evaluation', () => {
  function makeMatchRule(
    condition: Partial<AutomationCondition>,
    action?: Partial<AutomationAction>,
  ): AutomationRule {
    return makeRule({
      conditions: [makeCondition(condition)],
      actions: [makeAction(action)],
    });
  }

  function runSingleRule(
    rule: AutomationRule,
    transaction: Transaction,
    trigger: AutomationTrigger = 'on-import',
  ) {
    return applyAutomationRules([transaction], [rule], trigger);
  }

  describe('equals operator', () => {
    it('matches case-insensitive string', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'equals', value: 'GROCERY STORE TEST PURCHASE' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match different string', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'equals', value: 'Something else' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('matches numeric values', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'equals', value: '-50' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });
  });

  describe('not-equals operator', () => {
    it('matches when strings differ', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-equals', value: 'Other' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when strings are equal (case-insensitive)', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-equals', value: 'Grocery store test purchase' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('works with numeric values', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'not-equals', value: '-100' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });
  });

  describe('contains operator', () => {
    it('matches substring case-insensitively', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'contains', value: 'grocery' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match absent substring', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'contains', value: 'pharmacy' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('returns no match when expected value is empty', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'contains', value: '' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('not-contains operator', () => {
    it('matches when substring is absent', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-contains', value: 'pharmacy' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when substring is present', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-contains', value: 'grocery' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('starts-with operator', () => {
    it('matches prefix case-insensitively', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'starts-with', value: 'grocery' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match non-prefix', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'starts-with', value: 'store' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('ends-with operator', () => {
    it('matches suffix case-insensitively', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'ends-with', value: 'purchase' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match non-suffix', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'ends-with', value: 'grocery' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('regex operator', () => {
    it('matches regex pattern', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'regex', value: 'groc.*purchase' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match non-matching regex', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'regex', value: '^pharmacy' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('returns false on invalid regex', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'regex', value: '[invalid' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('returns false on empty pattern', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'regex', value: '' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('not-regex operator', () => {
    it('matches when regex does not match', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-regex', value: '^pharmacy' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when regex matches', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-regex', value: 'grocery' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });

    it('returns false on invalid regex', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-regex', value: '[invalid' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('gt operator', () => {
    it('matches when field value is greater', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'gt', value: '-100' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when equal', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'gt', value: '-50' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(0);
    });

    it('does not match when less', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'gt', value: '0' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('gte operator', () => {
    it('matches when equal', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'gte', value: '-50' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });

    it('matches when greater', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'gte', value: '-100' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });
  });

  describe('lt operator', () => {
    it('matches when field value is less', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'lt', value: '0' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when equal', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'lt', value: '-50' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('lte operator', () => {
    it('matches when equal', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'lte', value: '-50' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });

    it('matches when less', () => {
      const rule = makeMatchRule({ field: 'amount', operator: 'lte', value: '0' });
      const result = runSingleRule(rule, makeTransaction({ amount: -50 }));
      expect(result.matchedCount).toBe(1);
    });
  });

  describe('exists operator', () => {
    it('matches when field has a value', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'exists' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when field is empty', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'exists' });
      const result = runSingleRule(rule, makeTransaction({ description: '' }));
      expect(result.matchedCount).toBe(0);
    });

    it('does not match when field is undefined', () => {
      const rule = makeMatchRule({ field: 'goalId', operator: 'exists' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('not-exists operator', () => {
    it('matches when field is empty or undefined', () => {
      const rule = makeMatchRule({ field: 'goalId', operator: 'not-exists' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(1);
    });

    it('does not match when field has a value', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'not-exists' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('numeric comparison with non-numeric values', () => {
    it('returns false when values are not parseable as numbers', () => {
      const rule = makeMatchRule({ field: 'description', operator: 'gt', value: 'abc' });
      const result = runSingleRule(rule, makeTransaction());
      expect(result.matchedCount).toBe(0);
    });
  });
});

// ── applyAutomationRules - match modes ───────────────────────────

describe('applyAutomationRules - match modes', () => {
  it('all mode - matches when all conditions match', () => {
    const rule = makeRule({
      matchMode: 'all',
      conditions: [
        makeCondition({ field: 'description', operator: 'contains', value: 'grocery' }),
        makeCondition({ id: 'cond-2', field: 'currency', operator: 'equals', value: 'CHF' }),
      ],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(1);
  });

  it('all mode - does not match when one condition fails', () => {
    const rule = makeRule({
      matchMode: 'all',
      conditions: [
        makeCondition({ field: 'description', operator: 'contains', value: 'grocery' }),
        makeCondition({ id: 'cond-2', field: 'currency', operator: 'equals', value: 'EUR' }),
      ],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(0);
  });

  it('any mode - matches when at least one condition matches', () => {
    const rule = makeRule({
      matchMode: 'any',
      conditions: [
        makeCondition({ field: 'description', operator: 'contains', value: 'pharmacy' }),
        makeCondition({ id: 'cond-2', field: 'currency', operator: 'equals', value: 'CHF' }),
      ],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(1);
  });

  it('any mode - does not match when no conditions match', () => {
    const rule = makeRule({
      matchMode: 'any',
      conditions: [
        makeCondition({ field: 'description', operator: 'contains', value: 'pharmacy' }),
        makeCondition({ id: 'cond-2', field: 'currency', operator: 'equals', value: 'EUR' }),
      ],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(0);
  });
});

// ── applyAutomationRules - field resolution ──────────────────────

describe('applyAutomationRules - field resolution', () => {
  function matchField(field: string, operator: AutomationConditionOperator, value: string, tx: Transaction) {
    const rule = makeRule({
      conditions: [makeCondition({ field, operator, value })],
    });
    return applyAutomationRules([tx], [rule], 'on-import');
  }

  it('resolves standard fields: description', () => {
    const result = matchField('description', 'contains', 'grocery', makeTransaction());
    expect(result.matchedCount).toBe(1);
  });

  it('resolves standard fields: amount', () => {
    const result = matchField('amount', 'equals', '-50', makeTransaction({ amount: -50 }));
    expect(result.matchedCount).toBe(1);
  });

  it('resolves standard fields: currency', () => {
    const result = matchField('currency', 'equals', 'CHF', makeTransaction());
    expect(result.matchedCount).toBe(1);
  });

  it('resolves standard fields: date', () => {
    const result = matchField('date', 'equals', '2025-03-01', makeTransaction());
    expect(result.matchedCount).toBe(1);
  });

  it('resolves standard fields: accountId', () => {
    const result = matchField('accountId', 'equals', 'acc-1', makeTransaction());
    expect(result.matchedCount).toBe(1);
  });

  it('resolves standard fields: categoryId', () => {
    const result = matchField('categoryId', 'equals', UNCATEGORIZED, makeTransaction());
    expect(result.matchedCount).toBe(1);
  });

  it('resolves type field - expense for negative amount', () => {
    const result = matchField('type', 'equals', 'expense', makeTransaction({ amount: -50 }));
    expect(result.matchedCount).toBe(1);
  });

  it('resolves type field - income for positive amount', () => {
    const result = matchField('type', 'equals', 'income', makeTransaction({ amount: 100 }));
    expect(result.matchedCount).toBe(1);
  });

  it('resolves type field - transfer when transferPairId is set', () => {
    const result = matchField('type', 'equals', 'transfer', makeTransaction({ amount: -50, transferPairId: 'pair-1' }));
    expect(result.matchedCount).toBe(1);
  });

  it('resolves metadata.* fields from transaction.metadata array', () => {
    const tx = makeTransaction({
      metadata: [{ key: 'merchant', value: 'Coop', source: 'import' }],
    });
    const result = matchField('metadata.merchant', 'equals', 'Coop', tx);
    expect(result.matchedCount).toBe(1);
  });

  it('resolves metadata.* fields case-insensitively on key', () => {
    const tx = makeTransaction({
      metadata: [{ key: 'Merchant', value: 'Coop', source: 'import' }],
    });
    const result = matchField('metadata.merchant', 'equals', 'Coop', tx);
    expect(result.matchedCount).toBe(1);
  });

  it('returns undefined for missing metadata key', () => {
    const tx = makeTransaction({ metadata: [] });
    const result = matchField('metadata.missing', 'exists', '', tx);
    expect(result.matchedCount).toBe(0);
  });

  it('resolves raw.* fields from transaction.rawData object', () => {
    const tx = makeTransaction({
      rawData: { 'Description': 'Raw description' },
    });
    const result = matchField('raw.Description', 'contains', 'Raw', tx);
    expect(result.matchedCount).toBe(1);
  });

  it('resolves raw.* fields case-insensitively on key', () => {
    const tx = makeTransaction({
      rawData: { 'Description': 'Raw description' },
    });
    const result = matchField('raw.description', 'contains', 'Raw', tx);
    expect(result.matchedCount).toBe(1);
  });

  it('returns undefined for missing raw key', () => {
    const tx = makeTransaction({ rawData: {} });
    const result = matchField('raw.missing', 'exists', '', tx);
    expect(result.matchedCount).toBe(0);
  });
});

// ── applyAutomationRules - actions ───────────────────────────────

describe('applyAutomationRules - actions', () => {
  it('set-category action sets categoryId', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: true }],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-food');
    expect(result.changedCount).toBe(1);
  });

  it('set-category without overwriteExisting skips already-categorized transactions', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: false }],
    });
    const tx = makeTransaction({ categoryId: 'cat-existing' });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-existing');
    expect(result.changedCount).toBe(0);
  });

  it('set-category without overwriteExisting applies to uncategorized transactions', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: false }],
    });
    const tx = makeTransaction({ categoryId: UNCATEGORIZED });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-food');
    expect(result.changedCount).toBe(1);
  });

  it('set-category with overwriteExisting overwrites existing category', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-new', overwriteExisting: true }],
    });
    const tx = makeTransaction({ categoryId: 'cat-old' });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-new');
  });

  it('set-category does not count as changed when category is already the target', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: true }],
    });
    const tx = makeTransaction({ categoryId: 'cat-food' });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.changedCount).toBe(0);
    expect(result.matchedCount).toBe(1);
  });

  it('set-goal action sets goalId', () => {
    const rule = makeRule({
      actions: [{ type: 'set-goal', goalId: 'goal-1', overwriteExisting: false } as AutomationAction],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.transactions[0].goalId).toBe('goal-1');
    expect(result.changedCount).toBe(1);
  });

  it('set-goal without overwriteExisting skips transactions with existing goalId', () => {
    const rule = makeRule({
      actions: [{ type: 'set-goal', goalId: 'goal-new', overwriteExisting: false } as AutomationAction],
    });
    const tx = makeTransaction({ goalId: 'goal-existing' });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.transactions[0].goalId).toBe('goal-existing');
    expect(result.changedCount).toBe(0);
  });

  it('set-goal with overwriteExisting overwrites existing goalId', () => {
    const rule = makeRule({
      actions: [{ type: 'set-goal', goalId: 'goal-new', overwriteExisting: true } as AutomationAction],
    });
    const tx = makeTransaction({ goalId: 'goal-old' });
    const result = applyAutomationRules([tx], [rule], 'on-import');
    expect(result.transactions[0].goalId).toBe('goal-new');
    expect(result.changedCount).toBe(1);
  });

  it('applies multiple actions from the same rule', () => {
    const rule = makeRule({
      actions: [
        { type: 'set-category', categoryId: 'cat-food', overwriteExisting: true },
        { type: 'set-goal', goalId: 'goal-savings', overwriteExisting: false } as AutomationAction,
      ],
    });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-food');
    expect(result.transactions[0].goalId).toBe('goal-savings');
    expect(result.changedCount).toBe(2);
  });
});

// ── applyAutomationRules - rule filtering/ordering ───────────────

describe('applyAutomationRules - rule filtering and ordering', () => {
  it('only applies enabled rules', () => {
    const rule = makeRule({ isEnabled: false });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(0);
  });

  it('only applies rules matching the trigger', () => {
    const rule = makeRule({ triggers: ['manual-run'] });
    const result = applyAutomationRules([makeTransaction()], [rule], 'on-import');
    expect(result.matchedCount).toBe(0);
  });

  it('applies rules matching the trigger', () => {
    const rule = makeRule({ triggers: ['manual-run'] });
    const result = applyAutomationRules([makeTransaction()], [rule], 'manual-run');
    expect(result.matchedCount).toBe(1);
  });

  it('applies first matching rule only (break after match)', () => {
    const rule1 = makeRule({
      id: 'rule-first',
      name: 'First',
      createdAt: '2025-01-01T00:00:00.000Z',
      actions: [{ type: 'set-category', categoryId: 'cat-first', overwriteExisting: true }],
    });
    const rule2 = makeRule({
      id: 'rule-second',
      name: 'Second',
      createdAt: '2025-01-02T00:00:00.000Z',
      actions: [{ type: 'set-category', categoryId: 'cat-second', overwriteExisting: true }],
    });
    const result = applyAutomationRules([makeTransaction()], [rule1, rule2], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-first');
    expect(result.ruleStats[0].matchedCount).toBe(1);
    expect(result.ruleStats[1].matchedCount).toBe(0);
  });

  it('sorts rules by createdAt (earlier rule runs first)', () => {
    const laterRule = makeRule({
      id: 'rule-later',
      name: 'Later',
      createdAt: '2025-06-01T00:00:00.000Z',
      actions: [{ type: 'set-category', categoryId: 'cat-later', overwriteExisting: true }],
    });
    const earlierRule = makeRule({
      id: 'rule-earlier',
      name: 'Earlier',
      createdAt: '2025-01-01T00:00:00.000Z',
      actions: [{ type: 'set-category', categoryId: 'cat-earlier', overwriteExisting: true }],
    });
    // Pass later rule first in array to verify sorting
    const result = applyAutomationRules([makeTransaction()], [laterRule, earlierRule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-earlier');
  });

  it('returns correct evaluatedCount', () => {
    const txs = [makeTransaction({ id: 'tx-1' }), makeTransaction({ id: 'tx-2' })];
    const result = applyAutomationRules(txs, [], 'on-import');
    expect(result.evaluatedCount).toBe(2);
  });

  it('returns empty ruleStats when no active rules', () => {
    const result = applyAutomationRules([makeTransaction()], [], 'on-import');
    expect(result.ruleStats).toEqual([]);
  });

  it('returns ruleStats with correct counts', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: true }],
    });
    const txs = [
      makeTransaction({ id: 'tx-1', description: 'Grocery store test purchase' }),
      makeTransaction({ id: 'tx-2', description: 'No match here' }),
    ];
    const result = applyAutomationRules(txs, [rule], 'on-import');
    expect(result.ruleStats[0].matchedCount).toBe(1);
    expect(result.ruleStats[0].changedCount).toBe(1);
  });

  it('does not mutate the original transactions array', () => {
    const rule = makeRule({
      actions: [{ type: 'set-category', categoryId: 'cat-food', overwriteExisting: true }],
    });
    const originalTx = makeTransaction();
    const txs = [originalTx];
    const result = applyAutomationRules(txs, [rule], 'on-import');
    expect(result.transactions[0].categoryId).toBe('cat-food');
    expect(originalTx.categoryId).toBe(UNCATEGORIZED);
  });
});

// ── upsertQuickCategoryContainsRule ──────────────────────────────

describe('upsertQuickCategoryContainsRule', () => {
  it('creates new rule when none exists', () => {
    const result = upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      categoryName: 'Food',
      keyword: 'grocery',
    });

    expect(result.created).toBe(true);
    expect(result.conditionAdded).toBe(true);
    expect(result.rule.name).toBe('Auto category: Food');
    expect(result.rule.matchMode).toBe('any');
    expect(result.rule.triggers).toContain('on-import');
    expect(result.rule.triggers).toContain('manual-run');
    expect(result.rule.conditions).toHaveLength(1);
    expect(result.rule.conditions[0].value).toBe('grocery');
    expect(result.rule.actions[0].type).toBe('set-category');
    if (result.rule.actions[0].type === 'set-category') {
      expect(result.rule.actions[0].categoryId).toBe('cat-food');
    }
  });

  it('uses categoryId as label when categoryName is not provided', () => {
    const result = upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: 'grocery',
    });
    expect(result.rule.name).toBe('Auto category: cat-food');
  });

  it('adds condition to existing matching rule', () => {
    // Create initial rule
    upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      categoryName: 'Food',
      keyword: 'grocery',
    });

    // Add another keyword
    const result = upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      categoryName: 'Food',
      keyword: 'supermarket',
    });

    expect(result.created).toBe(false);
    expect(result.conditionAdded).toBe(true);
    expect(result.rule.conditions).toHaveLength(2);
    expect(result.rule.conditions[1].value).toBe('supermarket');
  });

  it('returns conditionAdded: false when keyword already exists', () => {
    upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      categoryName: 'Food',
      keyword: 'grocery',
    });

    const result = upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      categoryName: 'Food',
      keyword: 'grocery',
    });

    expect(result.created).toBe(false);
    expect(result.conditionAdded).toBe(false);
  });

  it('deduplicates keywords case-insensitively', () => {
    upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: 'Grocery',
    });

    const result = upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: 'GROCERY',
    });

    expect(result.conditionAdded).toBe(false);
  });

  it('throws when categoryId is empty', () => {
    expect(() => upsertQuickCategoryContainsRule({
      categoryId: '',
      keyword: 'test',
    })).toThrow('Category is required.');
  });

  it('throws when keyword is empty', () => {
    expect(() => upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: '',
    })).toThrow('Keyword is required.');
  });

  it('throws when categoryId is whitespace-only', () => {
    expect(() => upsertQuickCategoryContainsRule({
      categoryId: '   ',
      keyword: 'test',
    })).toThrow('Category is required.');
  });

  it('throws when keyword is whitespace-only', () => {
    expect(() => upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: '   ',
    })).toThrow('Keyword is required.');
  });

  it('persists the created rule to localStorage', () => {
    upsertQuickCategoryContainsRule({
      categoryId: 'cat-food',
      keyword: 'grocery',
    });
    const stored = loadAutomationRules();
    expect(stored).toHaveLength(1);
  });
});
