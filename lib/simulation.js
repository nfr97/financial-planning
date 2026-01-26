/**
 * Monte Carlo simulation utilities
 * Extracted from retirement-simulator.html for testability
 */

/**
 * Box-Muller transform for generating normally distributed random numbers
 * @param {number} mean - Mean of the distribution
 * @param {number} stdDev - Standard deviation
 * @param {Function} [randomFn] - Optional random function (defaults to Math.random)
 * @returns {number} Normally distributed random number
 */
export function generateNormalRandom(mean, stdDev, randomFn = Math.random) {
  // Clamp to avoid Math.log(0) = -Infinity when random returns exactly 0
  const u1 = Math.max(randomFn(), Number.EPSILON);
  const u2 = randomFn();

  // Box-Muller transform
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z0;
}

/**
 * Get life event impact for a specific age
 * @param {number} age - Current age
 * @param {Object[]} lifeEvents - Array of life event objects
 * @returns {Object} Impact object with expense and income properties
 */
export function getLifeEventImpact(age, lifeEvents) {
  let expenseImpact = 0;
  let incomeImpact = 0;

  for (const event of lifeEvents) {
    const eventStartAge = event.startAge;
    const eventEndAge = eventStartAge + event.duration;

    if (age >= eventStartAge && age < eventEndAge) {
      if (event.type === 'expense') {
        expenseImpact += event.amount;
      } else {
        incomeImpact += event.amount;
      }
    }
  }

  return { expense: expenseImpact, income: incomeImpact };
}

/**
 * Calculate effective tax rate for traditional withdrawals
 * Simplified progressive tax estimate (2024 brackets, single filer)
 * @param {number} withdrawal - Traditional account withdrawal amount
 * @param {number} ssIncome - Social Security income
 * @returns {number} Effective tax rate (0.10 to 0.37)
 */
export function calculateTaxRate(withdrawal, ssIncome) {
  const totalIncome = withdrawal + ssIncome * 0.85; // 85% of SS is taxable at higher incomes

  if (totalIncome <= 11600) return 0.1;
  if (totalIncome <= 47150) return 0.12;
  if (totalIncome <= 100525) return 0.22;
  if (totalIncome <= 191950) return 0.24;
  if (totalIncome <= 243725) return 0.32;
  if (totalIncome <= 609350) return 0.35;
  return 0.37;
}

/**
 * Initialize account balances for simulation
 * @param {Object} params - Simulation parameters
 * @returns {Object} Object containing balances and contributions objects
 */
export function initializeAccounts(params) {
  const { advancedMode, accounts, contributions, currentSavings, annualContribution } = params;

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
      traditional401k: currentSavings || 0,
      roth401k: 0,
      traditionalIRA: 0,
      rothIRA: 0,
      taxable: 0,
    };
    contribs = {
      traditional401k: annualContribution || 0,
      roth401k: 0,
      traditionalIRA: 0,
      rothIRA: 0,
      taxable: 0,
    };
  }

  return { balances, contributions: contribs };
}

/**
 * Get total balance across all accounts
 * @param {Object} balances - Account balances object
 * @returns {number} Total balance
 */
export function getTotalBalance(balances) {
  return Object.values(balances).reduce((a, b) => a + b, 0);
}

/**
 * Apply market returns to all accounts
 * @param {Object} balances - Account balances object (mutated)
 * @param {number} returnRate - Return rate for this period
 */
export function applyMarketReturns(balances, returnRate) {
  for (const acct of Object.keys(balances)) {
    balances[acct] = balances[acct] * (1 + returnRate);
  }
}

/**
 * Add contributions to accounts
 * @param {Object} balances - Account balances object (mutated)
 * @param {Object} contributions - Contribution amounts object
 */
export function addContributions(balances, contributions) {
  balances.traditional401k += contributions.traditional401k;
  balances.roth401k += contributions.roth401k;
  balances.traditionalIRA += contributions.traditionalIRA;
  balances.rothIRA += contributions.rothIRA;
  balances.taxable += contributions.taxable;
}

