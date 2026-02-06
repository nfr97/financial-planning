/**
 * Tests for lib/retirement-simulator.js
 * Tests the extracted RetirementSimulator class (Monte Carlo engine)
 */

import { describe, it, expect, vi } from 'vitest';
import { RetirementSimulator } from '../lib/retirement-simulator.js';

/**
 * Helper to create default simulation params
 */
function makeParams(overrides = {}) {
  return {
    currentAge: 30,
    retirementAge: 65,
    expectedReturn: 7,
    returnVolatility: 0, // zero volatility for deterministic tests
    inflationRate: 0,
    annualSpending: 40000,
    yearsInRetirement: 30,
    currentSavings: 100000,
    annualContribution: 10000,
    numSimulations: 10,
    ...overrides,
  };
}

describe('RetirementSimulator', () => {
  describe('constructor', () => {
    it('initializes with params and empty results', () => {
      const params = makeParams();
      const sim = new RetirementSimulator(params);
      expect(sim.params).toBe(params);
      expect(sim.lifeEvents).toEqual([]);
      expect(sim.allEndingBalances).toEqual([]);
      expect(sim.samplePaths).toEqual([]);
    });

    it('accepts life events', () => {
      const events = [
        { name: 'College', type: 'expense', amount: 20000, startAge: 50, duration: 4 },
      ];
      const sim = new RetirementSimulator(makeParams(), events);
      expect(sim.lifeEvents).toBe(events);
    });

    it('accepts a custom formatCurrency option', () => {
      const fmt = (v) => `$${v}`;
      const sim = new RetirementSimulator(makeParams(), [], { formatCurrency: fmt });
      expect(sim.formatCurrency(100)).toBe('$100');
    });
  });

  describe('runSingleSimulation', () => {
    it('returns a positive final balance for healthy params', () => {
      const sim = new RetirementSimulator(makeParams());
      const result = sim.runSingleSimulation();
      expect(result.finalBalance).toBeGreaterThan(0);
    });

    it('returns 0 for underfunded scenario', () => {
      const params = makeParams({
        currentSavings: 0,
        annualContribution: 0,
        annualSpending: 100000,
        expectedReturn: 0,
        returnVolatility: 0,
      });
      const sim = new RetirementSimulator(params);
      const result = sim.runSingleSimulation();
      expect(result.finalBalance).toBe(0);
    });

    it('saves path when requested', () => {
      const sim = new RetirementSimulator(makeParams());
      const result = sim.runSingleSimulation(true);
      expect(result.path).not.toBeNull();
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[0]).toHaveProperty('age');
      expect(result.path[0]).toHaveProperty('balance');
    });

    it('does not save path by default', () => {
      const sim = new RetirementSimulator(makeParams());
      const result = sim.runSingleSimulation();
      expect(result.path).toBeNull();
    });

    it('handles advanced mode with multiple account types', () => {
      const params = makeParams({
        advancedMode: true,
        accounts: {
          traditional401k: 50000,
          roth401k: 20000,
          traditionalIRA: 10000,
          rothIRA: 15000,
          taxable: 5000,
        },
        contributions: {
          traditional401k: 5000,
          roth401k: 3000,
          traditionalIRA: 1000,
          rothIRA: 1000,
          taxable: 0,
        },
      });
      const sim = new RetirementSimulator(params);
      const result = sim.runSingleSimulation();
      expect(result.finalBalance).toBeGreaterThan(0);
    });

    it('applies Social Security income at the specified age', () => {
      const paramsNoSS = makeParams({
        currentSavings: 500000,
        annualContribution: 0,
        expectedReturn: 0,
        annualSpending: 50000,
        yearsInRetirement: 5,
        retirementAge: 65,
        currentAge: 65,
      });
      const paramsWithSS = {
        ...paramsNoSS,
        ssAnnualBenefit: 20000,
        ssStartAge: 65,
      };

      const simNoSS = new RetirementSimulator(paramsNoSS);
      const simWithSS = new RetirementSimulator(paramsWithSS);

      const resultNoSS = simNoSS.runSingleSimulation();
      const resultWithSS = simWithSS.runSingleSimulation();

      // With SS, should have more money left
      expect(resultWithSS.finalBalance).toBeGreaterThan(resultNoSS.finalBalance);
    });

    it('applies life events during accumulation', () => {
      const baseParams = makeParams({
        expectedReturn: 0,
        returnVolatility: 0,
        currentAge: 30,
        retirementAge: 35,
        yearsInRetirement: 5,
        currentSavings: 100000,
        annualContribution: 0,
        annualSpending: 0,
      });

      const events = [
        { name: 'Side gig', type: 'income', amount: 10000, startAge: 30, duration: 5 },
      ];

      const simNoEvents = new RetirementSimulator(baseParams);
      const simWithEvents = new RetirementSimulator(baseParams, events);

      const resultNo = simNoEvents.runSingleSimulation();
      const resultWith = simWithEvents.runSingleSimulation();

      expect(resultWith.finalBalance).toBeGreaterThan(resultNo.finalBalance);
    });
  });

  describe('runSimulations', () => {
    it('runs the specified number of simulations', async () => {
      const sim = new RetirementSimulator(makeParams({ numSimulations: 50 }));
      await sim.runSimulations();
      expect(sim.allEndingBalances.length).toBe(50);
    });

    it('calls progress callback', async () => {
      const onProgress = vi.fn();
      const sim = new RetirementSimulator(makeParams({ numSimulations: 100 }));
      await sim.runSimulations(onProgress);
      expect(onProgress).toHaveBeenCalled();
      // Last call should be 100%
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('collects sample paths (up to 30)', async () => {
      const sim = new RetirementSimulator(makeParams({ numSimulations: 50 }));
      await sim.runSimulations();
      expect(sim.samplePaths.length).toBe(30);
    });
  });

  describe('getStatistics', () => {
    it('returns zeros for empty data', () => {
      const sim = new RetirementSimulator(makeParams());
      const stats = sim.getStatistics();
      expect(stats.successRate).toBe(0);
      expect(stats.median).toBe(0);
    });

    it('calculates correct statistics after simulation', async () => {
      const sim = new RetirementSimulator(
        makeParams({ numSimulations: 100, returnVolatility: 0, expectedReturn: 7 })
      );
      await sim.runSimulations();
      const stats = sim.getStatistics();

      // With zero volatility, all simulations should succeed identically
      expect(stats.successRate).toBe(100);
      expect(stats.median).toBeGreaterThan(0);
      // With zero volatility, p10 === p90 === median
      expect(stats.percentile10).toBeCloseTo(stats.median, 0);
      expect(stats.percentile90).toBeCloseTo(stats.median, 0);
    });

    it('reports partial success rate for marginal scenario', async () => {
      // Use nonzero volatility so some simulations fail
      const sim = new RetirementSimulator(
        makeParams({
          numSimulations: 1000,
          returnVolatility: 20,
          expectedReturn: 2,
          currentSavings: 50000,
          annualContribution: 5000,
          annualSpending: 60000,
        })
      );
      await sim.runSimulations();
      const stats = sim.getStatistics();

      // Should be between 0 and 100 (not all succeed, not all fail)
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThan(100);
    });
  });

  describe('getHistogramData', () => {
    it('returns no-data placeholder when empty', () => {
      const sim = new RetirementSimulator(makeParams());
      const hist = sim.getHistogramData();
      expect(hist.labels).toEqual(['No Data']);
      expect(hist.data).toEqual([0]);
    });

    it('returns correct number of bins after simulation', async () => {
      const sim = new RetirementSimulator(makeParams({ numSimulations: 100 }));
      await sim.runSimulations();
      const hist = sim.getHistogramData(10);
      expect(hist.labels.length).toBe(10);
      expect(hist.data.length).toBe(10);
    });

    it('uses custom formatCurrency for labels', async () => {
      const fmt = vi.fn((v) => `€${Math.round(v)}`);
      const sim = new RetirementSimulator(makeParams({ numSimulations: 20 }), [], {
        formatCurrency: fmt,
      });
      await sim.runSimulations();
      sim.getHistogramData(5);
      expect(fmt).toHaveBeenCalled();
    });

    it('handles all-same-value edge case', async () => {
      const sim = new RetirementSimulator(
        makeParams({
          numSimulations: 10,
          expectedReturn: 0,
          returnVolatility: 0,
        })
      );
      await sim.runSimulations();
      const hist = sim.getHistogramData(5);
      // All balances identical → all in one bin
      const totalCount = hist.data.reduce((a, b) => a + b, 0);
      expect(totalCount).toBe(10);
    });
  });

  describe('RMD integration', () => {
    it('applies RMD withdrawals for ages 73+', () => {
      const params = makeParams({
        currentAge: 73,
        retirementAge: 73,
        yearsInRetirement: 1,
        expectedReturn: 0,
        returnVolatility: 0,
        inflationRate: 0,
        annualSpending: 0,
        advancedMode: true,
        accounts: {
          traditional401k: 500000,
          roth401k: 0,
          traditionalIRA: 0,
          rothIRA: 0,
          taxable: 0,
        },
        contributions: {
          traditional401k: 0,
          roth401k: 0,
          traditionalIRA: 0,
          rothIRA: 0,
          taxable: 0,
        },
      });

      const sim = new RetirementSimulator(params);
      const result = sim.runSingleSimulation();

      // RMD should have reduced the traditional balance
      // At 73, distribution period is 26.5, so RMD = 500000/26.5 ≈ 18868
      // Since spending is 0, the RMD is still withdrawn but excess goes... nowhere (it's consumed)
      // Final balance should be less than 500000
      expect(result.finalBalance).toBeLessThan(500000);
    });
  });
});
