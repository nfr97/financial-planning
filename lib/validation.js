/**
 * Input Validation Library
 * Provides comprehensive validation for financial planning inputs
 */

import { CONTRIBUTION_LIMITS_2024 } from './tax-parameters.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string|null} error - Error message if invalid
 * @property {*} value - Parsed/cleaned value if valid
 */

/**
 * Validate a single field value
 * @param {*} value - The value to validate
 * @param {Object} rules - Validation rules
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {ValidationResult}
 */
export function validateField(value, rules, fieldName) {
  const result = { valid: true, error: null, value: value };

  // Handle empty/undefined values
  if (value === undefined || value === null || value === '') {
    if (rules.required) {
      return { valid: false, error: `${fieldName} is required`, value: null };
    }
    if (rules.default !== undefined) {
      return { valid: true, error: null, value: rules.default };
    }
    return { valid: true, error: null, value: null };
  }

  // Type validation and parsing
  if (rules.type === 'number') {
    // Handle currency string inputs (e.g., "$1,234.56")
    let parsed = value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and whitespace
      const cleaned = value.replace(/[$,\s]/g, '');
      parsed = parseFloat(cleaned);
    }

    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      return { valid: false, error: `${fieldName} must be a valid number`, value: null };
    }
    result.value = parsed;
  } else if (rules.type === 'integer') {
    let parsed = value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      // Check if the string contains a decimal point (not a whole number)
      if (cleaned.includes('.') && !/\.0*$/.test(cleaned)) {
        return { valid: false, error: `${fieldName} must be a whole number`, value: null };
      }
      parsed = parseInt(cleaned, 10);
    } else if (typeof value === 'number' && !Number.isInteger(value)) {
      return { valid: false, error: `${fieldName} must be a whole number`, value: null };
    }

    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      return { valid: false, error: `${fieldName} must be a whole number`, value: null };
    }
    result.value = parsed;
  } else if (rules.type === 'percentage') {
    let parsed = value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[%\s]/g, '');
      parsed = parseFloat(cleaned);
    }

    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      return { valid: false, error: `${fieldName} must be a valid percentage`, value: null };
    }
    result.value = parsed;
  }

  // Range validation (for numbers)
  if (typeof result.value === 'number') {
    if (rules.min !== undefined && result.value < rules.min) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${rules.min}`,
        value: result.value,
      };
    }
    if (rules.max !== undefined && result.value > rules.max) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${rules.max}`,
        value: result.value,
      };
    }
    if (rules.positive && result.value < 0) {
      return {
        valid: false,
        error: `${fieldName} cannot be negative`,
        value: result.value,
      };
    }
  }

  return result;
}

/**
 * Cross-field validation for retirement simulation parameters
 * @param {Object} params - All simulation parameters
 * @returns {Object} Validation result with errors array
 */
