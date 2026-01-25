import { describe, it, expect } from 'vitest';
import {
  isTransferPair,
  detectTransfers,
  getTransferCount,
  strongTransferKeywords,
  accountPatterns,
  TRANSFER_CONFIG,
} from '../lib/transfer-detection.js';

describe('strongTransferKeywords', () => {
  it('includes common transfer phrases', () => {
    expect(strongTransferKeywords).toContain('transfer to');
    expect(strongTransferKeywords).toContain('transfer from');
    expect(strongTransferKeywords).toContain('credit card payment');
    expect(strongTransferKeywords).toContain('ach payment');
  });
});

describe('accountPatterns', () => {
  it('matches ****1234 format', () => {
    const matches = accountPatterns.some((p) => p.test('Account ****1234'));
    expect(matches).toBe(true);
  });

  it('matches xxxx1234 format', () => {
    const matches = accountPatterns.some((p) => p.test('Card xxxx5678'));
    expect(matches).toBe(true);
  });

  it('matches "ending in" format', () => {
    const matches = accountPatterns.some((p) => p.test('Account ending in 9999'));
    expect(matches).toBe(true);
  });
});

describe('isTransferPair', () => {
  it('detects transfer pair with matching amounts and transfer keyword', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Transfer to savings',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-15',
      description: 'Transfer from checking',
    };
    expect(isTransferPair(t1, t2)).toBe(true);
  });

  it('rejects pair with non-matching amounts', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Transfer to savings',
    };
    const t2 = {
      amount: -400,
      date: '2024-01-15',
      description: 'Transfer from checking',
    };
    expect(isTransferPair(t1, t2)).toBe(false);
  });

  it('rejects pair with same sign amounts', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Transfer to savings',
    };
    const t2 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Transfer to checking',
    };
    expect(isTransferPair(t1, t2)).toBe(false);
  });

  it('rejects pair with dates too far apart', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-01',
      description: 'Transfer to savings',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-10',
      description: 'Transfer from checking',
    };
    expect(isTransferPair(t1, t2)).toBe(false);
  });

  it('accepts pair within date tolerance', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Online Transfer',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-17',
      description: 'Generic description',
    };
    expect(isTransferPair(t1, t2)).toBe(true);
  });

  it('accepts same-day pair with account reference', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Deposit from ****1234',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-15',
      description: 'Withdrawal',
    };
    expect(isTransferPair(t1, t2)).toBe(true);
  });

  it('rejects pair without transfer indicators on different days', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Random deposit',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-16',
      description: 'Random withdrawal',
    };
    expect(isTransferPair(t1, t2)).toBe(false);
  });

  it('handles credit card payment keyword', () => {
    const t1 = {
      amount: 500,
      date: '2024-01-15',
      description: 'Credit Card Payment Thank You',
    };
    const t2 = {
      amount: -500,
      date: '2024-01-15',
      description: 'Payment to Credit Card',
    };
    expect(isTransferPair(t1, t2)).toBe(true);
  });
});

describe('detectTransfers', () => {
  it('marks transfer pairs in transaction list', () => {
    const transactions = [
      { id: '1', amount: 500, date: '2024-01-15', description: 'Transfer to savings' },
      { id: '2', amount: -500, date: '2024-01-15', description: 'Transfer from checking' },
      { id: '3', amount: -100, date: '2024-01-16', description: 'Random expense' },
    ];

    const result = detectTransfers(transactions);

    expect(result[0].isTransfer).toBe(true);
    expect(result[1].isTransfer).toBe(true);
    expect(result[2].isTransfer).toBe(false);
    expect(result[0].transferMatch).toBe('2');
    expect(result[1].transferMatch).toBe('1');
  });

  it('preserves manually unmarked transfers', () => {
    const transactions = [
      {
        id: '1',
        amount: 500,
        date: '2024-01-15',
        description: 'Transfer to savings',
        manuallyUnmarkedTransfer: true,
      },
      { id: '2', amount: -500, date: '2024-01-15', description: 'Transfer from checking' },
    ];

    const result = detectTransfers(transactions);

    // First transaction should not be marked as transfer because it was manually unmarked
    expect(result[0].isTransfer).toBeFalsy();
    // Second transaction should also not be marked (no pair found)
    expect(result[1].isTransfer).toBe(false);
  });

  it('handles empty transaction list', () => {
    const result = detectTransfers([]);
    expect(result).toHaveLength(0);
  });

  it('handles single transaction', () => {
    const transactions = [
      { id: '1', amount: 500, date: '2024-01-15', description: 'Transfer to savings' },
    ];

    const result = detectTransfers(transactions);
    expect(result[0].isTransfer).toBe(false);
  });

  it('handles multiple transfer pairs', () => {
    const transactions = [
      { id: '1', amount: 500, date: '2024-01-15', description: 'Transfer to savings' },
      { id: '2', amount: -500, date: '2024-01-15', description: 'Transfer from checking' },
      { id: '3', amount: 200, date: '2024-01-20', description: 'Credit card payment' },
      { id: '4', amount: -200, date: '2024-01-20', description: 'Payment to card' },
    ];

    const result = detectTransfers(transactions);

    expect(result[0].isTransfer).toBe(true);
    expect(result[1].isTransfer).toBe(true);
    expect(result[2].isTransfer).toBe(true);
    expect(result[3].isTransfer).toBe(true);
  });
});

describe('getTransferCount', () => {
  it('counts transfers correctly', () => {
    const transactions = [
      { isTransfer: true },
      { isTransfer: true },
      { isTransfer: false },
      { isTransfer: false },
    ];

    expect(getTransferCount(transactions)).toBe(2);
  });

  it('returns 0 for no transfers', () => {
    const transactions = [{ isTransfer: false }, { isTransfer: false }];

    expect(getTransferCount(transactions)).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(getTransferCount([])).toBe(0);
  });
});
