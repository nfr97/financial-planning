/**
 * Transfer detection logic for identifying inter-account transfers
 * Extracted from transaction-analyzer.html for testability
 */

/**
 * Strong transfer indicators (require at least one for detection)
 */
export const strongTransferKeywords = [
  'transfer to',
  'transfer from',
  'online transfer',
  'credit card payment',
  'payment to card',
  'card payment',
  'ach payment',
  'electronic payment',
  'payment thank you',
  'autopay',
];

/**
 * Account reference patterns (common in inter-account transfers)
 */
export const accountPatterns = [
  /\*{4}\d{4}/, // ****1234
  /x{4}\d{4}/i, // xxxx1234
  /ending in \d{4}/i,
  /account.*\d{4}/i,
];

/**
 * Configuration for transfer detection
 */
export const TRANSFER_CONFIG = {
  DAYS_TOLERANCE: 3,
  AMOUNT_TOLERANCE: 0.01,
};

/**
 * Check if two transactions are likely a transfer pair
 * @param {Object} t1 - First transaction
 * @param {Object} t2 - Second transaction
 * @param {Object} [config] - Optional configuration override
 * @returns {boolean} Whether the transactions appear to be a transfer pair
 */
export function isTransferPair(t1, t2, config = TRANSFER_CONFIG) {
  // Check if amounts are opposite and match
  const amountMatch =
    Math.abs(Math.abs(t1.amount) - Math.abs(t2.amount)) <= config.AMOUNT_TOLERANCE;
  const oppositeSign = t1.amount > 0 !== t2.amount > 0;

  if (!amountMatch || !oppositeSign) return false;

  // Check date proximity
  const date1 = new Date(t1.date);
  const date2 = new Date(t2.date);
  const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));

  if (daysDiff > config.DAYS_TOLERANCE) return false;

  // Check for strong transfer indicators
  const desc1 = t1.description.toLowerCase();
  const desc2 = t2.description.toLowerCase();

  const hasStrongKeyword = strongTransferKeywords.some(
    (kw) => desc1.includes(kw) || desc2.includes(kw)
  );

  const hasAccountRef = accountPatterns.some(
    (pattern) => pattern.test(t1.description) || pattern.test(t2.description)
  );

  // Require strong evidence: keyword OR (same day + account reference)
  return hasStrongKeyword || (daysDiff === 0 && hasAccountRef);
}

/**
 * Mark inter-account transfers in a list of transactions
 * A transfer is detected when:
 * 1. Two transactions have opposite amounts (one positive, one negative)
 * 2. Amounts match exactly or within small tolerance
 * 3. Dates are within a few days
 * 4. At least one description contains strong transfer indicators
 *
 * @param {Object[]} transactions - Array of transaction objects
 * @param {Object} [config] - Optional configuration override
 * @returns {Object[]} Transactions with isTransfer and transferMatch fields set
 */
export function detectTransfers(transactions, config = TRANSFER_CONFIG) {
  // Reset all isTransfer flags (but preserve manual overrides)
  transactions.forEach((t) => {
    if (!t.manuallyUnmarkedTransfer) {
      t.isTransfer = false;
      t.transferMatch = null;
    }
  });

  for (let i = 0; i < transactions.length; i++) {
    const t1 = transactions[i];
    if (t1.isTransfer || t1.manuallyUnmarkedTransfer) continue;

    for (let j = i + 1; j < transactions.length; j++) {
      const t2 = transactions[j];
      if (t2.isTransfer || t2.manuallyUnmarkedTransfer) continue;

      if (isTransferPair(t1, t2, config)) {
        t1.isTransfer = true;
        t2.isTransfer = true;
        t1.transferMatch = t2.id;
        t2.transferMatch = t1.id;
        break;
      }
    }
  }

  return transactions;
}

/**
 * Get count of detected transfers
 * @param {Object[]} transactions - Array of transaction objects
 * @returns {number} Count of transactions marked as transfers
 */
export function getTransferCount(transactions) {
  return transactions.filter((t) => t.isTransfer).length;
}
