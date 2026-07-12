/**
 * @fileoverview Client-side SPA Router for Jivanta Global Revenue OS.
 * Uses the History API (pushState/popstate) for seamless navigation.
 * Supports dynamic URL parameters, auth guards, event emission, and 404 handling.
 * 
 * @module router
 * @version 1.0.0
 */

import { NAV_ITEMS } from './constants.js';

// ─────────────────────────────────────────────────────────────
// Route Event Bus — lightweight pub/sub for route changes
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} RouteConfig
 * @property {function(Object): string|HTMLElement} render - Render function receiving params, returns HTML or element.
 * @property {string} title - Page title suffix (prepended with "Jivanta · ").
 * @property {string} icon - Emoji icon for sidebar/nav rendering.
 * @property {boolean} [requiresAuth=true] - Whether the route requires authentication.
 * @property {string} [parent] - Parent path for breadcrumb generation.
 */

/**
 * @typedef {Object} RouteMatch
 * @property {RouteConfig} config - Matched route configuration.
 * @property {Object<string, string>} params - Extracted URL parameters.
 * @property {string} path - The registered route path pattern.
 */

/**
 * @typedef {Object} RouteChangeEvent
 * @property {string} from - Previous route path.
 * @property {string} to - New route path.
 * @property {Object<string, string>} params - Extracted URL parameters.
 * @property {RouteConfig} config - Matched route configuration.
 */

/**
 * Converts a route pattern like `/leads/:id` to a RegExp and extracts param names.
 * @param {string} pattern - Route pattern string.
 * @returns {{ regex: RegExp, paramNames: string[] }} Compiled regex and ordered param names.
 */
function compilePattern(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .replace(/\//g, '\\/')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name) => {
      paramNames.push(name);
      return '([^\\/]+)';
    });
  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

/**
 * Strips query strings and trailing slashes (except root) from a path.
 * @param {string} path - Raw path string.
 * @returns {string} Normalized path.
 */
function normalizePath(path) {
  let clean = path.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean || '/';
}

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────

/**
 * Client-side SPA Router singleton.
 * 
 * @example
 * import { Router } from './router.js';
 * Router.register('/dashboard', { render: renderDashboard, title: 'Dashboard', icon: '📊' });
 * Router.init();
 * Router.navigate('/dashboard');
 */
