/**
 * @fileoverview Login page for Jivanta Global Revenue OS.
 * Provides a secure branded login portal and quick-login cards for testing various user roles.
 */

import { Router } from '../router.js';
import { AppStore } from '../store.js';
import { renderToast, getIconSvg } from '../components.js';
import { DB } from '../db.js';

// Pre-defined demo users matching permissions.js roles
const DEMO_USERS = [
  { id: 'admin', name: 'Subham Jain', email: 'admin@jivantaglobal.com', role: 'super_admin', roleName: 'Super Admin', icon: '⚡', password: 'Admin@123' },
  { id: 'mgr_sanjay', name: 'Sanjay Kumar', email: 'manager@jivantaglobal.com', role: 'sales_manager', roleName: 'Sales Manager', icon: '💼', password: 'Manager@123' },
  { id: 'exec_rahul', name: 'Rahul Sen', email: 'employee@jivantaglobal.com', role: 'sales_executive', roleName: 'Sales Executive', icon: '📞', password: 'Employee@123' }
];

/**
 * Hash a password using SHA-256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hex representation of SHA-256 hash
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Router.register('/login', {
  title: 'Login',
  icon: '🔐',
  requiresAuth: false,
  render() {
    // Clear any existing app layout wrapper to render full screen login
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.className = 'login-page';
    }

    return `
      <div class="login-container animate-slideUp">
        <div class="login-card">
          <div class="login-card-header" style="text-align: center; margin-bottom: var(--space-6);">
            <div class="login-logo-glow" style="margin: 0 auto var(--space-3) auto; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: var(--radius-lg); background: var(--gradient-1); box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);">
              <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; color: #fff;">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <h1 class="login-title" style="font-size: var(--text-2xl); font-weight: var(--weight-extrabold); letter-spacing: var(--tracking-tight); color: var(--text-primary);">Jivanta Global</h1>
            <p class="login-subtitle" style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-1);">Revenue OS CRM</p>
          </div>

          <form id="loginForm" class="login-form">
            <div class="form-group">
              <label class="form-label" for="loginEmail">Email Address</label>
              <input type="email" id="loginEmail" class="form-input" required placeholder="name@jivantaglobal.com" value="" />
            </div>

            <div class="form-group">
              <label class="form-label" for="loginPassword">Password</label>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" id="loginPassword" class="form-input" required placeholder="••••••••" value="" style="padding-right: 40px; width: 100%;" />
                <button type="button" id="togglePasswordVisibilityBtn" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-row" style="margin-bottom: var(--space-4); display: flex; justify-content: space-between; align-items: center;">
              <label class="checkbox-container" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="rememberMe" checked style="cursor: pointer;" />
                <span class="checkbox-label" style="font-size: var(--text-xs); color: var(--text-muted);">Remember me</span>
              </label>
              <a href="#" class="login-forgot-link" id="forgotPassword" style="font-size: var(--text-xs); color: var(--color-primary); text-decoration: none;">Forgot password?</a>
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="margin-top: var(--space-4); width: 100%;">
              Sign In to Dashboard
            </button>
          </form>

          <div class="login-divider" style="text-align: center; margin: var(--space-5) 0; position: relative;">
            <hr style="border: 0; border-top: 1px solid var(--border); margin: 0;" />
            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0c101b; padding: 0 10px; font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Or Quick Login for Testing</span>
          </div>

          <div class="demo-accounts-grid">
            ${DEMO_USERS.map(user => `
              <div class="demo-account-card" data-user-idx="${DEMO_USERS.indexOf(user)}" style="cursor: pointer;">
                <div class="demo-avatar">${getIconSvg(user.icon)}</div>
                <div class="demo-info">
                  <div class="demo-name">${user.name}</div>
                  <div class="demo-role">${user.roleName}</div>
                  <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">
                    ${user.email} <br/> Pass: <code>${user.password}</code>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
});

// Event handling using document event delegation
document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'loginForm') {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      renderToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      AppStore.setLoading(true);
      const passwordHash = await hashPassword(password);

      // Find user in IndexedDB by email
      const allUsers = await DB.getAll('users');
      let dbUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (dbUser) {
        // Check deactivation state
        if (dbUser.isActive === false) {
          renderToast('Account deactivated. Please contact your administrator.', 'error');
          return;
        }

        // Check lock state
        if ((dbUser.failedAttempts || 0) >= 5) {
          renderToast('Account locked due to too many failed attempts. Contact admin.', 'error');
          return;
        }

        // Validate password
        if (dbUser.passwordHash) {
          if (dbUser.passwordHash !== passwordHash) {
            dbUser.failedAttempts = (dbUser.failedAttempts || 0) + 1;
            await DB.put('users', dbUser);
            const remaining = 5 - dbUser.failedAttempts;
            renderToast(`Invalid password. ${remaining} attempts remaining.`, 'error');
            return;
          }
        } else {
          // If first login for a seeded demo account, save password hash
          dbUser.passwordHash = passwordHash;
          dbUser.failedAttempts = 0;
          await DB.put('users', dbUser);
        }

        // Complete login
        await loginUser(dbUser);
      } else {
        // Email not in DB, check if it matches a pre-seeded demo user
        const demoMatch = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (demoMatch) {
          if (demoMatch.password === password) {
            // Seed this demo user in DB
            const userRecord = {
              id: demoMatch.id,
              name: demoMatch.name,
              email: demoMatch.email,
              role: demoMatch.role,
              avatar: '',
              team: demoMatch.id === 'admin' ? 'management' : 'domestic_sales',
              isActive: true,
              passwordHash: passwordHash,
              failedAttempts: 0,
              createdAt: new Date().toISOString()
            };
            await DB.put('users', userRecord);
            await loginUser(userRecord);
          } else {
            renderToast('Invalid password for demo account.', 'error');
          }
        } else {
          renderToast('Account not found. Contact administrator.', 'error');
        }
      }
    } catch (err) {
      console.error('[Login] Login check failed:', err);
      renderToast('Login failed: ' + err.message, 'error');
    } finally {
      AppStore.setLoading(false);
    }
  }
});

document.addEventListener('click', async (e) => {
  // Handle click on demo account card
  const demoCard = e.target.closest('.demo-account-card');
  if (demoCard) {
    const idx = parseInt(demoCard.dataset.userIdx, 10);
    const user = DEMO_USERS[idx];
    if (user) {
      document.getElementById('loginEmail').value = user.email;
      document.getElementById('loginPassword').value = user.password;
      
      // Auto-submit the form
      const form = document.getElementById('loginForm');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  }

  // Handle forgot password
  if (e.target && e.target.id === 'forgotPassword') {
    e.preventDefault();
    renderToast('Please contact your administrator to reset your password.', 'info');
  }

  // Handle show/hide password toggle
  const toggleBtn = e.target.closest('#togglePasswordVisibilityBtn');
  if (toggleBtn) {
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }
});

/**
 * Handle successful authentication state transition
 * @param {Object} user - User record to login
 */
async function loginUser(user) {
  try {
    AppStore.setLoading(true);
    
    // Store last login in IndexedDB
    const existing = await DB.get('users', user.id);
    const merged = {
      ...(existing || {}),
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || '',
      isActive: true,
      lastLogin: new Date().toISOString(),
      failedAttempts: 0
    };
    await DB.put('users', merged);

    // Set current user in app store (without passwords/hashes for security)
    await AppStore.setCurrentUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || ''
    });

    renderToast(`Welcome back, ${user.name}!`, 'success');
    
    // Reset login-bg class on app body
    const appEl = document.getElementById('app');
    if (appEl) appEl.className = '';

    // Redirect to home page or intended URL
    const redirectUrl = sessionStorage.getItem('jivanta_redirect') || '/';
    sessionStorage.removeItem('jivanta_redirect');
    
    Router.navigate(redirectUrl);
  } catch (err) {
    console.error('[Login] Login transition failed:', err);
    renderToast('Authentication failed: ' + err.message, 'error');
  } finally {
    AppStore.setLoading(false);
  }
}
