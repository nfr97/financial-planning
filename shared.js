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
            maximumFractionDigits
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
    }
};

const StorageUtils = {
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
     */
    set(key, value) {
        try {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    },

    /**
     * Remove a value from localStorage
     * @param {string} key - The storage key to remove
     */
    remove(key) {
        localStorage.removeItem(key);
    }
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
    }
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
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY
            /^(\d{4})-(\d{2})-(\d{2})$/,        // YYYY-MM-DD
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/     // MM-DD-YYYY
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
    }
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
        lifeEvents: 'lifeEventsData'
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
            ...pageData
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
        DOMUtils.downloadFile(
            JSON.stringify(session, null, 2),
            filename,
            'application/json'
        );
        return session;
    },

    /**
     * Import session data from a JSON object
     * @param {Object} session - The session object to import
     * @returns {Object} Result with success status, warnings, and session metadata
     */
    importSession(session) {
        const result = { success: false, warnings: [], imported: [], exportedAt: null };

        // Capture the session export timestamp
        if (session.exportedAt) {
            result.exportedAt = session.exportedAt;
        }

        // Validate version
        if (!session.version) {
            result.warnings.push('Session file missing version - attempting import anyway');
        }

        // Import budget planner data
        if (session.budgetPlanner) {
            StorageUtils.set(this.STORAGE_KEYS.budgetPlanner, session.budgetPlanner);
            result.imported.push('Budget Planner settings');
        }

        // Import budget retirement data
        if (session.budgetRetirement) {
            StorageUtils.set(this.STORAGE_KEYS.budgetRetirement, session.budgetRetirement);
            result.imported.push('Retirement contribution settings');
        }

        // Import spending tracker data
        if (session.spendingTracker) {
            StorageUtils.set(this.STORAGE_KEYS.spendingTracker, session.spendingTracker);
            result.imported.push('Spending Tracker data');
        }

        // Import transaction rules
        if (session.transactionRules && Object.keys(session.transactionRules).length > 0) {
            StorageUtils.set(this.STORAGE_KEYS.transactionRules, session.transactionRules);
            result.imported.push('Transaction categorization rules');
        }

        // Import transaction data (parsed transactions from CSV uploads)
        if (session.transactionData && Array.isArray(session.transactionData) && session.transactionData.length > 0) {
            StorageUtils.set(this.STORAGE_KEYS.transactionData, session.transactionData);
            result.imported.push(`${session.transactionData.length} transactions`);
        }

        // Import bank format preference
        if (session.bankFormat) {
            StorageUtils.set(this.STORAGE_KEYS.bankFormat, session.bankFormat);
        }

        // Import AI provider preference
        if (session.aiProvider) {
            StorageUtils.set(this.STORAGE_KEYS.aiProvider, session.aiProvider);
            result.imported.push('AI provider preference');
        }

        // Import retirement forecast data
        if (session.retirementForecast) {
            StorageUtils.set(this.STORAGE_KEYS.retirementForecast, session.retirementForecast);
            result.imported.push('Retirement Forecast settings');
        }

        // Import life events
        if (session.lifeEvents && Array.isArray(session.lifeEvents)) {
            StorageUtils.set(this.STORAGE_KEYS.lifeEvents, session.lifeEvents);
            result.imported.push('Life events');
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
                                hour12: true
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
                    ['gemini', 'openai', 'anthropic'].forEach(p => StorageUtils.remove(`apiKey_${p}`));
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

        let itemsDisplay = imported && imported.length > 0
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
    }
};
