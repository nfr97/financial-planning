import { describe, it, expect } from 'vitest';
import {
  getStatistics,
  getPercentile,
  getHistogramData,
  getMean,
  getStandardDeviation,
} from '../lib/statistics.js';

describe('getStatistics', () => {
  it('returns zeros for empty data', () => {
    const result = getStatistics([]);
    expect(result.successRate).toBe(0);
    expect(result.median).toBe(0);
    expect(result.percentile10).toBe(0);
    expect(result.percentile90).toBe(0);
  });

  it('returns zeros for null data', () => {
    const result = getStatistics(null);
    expect(result.successRate).toBe(0);
  });

  it('calculates 100% success rate when all positive', () => {
    const data = [100000, 200000, 300000, 400000, 500000];
    const result = getStatistics(data);
    expect(result.successRate).toBe(100);
  });

  it('calculates 0% success rate when all zero or negative', () => {
    const data = [-100000, 0, -50000, 0, -25000];
    const result = getStatistics(data);
    expect(result.successRate).toBe(0);
  });

  it('calculates partial success rate', () => {
    const data = [100000, 200000, 0, -50000, 300000];
    const result = getStatistics(data);
    expect(result.successRate).toBe(60); // 3 out of 5
  });

  it('calculates correct median', () => {
    const data = [100, 200, 300, 400, 500];
    const result = getStatistics(data);
    expect(result.median).toBe(300);
  });

  it('calculates correct percentiles', () => {
    // 10 values: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
    const data = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const result = getStatistics(data);
    expect(result.percentile10).toBe(200); // index 1
    expect(result.median).toBe(600); // index 5
    expect(result.percentile90).toBe(1000); // index 9
  });

  it('handles unsorted input', () => {
    const data = [500, 100, 400, 200, 300];
    const result = getStatistics(data);
    expect(result.median).toBe(300);
  });
});

describe('getPercentile', () => {
  it('returns 0 for empty data', () => {
    expect(getPercentile([], 50)).toBe(0);
  });

  it('returns 0 for null data', () => {
    expect(getPercentile(null, 50)).toBe(0);
  });

  it('calculates 50th percentile (median)', () => {
    const data = [1, 2, 3, 4, 5];
    expect(getPercentile(data, 50)).toBe(3);
  });

  it('calculates 0th percentile (minimum)', () => {
    const data = [1, 2, 3, 4, 5];
    expect(getPercentile(data, 0)).toBe(1);
  });

  it('calculates 100th percentile (maximum)', () => {
    const data = [1, 2, 3, 4, 5];
    expect(getPercentile(data, 100)).toBe(5);
  });

  it('calculates 25th percentile', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(getPercentile(data, 25)).toBe(3);
  });
});

describe('getHistogramData', () => {
  it('returns "No Data" for empty array', () => {
    const result = getHistogramData([]);
    expect(result.labels).toEqual(['No Data']);
    expect(result.data).toEqual([0]);
  });

  it('returns "No Data" for null', () => {
    const result = getHistogramData(null);
    expect(result.labels).toEqual(['No Data']);
  });

  it('creates correct number of bins', () => {
    const data = Array.from({ length: 100 }, (_, i) => i * 1000);
    const result = getHistogramData(data, 10);
    expect(result.labels).toHaveLength(10);
    expect(result.data).toHaveLength(10);
  });

  it('handles all same values', () => {
    const data = [1000, 1000, 1000, 1000, 1000];
    const result = getHistogramData(data, 5);
    expect(result.data[0]).toBe(5);
  });

  it('distributes values into bins correctly', () => {
    const data = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const result = getHistogramData(data, 5);
    // Each bin should have 2 values
    expect(result.data.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('uses custom formatter when provided', () => {
    const data = [1000, 2000, 3000];
    const customFormatter = (v) => `€${v}`;
    const result = getHistogramData(data, 3, customFormatter);
    expect(result.labels[0]).toBe('€1000');
  });

  it('uses default compact currency formatter', () => {
    const data = [1500000, 2500000, 3500000];
    const result = getHistogramData(data, 3);
    expect(result.labels[0]).toContain('M');
  });
});

describe('getMean', () => {
  it('returns 0 for empty array', () => {
    expect(getMean([])).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(getMean(null)).toBe(0);
  });

  it('calculates correct mean', () => {
    expect(getMean([1, 2, 3, 4, 5])).toBe(3);
    expect(getMean([10, 20, 30])).toBe(20);
  });

  it('handles single value', () => {
    expect(getMean([42])).toBe(42);
  });

  it('handles negative values', () => {
    expect(getMean([-10, 10])).toBe(0);
  });
});

describe('getStandardDeviation', () => {
  it('returns 0 for empty array', () => {
    expect(getStandardDeviation([])).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(getStandardDeviation(null)).toBe(0);
  });

  it('returns 0 for single value', () => {
    expect(getStandardDeviation([42])).toBe(0);
  });

  it('returns 0 for all same values', () => {
    expect(getStandardDeviation([5, 5, 5, 5])).toBe(0);
  });

  it('calculates correct standard deviation', () => {
    // Mean = 3, variance = ((1-3)^2 + (2-3)^2 + (3-3)^2 + (4-3)^2 + (5-3)^2) / 5 = 2
    // StdDev = sqrt(2) ≈ 1.414
    const result = getStandardDeviation([1, 2, 3, 4, 5]);
    expect(result).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('handles larger spread', () => {
    const data = [10, 20, 30, 40, 50];
    const result = getStandardDeviation(data);
    expect(result).toBeCloseTo(Math.sqrt(200), 5);
  });
});
