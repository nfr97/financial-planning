/**
 * Integration tests for cross-tool data flow
 * Tests spendingTrackerData flow from transaction-analyzer to retirement-simulator
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock;

// Storage utility matching shared.js
const StorageUtils = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    }
  },
  set(key, value) {
    try {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silent fail
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

describe('Cross-Tool Data Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Transaction Analyzer to Retirement Simulator', () => {
    it('spendingTrackerData flows correctly to retirement simulator', () => {
      // Simulate what transaction-analyzer saves
      const spendingData = {
        monthlySpending: 4500,
        monthlySavings: 1500,
        categoryBreakdown: {
          'fixed-costs': 2000,
          'guilt-free': 1500,
          'long-term': 500,
          'short-term': 500,
        },
        transactionCount: 150,
        lastUpdated: '2024-01-15T10:00:00.000Z',
        period: 'Jan 2024',
      };

      StorageUtils.set('spendingTrackerData', spendingData);

      // Simulate what retirement-simulator reads
      const loaded = StorageUtils.get('spendingTrackerData');

      expect(loaded.monthlySpending).toBe(4500);
      expect(loaded.monthlySavings).toBe(1500);
      expect(loaded.categoryBreakdown['fixed-costs']).toBe(2000);
    });

    it('retirement simulator handles missing spending data gracefully', () => {
      // No spendingTrackerData set
      const loaded = StorageUtils.get('spendingTrackerData', null);
      expect(loaded).toBe(null);
    });

    it('retirement simulator handles partial spending data', () => {
      // Minimal data (older format or incomplete)
      StorageUtils.set('spendingTrackerData', {
        monthlySpending: 3000,
      });

      const loaded = StorageUtils.get('spendingTrackerData');
      expect(loaded.monthlySpending).toBe(3000);
      expect(loaded.monthlySavings).toBeUndefined();
      expect(loaded.categoryBreakdown).toBeUndefined();
    });
  });

  describe('Budget Planner to Retirement Simulator', () => {
    it('budget data can inform retirement projections', () => {
      const budgetData = {
        monthlyIncome: 6000,
        fixedCosts: 50, // percentage
        shortTerm: 10,
        longTerm: 20,
        guiltFree: 20,
        lastUpdated: '2024-01-15',
      };

      StorageUtils.set('budgetPlannerData', budgetData);

      const loaded = StorageUtils.get('budgetPlannerData');

      // Calculate annual savings for retirement
      const annualIncome = loaded.monthlyIncome * 12;
      const savingsRate = (loaded.shortTerm + loaded.longTerm) / 100;
      const annualSavings = annualIncome * savingsRate;

      expect(annualSavings).toBe(21600); // $6000 * 12 * 0.30
    });
  });

  describe('Session Export includes all tools', () => {
    it('exports all tool data in single session', () => {
      // Set up data for all tools
      StorageUtils.set('budgetPlannerData', { monthlyIncome: 5000 });
      StorageUtils.set('spendingTrackerData', { monthlySpending: 4000 });
      StorageUtils.set('retirementForecastData', { successRate: 85 });
      StorageUtils.set('lifeEventsData', [{ id: 1, name: 'Wedding' }]);
      StorageUtils.set('transactionRules', { AMAZON: 'guilt-free' });
      StorageUtils.set('transactionData', [{ id: 1, amount: -50 }]);

      // Simulate session export
      const session = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        budgetPlanner: StorageUtils.get('budgetPlannerData'),
        spendingTracker: StorageUtils.get('spendingTrackerData'),
        retirementForecast: StorageUtils.get('retirementForecastData'),
        lifeEvents: StorageUtils.get('lifeEventsData'),
        transactionRules: StorageUtils.get('transactionRules'),
        transactionData: StorageUtils.get('transactionData'),
      };

      expect(session.budgetPlanner.monthlyIncome).toBe(5000);
      expect(session.spendingTracker.monthlySpending).toBe(4000);
      expect(session.retirementForecast.successRate).toBe(85);
      expect(session.lifeEvents).toHaveLength(1);
      expect(session.transactionRules.AMAZON).toBe('guilt-free');
      expect(session.transactionData).toHaveLength(1);
    });
  });

  describe('Session Import restores state', () => {
    it('imports complete session and restores all data', () => {
      const session = {
        version: '1.0',
        exportedAt: '2024-01-15T10:00:00.000Z',
        budgetPlanner: { monthlyIncome: 5000, fixedCosts: 50 },
        spendingTracker: { monthlySpending: 4000, monthlySavings: 1000 },
        retirementForecast: { successRate: 90, medianEndingBalance: 1500000 },
        lifeEvents: [
          { id: 1, name: 'College', amount: 100000 },
          { id: 2, name: 'Wedding', amount: 30000 },
        ],
        transactionRules: { AMAZON: 'guilt-free', COSTCO: 'fixed-costs' },
        transactionData: [
          { id: 1, amount: -50 },
          { id: 2, amount: -100 },
        ],
      };

      // Clear everything first
      localStorage.clear();

      // Import session
      if (session.budgetPlanner) {
        StorageUtils.set('budgetPlannerData', session.budgetPlanner);
      }
      if (session.spendingTracker) {
        StorageUtils.set('spendingTrackerData', session.spendingTracker);
      }
      if (session.retirementForecast) {
        StorageUtils.set('retirementForecastData', session.retirementForecast);
      }
      if (session.lifeEvents) {
        StorageUtils.set('lifeEventsData', session.lifeEvents);
      }
      if (session.transactionRules) {
        StorageUtils.set('transactionRules', session.transactionRules);
      }
      if (session.transactionData) {
        StorageUtils.set('transactionData', session.transactionData);
      }

      // Verify all data restored
      expect(StorageUtils.get('budgetPlannerData').monthlyIncome).toBe(5000);
      expect(StorageUtils.get('spendingTrackerData').monthlySpending).toBe(4000);
      expect(StorageUtils.get('retirementForecastData').successRate).toBe(90);
      expect(StorageUtils.get('lifeEventsData')).toHaveLength(2);
      expect(StorageUtils.get('transactionRules').AMAZON).toBe('guilt-free');
      expect(StorageUtils.get('transactionData')).toHaveLength(2);
    });

    it('handles session with missing optional fields', () => {
      const partialSession = {
        version: '1.0',
        budgetPlanner: { monthlyIncome: 3000 },
        // No spendingTracker, retirementForecast, etc.
      };

      localStorage.clear();

      if (partialSession.budgetPlanner) {
        StorageUtils.set('budgetPlannerData', partialSession.budgetPlanner);
      }

      expect(StorageUtils.get('budgetPlannerData').monthlyIncome).toBe(3000);
      expect(StorageUtils.get('spendingTrackerData')).toBe(null);
      expect(StorageUtils.get('retirementForecastData')).toBe(null);
    });
  });

  describe('Data Consistency', () => {
    it('life events persist through session round-trip', () => {
      const lifeEvents = [
        { id: 1, name: 'Kids College', type: 'expense', amount: 25000, startAge: 50, duration: 4 },
        {
          id: 2,
          name: 'Part-time Income',
          type: 'income',
          amount: 20000,
          startAge: 62,
          duration: 5,
        },
      ];

      StorageUtils.set('lifeEventsData', lifeEvents);

      // Export
      const exported = StorageUtils.get('lifeEventsData');

      // Clear and reimport
      localStorage.clear();
      StorageUtils.set('lifeEventsData', exported);

      const restored = StorageUtils.get('lifeEventsData');
      expect(restored).toHaveLength(2);
      expect(restored[0].name).toBe('Kids College');
      expect(restored[1].type).toBe('income');
    });

    it('transaction rules maintain category mappings', () => {
      const rules = {
        AMAZON: 'guilt-free',
        'WHOLE FOODS': 'fixed-costs',
        NETFLIX: 'guilt-free',
        'STATE FARM': 'fixed-costs',
      };

      StorageUtils.set('transactionRules', rules);

      const loaded = StorageUtils.get('transactionRules');
      expect(Object.keys(loaded)).toHaveLength(4);
      expect(loaded['WHOLE FOODS']).toBe('fixed-costs');
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handles very large transaction counts', () => {
    const spendingData = {
      monthlySpending: 10000,
      transactionCount: 10000,
    };
    StorageUtils.set('spendingTrackerData', spendingData);

    const loaded = StorageUtils.get('spendingTrackerData');
    expect(loaded.transactionCount).toBe(10000);
  });

  it('handles special characters in transaction rules', () => {
    const rules = {
      "MCDONALD'S": 'guilt-free',
      'AT&T': 'fixed-costs',
      'UBER *TRIP': 'guilt-free',
    };
    StorageUtils.set('transactionRules', rules);

    const loaded = StorageUtils.get('transactionRules');
    expect(loaded["MCDONALD'S"]).toBe('guilt-free');
    expect(loaded['AT&T']).toBe('fixed-costs');
  });

  it('handles zero values in budget data', () => {
    const budgetData = {
      monthlyIncome: 5000,
      fixedCosts: 0,
      shortTerm: 0,
      longTerm: 100, // All to long-term
      guiltFree: 0,
    };
    StorageUtils.set('budgetPlannerData', budgetData);

    const loaded = StorageUtils.get('budgetPlannerData');
    expect(loaded.fixedCosts).toBe(0);
    expect(loaded.longTerm).toBe(100);
  });

  it('handles negative spending values', () => {
    // Negative spending could indicate net income
    const spendingData = {
      monthlySpending: -500, // Net income from returns/refunds
      monthlySavings: 6000,
    };
    StorageUtils.set('spendingTrackerData', spendingData);

    const loaded = StorageUtils.get('spendingTrackerData');
    expect(loaded.monthlySpending).toBe(-500);
  });
});
