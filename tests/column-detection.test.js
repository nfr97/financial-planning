import { describe, it, expect } from 'vitest';
import { findColumnIndex, detectColumns, DEFAULT_COLUMN_CONFIG } from '../lib/column-detection.js';

describe('findColumnIndex', () => {
  it('finds exact match (case-insensitive)', () => {
    const header = ['Date', 'Description', 'Amount'];
    expect(findColumnIndex(header, 'date')).toBe(0);
    expect(findColumnIndex(header, 'DATE')).toBe(0);
    expect(findColumnIndex(header, 'Date')).toBe(0);
  });

  it('finds match from array of names', () => {
    const header = ['Transaction Date', 'Memo', 'Value'];
    expect(findColumnIndex(header, ['Date', 'Transaction Date'])).toBe(0);
  });

  it('handles normalized matching (punctuation/spaces)', () => {
    const header = ['Trans. Date', 'Description', 'Amount'];
    expect(findColumnIndex(header, 'Trans Date')).toBe(0);
  });

  it('handles partial matching (header more specific)', () => {
    const header = ['Transaction Amount', 'Description', 'Date'];
    expect(findColumnIndex(header, 'Amount')).toBe(0);
  });

  it('returns -1 for no match', () => {
    const header = ['Date', 'Description', 'Amount'];
    expect(findColumnIndex(header, 'Category')).toBe(-1);
  });

  it('handles empty header', () => {
    expect(findColumnIndex([], 'Date')).toBe(-1);
  });

  it('handles single string as possible name', () => {
    const header = ['Date', 'Description', 'Amount'];
    expect(findColumnIndex(header, 'Description')).toBe(1);
  });
});

describe('detectColumns', () => {
  describe('single amount mode', () => {
    it('detects Chase format (Date, Description, Amount)', () => {
      const header = ['Date', 'Description', 'Amount'];
      const sampleRows = [['01/15/2024', 'AMAZON.COM', '-45.99']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(true);
      expect(result.dateIdx).toBe(0);
      expect(result.descIdx).toBe(1);
      expect(result.amountIdx).toBe(2);
      expect(result.mode).toBe('single_amount');
    });

    it('detects signed amounts', () => {
      const header = ['Transaction Date', 'Memo', 'Transaction Amount'];
      const sampleRows = [[' 01/15/2024', 'Test', '-100.00']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('single_amount');
    });
  });

  describe('debit/credit mode', () => {
    it('detects Capital One format (Date, Description, Debit, Credit)', () => {
      const header = ['Date', 'Description', 'Debit', 'Credit'];
      const sampleRows = [['01/15/2024', 'AMAZON.COM', '45.99', '']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(true);
      expect(result.dateIdx).toBe(0);
      expect(result.descIdx).toBe(1);
      expect(result.debitIdx).toBe(2);
      expect(result.creditIdx).toBe(3);
      expect(result.mode).toBe('debit_credit');
    });
  });

  describe('amount with type mode', () => {
    it('detects Capital One 360 format (Date, Description, Amount, Type)', () => {
      const header = ['Date', 'Description', 'Amount', 'Transaction Type'];
      const sampleRows = [['01/15/2024', 'AMAZON.COM', '45.99', 'Debit']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(true);
      expect(result.amountIdx).toBe(2);
      expect(result.typeIdx).toBe(3);
      expect(result.mode).toBe('amount_with_type');
    });
  });

  describe('edge cases', () => {
    it('returns success: false when date column is missing', () => {
      const header = ['Description', 'Amount'];
      const sampleRows = [['AMAZON.COM', '-45.99']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(false);
      expect(result.dateIdx).toBe(-1);
    });

    it('returns success: false when description is missing', () => {
      const header = ['Date', 'Amount'];
      const sampleRows = [['01/15/2024', '-45.99']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(false);
      expect(result.descIdx).toBe(-1);
    });

    it('returns success: false when amount columns are missing', () => {
      const header = ['Date', 'Description'];
      const sampleRows = [['01/15/2024', 'AMAZON.COM']];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(false);
    });

    it('handles empty sample rows', () => {
      const header = ['Date', 'Description', 'Amount'];
      const sampleRows = [];

      const result = detectColumns(header, sampleRows);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('single_amount');
    });

    it('prefers debit/credit over amount if both exist', () => {
      const header = ['Date', 'Description', 'Amount', 'Debit', 'Credit'];
      const sampleRows = [['01/15/2024', 'Test', '50', '50', '']];

      const result = detectColumns(header, sampleRows);

      expect(result.mode).toBe('debit_credit');
    });

    it('clears amount if it matches debit column', () => {
      // Edge case: "Debit" column also matches "Amount" patterns
      const header = ['Date', 'Description', 'Debit', 'Credit'];
      const sampleRows = [['01/15/2024', 'Test', '50', '']];

      const result = detectColumns(header, sampleRows);

      expect(result.amountIdx).toBeNull();
      expect(result.debitIdx).toBe(2);
    });
  });

  describe('uses custom column config', () => {
    it('accepts custom column names', () => {
      const customConfig = {
        dateCol: ['Datum'],
        descCol: ['Beschreibung'],
        amountCol: ['Betrag'],
        debitCol: [],
        creditCol: [],
        typeCol: [],
      };
      const header = ['Datum', 'Beschreibung', 'Betrag'];
      const sampleRows = [['15.01.2024', 'Test', '-50,00']];

      const result = detectColumns(header, sampleRows, customConfig);

      expect(result.success).toBe(true);
      expect(result.dateIdx).toBe(0);
      expect(result.descIdx).toBe(1);
      expect(result.amountIdx).toBe(2);
    });
  });
});

describe('DEFAULT_COLUMN_CONFIG', () => {
  it('has required column arrays', () => {
    expect(DEFAULT_COLUMN_CONFIG.dateCol).toBeInstanceOf(Array);
    expect(DEFAULT_COLUMN_CONFIG.descCol).toBeInstanceOf(Array);
    expect(DEFAULT_COLUMN_CONFIG.amountCol).toBeInstanceOf(Array);
    expect(DEFAULT_COLUMN_CONFIG.debitCol).toBeInstanceOf(Array);
    expect(DEFAULT_COLUMN_CONFIG.creditCol).toBeInstanceOf(Array);
    expect(DEFAULT_COLUMN_CONFIG.typeCol).toBeInstanceOf(Array);
  });

  it('includes common date column names', () => {
    expect(DEFAULT_COLUMN_CONFIG.dateCol).toContain('Date');
    expect(DEFAULT_COLUMN_CONFIG.dateCol).toContain('Transaction Date');
    expect(DEFAULT_COLUMN_CONFIG.dateCol).toContain('Posted Date');
  });

  it('includes common description column names', () => {
    expect(DEFAULT_COLUMN_CONFIG.descCol).toContain('Description');
    expect(DEFAULT_COLUMN_CONFIG.descCol).toContain('Memo');
    expect(DEFAULT_COLUMN_CONFIG.descCol).toContain('Merchant');
  });
});
