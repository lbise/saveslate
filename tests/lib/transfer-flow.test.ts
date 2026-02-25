import { describe, expect, it } from 'vitest';
import { resolveTransferFlowAccounts } from '../../src/lib/utils';

describe('resolveTransferFlowAccounts', () => {
  it('uses explicit source role when provided', () => {
    const flow = resolveTransferFlowAccounts({
      amount: 120,
      accountName: 'Checking',
      counterpartyAccountName: 'Savings',
      transferPairRole: 'source',
    });

    expect(flow).toEqual({
      fromAccountName: 'Checking',
      toAccountName: 'Savings',
    });
  });

  it('uses explicit destination role when provided', () => {
    const flow = resolveTransferFlowAccounts({
      amount: -120,
      accountName: 'Savings',
      counterpartyAccountName: 'Checking',
      transferPairRole: 'destination',
    });

    expect(flow).toEqual({
      fromAccountName: 'Checking',
      toAccountName: 'Savings',
    });
  });

  it('falls back to amount sign when role is missing', () => {
    const outflow = resolveTransferFlowAccounts({
      amount: -100,
      accountName: 'Main',
      counterpartyAccountName: 'Cash',
    });

    const inflow = resolveTransferFlowAccounts({
      amount: 100,
      accountName: 'Cash',
      counterpartyAccountName: 'Main',
    });

    expect(outflow).toEqual({
      fromAccountName: 'Main',
      toAccountName: 'Cash',
    });
    expect(inflow).toEqual({
      fromAccountName: 'Main',
      toAccountName: 'Cash',
    });
  });
});
