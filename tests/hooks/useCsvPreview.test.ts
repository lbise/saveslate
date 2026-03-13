import { describe, expect, it } from 'vitest';

import { transformCsvPreviewResult } from '../../src/hooks/api/use-csv-import';

describe('transformCsvPreviewResult', () => {
  it('converts parsed preview row amounts from decimal strings to numbers', () => {
    const result = transformCsvPreviewResult({
      rows: [
        {
          description: 'Salary',
          amount: '2500.50',
          date: '2026-03-01',
          currency: 'CHF',
          raw: {},
          errors: [],
        },
        {
          description: 'Groceries',
          amount: '-45.10',
          date: '2026-03-02',
          currency: 'CHF',
          raw: {},
          errors: [],
        },
      ],
      headers: ['Description', 'Amount'],
      totalRows: 2,
      errorCount: 0,
      skippedRows: 0,
      detectedDelimiter: ',',
    });

    expect(result.rows[0].amount).toBe(2500.5);
    expect(result.rows[1].amount).toBe(-45.1);
    expect(result.totalRows).toBe(2);
  });

  it('keeps numeric preview row amounts unchanged', () => {
    const result = transformCsvPreviewResult({
      rows: [
        {
          description: 'Interest',
          amount: 12.34,
          date: '2026-03-03',
          currency: 'CHF',
          raw: {},
          errors: [],
        },
      ],
      headers: ['Description', 'Amount'],
      totalRows: 1,
      errorCount: 0,
      skippedRows: 0,
      detectedDelimiter: ',',
    });

    expect(result.rows[0].amount).toBe(12.34);
  });
});
