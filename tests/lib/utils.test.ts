import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatSignedCurrency,
  formatNumber,
  formatDate,
  formatDateShort,
  formatRelativeDate,
  formatPercentage,
  cn,
} from '../../src/lib/utils';

// Non-breaking space used by Intl.NumberFormat('de-CH') between currency code and amount
const NBSP = '\u00A0';

describe('formatCurrency', () => {
  it('formats a basic positive amount', () => {
    expect(formatCurrency(100)).toBe(`CHF${NBSP}100.00`);
  });

  it('formats a negative amount', () => {
    expect(formatCurrency(-100)).toBe('CHF-100.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe(`CHF${NBSP}0.00`);
  });

  it('formats large numbers with thousands separators', () => {
    // de-CH uses apostrophe as thousands separator
    expect(formatCurrency(1234567.89)).toBe(`CHF${NBSP}1'234'567.89`);
  });

  it('accepts a different currency (EUR)', () => {
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('EUR');
    expect(result).toContain('100.00');
  });

  it('accepts a different currency (USD)', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100.00');
  });

  it('rounds 1.005 using banker rounding', () => {
    // IEEE 754: 1.005 is actually 1.00499... so rounds to 1.00 or 1.01 depending on engine
    const result = formatCurrency(1.005);
    expect(result).toMatch(/CHF.1\.0[01]/);
  });

  it('rounds 1.995 up', () => {
    expect(formatCurrency(1.995)).toBe(`CHF${NBSP}2.00`);
  });

  it('formats very small amounts', () => {
    expect(formatCurrency(0.01)).toBe(`CHF${NBSP}0.01`);
  });

  it('formats decimals to exactly 2 places', () => {
    expect(formatCurrency(9.1)).toBe(`CHF${NBSP}9.10`);
  });
});

describe('formatSignedCurrency', () => {
  it('prefixes positive amounts with +', () => {
    expect(formatSignedCurrency(50)).toBe(`+CHF${NBSP}50.00`);
  });

  it('prefixes negative amounts with - and uses absolute value', () => {
    const result = formatSignedCurrency(-50);
    expect(result).toBe(`-CHF${NBSP}50.00`);
  });

  it('does not prefix zero', () => {
    expect(formatSignedCurrency(0)).toBe(`CHF${NBSP}0.00`);
  });

  it('works with currency override for positive', () => {
    const result = formatSignedCurrency(25, 'EUR');
    expect(result).toContain('+');
    expect(result).toContain('EUR');
    expect(result).toContain('25.00');
  });

  it('works with currency override for negative', () => {
    const result = formatSignedCurrency(-25, 'EUR');
    expect(result).toContain('-');
    expect(result).toContain('EUR');
    expect(result).toContain('25.00');
  });

  it('works with currency override for zero', () => {
    const result = formatSignedCurrency(0, 'EUR');
    expect(result).toContain('EUR');
    expect(result).toContain('0.00');
    expect(result).not.toMatch(/^[+-]/);
  });

  it('formats large positive with sign', () => {
    const result = formatSignedCurrency(1000);
    expect(result.startsWith('+')).toBe(true);
    expect(result).toContain("1'000.00");
  });
});

