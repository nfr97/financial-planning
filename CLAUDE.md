# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A client-side financial planning suite with a landing page and three main tools:
- **Landing Page** (`index.html`) - Splash page introducing the suite and linking to all tools
- **Monte Carlo Retirement Simulator** (`retirement-simulator.html`) - Probabilistic retirement projections with life events modeling
- **Income Allocation Calculator** (`income-allocation.html`) - Budget planning based on "I Will Teach You to Be Rich" methodology
- **Transaction Analyzer** (`transaction-analyzer.html`) - CSV transaction categorization with AI assistance

## Development

This is a static HTML/JS application with no build step. To develop:

1. Open any HTML file directly in a browser, or use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

2. Deployment is automatic via GitHub Pages on push to `main`

## Workflow Preferences

- **Always commit and push changes after completing work** - Don't wait to be asked
- When making changes, commit to `main` directly for small fixes, or create a branch + PR for larger features
- Use descriptive commit messages that explain the "why"

## Architecture

### Single-File Structure
Each tool is a standalone HTML file containing embedded CSS and JavaScript. This design enables:
- Direct browser opening without a server
- Simple GitHub Pages deployment
- Independent tool updates

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

| Key | Used By | Purpose |
|-----|---------|---------|
| `budgetPlannerData` | income-allocation | Budget allocation percentages |
| `spendingTrackerData` | transaction-analyzer → retirement-simulator | Monthly spending/savings for retirement |
| `transactionData` | transaction-analyzer | Parsed transactions array |
| `transactionRules` | transaction-analyzer | User-defined categorization rules |
| `retirementForecastData` | retirement-simulator | Simulation parameters |
| `lifeEventsData` | retirement-simulator | Life events array |
| `lifeEventIdCounter` | retirement-simulator | Counter for unique event IDs |

## External Dependencies

- Chart.js 4.4.0 (CDN with SRI hash) - Used only in retirement-simulator.html for visualizations
- AI APIs (optional) - Gemini/OpenAI/Anthropic for transaction categorization in transaction-analyzer

## Accessibility

All pages implement Section 508 compliance:
- Skip links for keyboard navigation
- `.sr-only` class for screen reader content
- Focus indicators on all interactive elements
- ARIA labels and roles on dynamic content
