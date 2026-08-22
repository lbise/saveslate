import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ParserMatcher } from '../../src/components/import/ParserMatcher';
import { api } from '../../src/lib/api-client';

import type { ReactNode } from 'react';
import type { CsvParser } from '../../src/types';

vi.mock('../../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const PARSER: CsvParser = {
  id: 'ubs-v2',
  name: 'UBS v2',
  delimiter: ',',
  hasHeaderRow: true,
  skipRows: 0,
  headerPatterns: [
    'Date',
    'Description',
    'Debit',
    'Credit',
    'Currency',
    'Account',
    'Reference',
    'Balance',
  ],
  columnMappings: [
    { field: 'date', columnIndices: [0] },
    { field: 'description', columnIndices: [1] },
    { field: 'debit', columnIndices: [2] },
    { field: 'credit', columnIndices: [3] },
  ],
  amountFormat: 'debit-credit',
  timeMode: 'none',
  dateFormat: 'DD.MM.YYYY',
  decimalSeparator: '.',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('ParserMatcher', () => {
  it('offers to duplicate the closest parser instead of using a partial match', async () => {
    const user = userEvent.setup();
    const onDuplicateParser = vi.fn();
    vi.mocked(api.get).mockResolvedValue([
      {
        id: PARSER.id,
        name: PARSER.name,
        config: {
          delimiter: PARSER.delimiter,
          hasHeaderRow: PARSER.hasHeaderRow,
          skipRows: PARSER.skipRows,
          headerPatterns: PARSER.headerPatterns,
          columnMappings: PARSER.columnMappings,
          amountFormat: PARSER.amountFormat,
          timeMode: PARSER.timeMode,
          dateFormat: PARSER.dateFormat,
          decimalSeparator: PARSER.decimalSeparator,
        },
        createdAt: PARSER.createdAt,
        updatedAt: PARSER.updatedAt,
      },
    ]);

    render(
      <ParserMatcher
        rawContent={'Date,Description,Debit,Credit,Currency,Account,Reference,Unexpected\n01.01.2025,Test,10,,CHF,123,abc,value'}
        onSelectParser={vi.fn()}
        onEditParser={vi.fn()}
        onDuplicateParser={onDuplicateParser}
        onCreateNew={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText('Closest parser: UBS v2')).toBeVisible();
    expect(screen.getByText(/88% header match/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Use this parser' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Duplicate and adjust' }));

    expect(onDuplicateParser).toHaveBeenCalledWith(expect.objectContaining({ id: 'ubs-v2' }));
  });
});
