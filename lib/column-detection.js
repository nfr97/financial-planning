/**
 * Column detection logic for CSV imports
 * Extracted from transaction-analyzer.html for testability
 */

/**
 * Default column name configurations
 */
export const DEFAULT_COLUMN_CONFIG = {
  dateCol: [
    'Date',
    'Transaction Date',
    'Trans Date',
    'Trans. Date',
    'Posted Date',
    'Posting Date',
    'Post Date',
    'Settlement Date',
    'Trade Date',
    'Value Date',
    'Effective Date',
    'Process Date',
    'Txn Date',
    'Transaction_Date',
    'TransactionDate',
    'BookingDate',
    'Booking Date',
    'Entry Date',
    'Cleared Date',
  ],
  descCol: [
    'Description',
    'Memo',
    'Name',
    'Merchant',
    'Payee',
    'Transaction Description',
    'Trans Description',
    'Details',
    'Original Description',
    'Narrative',
    'Particulars',
    'Reference',
    'Transaction',
    'Trans',
    'Merchant Name',
    'Vendor',
    'Payee Name',
    'Transaction Details',
    'Payment Details',
    'Remarks',
  ],
  amountCol: [
    'Amount',
    'Transaction Amount',
    'Value',
    'Sum',
    'Total',
    'Net Amount',
    'Payment Amount',
    'Trans Amount',
    'Amt',
  ],
  debitCol: [
    'Debit',
    'Debit Amount',
    'Debits',
    'Withdrawal',
    'Withdrawals',
    'Money Out',
    'Spent',
    'Charge',
    'Charges',
    'Debit Amt',
    'Expense',
    'Outflow',
  ],
  creditCol: [
    'Credit',
    'Credit Amount',
    'Credits',
    'Deposit',
    'Deposits',
    'Money In',
    'Received',
    'Payment Received',
    'Refund',
    'Credit Amt',
    'Inflow',
  ],
  typeCol: ['Transaction Type', 'Trans Type', 'Type', 'Tran Type'],
};

/**
 * Normalize a string for flexible matching
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.\-_]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Find column index by matching against possible names
 * Uses three-pass matching: exact, normalized, then partial
 * @param {string[]} header - Array of header column names
 * @param {string|string[]} possibleNames - Name(s) to search for
 * @returns {number} Column index or -1 if not found
 */
export function findColumnIndex(header, possibleNames) {
  const namesToCheck = typeof possibleNames === 'string' ? [possibleNames] : possibleNames;

  // First pass: exact match (case-insensitive)
  for (const name of namesToCheck) {
    const idx = header.findIndex((h) => h.toLowerCase().trim() === name.toLowerCase());
    if (idx !== -1) return idx;
  }

  // Second pass: normalized match (handles punctuation/spacing differences)
  for (const name of namesToCheck) {
    const normalizedName = normalize(name);
    const idx = header.findIndex((h) => normalize(h) === normalizedName);
    if (idx !== -1) return idx;
  }

  // Third pass: partial match (header contains the search term)
  // Only match if header is MORE specific than pattern (e.g., "Transaction Amount" matches "Amount")
  // Do NOT match if pattern is more specific (e.g., "Debit Amount" should NOT match plain "Amount" header)
  for (const name of namesToCheck) {
    const normalizedName = normalize(name);
    const idx = header.findIndex((h) => {
      const normalizedHeader = normalize(h);
      // Only match if header contains the pattern name (header is more specific)
      return normalizedHeader.includes(normalizedName);
    });
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Detect columns with expanded logic for Debit/Credit
 * @param {string[]} header - Array of header column names
 * @param {string[][]} sampleRows - Sample data rows for analysis
 * @param {Object} [columnConfig] - Optional custom column configuration
 * @returns {Object} Detection result with column indices and mode
 */
export function detectColumns(header, sampleRows, columnConfig = DEFAULT_COLUMN_CONFIG) {
  const dateIdx = findColumnIndex(header, columnConfig.dateCol);
  const descIdx = findColumnIndex(header, columnConfig.descCol);
  let amountIdx = findColumnIndex(header, columnConfig.amountCol);
  const debitIdx = findColumnIndex(header, columnConfig.debitCol);
  const creditIdx = findColumnIndex(header, columnConfig.creditCol);
  const typeIdx = findColumnIndex(header, columnConfig.typeCol);

  // Check if we have the required columns
  const hasDate = dateIdx !== -1;
  const hasDesc = descIdx !== -1;
  let hasAmount = amountIdx !== -1;
  const hasDebitCredit = debitIdx !== -1 && creditIdx !== -1;
  const hasTypeColumn = typeIdx !== -1;

  // If we matched Amount to a Debit or Credit column, clear it and use split mode
  if (hasAmount && (amountIdx === debitIdx || amountIdx === creditIdx)) {
    amountIdx = -1;
    hasAmount = false;
  }

  // Check if amounts are already signed (have negatives) by looking at sample data
  // Also check for Unicode minus signs: − (U+2212), – (en dash), — (em dash)
  let amountsAreSigned = false;
  if (hasAmount && sampleRows.length > 0) {
    for (const row of sampleRows) {
      const amtStr = row[amountIdx];
      if (amtStr && /^[\s]*[-\u2212\u2013\u2014]/.test(amtStr)) {
        amountsAreSigned = true;
        break;
      }
    }
  }

  // Determine the mode
  let mode = 'unknown';
  if (hasDebitCredit) {
    mode = 'debit_credit'; // e.g., Capital One credit card: separate columns
  } else if (hasAmount && hasTypeColumn && !amountsAreSigned) {
    mode = 'amount_with_type'; // e.g., Capital One 360: unsigned amount + type column
  } else if (hasAmount) {
    mode = 'single_amount'; // e.g., Chase: signed amount column
  }

  const success = hasDate && hasDesc && (hasAmount || hasDebitCredit);

  return {
    success,
    dateIdx,
    descIdx,
    amountIdx: hasAmount ? amountIdx : null,
    debitIdx: hasDebitCredit ? debitIdx : null,
    creditIdx: hasDebitCredit ? creditIdx : null,
    typeIdx: hasTypeColumn && mode === 'amount_with_type' ? typeIdx : null,
    mode,
    detectedBy: 'auto',
  };
}
