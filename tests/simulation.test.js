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
    // Run many iterations to check distribution
    const results = [];
    for (let i = 0; i < 1000; i++) {
      results.push(generateNormalRandom(100, 10));
    }
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    expect(mean).toBeCloseTo(100, 0);
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
});