describe('formatNumber', () => {
  it('formats a basic number', () => {
    expect(formatNumber(1234.56)).toBe("1'234.56");
  });

  it('formats a negative number', () => {
    expect(formatNumber(-1234.56)).toBe("-1'234.56");
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('formats large numbers with thousands separators', () => {
    expect(formatNumber(1000000)).toBe("1'000'000.00");
  });

  it('pads to 2 decimal places', () => {
    expect(formatNumber(5)).toBe('5.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatNumber(1.999)).toBe('2.00');
  });

  it('formats small decimals', () => {
    expect(formatNumber(0.1)).toBe('0.10');
  });
});

describe('formatDate', () => {
  it('formats a mid-month date', () => {
    expect(formatDate('2025-01-15')).toBe('15 Jan 2025');
  });

  it('formats a summer date', () => {
    expect(formatDate('2025-06-01')).toBe('1 Jun 2025');
  });

  it('formats end of year', () => {
    expect(formatDate('2025-12-31')).toBe('31 Dec 2025');
  });

  it('formats a date with month March', () => {
    expect(formatDate('2025-03-05')).toBe('5 Mar 2025');
  });

  it('formats a date in a different year', () => {
    expect(formatDate('2020-08-20')).toBe('20 Aug 2020');
  });
});

describe('formatDateShort', () => {
  it('formats a date without year', () => {
    expect(formatDateShort('2025-03-15')).toBe('15 Mar');
  });

  it('does not include the year', () => {
    const result = formatDateShort('2025-07-04');
    expect(result).not.toContain('2025');
  });

  it('formats January date', () => {
    expect(formatDateShort('2025-01-01')).toBe('1 Jan');
  });

  it('formats December date', () => {
    expect(formatDateShort('2025-12-25')).toBe('25 Dec');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for today', () => {
    expect(formatRelativeDate('2025-06-15')).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    expect(formatRelativeDate('2025-06-14')).toBe('Yesterday');
  });

  it('returns "2 days ago" for two days ago', () => {
    expect(formatRelativeDate('2025-06-13')).toBe('2 days ago');
  });

  it('returns "3 days ago" for three days ago', () => {
    expect(formatRelativeDate('2025-06-12')).toBe('3 days ago');
  });

  it('returns "6 days ago" for six days ago', () => {
    expect(formatRelativeDate('2025-06-09')).toBe('6 days ago');
  });

  it('returns "1 weeks ago" for 7 days ago', () => {
    expect(formatRelativeDate('2025-06-08')).toBe('1 weeks ago');
  });

  it('returns "2 weeks ago" for 14 days ago', () => {
    expect(formatRelativeDate('2025-06-01')).toBe('2 weeks ago');
  });

  it('returns "4 weeks ago" for 29 days ago', () => {
    expect(formatRelativeDate('2025-05-17')).toBe('4 weeks ago');
  });

  it('falls back to formatDateShort for 30+ days ago', () => {
    // 30 days ago from June 15 = May 16
    const result = formatRelativeDate('2025-05-16');
    expect(result).toBe('16 May');
  });

  it('falls back to formatDateShort for much older dates', () => {
    const result = formatRelativeDate('2025-01-01');
    expect(result).toBe('1 Jan');
  });
});

describe('formatPercentage', () => {
  it('formats a decimal value', () => {
    expect(formatPercentage(15.6789)).toBe('15.7%');
  });

  it('formats a negative value', () => {
    expect(formatPercentage(-5.4)).toBe('-5.4%');
  });

  it('formats zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('formats whole numbers with .0', () => {
    expect(formatPercentage(10)).toBe('10.0%');
  });

  it('rounds 12.95 (IEEE 754 rounds down to 12.9%)', () => {
    // 12.95 is stored as ~12.9499... in IEEE 754, so toFixed(1) rounds down
    expect(formatPercentage(12.95)).toBe('12.9%');
  });

  it('rounds 12.94 down to 12.9%', () => {
    expect(formatPercentage(12.94)).toBe('12.9%');
  });

  it('formats 100%', () => {
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('formats very small percentage', () => {
    expect(formatPercentage(0.04)).toBe('0.0%');
  });

  it('formats very small negative percentage', () => {
    expect(formatPercentage(-0.06)).toBe('-0.1%');
  });
});

describe('cn', () => {
  it('returns a single class', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple classes', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out undefined', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('filters out false', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('handles a mix of truthy and falsy values', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe(
      'base active'
    );
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(undefined, false, undefined)).toBe('');
  });

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('filters out empty strings', () => {
    // filter(Boolean) removes empty string
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('handles only undefined args', () => {
    expect(cn(undefined)).toBe('');
  });

  it('handles only false args', () => {
    expect(cn(false)).toBe('');
  });
});