export const Router = {
  /** @type {Map<string, { config: RouteConfig, compiled: { regex: RegExp, paramNames: string[] } }>} */
  routes: new Map(),

  /** @type {string|null} Current matched route path pattern. */
  currentRoute: null,

  /** @type {Object<string, string>} Current extracted params. */
  currentParams: {},

  /** @type {string|null} Previous route path for back-tracking. */
  previousRoute: null,

  /** @type {Map<string, Set<function>>} Event listener registry. */
  _listeners: new Map(),

  /** @type {boolean} Whether the router has been initialized. */
  _initialized: false,

  /** @type {function|null} Auth check function — returns true if user is authenticated. */
  _authCheck: null,

  /** @type {string} Path to redirect to when auth fails. */
  _loginPath: '/login',

  /** @type {function|null} 404 renderer. */
  _notFoundRenderer: null,

  // ── Registration ──────────────────────────────────────────

  /**
   * Register a route with its configuration.
   * @param {string} path - URL pattern (e.g. `/leads/:id`).
   * @param {RouteConfig} config - Route configuration object.
   * @returns {typeof Router} The router instance for chaining.
   */
  register(path, config) {
    const normalizedPath = normalizePath(path);
    
    // Do not overwrite a real page registration with a placeholder definition
    if (this.routes.has(normalizedPath)) {
      if (config.render && config.render.toString().includes('Loading ')) {
        return this;
      }
    }

    const compiled = compilePattern(normalizedPath);
    this.routes.set(normalizedPath, {
      config: {
        requiresAuth: true,
        ...config,
      },
      compiled,
    });
    return this;
  },

  /**
   * Register multiple routes at once.
   * @param {Object<string, RouteConfig>} routeMap - Map of path → config.
   * @returns {typeof Router} The router instance for chaining.
   */
  registerAll(routeMap) {
    for (const [path, config] of Object.entries(routeMap)) {
      this.register(path, config);
    }
    return this;
  },

  // ── Navigation ────────────────────────────────────────────

  /**
   * Navigate to a given path.
   * @param {string} path - Target path (e.g. `/leads/42`).
   * @param {Object} [options={}] - Navigation options.
   * @param {boolean} [options.replace=false] - Use replaceState instead of pushState.
   * @param {Object} [options.state={}] - Additional state to push.
   * @param {boolean} [options.silent=false] - Navigate without triggering events.
   */
  navigate(path, options = {}) {
    const { replace = false, state = {}, silent = false } = options;
    const normalizedPath = normalizePath(path);
    const previousRoute = this.currentRoute;

    // Push or replace history entry
    const historyState = { path: normalizedPath, ...state, timestamp: Date.now() };
    if (replace) {
      history.replaceState(historyState, '', normalizedPath);
    } else {
      history.pushState(historyState, '', normalizedPath);
    }

    this._resolve(normalizedPath, silent, previousRoute);
  },

  /**
   * Go back in browser history.
   */
  back() {
    history.back();
  },

  /**
   * Go forward in browser history.
   */
  forward() {
    history.forward();
  },

  /**
   * Reload the current route (re-render without navigation).
   */
  reload() {
    if (this.currentRoute) {
      const currentPath = normalizePath(window.location.pathname);
      this._resolve(currentPath, false, this.currentRoute);
    }
  },

  // ── Initialization ────────────────────────────────────────

  /**
   * Initialize the router: bind popstate, intercept clicks, resolve current URL.
   * @param {Object} [options={}] - Init options.
   * @param {function(): boolean} [options.authCheck] - Returns true if user is authenticated.
   * @param {string} [options.loginPath='/login'] - Login redirect path.
   * @param {function(string): string|HTMLElement} [options.notFoundRenderer] - Custom 404 renderer.
   * @returns {typeof Router} The router instance for chaining.
   */
  init(options = {}) {
    if (this._initialized) {
      console.warn('[Router] Already initialized — skipping.');
      return this;
    }

    if (options.authCheck) this._authCheck = options.authCheck;
    if (options.loginPath) this._loginPath = options.loginPath;
    if (options.notFoundRenderer) this._notFoundRenderer = options.notFoundRenderer;

    // Listen for browser back/forward
    window.addEventListener('popstate', (e) => {
      const path = normalizePath(window.location.pathname);
      const previousRoute = this.currentRoute;
      this._resolve(path, false, previousRoute);
    });

    // Intercept all anchor clicks for SPA navigation
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[data-route]');
      if (!anchor) return;

      e.preventDefault();
      const href = anchor.getAttribute('href') || anchor.dataset.route;
      if (href) {
        this.navigate(href);
      }
    });

    // Resolve the current URL on load
    const initialPath = normalizePath(window.location.pathname);
    this._resolve(initialPath, false, null);

    this._initialized = true;
    this._emit('init', { path: initialPath });

    return this;
  },

  // ── Query / State ─────────────────────────────────────────

  /**
   * Get current URL search params as a plain object.
   * @returns {Object<string, string>} Key-value map of query parameters.
   */
  getCurrentParams() {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return { ...this.currentParams, ...params };
  },

  /**
   * Get a specific URL parameter value.
   * @param {string} key - The parameter name.
   * @returns {string|undefined} The parameter value.
   */
  getParam(key) {
    return this.getCurrentParams()[key];
  },

  /**
   * Check if the given path is the currently active route.
   * @param {string} path - Path to check.
   * @returns {boolean} True if the path matches the current route.
   */
  isActive(path) {
    const normalizedCheck = normalizePath(path);
    const currentPath = normalizePath(window.location.pathname);

    // Exact match
    if (currentPath === normalizedCheck) return true;

    // Prefix match for parent routes (e.g. /leads is active when on /leads/42)
    if (normalizedCheck !== '/' && currentPath.startsWith(normalizedCheck + '/')) {
      return true;
    }

    return false;
  },

  /**
   * Get the currently matched route configuration.
   * @returns {RouteConfig|null} Current route config or null.
   */
  getCurrentConfig() {
    if (!this.currentRoute) return null;
    const entry = this.routes.get(this.currentRoute);
    return entry ? entry.config : null;
  },

  /**
   * Get all registered routes as an array of { path, config } objects.
   * @returns {{ path: string, config: RouteConfig }[]} All routes.
   */
  getRoutes() {
    const result = [];
    for (const [path, { config }] of this.routes.entries()) {
      result.push({ path, config });
    }
    return result;
  },

  // ── Events ────────────────────────────────────────────────

  /**
   * Subscribe to a router event.
   * @param {'navigate'|'init'|'notfound'|'authRedirect'} event - Event name.
   * @param {function(Object): void} callback - Event handler.
   * @returns {function(): void} Unsubscribe function.
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  },

  /**
   * Unsubscribe from a router event.
   * @param {string} event - Event name.
   * @param {function} callback - The original callback to remove.
   */
  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
  },

  /**
   * Emit a router event.
   * @param {string} event - Event name.
   * @param {Object} data - Event data payload.
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Router] Error in "${event}" listener:`, err);
        }
      }
    }

    // Also dispatch a DOM CustomEvent for cross-module integration
    window.dispatchEvent(new CustomEvent(`router:${event}`, { detail: data }));
  },

  // ── Internal Resolution ───────────────────────────────────

  /**
   * Match a URL path against all registered routes.
   * @param {string} path - Normalized URL path.
   * @returns {RouteMatch|null} Matched route or null.
   * @private
   */
  _match(path) {
    // Priority 1: exact static match
    if (this.routes.has(path)) {
      return {
        config: this.routes.get(path).config,
        params: {},
        path,
      };
    }

    // Priority 2: dynamic routes (parameterized)
    for (const [routePath, { config, compiled }] of this.routes.entries()) {
      if (compiled.paramNames.length === 0) continue; // skip static (already checked)
      const match = path.match(compiled.regex);
      if (match) {
        const params = {};
        compiled.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { config, params, path: routePath };
      }
    }

    return null;
  },

  /**
   * Resolve a path: match, auth-check, render, update state, and emit events.
   * @param {string} path - Normalized URL path.
   * @param {boolean} silent - Whether to suppress events.
   * @param {string|null} previousRoute - The previous route path pattern.
   * @private
   */
  async _resolve(path, silent, previousRoute) {
    const match = this._match(path);

    // ── 404 ──
    if (!match) {
      this.currentRoute = null;
      this.currentParams = {};
      document.title = 'Jivanta · Page Not Found';

      if (!silent) {
        this._emit('notfound', { path });
      }

      // Render 404
      const appRoot = document.getElementById('app') || document.getElementById('main-content');
      if (appRoot && this._notFoundRenderer) {
        const rendered = this._notFoundRenderer(path);
        if (typeof rendered === 'string') {
          appRoot.innerHTML = rendered;
        } else if (rendered instanceof HTMLElement) {
          appRoot.replaceChildren(rendered);
        }
      } else if (appRoot) {
        appRoot.innerHTML = this._default404(path);
      }
      return;
    }

    const { config, params, path: routePath } = match;

    // ── Auth Guard ──
    if (config.requiresAuth && this._authCheck && !this._authCheck()) {
      if (!silent) {
        this._emit('authRedirect', { from: path, to: this._loginPath });
      }
      // Store intended destination for post-login redirect
      sessionStorage.setItem('jivanta_redirect', path);
      this.navigate(this._loginPath, { replace: true, silent: true });
      // Re-resolve the login route
      this._resolve(this._loginPath, silent, previousRoute);
      return;
    }

    // ── Route Permission Guard ──
    if (config.requiresAuth) {
      try {
        const { canAccessRoute } = await import('./permissions.js');
        const { AppStore } = await import('./store.js');
        const currentUser = AppStore.getState().currentUser;
        if (currentUser && !canAccessRoute(currentUser, routePath)) {
          console.warn(`[Router] Access denied for route: ${routePath} to role: ${currentUser.role}`);
          
          // Render Access Denied message
          const target = document.getElementById('main-content') || document.getElementById('app');
          if (target) {
            target.innerHTML = `
              <div style="padding: var(--space-8); text-align: center; font-family: 'Inter', sans-serif;">
                <div style="font-size: 48px; margin-bottom: var(--space-4);">🚫</div>
                <h2 style="color: var(--text-primary); margin-bottom: var(--space-2);">Access Denied</h2>
                <p style="color: var(--text-muted); font-size: var(--text-sm); max-width: 400px; margin: 0 auto var(--space-4) auto;">
                  You do not have the required permissions to access this page. Please contact your system administrator if you believe this is an error.
                </p>
                <a href="/" data-route class="btn btn-primary" style="display: inline-block;">Back to Dashboard</a>
              </div>
            `;
            target.scrollTo(0, 0);
          }
          return;
        }
      } catch (err) {
        console.error('[Router] Permission check failed:', err);
      }
    }

    // ── Update State ──
    this.previousRoute = previousRoute;
    this.currentRoute = routePath;
    this.currentParams = params;

    // ── Document Title ──
    document.title = config.title ? `Jivanta · ${config.title}` : 'Jivanta Global Revenue OS';

    // ── Layout Hook ──
    if (config.requiresAuth && typeof this.onLayoutNeeded === 'function') {
      this.onLayoutNeeded(path, config);
    }

    // ── Render ──
    if (typeof config.render === 'function') {
      try {
        const result = config.render(params);
        const target = config.requiresAuth ? document.getElementById('main-content') : document.getElementById('app');
        if (target) {
          if (typeof result === 'string') {
            target.innerHTML = result;
            target.scrollTo(0, 0);
          } else if (result instanceof HTMLElement) {
            target.replaceChildren(result);
            target.scrollTo(0, 0);
          } else if (result instanceof Promise) {
            // Support async render functions
            result.then((asyncResult) => {
              if (typeof asyncResult === 'string') {
                target.innerHTML = asyncResult;
              } else if (asyncResult instanceof HTMLElement) {
                target.replaceChildren(asyncResult);
              }
              target.scrollTo(0, 0);
            }).catch((err) => {
              console.error('[Router] Async render error:', err);
              target.innerHTML = this._defaultError(err);
              target.scrollTo(0, 0);
            });
          }
        }
      } catch (err) {
        console.error('[Router] Render error:', err);
        const target = config.requiresAuth ? document.getElementById('main-content') : document.getElementById('app');
        if (target) {
          target.innerHTML = this._defaultError(err);
        }
      }
    }

    // ── Emit Navigate Event ──
    if (!silent) {
      this._emit('navigate', {
        from: previousRoute,
        to: routePath,
        path,
        params,
        config,
      });
    }

    // ── Update Active Nav State ──
    this._updateActiveNav(path);
  },

  /**
   * Update sidebar/nav active states via data attributes.
   * @param {string} activePath - The currently active URL path.
   * @private
   */
  _updateActiveNav(activePath) {
    document.querySelectorAll('[data-route]').forEach((el) => {
      const route = el.getAttribute('href') || el.dataset.route;
      if (route) {
        const isActive = this.isActive(route);
        el.classList.toggle('nav__item--active', isActive);
        el.setAttribute('aria-current', isActive ? 'page' : 'false');
      }
    });
  },

  /**
   * Default 404 page HTML.
   * @param {string} path - The path that wasn't found.
   * @returns {string} HTML string.
   * @private
   */
  _default404(path) {
    return `
      <div class="error-page">
        <div class="error-page__content">
          <span class="error-page__code">404</span>
          <h1 class="error-page__title">Page Not Found</h1>
          <p class="error-page__message">
            The path <code>${this._escapeHtml(path)}</code> doesn't exist in the Revenue OS.
          </p>
          <a href="/" data-route class="btn btn--primary">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    `;
  },

  /**
   * Default error page HTML.
   * @param {Error} err - The error that occurred.
   * @returns {string} HTML string.
   * @private
   */
  _defaultError(err) {
    return `
      <div class="error-page">
        <div class="error-page__content">
          <span class="error-page__code">⚠️</span>
          <h1 class="error-page__title">Rendering Error</h1>
          <p class="error-page__message">${this._escapeHtml(err.message)}</p>
          <a href="/" data-route class="btn btn--primary">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    `;
  },

  /**
   * Escape HTML entities in a string to prevent XSS.
   * @param {string} str - Raw string.
   * @returns {string} Escaped string.
   * @private
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// ─────────────────────────────────────────────────────────────
// Route Definitions (structure only — pages register their own
// render functions via Router.register() at import time)
// ─────────────────────────────────────────────────────────────

/**
 * Default route definitions.
 * Render functions are no-ops (placeholders) — each page module
 * will call Router.register() to supply its real render function,
 * overwriting the placeholder.
 * @type {Object<string, RouteConfig>}
 */
