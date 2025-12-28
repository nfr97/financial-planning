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
