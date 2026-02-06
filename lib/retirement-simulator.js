/**
 * Monte Carlo Retirement Simulator
 * Extracted from retirement-simulator.html for testability
 */

import { generateNormalRandom, getLifeEventImpact, calculateRMD, applyRMD } from './simulation.js';

/**
 * Default currency formatter (compact notation)
 * @param {number} value
 * @returns {string}
 */
function defaultFormatCurrency(value) {
  if (Math.abs(value) >= 1e6) {
    return '$' + (value / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1e3) {
    return '$' + (value / 1e3).toFixed(0) + 'K';
  }
  return '$' + value.toFixed(0);
}

/**
 * Monte Carlo retirement simulation engine
 *
 * Runs probabilistic simulations of retirement outcomes across
 * multiple account types with tax-efficient withdrawal ordering.
 */
export class RetirementSimulator {
  /**
   * @param {Object} params - Simulation parameters
   * @param {Object[]} [lifeEvents=[]] - Life events affecting income/expenses
   * @param {Object} [options={}] - Optional overrides
   * @param {Function} [options.formatCurrency] - Currency formatter for histogram labels
   */
  constructor(params, lifeEvents = [], options = {}) {
    this.params = params;
    this.lifeEvents = lifeEvents;
    this.allEndingBalances = [];
    this.samplePaths = [];
    this._formatCurrency = options.formatCurrency || defaultFormatCurrency;
  }

  /**
   * Run a single simulation with account breakdown
   * @param {boolean} [savePath=false] - Whether to record the balance path
   * @returns {Object} { finalBalance: number, path: Array|null }
   */
  runSingleSimulation(savePath = false) {
    const {
      currentAge,
      retirementAge,
      expectedReturn,
      returnVolatility,
      inflationRate,
      annualSpending,
      yearsInRetirement,
      // Simple mode
      currentSavings,
      annualContribution,
      // Advanced mode
      advancedMode,
      accounts,
      contributions,
      // Social Security
      ssAnnualBenefit,
      ssStartAge,
    } = this.params;

    const yearsToRetirement = retirementAge - currentAge;

    // Initialize account balances
    let balances;
    let contribs;

    if (advancedMode && accounts) {
      balances = {
        traditional401k: accounts.traditional401k || 0,
        roth401k: accounts.roth401k || 0,
        traditionalIRA: accounts.traditionalIRA || 0,
        rothIRA: accounts.rothIRA || 0,
        taxable: accounts.taxable || 0,
      };
      contribs = {
        traditional401k: contributions?.traditional401k || 0,
        roth401k: contributions?.roth401k || 0,
        traditionalIRA: contributions?.traditionalIRA || 0,
        rothIRA: contributions?.rothIRA || 0,
        taxable: contributions?.taxable || 0,
      };
    } else {
      // Simple mode - treat all as traditional
      balances = {
        traditional401k: currentSavings,
        roth401k: 0,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
      contribs = {
        traditional401k: annualContribution,
        roth401k: 0,
        traditionalIRA: 0,
        rothIRA: 0,
        taxable: 0,
      };
    }

    const getTotalBalance = () => Object.values(balances).reduce((a, b) => a + b, 0);
    const path = savePath ? [{ age: currentAge, balance: getTotalBalance() }] : null;

    // Accumulation phase (working years)
    for (let year = 0; year < yearsToRetirement; year++) {
      const currentAgeInLoop = currentAge + year;
      const returnRate = generateNormalRandom(expectedReturn / 100, returnVolatility / 100);

      // Apply market returns to all accounts
      for (const acct of Object.keys(balances)) {
        balances[acct] = balances[acct] * (1 + returnRate);
      }

      // Add contributions
      balances.traditional401k += contribs.traditional401k;
      balances.roth401k += contribs.roth401k;
      balances.traditionalIRA += contribs.traditionalIRA;
      balances.rothIRA += contribs.rothIRA;
      balances.taxable += contribs.taxable;

      // Apply life events
      const lifeEventImpact = getLifeEventImpact(currentAgeInLoop, this.lifeEvents);
      // Calculate net impact (income minus expense)
      const netLifeEventImpact = lifeEventImpact.income - lifeEventImpact.expense;

      if (netLifeEventImpact >= 0) {
        // Net income - add to taxable account
        balances.taxable += netLifeEventImpact;
      } else {
        // Net expense - need to withdraw from accounts
        let deficit = Math.abs(netLifeEventImpact);

        // Cascade through accounts: taxable → traditional401k → traditionalIRA → roth401k → rothIRA
        if (deficit > 0 && balances.taxable > 0) {
          const withdraw = Math.min(balances.taxable, deficit);
          balances.taxable -= withdraw;
          deficit -= withdraw;
        }
        if (deficit > 0 && balances.traditional401k > 0) {
          const withdraw = Math.min(balances.traditional401k, deficit);
          balances.traditional401k -= withdraw;
          deficit -= withdraw;
        }
        if (deficit > 0 && balances.traditionalIRA > 0) {
          const withdraw = Math.min(balances.traditionalIRA, deficit);
          balances.traditionalIRA -= withdraw;
          deficit -= withdraw;
        }
        if (deficit > 0 && balances.roth401k > 0) {
          const withdraw = Math.min(balances.roth401k, deficit);
          balances.roth401k -= withdraw;
          deficit -= withdraw;
        }
        if (deficit > 0 && balances.rothIRA > 0) {
          const withdraw = Math.min(balances.rothIRA, deficit);
          balances.rothIRA -= withdraw;
          deficit -= withdraw;
        }

        // If still in deficit after all accounts depleted, simulation fails early
        if (deficit > 0) {
          return { finalBalance: 0, path };
        }
      }

      if (savePath) {
        path.push({ age: currentAgeInLoop + 1, balance: getTotalBalance() });
      }
    }

    // Distribution phase (retirement years)
    let currentSpending = annualSpending;
    let ssActive = false;
    let currentSSBenefit = ssAnnualBenefit || 0;

    for (let year = 0; year < yearsInRetirement; year++) {
      const currentAgeInLoop = retirementAge + year;
      const returnRate = generateNormalRandom(expectedReturn / 100, returnVolatility / 100);

      // Apply market returns to all accounts
      for (const acct of Object.keys(balances)) {
        balances[acct] = balances[acct] * (1 + returnRate);
      }

      // Check if SS starts this year
      if (ssStartAge && currentAgeInLoop >= ssStartAge && !ssActive) {
        ssActive = true;
      }

      // Calculate net spending needed (after SS income)
      const ssThisYear = ssActive ? currentSSBenefit : 0;
      let netSpendingNeeded = currentSpending - ssThisYear;

      // Apply life events
      const lifeEventImpact = getLifeEventImpact(currentAgeInLoop, this.lifeEvents);
      netSpendingNeeded -= lifeEventImpact.income;
      netSpendingNeeded += lifeEventImpact.expense;

      // Calculate and apply Required Minimum Distribution (RMD)
      const rmd = calculateRMD(balances, currentAgeInLoop);
      let traditionalWithdrawn = 0;
      if (rmd.required && rmd.amount > 0) {
        traditionalWithdrawn = applyRMD(balances, rmd.amount);
      }

      // RMD counts toward spending needs
      netSpendingNeeded -= traditionalWithdrawn;

      // Continue with normal withdrawal strategy for remaining spending needs
      if (netSpendingNeeded > 0) {
        // 1. Withdraw from taxable first (most tax-efficient)
        if (balances.taxable > 0) {
          const taxableWithdraw = Math.min(balances.taxable, netSpendingNeeded);
          balances.taxable -= taxableWithdraw;
          netSpendingNeeded -= taxableWithdraw;
        }

        // 2. Withdraw more from traditional accounts if needed (beyond RMD)
        if (netSpendingNeeded > 0 && balances.traditional401k > 0) {
          const tradWithdraw = Math.min(balances.traditional401k, netSpendingNeeded);
          balances.traditional401k -= tradWithdraw;
          netSpendingNeeded -= tradWithdraw;
        }

        if (netSpendingNeeded > 0 && balances.traditionalIRA > 0) {
          const iraWithdraw = Math.min(balances.traditionalIRA, netSpendingNeeded);
          balances.traditionalIRA -= iraWithdraw;
          netSpendingNeeded -= iraWithdraw;
        }

        // 3. Withdraw from Roth last (tax-free, preserve as long as possible)
        if (netSpendingNeeded > 0 && balances.roth401k > 0) {
          const rothWithdraw = Math.min(balances.roth401k, netSpendingNeeded);
          balances.roth401k -= rothWithdraw;
          netSpendingNeeded -= rothWithdraw;
        }

        if (netSpendingNeeded > 0 && balances.rothIRA > 0) {
          const rothIRAWithdraw = Math.min(balances.rothIRA, netSpendingNeeded);
          balances.rothIRA -= rothIRAWithdraw;
          netSpendingNeeded -= rothIRAWithdraw;
        }
      }

      // Adjust spending and SS for inflation
      currentSpending *= 1 + inflationRate / 100;
      if (ssActive) {
        // SS has COLA adjustments (use same inflation rate for simplicity)
        currentSSBenefit *= 1 + inflationRate / 100;
      }

      const totalBalance = getTotalBalance();

      if (savePath) {
        path.push({ age: currentAgeInLoop + 1, balance: totalBalance });
      }

      // If all accounts depleted, portfolio has failed
      if (totalBalance <= 0) {
        break;
      }
    }

    return { finalBalance: getTotalBalance(), path: path };
  }

  /**
   * Run all simulations with optional progress callback
   * @param {Function} [onProgress] - Called with progress percentage (0-100)
   */
  async runSimulations(onProgress) {
    const { numSimulations } = this.params;
    this.allEndingBalances = [];
    this.samplePaths = [];

    const batchSize = 1000;
    const numBatches = Math.ceil(numSimulations / batchSize);

    for (let batch = 0; batch < numBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, numSimulations);

      for (let i = batchStart; i < batchEnd; i++) {
        const savePath = this.samplePaths.length < 30;
        const result = this.runSingleSimulation(savePath);

        this.allEndingBalances.push(result.finalBalance);

        if (savePath && result.path) {
          this.samplePaths.push(result.path);
        }
      }

      // Update progress
      const progress = Math.round((batchEnd / numSimulations) * 100);
      if (onProgress) {
        onProgress(progress);
      }

      // Allow UI to update
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * Calculate statistics from simulation results
   * @returns {Object} { successRate, median, percentile10, percentile90 }
   */
  getStatistics() {
    // Safety check for empty data
    if (!this.allEndingBalances || this.allEndingBalances.length === 0) {
      return { successRate: 0, median: 0, percentile10: 0, percentile90: 0 };
    }

    const sorted = [...this.allEndingBalances].sort((a, b) => a - b);
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
   * Prepare histogram data for charting
   * @param {number} [numBins=15] - Number of histogram bins
   * @returns {Object} { labels: string[], data: number[] }
   */
  getHistogramData(numBins = 15) {
    // Safety check for empty data
    if (!this.allEndingBalances || this.allEndingBalances.length === 0) {
      return { labels: ['No Data'], data: [0] };
    }

    const sorted = [...this.allEndingBalances].sort((a, b) => a - b);
    const min = Math.min(...sorted);
    const max = Math.max(...sorted);
    const range = max - min;

    // Handle edge case where all values are the same (range = 0)
    const binWidth = range === 0 ? 1 : range / numBins;

    const bins = new Array(numBins).fill(0);
    const labels = [];

    for (let i = 0; i < numBins; i++) {
      const binStart = min + i * binWidth;
      labels.push(this._formatCurrency(binStart));
    }

    for (const balance of sorted) {
      const binIndex =
        range === 0 ? 0 : Math.min(Math.floor((balance - min) / binWidth), numBins - 1);
      bins[binIndex]++;
    }

    return { labels, data: bins };
  }

  /**
   * Format a currency value using the configured formatter
   * @param {number} value
   * @returns {string}
   */
  formatCurrency(value) {
    return this._formatCurrency(value);
  }
}
