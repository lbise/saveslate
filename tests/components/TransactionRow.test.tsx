import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { TransactionRow } from '../../src/components/transactions/TransactionRow';

import type { ReactNode } from 'react';
import type { TransactionWithDetails, User } from '../../src/types';

vi.mock('../../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  const user: User = {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    defaultCurrency: 'CHF',
  };

  queryClient.setQueryData(['auth', 'user'], user);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createDesktopMatchMedia() {
  return vi.fn().mockImplementation(() => ({
    matches: true,
    media: '(min-width: 1024px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function createTransaction(): TransactionWithDetails {
  return {
    id: 'tx-1',
    amount: -12.5,
    currency: 'CHF',
    categoryId: 'cat-1',
    description: 'Menu bug transaction',
    date: '2026-03-13',
    accountId: 'account-1',
    type: 'expense',
    category: {
      id: 'cat-1',
      name: 'Groceries',
      icon: 'ShoppingCart',
    },
    account: {
      id: 'account-1',
      name: 'Checking',
      type: 'checking',
      balance: 1000,
      currency: 'CHF',
      icon: 'Wallet',
    },
  };
}

describe('TransactionRow', () => {
  it('renders only one action menu for the active desktop layout', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createDesktopMatchMedia();

    try {
      render(
        <TransactionRow
          transaction={createTransaction()}
          openCategoryUpward={false}
          isActionOpen
          isEditingCategory={false}
          isEditingGoal={false}
          isEditingTags={false}
          availableTags={[]}
          availableTagsById={new Map()}
          tagUsageCountById={new Map()}
          onToggleAction={vi.fn()}
          onCloseAction={vi.fn()}
          onToggleEditCategory={vi.fn()}
          onToggleEditGoal={vi.fn()}
          onToggleEditTags={vi.fn()}
          onCloseCategory={vi.fn()}
          onCloseGoal={vi.fn()}
          onCloseTags={vi.fn()}
          onCategoryChange={vi.fn()}
          onGoalChange={vi.fn()}
          onTagsChange={vi.fn()}
          onCreateTag={vi.fn()}
          onUpdateTag={vi.fn()}
          onDeleteTag={vi.fn()}
          onCreateRule={vi.fn()}
          onAction={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getAllByRole('menu')).toHaveLength(1);
      });
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
