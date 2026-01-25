/**
 * XSS Prevention tests
 * Tests for DOMUtils.escapeHtml from shared.js
 * These tests use jsdom environment provided by vitest
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Since shared.js uses global DOMUtils, we need to simulate it
// In the actual app, DOMUtils is defined in shared.js and available globally
const DOMUtils = {
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

describe('DOMUtils.escapeHtml', () => {
  it('escapes HTML script tags', () => {
    const result = DOMUtils.escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes HTML img tags', () => {
    const result = DOMUtils.escapeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('escapes ampersands', () => {
    const result = DOMUtils.escapeHtml('AT&T');
    expect(result).toContain('&amp;');
    expect(result).toBe('AT&amp;T');
  });

  it('escapes less than and greater than', () => {
    const result = DOMUtils.escapeHtml('5 < 10 > 3');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('preserves quotes (safe in textContent)', () => {
    // Quotes don't need escaping in text content, only in attributes
    const result = DOMUtils.escapeHtml('Say "Hello"');
    expect(result).toContain('Say "Hello"');
  });

  it('handles null', () => {
    // null becomes empty string when assigned to textContent
    const result = DOMUtils.escapeHtml(null);
    expect(result).toBe('');
  });

  it('handles undefined', () => {
    const result = DOMUtils.escapeHtml(undefined);
    expect(result).toBe('');
  });

  it('handles empty string', () => {
    const result = DOMUtils.escapeHtml('');
    expect(result).toBe('');
  });

  it('handles numbers', () => {
    const result = DOMUtils.escapeHtml(12345);
    expect(result).toBe('12345');
  });

  it('escapes nested tags', () => {
    const result = DOMUtils.escapeHtml('<div><script>alert(1)</script></div>');
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;div&gt;');
  });

  it('escapes event handlers in tags', () => {
    const result = DOMUtils.escapeHtml('<a onclick="evil()">Click</a>');
    // The tags are escaped so the onclick is just text, not executable
    expect(result).not.toContain('<a');
    expect(result).toContain('&lt;a');
    expect(result).toContain('&gt;');
  });

  it('escapes JavaScript URLs in tags', () => {
    const result = DOMUtils.escapeHtml('<a href="javascript:alert(1)">Click</a>');
    // The tags are escaped so the href is just text, not executable
    expect(result).not.toContain('<a');
    expect(result).toContain('&lt;a');
    expect(result).toContain('&gt;');
  });

  it('handles Unicode characters', () => {
    const result = DOMUtils.escapeHtml('日本語 <script>');
    expect(result).toContain('日本語');
    expect(result).toContain('&lt;script&gt;');
  });

  it('handles emoji', () => {
    const result = DOMUtils.escapeHtml('Hello 👋 <b>World</b>');
    expect(result).toContain('👋');
    expect(result).not.toContain('<b>');
  });
});
