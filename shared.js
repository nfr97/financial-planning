/**
 * Shared Utilities for Financial Planning Tools
 *
 * This file contains common utility functions used across the financial planning suite:
 * - Monte Carlo Retirement Simulator
 * - Income Allocation Calculator
 * - Transaction Analyzer
 */

const FinanceUtils = {
  /**
   * Format a number as currency using standard formatting ($1,234)
   * @param {number} value - The value to format
   * @param {Object} options - Formatting options
   * @param {number} options.minimumFractionDigits - Minimum decimal places (default: 0)
   * @param {number} options.maximumFractionDigits - Maximum decimal places (default: 0)
   * @returns {string} Formatted currency string
   */
  formatCurrency(value, options = {}) {
    const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  },

  /**
   * Format a number as compact currency ($1.5M, $250K, $500)
   * Useful for charts and compact displays
   * @param {number} value - The value to format
   * @returns {string} Compact formatted currency string
   */
  formatCurrencyCompact(value) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1000000) {
      return sign + '$' + (absValue / 1000000).toFixed(absValue >= 10000000 ? 1 : 2) + 'M';
    } else if (absValue >= 1000) {
      return sign + '$' + (absValue / 1000).toFixed(0) + 'K';
    } else {
      return sign + '$' + absValue.toFixed(0);
    }
  },

  /**
   * Format a percentage value
   * @param {number} value - The value to format (e.g., 50 for 50%)
   * @param {number} decimals - Number of decimal places (default: 1)
   * @returns {string} Formatted percentage string
   */
  formatPercent(value, decimals = 1) {
    return value.toFixed(decimals) + '%';
  },
};

const StorageUtils = {
  /**
   * Internal error handler for storage failures
   * @param {Error} error - The error that occurred
   * @param {string} operation - Description of the operation
   */
  _handleError(error, operation) {
    console.warn(`Storage ${operation} failed:`, error);

    // Check if this is a quota exceeded error
    const isQuotaError =
      error.name === 'QuotaExceededError' ||
      (error.name === 'NS_ERROR_DOM_QUOTA_REACHED' && error.code === 22);

    // Show user-friendly notification if SessionManager is available
    if (typeof SessionManager !== 'undefined' && SessionManager.showToast) {
      if (isQuotaError) {
        SessionManager.showToast(
          'Storage full. Consider exporting your data to a file.',
          'error',
          5000
        );
      } else {
        SessionManager.showToast('Unable to save data locally.', 'error', 3000);
      }
    }
  },

  /**
   * Get a value from localStorage with optional default
   * @param {string} key - The storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} The stored value or default
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      // If JSON parsing fails, return raw string or default
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    }
  },

  /**
   * Set a value in localStorage
   * @param {string} key - The storage key
   * @param {*} value - The value to store (will be JSON stringified if object)
   * @returns {boolean} True if successful, false if failed
   */
  set(key, value) {
    try {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
      return true;
    } catch (e) {
      this._handleError(e, 'save');
      return false;
    }
  },

  /**
   * Remove a value from localStorage
   * @param {string} key - The storage key to remove
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      this._handleError(e, 'remove');
    }
  },

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};

const DOMUtils = {
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - The text to escape
   * @returns {string} Escaped text safe for HTML insertion
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Run a function when the DOM is ready
   * @param {Function} fn - The function to run
   */
  ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  },

  /**
   * Create a downloadable file from content
   * @param {string} content - The file content
   * @param {string} filename - The name of the file to download
   * @param {string} mimeType - The MIME type (default: text/plain)
   */
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

