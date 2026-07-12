/**
 * @fileoverview Role-based access control (RBAC) system for Jivanta Global Revenue OS.
 * Defines roles, permissions, and provides functions for checking access.
 * @module permissions
 */

import { AppStore } from './store.js';

// ─────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────

/** @enum {string} Available user roles */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DIRECTOR: 'director',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  EXPORT_EXECUTIVE: 'export_executive',
  PROCUREMENT: 'procurement',
  ACCOUNTANT: 'accountant',
  VIEWER: 'viewer',
};

// ─────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────

/** @enum {string} All available permissions */
export const PERMISSIONS = {
  // Lead permissions
  LEAD_VIEW_ALL: 'lead:view_all',
  LEAD_VIEW_TEAM: 'lead:view_team',
  LEAD_VIEW_OWN: 'lead:view_own',
  LEAD_CREATE: 'lead:create',
  LEAD_EDIT: 'lead:edit',
  LEAD_DELETE: 'lead:delete',
  LEAD_IMPORT: 'lead:import',
  LEAD_EXPORT: 'lead:export',
  LEAD_ASSIGN: 'lead:assign',
  LEAD_BULK_ACTIONS: 'lead:bulk_actions',

  // Pipeline
  PIPELINE_VIEW: 'pipeline:view',
  PIPELINE_MOVE: 'pipeline:move',

  // Tasks
  TASK_VIEW_ALL: 'task:view_all',
  TASK_CREATE: 'task:create',
  TASK_ASSIGN: 'task:assign',

  // Quotations
  QUOTE_CREATE: 'quote:create',
  QUOTE_APPROVE: 'quote:approve',
  QUOTE_SEND: 'quote:send',

  // Documents
  DOC_UPLOAD: 'doc:upload',
  DOC_DELETE: 'doc:delete',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  USER_MANAGE: 'user:manage',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Activity
  ACTIVITY_VIEW_ALL: 'activity:view_all',
};

// ─────────────────────────────────────────────
// Role → Permission Mapping
// ─────────────────────────────────────────────

/** @type {Record<string, string[]>} Maps each role to its allowed permissions */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions

  [ROLES.DIRECTOR]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_IMPORT,
    PERMISSIONS.LEAD_EXPORT,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_BULK_ACTIONS,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_MOVE,
    PERMISSIONS.TASK_VIEW_ALL,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_APPROVE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.DOC_DELETE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ACTIVITY_VIEW_ALL,
  ],

  [ROLES.SALES_MANAGER]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.LEAD_VIEW_TEAM,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_IMPORT,
    PERMISSIONS.LEAD_EXPORT,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_BULK_ACTIONS,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_MOVE,
    PERMISSIONS.TASK_VIEW_ALL,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ACTIVITY_VIEW_ALL,
  ],

  [ROLES.SALES_EXECUTIVE]: [
    PERMISSIONS.LEAD_VIEW_OWN,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_MOVE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.EXPORT_EXECUTIVE]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_EXPORT,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_MOVE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.PROCUREMENT]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.LEAD_EXPORT,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_APPROVE,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.DOC_DELETE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

// ─────────────────────────────────────────────
// Route → Permission Mapping
// ─────────────────────────────────────────────

/**
 * Maps routes to the required permission. Null means accessible by all.
 * @type {Record<string, string|null>}
 * @private
 */
const ROUTE_PERMISSIONS = {
  '/': null,
  '/leads': null,
  '/pipeline': PERMISSIONS.PIPELINE_VIEW,
  '/tasks': PERMISSIONS.TASK_CREATE,
  '/calls': PERMISSIONS.LEAD_VIEW_OWN,
  '/products': null,
  '/import': PERMISSIONS.LEAD_IMPORT,
  '/quotations': PERMISSIONS.QUOTE_CREATE,
  '/export': PERMISSIONS.LEAD_EXPORT,
  '/documents': PERMISSIONS.DOC_UPLOAD,
  '/activity': PERMISSIONS.ACTIVITY_VIEW_ALL,
  '/ai-assistant': null,
  '/settings': PERMISSIONS.SETTINGS_VIEW,
};

// ─────────────────────────────────────────────
// Access Control Functions
// ─────────────────────────────────────────────

/**
 * Checks if a role has a specific permission.
 * @param {string} userRole - The user's role (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {boolean} True if the role has the permission.
 */
