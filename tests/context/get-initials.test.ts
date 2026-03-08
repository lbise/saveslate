import { describe, expect, it } from 'vitest';
import { getInitials } from '../../src/context';

describe('getInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for a single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('uses first and last name for three-word names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW');
  });

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns ? for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('handles extra whitespace between names', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
  });

  it('uppercases lowercase input', () => {
    expect(getInitials('jane smith')).toBe('JS');
  });
});