const DateUtils = {
  /**
   * Parse a date string in various formats
   * @param {string} dateStr - The date string to parse
   * @returns {string|null} ISO date string (YYYY-MM-DD) or null if invalid
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    dateStr = dateStr.replace(/"/g, '').trim();

    // Try various formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    ];

    for (let i = 0; i < formats.length; i++) {
      const match = dateStr.match(formats[i]);
      if (match) {
        if (i === 1) {
          // YYYY-MM-DD - already in correct format
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          // MM/DD/YYYY or MM-DD-YYYY
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }

    // Fallback: try native Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  },

  /**
   * Format a date for display
   * @param {string|Date} date - The date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  formatDate(date, options = {}) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', options);
  },
};

/**
 * Session Manager for saving and restoring user sessions across all tools
 * Allows users to export their data as a JSON file and import it later
 */
const SessionManager = {
  VERSION: '1.0',

  /**
   * Storage keys used by each page
   */
  STORAGE_KEYS: {
    budgetPlanner: 'budgetPlannerData',
    budgetRetirement: 'budgetRetirementData',
    spendingTracker: 'spendingTrackerData',
    transactionRules: 'transactionRules',
    transactionData: 'transactionData',
    bankFormat: 'bankFormat',
    aiProvider: 'aiProvider',
    retirementForecast: 'retirementForecastData',
    lifeEvents: 'lifeEventsData',
  },

  /**
   * Export all session data as a downloadable JSON file
   * @param {Object} pageData - Additional page-specific data to include
   * @returns {Object} The complete session object
   */
  exportSession(pageData = {}) {
    const session = {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      budgetPlanner: StorageUtils.get(this.STORAGE_KEYS.budgetPlanner, null),
      budgetRetirement: StorageUtils.get(this.STORAGE_KEYS.budgetRetirement, null),
      spendingTracker: StorageUtils.get(this.STORAGE_KEYS.spendingTracker, null),
      transactionRules: StorageUtils.get(this.STORAGE_KEYS.transactionRules, {}),
      transactionData: StorageUtils.get(this.STORAGE_KEYS.transactionData, []),
      bankFormat: StorageUtils.get(this.STORAGE_KEYS.bankFormat, 'chase'),
      aiProvider: StorageUtils.get(this.STORAGE_KEYS.aiProvider, 'gemini'),
      retirementForecast: StorageUtils.get(this.STORAGE_KEYS.retirementForecast, null),
      lifeEvents: StorageUtils.get(this.STORAGE_KEYS.lifeEvents, []),
      ...pageData,
    };

    return session;
  },

  /**
   * Download session as JSON file
   * @param {Object} pageData - Additional page-specific data to include
   */
  downloadSession(pageData = {}) {
    const session = this.exportSession(pageData);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `financial-plan-${timestamp}.json`;
    DOMUtils.downloadFile(JSON.stringify(session, null, 2), filename, 'application/json');
    return session;
  },

  /**
   * Validate session data schema before import
   * @param {Object} session - The session object to validate
   * @returns {Object} Validation result with errors and warnings
   */
  _validateSessionSchema(session) {
    const errors = [];
    const warnings = [];

    // Check version
    if (!session.version) {
      warnings.push('Session file missing version - attempting import anyway');
    } else if (session.version !== '1.0') {
      warnings.push(`Session version ${session.version} may not be fully compatible`);
    }

    // Validate exportedAt
    if (session.exportedAt) {
      const date = new Date(session.exportedAt);
      if (isNaN(date.getTime())) {
        warnings.push('Invalid export date - ignoring');
      }
    }

    // Validate budget planner data
    if (session.budgetPlanner && typeof session.budgetPlanner !== 'object') {
      errors.push('Invalid budget planner data format');
    }

    // Validate spending tracker data
    if (session.spendingTracker && typeof session.spendingTracker !== 'object') {
      errors.push('Invalid spending tracker data format');
    }

    // Validate life events
    if (session.lifeEvents && !Array.isArray(session.lifeEvents)) {
      errors.push('Life events must be an array');
    }

    // Validate transaction rules
    if (
      session.transactionRules &&
      (typeof session.transactionRules !== 'object' || Array.isArray(session.transactionRules))
    ) {
      errors.push('Transaction rules must be an object');
    }

    // Validate transaction data
    if (session.transactionData && !Array.isArray(session.transactionData)) {
      errors.push('Transaction data must be an array');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Import session data from a JSON object
   * @param {Object} session - The session object to import
   * @returns {Object} Result with success status, warnings, errors, and session metadata
   */
  importSession(session) {
    const result = { success: false, warnings: [], errors: [], imported: [], exportedAt: null };

    // Validate session schema
    const validation = this._validateSessionSchema(session);
    result.warnings = validation.warnings;

    if (!validation.valid) {
      result.errors = validation.errors;
      return result;
    }

    // Capture the session export timestamp
    if (session.exportedAt) {
      result.exportedAt = session.exportedAt;
    }

    // Import budget planner data
    if (session.budgetPlanner && typeof session.budgetPlanner === 'object') {
      StorageUtils.set(this.STORAGE_KEYS.budgetPlanner, session.budgetPlanner);
      result.imported.push('Budget Planner settings');
    }

    // Import budget retirement data
    if (session.budgetRetirement && typeof session.budgetRetirement === 'object') {
      StorageUtils.set(this.STORAGE_KEYS.budgetRetirement, session.budgetRetirement);
      result.imported.push('Retirement contribution settings');
    }

    // Import spending tracker data
    if (session.spendingTracker && typeof session.spendingTracker === 'object') {
      StorageUtils.set(this.STORAGE_KEYS.spendingTracker, session.spendingTracker);
      result.imported.push('Spending Tracker data');
    }

    // Import transaction rules (with type validation)
    if (
      session.transactionRules &&
      typeof session.transactionRules === 'object' &&
      !Array.isArray(session.transactionRules) &&
      Object.keys(session.transactionRules).length > 0
    ) {
      StorageUtils.set(this.STORAGE_KEYS.transactionRules, session.transactionRules);
      result.imported.push('Transaction categorization rules');
    }

    // Import transaction data (with array validation)
    if (
      session.transactionData &&
      Array.isArray(session.transactionData) &&
      session.transactionData.length > 0
    ) {
      StorageUtils.set(this.STORAGE_KEYS.transactionData, session.transactionData);
      result.imported.push(`${session.transactionData.length} transactions`);
    }

    // Import bank format preference
    if (session.bankFormat && typeof session.bankFormat === 'string') {
      StorageUtils.set(this.STORAGE_KEYS.bankFormat, session.bankFormat);
    }

    // Import AI provider preference
    if (session.aiProvider && typeof session.aiProvider === 'string') {
      StorageUtils.set(this.STORAGE_KEYS.aiProvider, session.aiProvider);
      result.imported.push('AI provider preference');
    }

    // Import retirement forecast data (with type validation)
    if (session.retirementForecast && typeof session.retirementForecast === 'object') {
      StorageUtils.set(this.STORAGE_KEYS.retirementForecast, session.retirementForecast);
      result.imported.push('Retirement Forecast settings');
    }

    // Import life events (with validation of required fields)
    if (session.lifeEvents && Array.isArray(session.lifeEvents)) {
      // Filter to only valid life events
      const validEvents = session.lifeEvents.filter((event) => {
        return (
          event &&
          typeof event === 'object' &&
          typeof event.amount === 'number' &&
          typeof event.startAge === 'number' &&
          (event.type === 'expense' || event.type === 'income')
        );
      });

      if (validEvents.length !== session.lifeEvents.length) {
        result.warnings.push(
          `${session.lifeEvents.length - validEvents.length} invalid life events were skipped`
        );
      }

      if (validEvents.length > 0) {
        StorageUtils.set(this.STORAGE_KEYS.lifeEvents, validEvents);
        result.imported.push(`${validEvents.length} life events`);
      }
    }

    result.success = result.imported.length > 0;
    return result;
  },

  /**
   * Prompt user to select and import a session file
   * @param {Function} onComplete - Callback with import result
   */
  promptImport(onComplete) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        onComplete({ success: false, error: 'No file selected' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const session = JSON.parse(event.target.result);
          const result = this.importSession(session);
          onComplete(result);
        } catch (err) {
          onComplete({ success: false, error: 'Invalid JSON file: ' + err.message });
        }
      };
      reader.onerror = () => {
        onComplete({ success: false, error: 'Failed to read file' });
      };
      reader.readAsText(file);
    };

    input.click();
  },

  /**
   * Clear all session data from localStorage
   */
  clearSession() {
    for (const key of Object.values(this.STORAGE_KEYS)) {
      StorageUtils.remove(key);
    }
  },

  /**
   * Create the session toolbar HTML
   * @returns {string} HTML string for the session toolbar
   */
  createToolbarHTML() {
    return `
            <div class="session-toolbar" role="toolbar" aria-label="Session management">
                <button type="button" class="session-btn session-save-btn" id="saveSessionBtn" aria-label="Save session to file">
                    <span aria-hidden="true">&#128190;</span> Save Session
                </button>
                <button type="button" class="session-btn session-load-btn" id="loadSessionBtn" aria-label="Load session from file">
                    <span aria-hidden="true">&#128194;</span> Load Session
                </button>
                <button type="button" class="session-btn session-clear-btn" id="clearSessionBtn" aria-label="Clear all stored data">
                    <span aria-hidden="true">&#128465;</span> Clear Data
                </button>
            </div>
        `;
  },

  /**
   * Get the CSS styles for the session toolbar
   * @returns {string} CSS string
   */
  getToolbarStyles() {
    return `
            .session-toolbar {
                display: flex;
                gap: 10px;
                justify-content: center;
                padding: 15px 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
                border-bottom: 1px solid #ddd;
            }

            .session-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 18px;
                border: 2px solid #667eea;
                border-radius: 6px;
                font-size: 0.95em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .session-save-btn {
                background: white;
                color: #667eea;
            }

            .session-save-btn:hover {
                background: #667eea;
                color: white;
            }

            .session-load-btn {
                background: white;
                color: #667eea;
            }

            .session-load-btn:hover {
                background: #764ba2;
                border-color: #764ba2;
                color: white;
            }

            .session-clear-btn {
                background: white;
                color: #ef4444;
                border-color: #ef4444;
            }

            .session-clear-btn:hover {
                background: #ef4444;
                color: white;
            }

            .session-btn:focus {
                outline: 3px solid #667eea;
                outline-offset: 2px;
            }

            .session-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                z-index: 10000;
                animation: slideUp 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .session-toast.success {
                background: #10b981;
                color: white;
            }

            .session-toast.error {
                background: #ef4444;
                color: white;
            }

            .session-toast.info {
                background: #667eea;
                color: white;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }

            @media (max-width: 768px) {
                .session-toolbar {
                    padding: 12px 15px;
                    gap: 8px;
                }

                .session-btn {
                    padding: 8px 14px;
                    font-size: 0.9em;
                }
            }
        `;
  },

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success', 'error', or 'info'
   * @param {number} duration - How long to show the toast (ms)
   */
  showToast(message, type = 'info', duration = 3000) {
    // Remove any existing toasts
    const existing = document.querySelector('.session-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `session-toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Initialize session toolbar on a page
   * @param {Function} getPageData - Function to get current page-specific data
   * @param {Function} onImport - Function to call after successful import to refresh page
   */
  initToolbar(getPageData, onImport) {
    // Inject styles
    if (!document.getElementById('session-toolbar-styles')) {
      const style = document.createElement('style');
      style.id = 'session-toolbar-styles';
      style.textContent = this.getToolbarStyles();
      document.head.appendChild(style);
    }

    // Find container and inject toolbar after header
    const container = document.querySelector('.container');
    const header = container?.querySelector('header');
    if (header) {
      header.insertAdjacentHTML('afterend', this.createToolbarHTML());

      // Bind save button
      document.getElementById('saveSessionBtn').addEventListener('click', () => {
        const pageData = getPageData ? getPageData() : {};
        this.downloadSession(pageData);
        this.showToast('Session saved! Check your downloads folder.', 'success');
      });

      // Bind load button
      document.getElementById('loadSessionBtn').addEventListener('click', () => {
        this.promptImport((result) => {
          if (result.success) {
            // Format the session date/time for display
            let sessionDateStr = '';
            if (result.exportedAt) {
              const sessionDate = new Date(result.exportedAt);
              sessionDateStr = sessionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
            }

            // Show confirmation banner
            this.showSessionLoadedBanner(sessionDateStr, result.imported);

            if (onImport) {
              onImport(result);
            } else {
              // Default: reload page to reflect changes after user sees the banner
              setTimeout(() => window.location.reload(), 3000);
            }
          } else if (result.error) {
            this.showToast(result.error, 'error');
          } else {
            this.showToast('No data found to import', 'info');
          }
        });
      });

      // Bind clear button
      document.getElementById('clearSessionBtn').addEventListener('click', () => {
        const confirmed = confirm(
          'Clear all stored data?\n\n' +
            'This will permanently delete:\n' +
            '• Budget planner settings\n' +
            '• Transaction data and rules\n' +
            '• Retirement forecast settings\n' +
            '• API keys for AI categorization\n' +
            '• All other saved preferences\n\n' +
            'This cannot be undone. Continue?'
        );
        if (confirmed) {
          this.clearSession();
          // Also clear API keys (stored separately per provider)
          ['gemini', 'openai', 'anthropic'].forEach((p) => StorageUtils.remove(`apiKey_${p}`));
          this.showToast('All stored data cleared.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      });
    }
  },

  /**
   * Show a prominent banner when session is loaded
   * @param {string} sessionDateStr - Formatted date string of the session
   * @param {Array} imported - List of imported items
   */
  showSessionLoadedBanner(sessionDateStr, imported) {
    // Remove any existing banner
    const existing = document.querySelector('.session-loaded-banner');
    if (existing) existing.remove();

    // Inject banner styles if not already present
    if (!document.getElementById('session-banner-styles')) {
      const style = document.createElement('style');
      style.id = 'session-banner-styles';
      style.textContent = `
                .session-loaded-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 20px;
                    z-index: 10001;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    animation: slideDown 0.4s ease;
                    text-align: center;
                }

                .session-loaded-banner h3 {
                    margin: 0 0 8px 0;
                    font-size: 1.3em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }

                .session-loaded-banner .session-date {
                    font-size: 1.1em;
                    opacity: 0.95;
                    margin-bottom: 8px;
                }

                .session-loaded-banner .session-items {
                    font-size: 0.9em;
                    opacity: 0.85;
                }

                .session-loaded-banner .dismiss-btn {
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    font-size: 1.2em;
                    cursor: pointer;
                    padding: 5px 10px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .session-loaded-banner .dismiss-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
      document.head.appendChild(style);
    }

    // Create banner element
    const banner = document.createElement('div');
    banner.className = 'session-loaded-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');

    let dateDisplay = sessionDateStr
      ? `<div class="session-date">Session from: <strong>${sessionDateStr}</strong></div>`
      : '';

    let itemsDisplay =
      imported && imported.length > 0
        ? `<div class="session-items">Restored: ${imported.join(', ')}</div>`
        : '';

    banner.innerHTML = `
            <button class="dismiss-btn" aria-label="Dismiss notification">&times;</button>
            <h3><span aria-hidden="true">✓</span> Previous Session Loaded Successfully</h3>
            ${dateDisplay}
            ${itemsDisplay}
        `;

    document.body.appendChild(banner);

    // Bind dismiss button
    banner.querySelector('.dismiss-btn').addEventListener('click', () => {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.3s ease';
      setTimeout(() => banner.remove(), 300);
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (document.body.contains(banner)) {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.3s ease';
        setTimeout(() => banner.remove(), 300);
      }
    }, 8000);
  },
};

/**
 * Cross-Tool State Manager
 * Provides unified access to data across all three tools
 */
const CrossToolState = {
  /**
   * Get budget planner state
   */
  getBudgetState() {
    const data = StorageUtils.get('budgetPlannerData');
    if (!data) return null;

    return {
      monthlyIncome: data.monthlyIncome || 0,
      fixedCosts: data.fixedCosts || 0,
      shortTerm: data.shortTerm || 0,
      longTerm: data.longTerm || 0,
      guiltFree: data.guiltFree || 0,
      lastUpdated: data.lastUpdated,
    };
  },

  /**
   * Get spending tracker state
   */
  getSpendingState() {
    const data = StorageUtils.get('spendingTrackerData');
    if (!data) return null;

    return {
      monthlySpending: data.monthlySpending || 0,
      monthlySavings: data.monthlySavings || 0,
      categoryBreakdown: data.categoryBreakdown || {},
      transactionCount: data.transactionCount || 0,
      lastUpdated: data.lastUpdated,
      period: data.period || 'Unknown',
    };
  },

  /**
   * Get retirement forecast state
   */
  getRetirementState() {
    const data = StorageUtils.get('retirementForecastData');
    if (!data) return null;

    return {
      successRate: data.successRate || 0,
      medianEndingBalance: data.medianEndingBalance || 0,
      lastRunAt: data.lastRunAt,
      currentAge: data.currentAge,
      retirementAge: data.retirementAge,
    };
  },

  /**
   * Get complete state across all tools
   */
  getAllState() {
    return {
      budget: this.getBudgetState(),
      spending: this.getSpendingState(),
      retirement: this.getRetirementState(),
    };
  },

  /**
   * Calculate quick retirement estimate without full simulation
   * @param {number} currentAge
   * @param {number} retirementAge
   * @param {number} currentSavings
   * @param {number} annualContribution
   * @param {number} annualSpending
   * @returns {Object} Quick estimate
   */
  quickRetirementEstimate(
    currentAge,
    retirementAge,
    currentSavings,
    annualContribution,
    annualSpending
  ) {
    const yearsToRetirement = retirementAge - currentAge;
    const assumedReturn = 0.07; // 7% annual return
    const inflationRate = 0.03;

    // Calculate future value of current savings
    const futureCurrentSavings = currentSavings * Math.pow(1 + assumedReturn, yearsToRetirement);

    // Calculate future value of annuity (annual contributions)
    const futureContributions =
      annualContribution * ((Math.pow(1 + assumedReturn, yearsToRetirement) - 1) / assumedReturn);

    const totalAtRetirement = futureCurrentSavings + futureContributions;

    // Estimate years of retirement funding (simple calculation)
    const retirementYears = 90 - retirementAge; // Assume living to 90
    const inflationAdjustedSpending =
      annualSpending * Math.pow(1 + inflationRate, yearsToRetirement);
    const requiredSavings = inflationAdjustedSpending * retirementYears * 0.8; // Rough estimate

    const successRate = Math.min(100, Math.max(0, (totalAtRetirement / requiredSavings) * 100));

    return {
      totalAtRetirement,
      requiredSavings,
      successRate: Math.round(successRate),
      yearsToRetirement,
      shortfall: Math.max(0, requiredSavings - totalAtRetirement),
    };
  },
};

/**
 * Status Bar Component
 * Shows data flow and connections across tools
 */
const StatusBar = {
  /**
   * Create status bar HTML
   */
  createHTML() {
    const state = CrossToolState.getAllState();
    const budget = state.budget;
    const spending = state.spending;
    const retirement = state.retirement;

    // Detect current page
    const currentPage = window.location.pathname.split('/').pop();
    const isBudgetPage = currentPage === 'income-allocation.html';
    const isSpendingPage = currentPage === 'transaction-analyzer.html';
    const isRetirementPage = currentPage === 'retirement-simulator.html';

    let budgetStatus = '💰 Budget: Not set';
    let spendingStatus = '📊 Spending: No data';
    let retirementStatus = '🎯 Retirement: Not simulated';

    if (budget) {
      budgetStatus = `💰 Budget: ${FinanceUtils.formatCurrency(budget.monthlyIncome)}/mo`;
    }

    if (spending) {
      spendingStatus = `📊 Tracked: ${spending.period}`;
    }

    if (retirement && retirement.successRate > 0) {
      retirementStatus = `🎯 Success: ${retirement.successRate}%`;
    }

    // Helper to create item (clickable link or current page indicator)
    const createItem = (href, status, hasData, isCurrent, title) => {
      if (isCurrent) {
        return `<span class="status-item status-item-current ${hasData ? 'has-data' : ''}" title="${title} (Current Page)">
                    📍 ${status}
                </span>`;
      }
      return `<a href="${href}" class="status-item ${hasData ? 'has-data' : ''}" title="Go to ${title}">
                ${status}
            </a>`;
    };

    return `
            <div class="status-bar" role="status" aria-label="Data flow status">
                <div class="status-items">
                    ${createItem('income-allocation.html', budgetStatus, budget, isBudgetPage, 'Budget Planner')}
                    <span class="status-arrow" aria-hidden="true">→</span>
                    ${createItem('transaction-analyzer.html', spendingStatus, spending, isSpendingPage, 'Spending Tracker')}
                    <span class="status-arrow" aria-hidden="true">→</span>
                    ${createItem('retirement-simulator.html', retirementStatus, retirement, isRetirementPage, 'Retirement Forecast')}
                </div>
                <button class="status-refine-btn" onclick="StatusBar.openRefinementModal()" aria-label="Open plan refinement">
                    ⚙️ Refine Plan
                </button>
            </div>
        `;
  },

  /**
   * Get CSS styles for status bar
   */
  getStyles() {
    return `
            .status-bar {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                padding: 12px 20px;
                border-bottom: 1px solid #cbd5e1;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
            }

            .status-items {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                flex: 1;
            }

            .status-item {
                padding: 6px 12px;
                background: white;
                border-radius: 6px;
                font-size: 0.9em;
                color: #64748b;
                text-decoration: none;
                border: 1px solid #e2e8f0;
                transition: all 0.2s;
                white-space: nowrap;
                cursor: pointer;
            }

            .status-item.has-data {
                color: #1e293b;
                border-color: #667eea;
                background: #f0f4ff;
            }

            /* Clickable items - enhanced hover */
            a.status-item:hover {
                border-color: #667eea;
                box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
                transform: translateY(-1px);
            }

            /* Current page - non-clickable */
            .status-item-current {
                background: linear-gradient(135deg, #667eea 0%, #5568d3 100%);
                color: white;
                border-color: #5568d3;
                cursor: default;
                font-weight: 600;
            }

            .status-item-current.has-data {
                background: linear-gradient(135deg, #667eea 0%, #5568d3 100%);
                color: white;
                border-color: #5568d3;
            }

            .status-arrow {
                color: #cbd5e1;
                font-size: 1.2em;
            }

            .status-refine-btn {
                padding: 8px 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 0.9em;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
                white-space: nowrap;
            }

            .status-refine-btn:hover {
                background: #5568d3;
            }

            @media (max-width: 768px) {
                .status-bar {
                    padding: 10px 15px;
                    flex-direction: column;
                    align-items: stretch;
                }

                .status-items {
                    flex-direction: column;
                    align-items: stretch;
                }

                .status-arrow {
                    transform: rotate(90deg);
                    align-self: center;
                }

                .status-refine-btn {
                    width: 100%;
                }
            }
        `;
  },

  /**
   * Initialize status bar on page
   */
  init() {
    // Inject styles
    if (!document.getElementById('status-bar-styles')) {
      const style = document.createElement('style');
      style.id = 'status-bar-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    // Find container and inject after session toolbar (or header if no toolbar)
    const container = document.querySelector('.container');
    const sessionToolbar = container?.querySelector('.session-toolbar');
    const header = container?.querySelector('header');

    if (sessionToolbar) {
      sessionToolbar.insertAdjacentHTML('afterend', this.createHTML());
    } else if (header) {
      header.insertAdjacentHTML('afterend', this.createHTML());
    }
  },

  /**
   * Update status bar content
   */
  update() {
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      const temp = document.createElement('div');
      temp.innerHTML = this.createHTML();
      statusBar.replaceWith(temp.firstElementChild);
    }
  },

  /**
   * Open refinement modal
   */
  openRefinementModal() {
    RefinementModal.open();
  },
};

/**
 * Plan Refinement Modal
 * Shows all three views side-by-side for iterative refinement
 */
const RefinementModal = {
  /**
   * Create modal HTML
   */
  createHTML() {
    const state = CrossToolState.getAllState();
    const budget = state.budget;
    const spending = state.spending;
    const retirement = state.retirement;

    let budgetContent =
      '<p style="color: #94a3b8;">No budget set yet. <a href="income-allocation.html" style="color: #667eea;">Set up your budget →</a></p>';
    let spendingContent =
      '<p style="color: #94a3b8;">No spending data. <a href="transaction-analyzer.html" style="color: #667eea;">Upload transactions →</a></p>';
    let retirementContent =
      '<p style="color: #94a3b8;">No retirement projection. <a href="retirement-simulator.html" style="color: #667eea;">Run simulation →</a></p>';

    if (budget) {
      budgetContent = `
                <div class="refine-metric">
                    <div class="refine-label">Monthly Income</div>
                    <div class="refine-value">${FinanceUtils.formatCurrency(budget.monthlyIncome)}</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Fixed Costs</div>
                    <div class="refine-value">${budget.fixedCosts}%</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Savings (Short)</div>
                    <div class="refine-value">${budget.shortTerm}%</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Savings (Long)</div>
                    <div class="refine-value">${budget.longTerm}%</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Guilt-Free</div>
                    <div class="refine-value">${budget.guiltFree}%</div>
                </div>
            `;
    }

    if (spending) {
      const breakdown = spending.categoryBreakdown;
      spendingContent = `
                <div class="refine-metric">
                    <div class="refine-label">Period</div>
                    <div class="refine-value">${spending.period}</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Monthly Spending</div>
                    <div class="refine-value">${FinanceUtils.formatCurrency(spending.monthlySpending)}</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Monthly Savings</div>
                    <div class="refine-value">${FinanceUtils.formatCurrency(spending.monthlySavings)}</div>
                </div>
                ${
                  breakdown && breakdown['fixed-costs']
                    ? `
                <div class="refine-metric">
                    <div class="refine-label">Actual Fixed Costs</div>
                    <div class="refine-value">${Math.round((breakdown['fixed-costs'] / (spending.monthlySpending + spending.monthlySavings)) * 100)}%</div>
                </div>`
                    : ''
                }
            `;
    }

    if (retirement && retirement.successRate > 0) {
      const successColor =
        retirement.successRate >= 90
          ? '#10b981'
          : retirement.successRate >= 70
            ? '#f59e0b'
            : '#ef4444';
      retirementContent = `
                <div class="refine-metric">
                    <div class="refine-label">Success Rate</div>
                    <div class="refine-value" style="color: ${successColor}; font-size: 2em;">${retirement.successRate}%</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Median Balance</div>
                    <div class="refine-value">${FinanceUtils.formatCurrencyCompact(retirement.medianEndingBalance)}</div>
                </div>
                <div class="refine-metric">
                    <div class="refine-label">Retirement Age</div>
                    <div class="refine-value">${retirement.retirementAge}</div>
                </div>
            `;
    }

    return `
            <div class="refinement-modal" role="dialog" aria-labelledby="refinement-title" aria-modal="true">
                <div class="refinement-overlay" onclick="RefinementModal.close()"></div>
                <div class="refinement-content">
                    <div class="refinement-header">
                        <h2 id="refinement-title">Your Financial Plan Review</h2>
                        <button class="refinement-close" onclick="RefinementModal.close()" aria-label="Close dialog">×</button>
                    </div>
                    <div class="refinement-body">
                        <div class="refinement-column">
                            <h3>💰 Budget (Planned)</h3>
                            ${budgetContent}
                            <a href="income-allocation.html" class="refine-action-btn">Edit Budget</a>
                        </div>
                        <div class="refinement-column">
                            <h3>📊 Reality (Actual)</h3>
                            ${spendingContent}
                            <a href="transaction-analyzer.html" class="refine-action-btn">View Details</a>
                        </div>
                        <div class="refinement-column">
                            <h3>🎯 Retirement (Projection)</h3>
                            ${retirementContent}
                            <a href="retirement-simulator.html" class="refine-action-btn">Run Simulation</a>
                        </div>
                    </div>
                    ${this.generateInsights(state)}
                </div>
            </div>
        `;
  },

  /**
   * Generate insights based on current state
   */
  generateInsights(state) {
    const insights = [];
    const { budget, spending, retirement } = state;

    if (budget && spending) {
      const actualIncome = spending.monthlySpending + spending.monthlySavings;
      const incomeDiff = actualIncome - budget.monthlyIncome;

      if (Math.abs(incomeDiff) > budget.monthlyIncome * 0.1) {
        insights.push({
          type: 'warning',
          message: `Your actual income (${FinanceUtils.formatCurrency(actualIncome)}) differs from planned (${FinanceUtils.formatCurrency(budget.monthlyIncome)}) by ${FinanceUtils.formatCurrency(Math.abs(incomeDiff))}.`,
          action: 'Update your budget to match reality',
        });
      }

      const breakdown = spending.categoryBreakdown || {};
      const totalSpendingPlusSavings = spending.monthlySpending + spending.monthlySavings;
      const actualFixed = breakdown['fixed-costs'] || 0;
      const actualFixedPct =
        totalSpendingPlusSavings > 0 ? (actualFixed / totalSpendingPlusSavings) * 100 : 0;
      const plannedFixedPct = budget.fixedCosts;

      if (actualFixedPct > plannedFixedPct + 5) {
        insights.push({
          type: 'alert',
          message: `Fixed costs are ${Math.round(actualFixedPct)}% (planned: ${plannedFixedPct}%). You're overspending by ${FinanceUtils.formatCurrency(((actualFixedPct - plannedFixedPct) * totalSpendingPlusSavings) / 100)}/month.`,
          action: 'Look for ways to reduce housing/transportation costs',
        });
      }
    }

    if (retirement && retirement.successRate < 90) {
      const gap = 90 - retirement.successRate;
      insights.push({
        type: retirement.successRate < 70 ? 'alert' : 'warning',
        message: `Retirement success rate is ${retirement.successRate}% (goal: 90%). You're ${gap}% below target.`,
        action: 'Increase savings rate or adjust retirement plans',
      });
    }

    if (!budget || !spending || !retirement) {
      insights.push({
        type: 'info',
        message: 'Complete all three steps to see personalized insights and recommendations.',
        action: 'Set budget → Track spending → Run retirement simulation',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'success',
        message: '🎉 Your plan looks balanced! Keep tracking your progress monthly.',
        action: '',
      });
    }

    const insightsHTML = insights
      .map(
        (insight) => `
            <div class="insight-card insight-${insight.type}">
                <div class="insight-message">${insight.message}</div>
                ${insight.action ? `<div class="insight-action">💡 ${insight.action}</div>` : ''}
            </div>
        `
      )
      .join('');

    return `
            <div class="refinement-insights">
                <h3>💡 Insights & Recommendations</h3>
                ${insightsHTML}
            </div>
        `;
  },

  /**
   * Get CSS styles for modal
   */
  getStyles() {
    return `
            .refinement-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: none;
            }

            .refinement-modal.show {
                display: block;
            }

            .refinement-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                animation: fadeIn 0.3s ease;
            }

            .refinement-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                max-width: 1200px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                animation: slideUp 0.3s ease;
            }

            .refinement-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 30px;
                border-bottom: 1px solid #e2e8f0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .refinement-header h2 {
                margin: 0;
                font-size: 1.5em;
            }

            .refinement-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 2em;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .refinement-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .refinement-body {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                padding: 30px;
                border-bottom: 1px solid #e2e8f0;
            }

            .refinement-column {
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }

            .refinement-column h3 {
                margin: 0 0 20px 0;
                font-size: 1.2em;
                color: #1e293b;
            }

            .refine-metric {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
            }

            .refine-metric:last-of-type {
                border-bottom: none;
            }

            .refine-label {
                font-size: 0.85em;
                color: #64748b;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .refine-value {
                font-size: 1.3em;
                font-weight: 700;
                color: #1e293b;
            }

            .refine-action-btn {
                display: block;
                text-align: center;
                padding: 10px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin-top: 15px;
                transition: background 0.2s;
            }

            .refine-action-btn:hover {
                background: #5568d3;
            }

            .refinement-insights {
                padding: 30px;
            }

            .refinement-insights h3 {
                margin: 0 0 20px 0;
                font-size: 1.2em;
                color: #1e293b;
            }

            .insight-card {
                padding: 16px 20px;
                border-radius: 8px;
                margin-bottom: 12px;
                border-left: 4px solid;
            }

            .insight-card.insight-success {
                background: #d1fae5;
                border-left-color: #10b981;
            }

            .insight-card.insight-info {
                background: #dbeafe;
                border-left-color: #3b82f6;
            }

            .insight-card.insight-warning {
                background: #fef3c7;
                border-left-color: #f59e0b;
            }

            .insight-card.insight-alert {
                background: #fee2e2;
                border-left-color: #ef4444;
            }

            .insight-message {
                font-size: 1em;
                color: #1e293b;
                margin-bottom: 8px;
            }

            .insight-action {
                font-size: 0.9em;
                color: #64748b;
                font-style: italic;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, -40%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }

            @media (max-width: 900px) {
                .refinement-body {
                    grid-template-columns: 1fr;
                }

                .refinement-content {
                    width: 95%;
                    max-height: 95vh;
                }
            }
        `;
  },

  /**
   * Open the modal
   */
  open() {
    // Inject styles if not already present
    if (!document.getElementById('refinement-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'refinement-modal-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    // Remove existing modal if any
    const existing = document.querySelector('.refinement-modal');
    if (existing) existing.remove();

    // Create and inject modal
    document.body.insertAdjacentHTML('beforeend', this.createHTML());
    const modal = document.querySelector('.refinement-modal');

    // Trigger animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Handle ESC key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  },

  /**
   * Close the modal
   */
  close() {
    const modal = document.querySelector('.refinement-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
    document.body.style.overflow = '';
  },
};
