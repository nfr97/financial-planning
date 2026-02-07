/**
 * Storage Utils tests
 * Tests for StorageUtils from shared.js
 * These tests use jsdom environment provided by vitest
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Simulate StorageUtils as defined in shared.js
const StorageUtils = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      // JSON parsing failed - data is corrupted. Log and return default.
      console.warn(`StorageUtils: failed to parse key "${key}", returning default`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

describe('StorageUtils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('set and get', () => {
    it('stores and retrieves string values', () => {
      StorageUtils.set('test-string', 'hello');
      const result = StorageUtils.get('test-string');
      expect(result).toBe('hello');
    });

    it('stores and retrieves number values', () => {
      StorageUtils.set('test-number', 42);
      const result = StorageUtils.get('test-number');
      expect(result).toBe(42);
    });

    it('stores and retrieves boolean values', () => {
      StorageUtils.set('test-true', true);
      StorageUtils.set('test-false', false);
      expect(StorageUtils.get('test-true')).toBe(true);
      expect(StorageUtils.get('test-false')).toBe(false);
    });

    it('stores and retrieves objects', () => {
      const obj = { foo: 'bar', num: 123 };
      StorageUtils.set('test-object', obj);
      const result = StorageUtils.get('test-object');
      expect(result).toEqual(obj);
    });

    it('stores and retrieves arrays', () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      StorageUtils.set('test-array', arr);
      const result = StorageUtils.get('test-array');
      expect(result).toEqual(arr);
    });

    it('stores and retrieves null', () => {
      StorageUtils.set('test-null', null);
      const result = StorageUtils.get('test-null');
      expect(result).toBeNull();
    });

    it('handles complex nested objects', () => {
      const complex = {
        transactions: [
          { id: '1', amount: 100, description: 'Test' },
          { id: '2', amount: -50, description: 'Another' },
        ],
        settings: {
          theme: 'dark',
          nested: { value: true },
        },
      };
      StorageUtils.set('test-complex', complex);
      const result = StorageUtils.get('test-complex');
      expect(result.transactions[0].amount).toBe(100);
      expect(result.settings.nested.value).toBe(true);
    });
  });

  describe('get with defaults', () => {
    it('returns default for missing key', () => {
      const result = StorageUtils.get('nonexistent-key', 'default-value');
      expect(result).toBe('default-value');
    });

    it('returns null when no default provided and key missing', () => {
      const result = StorageUtils.get('nonexistent-key');
      expect(result).toBeNull();
    });

    it('returns default object for missing key', () => {
      const defaultObj = { foo: 'bar' };
      const result = StorageUtils.get('nonexistent-key', defaultObj);
      expect(result).toEqual(defaultObj);
    });

    it('returns stored value instead of default when key exists', () => {
      StorageUtils.set('existing-key', 'stored-value');
      const result = StorageUtils.get('existing-key', 'default-value');
      expect(result).toBe('stored-value');
    });
  });

  describe('remove', () => {
    it('removes stored key', () => {
      StorageUtils.set('to-remove', 'value');
      expect(StorageUtils.get('to-remove')).toBe('value');

      StorageUtils.remove('to-remove');
      expect(StorageUtils.get('to-remove')).toBeNull();
    });

    it('handles removing nonexistent key gracefully', () => {
      expect(() => StorageUtils.remove('never-existed')).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles empty string value', () => {
      StorageUtils.set('empty-string', '');
      const result = StorageUtils.get('empty-string');
      expect(result).toBe('');
    });

    it('handles empty object', () => {
      StorageUtils.set('empty-object', {});
      const result = StorageUtils.get('empty-object');
      expect(result).toEqual({});
    });

    it('handles empty array', () => {
      StorageUtils.set('empty-array', []);
      const result = StorageUtils.get('empty-array');
      expect(result).toEqual([]);
    });

    it('handles zero value', () => {
      StorageUtils.set('zero', 0);
      const result = StorageUtils.get('zero');
      expect(result).toBe(0);
    });

    it('overwrites existing key', () => {
      StorageUtils.set('overwrite', 'first');
      StorageUtils.set('overwrite', 'second');
      expect(StorageUtils.get('overwrite')).toBe('second');
    });

    it('returns defaultValue when stored data is corrupted JSON', () => {
      // Directly write invalid JSON to localStorage (simulating corruption)
      localStorage.setItem('corrupted', '{bad json');
      expect(StorageUtils.get('corrupted', 'fallback')).toBe('fallback');
    });

    it('returns null when corrupted and no default provided', () => {
      localStorage.setItem('corrupted2', 'not-valid-json{');
      expect(StorageUtils.get('corrupted2')).toBeNull();
    });
  });
});
