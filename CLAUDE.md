# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A client-side financial planning suite with a landing page and three main tools:

- **Landing Page** (`index.html`) - Splash page introducing the suite and linking to all tools
- **Monte Carlo Retirement Simulator** (`retirement-simulator.html`) - Probabilistic retirement projections with life events modeling
- **Income Allocation Calculator** (`income-allocation.html`) - Budget planning based on "I Will Teach You to Be Rich" methodology
- **Transaction Analyzer** (`transaction-analyzer.html`) - CSV transaction categorization with AI assistance

## Development

This is a static HTML/JS application. To develop:

1. Install dependencies (first time only):

   ```bash
   npm install
   ```

2. Open any HTML file directly in a browser, or use a local server:

   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

3. Run tests and checks before committing:

   ```bash
   npm test          # Run 390 automated tests
   npm run lint      # Check for code issues
   npm run format    # Auto-format all files
   ```

4. Deployment is automatic via GitHub Pages on push to `main`, but only after tests and linting pass in CI

## Workflow Preferences

- **Always commit and push changes after completing work** - Don't wait to be asked
- When making changes, commit to `main` directly for small fixes, or create a branch + PR for larger features
- Use descriptive commit messages that explain the "why"

## Before Making Changes

Always read relevant context first:

1. **If modifying business logic** - Check if it exists in `lib/` first. If so, modify there and update tests in `tests/`
2. **If adding new features** - Check `shared.js` for existing utilities before creating new ones
3. **If touching CSV/transaction code** - Read `lib/categorization.js`, `lib/parsing-utils.js`, and `lib/transfer-detection.js`
4. **If touching retirement simulation** - Read `lib/simulation.js`, `lib/social-security.js`, `lib/tax-parameters.js`, and `lib/statistics.js`
5. **If adding input validation** - Use `lib/validation.js` utilities (validateField, validateRetirementParams, etc.)
6. **If updating tax rules** - Modify `lib/tax-parameters.js` (brackets, SS params, state rates, IRS limits)
7. **After any code changes** - Run `npm test` to make sure nothing broke

## Architecture

### Single-File Structure

Each tool is a standalone HTML file containing embedded CSS and JavaScript. This design enables:

- Direct browser opening without a server
- Simple GitHub Pages deployment
- Independent tool updates

### Testable Business Logic (`lib/`)

Core logic is extracted into ES modules for testing:

| Module                  | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `csv-utils.js`          | RFC 4180 CSV parsing                                        |
| `parsing-utils.js`      | Amount/date parsing (Unicode, European format)              |
| `categorization.js`     | Transaction categorization with confidence scoring          |
| `transfer-detection.js` | Inter-account transfer matching                             |
| `column-detection.js`   | Bank CSV column auto-detection                              |
| `social-security.js`    | FRA, PIA, and benefit calculations                          |
| `simulation.js`         | Monte Carlo simulation, RMD calculations, withdrawals       |
| `statistics.js`         | Percentiles, histograms, mean/std dev                       |
| `validation.js`         | Input validation, cross-field validation, schema validation |
| `tax-parameters.js`     | 2024 tax brackets, SS params, state taxes, IRS limits       |

### Test Suite (`tests/`)

390 automated tests using Vitest. Run with `npm test`. Tests cover all lib/ modules plus shared.js utilities. Key test files:

- `simulation.test.js` - Monte Carlo, withdrawals, RMDs, edge cases
- `social-security.test.js` - FRA, PIA calculations, bend points
- `validation.test.js` - Input validation, cross-field rules
- `tax-parameters.test.js` - Tax brackets, RMD tables, state taxes
- `integration.test.js` - Cross-tool data flow via localStorage
- `shared-utils.test.js` - FinanceUtils, DateUtils, SessionManager

### Shared Utilities (`shared.js`)

Common functionality extracted to `shared.js`, loaded by all pages:

- `FinanceUtils` - Currency/percent formatting (`formatCurrency`, `formatCurrencyCompact`, `formatPercent`)
- `StorageUtils` - localStorage wrapper with JSON serialization
- `DOMUtils` - XSS-safe HTML escaping, file downloads, DOM ready handling
- `DateUtils` - Multi-format date parsing (MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY)
- `SessionManager` - Cross-tool session export/import as JSON files

### Data Flow Between Tools

Tools share data via localStorage:

- Transaction Analyzer saves `spendingTrackerData` with monthly spending/savings averages
- Retirement Simulator reads this to pre-populate spending fields
- Session export/import allows backing up all tool data as a single JSON file

### Key Classes (retirement-simulator.html)

**`RetirementSimulator`**

- Monte Carlo simulation using Box-Muller transform for normal distribution
- Supports both simple mode (single account) and advanced mode (multiple account types: 401k, IRA, Roth, taxable)
- Implements tax-efficient withdrawal ordering: taxable → traditional → Roth
- Required Minimum Distributions (RMDs) enforced at age 73+ per SECURE 2.0
- State income tax applied to traditional account withdrawals (50 states + DC)
- Life events modify annual income/expenses during simulation years

**`SocialSecurityCalculator`**

- Calculates Full Retirement Age based on birth year
- Applies early/late claiming adjustments (reduction up to 30% early, 8%/year delayed credits)
- Estimates PIA from income using 2024 bend points

**`LifeEventsManager`**

- Tracks one-time or recurring financial events (expenses or income)
- Events have start age and duration, applied during simulation

### Key Classes (transaction-analyzer.html)

**`TransactionAnalyzer`**

- CSV parsing with auto-detection of date/description/amount columns
- Pattern-based auto-categorization before AI fallback
- Transfer detection algorithm: matches opposite-sign transactions within 3 days with transfer keywords
- Categories align with income-allocation: fixed-costs, guilt-free, long-term, short-term, income

## localStorage Keys

| Key                      | Used By                                     | Purpose                                 |
| ------------------------ | ------------------------------------------- | --------------------------------------- |
| `budgetPlannerData`      | income-allocation                           | Budget allocation percentages           |
| `spendingTrackerData`    | transaction-analyzer → retirement-simulator | Monthly spending/savings for retirement |
| `transactionData`        | transaction-analyzer                        | Parsed transactions array               |
| `transactionRules`       | transaction-analyzer                        | User-defined categorization rules       |
| `retirementForecastData` | retirement-simulator                        | Simulation parameters                   |
| `lifeEventsData`         | retirement-simulator                        | Life events array                       |
| `lifeEventIdCounter`     | retirement-simulator                        | Counter for unique event IDs            |

## External Dependencies

- Chart.js 4.4.0 (CDN with SRI hash) - Used only in retirement-simulator.html for visualizations
- AI APIs (optional) - Gemini/OpenAI/Anthropic for transaction categorization in transaction-analyzer

## Accessibility

All pages implement Section 508 compliance:

- Skip links for keyboard navigation
- `.sr-only` class for screen reader content
- Focus indicators on all interactive elements
- ARIA labels and roles on dynamic content
