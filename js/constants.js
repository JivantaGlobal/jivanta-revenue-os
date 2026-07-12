/**
 * @fileoverview Application-wide constants for Jivanta Global Revenue OS.
 * Single source of truth for products, pipeline stages, lead sources,
 * priorities, countries, HS codes, navigation, and all dropdown options.
 * @module constants
 */

// ─────────────────────────────────────────────
// Application Metadata
// ─────────────────────────────────────────────

/** @type {string} Application display name */
export const APP_NAME = 'Jivanta Global Revenue OS';

/** @type {string} Company legal name */
export const COMPANY_NAME = 'Jivanta Global Pvt Ltd';

/** @type {string} Current application version */
export const VERSION = '1.0.0';

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

/**
 * All products offered by Jivanta Global.
 * @type {Array<{id: string, name: string, icon: string, color: string, gradient: string}>}
 */
export const PRODUCTS = [
  {
    id: 'biomass',
    name: 'Biomass Pellets',
    icon: '🔥',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    id: 'peanuts',
    name: 'Peanuts',
    icon: '🥜',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
  {
    id: 'maize',
    name: 'Maize',
    icon: '🌽',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  },
  {
    id: 'tobacco',
    name: 'Tobacco Leaves',
    icon: '🍂',
    color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)',
  },
  {
    id: 'rustica',
    name: 'Rustica Nicotiana',
    icon: '🌿',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  },
  {
    id: 'black_tobacco',
    name: 'Black Tobacco',
    icon: '🍁',
    color: '#78350f',
    gradient: 'linear-gradient(135deg, #78350f, #92400e)',
  },
];

// ─────────────────────────────────────────────
// Pipeline Stages
// ─────────────────────────────────────────────

/**
 * All pipeline stages in the CRM sales funnel.
 * @type {Array<{id: string, name: string, color: string, icon: string}>}
 */
export const PIPELINE_STAGES = [
  { id: 'new_lead', name: 'New Lead', color: '#64748b', icon: '🆕' },
  { id: 'research', name: 'Research', color: '#8b5cf6', icon: '🔍' },
  { id: 'contacted', name: 'Contacted', color: '#3b82f6', icon: '📞' },
  { id: 'interested', name: 'Interested', color: '#06b6d4', icon: '💡' },
  { id: 'meeting', name: 'Meeting Scheduled', color: '#0ea5e9', icon: '📅' },
  { id: 'quotation', name: 'Quotation Sent', color: '#f59e0b', icon: '📄' },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316', icon: '🤝' },
  { id: 'sample', name: 'Sample Sent', color: '#14b8a6', icon: '📦' },
  { id: 'followup', name: 'Follow-up', color: '#a855f7', icon: '🔄' },
  { id: 'po', name: 'Purchase Order', color: '#22c55e', icon: '📋' },
  { id: 'won', name: 'Won', color: '#10b981', icon: '🏆' },
  { id: 'lost', name: 'Lost', color: '#ef4444', icon: '❌' },
  { id: 'dormant', name: 'Dormant', color: '#6b7280', icon: '💤' },
];

// ─────────────────────────────────────────────
// Lead Sources
// ─────────────────────────────────────────────

/**
 * Available lead acquisition sources.
 * @type {string[]}
 */
export const LEAD_SOURCES = [
  'Manual Entry',
  'CSV Import',
  'Excel Import',
  'Website',
  'LinkedIn',
  'Referral',
  'Trade Show',
  'IndiaMART',
  'TradeIndia',
  'Alibaba',
  'Cold Call',
  'Email Campaign',
  'WhatsApp',
  'Other',
];

// ─────────────────────────────────────────────
// Priorities
// ─────────────────────────────────────────────

/**
 * Lead/task priority levels.
 * @type {Array<{id: string, name: string, color: string, icon: string}>}
 */
export const PRIORITIES = [
  { id: 'critical', name: 'Critical', color: '#ef4444', icon: '🔴' },
  { id: 'high', name: 'High', color: '#f97316', icon: '🟠' },
  { id: 'medium', name: 'Medium', color: '#f59e0b', icon: '🟡' },
  { id: 'low', name: 'Low', color: '#6b7280', icon: '⚪' },
];

// ─────────────────────────────────────────────
// Confidence Scores
// ─────────────────────────────────────────────

/**
 * Deal confidence score levels.
 * @type {string[]}
 */
export const CONFIDENCE_SCORES = ['High', 'Medium', 'Low'];

// ─────────────────────────────────────────────
// Call Configuration
// ─────────────────────────────────────────────

/**
 * Possible outcomes of a sales call.
 * @type {string[]}
 */
export const CALL_OUTCOMES = [
  'Connected',
  'Not Answered',
  'Busy',
  'Wrong Number',
  'Voicemail',
  'Call Back Later',
  'Meeting Scheduled',
  'Interested',
  'Not Interested',
  'DND',
];

/**
 * Call direction types.
 * @type {string[]}
 */
export const CALL_TYPES = ['Outgoing', 'Incoming', 'Missed'];

// ─────────────────────────────────────────────
// Task Statuses
// ─────────────────────────────────────────────

/**
 * Available task lifecycle statuses.
 * @type {string[]}
 */
export const TASK_STATUSES = ['Todo', 'In Progress', 'Done', 'Overdue', 'Cancelled'];

// ─────────────────────────────────────────────
// Activity Types
// ─────────────────────────────────────────────

/**
 * All tracked activity types in the system.
 * @type {string[]}
 */
export const ACTIVITY_TYPES = [
  'call',
  'email',
  'whatsapp',
  'meeting',
  'note',
  'task',
  'stage_change',
  'lead_created',
  'lead_updated',
  'document',
  'quotation',
  'import',
];

