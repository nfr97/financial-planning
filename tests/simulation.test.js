import { describe, it, expect, vi } from 'vitest';
import {
  generateNormalRandom,
  getLifeEventImpact,
  calculateTaxRate,
  initializeAccounts,
  getTotalBalance,
  applyMarketReturns,
  addContributions,
  withdrawFromAccounts,
} from '../lib/simulation.js';

describe('generateNormalRandom', () => {
  it('returns mean when random returns specific values', () => {
    // When u1 = 0.5 and u2 = 0.25, Box-Muller gives z0 ≈ 0
    const mockRandom = vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.25);
    const result = generateNormalRandom(100, 10, mockRandom);
    // z0 = sqrt(-2*ln(0.5)) * cos(2*PI*0.25) = sqrt(1.386) * 0 = 0
    expect(result).toBeCloseTo(100, 1);
  });

  it('respects standard deviation', () => {
    // Use seeded random for deterministic test
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Run many iterations to check distribution
    const results = [];
    for (let i = 0; i < 10000; i++) {
      results.push(generateNormalRandom(100, 10, seededRandom));
    }
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    // Allow 2 standard errors of tolerance
    const standardError = 10 / Math.sqrt(10000);
    expect(mean).toBeGreaterThan(100 - 2 * standardError);
    expect(mean).toBeLessThan(100 + 2 * standardError);
    expect(stdDev).toBeGreaterThan(8); // Within 20% of target std dev
    expect(stdDev).toBeLessThan(12);
  });

  it('handles edge case where random returns exactly 0', () => {
    // u1=0 would cause Math.log(0)=-Infinity, but should be clamped to Number.EPSILON
    const mockRandom = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.5);
    const result = generateNormalRandom(100, 10, mockRandom);
    expect(Number.isFinite(result)).toBe(true);
    expect(typeof result).toBe('number');
  });

  it('uses Math.random by default', () => {
    const result = generateNormalRandom(0, 1);
    expect(typeof result).toBe('number');
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe('getLifeEventImpact', () => {
  it('returns zero impact when no events', () => {
    const result = getLifeEventImpact(40, []);
    expect(result.expense).toBe(0);
    expect(result.income).toBe(0);
  });

  it('returns expense impact for active expense event', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 35, duration: 10 }];
    const result = getLifeEventImpact(40, events);
    expect(result.expense).toBe(5000);
    expect(result.income).toBe(0);
  });

  it('returns income impact for active income event', () => {
    const events = [{ type: 'income', amount: 3000, startAge: 35, duration: 10 }];
    const result = getLifeEventImpact(40, events);
    expect(result.expense).toBe(0);
    expect(result.income).toBe(3000);
  });

  it('returns zero for events not yet started', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 50, duration: 10 }];
    const result = getLifeEventImpact(40, events);
    expect(result.expense).toBe(0);
  });

  it('returns zero for events that have ended', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 30, duration: 5 }];
    const result = getLifeEventImpact(40, events);
    expect(result.expense).toBe(0);
  });

  it('sums multiple active events', () => {
    const events = [
      { type: 'expense', amount: 5000, startAge: 35, duration: 20 },
      { type: 'expense', amount: 3000, startAge: 38, duration: 15 },
      { type: 'income', amount: 2000, startAge: 40, duration: 5 },
    ];
    const result = getLifeEventImpact(42, events);
    expect(result.expense).toBe(8000);
    expect(result.income).toBe(2000);
  });

  it('handles event at exact start age', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 40, duration: 5 }];
    const result = getLifeEventImpact(40, events);
    expect(result.expense).toBe(5000);
  });

  it('handles event at age just before end', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 40, duration: 5 }];
    const result = getLifeEventImpact(44, events);
    expect(result.expense).toBe(5000);
  });

  it('handles event at exact end age (not included)', () => {
    const events = [{ type: 'expense', amount: 5000, startAge: 40, duration: 5 }];
    const result = getLifeEventImpact(45, events);
    expect(result.expense).toBe(0);
  });
});

