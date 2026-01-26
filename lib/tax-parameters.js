/**
 * Tax Parameters Module
 * Configurable tax data for easy annual updates
 *
 * Sources:
 * - IRS Publication 590-B (IRA Distributions)
 * - IRS Revenue Procedure (annual inflation adjustments)
 * - Social Security Administration (wage base, bend points)
 */

/**
 * Federal tax brackets for single filers (2024)
 * Source: IRS Revenue Procedure 2023-34
 */
export const FEDERAL_TAX_BRACKETS_2024 = [
  { min: 0, max: 11600, rate: 0.1 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

/**
 * Federal tax brackets for married filing jointly (2024)
 */
export const FEDERAL_TAX_BRACKETS_MFJ_2024 = [
  { min: 0, max: 23200, rate: 0.1 },
  { min: 23200, max: 94300, rate: 0.12 },
  { min: 94300, max: 201050, rate: 0.22 },
  { min: 201050, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: Infinity, rate: 0.37 },
];

/**
 * Social Security parameters (2024)
 * Source: Social Security Administration
 */
export const SOCIAL_SECURITY_2024 = {
  maxTaxableEarnings: 168600,
  bendPoint1: 1174, // Monthly AIME
  bendPoint2: 7078, // Monthly AIME
  replacement1: 0.9, // First 90%
  replacement2: 0.32, // Next 32%
  replacement3: 0.15, // Final 15%
  colaAdjustment: 0.032, // 3.2% COLA for 2024
};

/**
 * Retirement contribution limits (2024)
 * Source: IRS Notice 2023-75
 */
export const CONTRIBUTION_LIMITS_2024 = {
  traditional401k: 23000,
  traditional401kCatchUp: 7500, // Age 50+
  traditionalIRA: 7000,
  traditionalIRACatchUp: 1000, // Age 50+
  rothIRA: 7000,
  rothIRACatchUp: 1000, // Age 50+
  // Income limits for Roth IRA (single)
  rothPhaseOutStart: 146000,
  rothPhaseOutEnd: 161000,
  // Income limits for Roth IRA (married filing jointly)
  rothPhaseOutStartMFJ: 230000,
  rothPhaseOutEndMFJ: 240000,
};

/**
 * Required Minimum Distribution (RMD) parameters
 * Source: IRS Publication 590-B, Uniform Lifetime Table
 *
 * The Uniform Lifetime Table is used when:
 * - Your spouse is not your sole beneficiary, OR
 * - Your spouse IS your sole beneficiary but is not more than 10 years younger
 */
export const RMD_PARAMETERS = {
  startAge: 73, // SECURE 2.0: Age 73 for those turning 72 after 2022
  // Uniform Lifetime Table (age: distribution period)
  // Used to calculate minimum distribution
  uniformLifetimeTable: {
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
  },
};

/**
 * State income tax rates (simplified - top marginal rate)
 * Source: Tax Foundation State Individual Income Tax Rates and Brackets (2024)
 *
 * Note: This is a simplified model using the top marginal rate.
 * Actual state taxes use progressive brackets. This is suitable for
 * retirement planning estimates, not tax preparation.
 */
export const STATE_TAX_RATES = {
  // No state income tax
  AK: { name: 'Alaska', rate: 0, hasIncomeTax: false },
  FL: { name: 'Florida', rate: 0, hasIncomeTax: false },
  NV: { name: 'Nevada', rate: 0, hasIncomeTax: false },
  NH: { name: 'New Hampshire', rate: 0, hasIncomeTax: false, note: 'Interest/dividends only' },
  SD: { name: 'South Dakota', rate: 0, hasIncomeTax: false },
  TN: { name: 'Tennessee', rate: 0, hasIncomeTax: false },
  TX: { name: 'Texas', rate: 0, hasIncomeTax: false },
  WA: { name: 'Washington', rate: 0, hasIncomeTax: false },
  WY: { name: 'Wyoming', rate: 0, hasIncomeTax: false },

  // Flat tax states
  AZ: { name: 'Arizona', rate: 0.025, hasIncomeTax: true, type: 'flat' },
  CO: { name: 'Colorado', rate: 0.044, hasIncomeTax: true, type: 'flat' },
  GA: { name: 'Georgia', rate: 0.0549, hasIncomeTax: true, type: 'flat' },
  ID: { name: 'Idaho', rate: 0.058, hasIncomeTax: true, type: 'flat' },
  IL: { name: 'Illinois', rate: 0.0495, hasIncomeTax: true, type: 'flat' },
  IN: { name: 'Indiana', rate: 0.0305, hasIncomeTax: true, type: 'flat' },
  KY: { name: 'Kentucky', rate: 0.04, hasIncomeTax: true, type: 'flat' },
  MA: { name: 'Massachusetts', rate: 0.05, hasIncomeTax: true, type: 'flat' },
  MI: { name: 'Michigan', rate: 0.0425, hasIncomeTax: true, type: 'flat' },
  NC: { name: 'North Carolina', rate: 0.0475, hasIncomeTax: true, type: 'flat' },
  PA: { name: 'Pennsylvania', rate: 0.0307, hasIncomeTax: true, type: 'flat' },
  UT: { name: 'Utah', rate: 0.0465, hasIncomeTax: true, type: 'flat' },

  // Progressive tax states (top marginal rate)
  AL: { name: 'Alabama', rate: 0.05, hasIncomeTax: true, type: 'progressive' },
  AR: { name: 'Arkansas', rate: 0.044, hasIncomeTax: true, type: 'progressive' },
  CA: { name: 'California', rate: 0.133, hasIncomeTax: true, type: 'progressive' },
  CT: { name: 'Connecticut', rate: 0.0699, hasIncomeTax: true, type: 'progressive' },
  DE: { name: 'Delaware', rate: 0.066, hasIncomeTax: true, type: 'progressive' },
  DC: { name: 'District of Columbia', rate: 0.1075, hasIncomeTax: true, type: 'progressive' },
  HI: { name: 'Hawaii', rate: 0.11, hasIncomeTax: true, type: 'progressive' },
  IA: { name: 'Iowa', rate: 0.0575, hasIncomeTax: true, type: 'progressive' },
  KS: { name: 'Kansas', rate: 0.057, hasIncomeTax: true, type: 'progressive' },
  LA: { name: 'Louisiana', rate: 0.0425, hasIncomeTax: true, type: 'progressive' },
  ME: { name: 'Maine', rate: 0.0715, hasIncomeTax: true, type: 'progressive' },
  MD: { name: 'Maryland', rate: 0.0575, hasIncomeTax: true, type: 'progressive' },
  MN: { name: 'Minnesota', rate: 0.0985, hasIncomeTax: true, type: 'progressive' },
  MS: { name: 'Mississippi', rate: 0.05, hasIncomeTax: true, type: 'progressive' },
  MO: { name: 'Missouri', rate: 0.048, hasIncomeTax: true, type: 'progressive' },
  MT: { name: 'Montana', rate: 0.059, hasIncomeTax: true, type: 'progressive' },
  NE: { name: 'Nebraska', rate: 0.0584, hasIncomeTax: true, type: 'progressive' },
  NJ: { name: 'New Jersey', rate: 0.1075, hasIncomeTax: true, type: 'progressive' },
  NM: { name: 'New Mexico', rate: 0.059, hasIncomeTax: true, type: 'progressive' },
  NY: { name: 'New York', rate: 0.109, hasIncomeTax: true, type: 'progressive' },
  ND: { name: 'North Dakota', rate: 0.025, hasIncomeTax: true, type: 'progressive' },
  OH: { name: 'Ohio', rate: 0.035, hasIncomeTax: true, type: 'progressive' },
  OK: { name: 'Oklahoma', rate: 0.0475, hasIncomeTax: true, type: 'progressive' },
  OR: { name: 'Oregon', rate: 0.099, hasIncomeTax: true, type: 'progressive' },
  RI: { name: 'Rhode Island', rate: 0.0599, hasIncomeTax: true, type: 'progressive' },
  SC: { name: 'South Carolina', rate: 0.064, hasIncomeTax: true, type: 'progressive' },
  VT: { name: 'Vermont', rate: 0.0875, hasIncomeTax: true, type: 'progressive' },
  VA: { name: 'Virginia', rate: 0.0575, hasIncomeTax: true, type: 'progressive' },
  WV: { name: 'West Virginia', rate: 0.0512, hasIncomeTax: true, type: 'progressive' },
  WI: { name: 'Wisconsin', rate: 0.0765, hasIncomeTax: true, type: 'progressive' },
};

/**
 * Calculate federal income tax using progressive brackets
 * @param {number} taxableIncome - Taxable income
 * @param {string} filingStatus - 'single' or 'mfj' (married filing jointly)
 * @returns {number} Federal income tax
 */
export function calculateFederalTax(taxableIncome, filingStatus = 'single') {
  const brackets =
    filingStatus === 'mfj' ? FEDERAL_TAX_BRACKETS_MFJ_2024 : FEDERAL_TAX_BRACKETS_2024;

  let tax = 0;
  let remainingIncome = taxableIncome;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return tax;
}

/**
 * Calculate effective tax rate
 * @param {number} taxableIncome - Taxable income
 * @param {string} filingStatus - 'single' or 'mfj'
 * @returns {number} Effective tax rate (0-1)
 */
export function getEffectiveTaxRate(taxableIncome, filingStatus = 'single') {
  if (taxableIncome <= 0) return 0;
  const tax = calculateFederalTax(taxableIncome, filingStatus);
  return tax / taxableIncome;
}

/**
 * Get marginal tax rate for a given income
 * @param {number} taxableIncome - Taxable income
 * @param {string} filingStatus - 'single' or 'mfj'
 * @returns {number} Marginal tax rate (0-1)
 */
export function getMarginalTaxRate(taxableIncome, filingStatus = 'single') {
  const brackets =
    filingStatus === 'mfj' ? FEDERAL_TAX_BRACKETS_MFJ_2024 : FEDERAL_TAX_BRACKETS_2024;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.max) {
      return bracket.rate;
    }
  }

  return brackets[brackets.length - 1].rate;
}

