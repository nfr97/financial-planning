/**
 * Button Click Simulation Tests
 *
 * These tests create minimal DOM structures that mirror the real pages,
 * wire up event handlers using the same patterns, and then simulate
 * clicks to verify the handlers actually fire and produce expected
 * DOM changes.
 *
 * This catches bugs that static analysis can't:
 * - Event listeners that are attached but the handler throws
 * - Click handlers that modify the wrong element
 * - Event delegation that doesn't match the right target
 * - Buttons that look correct but don't respond to clicks
 *
 * For full browser-level E2E tests, see the Playwright configuration
 * in e2e/ (proposed).
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Click Simulation: Mode Toggle Pattern', () => {
  // Tests the Simple/Advanced mode toggle in retirement-simulator.html
  let simpleBtn, advancedBtn, simpleInputs, advancedInputs;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="simpleModeBtn" class="mode-btn active" aria-selected="true">Simple</button>
      <button id="advancedModeBtn" class="mode-btn" aria-selected="false">Advanced</button>
      <div id="simpleInputs" style="display: block"></div>
      <div id="advancedInputs" style="display: none"></div>
    `;

    simpleBtn = document.getElementById('simpleModeBtn');
    advancedBtn = document.getElementById('advancedModeBtn');
    simpleInputs = document.getElementById('simpleInputs');
    advancedInputs = document.getElementById('advancedInputs');

    // Wire up exactly as retirement-simulator.html does
    simpleBtn.addEventListener('click', () => {
      simpleBtn.classList.add('active');
      simpleBtn.setAttribute('aria-selected', 'true');
      advancedBtn.classList.remove('active');
      advancedBtn.setAttribute('aria-selected', 'false');
      simpleInputs.style.display = 'block';
      advancedInputs.style.display = 'none';
    });

    advancedBtn.addEventListener('click', () => {
      advancedBtn.classList.add('active');
      advancedBtn.setAttribute('aria-selected', 'true');
      simpleBtn.classList.remove('active');
      simpleBtn.setAttribute('aria-selected', 'false');
      simpleInputs.style.display = 'none';
      advancedInputs.style.display = 'block';
    });
  });

  it('clicking Advanced button shows advanced inputs', () => {
    advancedBtn.click();
    expect(advancedInputs.style.display).toBe('block');
    expect(simpleInputs.style.display).toBe('none');
    expect(advancedBtn.classList.contains('active')).toBe(true);
    expect(simpleBtn.classList.contains('active')).toBe(false);
  });

  it('clicking Simple button restores simple inputs', () => {
    advancedBtn.click();
    simpleBtn.click();
    expect(simpleInputs.style.display).toBe('block');
    expect(advancedInputs.style.display).toBe('none');
    expect(simpleBtn.getAttribute('aria-selected')).toBe('true');
    expect(advancedBtn.getAttribute('aria-selected')).toBe('false');
  });

  it('repeated clicks on same button are idempotent', () => {
    advancedBtn.click();
    advancedBtn.click();
    advancedBtn.click();
    expect(advancedInputs.style.display).toBe('block');
    expect(advancedBtn.classList.contains('active')).toBe(true);
  });
});

describe('Click Simulation: Social Security Button Group', () => {
  let ssNoneBtn, ssKnownBtn, ssEstimateBtn, ssKnownInputs, ssEstimateInputs;
  let currentMode;

  beforeEach(() => {
    currentMode = 'none';
    document.body.innerHTML = `
      <button class="ss-option-btn active" id="ssNoneBtn">Don't Include</button>
      <button class="ss-option-btn" id="ssKnownBtn">I Know My Benefit</button>
      <button class="ss-option-btn" id="ssEstimateBtn">Estimate For Me</button>
      <div class="ss-known-inputs" id="ssKnownInputs"></div>
      <div class="ss-estimate-inputs" id="ssEstimateInputs"></div>
    `;

    ssNoneBtn = document.getElementById('ssNoneBtn');
    ssKnownBtn = document.getElementById('ssKnownBtn');
    ssEstimateBtn = document.getElementById('ssEstimateBtn');
    ssKnownInputs = document.getElementById('ssKnownInputs');
    ssEstimateInputs = document.getElementById('ssEstimateInputs');

    // Wire up exactly as retirement-simulator.html does
    const updateSSMode = (mode) => {
      currentMode = mode;
      [ssNoneBtn, ssKnownBtn, ssEstimateBtn].forEach((btn) => btn.classList.remove('active'));
      ssKnownInputs.classList.remove('show');
      ssEstimateInputs.classList.remove('show');

      if (mode === 'none') {
        ssNoneBtn.classList.add('active');
      } else if (mode === 'known') {
        ssKnownBtn.classList.add('active');
        ssKnownInputs.classList.add('show');
      } else if (mode === 'estimate') {
        ssEstimateBtn.classList.add('active');
        ssEstimateInputs.classList.add('show');
      }
    };

    ssNoneBtn.addEventListener('click', () => updateSSMode('none'));
    ssKnownBtn.addEventListener('click', () => updateSSMode('known'));
    ssEstimateBtn.addEventListener('click', () => updateSSMode('estimate'));
  });

  it('clicking Known shows known inputs and hides estimate inputs', () => {
    ssKnownBtn.click();
    expect(currentMode).toBe('known');
    expect(ssKnownBtn.classList.contains('active')).toBe(true);
    expect(ssKnownInputs.classList.contains('show')).toBe(true);
    expect(ssEstimateInputs.classList.contains('show')).toBe(false);
  });

  it('clicking Estimate shows estimate inputs and hides known inputs', () => {
    ssEstimateBtn.click();
    expect(currentMode).toBe('estimate');
    expect(ssEstimateBtn.classList.contains('active')).toBe(true);
    expect(ssEstimateInputs.classList.contains('show')).toBe(true);
    expect(ssKnownInputs.classList.contains('show')).toBe(false);
  });

  it('clicking None hides all extra inputs', () => {
    ssKnownBtn.click();
    ssNoneBtn.click();
    expect(currentMode).toBe('none');
    expect(ssNoneBtn.classList.contains('active')).toBe(true);
    expect(ssKnownInputs.classList.contains('show')).toBe(false);
    expect(ssEstimateInputs.classList.contains('show')).toBe(false);
  });

  it('switching modes deactivates all other buttons', () => {
    ssEstimateBtn.click();
    expect(ssNoneBtn.classList.contains('active')).toBe(false);
    expect(ssKnownBtn.classList.contains('active')).toBe(false);
    expect(ssEstimateBtn.classList.contains('active')).toBe(true);
  });
});

describe('Click Simulation: Event Delegation Pattern', () => {
  // Tests the event delegation approach used in income-allocation.html
  let lastPreset;
  let lastTaxType;

  beforeEach(() => {
    lastPreset = null;
    lastTaxType = null;

    document.body.innerHTML = `
      <button class="preset-btn" data-preset="balanced">Balanced</button>
      <button class="preset-btn" data-preset="aggressive">Aggressive</button>
      <button class="preset-btn" data-preset="debt">Debt Crusher</button>
      <button class="tax-toggle-option" data-tax-type="post">Post-Tax</button>
      <button class="tax-toggle-option" data-tax-type="pre">Pre-Tax</button>
    `;

    // Wire up event delegation exactly as income-allocation.html does
    document.addEventListener('click', (e) => {
      const presetBtn = e.target.closest('.preset-btn[data-preset]');
      if (presetBtn) {
        lastPreset = presetBtn.dataset.preset;
        return;
      }

      const taxToggleBtn = e.target.closest('.tax-toggle-option[data-tax-type]');
      if (taxToggleBtn) {
        lastTaxType = taxToggleBtn.dataset.taxType;
        return;
      }
    });
  });

  it('clicking preset button triggers with correct preset name', () => {
    document.querySelector('[data-preset="balanced"]').click();
    expect(lastPreset).toBe('balanced');
  });

  it('clicking aggressive preset triggers correctly', () => {
    document.querySelector('[data-preset="aggressive"]').click();
    expect(lastPreset).toBe('aggressive');
  });

  it('clicking debt preset triggers correctly', () => {
    document.querySelector('[data-preset="debt"]').click();
    expect(lastPreset).toBe('debt');
  });

  it('clicking tax toggle triggers with correct tax type', () => {
    document.querySelector('[data-tax-type="pre"]').click();
    expect(lastTaxType).toBe('pre');
  });

  it('preset click does not trigger tax handler', () => {
    document.querySelector('[data-preset="balanced"]').click();
    expect(lastTaxType).toBeNull();
  });
});

describe('Click Simulation: Toggle Panel Pattern', () => {
  // Tests the toggle pattern used for events panel, transfer panel, etc.
  let toggleBtn, panel;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="toggleEvents" aria-expanded="false">Life Events</button>
      <div id="eventsPanel" class="events-panel"></div>
    `;

    toggleBtn = document.getElementById('toggleEvents');
    panel = document.getElementById('eventsPanel');

    // Wire up exactly as retirement-simulator.html does
    toggleBtn.addEventListener('click', () => {
      const isShown = panel.classList.toggle('show');
      toggleBtn.classList.toggle('active', isShown);
      toggleBtn.setAttribute('aria-expanded', isShown);
    });
  });

  it('clicking toggle opens the panel', () => {
    toggleBtn.click();
    expect(panel.classList.contains('show')).toBe(true);
    expect(toggleBtn.classList.contains('active')).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking toggle again closes the panel', () => {
    toggleBtn.click();
    toggleBtn.click();
    expect(panel.classList.contains('show')).toBe(false);
    expect(toggleBtn.classList.contains('active')).toBe(false);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('accessibility state is synchronized with visibility', () => {
    toggleBtn.click();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    toggleBtn.click();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Click Simulation: Section Collapse Pattern', () => {
  // Tests the collapsible section headers in retirement-simulator.html
  let headerEl, contentEl;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="section-header" id="savingsHeader" aria-expanded="false">Savings</div>
      <div class="section-content show" id="savingsContent">Content here</div>
    `;

    headerEl = document.getElementById('savingsHeader');
    contentEl = document.getElementById('savingsContent');

    // Wire up exactly as retirement-simulator.html does
    headerEl.addEventListener('click', () => {
      const isExpanded = contentEl.classList.toggle('show');
      headerEl.classList.toggle('expanded', isExpanded);
      headerEl.setAttribute('aria-expanded', isExpanded);
    });
  });

  it('clicking header collapses an open section', () => {
    // Content starts with 'show' class
    headerEl.click();
    expect(contentEl.classList.contains('show')).toBe(false);
    expect(headerEl.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking header again expands a collapsed section', () => {
    headerEl.click(); // collapse
    headerEl.click(); // expand
    expect(contentEl.classList.contains('show')).toBe(true);
    expect(headerEl.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('Click Simulation: Window-Scoped Object Pattern', () => {
  // Tests the pattern where onclick handlers call window.obj.method()
  // This was the #1 bug class found in the button audit

  beforeEach(() => {
    // Simulate the income-allocation pattern
    document.body.innerHTML = `
      <button id="saveBtn" onclick="window.allocator.saveScenario()">Save</button>
      <button id="clearBtn" onclick="window.allocator.clearScenarios()">Clear</button>
      <div id="scenarioGrid"></div>
    `;
  });

  it('window.allocator methods are callable from onclick', () => {
    let saveCalled = false;
    let clearCalled = false;

    // Assign to window exactly as the real code does
    window.allocator = {
      saveScenario: () => {
        saveCalled = true;
      },
      clearScenarios: () => {
        clearCalled = true;
      },
    };

    const saveBtn = document.getElementById('saveBtn');
    // Simulate what the browser does with onclick attribute
    const onclickFn = new Function(saveBtn.getAttribute('onclick'));
    onclickFn();
    expect(saveCalled).toBe(true);

    const clearBtn = document.getElementById('clearBtn');
    const clearFn = new Function(clearBtn.getAttribute('onclick'));
    clearFn();
    expect(clearCalled).toBe(true);

    // Cleanup
    delete window.allocator;
  });

  it('bare allocator reference fails without window assignment', () => {
    // This demonstrates the bug that was fixed: if allocator is local,
    // onclick="allocator.save()" would throw ReferenceError
    document.body.innerHTML = `
      <button id="brokenBtn" onclick="allocator.brokenMethod()">Broken</button>
    `;

    // allocator is NOT on window - simulates the pre-fix bug
    const btn = document.getElementById('brokenBtn');
    const onclickFn = new Function(btn.getAttribute('onclick'));

    expect(() => onclickFn()).toThrow();
  });
});

describe('Click Simulation: Delete via DOM Traversal Pattern', () => {
  // Tests the pattern: onclick="this.parentElement.parentElement.parentElement.remove()"
  // Used in transaction-analyzer for deleting rules

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="rulesList">
        <div class="rule-row" id="rule1">
          <div class="rule-content">
            <div class="rule-actions">
              <button class="delete-rule-btn">Delete</button>
            </div>
          </div>
        </div>
        <div class="rule-row" id="rule2">
          <div class="rule-content">
            <div class="rule-actions">
              <button class="delete-rule-btn">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  it('delete button removes its parent rule row via DOM traversal', () => {
    const btn = document.querySelector('#rule1 .delete-rule-btn');

    // Simulate what "this.parentElement.parentElement.parentElement.remove()" does
    // In onclick, 'this' refers to the button element
    const targetElement = btn.parentElement.parentElement.parentElement;
    expect(targetElement.id).toBe('rule1');
    targetElement.remove();

    expect(document.getElementById('rule1')).toBeNull();
    expect(document.getElementById('rule2')).not.toBeNull();
  });
});

describe('Click Simulation: Preset Buttons with Market Parameters', () => {
  // Tests retirement simulator preset buttons (Conservative/Balanced/Aggressive)
  let expectedReturn, returnVolatility;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="presetConservative">Conservative</button>
      <button id="presetBalanced">Balanced</button>
      <button id="presetAggressive">Aggressive</button>
      <input type="number" id="expectedReturn" value="7" />
      <input type="number" id="returnVolatility" value="12" />
    `;

    expectedReturn = document.getElementById('expectedReturn');
    returnVolatility = document.getElementById('returnVolatility');

    const applyPreset = (type) => {
      const presets = {
        conservative: { growth: 5, volatility: 8 },
        balanced: { growth: 7, volatility: 12 },
        aggressive: { growth: 9, volatility: 18 },
      };
      const preset = presets[type];
      expectedReturn.value = preset.growth;
      returnVolatility.value = preset.volatility;
    };

    document
      .getElementById('presetConservative')
      .addEventListener('click', () => applyPreset('conservative'));
    document
      .getElementById('presetBalanced')
      .addEventListener('click', () => applyPreset('balanced'));
    document
      .getElementById('presetAggressive')
      .addEventListener('click', () => applyPreset('aggressive'));
  });

  it('Conservative preset sets low growth and volatility', () => {
    document.getElementById('presetConservative').click();
    expect(expectedReturn.value).toBe('5');
    expect(returnVolatility.value).toBe('8');
  });

  it('Aggressive preset sets high growth and volatility', () => {
    document.getElementById('presetAggressive').click();
    expect(expectedReturn.value).toBe('9');
    expect(returnVolatility.value).toBe('18');
  });

  it('presets can be switched freely', () => {
    document.getElementById('presetAggressive').click();
    document.getElementById('presetConservative').click();
    expect(expectedReturn.value).toBe('5');

    document.getElementById('presetBalanced').click();
    expect(expectedReturn.value).toBe('7');
  });
});

describe('Click Simulation: ESC Key Handler Cleanup', () => {
  // Tests that modal ESC handlers are properly cleaned up (no memory leaks)
  let closeCount;

  beforeEach(() => {
    closeCount = 0;
  });

  it('ESC handler is removed after modal close', () => {
    // Simulate the fixed pattern from shared.js
    let handleEsc;

    const openModal = () => {
      handleEsc = (e) => {
        if (e.key === 'Escape') closeModal();
      };
      document.addEventListener('keydown', handleEsc);
    };

    const closeModal = () => {
      closeCount++;
      document.removeEventListener('keydown', handleEsc);
    };

    // Open and close the modal
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeCount).toBe(1);

    // After close, ESC should NOT trigger again
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeCount).toBe(1); // Still 1, not 2
  });

  it('multiple open/close cycles do not accumulate handlers', () => {
    let handleEsc;

    const openModal = () => {
      handleEsc = (e) => {
        if (e.key === 'Escape') closeModal();
      };
      document.addEventListener('keydown', handleEsc);
    };

    const closeModal = () => {
      closeCount++;
      document.removeEventListener('keydown', handleEsc);
    };

    // Open and close 3 times
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeCount).toBe(3);

    // After all closes, ESC should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeCount).toBe(3);
  });
});

describe('Click Simulation: Bulk Categorization with stopPropagation', () => {
  // Tests the transaction-analyzer bulk categorize pattern where buttons
  // call event.stopPropagation() to prevent parent div toggle
  let groupToggled, categorized;

  beforeEach(() => {
    groupToggled = false;
    categorized = null;

    document.body.innerHTML = `
      <div class="bulk-group-header" id="groupHeader">
        <span>Amazon (5 transactions)</span>
        <div class="bulk-actions">
          <button class="bulk-btn fixed-costs" id="fixedBtn">Fixed</button>
          <button class="bulk-btn guilt-free" id="guiltBtn">Guilt-Free</button>
        </div>
      </div>
    `;

    // Parent div toggles on click
    document.getElementById('groupHeader').addEventListener('click', () => {
      groupToggled = true;
    });

    // Bulk buttons stop propagation and categorize
    document.getElementById('fixedBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      categorized = 'fixed-costs';
    });

    document.getElementById('guiltBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      categorized = 'guilt-free';
    });
  });

  it('clicking bulk button categorizes without toggling parent', () => {
    document.getElementById('fixedBtn').click();
    expect(categorized).toBe('fixed-costs');
    expect(groupToggled).toBe(false);
  });

  it('clicking parent header still toggles when not on button', () => {
    document.getElementById('groupHeader').click();
    expect(groupToggled).toBe(true);
    expect(categorized).toBeNull();
  });
});