// ─────────────────────────────────────────────
// Document Categories
// ─────────────────────────────────────────────

/**
 * Document categorization for the file manager.
 * @type {string[]}
 */
export const DOCUMENT_CATEGORIES = [
  'Contract',
  'Purchase Order',
  'Invoice',
  'Certificate',
  'KYC',
  'GST Document',
  'Export Document',
  'Quotation',
  'Sample Report',
  'Other',
];

// ─────────────────────────────────────────────
// Countries
// ─────────────────────────────────────────────

/**
 * Countries Jivanta Global trades with.
 * @type {string[]}
 */
export const COUNTRIES = [
  'India',
  'UAE',
  'Saudi Arabia',
  'Japan',
  'South Korea',
  'Vietnam',
  'Bangladesh',
  'Nepal',
  'Sri Lanka',
  'Indonesia',
  'Malaysia',
  'Netherlands',
  'Germany',
  'Poland',
  'Italy',
  'UK',
  'Turkey',
  'China',
  'USA',
  'Kenya',
  'South Africa',
  'Sweden',
  'Belgium',
  'Egypt',
  'Other',
];

// ─────────────────────────────────────────────
// Indian States
// ─────────────────────────────────────────────

/**
 * Indian states for domestic leads.
 * @type {string[]}
 */
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Other',
];

// ─────────────────────────────────────────────
// Quotation Statuses
// ─────────────────────────────────────────────

/**
 * Quotation lifecycle statuses.
 * @type {string[]}
 */
export const QUOTATION_STATUSES = [
  'Draft',
  'Sent',
  'Viewed',
  'Accepted',
  'Rejected',
  'Expired',
  'Revised',
];

// ─────────────────────────────────────────────
// Export Ports
// ─────────────────────────────────────────────

/**
 * Major Indian export ports.
 * @type {string[]}
 */
export const EXPORT_PORTS = [
  'JNPT/Nhava Sheva',
  'Mundra',
  'Kandla',
  'Chennai',
  'Kolkata/Haldia',
  'Visakhapatnam',
  'Krishnapatnam',
  'Pipavav',
  'Paradip',
  'Tuticorin',
  'Cochin',
  'Mangalore',
  'Other',
];

// ─────────────────────────────────────────────
// HS Codes
// ─────────────────────────────────────────────

/**
 * Harmonized System (HS) codes for Jivanta's export products.
 * @type {Array<{code: string, description: string, product: string}>}
 */
export const HS_CODES = [
  { code: '4401.31', description: 'Wood pellets', product: 'biomass' },
  { code: '4401.32', description: 'Wood briquettes', product: 'biomass' },
  { code: '1202.42', description: 'Shelled groundnuts', product: 'peanuts' },
  { code: '1005.90', description: 'Maize (corn)', product: 'maize' },
  { code: '2401.10', description: 'Tobacco not stemmed', product: 'tobacco' },
  { code: '2401.20', description: 'Tobacco partly/wholly stemmed', product: 'tobacco' },
  { code: '2401.30', description: 'Tobacco refuse', product: 'tobacco' },
];

// ─────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────

/**
 * Sidebar navigation items.
 * @type {Array<{path: string, label: string, icon: string, permission: string|null}>}
 */
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', title: 'Dashboard', icon: '📊', permission: null, section: 'main' },
  { path: '/leads', label: 'Leads', title: 'Leads', icon: '👥', permission: null, section: 'main', badge: 0 },
  { path: '/pipeline', label: 'Pipeline', title: 'Pipeline', icon: '🔄', permission: 'pipeline:view', section: 'main' },
  { path: '/tasks', label: 'Tasks', title: 'Tasks', icon: '✅', permission: 'task:create', section: 'main', badge: 0 },
  { path: '/calls', label: 'Calls', title: 'Calls', icon: '📞', permission: 'lead:view_own', section: 'main' },
  { path: '/products', label: 'Products', title: 'Products', icon: '📦', permission: null, section: 'catalog' },
  { path: '/quotations', label: 'Quotations', title: 'Quotations', icon: '📄', permission: 'quote:create', section: 'catalog' },
  { path: '/documents', label: 'Documents', title: 'Documents', icon: '📁', permission: 'doc:upload', section: 'catalog' },
  { path: '/import', label: 'Import', title: 'Import', icon: '📥', permission: 'lead:import', section: 'tools' },
  { path: '/export', label: 'Export CRM', title: 'Export CRM', icon: '🌍', permission: 'lead:export', section: 'tools' },
  { path: '/activity', label: 'Activity', title: 'Activity', icon: '📈', permission: 'activity:view_all', section: 'tools' },
  { path: '/ai-assistant', label: 'AI Assistant', title: 'AI Assistant', icon: '🤖', permission: null, section: 'tools' },
  { path: '/settings', label: 'Settings', title: 'Settings', icon: '⚙️', permission: 'settings:view', section: 'system' },
];

// ─────────────────────────────────────────────
// Validation Rules
// ─────────────────────────────────────────────

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[0-9\s\-\(\)]{7,15}$/,
  password: /^.{6,}$/,  // Minimum 6 characters
  name: /^.{2,50}$/,    // 2-50 characters
};

// ─────────────────────────────────────────────
// Feature Flags
// ─────────────────────────────────────────────

export const FEATURES = {
  ZOHO_MAIL_INTEGRATION: false,
  AI_ASSISTANT: true,
  LEAD_SCORING: true,
  SESSION_TIMEOUT: true,
  MULTI_CURRENCY: false,
};