/**
 * Calculate Required Minimum Distribution
 * @param {number} accountBalance - Traditional IRA/401k balance at year end
 * @param {number} age - Age at end of year
 * @returns {Object} { required: boolean, amount: number, distributionPeriod: number }
 */
export function calculateRMD(accountBalance, age) {
  if (age < RMD_PARAMETERS.startAge) {
    return { required: false, amount: 0, distributionPeriod: null };
  }

  // Cap age at 120 for table lookup
  const lookupAge = Math.min(age, 120);
  const distributionPeriod = RMD_PARAMETERS.uniformLifetimeTable[lookupAge];

  if (!distributionPeriod) {
    // Age beyond table - use minimum period
    return {
      required: true,
      amount: accountBalance / 2.0,
      distributionPeriod: 2.0,
    };
  }

  const rmdAmount = accountBalance / distributionPeriod;

  return {
    required: true,
    amount: rmdAmount,
    distributionPeriod,
  };
}

/**
 * Calculate state income tax
 * @param {number} taxableIncome - Taxable income
 * @param {string} stateCode - Two-letter state code
 * @returns {number} State income tax
 */
export function calculateStateTax(taxableIncome, stateCode) {
  const state = STATE_TAX_RATES[stateCode];
  if (!state || !state.hasIncomeTax) {
    return 0;
  }

  // Simplified: use top marginal rate * income
  // This overestimates for progressive states, but is reasonable for planning
  return taxableIncome * state.rate;
}

/**
 * Get all states sorted by name
 * @returns {Array} Array of { code, name, rate, hasIncomeTax }
 */
export function getStateList() {
  return Object.entries(STATE_TAX_RATES)
    .map(([code, data]) => ({
      code,
      name: data.name,
      rate: data.rate,
      hasIncomeTax: data.hasIncomeTax,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get maximum contribution limit for account type
 * @param {string} accountType - 'traditional401k', 'traditionalIRA', 'rothIRA'
 * @param {number} age - Current age
 * @returns {number} Maximum contribution
 */
export function getContributionLimit(accountType, age) {
  const catchUpEligible = age >= 50;
  const limits = CONTRIBUTION_LIMITS_2024;

  switch (accountType) {
    case 'traditional401k':
    case 'roth401k':
      return limits.traditional401k + (catchUpEligible ? limits.traditional401kCatchUp : 0);
    case 'traditionalIRA':
    case 'rothIRA':
      return limits.traditionalIRA + (catchUpEligible ? limits.traditionalIRACatchUp : 0);
    default:
      return 0;
  }
}
