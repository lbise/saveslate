import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionItem } from '../../src/components/ui/TransactionItem';
import { SettingsProvider } from '../../src/context';

import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
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
      { wrapper: Wrapper },
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
      { wrapper: Wrapper },
    );

    const amountElement = screen.getByText((text) => text.includes('987'));
    expect(amountElement).toHaveClass('text-expense');
  });
});