describe('calculateTaxRate', () => {
  it('returns 10% for lowest bracket', () => {
    expect(calculateTaxRate(10000, 0)).toBe(0.1);
  });

  it('returns 12% for second bracket', () => {
    expect(calculateTaxRate(30000, 0)).toBe(0.12);
  });

  it('returns 22% for third bracket', () => {
    expect(calculateTaxRate(70000, 0)).toBe(0.22);
  });

  it('returns 24% for fourth bracket', () => {
    expect(calculateTaxRate(150000, 0)).toBe(0.24);
  });

  it('returns 32% for fifth bracket', () => {
    expect(calculateTaxRate(220000, 0)).toBe(0.32);
  });

  it('returns 35% for sixth bracket', () => {
    expect(calculateTaxRate(400000, 0)).toBe(0.35);
  });

  it('returns 37% for highest bracket', () => {
    expect(calculateTaxRate(700000, 0)).toBe(0.37);
  });

  it('includes 85% of SS income in calculation', () => {
    // With 0 withdrawal and 50000 SS income, total = 42500 (85% of 50000)
    expect(calculateTaxRate(0, 50000)).toBe(0.12);
  });
});

describe('initializeAccounts', () => {
  it('initializes simple mode with all in traditional401k', () => {
    const params = {
      advancedMode: false,
      currentSavings: 100000,
      annualContribution: 10000,
    };
    const result = initializeAccounts(params);

    expect(result.balances.traditional401k).toBe(100000);
    expect(result.balances.roth401k).toBe(0);
    expect(result.balances.taxable).toBe(0);
    expect(result.contributions.traditional401k).toBe(10000);
  });

  it('initializes advanced mode with provided accounts', () => {
    const params = {
      advancedMode: true,
      accounts: {
        traditional401k: 50000,
        roth401k: 30000,
        traditionalIRA: 20000,
        rothIRA: 10000,
        taxable: 5000,
      },
      contributions: {
        traditional401k: 5000,
        roth401k: 3000,
        traditionalIRA: 2000,
        rothIRA: 1000,
        taxable: 500,
      },
    };
    const result = initializeAccounts(params);

    expect(result.balances.traditional401k).toBe(50000);
    expect(result.balances.roth401k).toBe(30000);
    expect(result.contributions.traditional401k).toBe(5000);
    expect(result.contributions.roth401k).toBe(3000);
  });

  it('handles missing account values in advanced mode', () => {
    const params = {
      advancedMode: true,
      accounts: { traditional401k: 50000 },
      contributions: { traditional401k: 5000 },
    };
    const result = initializeAccounts(params);

    expect(result.balances.traditional401k).toBe(50000);
    expect(result.balances.roth401k).toBe(0);
    expect(result.contributions.roth401k).toBe(0);
  });
});

describe('getTotalBalance', () => {
  it('sums all account balances', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 30000,
      rothIRA: 20000,
      taxable: 10000,
    };
    expect(getTotalBalance(balances)).toBe(210000);
  });

  it('returns 0 for empty balances', () => {
    const balances = {
      traditional401k: 0,
      roth401k: 0,
      traditionalIRA: 0,
      rothIRA: 0,
      taxable: 0,
    };
    expect(getTotalBalance(balances)).toBe(0);
  });
});

describe('applyMarketReturns', () => {
  it('applies positive returns', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 0,
      rothIRA: 0,
      taxable: 0,
    };
    applyMarketReturns(balances, 0.1); // 10% return

    expect(balances.traditional401k).toBeCloseTo(110000, 2);
    expect(balances.roth401k).toBeCloseTo(55000, 2);
  });

  it('applies negative returns', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 0,
      rothIRA: 0,
      taxable: 0,
    };
    applyMarketReturns(balances, -0.2); // -20% return

    expect(balances.traditional401k).toBeCloseTo(80000, 2);
    expect(balances.roth401k).toBeCloseTo(40000, 2);
  });
});

