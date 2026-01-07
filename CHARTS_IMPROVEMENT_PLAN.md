# Charts & App Usability Improvement Plan

## Priority Matrix

| Priority | Criteria |
|----------|----------|
| **P1 - High** | High user impact, moderate effort, foundational |
| **P2 - Medium** | Good user impact, builds on P1, moderate complexity |
| **P3 - Lower** | Nice-to-have, higher complexity, or niche use cases |

---

## Phase 1: Quick Wins (P1)
*Estimated: 5-8 focused changes*

### 1.1 Chart Export (PNG Download)
**File:** `retirement-simulator.html`
**What:** Add "Download Chart" button below each chart
**How:** Use `canvas.toDataURL()` to generate PNG, trigger download
**Impact:** Users can save/share their projections

### 1.2 Life Event Markers on Projection Chart
**File:** `retirement-simulator.html`
**What:** Show vertical annotation lines where life events occur
**How:** Chart.js annotation plugin or custom dataset with point markers
**Impact:** Visual connection between events and portfolio impact

### 1.3 Zero Balance Threshold Line
**File:** `retirement-simulator.html`
**What:** Add red dashed horizontal line at $0
**How:** Add to chart options with annotation or extra dataset
**Impact:** Immediate visual indicator of portfolio depletion risk

### 1.4 Transaction Analyzer: Spending by Category Chart
**File:** `transaction-analyzer.html`
**What:** Add pie/donut chart showing category breakdown
**How:** Add Chart.js, aggregate transactions by category
**Impact:** Visual spending overview instead of just tables

### 1.5 Income Allocation: Visual Breakdown Chart
**File:** `income-allocation.html`
**What:** Add donut chart showing allocation percentages
**How:** Add Chart.js, bind to allocation sliders
**Impact:** Immediate visual feedback on budget split

### 1.6 Dark Mode Toggle
**File:** All HTML files + `shared.js`
**What:** Add theme switcher in header, persist preference
**How:** CSS custom properties, localStorage for preference
**Impact:** Better viewing experience, accessibility

---

## Phase 2: Enhanced Interactivity (P2)
*Builds on Phase 1*

### 2.1 Scenario Comparison Mode
**File:** `retirement-simulator.html`
**What:** "Compare Scenarios" button to overlay two simulations
**How:** Store previous simulation results, render both on same chart
**Impact:** Visualize impact of different decisions

### 2.2 Interactive Crosshair on Projection Chart
**File:** `retirement-simulator.html`
**What:** Vertical line that follows cursor showing exact values
**How:** Chart.js crosshair plugin or custom interaction mode
**Impact:** Precise data inspection without clicking

### 2.3 Click Histogram → Highlight Paths
**File:** `retirement-simulator.html`
**What:** Click a histogram bar to highlight those simulation paths
**How:** Store path data, filter and highlight on click
**Impact:** Understand which scenarios lead to which outcomes

### 2.4 Transaction Analyzer: Spending Trend Chart
**File:** `transaction-analyzer.html`
**What:** Line chart showing spending by category over time
**How:** Aggregate by month, multi-line chart with legend toggle
**Impact:** Track spending patterns across months

### 2.5 Quick What-If Toggles
**File:** `retirement-simulator.html`
**What:** Preset buttons: "+$200/mo", "-2 years retirement", etc.
**How:** Apply delta to current inputs, re-run simulation
**Impact:** Rapid exploration of changes

### 2.6 Keyboard Chart Navigation
**File:** `retirement-simulator.html`
**What:** Arrow keys to move through data points, announce values
**How:** Custom keyboard handler, focus management, aria-live
**Impact:** Full accessibility for screen reader users

---

## Phase 3: Advanced Features (P2-P3)
*Requires more architecture*

### 3.1 Combined Dashboard Page
**File:** New `dashboard.html`
**What:** Single page pulling data from all three tools
**How:** Read all localStorage keys, render summary cards + mini charts
**Impact:** Holistic financial health view

### 3.2 Shareable URL Snapshots
**File:** `retirement-simulator.html`
**What:** "Share Scenario" button generates URL with encoded params
**How:** Serialize inputs to URL query params, read on load
**Impact:** Share scenarios without file export

### 3.3 Web Worker for Simulations
**File:** New `simulation-worker.js` + `retirement-simulator.html`
**What:** Move Monte Carlo to background thread
**How:** Web Worker API, postMessage for results
**Impact:** UI stays responsive during 10,000 simulations

### 3.4 Progressive Web App (PWA)
**Files:** New `manifest.json`, `service-worker.js`
**What:** Installable app with offline support
**How:** Service worker for caching, manifest for install prompt
**Impact:** Mobile app-like experience

### 3.5 AI-Powered Insights
**File:** `retirement-simulator.html`, `transaction-analyzer.html`
**What:** Generate natural language insights from data
**How:** Use existing AI API integration, prompt with aggregated data
**Impact:** Personalized recommendations

### 3.6 Import from Financial Apps
**File:** `transaction-analyzer.html`
**What:** Support Mint, YNAB, bank CSV formats
**How:** Format detection, column mapping presets
**Impact:** Easier onboarding with existing data

---

## Implementation Order

```
Week 1-2: Phase 1 (Quick Wins)
├── 1.1 Chart Export
├── 1.2 Life Event Markers
├── 1.3 Zero Balance Line
├── 1.4 Transaction Category Chart
├── 1.5 Income Allocation Chart
└── 1.6 Dark Mode

Week 3-4: Phase 2 (Interactivity)
├── 2.1 Scenario Comparison
├── 2.2 Crosshair
├── 2.3 Histogram → Paths Link
├── 2.4 Spending Trends
├── 2.5 What-If Toggles
└── 2.6 Keyboard Navigation

Week 5+: Phase 3 (Advanced)
├── 3.1 Dashboard
├── 3.2 Shareable URLs
├── 3.3 Web Worker
├── 3.4 PWA
├── 3.5 AI Insights
└── 3.6 Import Formats
```

---

## Recommended Starting Point

**Start with these 3 items for maximum immediate impact:**

1. **Chart Export (1.1)** - Simple, high value, users ask for this
2. **Zero Balance Line (1.3)** - Tiny change, big visual clarity
3. **Transaction Category Chart (1.4)** - Biggest gap in current UX

---

## Technical Notes

### Chart.js Plugins Needed
- `chartjs-plugin-annotation` - For threshold lines and event markers
- `chartjs-plugin-crosshair` - For interactive crosshair (or custom implementation)

### localStorage Schema Additions
```javascript
// For scenario comparison
'retirementScenarios': [{name, params, results}]

// For theme preference
'userPreferences': {theme: 'dark'|'light'}
```

### Accessibility Requirements
- All new charts need `role="img"` and `aria-label`
- All new charts need collapsible data tables
- Interactive features need keyboard equivalents
