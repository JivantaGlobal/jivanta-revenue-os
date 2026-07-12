/**
 * @fileoverview Reusable UI Component Library for Jivanta Global Revenue OS.
 * All components return HTML strings for innerHTML injection and use
 * event delegation via data-* attributes for interactivity.
 * 
 * @module components
 * @version 1.0.0
 */

import { Router, NAV_ITEMS } from './router.js';

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

/** @type {number} Global counter for unique component IDs. */
let _componentId = 0;

/**
 * Generate a unique component ID.
 * @param {string} [prefix='cmp'] - ID prefix.
 * @returns {string} Unique ID string.
 */
function uid(prefix = 'cmp') {
  return `${prefix}-${++_componentId}`;
}

/**
 * Maps emojis to clean, modern stroke-based vector SVG icons.
 * @param {string} iconKey - The emoji icon key.
 * @param {string} [className=''] - Extra classes for styling.
 * @returns {string} SVG HTML string.
 */
export function getIconSvg(iconKey, className = '') {
  const icons = {
    '📊': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
    '👥': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    '🔄': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3"/><path d="M12 3v18"/><path d="m16 7 4 5-4 5"/><path d="m8 17-4-5 4-5"/></svg>`,
    '✅': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    '📞': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    '📦': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    '📥': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    '📄': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    '🌍': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    '📁': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    '📈': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    '🤖': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg>`,
    '⚙️': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    '🚪': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    '🏆': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a7 7 0 0 0-7 7v2.34a7 7 0 0 0 14 0V9a7 7 0 0 0-7-7z"/></svg>`,
    '💰': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    '📅': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    '⚠️': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    '🔥': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    '🥜': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.5 2 6 5.5 6 9c0 1 .5 2 1.5 3-.5.5-1.5 1-1.5 2 0 3.5 2.5 6 6 6s6-2.5 6-6c0-1-1-1.5-1.5-2 1-1 1.5-2 1.5-3 0-3.5-2.5-7-6-7z"/><path d="M10 8c1-.5 3-.5 4 0m-4 7c1-.5 3-.5 4 0"/></svg>`,
    '🌽': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9a3 3 0 0 1 6 0c0 3.5-3 8-3 8s-3-4.5-3-8z"/><path d="M12 3v14m-3-8h6m-5 4h4"/></svg>`,
    '🍂': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22C6 18 10 15 12 9c.5-1.5.5-3 0-4.5C11 3 9 2.5 7.5 3 6 3.5 5 5 4.5 6.5L3 11c.5 1 1.5 1.5 2.5 1m16.5 10c-4-4-8-7-10-13-.5-1.5-.5-3 0-4.5C13 3 15 2.5 16.5 3c1.5.5 2.5 2 3 3.5L21 11c-.5 1-1.5 1.5-2.5 1"/></svg>`,
    '🌿': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22C6 18 10 15 12 9c.5-1.5.5-3 0-4.5C11 3 9 2.5 7.5 3 6 3.5 5 5 4.5 6.5L3 11c.5 1 1.5 1.5 2.5 1m16.5 10c-4-4-8-7-10-13-.5-1.5-.5-3 0-4.5C13 3 15 2.5 16.5 3c1.5.5 2.5 2 3 3.5L21 11c-.5 1-1.5 1.5-2.5 1"/></svg>`,
    '🍁': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22C6 18 10 15 12 9c.5-1.5.5-3 0-4.5C11 3 9 2.5 7.5 3 6 3.5 5 5 4.5 6.5L3 11c.5 1 1.5 1.5 2.5 1m16.5 10c-4-4-8-7-10-13-.5-1.5-.5-3 0-4.5C13 3 15 2.5 16.5 3c1.5.5 2.5 2 3 3.5L21 11c-.5 1-1.5 1.5-2.5 1"/></svg>`,
    '🔍': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    '💡': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A7 7 0 0 0 4 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6m-4 3h2"/></svg>`,
    '🤝': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    '📋': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    '❌': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    '💤': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    '🔔': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    '⚡': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    '💼': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    '🔐': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    '👤': `<svg class="icon ${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  };
  return icons[iconKey] || iconKey;
}

/**
 * Escape HTML entities to prevent XSS.
 * @param {*} str - Value to escape (coerced to string).
 * @returns {string} Escaped HTML string.
 */
export function esc(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format large numbers with locale-aware commas.
 * @param {number|string} value - The number to format.
 * @returns {string} Formatted number string.
 */
function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? '—');
  return num.toLocaleString('en-IN');
}

/**
 * Format currency values (INR).
 * @param {number} value - Amount in the base currency unit.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
  if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
  if (num >= 1e3) return `₹${(num / 1e3).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Relative time formatting (e.g. "2 hours ago").
 * @param {string|number|Date} date - Date value.
 * @returns {string} Relative time string.
 */
function timeAgo(date) {
  const now = Date.now();
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Debounce a function call.
 * @param {function} fn - Function to debounce.
 * @param {number} [ms=300] - Delay in milliseconds.
 * @returns {function} Debounced function.
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─────────────────────────────────────────────────────────────
// 1. Sidebar
// ─────────────────────────────────────────────────────────────

/**
 * Render the full application sidebar with navigation, branding, and user info.
 * @param {string} currentPath - The current active route path.
 * @param {Object} [options={}] - Sidebar options.
 * @param {boolean} [options.collapsed=false] - Whether the sidebar is collapsed.
 * @param {{ name: string, email: string, avatar?: string }} [options.user] - Current user info.
 * @param {Object<string, number>} [options.badges={}] - Badge counts keyed by path.
 * @param {number} [options.notificationCount=0] - Unread notification count.
 * @returns {string} HTML string for the sidebar.
 */
export function renderSidebar(currentPath, options = {}) {
  const {
    collapsed = false,
    user = { name: 'Subham Jain', email: 'subham@jivantaglobal.com' },
    badges = {},
    notificationCount = 0,
  } = options;

  const collapsedClass = collapsed ? 'sidebar-collapsed' : '';

  // Group nav items by section
  const sections = {
    main: { label: 'Main', items: [] },
    catalog: { label: 'Catalog', items: [] },
    tools: { label: 'Tools', items: [] },
    system: { label: 'System', items: [] },
  };

  for (const item of NAV_ITEMS) {
    const section = item.section || 'main';
    if (sections[section]) {
      sections[section].items.push(item);
    }
  }

  /**
   * Render a single nav item.
   * @param {{ path: string, title: string, icon: string, badge?: number }} item
   * @returns {string}
   */
  const renderNavItem = (item) => {
    const isActive = Router.isActive(item.path);
    const badgeCount = badges[item.path] ?? item.badge;
    const badgeHtml = badgeCount > 0
      ? `<span class="sidebar-item-badge">${badgeCount > 99 ? '99+' : badgeCount}</span>`
      : '';

    return `
      <a href="${esc(item.path)}" 
         data-route="${esc(item.path)}" 
         class="sidebar-item ${isActive ? 'active' : ''}"
         aria-current="${isActive ? 'page' : 'false'}"
         title="${esc(item.title)}">
        <span class="sidebar-item-icon">${getIconSvg(item.icon)}</span>
        <span class="sidebar-item-label">${esc(item.title)}</span>
        ${badgeHtml}
      </a>
    `;
  };

  const navSectionsHtml = Object.entries(sections)
    .filter(([, section]) => section.items.length > 0)
    .map(([key, section]) => `
      <div class="sidebar-nav-section" data-section="${esc(key)}">
        <span class="sidebar-nav-label">${esc(section.label)}</span>
        ${section.items.map(renderNavItem).join('')}
      </div>
    `)
    .join('');

  const userInitials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userAvatar = user.avatar
    ? `<img src="${esc(user.avatar)}" alt="${esc(user.name)}" class="avatar avatar-sm" />`
    : `<div class="avatar avatar-sm">${esc(userInitials)}</div>`;

  return `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
      <!-- Brand/Header -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px; height:20px; display:block;">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div class="sidebar-brand">
          <span class="sidebar-brand-name">Jivanta</span>
          <span class="sidebar-brand-tagline">Revenue OS</span>
        </div>
        <button class="sidebar-toggle" data-action="toggle-sidebar" 
                aria-label="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
                title="${collapsed ? 'Expand' : 'Collapse'}">
          <span style="display:flex; align-items:center; justify-content:center; width:12px; height:12px;">
            ${collapsed 
              ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>` 
              : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" /></svg>`}
          </span>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        ${navSectionsHtml}
      </nav>

      <!-- User -->
      <div class="sidebar-footer">
        ${userAvatar}
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${esc(user.name)}</div>
          <div class="sidebar-user-role">${esc(user.email)}</div>
        </div>
        <button class="sidebar-user-menu-btn" data-action="user-menu" aria-label="User menu" style="color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; display:block;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </aside>
  `;
}

// ─────────────────────────────────────────────────────────────
// 2. Header
// ─────────────────────────────────────────────────────────────

/**
 * Render the top header bar with search, notifications, user avatar, and actions.
 * @param {string} title - Page title.
 * @param {Object} [options={}] - Header options.
 * @param {{ label: string, icon?: string, className?: string, action: string }[]} [options.actions=[]] - Action buttons.
 * @param {number} [options.notificationCount=0] - Unread notification count.
 * @param {{ name: string, avatar?: string }} [options.user] - Current user info.
 * @param {string} [options.subtitle] - Optional subtitle / breadcrumb text.
 * @returns {string} HTML string for the header.
 */
export function renderHeader(title, options = {}) {
  const {
    actions = [],
    notificationCount = 0,
    user = { name: 'Subham Jain' },
    subtitle = '',
  } = options;

  const actionsHtml = actions
    .map((a) => `
      <button class="btn ${esc(a.className || 'btn-primary')}" data-action="${esc(a.action)}">
        ${a.icon ? getIconSvg(a.icon, 'icon') : ''}
        <span>${esc(a.label)}</span>
      </button>
    `)
    .join('');

  const notifBadge = notificationCount > 0
    ? `<span class="notification-bell-count">${notificationCount > 99 ? '99+' : notificationCount}</span>`
    : '';

  const userInitials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userAvatarHtml = user.avatar
    ? `<img src="${esc(user.avatar)}" alt="${esc(user.name)}" />`
    : `<span>${esc(userInitials)}</span>`;

  return `
    <header class="page-header" role="banner">
      <div class="page-header-left">
        <button class="mobile-menu-toggle" data-action="toggle-sidebar" aria-label="Toggle sidebar">
          ☰
        </button>
        <div class="page-header-title-group" style="display:flex; flex-direction:column; gap:2px;">
          <h1 class="page-header-title">${esc(title)}</h1>
          ${subtitle ? `<span class="page-header-subtitle">${esc(subtitle)}</span>` : ''}
        </div>
      </div>

      <div class="page-header-center" style="flex:1; display:flex; justify-content:center; max-width:400px; margin:0 var(--space-4);">
        <div class="search-bar" role="search">
          <span class="search-bar-icon">${getIconSvg('🔍', 'icon')}</span>
          <input type="search" 
                 class="search-bar-input" 
                 placeholder="Search leads, tasks, products…" 
                 data-action="global-search"
                 aria-label="Global search" />
          <kbd class="search-bar-kbd">⌘K</kbd>
        </div>
      </div>

      <div class="page-header-actions">
        ${actionsHtml}

        <button class="notification-bell" data-action="notifications" aria-label="Notifications">
          ${getIconSvg('🔔', 'icon')}
          ${notifBadge}
        </button>

        <div class="avatar avatar-sm cursor-pointer" data-action="user-dropdown" aria-label="User menu" role="button" tabindex="0">
          ${userAvatarHtml}
        </div>
      </div>
    </header>
  `;
}

// ─────────────────────────────────────────────────────────────
// 3. Stat Card
// ─────────────────────────────────────────────────────────────

/**
 * Render a KPI stat card with value, label, subtitle, and optional gradient accent.
 * @param {Object} config - Stat card configuration.
 * @param {string} config.label - KPI label (e.g. "Total Leads").
 * @param {string|number} config.value - KPI value (e.g. "1,248" or 1248).
 * @param {string} [config.subtitle] - Subtitle or trend (e.g. "+12% this month").
 * @param {string} [config.gradient] - CSS gradient or CSS variable name (e.g. 'gradient-1').
 * @param {string} [config.icon] - Emoji icon.
 * @param {'up'|'down'|'neutral'} [config.trend='neutral'] - Trend direction.
 * @param {string} [config.trendValue] - Trend value text.
 * @returns {string} HTML string for the stat card.
 */
export function renderStatCard({ label, value, subtitle, gradient, icon, trend = 'neutral', trendValue }) {
  const gradientStyle = gradient
    ? `style="border-top: 3px solid transparent; border-image: ${gradient.startsWith('linear') ? gradient : `var(--${gradient})`} 1;"`
    : '';

  const trendClass = trend === 'up' ? 'stat-card-change--up' : trend === 'down' ? 'stat-card-change--down' : '';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  const formattedValue = typeof value === 'number' ? formatNumber(value) : (value ?? '—');

  return `
    <div class="stat-card" ${gradientStyle}>
      <div class="stat-card-header">
        ${icon ? `<span class="stat-card-icon">${getIconSvg(icon)}</span>` : ''}
        <span class="stat-card-title">${esc(label)}</span>
      </div>
      <div class="stat-card-value">${esc(formattedValue)}</div>
      <div class="stat-card-footer">
        ${trendValue ? `<span class="stat-card-change ${trendClass}">${trendArrow} ${esc(trendValue)}</span>` : ''}
        ${subtitle ? `<span class="stat-card-subtitle">${esc(subtitle)}</span>` : ''}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 4. Modal
// ─────────────────────────────────────────────────────────────

/**
 * Render a modal dialog with overlay.
 * @param {Object} config - Modal configuration.
 * @param {string} config.title - Modal title.
 * @param {string} config.content - Modal body HTML content.
 * @param {{ label: string, className?: string, action: string }[]} [config.actions=[]] - Footer action buttons.
 * @param {'sm'|'md'|'lg'|'xl'} [config.size='md'] - Modal size.
 * @param {boolean} [config.closable=true] - Whether the modal has a close button.
 * @param {string} [config.id] - Custom modal ID.
 * @returns {string} HTML string for the modal.
 */
export function renderModal({ title, content, actions = [], size = 'md', closable = true, id }) {
  const modalId = id || uid('modal');

  const actionsHtml = actions
    .map((a) => `
      <button class="btn ${esc(a.className || 'btn-secondary')}" data-action="${esc(a.action)}" data-modal-id="${esc(modalId)}">
        ${esc(a.label)}
      </button>
    `)
    .join('');

  return `
    <div class="modal-overlay" id="${esc(modalId)}" data-modal role="dialog" aria-modal="true" aria-labelledby="${esc(modalId)}-title">
      <div class="modal modal-${esc(size)}">
        <div class="modal-header">
          <h2 class="modal-title" id="${esc(modalId)}-title">${esc(title)}</h2>
          ${closable ? `<button class="modal-close" data-action="close-modal" data-modal-id="${esc(modalId)}" aria-label="Close modal">✕</button>` : ''}
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${actions.length > 0 ? `
          <div class="modal-footer">
            ${actionsHtml}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Show a modal by appending it to the DOM.
 * @param {string} modalHtml - The modal HTML string from renderModal.
 */
export function showModal(modalHtml) {
  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  const modalEl = container.firstElementChild;
  document.body.appendChild(modalEl);

  // Animate in
  requestAnimationFrame(() => {
    modalEl.classList.add('modal-overlay--visible');
  });

  // Close on overlay click
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      closeModal(modalEl.id);
    }
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(modalEl.id);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Trap focus inside modal
  modalEl.querySelector('.modal-close')?.focus();
}

/**
 * Close and remove a modal from the DOM.
 * @param {string} modalId - The modal's DOM ID.
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('modal-overlay--visible');
  modal.addEventListener('transitionend', () => modal.remove(), { once: true });
  // Fallback removal if transition doesn't fire
  setTimeout(() => modal.remove(), 400);
}

// ─────────────────────────────────────────────────────────────
// 5. Data Table
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TableColumn
 * @property {string} key - Data key to access from row objects.
 * @property {string} label - Column header label.
 * @property {boolean} [sortable=false] - Whether the column is sortable.
 * @property {'text'|'number'|'date'|'currency'|'badge'|'avatar'|'custom'} [type='text'] - Column data type.
 * @property {function(*, Object): string} [render] - Custom cell renderer.
 * @property {string} [width] - Column width CSS value.
 * @property {'left'|'center'|'right'} [align='left'] - Cell alignment.
 */

/**
 * @typedef {Object} TableOptions
 * @property {boolean} [selectable=false] - Show checkbox selection column.
 * @property {string} [rowAction] - data-action value for row clicks.
 * @property {string} [emptyIcon='📭'] - Empty state icon.
 * @property {string} [emptyTitle='No data'] - Empty state title.
 * @property {string} [emptySubtitle] - Empty state subtitle.
 * @property {string} [sortKey] - Currently sorted column key.
 * @property {'asc'|'desc'} [sortDir='asc'] - Current sort direction.
 * @property {number} [currentPage=1] - Current page number.
 * @property {number} [totalPages=1] - Total number of pages.
 * @property {string} [idKey='id'] - Key used to identify rows.
 */

/**
 * Render a data table with sortable columns, selection, pagination, and empty state.
 * @param {TableColumn[]} columns - Column definitions.
 * @param {Object[]} data - Array of row data objects.
 * @param {TableOptions} [options={}] - Table options.
 * @returns {string} HTML string for the table.
 */
export function renderTable(columns, data, options = {}) {
  const {
    selectable = false,
    rowAction = 'row-click',
    emptyIcon = '📭',
    emptyTitle = 'No data found',
    emptySubtitle = 'Try adjusting your filters or adding new records.',
    sortKey = null,
    sortDir = 'asc',
    currentPage = 1,
    totalPages = 1,
    idKey = 'id',
  } = options;

  if (!Array.isArray(data) || data.length === 0) {
    return renderEmptyState({ icon: emptyIcon, title: emptyTitle, subtitle: emptySubtitle });
  }

  const tableId = uid('table');

  // Build header
  const headerCells = columns.map((col) => {
    const sortable = col.sortable ? 'sortable' : '';
    const sorted = sortKey === col.key ? `sorted-${sortDir}` : '';
    const sortIndicator = sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    const align = col.align ? `text-align: ${col.align};` : '';
    const width = col.width ? `width: ${col.width}; min-width: ${col.width};` : '';

    return `
      <th class="${sortable} ${sorted}" 
          style="${align} ${width}"
          ${col.sortable ? `data-action="sort" data-sort-key="${esc(col.key)}" data-table-id="${esc(tableId)}"` : ''}>
        ${esc(col.label)}${sortIndicator}
      </th>
    `;
  }).join('');

  const checkboxHeader = selectable
    ? `<th>
         <input type="checkbox" class="table-checkbox-all" data-action="select-all" data-table-id="${esc(tableId)}" aria-label="Select all rows" />
       </th>`
    : '';

  // Build rows
  const rows = data.map((row, rowIndex) => {
    const rowId = row[idKey] ?? rowIndex;

    const cells = columns.map((col) => {
      const value = row[col.key];
      const align = col.align ? `text-align: ${col.align};` : '';
      let cellContent;

      if (typeof col.render === 'function') {
        cellContent = col.render(value, row);
      } else {
        switch (col.type) {
          case 'number':
            cellContent = formatNumber(value);
            break;
          case 'currency':
            cellContent = formatCurrency(value);
            break;
          case 'date':
            cellContent = value ? timeAgo(value) : '—';
            break;
          case 'badge':
            cellContent = value ? renderBadge(value) : '—';
            break;
          case 'avatar':
            cellContent = `<div class="avatar avatar-sm">${esc(String(value ?? '?').charAt(0).toUpperCase())}</div>`;
            break;
          default:
            cellContent = esc(value ?? '—');
        }
      }

      return `<td style="${align}">${cellContent}</td>`;
    }).join('');

    const checkboxCell = selectable
      ? `<td>
           <input type="checkbox" class="table-checkbox-row" data-row-id="${esc(String(rowId))}" data-table-id="${esc(tableId)}" aria-label="Select row" />
         </td>`
      : '';

    const rowClass = rowAction ? 'clickable-row' : '';

    return `
      <tr class="${rowClass}" 
          data-action="${esc(rowAction)}" 
          data-row-id="${esc(String(rowId))}" 
          data-table-id="${esc(tableId)}"
          tabindex="0"
          role="row">
        ${checkboxCell}
        ${cells}
      </tr>
    `;
  }).join('');

  // Pagination
  const paginationHtml = totalPages > 1
    ? renderPagination(currentPage, totalPages, `table-page-${tableId}`)
    : '';

  return `
    <div class="table-container" id="${esc(tableId)}">
      <div class="table-wrapper">
        <table class="table" role="grid">
          <thead>
            <tr>${checkboxHeader}${headerCells}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 6. Form Builder
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FormField
 * @property {string} name - Field name (used as form key).
 * @property {string} label - Display label.
 * @property {'text'|'email'|'phone'|'tel'|'select'|'textarea'|'tags'|'date'|'number'|'url'|'password'|'hidden'} type - Field type.
 * @property {boolean} [required=false] - Whether the field is required.
 * @property {string} [placeholder] - Placeholder text.
 * @property {{ value: string, label: string }[]} [options] - Options for select fields.
 * @property {number} [rows=3] - Rows for textarea.
 * @property {string} [pattern] - Regex validation pattern.
 * @property {string} [helpText] - Help text shown below the field.
 * @property {number} [min] - Min value for number fields.
 * @property {number} [max] - Max value for number fields.
 * @property {string} [colSpan] - CSS grid column span ('full', 'half').
 */

/**
 * Render a dynamic form from field definitions.
 * @param {Object} config - Form configuration.
 * @param {FormField[]} config.fields - Array of field definitions.
 * @param {Object<string, *>} [config.values={}] - Initial form values.
 * @param {string} [config.submitLabel='Save'] - Submit button label.
 * @param {string} [config.submitAction='form-submit'] - data-action for submit.
 * @param {string} [config.cancelLabel] - Cancel button label (omit to hide).
 * @param {string} [config.cancelAction='form-cancel'] - data-action for cancel.
 * @param {string} [config.id] - Custom form ID.
 * @param {'horizontal'|'vertical'|'grid'} [config.layout='grid'] - Form layout style.
 * @returns {string} HTML string for the form.
 */
export function renderForm({ fields, values = {}, submitLabel = 'Save', submitAction = 'form-submit', cancelLabel, cancelAction = 'form-cancel', id, layout = 'grid' }) {
  const formId = id || uid('form');

  const fieldsHtml = (fields || []).map((field) => {
    const value = values[field.name] ?? '';
    const required = field.required ? 'required' : '';
    const colClass = field.colSpan === 'full' ? 'form-field-full' : field.colSpan === 'half' ? 'form-field-half' : '';
    const helpHtml = field.helpText ? `<span class="form-hint">${esc(field.helpText)}</span>` : '';

    let inputHtml = '';

    switch (field.type) {
      case 'select':
        inputHtml = `
          <select name="${esc(field.name)}" id="${esc(formId)}-${esc(field.name)}" 
                  class="form-select" ${required} data-form-id="${esc(formId)}">
            <option value="" disabled ${!value ? 'selected' : ''}>
              ${esc(field.placeholder || `Select ${field.label}`)}
            </option>
            ${(field.options || []).map((opt) => `
              <option value="${esc(opt.value)}" ${value === opt.value ? 'selected' : ''}>
                ${esc(opt.label)}
              </option>
            `).join('')}
          </select>
        `;
        break;

      case 'textarea':
        inputHtml = `
          <textarea name="${esc(field.name)}" id="${esc(formId)}-${esc(field.name)}" 
                    class="form-textarea" rows="${field.rows || 3}" 
                    placeholder="${esc(field.placeholder || '')}" 
                    ${required} data-form-id="${esc(formId)}">${esc(value)}</textarea>
        `;
        break;

      case 'tags': {
        const tags = Array.isArray(value) ? value : (value ? String(value).split(',').map((t) => t.trim()).filter(Boolean) : []);
        const tagsHtml = tags.map((tag) => `
          <span class="tag tag-removable">
            ${esc(tag)}
            <button type="button" data-action="remove-tag" data-tag="${esc(tag)}" data-field="${esc(field.name)}" data-form-id="${esc(formId)}">✕</button>
          </span>
        `).join('');

        inputHtml = `
          <div class="form-tags-container" data-field="${esc(field.name)}" data-form-id="${esc(formId)}">
            <div class="form-tags-list">${tagsHtml}</div>
            <input type="text" class="form-input form-tags-input" 
                   placeholder="${esc(field.placeholder || 'Add tag and press Enter')}"
                   data-action="add-tag" data-field="${esc(field.name)}" data-form-id="${esc(formId)}" />
            <input type="hidden" name="${esc(field.name)}" value="${esc(tags.join(','))}" />
          </div>
        `;
        break;
      }

      case 'hidden':
        return `<input type="hidden" name="${esc(field.name)}" value="${esc(value)}" data-form-id="${esc(formId)}" />`;

      default: {
        const inputType = field.type === 'phone' ? 'tel' : field.type;
        const patternAttr = field.pattern ? `pattern="${esc(field.pattern)}"` : '';
        const minAttr = field.min != null ? `min="${field.min}"` : '';
        const maxAttr = field.max != null ? `max="${field.max}"` : '';

        inputHtml = `
          <input type="${esc(inputType)}" name="${esc(field.name)}" id="${esc(formId)}-${esc(field.name)}" 
                 class="form-input" value="${esc(value)}" 
                 placeholder="${esc(field.placeholder || '')}" 
                 ${required} ${patternAttr} ${minAttr} ${maxAttr}
                 data-form-id="${esc(formId)}" />
        `;
      }
    }

    const labelClass = field.required ? 'form-label form-label-required' : 'form-label';

    return `
      <div class="form-group ${colClass}">
        <label class="${labelClass}" for="${esc(formId)}-${esc(field.name)}">
          ${esc(field.label)}
        </label>
        ${inputHtml}
        ${helpHtml}
        <span class="form-error" data-error-for="${esc(field.name)}"></span>
      </div>
    `;
  }).join('');

  return `
    <form class="form form-${esc(layout)}" id="${esc(formId)}" data-form novalidate>
      <div class="form-grid">
        ${fieldsHtml}
      </div>
      <div class="form-actions">
        ${cancelLabel ? `<button type="button" class="btn btn-ghost" data-action="${esc(cancelAction)}" data-form-id="${esc(formId)}">${esc(cancelLabel)}</button>` : ''}
        <button type="submit" class="btn btn-primary" data-action="${esc(submitAction)}" data-form-id="${esc(formId)}">
          ${esc(submitLabel)}
        </button>
      </div>
    </form>
  `;
}

/**
 * Extract form values as an object from a rendered form.
 * @param {string} formId - The form element ID.
 * @returns {Object<string, string>} Key-value map of form field values.
 */
export function getFormValues(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const formData = new FormData(form);
  const values = {};
  for (const [key, val] of formData.entries()) {
    values[key] = val;
  }
  return values;
}

/**
 * Display validation errors on a rendered form.
 * @param {string} formId - The form element ID.
 * @param {Object<string, string>} errors - Map of field name → error message.
 */
export function setFormErrors(formId, errors) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Clear previous errors
  form.querySelectorAll('.form__error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('form__error--visible');
  });
  form.querySelectorAll('.form__input, .form__select, .form__textarea').forEach((el) => {
    el.classList.remove('form__input--error');
  });

  // Set new errors
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('form__error--visible');
    }
    const inputEl = form.querySelector(`[name="${field}"]`);
    if (inputEl) {
      inputEl.classList.add('form__input--error');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 7. Toast Notifications
// ─────────────────────────────────────────────────────────────

/**
 * Show a toast notification that auto-dismisses.
 * @param {string} message - Toast message text.
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Toast type.
 * @param {number} [duration=3000] - Auto-dismiss duration in ms.
 */
export function renderToast(message, type = 'info', duration = 3000) {
  // Ensure toast container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toastId = uid('toast');

  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${esc(message)}</span>
    <button class="toast__close" data-action="close-toast" data-toast-id="${esc(toastId)}" aria-label="Dismiss">✕</button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  // Auto-dismiss
  const dismissTimer = setTimeout(() => dismissToast(toastId), duration);

  // Manual dismiss
  toast.querySelector('.toast__close')?.addEventListener('click', () => {
    clearTimeout(dismissTimer);
    dismissToast(toastId);
  });
}

/**
 * Dismiss and remove a toast notification.
 * @param {string} toastId - The toast element ID.
 */
function dismissToast(toastId) {
  const toast = document.getElementById(toastId);
  if (!toast) return;
  toast.classList.remove('toast--visible');
  toast.classList.add('toast--leaving');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 400);
}

// ─────────────────────────────────────────────────────────────
// 8. Empty State
// ─────────────────────────────────────────────────────────────

/**
 * Render an empty state placeholder.
 * @param {Object} config - Empty state configuration.
 * @param {string} [config.icon='📭'] - Large emoji icon.
 * @param {string} [config.title='No data'] - Title text.
 * @param {string} [config.subtitle] - Subtitle text.
 * @param {string} [config.actionLabel] - CTA button label.
 * @param {string} [config.actionHandler] - data-action value for the CTA button.
 * @returns {string} HTML string for the empty state.
 */
export function renderEmptyState({ icon = '📭', title = 'No data', subtitle, actionLabel, actionHandler } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${/[\uD800-\uDFFF\u2600-\u27BF]/.test(icon) ? getIconSvg(icon) : icon}</div>
      <h3 class="empty-state-title">${esc(title)}</h3>
      ${subtitle ? `<p class="empty-state-desc">${esc(subtitle)}</p>` : ''}
      ${actionLabel ? `
        <button class="btn btn-primary" data-action="${esc(actionHandler || 'empty-action')}">
          ${esc(actionLabel)}
        </button>
      ` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 9. Badge
// ─────────────────────────────────────────────────────────────

/**
 * Render a status badge.
 * @param {string} text - Badge text.
 * @param {string} [type='default'] - Badge variant: 'success', 'warning', 'danger', 'info', 'new', 'hot', 'cold', 'warm', 'qualified', 'default'.
 * @returns {string} HTML string for the badge.
 */
export function renderBadge(text, type) {
  if (!text) return '';

  // Auto-detect type from common status strings if not provided
  const autoType = type || inferBadgeType(String(text));

  return `<span class="badge badge--${esc(autoType)}">${esc(text)}</span>`;
}

/**
 * Infer a badge type from the text content.
 * @param {string} text - Badge text.
 * @returns {string} Inferred badge type.
 */
function inferBadgeType(text) {
  const lower = text.toLowerCase();
  if (['won', 'closed', 'converted', 'active', 'completed', 'paid', 'approved'].includes(lower)) return 'success';
  if (['hot', 'urgent', 'overdue', 'lost', 'rejected', 'failed', 'cancelled'].includes(lower)) return 'danger';
  if (['warm', 'pending', 'in progress', 'follow-up', 'review', 'draft'].includes(lower)) return 'warning';
  if (['new', 'fresh', 'open'].includes(lower)) return 'info';
  if (['cold', 'stale', 'inactive', 'archived'].includes(lower)) return 'default';
  if (['qualified', 'contacted', 'negotiation', 'proposal'].includes(lower)) return 'info';
  return 'default';
}

// ─────────────────────────────────────────────────────────────
// 10. Tabs
// ─────────────────────────────────────────────────────────────

/**
 * Render tab navigation.
 * @param {Object} config - Tab configuration.
 * @param {{ id: string, label: string, icon?: string, count?: number }[]} config.tabs - Tab definitions.
 * @param {string} config.activeTab - Currently active tab ID.
 * @param {string} [config.action='tab-change'] - data-action for tab clicks.
 * @param {string} [config.id] - Custom tabs container ID.
 * @returns {string} HTML string for the tabs.
 */
export function renderTabs({ tabs, activeTab, action = 'tab-change', id }) {
  const tabsId = id || uid('tabs');

  if (!Array.isArray(tabs) || tabs.length === 0) return '';

  const tabsHtml = tabs.map((tab) => {
    const isActive = tab.id === activeTab;
    const countHtml = tab.count != null ? `<span class="tabs__count">${tab.count}</span>` : '';

    return `
      <button class="tabs__tab ${isActive ? 'tabs__tab--active' : ''}" 
              data-action="${esc(action)}" 
              data-tab-id="${esc(tab.id)}" 
              data-tabs-id="${esc(tabsId)}"
              role="tab"
              aria-selected="${isActive}"
              aria-controls="tabpanel-${esc(tab.id)}">
        ${tab.icon ? `<span class="tabs__icon">${tab.icon}</span>` : ''}
        <span class="tabs__label">${esc(tab.label)}</span>
        ${countHtml}
      </button>
    `;
  }).join('');

  return `
    <div class="tabs" id="${esc(tabsId)}" role="tablist">
      ${tabsHtml}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 11. Dropdown
// ─────────────────────────────────────────────────────────────

/**
 * Render a dropdown menu.
 * @param {Object} config - Dropdown configuration.
 * @param {string} config.trigger - HTML content for the trigger button.
 * @param {{ label: string, icon?: string, action: string, danger?: boolean, divider?: boolean }[]} config.items - Menu items.
 * @param {'left'|'right'} [config.align='left'] - Dropdown alignment relative to trigger.
 * @param {string} [config.id] - Custom dropdown ID.
 * @returns {string} HTML string for the dropdown.
 */
export function renderDropdown({ trigger, items, align = 'left', id }) {
  const dropdownId = id || uid('dropdown');

  if (!Array.isArray(items) || items.length === 0) return '';

  const itemsHtml = items.map((item) => {
    if (item.divider) {
      return '<div class="dropdown__divider"></div>';
    }
    const dangerClass = item.danger ? 'dropdown__item--danger' : '';
    return `
      <button class="dropdown__item ${dangerClass}" data-action="${esc(item.action)}" data-dropdown-id="${esc(dropdownId)}" role="menuitem">
        ${item.icon ? `<span class="dropdown__icon">${item.icon}</span>` : ''}
        <span class="dropdown__label">${esc(item.label)}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="dropdown" id="${esc(dropdownId)}">
      <button class="dropdown__trigger" data-action="toggle-dropdown" data-dropdown-id="${esc(dropdownId)}" aria-haspopup="true" aria-expanded="false">
        ${trigger}
      </button>
      <div class="dropdown__menu dropdown__menu--${esc(align)}" role="menu" aria-hidden="true">
        ${itemsHtml}
      </div>
    </div>
  `;
}

/**
 * Toggle a dropdown's visibility.
 * @param {string} dropdownId - The dropdown element ID.
 */
export function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const menu = dropdown.querySelector('.dropdown__menu');
  const trigger = dropdown.querySelector('.dropdown__trigger');
  const isOpen = dropdown.classList.toggle('dropdown--open');

  menu?.setAttribute('aria-hidden', String(!isOpen));
  trigger?.setAttribute('aria-expanded', String(isOpen));

  if (isOpen) {
    // Close on outside click
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('dropdown--open');
        menu?.setAttribute('aria-hidden', 'true');
        trigger?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeHandler);
      }
    };
    // Use setTimeout so the current click event doesn't immediately close it
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }
}

// ─────────────────────────────────────────────────────────────
// 12. Activity Timeline
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TimelineItem
 * @property {string} id - Unique event ID.
 * @property {string} icon - Emoji icon.
 * @property {string} title - Event title.
 * @property {string} [description] - Event description.
 * @property {string|Date} timestamp - When the event occurred.
 * @property {'call'|'email'|'note'|'meeting'|'deal'|'status'|'task'|'system'} [type='system'] - Event type.
 * @property {string} [user] - User who triggered the event.
 */

/**
 * Render an activity timeline.
 * @param {TimelineItem[]} items - Array of timeline events (newest first).
 * @returns {string} HTML string for the timeline.
 */
export function renderTimeline(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return renderEmptyState({
      icon: '📜',
      title: 'No activity yet',
      subtitle: 'Activity will appear here as you interact with leads and tasks.',
    });
  }

  const itemsHtml = items.map((item) => {
    const typeClass = item.type ? `timeline__item--${item.type}` : '';
    return `
      <div class="timeline__item ${typeClass}" data-event-id="${esc(item.id || '')}">
        <div class="timeline__marker">
          <span class="timeline__icon">${item.icon || '●'}</span>
        </div>
        <div class="timeline__content">
          <div class="timeline__header">
            <span class="timeline__title">${esc(item.title)}</span>
            <span class="timeline__time">${timeAgo(item.timestamp)}</span>
          </div>
          ${item.description ? `<p class="timeline__description">${esc(item.description)}</p>` : ''}
          ${item.user ? `<span class="timeline__user">by ${esc(item.user)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="timeline" role="feed" aria-label="Activity timeline">
      ${itemsHtml}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 13. Kanban Card
// ─────────────────────────────────────────────────────────────

/**
 * Render a pipeline/kanban card for a lead.
 * @param {Object} lead - Lead data object.
 * @param {string} lead.id - Lead ID.
 * @param {string} lead.name - Lead/contact name.
 * @param {string} [lead.company] - Company name.
 * @param {string} [lead.email] - Email address.
 * @param {number} [lead.value] - Deal value.
 * @param {string} [lead.status] - Lead status.
 * @param {string} [lead.temperature] - Lead temperature (hot/warm/cold).
 * @param {string} [lead.assignee] - Assigned team member.
 * @param {string|Date} [lead.lastActivity] - Last activity timestamp.
 * @param {string[]} [lead.tags] - Tags array.
 * @returns {string} HTML string for the kanban card.
 */
export function renderKanbanCard(lead) {
  if (!lead) return '';

  const tagsHtml = Array.isArray(lead.tags) && lead.tags.length > 0
    ? `<div class="kanban-card__tags">
        ${lead.tags.slice(0, 3).map((tag) => `<span class="kanban-card__tag">${esc(tag)}</span>`).join('')}
        ${lead.tags.length > 3 ? `<span class="kanban-card__tag kanban-card__tag--more">+${lead.tags.length - 3}</span>` : ''}
       </div>`
    : '';

  const tempClass = lead.temperature ? `kanban-card--${lead.temperature}` : '';

  const valueHtml = lead.value
    ? `<span class="kanban-card__value">${formatCurrency(lead.value)}</span>`
    : '';

  const assigneeInitial = lead.assignee
    ? lead.assignee.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return `
    <div class="kanban-card ${tempClass}" 
         data-action="open-lead" 
         data-lead-id="${esc(lead.id || '')}"
         draggable="true"
         data-draggable="kanban-card"
         role="listitem"
         tabindex="0">
      <div class="kanban-card__header">
        <span class="kanban-card__name">${esc(lead.name || 'Unnamed Lead')}</span>
        ${lead.temperature ? renderBadge(lead.temperature) : ''}
      </div>
      ${lead.company ? `<span class="kanban-card__company">${esc(lead.company)}</span>` : ''}
      ${tagsHtml}
      <div class="kanban-card__footer">
        ${valueHtml}
        <div class="kanban-card__meta">
          ${lead.lastActivity ? `<span class="kanban-card__time">${timeAgo(lead.lastActivity)}</span>` : ''}
          ${assigneeInitial ? `<span class="kanban-card__assignee" title="${esc(lead.assignee)}">${esc(assigneeInitial)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 14. Search Bar
// ─────────────────────────────────────────────────────────────

/**
 * Render a search input with built-in debounce support.
 * @param {Object} [config={}] - Search bar configuration.
 * @param {string} [config.placeholder='Search…'] - Placeholder text.
 * @param {string} [config.action='search'] - data-action value for the input.
 * @param {string} [config.value=''] - Initial search value.
 * @param {string} [config.id] - Custom search bar ID.
 * @param {boolean} [config.showClear=true] - Whether to show a clear button.
 * @returns {string} HTML string for the search bar.
 */
export function renderSearchBar({ placeholder = 'Search…', action = 'search', value = '', id, showClear = true } = {}) {
  const searchId = id || uid('search');

  return `
    <div class="search-bar" id="${esc(searchId)}">
      <span class="search-bar__icon">🔍</span>
      <input type="search" 
             class="search-bar__input" 
             placeholder="${esc(placeholder)}" 
             value="${esc(value)}"
             data-action="${esc(action)}" 
             data-search-id="${esc(searchId)}"
             aria-label="${esc(placeholder)}" />
      ${showClear ? `
        <button class="search-bar__clear ${value ? '' : 'search-bar__clear--hidden'}" 
                data-action="clear-search" 
                data-search-id="${esc(searchId)}" 
                aria-label="Clear search">
          ✕
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Attach a debounced search handler to a rendered search bar.
 * @param {string} searchId - The search bar element ID.
 * @param {function(string): void} onSearch - Callback receiving the search query.
 * @param {number} [delay=300] - Debounce delay in ms.
 */
export function attachSearchHandler(searchId, onSearch, delay = 300) {
  const container = document.getElementById(searchId);
  if (!container) return;

  const input = container.querySelector('.search-bar__input');
  const clearBtn = container.querySelector('.search-bar__clear');

  if (!input) return;

  const debouncedSearch = debounce((query) => {
    onSearch(query);
    if (clearBtn) {
      clearBtn.classList.toggle('search-bar__clear--hidden', !query);
    }
  }, delay);

  input.addEventListener('input', (e) => {
    debouncedSearch(e.target.value.trim());
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    input.focus();
    onSearch('');
    clearBtn.classList.add('search-bar__clear--hidden');
  });
}

// ─────────────────────────────────────────────────────────────
// 15. Pagination
// ─────────────────────────────────────────────────────────────

/**
 * Render pagination controls.
 * @param {number} currentPage - Current active page (1-indexed).
 * @param {number} totalPages - Total number of pages.
 * @param {string} [action='page-change'] - data-action for page buttons.
 * @returns {string} HTML string for pagination controls.
 */
export function renderPagination(currentPage, totalPages, action = 'page-change') {
  if (totalPages <= 1) return '';

  const pages = [];
  const maxVisible = 7;

  // Always show first page
  pages.push(1);

  if (totalPages <= maxVisible) {
    for (let i = 2; i <= totalPages; i++) pages.push(i);
  } else {
    // Ellipsis logic
    const leftBound = Math.max(2, currentPage - 1);
    const rightBound = Math.min(totalPages - 1, currentPage + 1);

    if (leftBound > 2) pages.push('...');
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  const pagesHtml = pages.map((page) => {
    if (page === '...') {
      return `<span class="pagination__ellipsis">…</span>`;
    }
    const isActive = page === currentPage;
    return `
      <button class="pagination__page ${isActive ? 'pagination__page--active' : ''}" 
              data-action="${esc(action)}" 
              data-page="${page}"
              ${isActive ? 'aria-current="page"' : ''}
              ${isActive ? 'disabled' : ''}>
        ${page}
      </button>
    `;
  }).join('');

  return `
    <nav class="table-pagination" role="navigation" aria-label="Pagination">
      <button class="pagination__btn pagination__btn--prev" 
              data-action="${esc(action)}" 
              data-page="${Math.max(1, currentPage - 1)}"
              ${currentPage === 1 ? 'disabled' : ''}
              aria-label="Previous page">
        ← Prev
      </button>
      <div class="pagination__pages">
        ${pagesHtml}
      </div>
      <button class="pagination__btn pagination__btn--next" 
              data-action="${esc(action)}" 
              data-page="${Math.min(totalPages, currentPage + 1)}"
              ${currentPage === totalPages ? 'disabled' : ''}
              aria-label="Next page">
        Next →
      </button>
    </nav>
  `;
}

// ─────────────────────────────────────────────────────────────
// 16. Confirm Dialog
// ─────────────────────────────────────────────────────────────

/**
 * Show a confirmation dialog with confirm/cancel actions.
 * @param {Object} config - Confirm dialog configuration.
 * @param {string} config.message - Confirmation message.
 * @param {string} [config.title='Confirm'] - Dialog title.
 * @param {string} [config.confirmLabel='Confirm'] - Confirm button label.
 * @param {string} [config.cancelLabel='Cancel'] - Cancel button label.
 * @param {'danger'|'warning'|'info'} [config.type='warning'] - Dialog type for styling.
 * @param {function(): void} [config.onConfirm] - Callback when confirmed.
 * @param {function(): void} [config.onCancel] - Callback when cancelled.
 * @returns {string} Modal HTML string (also shows it automatically).
 */
export function renderConfirmDialog({ message, title = 'Confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel', type = 'warning', onConfirm, onCancel }) {
  const icons = { danger: '🗑️', warning: '⚠️', info: 'ℹ️' };
  const confirmId = uid('confirm');

  const content = `
    <div class="confirm-dialog">
      <div class="confirm-dialog__icon">${icons[type] || icons.warning}</div>
      <p class="confirm-dialog__message">${esc(message)}</p>
    </div>
  `;

  const confirmBtnClass = type === 'danger' ? 'btn--danger' : 'btn--primary';

  const modalHtml = renderModal({
    title,
    content,
    size: 'sm',
    id: confirmId,
    actions: [
      { label: cancelLabel, className: 'btn--ghost', action: 'confirm-cancel' },
      { label: confirmLabel, className: confirmBtnClass, action: 'confirm-ok' },
    ],
  });

  // Show and wire up callbacks
  showModal(modalHtml);

  const modalEl = document.getElementById(confirmId);
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'confirm-ok') {
        closeModal(confirmId);
        onConfirm?.();
      } else if (action === 'confirm-cancel' || action === 'close-modal') {
        closeModal(confirmId);
        onCancel?.();
      }
    });
  }

  return modalHtml;
}

// ─────────────────────────────────────────────────────────────
// Global Event Delegation Setup
// ─────────────────────────────────────────────────────────────

/**
 * Initialize global event delegation for all component interactions.
 * Call this once in your app entry point.
 * 
 * Components use `data-action` attributes on interactive elements.
 * This handler dispatches CustomEvents that page modules can listen for.
 */
export function initComponentEvents() {
  // Click delegation
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    // Built-in actions
    switch (action) {
      case 'toggle-sidebar': {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('sidebar--collapsed');
        break;
      }

      case 'close-modal': {
        const modalId = actionEl.dataset.modalId;
        if (modalId) closeModal(modalId);
        break;
      }

      case 'close-toast': {
        const toastId = actionEl.dataset.toastId;
        if (toastId) dismissToast(toastId);
        break;
      }

      case 'toggle-dropdown': {
        const dropdownId = actionEl.dataset.dropdownId;
        if (dropdownId) toggleDropdown(dropdownId);
        break;
      }

      default:
        break;
    }

    // Dispatch a custom event for any action — page modules listen for these
    window.dispatchEvent(new CustomEvent('component:action', {
      detail: {
        action,
        element: actionEl,
        dataset: { ...actionEl.dataset },
        originalEvent: e,
      },
    }));
  });

  // Keyboard delegation (Enter/Space on data-action elements)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl || actionEl.tagName === 'BUTTON' || actionEl.tagName === 'A') return;

    e.preventDefault();
    actionEl.click();
  });

  // Global keyboard shortcut: ⌘K / Ctrl+K for search focus
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('.header__search-input');
      searchInput?.focus();
    }
  });
}