export function validateRetirementParams(params) {
  const errors = [];
  const warnings = [];

  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    ssStartAge,
    currentSavings,
    annualContribution,
    annualSpending,
    expectedReturn,
    returnVolatility,
  } = params;

  // Age validations
  if (currentAge !== undefined && retirementAge !== undefined) {
    if (currentAge >= retirementAge) {
      errors.push('Current age must be less than retirement age');
    }
    if (retirementAge - currentAge > 50) {
      warnings.push('Retirement is more than 50 years away - results may be less accurate');
    }
  }

  if (retirementAge !== undefined && lifeExpectancy !== undefined) {
    if (retirementAge >= lifeExpectancy) {
      errors.push('Retirement age must be less than life expectancy');
    }
    if (lifeExpectancy > 120) {
      warnings.push('Life expectancy over 120 is unusual');
    }
  }

  // Social Security age validation
  if (ssStartAge !== undefined) {
    if (ssStartAge < 62) {
      errors.push('Social Security cannot start before age 62');
    }
    if (ssStartAge > 70) {
      errors.push('Social Security claiming is capped at age 70');
    }
  }

  // Financial validations
  if (currentSavings !== undefined && currentSavings < 0) {
    errors.push('Current savings cannot be negative');
  }

  if (annualContribution !== undefined && annualContribution < 0) {
    errors.push('Annual contribution cannot be negative');
  }

  if (annualSpending !== undefined && annualSpending < 0) {
    errors.push('Annual spending cannot be negative');
  }

  // Return assumptions
  if (expectedReturn !== undefined) {
    if (expectedReturn > 20) {
      warnings.push('Expected return over 20% is very optimistic');
    }
    if (expectedReturn < -10) {
      warnings.push('Expected return below -10% suggests a sustained bear market');
    }
  }

  if (returnVolatility !== undefined) {
    if (returnVolatility < 0) {
      errors.push('Volatility cannot be negative');
    }
    if (returnVolatility > 50) {
      warnings.push('Volatility over 50% is extremely high');
    }
  }

  if (params.contributions) {
    const catchUpEligible = currentAge >= 50;
    const max401k =
      CONTRIBUTION_LIMITS_2024.traditional401k +
      (catchUpEligible ? CONTRIBUTION_LIMITS_2024.traditional401kCatchUp : 0);
    const maxIRA =
      CONTRIBUTION_LIMITS_2024.traditionalIRA +
      (catchUpEligible ? CONTRIBUTION_LIMITS_2024.traditionalIRACatchUp : 0);

    const total401k =
      (params.contributions.traditional401k || 0) + (params.contributions.roth401k || 0);
    const totalIRA =
      (params.contributions.traditionalIRA || 0) + (params.contributions.rothIRA || 0);

    if (total401k > max401k) {
      warnings.push(
        `Total 401(k) contributions ($${total401k.toLocaleString()}) exceed IRS limit ($${max401k.toLocaleString()})`
      );
    }
    if (totalIRA > maxIRA) {
      warnings.push(
        `Total IRA contributions ($${totalIRA.toLocaleString()}) exceed IRS limit ($${maxIRA.toLocaleString()})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate budget allocation percentages
 * @param {Object} allocations - Budget allocations { fixedCosts, shortTerm, longTerm, guiltFree }
 * @returns {Object} Validation result
 */
export function validateBudgetAllocations(allocations) {
  const errors = [];
  const warnings = [];

  const { fixedCosts = 0, shortTerm = 0, longTerm = 0, guiltFree = 0 } = allocations;

  const total = fixedCosts + shortTerm + longTerm + guiltFree;

  if (Math.abs(total - 100) > 0.01) {
    errors.push(`Budget allocations must sum to 100% (currently ${total.toFixed(1)}%)`);
  }

  // Check for negative values
  if (fixedCosts < 0 || shortTerm < 0 || longTerm < 0 || guiltFree < 0) {
    errors.push('Budget allocations cannot be negative');
  }

  // Reasonable range warnings
  if (fixedCosts > 80) {
    warnings.push('Fixed costs over 80% leaves little room for savings or flexibility');
  }
  if (longTerm < 10 && fixedCosts > 0) {
    warnings.push('Long-term savings below 10% may not be enough for retirement');
  }
  if (guiltFree > 50) {
    warnings.push('Guilt-free spending over 50% may impact financial goals');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate session import data schema
 * @param {Object} session - Imported session data
 * @returns {Object} Validation result with cleaned data
 */
export function validateSessionSchema(session) {
  const errors = [];
  const warnings = [];
  const cleaned = {};

  // Check version
  if (!session.version) {
    warnings.push('Session file missing version - attempting import anyway');
  } else if (session.version !== '1.0') {
    warnings.push(`Session version ${session.version} may not be fully compatible`);
  }
  cleaned.version = session.version || '1.0';

  // Validate exportedAt
  if (session.exportedAt) {
    const date = new Date(session.exportedAt);
    if (isNaN(date.getTime())) {
      warnings.push('Invalid export date - ignoring');
    } else {
      cleaned.exportedAt = session.exportedAt;
    }
  }

  // Validate budget planner data
  if (session.budgetPlanner) {
    if (typeof session.budgetPlanner !== 'object') {
      errors.push('Invalid budget planner data format');
    } else {
      const bp = session.budgetPlanner;
      if (bp.monthlyIncome !== undefined && typeof bp.monthlyIncome !== 'number') {
        errors.push('Budget planner monthlyIncome must be a number');
      } else {
        cleaned.budgetPlanner = bp;
      }
    }
  }

  // Validate spending tracker data
  if (session.spendingTracker) {
    if (typeof session.spendingTracker !== 'object') {
      errors.push('Invalid spending tracker data format');
    } else {
      cleaned.spendingTracker = session.spendingTracker;
    }
  }

  // Validate retirement forecast data
  if (session.retirementForecast) {
    if (typeof session.retirementForecast !== 'object') {
      errors.push('Invalid retirement forecast data format');
    } else {
      cleaned.retirementForecast = session.retirementForecast;
    }
  }

  // Validate life events
  if (session.lifeEvents) {
    if (!Array.isArray(session.lifeEvents)) {
      errors.push('Life events must be an array');
    } else {
      // Validate each life event
      const validEvents = session.lifeEvents.filter((event) => {
        return (
          event &&
          typeof event === 'object' &&
          typeof event.amount === 'number' &&
          typeof event.startAge === 'number'
        );
      });
      if (validEvents.length !== session.lifeEvents.length) {
        warnings.push(
          `${session.lifeEvents.length - validEvents.length} invalid life events were skipped`
        );
      }
      cleaned.lifeEvents = validEvents;
    }
  }

  // Validate transaction rules
  if (session.transactionRules) {
    if (typeof session.transactionRules !== 'object' || Array.isArray(session.transactionRules)) {
      errors.push('Transaction rules must be an object');
    } else {
      cleaned.transactionRules = session.transactionRules;
    }
  }

  // Validate transaction data
  if (session.transactionData) {
    if (!Array.isArray(session.transactionData)) {
      errors.push('Transaction data must be an array');
    } else {
      cleaned.transactionData = session.transactionData;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: cleaned,
  };
}

/**
 * Show validation error on a form field
 * @param {string} fieldId - The DOM element ID
 * @param {string} message - Error message to display
 * @param {string} [type='error'] - 'error' or 'warning'
 */
export function showFieldValidation(fieldId, message, type = 'error') {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // Remove existing validation message
  const existingMsg = field.parentElement?.querySelector('.validation-message');
  if (existingMsg) existingMsg.remove();

  // Add error styling
  field.classList.add(`validation-${type}`);
  field.setAttribute('aria-invalid', type === 'error' ? 'true' : 'false');

  // Create and insert message
  const msg = document.createElement('div');
  msg.className = `validation-message validation-${type}`;
  msg.textContent = message;
  msg.setAttribute('role', 'alert');
  field.parentElement?.appendChild(msg);
}

/**
 * Clear validation error from a form field
 * @param {string} fieldId - The DOM element ID
 */
export function clearFieldValidation(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.remove('validation-error', 'validation-warning');
  field.setAttribute('aria-invalid', 'false');

  const existingMsg = field.parentElement?.querySelector('.validation-message');
  if (existingMsg) existingMsg.remove();
}

/**
 * Get CSS for validation styling
 * @returns {string} CSS styles
 */
export function getValidationStyles() {
  return `
    .validation-error {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
    }

    .validation-warning {
      border-color: #f59e0b !important;
      background-color: #fffbeb !important;
    }

    .validation-message {
      font-size: 0.85em;
      margin-top: 4px;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .validation-message.validation-error {
      color: #dc2626;
      background-color: #fef2f2;
    }

    .validation-message.validation-warning {
      color: #d97706;
      background-color: #fffbeb;
    }
  `;
}

/**
 * Parse currency input safely with validation
 * @param {string|number} value - Input value
 * @param {number} defaultValue - Default if parsing fails
 * @param {string} fieldName - Field name for error reporting
 * @returns {Object} { value: number, error: string|null }
 */
export function parseCurrency(value, defaultValue = 0, fieldName = 'Value') {
  if (value === undefined || value === null || value === '') {
    return { value: defaultValue, error: null };
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !Number.isFinite(value)) {
      return { value: defaultValue, error: `${fieldName} is not a valid number` };
    }
    return { value, error: null };
  }

  // Parse string value
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return { value: defaultValue, error: `${fieldName} could not be parsed as a number` };
  }

  return { value: parsed, error: null };
}

/**
 * Parse integer input safely with validation
 * @param {string|number} value - Input value
 * @param {number} defaultValue - Default if parsing fails
 * @param {string} fieldName - Field name for error reporting
 * @returns {Object} { value: number, error: string|null }
 */
export function parseInteger(value, defaultValue = 0, fieldName = 'Value') {
  if (value === undefined || value === null || value === '') {
    return { value: defaultValue, error: null };
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !Number.isFinite(value)) {
      return { value: defaultValue, error: `${fieldName} is not a valid number` };
    }
    return { value: Math.round(value), error: null };
  }

  const cleaned = String(value).replace(/[$,\s]/g, '');
  const parsed = parseInt(cleaned, 10);

  if (isNaN(parsed)) {
    return { value: defaultValue, error: `${fieldName} must be a whole number` };
  }

  return { value: parsed, error: null };
}
