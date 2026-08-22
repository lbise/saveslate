import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RuleFormModal } from '../../src/components/rules/RuleFormModal';
import type { RuleFormState } from '../../src/lib/rule-utils';
import type { AutomationConditionOperator } from '../../src/types';

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('../../src/hooks/api', () => ({
  useAccounts: () => ({ data: [] }),
  useGoals: () => ({ data: [] }),
  useTransactions: () => ({ data: { items: [] } }),
  useImportBatches: () => ({ data: [] }),
}));

function createInitialForm(
  operator: AutomationConditionOperator = 'contains',
): RuleFormState {
  return {
    name: 'Case-sensitive groceries',
    isEnabled: true,
    triggers: ['on-import'],
    matchMode: 'all',
    actions: [
      {
        id: 'action-1',
        type: 'set-category',
        categoryId: 'cat-1',
        goalId: '',
        overwriteExisting: false,
      },
    ],
    conditions: [
      {
        id: 'condition-1',
        field: 'description',
        operator,
        value: 'Grocery',
        caseSensitive: false,
      },
    ],
  };
}

describe('RuleFormModal', () => {
  it.each([
    'equals',
    'not-equals',
    'contains',
    'not-contains',
    'starts-with',
    'ends-with',
    'regex',
    'not-regex',
  ] as AutomationConditionOperator[])(
    'offers case sensitivity for the %s operator',
    (operator) => {
      render(
        <RuleFormModal
          editingRuleId={null}
          initialForm={createInitialForm(operator)}
          defaultCategoryId="cat-1"
          categories={[{ id: 'cat-1', name: 'Groceries', icon: 'ShoppingCart' }]}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      expect(screen.getByRole('checkbox', { name: 'Case sensitive' })).toBeInTheDocument();
    },
  );

  it('saves case sensitivity for a string condition', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <RuleFormModal
        editingRuleId={null}
        initialForm={createInitialForm()}
        defaultCategoryId="cat-1"
        categories={[{ id: 'cat-1', name: 'Groceries', icon: 'ShoppingCart' }]}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Case sensitive' }));
    await user.click(screen.getByRole('button', { name: 'Create Rule' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: [
          expect.objectContaining({
            caseSensitive: true,
          }),
        ],
      }),
    );
  });
});
