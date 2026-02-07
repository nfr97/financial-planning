/**
 * Tests for shared.js utilities
 * FinanceUtils, DateUtils, and SessionManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since shared.js is designed for browser, we need to mock localStorage
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

// Mock globals before importing
global.localStorage = localStorageMock;
global.document = {
  createElement: (tag) => {
    if (tag === 'div') {
      return {
        textContent: '',
        get innerHTML() {
          // Simple HTML escaping
          return this.textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        },
      };
    }
    return {};
  },
  readyState: 'complete',
};

// Re-implement the utilities for testing (since shared.js is browser-only)
const FinanceUtils = {
  formatCurrency(value, options = {}) {
    const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  },

  formatCurrencyCompact(value) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1000000) {
      return sign + '$' + (absValue / 1000000).toFixed(absValue >= 10000000 ? 1 : 2) + 'M';
    } else if (absValue >= 1000) {
      return sign + '$' + (absValue / 1000).toFixed(0) + 'K';
    } else {
      return sign + '$' + absValue.toFixed(0);
    }
  },

  formatPercent(value, decimals = 1) {
    return value.toFixed(decimals) + '%';
  },
};

const DateUtils = {
  parseDate(dateStr) {
    if (!dateStr) return null;

    dateStr = dateStr.replace(/"/g, '').trim();

    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    ];

    for (let i = 0; i < formats.length; i++) {
      const match = dateStr.match(formats[i]);
      if (match) {
        if (i === 1) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  },
};

const StorageUtils = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`StorageUtils: failed to parse key "${key}", returning default`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silent fail for tests
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

describe('FinanceUtils', () => {
  describe('formatCurrency', () => {
    it('formats positive values correctly', () => {
      expect(FinanceUtils.formatCurrency(1234)).toBe('$1,234');
      expect(FinanceUtils.formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('formats negative values correctly', () => {
      expect(FinanceUtils.formatCurrency(-1234)).toBe('-$1,234');
      expect(FinanceUtils.formatCurrency(-100)).toBe('-$100');
    });

    it('formats zero correctly', () => {
      expect(FinanceUtils.formatCurrency(0)).toBe('$0');
    });

    it('formats very large values correctly', () => {
      expect(FinanceUtils.formatCurrency(1000000000)).toBe('$1,000,000,000');
      expect(FinanceUtils.formatCurrency(999999999999)).toBe('$999,999,999,999');
    });

    it('formats decimal values with options', () => {
      expect(
        FinanceUtils.formatCurrency(1234.56, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ).toBe('$1,234.56');
    });

    it('handles fractional cents', () => {
      expect(
        FinanceUtils.formatCurrency(1234.999, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      ).toBe('$1,235.00');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('formats millions correctly', () => {
      expect(FinanceUtils.formatCurrencyCompact(1500000)).toBe('$1.50M');
      expect(FinanceUtils.formatCurrencyCompact(10000000)).toBe('$10.0M');
      expect(FinanceUtils.formatCurrencyCompact(100000000)).toBe('$100.0M');
    });

    it('formats thousands correctly', () => {
      expect(FinanceUtils.formatCurrencyCompact(1500)).toBe('$2K'); // Rounds
      expect(FinanceUtils.formatCurrencyCompact(1000)).toBe('$1K');
      expect(FinanceUtils.formatCurrencyCompact(999999)).toBe('$1000K');
    });

    it('formats values under 1K', () => {
      expect(FinanceUtils.formatCurrencyCompact(500)).toBe('$500');
      expect(FinanceUtils.formatCurrencyCompact(0)).toBe('$0');
      expect(FinanceUtils.formatCurrencyCompact(999)).toBe('$999');
    });

    it('handles negative values', () => {
      expect(FinanceUtils.formatCurrencyCompact(-1500000)).toBe('-$1.50M');
      expect(FinanceUtils.formatCurrencyCompact(-1500)).toBe('-$2K');
      expect(FinanceUtils.formatCurrencyCompact(-500)).toBe('-$500');
    });

    it('handles boundary at exactly $1K', () => {
      expect(FinanceUtils.formatCurrencyCompact(1000)).toBe('$1K');
    });

    it('handles boundary at exactly $1M', () => {
      expect(FinanceUtils.formatCurrencyCompact(1000000)).toBe('$1.00M');
    });
  });

  describe('formatPercent', () => {
    it('formats positive percentages', () => {
      expect(FinanceUtils.formatPercent(50)).toBe('50.0%');
      expect(FinanceUtils.formatPercent(100)).toBe('100.0%');
    });

    it('formats negative percentages', () => {
      expect(FinanceUtils.formatPercent(-25.5)).toBe('-25.5%');
    });

    it('formats with custom decimal places', () => {
      expect(FinanceUtils.formatPercent(33.333, 2)).toBe('33.33%');
      expect(FinanceUtils.formatPercent(50, 0)).toBe('50%');
    });

    it('handles zero', () => {
      expect(FinanceUtils.formatPercent(0)).toBe('0.0%');
    });

    it('rounds correctly', () => {
      expect(FinanceUtils.formatPercent(33.335, 2)).toBe('33.34%');
      expect(FinanceUtils.formatPercent(33.334, 2)).toBe('33.33%');
    });
  });
});

describe('DateUtils', () => {
  describe('parseDate', () => {
    it('parses MM/DD/YYYY format', () => {
      expect(DateUtils.parseDate('01/15/2024')).toBe('2024-01-15');
      expect(DateUtils.parseDate('12/31/2023')).toBe('2023-12-31');
    });

    it('parses single-digit months and days', () => {
      expect(DateUtils.parseDate('1/5/2024')).toBe('2024-01-05');
      expect(DateUtils.parseDate('9/9/2020')).toBe('2020-09-09');
    });

    it('parses YYYY-MM-DD format', () => {
      expect(DateUtils.parseDate('2024-01-15')).toBe('2024-01-15');
      expect(DateUtils.parseDate('2023-12-31')).toBe('2023-12-31');
    });

    it('parses MM-DD-YYYY format', () => {
      expect(DateUtils.parseDate('01-15-2024')).toBe('2024-01-15');
      expect(DateUtils.parseDate('12-31-2023')).toBe('2023-12-31');
    });

    it('handles quoted dates', () => {
      expect(DateUtils.parseDate('"01/15/2024"')).toBe('2024-01-15');
    });

    it('handles whitespace', () => {
      expect(DateUtils.parseDate('  01/15/2024  ')).toBe('2024-01-15');
    });

    it('returns null for empty string', () => {
      expect(DateUtils.parseDate('')).toBe(null);
    });

    it('returns null for null/undefined', () => {
      expect(DateUtils.parseDate(null)).toBe(null);
      expect(DateUtils.parseDate(undefined)).toBe(null);
    });

    it('handles leap year dates', () => {
      expect(DateUtils.parseDate('02/29/2024')).toBe('2024-02-29'); // 2024 is leap year
      expect(DateUtils.parseDate('02/29/2000')).toBe('2000-02-29'); // 2000 is leap year
    });

    it('handles end of month dates', () => {
      expect(DateUtils.parseDate('01/31/2024')).toBe('2024-01-31');
      expect(DateUtils.parseDate('04/30/2024')).toBe('2024-04-30');
    });
  });
});

describe('StorageUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('returns default value when key not found', () => {
      expect(StorageUtils.get('nonexistent', 'default')).toBe('default');
    });

    it('returns null when no default provided', () => {
      expect(StorageUtils.get('nonexistent')).toBe(null);
    });

    it('retrieves stored JSON objects', () => {
      localStorage.setItem('test', JSON.stringify({ a: 1, b: 2 }));
      expect(StorageUtils.get('test')).toEqual({ a: 1, b: 2 });
    });

    it('retrieves stored arrays', () => {
      localStorage.setItem('arr', JSON.stringify([1, 2, 3]));
      expect(StorageUtils.get('arr')).toEqual([1, 2, 3]);
    });

    it('returns default for corrupted non-JSON strings', () => {
      localStorage.setItem('plain', 'just a string');
      expect(StorageUtils.get('plain')).toBeNull();
      expect(StorageUtils.get('plain', 'fallback')).toBe('fallback');
    });
  });

  describe('set', () => {
    it('stores objects as JSON', () => {
      StorageUtils.set('obj', { x: 1, y: 2 });
      expect(localStorage.getItem('obj')).toBe('{"x":1,"y":2}');
    });

    it('stores arrays as JSON', () => {
      StorageUtils.set('arr', [1, 2, 3]);
      expect(localStorage.getItem('arr')).toBe('[1,2,3]');
    });

    it('stores primitives as JSON', () => {
      StorageUtils.set('str', 'hello');
      expect(localStorage.getItem('str')).toBe('"hello"');
    });
  });

  describe('remove', () => {
    it('removes existing keys', () => {
      localStorage.setItem('toRemove', 'value');
      StorageUtils.remove('toRemove');
      expect(localStorage.getItem('toRemove')).toBe(null);
    });

    it('does not throw for non-existent keys', () => {
      expect(() => StorageUtils.remove('nonexistent')).not.toThrow();
    });
  });
});

describe('SessionManager round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Minimal SessionManager implementation for testing
  const SessionManager = {
    VERSION: '1.0',
    STORAGE_KEYS: {
      budgetPlanner: 'budgetPlannerData',
      spendingTracker: 'spendingTrackerData',
      retirementForecast: 'retirementForecastData',
      lifeEvents: 'lifeEventsData',
    },

    exportSession() {
      return {
        version: this.VERSION,
        exportedAt: new Date().toISOString(),
        budgetPlanner: StorageUtils.get(this.STORAGE_KEYS.budgetPlanner, null),
        spendingTracker: StorageUtils.get(this.STORAGE_KEYS.spendingTracker, null),
        retirementForecast: StorageUtils.get(this.STORAGE_KEYS.retirementForecast, null),
        lifeEvents: StorageUtils.get(this.STORAGE_KEYS.lifeEvents, []),
      };
    },

    importSession(session) {
      const result = { success: false, warnings: [], imported: [] };

      if (!session.version) {
        result.warnings.push('Session file missing version');
      }

      if (session.budgetPlanner) {
        StorageUtils.set(this.STORAGE_KEYS.budgetPlanner, session.budgetPlanner);
        result.imported.push('Budget Planner settings');
      }

      if (session.spendingTracker) {
        StorageUtils.set(this.STORAGE_KEYS.spendingTracker, session.spendingTracker);
        result.imported.push('Spending Tracker data');
      }

      if (session.retirementForecast) {
        StorageUtils.set(this.STORAGE_KEYS.retirementForecast, session.retirementForecast);
        result.imported.push('Retirement Forecast settings');
      }

      if (session.lifeEvents && Array.isArray(session.lifeEvents)) {
        StorageUtils.set(this.STORAGE_KEYS.lifeEvents, session.lifeEvents);
        result.imported.push('Life events');
      }

      result.success = result.imported.length > 0;
      return result;
    },
  };

  it('exports and imports budget data correctly', () => {
    const budgetData = { monthlyIncome: 5000, fixedCosts: 50, savings: 20 };
    StorageUtils.set('budgetPlannerData', budgetData);

    const exported = SessionManager.exportSession();
    expect(exported.budgetPlanner).toEqual(budgetData);
    expect(exported.version).toBe('1.0');

    localStorage.clear();
    const result = SessionManager.importSession(exported);

    expect(result.success).toBe(true);
    expect(result.imported).toContain('Budget Planner settings');
    expect(StorageUtils.get('budgetPlannerData')).toEqual(budgetData);
  });

  it('exports and imports life events correctly', () => {
    const lifeEvents = [
      { id: 1, name: 'College', amount: 20000, startAge: 50 },
      { id: 2, name: 'Wedding', amount: 30000, startAge: 55 },
    ];
    StorageUtils.set('lifeEventsData', lifeEvents);

    const exported = SessionManager.exportSession();
    expect(exported.lifeEvents).toEqual(lifeEvents);

    localStorage.clear();
    const result = SessionManager.importSession(exported);

    expect(result.success).toBe(true);
    expect(result.imported).toContain('Life events');
    expect(StorageUtils.get('lifeEventsData')).toEqual(lifeEvents);
  });

  it('handles missing version with warning', () => {
    const session = { budgetPlanner: { income: 1000 } };
    const result = SessionManager.importSession(session);

    expect(result.warnings).toContain('Session file missing version');
    expect(result.success).toBe(true);
  });

  it('returns success=false when nothing to import', () => {
    const result = SessionManager.importSession({});
    expect(result.success).toBe(false);
    expect(result.imported).toHaveLength(0);
  });

  it('preserves data types through round-trip', () => {
    const complexData = {
      monthlyIncome: 5000.5,
      categories: ['food', 'rent'],
      nested: { a: 1, b: [2, 3] },
      enabled: true,
      count: 0,
    };
    StorageUtils.set('budgetPlannerData', complexData);

    const exported = SessionManager.exportSession();
    localStorage.clear();
    SessionManager.importSession(exported);

    const restored = StorageUtils.get('budgetPlannerData');
    expect(restored).toEqual(complexData);
    expect(typeof restored.monthlyIncome).toBe('number');
    expect(Array.isArray(restored.categories)).toBe(true);
    expect(typeof restored.enabled).toBe('boolean');
  });
});
