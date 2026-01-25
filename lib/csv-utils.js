/**
 * CSV parsing utilities
 * Extracted from transaction-analyzer.html for testability
 */

/**
 * Parse a single CSV line, handling quoted fields and escaped quotes (RFC 4180)
 * @param {string} line - The CSV line to parse
 * @returns {string[]} Array of field values
 */
export function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes (RFC 4180: "" inside quoted field = literal ")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}
