import { describe, it, expect } from 'vitest';
import {
  categoryPatterns,
  categorizeWithConfidence,
  categorizeTransaction,
} from '../lib/categorization.js';

describe('categoryPatterns', () => {
  it('has required categories', () => {
    expect(categoryPatterns).toHaveProperty('fixed-costs');
    expect(categoryPatterns).toHaveProperty('short-term');
    expect(categoryPatterns).toHaveProperty('long-term');
    expect(categoryPatterns).toHaveProperty('guilt-free');
    expect(categoryPatterns).toHaveProperty('income');
  });

  it('fixed-costs patterns match rent', () => {
    const patterns = categoryPatterns['fixed-costs'];
    const matches = patterns.some((p) => p.test('RENT PAYMENT'));
    expect(matches).toBe(true);
  });

  it('fixed-costs patterns match utilities', () => {
    const patterns = categoryPatterns['fixed-costs'];
    const matches = patterns.some((p) => p.test('ELECTRIC COMPANY'));
    expect(matches).toBe(true);
  });

  it('guilt-free patterns match restaurants', () => {
    const patterns = categoryPatterns['guilt-free'];
    const matches = patterns.some((p) => p.test('CHIPOTLE MEXICAN GRILL'));
    expect(matches).toBe(true);
  });

  it('income patterns match payroll', () => {
    const patterns = categoryPatterns['income'];
    const matches = patterns.some((p) => p.test('PAYROLL DEPOSIT'));
    expect(matches).toBe(true);
  });
});

describe('categorizeWithConfidence', () => {
  it('categorizes rent as fixed-costs with high confidence', () => {
    const result = categorizeWithConfidence({ description: 'RENT PAYMENT', amount: -1500 });
    expect(result.category).toBe('fixed-costs');
    expect(result.confidence).toBe('high');
  });

  it('categorizes utility as fixed-costs', () => {
    const result = categorizeWithConfidence({ description: 'ELECTRIC COMPANY', amount: -150 });
    expect(result.category).toBe('fixed-costs');
  });

  it('categorizes insurance as fixed-costs', () => {
    const result = categorizeWithConfidence({ description: 'GEICO INSURANCE', amount: -100 });
    expect(result.category).toBe('fixed-costs');
  });

  it('categorizes Spotify as guilt-free', () => {
    const result = categorizeWithConfidence({ description: 'SPOTIFY PREMIUM', amount: -9.99 });
    expect(result.category).toBe('guilt-free');
  });

  it('categorizes Amazon as guilt-free', () => {
    const result = categorizeWithConfidence({ description: 'AMAZON.COM', amount: -45.99 });
    expect(result.category).toBe('guilt-free');
  });

  it('categorizes restaurant as guilt-free', () => {
    const result = categorizeWithConfidence({ description: 'CHIPOTLE MEXICAN', amount: -12.5 });
    expect(result.category).toBe('guilt-free');
  });

  it('categorizes payroll as income', () => {
    const result = categorizeWithConfidence({ description: 'PAYROLL DEPOSIT', amount: 2500 });
    expect(result.category).toBe('income');
  });

  it('categorizes 401k as long-term', () => {
    const result = categorizeWithConfidence({ description: '401K CONTRIBUTION', amount: -500 });
    expect(result.category).toBe('long-term');
  });

  it('returns uncategorized for unknown merchant', () => {
    const result = categorizeWithConfidence({ description: 'RANDOM STORE 123', amount: -25 });
    expect(result.category).toBe('uncategorized');
  });

  it('marks positive unknown as income with low confidence', () => {
    const result = categorizeWithConfidence({ description: 'UNKNOWN CREDIT', amount: 100 });
    expect(result.category).toBe('income');
    expect(result.confidence).toBe('low');
    expect(result.reason).toBe('positive-amount-no-pattern');
  });

  it('handles income pattern with negative amount', () => {
    // Edge case: payroll pattern but negative amount (e.g., returned payroll)
    const result = categorizeWithConfidence({ description: 'PAYROLL ADJUSTMENT', amount: -50 });
    expect(result.category).toBe('uncategorized');
    expect(result.reason).toBe('income-pattern-negative-amount');
  });

  it('treats positive expense pattern as refund', () => {
    // Positive amount but matches expense pattern (likely a refund)
    // Note: "AMAZON REFUND" matches both guilt-free (amazon) and income (refund) patterns
    // so it goes through conflict resolution
    const result = categorizeWithConfidence({ description: 'AMAZON REFUND', amount: 45.99 });
    expect(result.category).toBe('income');
    // Multiple patterns match, so conflict resolution by positive amount
    expect(result.reason).toBe('conflict-resolved-by-positive-amount');
  });

  it('treats single-match positive expense as refund', () => {
    // Use a description that only matches one expense pattern
    const result = categorizeWithConfidence({ description: 'SPOTIFY CREDIT', amount: 9.99 });
    expect(result.category).toBe('income');
    expect(result.reason).toBe('expense-pattern-positive-amount-likely-refund');
  });

  it('resolves conflicts with positive amount to income', () => {
    // If multiple categories match and amount is positive
    const result = categorizeWithConfidence({ description: 'PAYROLL INTEREST', amount: 100 });
    expect(result.category).toBe('income');
  });
});

describe('categorizeTransaction', () => {
  it('returns only the category string', () => {
    const result = categorizeTransaction({ description: 'RENT PAYMENT', amount: -1500 });
    expect(typeof result).toBe('string');
    expect(result).toBe('fixed-costs');
  });

  it('accepts custom patterns', () => {
    const customPatterns = {
      custom: [/test/i],
    };
    const result = categorizeTransaction(
      { description: 'TEST TRANSACTION', amount: -10 },
      customPatterns
    );
    expect(result).toBe('custom');
  });
});
