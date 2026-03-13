import { describe, expect, it } from 'vitest';

import { resolveRuleFormPrefill } from '../../src/lib/rule-utils';

import type { AutomationRule, AutomationRulePrefillDraft } from '../../src/types';

function createRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'rule-1',
    name: 'Groceries',
    isEnabled: true,
    triggers: ['on-import'],
    matchMode: 'all',
    conditions: [
      {
        id: 'condition-1',
        field: 'description',
        operator: 'contains',
        value: 'coffee',
      },
    ],
    actions: [
      {
        type: 'set-category',
        categoryId: 'cat-groceries',
        overwriteExisting: false,
      },
    ],
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    ...overrides,
  };
}

function createPrefill(
  overrides: Partial<AutomationRulePrefillDraft> = {},
): AutomationRulePrefillDraft {
  return {
    name: 'Groceries',
    categoryId: 'cat-groceries',
    isEnabled: true,
    triggers: ['on-import', 'manual-run'],
    matchMode: 'all',
    applyToUncategorizedOnly: true,
    conditions: [
      {
        field: 'description',
        operator: 'contains',
        value: 'market',
      },
    ],
    ...overrides,
  };
}

describe('resolveRuleFormPrefill', () => {
  it('creates a new form state when no merge target exists', () => {
    const result = resolveRuleFormPrefill({
      prefill: createPrefill({ mergeIntoExistingCategoryRule: false }),
      rules: [],
      defaultCategoryId: 'cat-fallback',
    });

    expect(result.editingRuleId).toBeNull();
    expect(result.initialForm.name).toBe('Groceries');
    expect(result.initialForm.conditions).toHaveLength(1);
    expect(result.initialForm.conditions[0].value).toBe('market');
    expect(result.initialForm.actions[0].type).toBe('set-category');
    expect(result.initialForm.actions[0].categoryId).toBe('cat-groceries');
  });

  it('reuses an existing category rule and appends a missing keyword', () => {
    const result = resolveRuleFormPrefill({
      prefill: createPrefill({ mergeIntoExistingCategoryRule: true }),
      rules: [createRule()],
      defaultCategoryId: 'cat-fallback',
    });

    expect(result.editingRuleId).toBe('rule-1');
    expect(result.initialForm.matchMode).toBe('any');
    expect(result.initialForm.conditions).toHaveLength(2);
    expect(
      result.initialForm.conditions.some(
        (condition) =>
          condition.field === 'description'
          && condition.operator === 'contains'
          && condition.value === 'market',
      ),
    ).toBe(true);
  });

  it('does not duplicate a keyword already covered by the target rule', () => {
    const result = resolveRuleFormPrefill({
      prefill: createPrefill({ mergeIntoExistingCategoryRule: true }),
      rules: [
        createRule({
          conditions: [
            {
              id: 'condition-1',
              field: 'description',
              operator: 'contains',
              value: 'Market',
            },
          ],
        }),
      ],
      defaultCategoryId: 'cat-fallback',
    });

    expect(result.editingRuleId).toBe('rule-1');
    expect(result.initialForm.matchMode).toBe('all');
    expect(result.initialForm.conditions).toHaveLength(1);
    expect(result.initialForm.conditions[0].value).toBe('Market');
  });
});
