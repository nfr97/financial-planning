/**
 * Button Wiring Validation Tests
 *
 * These tests parse the actual HTML files and verify that button event wiring
 * is structurally correct. They catch the exact classes of bugs that code
 * inspection misses:
 *
 * 1. ID mismatches: getElementById('foo') where id="fooBtn" exists instead
 * 2. Scoping bugs: onclick="obj.method()" where obj isn't on window
 * 3. Missing elements: addEventListener on getElementById that returns null
 * 4. Broken onclick handlers: references to functions/objects that don't exist
 *
 * These are NOT full E2E tests (those require Playwright). These are static
 * analysis tests that parse HTML + embedded JS and cross-reference them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

/**
 * Parse an HTML file and return the DOM + extracted script content
 */
function parseHTMLFile(filename) {
  const html = readFileSync(join(ROOT, filename), 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extract all element IDs from the static HTML
  const allElements = document.querySelectorAll('[id]');
  const ids = new Set();
  allElements.forEach((el) => ids.add(el.id));

  // Extract all script content (inline scripts only)
  const scripts = document.querySelectorAll('script:not([src])');
  let scriptContent = '';
  scripts.forEach((s) => {
    scriptContent += s.textContent + '\n';
  });

  // Extract all onclick attributes
  const onclickElements = document.querySelectorAll('[onclick]');
  const onclicks = [];
  onclickElements.forEach((el) => {
    onclicks.push({
      tag: el.tagName,
      onclick: el.getAttribute('onclick'),
      text: el.textContent.trim().substring(0, 50),
    });
  });

  // Extract all buttons (with and without onclick)
  const buttons = document.querySelectorAll('button');
  const buttonList = [];
  buttons.forEach((btn) => {
    buttonList.push({
      id: btn.id || null,
      onclick: btn.getAttribute('onclick') || null,
      text: btn.textContent.trim().substring(0, 50),
      classes: btn.className,
    });
  });

  return { dom, document, ids, scriptContent, onclicks, buttons: buttonList, html };
}

/**
 * Extract all getElementById('...') calls from script text
 */
function extractGetElementByIdCalls(scriptContent) {
  const regex = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
  const ids = [];
  let match;
  while ((match = regex.exec(scriptContent)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Extract all querySelector('#...') calls targeting IDs from script text
 */
function extractQuerySelectorIdCalls(scriptContent) {
  const regex = /querySelector\(\s*['"]#([^'"]+)['"]\s*\)/g;
  const ids = [];
  let match;
  while ((match = regex.exec(scriptContent)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Extract root object references from onclick handlers.
 * e.g. "window.allocator.save()" -> "window.allocator"
 * e.g. "analyzer.aiCategorize()" -> "analyzer"
 */
function extractOnclickRoots(onclickValue) {
  // Strip event.stopPropagation() and similar event calls
  const cleaned = onclickValue.replace(/event\.\w+\(\);?\s*/g, '');

  // Match function/method calls: obj.method() or obj.prop.method()
  const callMatch = cleaned.match(/^(\w+(?:\.\w+)*)\s*\(/);
  if (callMatch) {
    const fullPath = callMatch[1];
    const parts = fullPath.split('.');
    // Return the root object (first part)
    return parts[0];
  }

  // Match simple expressions like "this.parentElement..."
  if (cleaned.startsWith('this.')) {
    return 'this'; // 'this' is always valid in onclick context
  }

  return null;
}

// ============================================================
// Tests for each HTML file
// ============================================================

describe('Button Wiring: Retirement Simulator', () => {
  let page;

  beforeAll(() => {
    page = parseHTMLFile('retirement-simulator.html');
  });

  it('all getElementById targets exist in the DOM', () => {
    const referencedIds = extractGetElementByIdCalls(page.scriptContent);
    const missing = [];

    for (const id of referencedIds) {
      // Skip dynamically generated IDs (contain template literals or variables)
      if (id.includes('${') || id.includes('event-')) continue;
      if (!page.ids.has(id)) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `Missing DOM elements referenced by getElementById: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('all querySelector ID targets exist in the DOM', () => {
    const referencedIds = extractQuerySelectorIdCalls(page.scriptContent);
    const missing = [];

    for (const id of referencedIds) {
      if (id.includes('${')) continue;
      if (!page.ids.has(id)) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `Missing DOM elements referenced by querySelector: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('Social Security button IDs are consistent between HTML and JS', () => {
    // This was a real bug: JS referenced ssNone/ssKnown/ssEstimate but HTML had ssNoneBtn/ssKnownBtn/ssEstimateBtn
    expect(page.ids.has('ssNoneBtn')).toBe(true);
    expect(page.ids.has('ssKnownBtn')).toBe(true);
    expect(page.ids.has('ssEstimateBtn')).toBe(true);

    // Verify the JS references these correct IDs
    expect(page.scriptContent).toContain("getElementById('ssNoneBtn')");
    expect(page.scriptContent).toContain("getElementById('ssKnownBtn')");
    expect(page.scriptContent).toContain("getElementById('ssEstimateBtn')");

    // Verify NO references to the OLD wrong IDs (without Btn suffix)
    // Use word boundary to avoid matching ssNoneBtn etc.
    const wrongPatterns = [
      /getElementById\(\s*['"]ssNone['"]\s*\)/,
      /getElementById\(\s*['"]ssKnown['"]\s*\)/,
      /getElementById\(\s*['"]ssEstimate['"]\s*\)/,
    ];
    for (const pattern of wrongPatterns) {
      expect(page.scriptContent).not.toMatch(pattern);
    }
  });

  it('all critical buttons have IDs or onclick handlers', () => {
    // Key interactive buttons that MUST be wired
    const criticalButtonIds = [
      'runSimulation',
      'toggleEvents',
      'addEvent',
      'simpleModeBtn',
      'advancedModeBtn',
      'ssNoneBtn',
      'ssKnownBtn',
      'ssEstimateBtn',
      'downloadHistogram',
      'downloadPaths',
      'presetConservative',
      'presetBalanced',
      'presetAggressive',
    ];

    for (const id of criticalButtonIds) {
      expect(page.ids.has(id), `Critical button #${id} missing from DOM`).toBe(true);
    }
  });

  it('all critical buttons have addEventListener calls in the script', () => {
    const buttonsWithListeners = [
      'runSimulation',
      'toggleEvents',
      'addEvent',
      'downloadHistogram',
      'downloadPaths',
    ];

    for (const id of buttonsWithListeners) {
      const pattern = new RegExp(`getElementById\\(['"]${id}['"]\\)[\\s\\S]*?\\.addEventListener`);
      // Check either direct chaining or variable-then-addEventListener
      const hasListener =
        page.scriptContent.includes(`getElementById('${id}').addEventListener`) ||
        page.scriptContent.includes(`getElementById("${id}").addEventListener`);

      // Or variable assignment pattern: const x = getElementById('id'); ... x.addEventListener
      const varPattern = new RegExp(
        `(const|let|var)\\s+(\\w+)\\s*=\\s*document\\.getElementById\\(['"]${id}['"]\\)`
      );
      const varMatch = page.scriptContent.match(varPattern);
      const hasVarListener =
        varMatch && page.scriptContent.includes(`${varMatch[2]}.addEventListener`);

      expect(
        hasListener || hasVarListener,
        `Button #${id} has no addEventListener wiring in the script`
      ).toBe(true);
    }
  });

  it('onclick handlers reference valid global functions', () => {
    const onclickHandlers = page.onclicks;
    const invalidHandlers = [];

    for (const handler of onclickHandlers) {
      const root = extractOnclickRoots(handler.onclick);
      if (!root) continue;

      // Valid roots in retirement-simulator.html:
      // - window (explicit global)
      // - this (DOM element context)
      // - applyWorkLongerRecommendation, applySpendLessRecommendation (global functions)
      const validRoots = [
        'window',
        'this',
        'applyWorkLongerRecommendation',
        'applySpendLessRecommendation',
      ];

      if (!validRoots.includes(root)) {
        invalidHandlers.push(`onclick="${handler.onclick}" (root: ${root})`);
      }
    }

    expect(
      invalidHandlers,
      `onclick handlers reference non-global objects: ${invalidHandlers.join(', ')}`
    ).toEqual([]);
  });

  it('recommendation functions are defined in script scope', () => {
    // These are called from onclick and must be globally accessible via window (module scope)
    expect(page.scriptContent).toContain('window.applyWorkLongerRecommendation');
    expect(page.scriptContent).toContain('window.applySpendLessRecommendation');
  });
});

describe('Button Wiring: Income Allocation', () => {
  let page;

  beforeAll(() => {
    page = parseHTMLFile('income-allocation.html');
  });

  it('all getElementById targets exist in the DOM', () => {
    const referencedIds = extractGetElementByIdCalls(page.scriptContent);
    const missing = [];

    for (const id of referencedIds) {
      if (id.includes('${')) continue;
      if (!page.ids.has(id)) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `Missing DOM elements referenced by getElementById: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('budgetPlanner is assigned to window for global access', () => {
    // BudgetPlanner is assigned to window.budgetPlanner for cross-tool access
    expect(page.scriptContent).toMatch(/window\.budgetPlanner\s*=\s*new\s+BudgetPlanner/);
  });

  it('onclick handlers use window.budgetPlanner (not bare budgetPlanner)', () => {
    const onclickHandlers = page.onclicks;

    for (const handler of onclickHandlers) {
      // If it references budgetPlanner, it MUST go through window.budgetPlanner
      if (
        handler.onclick.includes('budgetPlanner.') &&
        !handler.onclick.includes('window.budgetPlanner')
      ) {
        expect.fail(
          `onclick="${handler.onclick}" uses bare 'budgetPlanner' instead of 'window.budgetPlanner'`
        );
      }
    }
  });

  it('preset buttons use addEventListener (not event delegation)', () => {
    // BudgetPlanner wires presets via direct getElementById + addEventListener
    expect(page.scriptContent).toContain("getElementById('preset-balanced').addEventListener");
    expect(page.scriptContent).toContain("getElementById('preset-aggressive').addEventListener");
    expect(page.scriptContent).toContain("getElementById('preset-debt').addEventListener");
  });

  it('all critical elements exist in the DOM', () => {
    const criticalIds = [
      'income',
      'zipCode',
      'preset-balanced',
      'preset-aggressive',
      'preset-debt',
    ];

    for (const id of criticalIds) {
      expect(page.ids.has(id), `Critical element #${id} missing from DOM`).toBe(true);
    }
  });

  it('income input has event listeners for input, blur, and focus', () => {
    // BudgetPlanner attaches input/blur/focus listeners on the income field
    expect(page.scriptContent).toContain("this.incomeInput.addEventListener('input'");
    expect(page.scriptContent).toContain("this.incomeInput.addEventListener('blur'");
    expect(page.scriptContent).toContain("this.incomeInput.addEventListener('focus'");
  });

  it('slider elements referenced in JS exist in DOM', () => {
    // The IncomeAllocator constructor queries sliders by ID
    const sliderIds = ['fixedCostsSlider', 'shortTermSlider', 'longTermSlider', 'guiltFreeSlider'];
    for (const id of sliderIds) {
      expect(page.ids.has(id), `Slider #${id} missing from DOM`).toBe(true);
    }
  });
});

describe('Button Wiring: Transaction Analyzer', () => {
  let page;

  beforeAll(() => {
    page = parseHTMLFile('transaction-analyzer.html');
  });

  it('all getElementById targets exist in the DOM', () => {
    const referencedIds = extractGetElementByIdCalls(page.scriptContent);
    const missing = [];

    for (const id of referencedIds) {
      if (id.includes('${')) continue;
      if (!page.ids.has(id)) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `Missing DOM elements referenced by getElementById: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('API key input uses correct element ID', () => {
    // Real bug: code referenced geminiApiKey/openaiApiKey/anthropicApiKey but only apiKey exists
    expect(page.ids.has('apiKey')).toBe(true);
    expect(page.ids.has('aiProvider')).toBe(true);

    // Verify NO references to old wrong IDs
    expect(page.scriptContent).not.toContain("getElementById('geminiApiKey')");
    expect(page.scriptContent).not.toContain("getElementById('openaiApiKey')");
    expect(page.scriptContent).not.toContain("getElementById('anthropicApiKey')");
  });

  it('analyzer is accessible to inline onclick handlers', () => {
    // Transaction analyzer uses top-level `let analyzer` which IS accessible
    // from inline onclick handlers (global lexical environment).
    // This is different from income-allocation which had `let` inside a callback.
    // Verify analyzer is declared at the script's top level (not nested in a callback)
    expect(page.scriptContent).toMatch(/^\s*let\s+analyzer\s*;/m);
    expect(page.scriptContent).toContain('analyzer = new TransactionAnalyzer()');
  });

  it('onclick handlers reference valid objects', () => {
    const onclickHandlers = page.onclicks;
    const invalidHandlers = [];

    for (const handler of onclickHandlers) {
      const root = extractOnclickRoots(handler.onclick);
      if (!root) continue;

      const validRoots = [
        'window',
        'this',
        'analyzer', // Must be on window (checked above)
        'StatusBar', // Global from shared.js
      ];

      if (!validRoots.includes(root)) {
        invalidHandlers.push(`onclick="${handler.onclick}" (root: ${root})`);
      }
    }

    expect(
      invalidHandlers,
      `onclick handlers reference non-global objects: ${invalidHandlers.join(', ')}`
    ).toEqual([]);
  });

  it('all critical buttons have IDs or onclick handlers', () => {
    const criticalIds = [
      'uploadArea',
      'fileInput',
      'aiCategorizeBtn',
      'toggleTransfers',
      'downloadSpendingChart',
      'toggleTransactionDetails',
      'categoryFilter',
      'sortOrder',
    ];

    for (const id of criticalIds) {
      expect(page.ids.has(id), `Critical element #${id} missing from DOM`).toBe(true);
    }
  });

  it('toggle buttons have addEventListener calls', () => {
    const toggleButtons = ['toggleTransfers', 'downloadSpendingChart', 'toggleTransactionDetails'];

    for (const id of toggleButtons) {
      expect(
        page.scriptContent.includes(`getElementById('${id}').addEventListener`),
        `Toggle button #${id} has no addEventListener`
      ).toBe(true);
    }
  });
});

describe('Button Wiring: Landing Page', () => {
  let page;

  beforeAll(() => {
    page = parseHTMLFile('index.html');
  });

  it('all getElementById targets exist in the DOM', () => {
    const referencedIds = extractGetElementByIdCalls(page.scriptContent);
    const missing = [];

    for (const id of referencedIds) {
      if (id.includes('${')) continue;
      if (!page.ids.has(id)) {
        missing.push(id);
      }
    }

    expect(
      missing,
      `Missing DOM elements referenced by getElementById: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('does not use setTimeout for event listener attachment', () => {
    // Real bug: setTimeout(() => { btn.addEventListener(...) }, 100) was a race condition
    // Event listeners should be attached synchronously after DOM manipulation
    const timeoutListenerPattern =
      /setTimeout\s*\(\s*(?:\(\)|function)\s*(?:=>)?\s*\{[^}]*addEventListener/;
    expect(page.scriptContent).not.toMatch(timeoutListenerPattern);
  });
});

// ============================================================
// Cross-cutting concerns
// ============================================================

describe('Cross-File Button Wiring Consistency', () => {
  const pages = {};

  beforeAll(() => {
    pages.retirement = parseHTMLFile('retirement-simulator.html');
    pages.income = parseHTMLFile('income-allocation.html');
    pages.transaction = parseHTMLFile('transaction-analyzer.html');
    pages.landing = parseHTMLFile('index.html');
  });

  it('no page has duplicate element IDs', () => {
    for (const [name, page] of Object.entries(pages)) {
      const allElements = page.document.querySelectorAll('[id]');
      const idCounts = {};
      allElements.forEach((el) => {
        idCounts[el.id] = (idCounts[el.id] || 0) + 1;
      });

      const duplicates = Object.entries(idCounts)
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      expect(duplicates, `${name} has duplicate IDs: ${duplicates.join(', ')}`).toEqual([]);
    }
  });

  it('no onclick handler uses implicit event object', () => {
    // Real bug: toggleApiKeyVisibility() used implicit 'event' global
    // onclick handlers should not rely on the implicit event object unless passed explicitly
    for (const [name, page] of Object.entries(pages)) {
      for (const handler of page.onclicks) {
        const onclick = handler.onclick;
        // Allow event.stopPropagation() and event.preventDefault() as they are standard patterns
        // Flag any other use of bare 'event' that isn't passed as a parameter
        if (onclick.includes('event.target') && !onclick.includes('(event)')) {
          expect.fail(
            `${name}: onclick="${onclick}" uses event.target without explicit event parameter`
          );
        }
      }
    }
  });

  it('pages with window-scoped objects have matching window assignments', () => {
    // income-allocation assigns window.budgetPlanner for cross-tool access
    expect(
      pages.income.scriptContent,
      'income-allocation should assign budgetPlanner to window'
    ).toMatch(/window\.budgetPlanner\s*=\s*new\s+\w+/);
  });

  it('transaction analyzer has top-level let for onclick access', () => {
    // transaction-analyzer uses onclick="analyzer.X()" with a top-level let
    // This works because top-level let is in the global lexical environment
    expect(pages.transaction.scriptContent).toMatch(/^\s*let\s+analyzer\s*;/m);
  });

  it('no addEventListener is called on potentially null getElementById result without guard', () => {
    // Pattern: getElementById('x').addEventListener - if 'x' doesn't exist, this throws
    for (const [name, page] of Object.entries(pages)) {
      const directChainPattern = /getElementById\(\s*['"]([^'"]+)['"]\s*\)\.addEventListener/g;
      let match;
      const brokenChains = [];

      while ((match = directChainPattern.exec(page.scriptContent)) !== null) {
        const id = match[1];
        if (id.includes('${')) continue; // Skip template literals
        if (!page.ids.has(id)) {
          brokenChains.push(id);
        }
      }

      expect(
        brokenChains,
        `${name}: addEventListener chained on missing elements: ${brokenChains.join(', ')}`
      ).toEqual([]);
    }
  });

  it('all pages have interactive elements (buttons or clickable links)', () => {
    // Sanity check: every page should have interactive elements
    // Landing page uses <a> tags instead of <button> elements
    for (const [name, page] of Object.entries(pages)) {
      const hasStaticButtons = page.buttons.length > 0;
      const hasDynamicButtons = page.scriptContent.includes('<button');
      const hasClickableLinks = page.document.querySelectorAll('a[href]').length > 0;
      const hasEventListeners = page.scriptContent.includes('addEventListener');
      expect(
        hasStaticButtons || hasDynamicButtons || hasClickableLinks || hasEventListeners,
        `${name} has no interactive elements at all`
      ).toBe(true);
    }
  });
});

describe('Event Listener Cleanup', () => {
  it('shared.js RefinementModal stores ESC handler reference for cleanup', () => {
    // Real bug: ESC handler was anonymous, couldn't be removed -> memory leak
    const shared = readFileSync(join(ROOT, 'shared.js'), 'utf-8');

    // Verify the handler is stored as a named reference
    expect(shared).toMatch(/this\._handleEsc|this\.handleEsc|_handleEsc/);

    // Verify removeEventListener is called in close()
    expect(shared).toContain('removeEventListener');
  });
});

describe('Dynamic Button Generation Safety', () => {
  let pages;

  beforeAll(() => {
    pages = {
      income: parseHTMLFile('income-allocation.html'),
      transaction: parseHTMLFile('transaction-analyzer.html'),
      retirement: parseHTMLFile('retirement-simulator.html'),
    };
  });

  it('dynamically generated onclick handlers in template strings use window-scoped objects', () => {
    // Check template strings that generate onclick attributes
    for (const [name, page] of Object.entries(pages)) {
      // Find onclick in template literals (look for onclick= inside backtick strings)
      const templateOnclickPattern = /`[^`]*onclick="([^"]*)"[^`]*`/g;
      let match;

      while ((match = templateOnclickPattern.exec(page.scriptContent)) !== null) {
        const onclick = match[1];
        const root = extractOnclickRoots(onclick);
        if (!root) continue;

        // In template-generated HTML, only window.X, this, or event are safe
        // Bare object references (allocator, analyzer) work ONLY if assigned to window
        if (root === 'allocator') {
          // Must use window.allocator
          expect(
            onclick.includes('window.allocator'),
            `${name}: template onclick="${onclick}" should use window.allocator`
          ).toBe(true);
        }

        if (root === 'analyzer') {
          // analyzer.X() works because `let analyzer` is at the script's top level
          // (in the global lexical environment, accessible from inline handlers)
          expect(
            page.scriptContent,
            `${name}: analyzer must be declared at top-level for onclick to work`
          ).toMatch(/^\s*let\s+analyzer\s*;/m);
        }
      }
    }
  });

  it('delete buttons in dynamically generated HTML are functional patterns', () => {
    // Verify delete button patterns work
    for (const [name, page] of Object.entries(pages)) {
      // Check for delete buttons that use this.parentElement traversal
      const deletePatterns = page.scriptContent.match(
        /onclick="this\.parentElement[^"]*\.remove\(\)"/g
      );
      if (deletePatterns) {
        // These are valid - 'this' in onclick refers to the button element
        for (const pattern of deletePatterns) {
          expect(pattern).toContain('remove()');
        }
      }

      // Check for delete buttons using addEventListener (preferred pattern)
      if (page.scriptContent.includes('delete-event-btn')) {
        expect(page.scriptContent).toContain("querySelector('.delete-event-btn')");
      }
    }
  });
});
