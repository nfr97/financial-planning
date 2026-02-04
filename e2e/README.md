# E2E Testing with Playwright

## Why E2E Tests?

The existing test suite covers business logic (lib/) and the new button-wiring
tests catch structural bugs (ID mismatches, scoping errors). But neither can
replicate what a user actually experiences:

- **Real browser rendering** - CSS visibility, z-index stacking, overflow hidden
- **Real event bubbling** - click events through shadow DOM, portals, overlays
- **Real navigation** - page loads, URL changes, localStorage persistence
- **Real timing** - script loading order, async operations, animation frames

## Setup

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Running

```bash
npx playwright test           # Run all E2E tests
npx playwright test --ui      # Interactive mode
npx playwright test --headed  # Watch in browser
```

## Test Strategy

### Tier 1: Smoke Tests (every button clicks without error)
For each page, click every visible button and verify:
- No console errors
- No unhandled exceptions
- Button shows visual feedback (class change, aria update)

### Tier 2: Critical Path Tests
- **Retirement Simulator**: Fill form → Run Simulation → Results appear
- **Income Allocation**: Enter income → Adjust sliders → Chart updates
- **Transaction Analyzer**: Upload CSV → View results → Categorize → Export
- **Landing Page**: Click tool links → Navigate successfully

### Tier 3: Cross-Tool Flow Tests
- Transaction Analyzer saves spending data → Retirement Simulator reads it
- Session export → Session import → All data restored

## CI Integration

Add to `.github/workflows/deploy.yml`:
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium
- name: Run E2E tests
  run: npx playwright test
```
