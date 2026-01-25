# Spending Tracker Testing Guide

This document describes how to test the Spending Tracker (transaction-analyzer.html).

## Automated Tests

Open `test.html` in your browser to run automated tests. Tests run automatically on page load and can be re-run by clicking "Run All Tests".

### What's Tested Automatically

- **CSV Line Parsing**: Quoted fields, escaped quotes, empty fields, whitespace handling
- **Amount Parsing**: Positive/negative amounts, currency symbols, parentheses notation, commas
- **Date Parsing**: MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY formats
- **Transaction Categorization**: Pattern matching for fixed costs, guilt-free spending, income, etc.
- **XSS Prevention**: HTML escaping for special characters, script tags, quotes
- **Storage Utils**: localStorage save/load, default values, complex objects

## Manual Test Files

Test CSV files are in the `test-data/` folder:

### test-basic.csv

Basic happy-path transactions with common merchants.

**Expected Results:**

- All 8 transactions should parse successfully
- PAYROLL DEPOSIT: income category
- WALMART, AMAZON, CHIPOTLE: guilt-free category
- RENT, ELECTRIC: fixed-costs category
- SPOTIFY: guilt-free category
- CHEVRON: uncategorized (gas stations not in default patterns)

### test-edge-cases.csv

Edge cases and special characters.

**Expected Results:**

- Empty description: Should display without errors
- Quoted description: Should show `DESCRIPTION WITH "QUOTES"`
- Ampersand: Should show `MERCHANT & SONS` (not &amp;)
- XSS attempt: Should show literal text, NOT execute script
- ISO date: Should parse correctly as 2024-01-15
- Comma in description: Should parse as single field

### test-transfers.csv

Transfer detection scenarios.

**Expected Results:**

- Transfers 1-2: Should be marked as transfers (TRANSFER TO/FROM keywords)
- Transfers 3-4: Should be marked as transfers (CREDIT CARD PAYMENT + PAYMENT THANK YOU)
- Transactions 5-6: Should NOT be marked as transfers (PAYROLL and RENT are different purposes)
- Transfers 7-8: Should be marked as transfers (ONLINE TRANSFER with account numbers)

### test-errors.csv

Error handling verification.

**Expected Results:**

- Invalid date row: May be skipped or show parsing error
- Missing amount row: Should be skipped
- Missing date row: Should be skipped
- Only GOOD TRANSACTION should parse successfully

## Manual Test Checklist

### File Upload

- [ ] Drag and drop single CSV file
- [ ] Drag and drop multiple CSV files
- [ ] Use file picker to select file
- [ ] Upload file > 10MB (should show error)
- [ ] Upload empty file (should show helpful error)
- [ ] Upload non-CSV file (should show error)

### Transaction Display

- [ ] Transactions sorted by date (newest first)
- [ ] Amounts display with correct sign (+/-)
- [ ] Descriptions display correctly (no HTML injection)
- [ ] Category dropdown shows all categories
- [ ] Transfer badge appears for detected transfers

### Filtering & Sorting

- [ ] Filter by category works
- [ ] Filter shows "Transfers" option
- [ ] Sort by date/amount works
- [ ] Pagination resets when filter changes (mobile)

### Categorization

- [ ] Change category via dropdown
- [ ] Bulk categorize via merchant name
- [ ] Undo button reverts last bulk action
- [ ] Custom rules persist after page reload

### Transfer Detection

- [ ] Matching transfers are detected
- [ ] "Not a Transfer" button works
- [ ] Manual override persists after reload
- [ ] Transfer summary shows correct count

### Data Persistence

- [ ] Page reload preserves transactions
- [ ] Page reload preserves custom rules
- [ ] Session export downloads valid JSON
- [ ] Session import restores all data
- [ ] Clear Data removes everything

### Responsive Design

- [ ] Mobile view shows card layout
- [ ] Mobile pagination works
- [ ] Filter/sort controls accessible on mobile
- [ ] Touch interactions work properly

## Known Limitations

These are design decisions, not bugs:

1. **European number format (1.234,56)**: Not supported. Uses US format only.
2. **Multi-line CSV fields**: May not parse correctly if description spans multiple lines.
3. **localStorage limit**: ~5MB maximum. Large datasets may fail to save.
4. **3-day transfer window**: Transfers more than 3 days apart won't be detected.

## Reporting Bugs

When reporting bugs, please include:

1. Browser name and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Sample CSV data (if applicable)
5. Console errors (F12 > Console tab)
