/**
 * Social Security calculator
 * Extracted from retirement-simulator.html for testability
 */

/**
 * Social Security Calculator class
 * Handles FRA calculation, benefit adjustments, and PIA estimation
 */
export class SocialSecurityCalculator {
  constructor(options = {}) {
    // 2024 bend points (these change annually, but are good approximations)
    this.bendPoint1 = options.bendPoint1 ?? 1174; // Monthly
    this.bendPoint2 = options.bendPoint2 ?? 7078; // Monthly
    this.maxTaxableEarnings = options.maxTaxableEarnings ?? 168600; // 2024 cap
  }

  /**
   * Calculate Full Retirement Age based on birth year
   * @param {number} birthYear - Year of birth
   * @returns {number} Full retirement age in years (may include fractional months)
   */
  getFullRetirementAge(birthYear) {
    if (birthYear <= 1937) return 65;
    if (birthYear <= 1938) return 65 + 2 / 12;
    if (birthYear <= 1939) return 65 + 4 / 12;
    if (birthYear <= 1940) return 65 + 6 / 12;
    if (birthYear <= 1941) return 65 + 8 / 12;
    if (birthYear <= 1942) return 65 + 10 / 12;
    if (birthYear <= 1954) return 66;
    if (birthYear <= 1955) return 66 + 2 / 12;
    if (birthYear <= 1956) return 66 + 4 / 12;
    if (birthYear <= 1957) return 66 + 6 / 12;
    if (birthYear <= 1958) return 66 + 8 / 12;
    if (birthYear <= 1959) return 66 + 10 / 12;
    return 67;
  }

  /**
   * Adjust benefit based on claiming age vs FRA
   * @param {number} pia - Primary Insurance Amount (monthly benefit at FRA)
   * @param {number} claimAge - Age at which benefits are claimed
   * @param {number} fra - Full Retirement Age
   * @returns {number} Adjusted monthly benefit
   */
  adjustBenefitForAge(pia, claimAge, fra) {
    const monthsDiff = (claimAge - fra) * 12;

    if (monthsDiff < 0) {
      // Early claiming - reduce benefit
      const monthsEarly = Math.abs(monthsDiff);
      let reduction = 0;

      // First 36 months: 5/9 of 1% per month
      const first36 = Math.min(monthsEarly, 36);
      reduction += (first36 * (5 / 9)) / 100;

      // Beyond 36 months: 5/12 of 1% per month
      if (monthsEarly > 36) {
        reduction += ((monthsEarly - 36) * (5 / 12)) / 100;
      }

      return pia * (1 - reduction);
    } else if (monthsDiff > 0) {
      // Delayed claiming - increase benefit (8% per year)
      const delayCredits = (monthsDiff / 12) * 0.08;
      return pia * (1 + delayCredits);
    }

    return pia;
  }

  /**
   * Estimate PIA from income (simplified AIME calculation)
   * @param {number} annualIncome - Current annual income
   * @param {number} yearsWorked - Years of work history
   * @returns {number} Estimated monthly PIA (rounded)
   */
  estimatePIA(annualIncome, yearsWorked) {
    // Cap at Social Security maximum
    const cappedIncome = Math.min(annualIncome, this.maxTaxableEarnings);

    // Estimate AIME (Average Indexed Monthly Earnings)
    // Simplified: assume income is representative of career average
    // Real SS uses highest 35 years, indexed for wage growth
    const effectiveYears = Math.min(yearsWorked, 35);
    const totalEarnings = cappedIncome * effectiveYears;
    const aime = totalEarnings / (35 * 12); // Always divide by 420 months

    // Calculate PIA using bend points
    let pia = 0;
    if (aime <= this.bendPoint1) {
      pia = aime * 0.9;
    } else if (aime <= this.bendPoint2) {
      pia = this.bendPoint1 * 0.9 + (aime - this.bendPoint1) * 0.32;
    } else {
      pia =
        this.bendPoint1 * 0.9 +
        (this.bendPoint2 - this.bendPoint1) * 0.32 +
        (aime - this.bendPoint2) * 0.15;
    }

    return Math.round(pia);
  }

  /**
   * Get annual benefit amount
   * @param {number} monthlyBenefit - Monthly benefit amount
   * @returns {number} Annual benefit amount
   */
  getAnnualBenefit(monthlyBenefit) {
    return monthlyBenefit * 12;
  }
}
