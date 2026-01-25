import { describe, it, expect } from 'vitest';
import { SocialSecurityCalculator } from '../lib/social-security.js';

describe('SocialSecurityCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new SocialSecurityCalculator();
  });

  describe('getFullRetirementAge', () => {
    it('returns 65 for birth year 1937 and earlier', () => {
      expect(calculator.getFullRetirementAge(1937)).toBe(65);
      expect(calculator.getFullRetirementAge(1930)).toBe(65);
    });

    it('returns 65 + months for birth years 1938-1942', () => {
      expect(calculator.getFullRetirementAge(1938)).toBeCloseTo(65 + 2 / 12, 5);
      expect(calculator.getFullRetirementAge(1939)).toBeCloseTo(65 + 4 / 12, 5);
      expect(calculator.getFullRetirementAge(1940)).toBeCloseTo(65 + 6 / 12, 5);
      expect(calculator.getFullRetirementAge(1941)).toBeCloseTo(65 + 8 / 12, 5);
      expect(calculator.getFullRetirementAge(1942)).toBeCloseTo(65 + 10 / 12, 5);
    });

    it('returns 66 for birth years 1943-1954', () => {
      expect(calculator.getFullRetirementAge(1943)).toBe(66);
      expect(calculator.getFullRetirementAge(1950)).toBe(66);
      expect(calculator.getFullRetirementAge(1954)).toBe(66);
    });

    it('returns 66 + months for birth years 1955-1959', () => {
      expect(calculator.getFullRetirementAge(1955)).toBeCloseTo(66 + 2 / 12, 5);
      expect(calculator.getFullRetirementAge(1956)).toBeCloseTo(66 + 4 / 12, 5);
      expect(calculator.getFullRetirementAge(1957)).toBeCloseTo(66 + 6 / 12, 5);
      expect(calculator.getFullRetirementAge(1958)).toBeCloseTo(66 + 8 / 12, 5);
      expect(calculator.getFullRetirementAge(1959)).toBeCloseTo(66 + 10 / 12, 5);
    });

    it('returns 67 for birth year 1960 and later', () => {
      expect(calculator.getFullRetirementAge(1960)).toBe(67);
      expect(calculator.getFullRetirementAge(1990)).toBe(67);
      expect(calculator.getFullRetirementAge(2000)).toBe(67);
    });
  });

  describe('adjustBenefitForAge', () => {
    it('returns PIA when claiming at FRA', () => {
      const pia = 2000;
      const result = calculator.adjustBenefitForAge(pia, 67, 67);
      expect(result).toBe(2000);
    });

    it('reduces benefit for early claiming (within 36 months)', () => {
      const pia = 2000;
      // 12 months early = 12 * (5/9)/100 = 6.67% reduction
      const result = calculator.adjustBenefitForAge(pia, 66, 67);
      expect(result).toBeCloseTo(2000 * (1 - (12 * (5 / 9)) / 100), 2);
    });

    it('applies additional reduction beyond 36 months early', () => {
      const pia = 2000;
      // 48 months early: 36 * (5/9)/100 + 12 * (5/12)/100
      const reduction = (36 * (5 / 9)) / 100 + (12 * (5 / 12)) / 100;
      const result = calculator.adjustBenefitForAge(pia, 63, 67);
      expect(result).toBeCloseTo(2000 * (1 - reduction), 2);
    });

    it('increases benefit for delayed claiming', () => {
      const pia = 2000;
      // 12 months late = 8% increase
      const result = calculator.adjustBenefitForAge(pia, 68, 67);
      expect(result).toBeCloseTo(2000 * 1.08, 2);
    });

    it('increases benefit for 3 years delay', () => {
      const pia = 2000;
      // 36 months late = 24% increase
      const result = calculator.adjustBenefitForAge(pia, 70, 67);
      expect(result).toBeCloseTo(2000 * 1.24, 2);
    });

    it('handles fractional years', () => {
      const pia = 2000;
      // 6 months early
      const result = calculator.adjustBenefitForAge(pia, 66.5, 67);
      expect(result).toBeLessThan(2000);
      expect(result).toBeGreaterThan(calculator.adjustBenefitForAge(pia, 66, 67));
    });
  });

  describe('estimatePIA', () => {
    it('calculates PIA for low income (below first bend point)', () => {
      // Low income - all in 90% bracket
      const result = calculator.estimatePIA(30000, 35);
      expect(result).toBeGreaterThan(0);
      // AIME = 30000 * 35 / 420 = 2500
      // PIA = 2500 * 0.90 = 2250 (but capped at bend point)
    });

    it('calculates PIA for middle income', () => {
      const result = calculator.estimatePIA(75000, 35);
      expect(result).toBeGreaterThan(calculator.estimatePIA(30000, 35));
    });

    it('calculates PIA for high income', () => {
      const result = calculator.estimatePIA(150000, 35);
      expect(result).toBeGreaterThan(calculator.estimatePIA(75000, 35));
    });

    it('caps income at max taxable earnings', () => {
      // Income above max taxable should give same result
      const maxIncome = calculator.estimatePIA(168600, 35);
      const aboveMax = calculator.estimatePIA(200000, 35);
      expect(aboveMax).toBe(maxIncome);
    });

    it('uses at most 35 years of work history', () => {
      // More than 35 years should give same result as exactly 35
      const result35 = calculator.estimatePIA(100000, 35);
      const result40 = calculator.estimatePIA(100000, 40);
      expect(result40).toBe(result35);
    });

    it('scales down for fewer years worked', () => {
      const result35 = calculator.estimatePIA(100000, 35);
      const result20 = calculator.estimatePIA(100000, 20);
      expect(result20).toBeLessThan(result35);
    });

    it('returns a rounded integer', () => {
      const result = calculator.estimatePIA(75000, 30);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('getAnnualBenefit', () => {
    it('multiplies monthly benefit by 12', () => {
      expect(calculator.getAnnualBenefit(2000)).toBe(24000);
      expect(calculator.getAnnualBenefit(1500)).toBe(18000);
      expect(calculator.getAnnualBenefit(0)).toBe(0);
    });
  });

  describe('constructor options', () => {
    it('accepts custom bend points', () => {
      const customCalc = new SocialSecurityCalculator({
        bendPoint1: 1200,
        bendPoint2: 7500,
      });
      expect(customCalc.bendPoint1).toBe(1200);
      expect(customCalc.bendPoint2).toBe(7500);
    });

    it('accepts custom max taxable earnings', () => {
      const customCalc = new SocialSecurityCalculator({
        maxTaxableEarnings: 175000,
      });
      expect(customCalc.maxTaxableEarnings).toBe(175000);
    });

    it('uses defaults when no options provided', () => {
      const defaultCalc = new SocialSecurityCalculator();
      expect(defaultCalc.bendPoint1).toBe(1174);
      expect(defaultCalc.bendPoint2).toBe(7078);
      expect(defaultCalc.maxTaxableEarnings).toBe(168600);
    });
  });
});
