import { describe, it, expect } from 'vitest';
import { parseAmount, detectDateFormat, parseDateWithFormat } from '../lib/parsing-utils.js';

describe('parseAmount', () => {
  it('parses positive amount', () => {
    expect(parseAmount('100.50')).toBe(100.5);
  });

  it('parses negative amount', () => {
    expect(parseAmount('-50.25')).toBe(-50.25);
  });

  it('parses amount with dollar sign', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
  });

  it('parses amount with parentheses (negative)', () => {
    expect(parseAmount('(100.00)')).toBe(-100.0);
  });

  it('parses amount with commas', () => {
    expect(parseAmount('1,000,000.00')).toBe(1000000.0);
  });

  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parseAmount(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseAmount(undefined)).toBe(0);
  });

  it('returns 0 for invalid amount', () => {
    expect(parseAmount('not a number')).toBe(0);
  });

  it('parses Unicode minus sign (U+2212)', () => {
    expect(parseAmount('\u221270.00')).toBe(-70.0);
  });

  it('parses en dash as minus (U+2013)', () => {
    expect(parseAmount('\u201350.25')).toBe(-50.25);
  });

  it('parses em dash as minus (U+2014)', () => {
    expect(parseAmount('\u201425.00')).toBe(-25.0);
  });

  it('handles trailing minus', () => {
    expect(parseAmount('100.00-')).toBe(-100.0);
  });

  it('handles CR suffix (credit)', () => {
    expect(parseAmount('100.00 CR')).toBe(100.0);
  });

  it('handles DR suffix (debit)', () => {
    expect(parseAmount('100.00 DR')).toBe(-100.0);
  });

  it('handles European decimal format', () => {
    // European format: periods as thousands, comma as decimal
    expect(parseAmount('1.234,56')).toBe(1234.56);
  });

  it('handles larger European decimal format', () => {
    expect(parseAmount('12.345,67')).toBe(12345.67);
  });

  it('handles European format with multiple thousand groups', () => {
    expect(parseAmount('1.234.567,89')).toBe(1234567.89);
  });

  it('handles Euro symbol', () => {
    expect(parseAmount('€1,234.56')).toBe(1234.56);
  });

  it('handles Pound symbol', () => {
    expect(parseAmount('£500.00')).toBe(500.0);
  });
});

describe('detectDateFormat', () => {
  it('detects named month format', () => {
    const result = detectDateFormat([['January 15, 2024'], ['February 20, 2024']], 0);
    expect(result).toBe('named_month');
  });

  it('detects ISO format YYYY-MM-DD', () => {
    const result = detectDateFormat([['2024-01-15'], ['2024-02-20']], 0);
    expect(result).toBe('YYYY-MM-DD');
  });

  it('detects DD/MM/YYYY when day > 12', () => {
    const result = detectDateFormat([['15/01/2024'], ['25/02/2024']], 0);
    expect(result).toBe('DD/MM/YYYY');
  });

  it('detects MM/DD/YYYY when second number > 12', () => {
    const result = detectDateFormat([['01/15/2024'], ['02/25/2024']], 0);
    expect(result).toBe('MM/DD/YYYY');
  });

  it('defaults to MM/DD/YYYY for ambiguous dates', () => {
    const result = detectDateFormat([['01/05/2024'], ['02/08/2024']], 0);
    expect(result).toBe('MM/DD/YYYY');
  });

  it('returns null for empty rows', () => {
    const result = detectDateFormat([], 0);
    expect(result).toBeNull();
  });

  it('returns null for invalid dateIdx', () => {
    const result = detectDateFormat([['2024-01-15']], -1);
    expect(result).toBeNull();
  });
});

describe('parseDateWithFormat', () => {
  it('parses named month format', () => {
    const result = parseDateWithFormat('January 15, 2024', 'named_month');
    expect(result).toBe('2024-01-15');
  });

  it('parses ISO format', () => {
    const result = parseDateWithFormat('2024-01-15', 'YYYY-MM-DD');
    expect(result).toBe('2024-01-15');
  });

  it('parses DD/MM/YYYY format', () => {
    const result = parseDateWithFormat('15/01/2024', 'DD/MM/YYYY');
    expect(result).toBe('2024-01-15');
  });

  it('parses MM/DD/YYYY format', () => {
    const result = parseDateWithFormat('01/15/2024', 'MM/DD/YYYY');
    expect(result).toBe('2024-01-15');
  });

  it('handles 2-digit year (>50 = 1900s)', () => {
    const result = parseDateWithFormat('01/15/95', 'MM/DD/YYYY');
    expect(result).toBe('1995-01-15');
  });

  it('handles 2-digit year (<=50 = 2000s)', () => {
    const result = parseDateWithFormat('01/15/24', 'MM/DD/YYYY');
    expect(result).toBe('2024-01-15');
  });

  it('pads single digit month/day', () => {
    const result = parseDateWithFormat('1/5/2024', 'MM/DD/YYYY');
    expect(result).toBe('2024-01-05');
  });

  it('returns null for empty string', () => {
    const result = parseDateWithFormat('', 'MM/DD/YYYY');
    expect(result).toBeNull();
  });

  it('returns null for null', () => {
    const result = parseDateWithFormat(null, 'MM/DD/YYYY');
    expect(result).toBeNull();
  });

  it('handles date with dots separator', () => {
    const result = parseDateWithFormat('15.01.2024', 'DD/MM/YYYY');
    expect(result).toBe('2024-01-15');
  });

  it('handles date with dashes separator', () => {
    const result = parseDateWithFormat('01-15-2024', 'MM/DD/YYYY');
    expect(result).toBe('2024-01-15');
  });
});
