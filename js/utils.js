/**
 * @fileoverview Core utility functions for Jivanta Global Revenue OS.
 * Provides helpers for ID generation, date formatting, string manipulation,
 * search, number formatting, validation, CSV export, and more.
 * @module utils
 */

// ─────────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────────

/**
 * Generates a unique ID with a given prefix.
 * Format: PREFIX_timestamp_randomHex
 * @param {string} prefix - The prefix for the ID (e.g., 'LEAD', 'TASK').
 * @returns {string} A unique identifier string.
 * @example generateId('LEAD') // 'LEAD_1719300000_a7f3'
 */
export function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

// ─────────────────────────────────────────────
// Date Formatting
// ─────────────────────────────────────────────

/**
 * Formats a date as 'Jun 25, 2026'.
 * @param {Date|string|number} date - The date to format.
 * @returns {string} Formatted date string, or '—' if invalid.
 */
export function formatDate(date) {
  const d = _toDate(date);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date as 'Jun 25, 2026 12:30 PM'.
 * @param {Date|string|number} date - The date to format.
 * @returns {string} Formatted date-time string, or '—' if invalid.
 */
export function formatDateTime(date) {
  const d = _toDate(date);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date as a relative time string.
 * @param {Date|string|number} date - The date to compare against now.
 * @returns {string} Relative time string (e.g., '2 hours ago', 'Yesterday', '3 days ago').
 */
export function formatRelativeTime(date) {
  const d = _toDate(date);
  if (!d) return '—';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return diffSec <= 5 ? 'Just now' : `${diffSec} seconds ago`;
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  if (diffHr < 24) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffWeek === 1) return '1 week ago';
  if (diffWeek < 5) return `${diffWeek} weeks ago`;
  if (diffMonth === 1) return '1 month ago';
  if (diffMonth < 12) return `${diffMonth} months ago`;
  if (diffYear === 1) return '1 year ago';
  return `${diffYear} years ago`;
}

/**
 * Checks if a date is in the past (overdue).
 * @param {Date|string|number} date - The date to check.
 * @returns {boolean} True if the date is before now.
 */
export function isOverdue(date) {
  const d = _toDate(date);
  if (!d) return false;
  return d.getTime() < Date.now();
}

/**
 * Checks if a date falls on today.
 * @param {Date|string|number} date - The date to check.
 * @returns {boolean} True if the date is today.
 */
export function isToday(date) {
  const d = _toDate(date);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Adds a number of days to a date.
 * @param {Date|string|number} date - The starting date.
 * @param {number} days - Number of days to add (can be negative).
 * @returns {Date} A new Date instance with the days added.
 */
export function addDays(date, days) {
  const d = _toDate(date);
  if (!d) return new Date();
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Safely converts a value to a Date object.
 * @param {Date|string|number|null|undefined} val - The value to convert.
 * @returns {Date|null} A valid Date or null.
 * @private
 */
function _toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────
// String Utilities
// ─────────────────────────────────────────────

/**
 * Converts a string to a URL-friendly slug.
 * @param {string} str - The string to slugify.
 * @returns {string} The slugified string.
 * @example slugify('Hello World') // 'hello-world'
 */
export function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncates a string to a given length, appending an ellipsis.
 * @param {string} str - The string to truncate.
 * @param {number} len - Maximum length before truncation.
 * @returns {string} The truncated string.
 */
export function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '…';
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extracts initials from a full name.
 * @param {string} name - The full name.
 * @returns {string} The initials (up to 2 characters).
 * @example initials('John Doe') // 'JD'
 */
export function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

/**
 * Performs fuzzy matching of a query against a text string.
 * Returns true if all characters in the query appear in order in the text.
 * @param {string} query - The search query.
 * @param {string} text - The text to search within.
 * @returns {boolean} True if the query fuzzy-matches the text.
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) return !query;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Fast path: substring match
  if (t.includes(q)) return true;

  // Fuzzy: all characters in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Wraps matching portions of text in <mark> tags for highlighting.
 * @param {string} text - The original text.
 * @param {string} query - The search query to highlight.
 * @returns {string} HTML string with matches wrapped in <mark>.
 */
export function highlightMatch(text, query) {
  if (!text) return '';
  if (!query) return _escapeHtml(text);

  const escaped = _escapeHtml(text);
  const escapedQuery = _escapeHtml(query);

  // Case-insensitive replacement
  const regex = new RegExp(`(${_escapeRegex(escapedQuery)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

/**
 * Escapes HTML special characters.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 * @private
 */
function _escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Escapes special regex characters in a string.
 * @param {string} str - The string to escape.
 * @returns {string} The regex-safe string.
 * @private
 */
function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────
// Number Formatting
// ─────────────────────────────────────────────

/**
 * Formats a number with commas (international style).
 * @param {number} n - The number to format.
 * @returns {string} Formatted number string.
 * @example formatNumber(1234567) // '1,234,567'
 */
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-US');
}

/**
 * Formats a number as currency.
 * Uses Indian numbering for INR (₹1,23,456) and international for others.
 * @param {number} n - The number to format.
 * @param {string} [currency='INR'] - Currency code ('INR', 'USD', 'EUR', etc.).
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(n, currency = 'INR') {
  if (n == null || isNaN(n)) return currency === 'INR' ? '₹0' : '$0';

  const num = Number(n);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    // Fallback if currency code is invalid
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency;
    return `${symbol}${num.toLocaleString(locale)}`;
  }
}

/**
 * Formats a decimal as a percentage string.
 * @param {number} n - The number (0-1 range or 0-100 range auto-detected).
 * @param {number} [decimals=0] - Decimal places to show.
 * @returns {string} Formatted percentage string.
 * @example formatPercent(0.75) // '75%'
 */
export function formatPercent(n, decimals = 0) {
  if (n == null || isNaN(n)) return '0%';
  const num = Number(n);
  // Auto-detect: if value is <= 1 and not already in percent range, multiply by 100
  const pct = Math.abs(num) <= 1 ? num * 100 : num;
  return `${pct.toFixed(decimals)}%`;
}

// ─────────────────────────────────────────────
// Phone Formatting
// ─────────────────────────────────────────────

/**
 * Formats a phone number for display.
 * Indian numbers: +91 98765 43210
 * International: +{code} {rest}
 * @param {string} phone - The phone number to format.
 * @returns {string} Formatted phone number.
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = cleanPhone(phone);

  // Indian mobile: 10 digits or 91 + 10 digits
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  // US/Canada: 1 + 10 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  // Generic international: preserve + prefix
  if (digits.length > 7) {
    const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : '';
    const rest = cc ? digits.slice(cc.length) : digits;
    return cc
      ? `+${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`
      : rest;
  }
  return phone;
}

/**
 * Removes all non-digit characters from a phone number.
 * @param {string} phone - The phone number to clean.
 * @returns {string} Digits-only string.
 */
export function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

/**
 * Validates an email address.
 * @param {string} email - The email to validate.
 * @returns {boolean} True if valid.
 */
export function isValidEmail(email) {
  if (!email) return false;
  // RFC 5322 simplified
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Validates a phone number (Indian or international, 7–15 digits).
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} True if valid.
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = cleanPhone(phone);
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates a URL.
 * @param {string} url - The URL to validate.
 * @returns {boolean} True if valid.
 */
export function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────

/**
 * Exports data as a CSV file and triggers a browser download.
 * @param {Array<Object>} data - Array of row objects.
 * @param {Array<{key: string, label: string}>} columns - Column definitions with key and label.
 * @param {string} filename - The download filename (without .csv extension).
 */
export function exportToCSV(data, columns, filename) {
  if (!data || !columns || data.length === 0) return;

  const header = columns.map((col) => _csvEscape(col.label)).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        if (val == null) return '';
        if (val instanceof Date) return _csvEscape(formatDateTime(val));
        if (Array.isArray(val)) return _csvEscape(val.join('; '));
        return _csvEscape(String(val));
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n'); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a value for CSV (wraps in quotes if needed).
 * @param {string} val - The value to escape.
 * @returns {string} CSV-safe string.
 * @private
 */
function _csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─────────────────────────────────────────────
// Debounce
// ─────────────────────────────────────────────

/**
 * Creates a debounced version of a function.
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=300] - Delay in milliseconds.
 * @returns {Function} The debounced function (with .cancel() method).
 */
export function debounce(fn, delay = 300) {
  let timerId = null;

  /** @type {Function & { cancel: () => void }} */
  const debounced = (...args) => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}

// ─────────────────────────────────────────────
// Deep Clone
// ─────────────────────────────────────────────

/**
 * Creates a deep clone of an object.
 * Uses structuredClone when available, falls back to JSON parse/stringify.
 * @param {*} obj - The object to clone.
 * @returns {*} A deep clone of the object.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  // Modern browsers have structuredClone
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fall through to JSON fallback
    }
  }

  // Fallback
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    // Last resort: shallow copy
    return { ...obj };
  }
}

// ─────────────────────────────────────────────
// Color Helpers
// ─────────────────────────────────────────────

/** @type {Record<string, string>} */
const PRODUCT_GRADIENTS = {
  biomass: 'linear-gradient(135deg, #10b981, #06b6d4)',
  peanuts: 'linear-gradient(135deg, #f59e0b, #f97316)',
  maize: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  tobacco: 'linear-gradient(135deg, #f43f5e, #ec4899)',
  rustica: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  black_tobacco: 'linear-gradient(135deg, #78350f, #92400e)',
};

/**
 * Returns a CSS gradient based on the product type.
 * @param {string} product - The product ID (e.g., 'biomass', 'peanuts').
 * @returns {string} CSS gradient string.
 */
export function getProductColor(product) {
  if (!product) return 'linear-gradient(135deg, #3b82f6, #06b6d4)';
  return PRODUCT_GRADIENTS[product.toLowerCase()] || 'linear-gradient(135deg, #3b82f6, #06b6d4)';
}

/**
 * Returns a color for a confidence score level.
 * @param {string} score - 'High', 'Medium', or 'Low'.
 * @returns {string} CSS color string.
 */
export function getConfidenceColor(score) {
  const colors = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
  };
  return colors[(score || '').toLowerCase()] || '#64748b';
}

/**
 * Returns a color for a pipeline status.
 * @param {string} status - The pipeline stage ID.
 * @returns {string} CSS color string.
 */
export function getStatusColor(status) {
  const colors = {
    new_lead: '#64748b',
    research: '#8b5cf6',
    contacted: '#3b82f6',
    interested: '#06b6d4',
    meeting: '#0ea5e9',
    quotation: '#f59e0b',
    negotiation: '#f97316',
    sample: '#14b8a6',
    followup: '#a855f7',
    po: '#22c55e',
    won: '#10b981',
    lost: '#ef4444',
    dormant: '#6b7280',
  };
  return colors[(status || '').toLowerCase()] || '#64748b';
}

/**
 * Returns a color for a priority level.
 * @param {string} priority - 'Critical', 'High', 'Medium', or 'Low'.
 * @returns {string} CSS color string.
 */
export function getPriorityColor(priority) {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#6b7280',
  };
  return colors[(priority || '').toLowerCase()] || '#64748b';
}

// ─────────────────────────────────────────────
// Country Flags
// ─────────────────────────────────────────────

/** @type {Record<string, string>} */
const COUNTRY_FLAGS = {
  india: '🇮🇳',
  uae: '🇦🇪',
  'saudi arabia': '🇸🇦',
  japan: '🇯🇵',
  'south korea': '🇰🇷',
  vietnam: '🇻🇳',
  bangladesh: '🇧🇩',
  nepal: '🇳🇵',
  'sri lanka': '🇱🇰',
  indonesia: '🇮🇩',
  malaysia: '🇲🇾',
  netherlands: '🇳🇱',
  germany: '🇩🇪',
  poland: '🇵🇱',
  italy: '🇮🇹',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
  turkey: '🇹🇷',
  china: '🇨🇳',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  kenya: '🇰🇪',
  'south africa': '🇿🇦',
  sweden: '🇸🇪',
  belgium: '🇧🇪',
  egypt: '🇪🇬',
  singapore: '🇸🇬',
  thailand: '🇹🇭',
  australia: '🇦🇺',
  canada: '🇨🇦',
  france: '🇫🇷',
  spain: '🇪🇸',
  brazil: '🇧🇷',
  mexico: '🇲🇽',
  russia: '🇷🇺',
  philippines: '🇵🇭',
  pakistan: '🇵🇰',
  nigeria: '🇳🇬',
  oman: '🇴🇲',
  qatar: '🇶🇦',
  bahrain: '🇧🇭',
  kuwait: '🇰🇼',
  iran: '🇮🇷',
  iraq: '🇮🇶',
};

/**
 * Returns the emoji flag for a country name.
 * @param {string} country - The country name.
 * @returns {string} Emoji flag character, or 🌍 if not found.
 */
export function getCountryFlag(country) {
  if (!country) return '🌍';
  return COUNTRY_FLAGS[country.toLowerCase()] || '🌍';
}

// ─────────────────────────────────────────────
// Local Storage Helpers
// ─────────────────────────────────────────────

/**
 * Saves a value to localStorage (JSON serialized).
 * @param {string} key - The storage key (will be prefixed with 'jivanta_').
 * @param {*} value - The value to store.
 */
export function saveToStorage(key, value) {
  try {
    const prefixedKey = `jivanta_${key}`;
    localStorage.setItem(prefixedKey, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Storage] Failed to save key "${key}":`, err);
  }
}

/**
 * Loads a value from localStorage (JSON deserialized).
 * @param {string} key - The storage key (will be prefixed with 'jivanta_').
 * @param {*} [defaultValue=null] - The default value if the key doesn't exist.
 * @returns {*} The stored value or the default.
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const prefixedKey = `jivanta_${key}`;
    const raw = localStorage.getItem(prefixedKey);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Failed to load key "${key}":`, err);
    return defaultValue;
  }
}
