/**
 * Tests for tax-parameters.js
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFederalTax,
  getEffectiveTaxRate,
  getMarginalTaxRate,
  calculateRMD,
  calculateStateTax,
  getStateList,
  getContributionLimit,
  FEDERAL_TAX_BRACKETS_2024,
  RMD_PARAMETERS,
  STATE_TAX_RATES,
  CONTRIBUTION_LIMITS_2024,
} from '../lib/tax-parameters.js';

describe('Federal Tax Calculations', () => {
  describe('calculateFederalTax', () => {
    it('calculates tax for income in lowest bracket', () => {
      const tax = calculateFederalTax(10000);
      expect(tax).toBe(10000 * 0.1);
    });

    it('calculates tax for income spanning two brackets', () => {
      // $20,000: First $11,600 at 10%, remaining $8,400 at 12%
      const tax = calculateFederalTax(20000);
      const expected = 11600 * 0.1 + 8400 * 0.12;
      expect(tax).toBeCloseTo(expected, 2);
    });

    it('calculates tax for high income spanning multiple brackets', () => {
      // $100,000 single filer
      const tax = calculateFederalTax(100000);
      // 10% of $11,600 = $1,160
      // 12% of ($47,150 - $11,600) = $4,266
      // 22% of ($100,000 - $47,150) = $11,627
      const expected = 11600 * 0.1 + (47150 - 11600) * 0.12 + (100000 - 47150) * 0.22;
      expect(tax).toBeCloseTo(expected, 2);
    });

    it('handles zero income', () => {
      expect(calculateFederalTax(0)).toBe(0);
    });

    it('uses MFJ brackets when specified', () => {
      const singleTax = calculateFederalTax(50000, 'single');
      const mfjTax = calculateFederalTax(50000, 'mfj');
      expect(mfjTax).toBeLessThan(singleTax); // MFJ has wider brackets
    });
  });

  describe('getEffectiveTaxRate', () => {
    it('returns 0 for zero income', () => {
      expect(getEffectiveTaxRate(0)).toBe(0);
    });

    it('returns 10% for income fully in lowest bracket', () => {
      expect(getEffectiveTaxRate(10000)).toBeCloseTo(0.1, 4);
    });

    it('returns rate less than marginal for multi-bracket income', () => {
      const effective = getEffectiveTaxRate(100000);
      const marginal = getMarginalTaxRate(100000);
      expect(effective).toBeLessThan(marginal);
    });
  });

  describe('getMarginalTaxRate', () => {
    it('returns 10% for lowest bracket', () => {
      expect(getMarginalTaxRate(5000)).toBe(0.1);
    });

    it('returns 12% for second bracket', () => {
      expect(getMarginalTaxRate(20000)).toBe(0.12);
    });

    it('returns 22% for third bracket', () => {
      expect(getMarginalTaxRate(60000)).toBe(0.22);
    });

    it('returns 37% for highest bracket', () => {
      expect(getMarginalTaxRate(1000000)).toBe(0.37);
    });

    it('handles exact bracket boundary', () => {
      expect(getMarginalTaxRate(11600)).toBe(0.1); // At boundary, still in lower
      expect(getMarginalTaxRate(11601)).toBe(0.12); // Just over boundary
    });
  });
});

describe('Required Minimum Distribution (RMD)', () => {
  describe('calculateRMD', () => {
    it('returns not required for age under 73', () => {
      const result = calculateRMD(500000, 72);
      expect(result.required).toBe(false);
      expect(result.amount).toBe(0);
    });

    it('calculates RMD at age 73', () => {
      const balance = 500000;
      const result = calculateRMD(balance, 73);
      expect(result.required).toBe(true);
      expect(result.distributionPeriod).toBe(26.5);
      expect(result.amount).toBeCloseTo(balance / 26.5, 2);
    });

    it('calculates RMD at age 80', () => {
      const balance = 500000;
      const result = calculateRMD(balance, 80);
      expect(result.required).toBe(true);
      expect(result.distributionPeriod).toBe(20.2);
      expect(result.amount).toBeCloseTo(balance / 20.2, 2);
    });

    it('calculates RMD at age 90', () => {
      const balance = 500000;
      const result = calculateRMD(balance, 90);
      expect(result.required).toBe(true);
      expect(result.distributionPeriod).toBe(12.2);
      expect(result.amount).toBeCloseTo(balance / 12.2, 2);
    });

    it('handles age at max table value (120)', () => {
      const balance = 100000;
      const result = calculateRMD(balance, 120);
      expect(result.required).toBe(true);
      expect(result.distributionPeriod).toBe(2.0);
      expect(result.amount).toBe(50000);
    });

    it('handles age beyond table (121+)', () => {
      const balance = 100000;
      const result = calculateRMD(balance, 125);
      expect(result.required).toBe(true);
      expect(result.amount).toBe(50000); // Uses minimum period of 2.0
    });

    it('handles zero balance', () => {
      const result = calculateRMD(0, 75);
      expect(result.required).toBe(true);
      expect(result.amount).toBe(0);
    });
  });

  it('RMD start age is 73 per SECURE 2.0', () => {
    expect(RMD_PARAMETERS.startAge).toBe(73);
  });
});

describe('State Tax Calculations', () => {
  describe('calculateStateTax', () => {
    it('returns 0 for no-income-tax states', () => {
      expect(calculateStateTax(100000, 'FL')).toBe(0);
      expect(calculateStateTax(100000, 'TX')).toBe(0);
      expect(calculateStateTax(100000, 'WA')).toBe(0);
      expect(calculateStateTax(100000, 'NV')).toBe(0);
    });

    it('calculates tax for flat-tax states', () => {
      // Illinois: 4.95% flat tax
      expect(calculateStateTax(100000, 'IL')).toBeCloseTo(4950, 0);
    });

    it('calculates tax for progressive states using top rate', () => {
      // California: 13.3% top rate
      expect(calculateStateTax(100000, 'CA')).toBeCloseTo(13300, 0);
    });

    it('handles invalid state code', () => {
      expect(calculateStateTax(100000, 'XX')).toBe(0);
    });
  });

  describe('getStateList', () => {
    it('returns all states sorted by name', () => {
      const states = getStateList();
      expect(states.length).toBeGreaterThan(50); // 50 states + DC

      // Check sorting
      for (let i = 1; i < states.length; i++) {
        expect(states[i - 1].name.localeCompare(states[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it('includes no-tax states', () => {
      const states = getStateList();
      const florida = states.find((s) => s.code === 'FL');
      expect(florida).toBeDefined();
      expect(florida.hasIncomeTax).toBe(false);
      expect(florida.rate).toBe(0);
    });
  });

  it('has correct data for key states', () => {
    expect(STATE_TAX_RATES.CA.rate).toBeCloseTo(0.133, 3);
    expect(STATE_TAX_RATES.NY.rate).toBeCloseTo(0.109, 3);
    expect(STATE_TAX_RATES.FL.hasIncomeTax).toBe(false);
    expect(STATE_TAX_RATES.TX.hasIncomeTax).toBe(false);
  });
});

describe('Contribution Limits', () => {
  describe('getContributionLimit', () => {
    it('returns correct 401k limit for under 50', () => {
      expect(getContributionLimit('traditional401k', 40)).toBe(23000);
    });

    it('returns correct 401k limit with catch-up for 50+', () => {
      expect(getContributionLimit('traditional401k', 55)).toBe(30500);
    });

    it('returns correct IRA limit for under 50', () => {
      expect(getContributionLimit('traditionalIRA', 40)).toBe(7000);
    });

    it('returns correct IRA limit with catch-up for 50+', () => {
      expect(getContributionLimit('traditionalIRA', 55)).toBe(8000);
    });

    it('returns 0 for unknown account type', () => {
      expect(getContributionLimit('unknown', 40)).toBe(0);
    });
  });

  it('has correct 2024 limits', () => {
    expect(CONTRIBUTION_LIMITS_2024.traditional401k).toBe(23000);
    expect(CONTRIBUTION_LIMITS_2024.traditional401kCatchUp).toBe(7500);
    expect(CONTRIBUTION_LIMITS_2024.traditionalIRA).toBe(7000);
    expect(CONTRIBUTION_LIMITS_2024.traditionalIRACatchUp).toBe(1000);
  });
});

describe('Tax Bracket Data', () => {
  it('has correct 2024 single brackets', () => {
    expect(FEDERAL_TAX_BRACKETS_2024[0].max).toBe(11600);
    expect(FEDERAL_TAX_BRACKETS_2024[1].max).toBe(47150);
    expect(FEDERAL_TAX_BRACKETS_2024[2].max).toBe(100525);
  });

  it('brackets are continuous (no gaps)', () => {
    for (let i = 1; i < FEDERAL_TAX_BRACKETS_2024.length; i++) {
      expect(FEDERAL_TAX_BRACKETS_2024[i].min).toBe(FEDERAL_TAX_BRACKETS_2024[i - 1].max);
    }
  });

  it('rates are increasing', () => {
    for (let i = 1; i < FEDERAL_TAX_BRACKETS_2024.length; i++) {
      expect(FEDERAL_TAX_BRACKETS_2024[i].rate).toBeGreaterThan(
        FEDERAL_TAX_BRACKETS_2024[i - 1].rate
      );
    }
  });
});