describe('addContributions', () => {
  it('adds contributions to each account', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 30000,
      rothIRA: 20000,
      taxable: 10000,
    };
    const contributions = {
      traditional401k: 5000,
      roth401k: 3000,
      traditionalIRA: 2000,
      rothIRA: 1000,
      taxable: 500,
    };
    addContributions(balances, contributions);

    expect(balances.traditional401k).toBe(105000);
    expect(balances.roth401k).toBe(53000);
    expect(balances.traditionalIRA).toBe(32000);
    expect(balances.rothIRA).toBe(21000);
    expect(balances.taxable).toBe(10500);
  });
});

describe('withdrawFromAccounts', () => {
  it('withdraws from taxable first', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 30000,
      rothIRA: 20000,
      taxable: 10000,
    };
    const remaining = withdrawFromAccounts(balances, 5000);

    expect(remaining).toBe(0);
    expect(balances.taxable).toBe(5000);
    expect(balances.traditional401k).toBe(100000);
  });

  it('withdraws from traditional401k after taxable is depleted', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 30000,
      rothIRA: 20000,
      taxable: 10000,
    };
    const remaining = withdrawFromAccounts(balances, 15000);

    expect(remaining).toBe(0);
    expect(balances.taxable).toBe(0);
    expect(balances.traditional401k).toBe(95000);
  });

  it('withdraws from Roth accounts last', () => {
    const balances = {
      traditional401k: 0,
      roth401k: 50000,
      traditionalIRA: 0,
      rothIRA: 20000,
      taxable: 0,
    };
    const remaining = withdrawFromAccounts(balances, 30000);

    expect(remaining).toBe(0);
    expect(balances.roth401k).toBe(20000);
    expect(balances.rothIRA).toBe(20000);
  });

  it('returns remaining amount if all accounts depleted', () => {
    const balances = {
      traditional401k: 10000,
      roth401k: 10000,
      traditionalIRA: 10000,
      rothIRA: 10000,
      taxable: 10000,
    };
    const remaining = withdrawFromAccounts(balances, 100000);

    expect(remaining).toBe(50000);
    expect(getTotalBalance(balances)).toBe(0);
  });

  it('handles withdrawal of exactly total balance', () => {
    const balances = {
      traditional401k: 10000,
      roth401k: 10000,
      traditionalIRA: 10000,
      rothIRA: 10000,
      taxable: 10000,
    };
    const remaining = withdrawFromAccounts(balances, 50000);

    expect(remaining).toBe(0);
    expect(getTotalBalance(balances)).toBe(0);
  });

  it('handles withdrawal of zero', () => {
    const balances = {
      traditional401k: 100000,
      roth401k: 50000,
      traditionalIRA: 30000,
      rothIRA: 20000,
      taxable: 10000,
    };
    const remaining = withdrawFromAccounts(balances, 0);

    expect(remaining).toBe(0);
    expect(getTotalBalance(balances)).toBe(210000);
  });
});

