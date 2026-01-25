import { describe, it, expect } from 'vitest';
import { parseCSVLine } from '../lib/csv-utils.js';

describe('parseCSVLine', () => {
  it('parses simple CSV line', () => {
    const result = parseCSVLine('a,b,c');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
    expect(result[2]).toBe('c');
  });

  it('parses quoted fields with commas', () => {
    const result = parseCSVLine('"Hello, World",test,123');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Hello, World');
    expect(result[1]).toBe('test');
    expect(result[2]).toBe('123');
  });

  it('parses escaped quotes (RFC 4180)', () => {
    const result = parseCSVLine('"Say ""Hello""",test');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Say "Hello"');
    expect(result[1]).toBe('test');
  });

  it('handles empty fields', () => {
    const result = parseCSVLine('a,,c');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('');
    expect(result[2]).toBe('c');
  });

  it('trims whitespace from fields', () => {
    const result = parseCSVLine('  a  ,  b  ,  c  ');
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
    expect(result[2]).toBe('c');
  });

  it('handles single field', () => {
    const result = parseCSVLine('single');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('single');
  });

  it('handles empty line', () => {
    const result = parseCSVLine('');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('');
  });

  it('handles quoted field at end of line', () => {
    const result = parseCSVLine('a,b,"quoted"');
    expect(result).toHaveLength(3);
    expect(result[2]).toBe('quoted');
  });

  it('handles complex real-world bank CSV', () => {
    const result = parseCSVLine('01/15/2024,"AMAZON.COM*123456, WA","($45.99)",Shopping');
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('01/15/2024');
    expect(result[1]).toBe('AMAZON.COM*123456, WA');
    expect(result[2]).toBe('($45.99)');
    expect(result[3]).toBe('Shopping');
  });

  it('handles consecutive quoted fields', () => {
    const result = parseCSVLine('"a","b","c"');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
    expect(result[2]).toBe('c');
  });
});
