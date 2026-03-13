import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Transactions } from '../../src/pages/Transactions';

import type { ReactNode } from 'react';

const createAutomationRuleMutate = vi.fn();
const updateAutomationRuleMutate = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../src/components/layout', () => ({
  PageHeader: ({ title, children }: { title: string; children?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  PageHeaderActions: () => <div data-testid="page-actions" />,
  TransactionsSkeleton: () => <div>Loading transactions...</div>,
  QueryError: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('../../src/components/transactions', () => ({
  TransactionFormModal: () => null,
  TransactionRow: ({
    transaction,
    onCreateRule,
  }: {
    transaction: { description: string };
    onCreateRule: () => void;
  }) => (
    <button type="button" onClick={onCreateRule}>
      Create rule for {transaction.description}
    </button>
  ),
}));

vi.mock('../../src/components/ui', () => ({
  DeleteConfirmationModal: () => null,
  MultiSelectDropdown: () => null,
  PaginationButtons: () => null,
}));

vi.mock('../../src/components/rules', () => ({
  RuleFormModal: ({
    initialForm,
    onClose,
    onSave,
  }: {
    initialForm: { name: string };
    onClose: () => void;
    onSave: (ruleData: {
      name: string;
      isEnabled: boolean;
      triggers: ['on-import'];
      matchMode: 'all';
      conditions: [{ id: string; field: 'description'; operator: 'contains'; value: string }];
      actions: [{ type: 'set-category'; categoryId: string; overwriteExisting: false }];
    }) => void;
  }) => (
    <div>
      <p>Create rule modal</p>
      <p data-testid="rule-name">{initialForm.name}</p>
      <button
        type="button"
        onClick={() =>
          onSave({
            name: initialForm.name,
            isEnabled: true,
            triggers: ['on-import'],
            matchMode: 'all',
            conditions: [
              {
                id: 'condition-1',
                field: 'description',
                operator: 'contains',
                value: 'Coffee shop',
              },
            ],
            actions: [
              {
                type: 'set-category',
                categoryId: 'cat-1',
                overwriteExisting: false,
              },
            ],
          })
        }
      >
        Save rule
      </button>
      <button type="button" onClick={onClose}>
        Cancel rule
      </button>
    </div>
  ),
}));

vi.mock('../../src/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../src/hooks')>(
    '../../src/hooks',
  );

  return {
    ...actual,
    useFormatCurrency: () => ({
      formatCurrency: (value: number) => `${value}`,
      formatSignedCurrency: (value: number) => `${value}`,
    }),
    useOnboarding: () => undefined,
  };
});

vi.mock('../../src/hooks/api', () => ({
  useAccounts: () => ({
    data: [
      {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        balance: 1000,
        currency: 'CHF',
        icon: 'Wallet',
      },
    ],
  }),
  useCategories: () => ({
    data: [
      {
        id: 'cat-1',
        name: 'Groceries',
        icon: 'ShoppingCart',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGoals: () => ({ data: [] }),
  useTransactions: () => ({
    data: {
      items: [
        {
          id: 'tx-1',
          amount: -12.5,
          currency: 'CHF',
          categoryId: 'cat-1',
          description: 'Coffee shop',
          date: '2026-03-14',
          accountId: 'account-1',
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateTransaction: () => ({ mutate: vi.fn() }),
  useUpdateTransaction: () => ({ mutate: vi.fn() }),
  useDeleteTransaction: () => ({ mutate: vi.fn() }),
  useTags: () => ({ data: [] }),
  useCreateTag: () => ({ mutateAsync: vi.fn() }),
  useUpdateTag: () => ({ mutateAsync: vi.fn() }),
  useDeleteTag: () => ({ mutateAsync: vi.fn() }),
  useImportBatches: () => ({ data: [] }),
  useUpdateImportBatch: () => ({ mutate: vi.fn() }),
  useDeleteImportBatch: () => ({ mutate: vi.fn() }),
  useAutomationRules: () => ({ data: [], isLoading: false, isError: false }),
  useCreateAutomationRule: () => ({ mutate: createAutomationRuleMutate }),
  useUpdateAutomationRule: () => ({ mutate: updateAutomationRuleMutate }),
}));

function LocationDisplay() {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}</div>;
}

describe('Transactions rule creation flow', () => {
  beforeEach(() => {
    createAutomationRuleMutate.mockReset();
    updateAutomationRuleMutate.mockReset();
    createAutomationRuleMutate.mockImplementation((_, options) => {
      options?.onSuccess?.();
    });
  });

  it('opens the rule modal in place and stays on transactions after save', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/transactions']}>
        <LocationDisplay />
        <Routes>
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/rules" element={<div>Rules route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/transactions');

    await user.click(screen.getByRole('button', { name: 'Create rule for Coffee shop' }));

    expect(screen.getByText('Create rule modal')).toBeInTheDocument();
    expect(screen.getByTestId('rule-name')).toHaveTextContent('Groceries');
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions');

    await user.click(screen.getByRole('button', { name: 'Save rule' }));

    expect(createAutomationRuleMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Create rule modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Rules route')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions');
  });
});