describe('Edge Cases', () => {
  describe('generateNormalRandom edge cases', () => {
    it('handles zero standard deviation (constant returns)', () => {
      const result = generateNormalRandom(0.07, 0);
      expect(result).toBe(0.07);
    });

    it('handles negative mean (bear market)', () => {
      const mockRandom = vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.25);
      const result = generateNormalRandom(-0.05, 0.1, mockRandom);
      // z0 = 0 when u2 = 0.25
      expect(result).toBeCloseTo(-0.05, 5);
    });

    it('handles extreme standard deviation', () => {
      const mockRandom = vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.25);
      const result = generateNormalRandom(0, 1, mockRandom);
      // Should still return a finite number
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('applyMarketReturns edge cases', () => {
    it('handles negative returns (-50%)', () => {
      const balances = {
        traditional401k: 1000000,
        roth401k: 0,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
      applyMarketReturns(balances, -0.5);
      expect(balances.traditional401k).toBe(500000);
    });

    it('handles zero return', () => {
      const balances = {
        traditional401k: 1000000,
        roth401k: 500000,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
      applyMarketReturns(balances, 0);
      expect(balances.traditional401k).toBe(1000000);
      expect(balances.roth401k).toBe(500000);
    });

    it('handles very large positive return (100%)', () => {
      const balances = {
        traditional401k: 1000000,
        roth401k: 0,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
      applyMarketReturns(balances, 1.0);
      expect(balances.traditional401k).toBe(2000000);
    });

    it('handles accounts with zero balance', () => {
      const balances = {
        traditional401k: 0,
        roth401k: 0,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
      applyMarketReturns(balances, 0.1);
      expect(getTotalBalance(balances)).toBe(0);
    });
  });

  describe('calculateTaxRate edge cases', () => {
    it('handles exact bracket boundaries', () => {
      // Exact boundary at $11,600
      expect(calculateTaxRate(11600, 0)).toBe(0.1);
      expect(calculateTaxRate(11601, 0)).toBe(0.12);

      // Exact boundary at $47,150
      expect(calculateTaxRate(47150, 0)).toBe(0.12);
      expect(calculateTaxRate(47151, 0)).toBe(0.22);
    });

    it('handles zero withdrawal with SS income', () => {
      const result = calculateTaxRate(0, 30000);
      // Total income = 30000 * 0.85 = 25500
      expect(result).toBe(0.12);
    });

    it('handles very high income', () => {
      expect(calculateTaxRate(1000000, 0)).toBe(0.37);
      expect(calculateTaxRate(10000000, 0)).toBe(0.37);
    });
  });

  describe('getLifeEventImpact edge cases', () => {
    it('handles very long duration event', () => {
      const events = [{ type: 'expense', amount: 5000, startAge: 30, duration: 100 }];
      expect(getLifeEventImpact(50, events).expense).toBe(5000);
      expect(getLifeEventImpact(100, events).expense).toBe(5000);
      expect(getLifeEventImpact(130, events).expense).toBe(0); // Past end
    });

    it('handles single-year event (duration=1)', () => {
      const events = [{ type: 'expense', amount: 50000, startAge: 65, duration: 1 }];
      expect(getLifeEventImpact(64, events).expense).toBe(0);
      expect(getLifeEventImpact(65, events).expense).toBe(50000);
      expect(getLifeEventImpact(66, events).expense).toBe(0);
    });

    it('handles large number of concurrent events', () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        type: 'expense',
        amount: 1000,
        startAge: 40,
        duration: 10,
      }));
      expect(getLifeEventImpact(45, events).expense).toBe(20000);
    });

    it('handles mixed income and expense offsetting', () => {
      const events = [
        { type: 'expense', amount: 10000, startAge: 40, duration: 10 },
        { type: 'income', amount: 10000, startAge: 40, duration: 10 },
      ];
      const impact = getLifeEventImpact(45, events);
      expect(impact.expense).toBe(10000);
      expect(impact.income).toBe(10000);
      // Net impact would be zero if caller subtracts
    });
  });

  describe('initializeAccounts edge cases', () => {
    it('handles very large balances ($1B)', () => {
      const params = {
        advancedMode: false,
        currentSavings: 1000000000,
        annualContribution: 100000000,
      };
      const result = initializeAccounts(params);
      expect(result.balances.traditional401k).toBe(1000000000);
      expect(result.contributions.traditional401k).toBe(100000000);
    });

    it('handles zero savings and contributions', () => {
      const params = {
        advancedMode: false,
        currentSavings: 0,
        annualContribution: 0,
      };
      const result = initializeAccounts(params);
      expect(getTotalBalance(result.balances)).toBe(0);
    });
  });
});