export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;

  let role = userRole;
  let customPerms = null;

  if (typeof userRole === 'object' && userRole !== null) {
    role = userRole.role;
    customPerms = userRole.customPermissions || userRole.permissions;
  } else {
    try {
      const currentUser = AppStore.getState().currentUser;
      if (currentUser && currentUser.role === role) {
        customPerms = currentUser.customPermissions || currentUser.permissions;
      }
    } catch (e) {
      // AppStore might not be fully initialized yet
    }
  }

  // Super admin can do anything
  if (role === ROLES.SUPER_ADMIN) return true;

  // If there are custom user permission overrides, check them
  if (Array.isArray(customPerms)) {
    return customPerms.includes(permission);
  }

  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;

  return rolePerms.includes(permission);
}

/**
 * Checks if a role can access a given route.
 * @param {string} userRole - The user's role.
 * @param {string} route - The route path (e.g., '/leads').
 * @returns {boolean} True if the role can access the route.
 */
export function canAccessRoute(userRole, route) {
  if (!userRole) return false;

  // Super admin can access everything
  if (userRole === ROLES.SUPER_ADMIN) return true;

  const requiredPerm = ROUTE_PERMISSIONS[route];

  // No permission required — open to all authenticated users
  if (requiredPerm === null || requiredPerm === undefined) return true;

  return hasPermission(userRole, requiredPerm);
}

/**
 * Filters leads based on the user's access level.
 * - LEAD_VIEW_ALL: sees all leads
 * - LEAD_VIEW_TEAM: sees team leads + own leads
 * - LEAD_VIEW_OWN: sees only own leads
 * @param {string} userRole - The user's role.
 * @param {string} userId - The current user's ID.
 * @param {string} teamId - The current user's team ID.
 * @param {Array<Object>} allLeads - All leads in the system.
 * @returns {Array<Object>} Filtered array of leads the user can see.
 */
export function getVisibleLeads(userRole, userId, teamId, allLeads) {
  if (!allLeads || !Array.isArray(allLeads)) return [];
  if (!userRole) return [];

  // Can view all leads
  if (hasPermission(userRole, PERMISSIONS.LEAD_VIEW_ALL)) {
    return allLeads;
  }

  // Can view team leads
  if (hasPermission(userRole, PERMISSIONS.LEAD_VIEW_TEAM)) {
    return allLeads.filter(
      (lead) => lead.leadOwner === userId || lead.team === teamId
    );
  }

  // Can view own leads only
  if (hasPermission(userRole, PERMISSIONS.LEAD_VIEW_OWN)) {
    return allLeads.filter((lead) => lead.leadOwner === userId);
  }

  // No lead view permission at all
  return [];
}

// ─────────────────────────────────────────────
// Display Helpers
// ─────────────────────────────────────────────

/** @type {Record<string, string>} Human-readable role names */
const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.SALES_MANAGER]: 'Sales Manager',
  [ROLES.SALES_EXECUTIVE]: 'Sales Executive',
  [ROLES.EXPORT_EXECUTIVE]: 'Export Executive',
  [ROLES.PROCUREMENT]: 'Procurement',
  [ROLES.ACCOUNTANT]: 'Accountant',
  [ROLES.VIEWER]: 'Viewer',
};

/** @type {Record<string, string>} Badge colors for each role */
const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: '#ef4444',
  [ROLES.DIRECTOR]: '#f59e0b',
  [ROLES.SALES_MANAGER]: '#3b82f6',
  [ROLES.SALES_EXECUTIVE]: '#06b6d4',
  [ROLES.EXPORT_EXECUTIVE]: '#10b981',
  [ROLES.PROCUREMENT]: '#8b5cf6',
  [ROLES.ACCOUNTANT]: '#f97316',
  [ROLES.VIEWER]: '#6b7280',
};

/**
 * Returns the human-readable name for a role.
 * @param {string} role - The role key.
 * @returns {string} Human-readable role name.
 */
export function getRoleName(role) {
  return ROLE_NAMES[role] || 'Unknown';
}

/**
 * Returns the badge color for a role.
 * @param {string} role - The role key.
 * @returns {string} CSS color string.
 */
export function getRoleColor(role) {
  return ROLE_COLORS[role] || '#6b7280';
}
