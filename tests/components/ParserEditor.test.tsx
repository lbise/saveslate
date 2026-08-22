import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ParserEditor } from '../../src/components/import/ParserEditor';
import { api } from '../../src/lib/api-client';

import type { ReactNode } from 'react';
import type { CsvParser } from '../../src/types';

vi.mock('../../src/lib/api-client', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const SOURCE_PARSER: CsvParser = {
  id: 'ubs-v2',
  name: 'UBS v2',
  delimiter: ',',
  hasHeaderRow: true,
  skipRows: 0,
  headerPatterns: ['Date', 'Description', 'Amount'],
  columnMappings: [
    { field: 'date', columnIndices: [0] },
    { field: 'description', columnIndices: [1] },
    { field: 'amount', columnIndices: [2] },
  ],
  amountFormat: 'single',
  timeMode: 'none',
  dateFormat: 'DD.MM.YYYY',
  decimalSeparator: '.',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('ParserEditor', () => {
  it('creates a prefilled copy without updating the source parser', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    vi.mocked(api.post).mockResolvedValue({
      id: 'ubs-v2-copy',
      name: 'UBS v2 copy',
      config: {
        delimiter: ',',
        hasHeaderRow: true,
        skipRows: 0,
        headerPatterns: ['Date', 'Description', 'Amount'],
        columnMappings: SOURCE_PARSER.columnMappings,
        amountFormat: 'single',
        timeMode: 'none',
        dateFormat: 'DD.MM.YYYY',
        decimalSeparator: '.',
      },
      createdAt: '2025-02-01T00:00:00.000Z',
      updatedAt: '2025-02-01T00:00:00.000Z',
    });

    render(
      <ParserEditor
        rawContent={'Date,Description,Amount,Unexpected\n01.01.2025,Test,10,value'}
        templateParser={SOURCE_PARSER}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByRole('heading', { name: 'Duplicate parser' })).toBeVisible();
    expect(screen.getByPlaceholderText('e.g. UBS Export, PostFinance CSV...')).toHaveValue('UBS v2 copy');

    await user.click(screen.getByRole('button', { name: 'Save parser' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/csv-parsers',
        expect.objectContaining({ name: 'UBS v2 copy' }),
      );
    });
    expect(api.put).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'ubs-v2-copy' }));
  });
});
