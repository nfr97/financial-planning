/**
 * Statistics utilities for Monte Carlo results
 * Extracted from retirement-simulator.html for testability
 */

/**
 * Calculate statistics from simulation results
 * @param {number[]} endingBalances - Array of final balances from each simulation
 * @returns {Object} Statistics object with successRate, median, percentile10, percentile90
 */
export function getStatistics(endingBalances) {
  // Safety check for empty data
  if (!endingBalances || endingBalances.length === 0) {
    return { successRate: 0, median: 0, percentile10: 0, percentile90: 0 };
  }

  const sorted = [...endingBalances].sort((a, b) => a - b);
  const numSimulations = sorted.length;

  // Success rate (balance > 0 at end)
  const successes = sorted.filter((b) => b > 0).length;
  const successRate = (successes / numSimulations) * 100;

  // Percentiles
  const medianIndex = Math.floor(numSimulations * 0.5);
  const p10Index = Math.floor(numSimulations * 0.1);
  const p90Index = Math.floor(numSimulations * 0.9);

  return {
    successRate: successRate,
    median: sorted[medianIndex] || 0,
    percentile10: sorted[p10Index] || 0,
    percentile90: sorted[p90Index] || 0,
  };
}

/**
 * Calculate a specific percentile from data
 * @param {number[]} data - Array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Value at the given percentile
 */
export function getPercentile(data, percentile) {
  if (!data || data.length === 0) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (percentile / 100));
  return sorted[Math.min(index, sorted.length - 1)] || 0;
}

/**
 * Prepare histogram data from results
 * @param {number[]} endingBalances - Array of final balances
 * @param {number} [numBins=15] - Number of histogram bins
 * @param {Function} [formatCurrency] - Optional currency formatter
 * @returns {Object} Object with labels and data arrays
 */
export function getHistogramData(endingBalances, numBins = 15, formatCurrency = null) {
  // Safety check for empty data
  if (!endingBalances || endingBalances.length === 0) {
    return { labels: ['No Data'], data: [0] };
  }

  const sorted = [...endingBalances].sort((a, b) => a - b);
  const min = Math.min(...sorted);
  const max = Math.max(...sorted);
  const range = max - min;

  // Handle edge case where all values are the same (range = 0)
  const binWidth = range === 0 ? 1 : range / numBins;

  const bins = new Array(numBins).fill(0);
  const labels = [];

  const formatter =
    formatCurrency ||
    ((value) => {
      const absValue = Math.abs(value);
      if (absValue >= 1000000) {
        return '$' + (absValue / 1000000).toFixed(absValue >= 10000000 ? 1 : 2) + 'M';
      } else if (absValue >= 1000) {
        return '$' + (absValue / 1000).toFixed(0) + 'K';
      } else {
        return '$' + absValue.toFixed(0);
      }
    });

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth;
    labels.push(formatter(binStart));
  }

  for (const balance of sorted) {
    const binIndex =
      range === 0 ? 0 : Math.min(Math.floor((balance - min) / binWidth), numBins - 1);
    bins[binIndex]++;
  }

  return { labels, data: bins };
}

/**
 * Calculate mean of an array
 * @param {number[]} data - Array of numbers
 * @returns {number} Mean value
 */
export function getMean(data) {
  if (!data || data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Calculate standard deviation of an array
 * @param {number[]} data - Array of numbers
 * @returns {number} Standard deviation
 */
export function getStandardDeviation(data) {
  if (!data || data.length === 0) return 0;

  const mean = getMean(data);
  const squareDiffs = data.map((value) => Math.pow(value - mean, 2));
  const avgSquareDiff = getMean(squareDiffs);

  return Math.sqrt(avgSquareDiff);
}
