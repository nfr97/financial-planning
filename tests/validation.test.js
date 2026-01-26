/**
 * Tests for validation.js
 */

import { describe, it, expect } from 'vitest';
import {
  validateField,
  validateRetirementParams,
  validateBudgetAllocations,
  validateSessionSchema,
  parseCurrency,
  parseInteger,
} from '../lib/validation.js';

describe('validateField', () => {
  describe('required validation', () => {
    it('fails when required field is empty', () => {
      const result = validateField('', { required: true }, 'Age');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('fails when required field is undefined', () => {
      const result = validateField(undefined, { required: true }, 'Age');
      expect(result.valid).toBe(false);
    });

    it('passes when required field has value', () => {
      const result = validateField('30', { required: true, type: 'integer' }, 'Age');
      expect(result.valid).toBe(true);
    });

    it('uses default when field is empty and not required', () => {
      const result = validateField('', { default: 65 }, 'Retirement Age');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(65);
    });
  });

  describe('number validation', () => {
    it('parses valid numbers', () => {
      const result = validateField('123.45', { type: 'number' }, 'Amount');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(123.45);
    });

    it('parses currency strings', () => {
      const result = validateField('$1,234.56', { type: 'number' }, 'Salary');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(1234.56);
    });

    it('fails on invalid number strings', () => {
      const result = validateField('abc', { type: 'number' }, 'Amount');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('validates minimum value', () => {
      const result = validateField(5, { type: 'number', min: 10 }, 'Age');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('validates maximum value', () => {
      const result = validateField(150, { type: 'number', max: 120 }, 'Age');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 120');
    });

    it('validates positive constraint', () => {
      const result = validateField(-100, { type: 'number', positive: true }, 'Savings');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });
  });

  describe('integer validation', () => {
    it('parses valid integers', () => {
      const result = validateField('30', { type: 'integer' }, 'Age');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(30);
    });

    it('fails on decimal values', () => {
      const result = validateField('30.5', { type: 'integer' }, 'Age');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('whole number');
    });
  });

  describe('percentage validation', () => {
    it('parses percentage strings', () => {
      const result = validateField('50%', { type: 'percentage' }, 'Rate');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(50);
    });

    it('parses plain numbers as percentages', () => {
      const result = validateField('25', { type: 'percentage' }, 'Rate');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(25);
    });
  });
});

describe('validateRetirementParams', () => {
  it('validates age sequence', () => {
    const result = validateRetirementParams({
      currentAge: 65,
      retirementAge: 60,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Current age must be less than retirement age');
  });

  it('validates retirement vs life expectancy', () => {
    const result = validateRetirementParams({
      currentAge: 30,
      retirementAge: 90,
      lifeExpectancy: 85,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Retirement age must be less than life expectancy');
  });

  it('validates Social Security age range', () => {
    const resultTooEarly = validateRetirementParams({ ssStartAge: 60 });
    expect(resultTooEarly.valid).toBe(false);
    expect(resultTooEarly.errors).toContain('Social Security cannot start before age 62');

    const resultTooLate = validateRetirementParams({ ssStartAge: 75 });
    expect(resultTooLate.valid).toBe(false);
    expect(resultTooLate.errors).toContain('Social Security claiming is capped at age 70');
  });

  it('validates negative values', () => {
    const result = validateRetirementParams({
      currentSavings: -1000,
      annualContribution: -500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Current savings cannot be negative');
    expect(result.errors).toContain('Annual contribution cannot be negative');
  });

  it('warns on optimistic returns', () => {
    const result = validateRetirementParams({ expectedReturn: 25 });
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Expected return over 20% is very optimistic');
  });

  it('warns on IRS contribution limits', () => {
    const result = validateRetirementParams({
      currentAge: 40,
      contributions: {
        traditional401k: 30000, // Over $23,000 limit for under 50
      },
    });
    expect(result.warnings.some((w) => w.includes('exceed IRS limit'))).toBe(true);
  });

  it('allows higher 401k for catch-up eligible (50+)', () => {
    const result = validateRetirementParams({
      currentAge: 55,
      contributions: {
        traditional401k: 30000, // Under $30,500 limit for 50+
      },
    });
    expect(result.warnings.filter((w) => w.includes('401(k)')).length).toBe(0);
  });

  it('passes valid params', () => {
    const result = validateRetirementParams({
      currentAge: 35,
      retirementAge: 65,
      lifeExpectancy: 90,
      ssStartAge: 67,
      currentSavings: 100000,
      annualContribution: 20000,
      expectedReturn: 7,
      returnVolatility: 15,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateBudgetAllocations', () => {
  it('fails when allocations do not sum to 100', () => {
    const result = validateBudgetAllocations({
      fixedCosts: 50,
      shortTerm: 10,
      longTerm: 20,
      guiltFree: 10, // Total: 90
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('sum to 100%');
  });

  it('fails on negative allocations', () => {
    const result = validateBudgetAllocations({
      fixedCosts: 60,
      shortTerm: -10,
      longTerm: 30,
      guiltFree: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Budget allocations cannot be negative');
  });

  it('warns on high fixed costs', () => {
    const result = validateBudgetAllocations({
      fixedCosts: 85,
      shortTerm: 5,
      longTerm: 5,
      guiltFree: 5,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Fixed costs over 80%'))).toBe(true);
  });

  it('warns on low long-term savings', () => {
    const result = validateBudgetAllocations({
      fixedCosts: 50,
      shortTerm: 5,
      longTerm: 5,
      guiltFree: 40,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Long-term savings below 10%'))).toBe(true);
  });

  it('passes valid allocations', () => {
    const result = validateBudgetAllocations({
      fixedCosts: 50,
      shortTerm: 10,
      longTerm: 20,
      guiltFree: 20,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateSessionSchema', () => {
  it('warns on missing version', () => {
    const result = validateSessionSchema({});
    expect(result.warnings).toContain('Session file missing version - attempting import anyway');
  });

  it('validates budget planner data type', () => {
    const result = validateSessionSchema({
      version: '1.0',
      budgetPlanner: 'invalid',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid budget planner data format');
  });

  it('validates life events as array', () => {
    const result = validateSessionSchema({
      version: '1.0',
      lifeEvents: { invalid: true },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Life events must be an array');
  });

  it('filters invalid life events with warning', () => {
    const result = validateSessionSchema({
      version: '1.0',
      lifeEvents: [
        { amount: 1000, startAge: 50 }, // Valid
        { invalid: true }, // Invalid - no amount
        { amount: 2000, startAge: 60 }, // Valid
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.data.lifeEvents).toHaveLength(2);
    expect(result.warnings.some((w) => w.includes('invalid life events were skipped'))).toBe(true);
  });

  it('validates transaction rules as object', () => {
    const result = validateSessionSchema({
      version: '1.0',
      transactionRules: ['invalid', 'array'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Transaction rules must be an object');
  });

  it('validates transaction data as array', () => {
    const result = validateSessionSchema({
      version: '1.0',
      transactionData: { invalid: true },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Transaction data must be an array');
  });

  it('returns cleaned data for valid session', () => {
    const result = validateSessionSchema({
      version: '1.0',
      exportedAt: '2024-01-15T10:00:00.000Z',
      budgetPlanner: { monthlyIncome: 5000 },
      lifeEvents: [{ amount: 1000, startAge: 50 }],
    });
    expect(result.valid).toBe(true);
    expect(result.data.budgetPlanner.monthlyIncome).toBe(5000);
    expect(result.data.lifeEvents).toHaveLength(1);
  });
});

describe('parseCurrency', () => {
  it('parses plain numbers', () => {
    expect(parseCurrency(1234.56).value).toBe(1234.56);
  });

  it('parses currency strings', () => {
    expect(parseCurrency('$1,234.56').value).toBe(1234.56);
  });

  it('parses strings with spaces', () => {
    expect(parseCurrency('$ 1,234 .56').value).toBe(1234.56);
  });

  it('returns default for empty values', () => {
    expect(parseCurrency('', 0).value).toBe(0);
    expect(parseCurrency(null, 100).value).toBe(100);
    expect(parseCurrency(undefined, 50).value).toBe(50);
  });

  it('returns error for invalid input', () => {
    const result = parseCurrency('abc', 0, 'Amount');
    expect(result.value).toBe(0);
    expect(result.error).toContain('Amount');
    expect(result.error).toContain('could not be parsed');
  });

  it('handles NaN input', () => {
    const result = parseCurrency(NaN, 0, 'Value');
    expect(result.value).toBe(0);
    expect(result.error).toContain('not a valid number');
  });
});

describe('parseInteger', () => {
  it('parses integer strings', () => {
    expect(parseInteger('30').value).toBe(30);
  });

  it('rounds decimal numbers', () => {
    expect(parseInteger(30.7).value).toBe(31);
    expect(parseInteger(30.2).value).toBe(30);
  });

  it('parses strings with formatting', () => {
    expect(parseInteger('1,000').value).toBe(1000);
  });

  it('returns default for empty values', () => {
    expect(parseInteger('', 65).value).toBe(65);
  });

  it('returns error for invalid input', () => {
    const result = parseInteger('abc', 0, 'Age');
    expect(result.value).toBe(0);
    expect(result.error).toContain('whole number');
  });
});