/**
 * Withdraw from accounts using tax-efficient ordering
 * Order: Taxable → Traditional → Roth
 * @param {Object} balances - Account balances object (mutated)
 * @param {number} amount - Amount to withdraw
 * @returns {number} Remaining amount that couldn't be withdrawn
 */
export function withdrawFromAccounts(balances, amount) {
  let remaining = amount;

  // 1. Withdraw from taxable first (most tax-efficient)
  if (remaining > 0 && balances.taxable > 0) {
    const taxableWithdraw = Math.min(balances.taxable, remaining);
    balances.taxable -= taxableWithdraw;
    remaining -= taxableWithdraw;
  }

  // 2. Withdraw from traditional accounts (tax at ordinary rates)
  if (remaining > 0 && balances.traditional401k > 0) {
    const tradWithdraw = Math.min(balances.traditional401k, remaining);
    balances.traditional401k -= tradWithdraw;
    remaining -= tradWithdraw;
  }

  if (remaining > 0 && balances.traditionalIRA > 0) {
    const iraWithdraw = Math.min(balances.traditionalIRA, remaining);
    balances.traditionalIRA -= iraWithdraw;
    remaining -= iraWithdraw;
  }

  // 3. Withdraw from Roth last (tax-free, preserve as long as possible)
  if (remaining > 0 && balances.roth401k > 0) {
    const rothWithdraw = Math.min(balances.roth401k, remaining);
    balances.roth401k -= rothWithdraw;
    remaining -= rothWithdraw;
  }

  if (remaining > 0 && balances.rothIRA > 0) {
    const rothIRAWithdraw = Math.min(balances.rothIRA, remaining);
    balances.rothIRA -= rothIRAWithdraw;
    remaining -= rothIRAWithdraw;
  }

  return remaining;
}

/**
 * RMD Uniform Lifetime Table (IRS Publication 590-B)
 * Maps age to distribution period
 */
const RMD_TABLE = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

/**
 * RMD start age (SECURE 2.0 Act)
 */
export const RMD_START_AGE = 73;

/**
 * Calculate Required Minimum Distribution for traditional accounts
 * @param {Object} balances - Account balances object
 * @param {number} age - Current age
 * @returns {Object} { required: boolean, amount: number, period: number|null }
 */
export function calculateRMD(balances, age) {
  if (age < RMD_START_AGE) {
    return { required: false, amount: 0, period: null };
  }

  // Total traditional account balance subject to RMD
  const traditionalBalance = (balances.traditional401k || 0) + (balances.traditionalIRA || 0);

  if (traditionalBalance <= 0) {
    return { required: true, amount: 0, period: null };
  }

  // Get distribution period from table
  const lookupAge = Math.min(age, 120);
  const period = RMD_TABLE[lookupAge] || 2.0;

  const rmdAmount = traditionalBalance / period;

  return {
    required: true,
    amount: rmdAmount,
    period,
  };
}

/**
 * Apply RMD withdrawals from traditional accounts
 * @param {Object} balances - Account balances object (mutated)
 * @param {number} rmdAmount - RMD amount to withdraw
 * @returns {number} Amount actually withdrawn
 */
export function applyRMD(balances, rmdAmount) {
  let remaining = rmdAmount;
  let totalWithdrawn = 0;

  // Withdraw from traditional 401k first
  if (remaining > 0 && balances.traditional401k > 0) {
    const withdraw = Math.min(balances.traditional401k, remaining);
    balances.traditional401k -= withdraw;
    remaining -= withdraw;
    totalWithdrawn += withdraw;
  }

  // Then from traditional IRA
  if (remaining > 0 && balances.traditionalIRA > 0) {
    const withdraw = Math.min(balances.traditionalIRA, remaining);
    balances.traditionalIRA -= withdraw;
    remaining -= withdraw;
    totalWithdrawn += withdraw;
  }

  return totalWithdrawn;
}
