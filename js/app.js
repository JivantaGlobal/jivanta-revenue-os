/**
 * @fileoverview Application Entry Point & Bootstrapper.
 * Initializes stores, runs legacy migrations, sets up router layout hooks, and binds global events.
 */

import { initializeStores, AppStore, LeadStore, TaskStore, ActivityStore, UserStore } from './store.js';
import { initRouter, Router } from './router.js';
import { fetchLegacyData, migrateLegacyLeads } from './migrator.js';
import { DB } from './db.js';
import { renderSidebar, renderHeader, renderToast } from './components.js';

// Import all page modules to register their route handlers with the router
import './pages/login.js';
import './pages/dashboard.js';
import './pages/leads.js';
import './pages/pipeline.js';
import './pages/tasks.js';
import './pages/calls.js';
import './pages/products.js';
import './pages/import.js';
import './pages/quotations.js';
import './pages/export.js';
import './pages/documents.js';
import './pages/activity.js';
import './pages/ai-assistant.js';
import './pages/settings.js';

// Setup Router layout integration callback (Inversion of Control)
Router.onLayoutNeeded = (path, config) => {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // Render the base layout if it doesn't exist
  if (!appEl.querySelector('.app-layout')) {
    appEl.className = '';
    appEl.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar placeholder -->
        <div class="sidebar-placeholder"></div>
        <div class="main-content">
          <!-- Header placeholder -->
          <div class="header-placeholder"></div>
          <div class="main-scroll" id="main-content"></div>
        </div>
      </div>
    `;
  }

  const state = AppStore.getState();
  
  // Calculate overdue tasks count for the sidebar badge count (Overdue count calculation is handled dynamically via notifications or TaskStore)
  const overdueCount = 0;

  // Render sidebar
  const sidebarHtml = renderSidebar(path, {
    collapsed: state.sidebarCollapsed,
    user: state.currentUser || { name: 'Guest', email: '' },
    badges: {
      '/tasks': overdueCount
    }
  });

  const sidebarEl = appEl.querySelector('.sidebar') || appEl.querySelector('.sidebar-placeholder');
  if (sidebarEl) {
    sidebarEl.outerHTML = sidebarHtml;
  }

  // Render header
  const headerHtml = renderHeader(config.title || 'Revenue OS', {
    user: state.currentUser || { name: 'Guest' },
    notificationCount: 0
  });

  const headerEl = appEl.querySelector('.header') || appEl.querySelector('.header-placeholder');
  if (headerEl) {
    headerEl.outerHTML = headerHtml;
  }

  // Sync the collapsed class
  const layoutEl = appEl.querySelector('.app-layout');
  if (layoutEl) {
    layoutEl.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  }
};

// Subscribe to state updates to keep layout sync'd in real-time
AppStore.subscribe((state) => {
  // If we are on an authenticated page, re-render the layout shell to sync badges/profile/theme
  if (Router.currentRoute && Router.getCurrentConfig()?.requiresAuth) {
    Router.onLayoutNeeded(window.location.pathname, Router.getCurrentConfig());
  }

  // Apply body classes for theme
  if (state.theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
});

// Session inactivity timeout (30 minutes)
let sessionTimer = null;
const SESSION_TIMEOUT = 30 * 60 * 1000;

function resetSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);
  const currentUser = AppStore.getState().currentUser;
  if (!currentUser) return;
  sessionTimer = setTimeout(() => {
    if (AppStore.getState().currentUser) {
      AppStore.setCurrentUser(null);
      renderToast('Session expired due to inactivity. Please log in again.', 'warning');
      Router.navigate('/login');
    }
  }, SESSION_TIMEOUT);
}

['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, resetSessionTimer, { passive: true });
});

// App Bootstrap logic
async function bootstrap() {
  try {
    // 1. Initialize DB and stores
    await initializeStores();

    // 2. Run legacy lead migration in background (non-blocking)
    fetchLegacyData().then(async (legacy) => {
      if (legacy && legacy.length > 0) {
        const migResult = await migrateLegacyLeads(legacy, DB);
        console.info(`[Bootstrap] Legacy migration completed in background:`, migResult);
      }
    }).catch(err => {
      console.warn(`[Bootstrap] Background migration check bypassed:`, err);
    });

    // 3. Initialize Router
    initRouter();
    Router.init({
      authCheck: () => {
        const user = AppStore.getState().currentUser;
        return !!user;
      },
      loginPath: '/login'
    });

    // Remove system initializing screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('animate-fadeOut');
      setTimeout(() => loadingScreen.remove(), 500);
    }

    // Loading complete
    console.info('[Bootstrap] App fully initialized.');

  } catch (err) {
    console.error('[Bootstrap] App failed to load:', err);
    alert('Critical initialization error: ' + err.message);
  }
}

// Global UI Click Handlers (Sidebar Collapse, Search, Profile Dropdowns)
document.addEventListener('click', (e) => {
  // Toggle Sidebar
  if (e.target && (e.target.dataset.action === 'toggle-sidebar' || e.target.closest('[data-action="toggle-sidebar"]'))) {
    AppStore.toggleSidebar();
  }

  // User Dropdown Trigger
  const avatarBtn = e.target.closest('[data-action="user-dropdown"]') || e.target.closest('[data-action="user-menu"]');
  if (avatarBtn) {
    showUserDropdown(avatarBtn);
  }

  // Logout click
  if (e.target && e.target.id === 'logoutBtn') {
    handleLogout();
  }
});

function showUserDropdown(anchorEl) {
  const existing = document.getElementById('globalUserDropdown');
  if (existing) {
    existing.remove();
    return;
  }
  
  const dropdown = document.createElement('div');
  dropdown.id = 'globalUserDropdown';
  dropdown.className = 'dropdown-menu open';
  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '1000';
  
  const rect = anchorEl.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
  dropdown.style.left = `${rect.right - 180 + window.scrollX}px`;
  
  const currentUser = AppStore.getState().currentUser || { name: 'Guest', role: 'viewer' };
  dropdown.innerHTML = `
    <div style="padding: var(--space-3); border-bottom: 1px solid var(--border); font-size: var(--text-xs); color: var(--text-muted);">
      <div>Logged in as:</div>
      <strong style="color: var(--text-primary); display: block; margin-top: 2px;">${currentUser.name}</strong>
      <span style="text-transform: uppercase; font-size: 9px; opacity: 0.8; color: var(--color-primary);">${currentUser.role.replaceAll('_', ' ')}</span>
    </div>
    <a href="/settings" data-route class="dropdown-item" style="padding: var(--space-2) var(--space-3); display: block; color: var(--text-primary); text-decoration: none; font-size: var(--text-sm);">⚙️ Settings</a>
    <button class="dropdown-item btn-block" id="logoutBtn" style="padding: var(--space-2) var(--space-3); text-align: left; background: none; border: none; color: #ef4444; width: 100%; cursor: pointer; font-size: var(--text-sm);">🚪 Log Out</button>
  `;
  
  document.body.appendChild(dropdown);
  
  const closeHandler = (evt) => {
    if (!dropdown.contains(evt.target) && !anchorEl.contains(evt.target)) {
      dropdown.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  
  // Delay slightly to prevent immediate click closing
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 50);
}

async function handleLogout() {
  const existing = document.getElementById('globalUserDropdown');
  if (existing) existing.remove();

  if (confirm('Are you sure you want to log out of Jivanta Global Revenue OS?')) {
    AppStore.setLoading(true);
    await AppStore.setCurrentUser(null);
    renderToast('Successfully logged out.', 'info');
    AppStore.setLoading(false);
    Router.navigate('/login');
  }
}

// Real-time synchronization store reloader
window.addEventListener('db-update', async (e) => {
  const { storeName } = e.detail;
  console.info(`[Real-time Sync] Replicating changes locally for store: ${storeName}`);
  try {
    if (storeName === 'leads') {
      await LeadStore.loadLeads();
    } else if (storeName === 'tasks') {
      await TaskStore.loadTasks();
    } else if (storeName === 'activities') {
      await ActivityStore.loadActivities();
    } else if (storeName === 'users') {
      await UserStore.loadUsers();
    }
    // Reload active view/page to reflect the changes in the DOM instantly
    Router.reload();
  } catch (err) {
    console.error('[Real-time Sync] Failed to reload store:', err);
  }
});

// Kick off bootstrap
bootstrap();
