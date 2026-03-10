import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TransactionItem } from '../../src/components/ui/TransactionItem';

import type { ReactNode } from 'react';
import type { User } from '../../src/types';

// Mock the api-client
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
    name: 'Test',
    email: 'test@test.com',
    defaultCurrency: 'CHF',
  };
  queryClient.setQueryData(['auth', 'user'], user);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('TransactionItem', () => {
  it('shows transfer direction based on transfer pair role', () => {
    render(
      <TransactionItem
        description="Move to savings"
        type="transfer"
        amount={200}
        currency="CHF"
        categoryName="Transfer"
        accountName="Savings"
        destinationAccountName="Checking"
        transferPairRole="destination"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText(/Checking.*Savings/)).toBeInTheDocument();
  });

  it('colors transfer amount by flow sign', () => {
    render(
      <TransactionItem
        description="ATM withdrawal"
        type="transfer"
        amount={-987}
        currency="CHF"
        categoryName="Cash Withdrawal"
        accountName="Checking"
        destinationAccountName="Cash"
        transferPairRole="source"
      />,
      { wrapper: createWrapper() },
    );

    const amountElement = screen.getByText((text) => text.includes('987'));
    expect(amountElement).toHaveClass('text-expense');
  });
});
