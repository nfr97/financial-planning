/**
 * Parsing utilities for amounts and dates
 * Extracted from transaction-analyzer.html for testability
 */

/**
 * Parse amount with support for various formats
 * Handles: currency symbols, commas, parentheses notation, Unicode minus signs,
 * CR/DR suffixes, European decimal format, trailing minus
 * @param {*} value - The value to parse
 * @returns {number} Parsed amount (0 if unparseable)
 */
export function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;

  let str = String(value).trim();

  // Normalize Unicode minus signs to ASCII hyphen-minus
  // Common Unicode minus characters: − (U+2212), – (en dash U+2013), — (em dash U+2014)
  str = str.replace(/[\u2212\u2013\u2014]/g, '-');

  // Handle parentheses notation for negatives: (100.00) -> -100.00
  const isParenthesesNegative = /^\([\d,.\s]+\)$/.test(str);
  if (isParenthesesNegative) {
    str = '-' + str.replace(/[()]/g, '');
  }

  // Handle trailing minus: 100.00- -> -100.00
  if (/^[\d,.\s]+-$/.test(str)) {
    str = '-' + str.slice(0, -1);
  }

  // Handle CR/DR suffixes: 100.00 CR -> 100.00, 100.00 DR -> -100.00
  if (/\s*CR\s*$/i.test(str)) {
    str = str.replace(/\s*CR\s*$/i, '');
  } else if (/\s*DR\s*$/i.test(str)) {
    str = '-' + str.replace(/\s*DR\s*$/i, '');
  }

  // Remove currency symbols (but NOT commas yet - needed for European format detection)
  str = str.replace(/[$£€¥₹\s]/g, '');

  // Handle European decimal format (1.234,56 -> 1234.56)
  // Must check BEFORE removing commas. Pattern: periods as thousands, comma as decimal
  // Matches: 1.234,56 or 1.234.567,89 (one or more groups of .XXX followed by ,XX)
  if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Standard format: remove commas as thousand separators
    str = str.replace(/,/g, '');
  }

  return parseFloat(str) || 0;
}

/**
 * Detect date format from sample data
 * @param {string[][]} sampleRows - Sample data rows
 * @param {number} dateIdx - Index of the date column
 * @returns {string|null} Detected format: 'named_month', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', or null
 */
export function detectDateFormat(sampleRows, dateIdx) {
  if (!sampleRows.length || dateIdx === -1) return null;

  const dateStrings = sampleRows
    .map((row) => row[dateIdx])
    .filter(Boolean)
    .slice(0, 10);

  // Check for named months (unambiguous)
  for (const dateStr of dateStrings) {
    if (/[a-zA-Z]{3,}/.test(dateStr)) {
      return 'named_month';
    }
  }

  // Check for ISO format YYYY-MM-DD
  for (const dateStr of dateStrings) {
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(dateStr)) {
      return 'YYYY-MM-DD';
    }
  }

  // Analyze numeric dates to determine day vs month position
  let maxFirst = 0,
    maxSecond = 0;
  for (const dateStr of dateStrings) {
    const match = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (match) {
      maxFirst = Math.max(maxFirst, parseInt(match[1], 10));
      maxSecond = Math.max(maxSecond, parseInt(match[2], 10));
    }
  }

  // If first position > 12, it must be day (DD/MM/YYYY)
  if (maxFirst > 12) return 'DD/MM/YYYY';
  // If second position > 12, it must be day (MM/DD/YYYY)
  if (maxSecond > 12) return 'MM/DD/YYYY';

  // Ambiguous - default to US format
  return 'MM/DD/YYYY';
}

/**
 * Parse date with detected format
 * @param {string} dateStr - The date string to parse
 * @param {string} format - The detected format
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null
 */
export function parseDateWithFormat(dateStr, format) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();

  // Try named month formats first
  if (format === 'named_month' || /[a-zA-Z]/.test(dateStr)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // ISO format
  if (format === 'YYYY-MM-DD') {
    const match = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // DD/MM/YYYY format
  if (format === 'DD/MM/YYYY') {
    const match = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (match) {
      const [, day, month, yearStr] = match;
      const year =
        yearStr.length === 2 ? (parseInt(yearStr) > 50 ? '19' : '20') + yearStr : yearStr;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // MM/DD/YYYY format (default)
  const match = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (match) {
    const [, month, day, yearStr] = match;
    const year = yearStr.length === 2 ? (parseInt(yearStr) > 50 ? '19' : '20') + yearStr : yearStr;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}