export const ROUTE_DEFINITIONS = {
  '/': {
    title: 'Dashboard',
    icon: '📊',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Dashboard…</div>',
  },
  '/leads': {
    title: 'Leads',
    icon: '👥',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Leads…</div>',
  },
  '/leads/:id': {
    title: 'Lead Detail',
    icon: '👤',
    requiresAuth: true,
    parent: '/leads',
    render: () => '<div class="page-placeholder">Loading Lead…</div>',
  },
  '/pipeline': {
    title: 'Pipeline',
    icon: '🔄',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Pipeline…</div>',
  },
  '/tasks': {
    title: 'Tasks',
    icon: '✅',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Tasks…</div>',
  },
  '/calls': {
    title: 'Calls',
    icon: '📞',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Calls…</div>',
  },
  '/products': {
    title: 'Products',
    icon: '📦',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Products…</div>',
  },
  '/import': {
    title: 'Import',
    icon: '📥',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Import…</div>',
  },
  '/quotations': {
    title: 'Quotations',
    icon: '📄',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Quotations…</div>',
  },
  '/export': {
    title: 'Export CRM',
    icon: '🌍',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Export…</div>',
  },
  '/documents': {
    title: 'Documents',
    icon: '📁',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Documents…</div>',
  },
  '/activity': {
    title: 'Activity',
    icon: '📈',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Activity…</div>',
  },
  '/ai-assistant': {
    title: 'AI Assistant',
    icon: '🤖',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading AI Assistant…</div>',
  },
  '/settings': {
    title: 'Settings',
    icon: '⚙️',
    requiresAuth: true,
    render: () => '<div class="page-placeholder">Loading Settings…</div>',
  },
  '/login': {
    title: 'Login',
    icon: '🔐',
    requiresAuth: false,
    render: () => '<div class="page-placeholder">Loading Login…</div>',
  },
};

export { NAV_ITEMS };

/**
 * Initialize the router with all default routes pre-registered.
 * Call this once in your app entry point (main.js).
 * Individual page modules can then call `Router.register(path, config)`
 * to overwrite placeholder render functions.
 */
export function initRouter() {
  Router.registerAll(ROUTE_DEFINITIONS);
}
