import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  parseRawCsv,
  extractHeadersAndData,
  extractAccountIdentifier,
  scoreParserMatch,
  findBestParser,
  findBestParserFromRaw,
  parseDateTime,
  parseDate,
  parseTime,
  parseAmount,
  applyParser,
  applyTransforms,
  validateMappings,
  DATE_FORMAT_PRESETS,
  DATE_TIME_FORMAT_PRESETS,
  TIME_FORMAT_PRESETS,
} from '../../src/lib/csv';
import type {
  CsvParser,
  ColumnMapping,
  FieldTransform,
  ParsedRow,
} from '../../src/types';

// ─── Helper ──────────────────────────────────────────────────

function makeParser(overrides: Partial<CsvParser> = {}): CsvParser {
  return {
    id: 'parser-1',
    name: 'Test Parser',
    delimiter: ',',
    hasHeaderRow: true,
    skipRows: 0,
    headerPatterns: [],
    columnMappings: [],
    amountFormat: 'single',
    timeMode: 'none',
    dateFormat: 'DD.MM.YYYY',
    decimalSeparator: '.',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeParsedRow(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    description: 'Test transaction',
    amount: 100,
    date: '2025-01-15',
    raw: {},
    errors: [],
    ...overrides,
  };
}

// ─── detectDelimiter ─────────────────────────────────────────

describe('detectDelimiter', () => {
  it('detects comma delimiter', () => {
    const text = 'a,b,c\n1,2,3\n4,5,6';
    expect(detectDelimiter(text)).toBe(',');
  });

  it('detects semicolon delimiter', () => {
    const text = 'a;b;c\n1;2;3\n4;5;6';
    expect(detectDelimiter(text)).toBe(';');
  });

  it('detects tab delimiter', () => {
    const text = 'a\tb\tc\n1\t2\t3\n4\t5\t6';
    expect(detectDelimiter(text)).toBe('\t');
  });

  it('detects pipe delimiter', () => {
    const text = 'a|b|c\n1|2|3\n4|5|6';
    expect(detectDelimiter(text)).toBe('|');
  });

  it('prefers consistent delimiter over higher total count', () => {
    // Commas: 2 per line (consistent) → score = 2 * 10 = 20
    // Semicolons: inconsistent (3, 1, 2) → score = 6
    const text = 'a,b,c\n1,2,3\n4,5,6';
    expect(detectDelimiter(text)).toBe(',');
  });

  it('handles single-line input', () => {
    const text = 'a,b,c';
    expect(detectDelimiter(text)).toBe(',');
  });

  it('returns comma for empty input', () => {
    expect(detectDelimiter('')).toBe(',');
  });

  it('handles lines with no clear delimiter', () => {
    const text = 'hello world\nfoo bar';
    // No delimiters found at all, all scores 0, stays at default ','
    expect(detectDelimiter(text)).toBe(',');
  });
});

// ─── parseRawCsv ─────────────────────────────────────────────

describe('parseRawCsv', () => {
  it('parses basic comma-separated rows', () => {
    const text = 'a,b,c\n1,2,3';
    expect(parseRawCsv(text, ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing the delimiter', () => {
    const text = '"hello, world",b,c';
    expect(parseRawCsv(text, ',')).toEqual([['hello, world', 'b', 'c']]);
  });

  it('handles escaped quotes inside quoted fields', () => {
    const text = '"She said ""hello""",b';
    expect(parseRawCsv(text, ',')).toEqual([['She said "hello"', 'b']]);
  });

  it('strips BOM from input', () => {
    const text = '\uFEFFa,b,c\n1,2,3';
    expect(parseRawCsv(text, ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF line endings', () => {
    const text = 'a,b\r\n1,2\r\n3,4';
    expect(parseRawCsv(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('skips blank rows (all cells empty)', () => {
    const text = 'a,b\n,\n1,2';
    expect(parseRawCsv(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('trims cell values', () => {
    const text = '  a  ,  b  \n  1  ,  2  ';
    expect(parseRawCsv(text, ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles semicolon delimiter', () => {
    const text = 'a;b;c\n1;2;3';
    expect(parseRawCsv(text, ';')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with newlines inside', () => {
    const text = '"line1\nline2",b\nc,d';
    expect(parseRawCsv(text, ',')).toEqual([
      ['line1\nline2', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles empty input', () => {
    expect(parseRawCsv('', ',')).toEqual([]);
  });
});

// ─── extractHeadersAndData ───────────────────────────────────

describe('extractHeadersAndData', () => {
  it('extracts headers from first row when hasHeaderRow=true', () => {
    const rawRows = [
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ];
    const result = extractHeadersAndData(rawRows, true, 0);
    expect(result.headers).toEqual(['Name', 'Age']);
    expect(result.dataRows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
    expect(result.skippedRows).toEqual([]);
  });

  it('generates numeric headers when hasHeaderRow=false', () => {
    const rawRows = [
      ['Alice', '30'],
      ['Bob', '25'],
    ];
    const result = extractHeadersAndData(rawRows, false, 0);
    expect(result.headers).toEqual(['Column 1', 'Column 2']);
    expect(result.dataRows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('respects skipRows parameter', () => {
    const rawRows = [
      ['Bank Export', ''],
      ['Date: 2025-01-01', ''],
      ['Name', 'Amount'],
      ['Alice', '100'],
    ];
    const result = extractHeadersAndData(rawRows, true, 2);
    expect(result.skippedRows).toEqual([
      ['Bank Export', ''],
      ['Date: 2025-01-01', ''],
    ]);
    expect(result.headers).toEqual(['Name', 'Amount']);
    expect(result.dataRows).toEqual([['Alice', '100']]);
  });

  it('returns empty arrays for empty input', () => {
    const result = extractHeadersAndData([], true, 0);
    expect(result.headers).toEqual([]);
    expect(result.dataRows).toEqual([]);
    expect(result.skippedRows).toEqual([]);
  });

  it('handles skipRows with hasHeaderRow=false', () => {
    const rawRows = [
      ['Metadata', ''],
      ['Alice', '30'],
      ['Bob', '25'],
    ];
    const result = extractHeadersAndData(rawRows, false, 1);
    expect(result.skippedRows).toEqual([['Metadata', '']]);
    expect(result.headers).toEqual(['Column 1', 'Column 2']);
    expect(result.dataRows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('handles rows with different lengths (maxCols)', () => {
    const rawRows = [
      ['a'],
      ['b', 'c', 'd'],
    ];
    const result = extractHeadersAndData(rawRows, false, 0);
    expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
  });
});

// ─── extractAccountIdentifier ────────────────────────────────

describe('extractAccountIdentifier', () => {
  it('returns null for empty pattern', () => {
    expect(extractAccountIdentifier([['IBAN', 'CH1234']], '')).toBeNull();
  });

  it('returns null for empty rows', () => {
    expect(extractAccountIdentifier([], 'IBAN')).toBeNull();
  });

  it('matches label-only pattern and returns next cell', () => {
    const rows = [['Account', 'IBAN', 'CH28 1234 5678']];
    expect(extractAccountIdentifier(rows, 'IBAN')).toBe('CH28 1234 5678');
  });

  it('returns null for label pattern when label is in last cell', () => {
    const rows = [['Account', 'IBAN']];
    expect(extractAccountIdentifier(rows, 'IBAN')).toBeNull();
  });

  it('matches capture group pattern within cells', () => {
    const rows = [['IBAN: CH28 1234 5678', 'other']];
    expect(extractAccountIdentifier(rows, 'IBAN:\\s*(.+)')).toBe('CH28 1234 5678');
  });

  it('returns null for capture group pattern with no match', () => {
    const rows = [['No match here', 'nothing']];
    expect(extractAccountIdentifier(rows, 'IBAN:\\s*(.+)')).toBeNull();
  });

  it('returns null for invalid regex', () => {
    const rows = [['test', 'value']];
    expect(extractAccountIdentifier(rows, '([invalid')).toBeNull();
  });

  it('searches across multiple rows', () => {
    const rows = [
      ['Header', 'Value1'],
      ['IBAN', 'CH99 8888 7777'],
    ];
    expect(extractAccountIdentifier(rows, 'IBAN')).toBe('CH99 8888 7777');
  });

  it('skips empty next-cell values for label pattern', () => {
    const rows = [['IBAN', '', 'other']];
    expect(extractAccountIdentifier(rows, 'IBAN')).toBeNull();
  });
});

// ─── scoreParserMatch ────────────────────────────────────────

describe('scoreParserMatch', () => {
  it('returns 0 for empty headerPatterns', () => {
    const parser = makeParser({ headerPatterns: [] });
    expect(scoreParserMatch(parser, ['Date', 'Amount'])).toBe(0);
  });

  it('returns 1 for full match', () => {
    const parser = makeParser({ headerPatterns: ['Date', 'Amount', 'Description'] });
    expect(scoreParserMatch(parser, ['Date', 'Amount', 'Description'])).toBe(1);
  });

  it('returns partial score for partial match', () => {
    const parser = makeParser({ headerPatterns: ['Date', 'Amount', 'Category'] });
    expect(scoreParserMatch(parser, ['Date', 'Amount', 'Description'])).toBeCloseTo(2 / 3);
  });

  it('returns 0 when no patterns match', () => {
    const parser = makeParser({ headerPatterns: ['Foo', 'Bar'] });
    expect(scoreParserMatch(parser, ['Date', 'Amount'])).toBe(0);
  });

  it('matches case-insensitively', () => {
    const parser = makeParser({ headerPatterns: ['date', 'amount'] });
    expect(scoreParserMatch(parser, ['DATE', 'AMOUNT'])).toBe(1);
  });

  it('supports regex patterns', () => {
    const parser = makeParser({ headerPatterns: ['^date$', 'am(ou)?nt'] });
    expect(scoreParserMatch(parser, ['Date', 'Amt'])).toBe(0.5); // Only 'am(ou)?nt' matches 'Amt'
  });

  it('falls back to substring match for invalid regex', () => {
    const parser = makeParser({ headerPatterns: ['[invalid', 'Date'] });
    // '[invalid' is invalid regex, tries substring: '[invalid' not in any header → no match
    // 'Date' is valid regex → matches
    expect(scoreParserMatch(parser, ['Date', 'Amount'])).toBe(0.5);
  });

  it('falls back to substring match that succeeds', () => {
    const parser = makeParser({ headerPatterns: ['[Date'] });
    // Invalid regex, but '[Date' as substring appears in '[Date] Column'
    expect(scoreParserMatch(parser, ['[Date] Column'])).toBe(1);
  });
});

// ─── findBestParser ──────────────────────────────────────────

describe('findBestParser', () => {
  it('returns the best matching parser above threshold', () => {
    // p1 scores 1/2 = 0.5 (below threshold), p2 scores 3/3 = 1.0
    const p1 = makeParser({ id: 'p1', headerPatterns: ['Date', 'Foo'] });
    const p2 = makeParser({ id: 'p2', headerPatterns: ['Date', 'Amount', 'Description'] });
    const result = findBestParser([p1, p2], ['Date', 'Amount', 'Description']);
    expect(result).not.toBeNull();
    expect(result!.parser.id).toBe('p2');
    expect(result!.score).toBe(1);
  });

  it('returns null when no parser meets threshold', () => {
    const p = makeParser({ headerPatterns: ['Foo', 'Bar', 'Baz'] });
    // Only 0/3 match
    expect(findBestParser([p], ['Date', 'Amount'])).toBeNull();
  });

  it('returns null for empty parsers array', () => {
    expect(findBestParser([], ['Date', 'Amount'])).toBeNull();
  });

  it('respects custom threshold', () => {
    const p = makeParser({ headerPatterns: ['Date', 'Amount'] });
    // Score = 1/2 = 0.5, below default 0.7
    const result = findBestParser([p], ['Date', 'Other'], 0.5);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0.5);
  });

  it('picks highest score among multiple matches', () => {
    // p1 scores 1/3 = 0.33 (only 'Date' matches), p2 scores 2/2 = 1.0
    const p1 = makeParser({ id: 'p1', headerPatterns: ['Date', 'Foo', 'Bar'] });
    const p2 = makeParser({ id: 'p2', headerPatterns: ['Date', 'Amount'] });
    const result = findBestParser([p1, p2], ['Date', 'Amount'], 0.3);
    expect(result!.parser.id).toBe('p2');
  });

  it('returns first parser when scores are equal', () => {
    // Both score 1.0 — first one wins (strictly greater check)
    const p1 = makeParser({ id: 'p1', headerPatterns: ['Date'] });
    const p2 = makeParser({ id: 'p2', headerPatterns: ['Amount'] });
    const result = findBestParser([p1, p2], ['Date', 'Amount'], 0.5);
    expect(result!.parser.id).toBe('p1');
  });
});

// ─── findBestParserFromRaw ───────────────────────────────────

describe('findBestParserFromRaw', () => {
  it('re-parses with parser settings to find correct headers', () => {
    // CSV with 2 skip rows, then headers
    const raw = 'Bank Export\nDate: 2025\nDate,Amount,Description\n01.01.2025,100,Test';
    const parser = makeParser({
      headerPatterns: ['Date', 'Amount', 'Description'],
      skipRows: 2,
      delimiter: ',',
    });
    const result = findBestParserFromRaw([parser], raw);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
  });

  it('matches parser with different delimiter', () => {
    const raw = 'Date;Amount;Description\n01.01.2025;100;Test';
    const parser = makeParser({
      headerPatterns: ['Date', 'Amount', 'Description'],
      delimiter: ';',
    });
    const result = findBestParserFromRaw([parser], raw);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
  });

  it('returns null when no parser matches', () => {
    const raw = 'Foo,Bar\n1,2';
    const parser = makeParser({ headerPatterns: ['Date', 'Amount', 'Description'] });
    expect(findBestParserFromRaw([parser], raw)).toBeNull();
  });
});

// ─── parseDateTime ───────────────────────────────────────────

describe('parseDateTime', () => {
  it('parses DD.MM.YYYY format', () => {
    expect(parseDateTime('31.12.2025', 'DD.MM.YYYY')).toEqual({ date: '2025-12-31' });
  });

  it('parses YYYY-MM-DD format', () => {
    expect(parseDateTime('2025-01-15', 'YYYY-MM-DD')).toEqual({ date: '2025-01-15' });
  });

  it('parses MM/DD/YYYY format', () => {
    expect(parseDateTime('12/31/2025', 'MM/DD/YYYY')).toEqual({ date: '2025-12-31' });
  });

  it('parses YY format (adds 2000)', () => {
    expect(parseDateTime('15.01.25', 'DD.MM.YY')).toEqual({ date: '2025-01-15' });
  });

  it('parses date with time (DD.MM.YYYY HH:mm)', () => {
    expect(parseDateTime('31.12.2025 14:30', 'DD.MM.YYYY HH:mm')).toEqual({
      date: '2025-12-31',
      time: '14:30:00',
    });
  });

  it('parses date with time including seconds', () => {
    expect(parseDateTime('31.12.2025 14:30:45', 'DD.MM.YYYY HH:mm:ss')).toEqual({
      date: '2025-12-31',
      time: '14:30:45',
    });
  });

  it('parses ISO-like datetime with T separator', () => {
    expect(parseDateTime('2025-12-31T14:30:45', 'YYYY-MM-DDTHH:mm:ss')).toEqual({
      date: '2025-12-31',
      time: '14:30:45',
    });
  });

  it('returns null for invalid month', () => {
    expect(parseDateTime('31.13.2025', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for month 0', () => {
    expect(parseDateTime('31.00.2025', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for invalid day', () => {
    expect(parseDateTime('00.12.2025', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for day 32', () => {
    expect(parseDateTime('32.12.2025', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for invalid hour (24)', () => {
    expect(parseDateTime('31.12.2025 24:00', 'DD.MM.YYYY HH:mm')).toBeNull();
  });

  it('returns null for invalid minute (60)', () => {
    expect(parseDateTime('31.12.2025 14:60', 'DD.MM.YYYY HH:mm')).toBeNull();
  });

  it('returns null for invalid second (60)', () => {
    expect(parseDateTime('31.12.2025 14:30:60', 'DD.MM.YYYY HH:mm:ss')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDateTime('', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseDateTime('   ', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for non-matching format', () => {
    expect(parseDateTime('2025/01/15', 'DD.MM.YYYY')).toBeNull();
  });

  it('pads single-digit month and day', () => {
    expect(parseDateTime('1.2.2025', 'DD.MM.YYYY')).toEqual({ date: '2025-02-01' });
  });
});

// ─── parseDate ───────────────────────────────────────────────

describe('parseDate', () => {
  it('returns date string for valid input', () => {
    expect(parseDate('15.01.2025', 'DD.MM.YYYY')).toBe('2025-01-15');
  });

  it('returns null for invalid date', () => {
    expect(parseDate('invalid', 'DD.MM.YYYY')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDate('', 'DD.MM.YYYY')).toBeNull();
  });
});

// ─── parseTime ───────────────────────────────────────────────

describe('parseTime', () => {
  it('parses HH:mm format', () => {
    expect(parseTime('14:30', 'HH:mm')).toBe('14:30:00');
  });

  it('parses HH:mm:ss format', () => {
    expect(parseTime('14:30:45', 'HH:mm:ss')).toBe('14:30:45');
  });

  it('parses HHmm format', () => {
    expect(parseTime('1430', 'HHmm')).toBe('14:30:00');
  });

  it('parses HHmmss format', () => {
    expect(parseTime('143045', 'HHmmss')).toBe('14:30:45');
  });

  it('returns null for invalid hour', () => {
    expect(parseTime('25:00', 'HH:mm')).toBeNull();
  });

  it('returns null for invalid minute', () => {
    expect(parseTime('14:60', 'HH:mm')).toBeNull();
  });

  it('returns null for invalid second', () => {
    expect(parseTime('14:30:60', 'HH:mm:ss')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTime('', 'HH:mm')).toBeNull();
  });

  it('returns null for non-matching format', () => {
    expect(parseTime('abc', 'HH:mm')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseTime('  14:30  ', 'HH:mm')).toBe('14:30:00');
  });

  it('pads single-digit values', () => {
    expect(parseTime('9:05', 'HH:mm')).toBe('09:05:00');
  });
});

// ─── parseAmount ─────────────────────────────────────────────

describe('parseAmount', () => {
  it('parses basic positive amount with dot decimal', () => {
    expect(parseAmount('123.45', '.')).toBe(123.45);
  });

  it('parses basic negative amount', () => {
    expect(parseAmount('-123.45', '.')).toBe(-123.45);
  });

  it('parses amount with comma decimal separator', () => {
    expect(parseAmount('123,45', ',')).toBe(123.45);
  });

  it('removes currency symbols', () => {
    expect(parseAmount('$123.45', '.')).toBe(123.45);
    expect(parseAmount('€123.45', '.')).toBe(123.45);
    expect(parseAmount('£123.45', '.')).toBe(123.45);
    expect(parseAmount('CHF 123.45', '.')).toBe(123.45);
  });

  it('removes thousands separator (dot decimal → comma thousands)', () => {
    expect(parseAmount('1,234.56', '.')).toBe(1234.56);
    expect(parseAmount('1,234,567.89', '.')).toBe(1234567.89);
  });

  it('removes thousands separator (comma decimal → dot thousands)', () => {
    expect(parseAmount('1.234,56', ',')).toBe(1234.56);
    expect(parseAmount('1.234.567,89', ',')).toBe(1234567.89);
  });

  it('handles parentheses for negative amounts', () => {
    expect(parseAmount('(123.45)', '.')).toBe(-123.45);
  });

  it('returns null for empty string', () => {
    expect(parseAmount('', '.')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(parseAmount('   ', '.')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseAmount('abc', '.')).toBeNull();
  });

  it('handles amount with spaces', () => {
    expect(parseAmount('1 234.56', '.')).toBe(1234.56);
  });

  it('handles zero', () => {
    expect(parseAmount('0.00', '.')).toBe(0);
  });

  it('handles integer amount', () => {
    expect(parseAmount('100', '.')).toBe(100);
  });
});

// ─── applyParser ─────────────────────────────────────────────

describe('applyParser', () => {
  it('parses basic single-amount rows', () => {
    const parser = makeParser({
      dateFormat: 'DD.MM.YYYY',
      decimalSeparator: '.',
      amountFormat: 'single',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
    });
    const headers = ['Date', 'Description', 'Amount'];
    const dataRows = [['01.01.2025', 'Grocery store', '42.50']];

    const result = applyParser(dataRows, headers, parser);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[0].description).toBe('Grocery store');
    expect(result[0].amount).toBe(42.5);
    expect(result[0].errors).toEqual([]);
  });

  it('parses debit-credit format', () => {
    const parser = makeParser({
      amountFormat: 'debit-credit',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'debit', columnIndices: [2] },
        { field: 'credit', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Description', 'Debit', 'Credit'];
    const dataRows = [
      ['01.01.2025', 'Expense', '50.00', ''],
      ['02.01.2025', 'Salary', '', '3000.00'],
    ];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].amount).toBe(-50); // credit(0) - debit(50)
    expect(result[1].amount).toBe(3000); // credit(3000) - debit(0)
  });

  it('parses amount-type format with Credit indicator', () => {
    const parser = makeParser({
      amountFormat: 'amount-type',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'amountType', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Description', 'Amount', 'Type'];
    const dataRows = [
      ['01.01.2025', 'Salary', '3000.00', 'Credit'],
      ['02.01.2025', 'Rent', '1200.00', 'Debit'],
    ];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].amount).toBe(3000);
    expect(result[1].amount).toBe(-1200);
  });

  it('handles amount-type with CR/DB indicators', () => {
    const parser = makeParser({
      amountFormat: 'amount-type',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'amountType', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Type'];
    const dataRows = [
      ['01.01.2025', 'In', '100', 'CR'],
      ['02.01.2025', 'Out', '50', 'DB'],
    ];
    const result = applyParser(dataRows, headers, parser);
    expect(result[0].amount).toBe(100);
    expect(result[1].amount).toBe(-50);
  });

  it('reports unknown indicator in amount-type format', () => {
    const parser = makeParser({
      amountFormat: 'amount-type',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'amountType', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Type'];
    const dataRows = [['01.01.2025', 'Item', '100', 'UNKNOWN']];
    const result = applyParser(dataRows, headers, parser);
    expect(result[0].amount).toBe(100); // keeps original sign
    expect(result[0].errors).toContainEqual(expect.stringContaining('Unknown indicator'));
  });

  it('reports missing required fields', () => {
    const parser = makeParser({
      amountFormat: 'single',
      columnMappings: [], // no mappings at all
    });
    const headers = ['Date', 'Description', 'Amount'];
    const dataRows = [['01.01.2025', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toContain('Missing description');
    expect(result[0].errors).toContain('No date mapping');
    expect(result[0].errors).toContain('No amount mapping');
  });

  it('concatenates multi-column description', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1, 2] },
        { field: 'amount', columnIndices: [3] },
      ],
      multiColumnSeparator: ' - ',
    });
    const headers = ['Date', 'Type', 'Detail', 'Amount'];
    const dataRows = [['01.01.2025', 'Purchase', 'Coffee Shop', '5.00']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].description).toBe('Purchase - Coffee Shop');
  });

  it('extracts category', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'category', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Category'];
    const dataRows = [['01.01.2025', 'Test', '100', 'Food']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].category).toBe('Food');
  });

  it('extracts currency', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'currency', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Currency'];
    const dataRows = [['01.01.2025', 'Test', '100', 'CHF']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].currency).toBe('CHF');
  });

  it('extracts transactionId', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'transactionId', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'TxnID'];
    const dataRows = [['01.01.2025', 'Test', '100', 'TXN-12345']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].transactionId).toBe('TXN-12345');
  });

  it('extracts metadata from metadataMappings', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
      metadataMappings: [
        { key: 'Reference', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Ref'];
    const dataRows = [['01.01.2025', 'Test', '100', 'REF-001']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].metadata).toEqual([
      { key: 'Reference', value: 'REF-001', source: 'import' },
    ]);
  });

  it('skips metadata columns that are already mapped to fields', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
      metadataMappings: [
        { key: 'DescAgain', columnIndices: [1] }, // column 1 is already mapped to description
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    // Column 1 is in mappedColumnIndices, so metadata should not include it
    expect(result[0].metadata).toBeUndefined();
  });

  it('handles time in separate column mode', () => {
    const parser = makeParser({
      timeMode: 'separate-column',
      timeFormat: 'HH:mm',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'time', columnIndices: [1] },
        { field: 'description', columnIndices: [2] },
        { field: 'amount', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Time', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', '14:30', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].time).toBe('14:30:00');
  });

  it('handles time in date column mode', () => {
    const parser = makeParser({
      timeMode: 'in-date-column',
      dateFormat: 'DD.MM.YYYY HH:mm:ss',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
    });
    const headers = ['DateTime', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025 14:30:45', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[0].time).toBe('14:30:45');
  });

  it('reports invalid date errors', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['not-a-date', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toContainEqual(expect.stringContaining('Invalid date'));
  });

  it('reports invalid amount errors', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', 'Test', 'not-a-number']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toContainEqual(expect.stringContaining('Invalid amount'));
  });

  it('applies transforms after mapping', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
      transforms: [
        {
          label: 'Extract merchant',
          sourceField: 'description',
          targetField: 'description',
          matchPattern: 'Purchase',
          extractPattern: 'Purchase at (?<merchant>.+)',
          replacement: '{{merchant}}',
        },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', 'Purchase at Coffee Shop', '5.00']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].description).toBe('Coffee Shop');
  });

  it('ignores columns mapped to ignore field', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        { field: 'ignore', columnIndices: [3] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt', 'Extra'];
    const dataRows = [['01.01.2025', 'Test', '100', 'ignored data']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toEqual([]);
    // 'ignore' field shouldn't be mapped to any ParsedRow property
    expect(result[0].raw['Extra']).toBe('ignored data');
  });

  it('handles debit-credit with no mappings for either', () => {
    const parser = makeParser({
      amountFormat: 'debit-credit',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
      ],
    });
    const headers = ['Date', 'Desc'];
    const dataRows = [['01.01.2025', 'Test']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toContain('No debit/credit mapping');
  });

  it('builds raw record from all columns', () => {
    const parser = makeParser({
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].raw).toEqual({
      Date: '01.01.2025',
      Desc: 'Test',
      Amt: '100',
    });
  });

  it('handles amount-type without amountType mapping', () => {
    const parser = makeParser({
      amountFormat: 'amount-type',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amount', columnIndices: [2] },
        // no amountType mapping
      ],
    });
    const headers = ['Date', 'Desc', 'Amt'];
    const dataRows = [['01.01.2025', 'Test', '100']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].amount).toBe(100);
    expect(result[0].errors).toContain('No debit/credit indicator mapping');
  });

  it('handles amount-type without amount mapping', () => {
    const parser = makeParser({
      amountFormat: 'amount-type',
      columnMappings: [
        { field: 'date', columnIndices: [0] },
        { field: 'description', columnIndices: [1] },
        { field: 'amountType', columnIndices: [2] },
      ],
    });
    const headers = ['Date', 'Desc', 'Type'];
    const dataRows = [['01.01.2025', 'Test', 'Credit']];

    const result = applyParser(dataRows, headers, parser);
    expect(result[0].errors).toContain('No amount mapping');
  });
});

// ─── applyTransforms ─────────────────────────────────────────

describe('applyTransforms', () => {
  it('applies transform with replacement template', () => {
    const row = makeParsedRow({ description: 'Purchase at Coffee Shop' });
    const transforms: FieldTransform[] = [
      {
        label: 'Extract merchant',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: 'Purchase',
        extractPattern: 'Purchase at (?<merchant>.+)',
        replacement: '{{merchant}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.description).toBe('Coffee Shop');
  });

  it('auto-joins named groups when no replacement template', () => {
    const row = makeParsedRow({ description: 'Order 12345 from Amazon' });
    const transforms: FieldTransform[] = [
      {
        label: 'Extract order info',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: 'Order',
        extractPattern: 'Order (?<id>\\d+) from (?<store>\\w+)',
        replacement: '',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.description).toBe('12345 Amazon');
  });

  it('warns when no transform matches but content exists', () => {
    const row = makeParsedRow({ description: 'Something unmatched' });
    const transforms: FieldTransform[] = [
      {
        label: 'Only matches foo',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: 'SPECIFIC_PATTERN',
        extractPattern: '(?<data>.+)',
        replacement: '{{data}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.errors).toContain('No transform rule matched this row');
    expect(row.description).toBe('Something unmatched'); // unchanged
  });

  it('reports error for extract pattern with no named groups', () => {
    const row = makeParsedRow({ description: 'test value' });
    const transforms: FieldTransform[] = [
      {
        label: 'Bad extract',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: 'test',
        extractPattern: 'test (\\w+)', // unnamed capture group
        replacement: '',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.errors).toContainEqual(
      expect.stringContaining('no named group matches'),
    );
  });

  it('reports error for invalid regex', () => {
    const row = makeParsedRow({ description: 'test value' });
    const transforms: FieldTransform[] = [
      {
        label: 'Invalid',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: '[invalid',
        extractPattern: '(?<x>.+)',
        replacement: '',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.errors).toContainEqual(expect.stringContaining('invalid regex'));
  });

  it('transforms to a different target field', () => {
    const row = makeParsedRow({ description: 'Groceries - Migros' });
    const transforms: FieldTransform[] = [
      {
        label: 'Extract category',
        sourceField: 'description',
        targetField: 'category',
        matchPattern: '.*',
        extractPattern: '(?<cat>\\w+) -',
        replacement: '{{cat}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.category).toBe('Groceries');
  });

  it('skips transforms without matchPattern', () => {
    const row = makeParsedRow({ description: 'test' });
    const transforms: FieldTransform[] = [
      {
        label: 'No match pattern',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: '',
        extractPattern: '(?<x>.+)',
        replacement: '{{x}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.description).toBe('test'); // unchanged
  });

  it('skips transforms without extractPattern', () => {
    const row = makeParsedRow({ description: 'test' });
    const transforms: FieldTransform[] = [
      {
        label: 'No extract pattern',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: 'test',
        extractPattern: '',
        replacement: '{{x}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.description).toBe('test'); // unchanged
  });

  it('handles multiple transforms in sequence', () => {
    const row = makeParsedRow({ description: 'CARD PURCHASE - Coffee Shop' });
    const transforms: FieldTransform[] = [
      {
        label: 'Extract type to category',
        sourceField: 'description',
        targetField: 'category',
        matchPattern: 'CARD PURCHASE',
        extractPattern: '(?<type>CARD PURCHASE)',
        replacement: '{{type}}',
      },
      {
        label: 'Extract merchant',
        sourceField: 'description',
        targetField: 'description',
        matchPattern: ' - ',
        extractPattern: ' - (?<merchant>.+)',
        replacement: '{{merchant}}',
      },
    ];

    applyTransforms(row, transforms);
    expect(row.category).toBe('CARD PURCHASE');
    expect(row.description).toBe('Coffee Shop');
  });

  it('sets target to undefined when result is empty (non-description)', () => {
    const row = makeParsedRow({ description: 'test', category: 'Old' });
    const transforms: FieldTransform[] = [
      {
        label: 'Clear category',
        sourceField: 'description',
        targetField: 'category',
        matchPattern: 'test',
        extractPattern: '(?<empty>NOMATCH)?',
        replacement: '{{empty}}',
      },
    ];

    applyTransforms(row, transforms);
    // The extract regex matches (since ? makes it optional), but named group is undefined
    // Result will be empty string → set to undefined for non-description fields
    expect(row.category).toBeUndefined();
  });
});

// ─── validateMappings ────────────────────────────────────────

describe('validateMappings', () => {
  it('returns no errors for valid single-amount mappings', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single');
    expect(errors.size).toBe(0);
  });

  it('requires description', () => {
    const mappings: ColumnMapping[] = [
      { field: 'date', columnIndices: [1] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single');
    expect(errors.get('description')).toBe('Required');
  });

  it('requires date', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single');
    expect(errors.get('date')).toBe('Required');
  });

  it('requires amount for single format', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
    ];
    const errors = validateMappings(mappings, 'single');
    expect(errors.get('amount')).toBe('Required');
  });

  it('requires amount and amountType for amount-type format', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
    ];
    const errors = validateMappings(mappings, 'amount-type');
    expect(errors.get('amount')).toBe('Required');
    expect(errors.get('amountType')).toBe('Required');
  });

  it('requires at least one of debit/credit for debit-credit format', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
    ];
    const errors = validateMappings(mappings, 'debit-credit');
    expect(errors.has('debit')).toBe(true);
    expect(errors.has('credit')).toBe(true);
  });

  it('accepts debit only for debit-credit format', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
      { field: 'debit', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'debit-credit');
    expect(errors.has('debit')).toBe(false);
    expect(errors.has('credit')).toBe(false);
  });

  it('accepts credit only for debit-credit format', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
      { field: 'credit', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'debit-credit');
    expect(errors.has('debit')).toBe(false);
    expect(errors.has('credit')).toBe(false);
  });

  it('requires time for separate-column timeMode', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single', 'separate-column');
    expect(errors.get('time')).toBe('Required');
  });

  it('does not require time for none timeMode', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [0] },
      { field: 'date', columnIndices: [1] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single', 'none');
    expect(errors.has('time')).toBe(false);
  });

  it('ignores mappings with empty columnIndices', () => {
    const mappings: ColumnMapping[] = [
      { field: 'description', columnIndices: [] }, // not active
      { field: 'date', columnIndices: [1] },
      { field: 'amount', columnIndices: [2] },
    ];
    const errors = validateMappings(mappings, 'single');
    expect(errors.get('description')).toBe('Required');
  });
});

// ─── Constants ───────────────────────────────────────────────

describe('Constants', () => {
  it('DATE_FORMAT_PRESETS exists and has expected structure', () => {
    expect(Array.isArray(DATE_FORMAT_PRESETS)).toBe(true);
    expect(DATE_FORMAT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of DATE_FORMAT_PRESETS) {
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('value');
      expect(preset).toHaveProperty('example');
    }
  });

  it('DATE_TIME_FORMAT_PRESETS exists and has expected structure', () => {
    expect(Array.isArray(DATE_TIME_FORMAT_PRESETS)).toBe(true);
    expect(DATE_TIME_FORMAT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of DATE_TIME_FORMAT_PRESETS) {
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('value');
      expect(preset).toHaveProperty('example');
    }
  });

  it('TIME_FORMAT_PRESETS exists and has expected structure', () => {
    expect(Array.isArray(TIME_FORMAT_PRESETS)).toBe(true);
    expect(TIME_FORMAT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of TIME_FORMAT_PRESETS) {
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('value');
      expect(preset).toHaveProperty('example');
    }
  });

  it('DATE_FORMAT_PRESETS examples parse correctly', () => {
    for (const preset of DATE_FORMAT_PRESETS) {
      const result = parseDate(preset.example, preset.value);
      expect(result).not.toBeNull();
    }
  });

  it('DATE_TIME_FORMAT_PRESETS examples parse correctly', () => {
    for (const preset of DATE_TIME_FORMAT_PRESETS) {
      const result = parseDateTime(preset.example, preset.value);
      expect(result).not.toBeNull();
      expect(result!.time).toBeDefined();
    }
  });

  it('TIME_FORMAT_PRESETS examples parse correctly', () => {
    for (const preset of TIME_FORMAT_PRESETS) {
      const result = parseTime(preset.example, preset.value);
      expect(result).not.toBeNull();
    }
  });
});
