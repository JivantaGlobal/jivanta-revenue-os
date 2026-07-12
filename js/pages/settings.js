/**
 * @fileoverview Settings page module. Handles global app options, user management, and database resets.
 */

import { Router } from '../router.js';
import { AppStore, UserStore } from '../store.js';
import { ROLES, ROLE_PERMISSIONS, PERMISSIONS, hasPermission } from '../permissions.js';
import { DB } from '../db.js';
import { renderToast } from '../components.js';
import { migrateLegacyLeads, fetchLegacyData } from '../migrator.js';
import { generateId } from '../utils.js';

let activeSettingsTab = 'profile'; // profile, general, users, database

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

Router.register('/settings', {
  title: 'Settings & Admin',
  icon: '⚙️',
  requiresAuth: true,
  async render() {
    const users = await DB.getAll('users');
    const currentUser = AppStore.getState().currentUser || { id: 'admin', role: ROLES.SUPER_ADMIN };
    const theme = AppStore.getState().theme || 'dark';
    const zohoDomain = AppStore.getState().zohoDomain || 'mail.zoho.in';
    const emailMethod = AppStore.getState().emailMethod || 'zoho';

    const hasUserManage = hasPermission(currentUser, PERMISSIONS.USER_MANAGE);

    const isProfile = activeSettingsTab === 'profile';
    const isGeneral = activeSettingsTab === 'general';
    const isUsers = activeSettingsTab === 'users';
    const isDb = activeSettingsTab === 'database';

    // Tabs HTML
    const tabsHtml = `
      <div class="tabs" style="margin-bottom: var(--space-5); display: flex; gap: var(--space-2); overflow-x: auto; padding-bottom: 4px;">
        <button class="btn btn-sm btn-outline settings-tab-btn ${isProfile ? 'active' : ''}" data-tab="profile">👤 My Profile</button>
        ${hasUserManage ? `
          <button class="btn btn-sm btn-outline settings-tab-btn ${isGeneral ? 'active' : ''}" data-tab="general">⚙️ General Settings</button>
          <button class="btn btn-sm btn-outline settings-tab-btn ${isUsers ? 'active' : ''}" data-tab="users">👥 Team & Users</button>
          <button class="btn btn-sm btn-outline settings-tab-btn ${isDb ? 'active' : ''}" data-tab="database">💾 Database Operations</button>
        ` : ''}
      </div>
    `;

    let contentHtml = '';
    if (activeSettingsTab === 'profile') {
      const userInDb = users.find(u => u.id === currentUser.id) || currentUser;
      const roleName = (userInDb.role || '').toUpperCase().replaceAll('_', ' ');

      // Query User Specific Stats dynamically
      const allLeads = await DB.getAll('leads');
      const allCalls = await DB.getAll('calls');
      const allTasks = await DB.getAll('tasks');
      const allActivities = await DB.getAll('activities');

      const myLeads = allLeads.filter(l => l.leadOwner === currentUser.id);
      const myCalls = allCalls.filter(c => c.userId === currentUser.id);
      const myCompletedTasks = allTasks.filter(t => t.assignedTo === currentUser.id && t.status === 'Done');
      const myWonLeads = myLeads.filter(l => l.leadStatus === 'won');
      const myConversionRate = myLeads.length > 0 ? ((myWonLeads.length / myLeads.length) * 100).toFixed(1) + '%' : '0.0%';

      // Query User Inactivity / Activities audit log
      const myRecentActivities = allActivities
        .filter(a => a.createdBy === currentUser.id)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5);

      const activityItemsHtml = myRecentActivities.map(a => `
        <div style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: var(--text-xs);">
          <span style="color: var(--text-muted);">${new Date(a.createdAt).toLocaleString()}</span> — 
          <span style="color: var(--text-primary);">${a.description || a.type.replaceAll('_', ' ')}</span>
        </div>
      `).join('') || '<div style="color: var(--text-muted); font-size: var(--text-xs); padding: var(--space-2) 0;">No activity logs found.</div>';

      contentHtml = `
        <div class="grid grid-2-col" style="gap: var(--space-5); margin-bottom: var(--space-5); align-items: start;">
          <!-- Profile details card -->
          <div class="card" style="padding: var(--space-5);">
            <h3 class="card-title" style="margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
              <span>Personal Details</span>
            </h3>
            <form id="profileEditForm" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" id="profileName" class="form-input" required value="${userInDb.name || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address (Login ID)</label>
                <input type="email" id="profileEmail" class="form-input" value="${userInDb.email || ''}" readonly style="background: rgba(255, 255, 255, 0.05); cursor: not-allowed;" />
              </div>
              <div class="form-group">
                <label class="form-label">Designation / Job Title</label>
                <input type="text" id="profileDesignation" class="form-input" placeholder="e.g. Senior Sales Specialist" value="${userInDb.designation || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Mobile Number</label>
                <input type="tel" id="profilePhone" class="form-input" placeholder="e.g. +91 98765 43210" value="${userInDb.phone || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Security Access Role</label>
                <div>
                  <span class="badge" style="display: inline-block; padding: var(--space-2) var(--space-3); font-size: var(--text-xs); font-weight: var(--weight-bold); background: rgba(59, 130, 246, 0.2); color: #3b82f6;">
                    👤 ${roleName}
                  </span>
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
                <button class="btn btn-primary" id="saveProfileBtn">Update Profile</button>
              </div>
            </form>
          </div>

          <!-- Stats and Activity side card -->
          <div style="display: flex; flex-direction: column; gap: var(--space-5);">
            <!-- Stats widget -->
            <div class="card" style="padding: var(--space-5);">
              <h3 class="card-title" style="margin-bottom: var(--space-4);">My Performance Stats</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                <div style="background: rgba(255, 255, 255, 0.03); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Leads Owned</div>
                  <div style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--text-primary); margin-top: 4px;">${myLeads.length}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Conversion</div>
                  <div style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: #10b981; margin-top: 4px;">${myConversionRate}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Calls Logged</div>
                  <div style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: #3b82f6; margin-top: 4px;">${myCalls.length}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Tasks Finished</div>
                  <div style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: #a855f7; margin-top: 4px;">${myCompletedTasks.length}</div>
                </div>
              </div>
            </div>

            <!-- Activity widget -->
            <div class="card" style="padding: var(--space-5);">
              <h3 class="card-title" style="margin-bottom: var(--space-3);">My Recent Actions</h3>
              <div style="display: flex; flex-direction: column;">
                ${activityItemsHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- Security password settings -->
        <div class="card" style="padding: var(--space-5); margin-bottom: var(--space-5);">
          <h3 class="card-title" style="margin-bottom: var(--space-4);">Change Security Password</h3>
          <form id="passwordChangeForm" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Current Password *</label>
              <input type="password" id="currentPassword" class="form-input" required placeholder="Enter current login password" />
            </div>
            <div class="grid grid-2-col" style="gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label">New Password *</label>
                <input type="password" id="newPassword" class="form-input" required placeholder="Minimum 6 characters" minlength="6" />
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password *</label>
                <input type="password" id="confirmNewPassword" class="form-input" required placeholder="Repeat new password" minlength="6" />
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
              <button class="btn btn-primary" id="changePasswordBtn">Change Password</button>
            </div>
          </form>
        </div>

        <!-- Preferences Settings Card -->
        <div class="card" style="padding: var(--space-5);">
          <h3 class="card-title" style="margin-bottom: var(--space-4);">Individual Preferences</h3>
          
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Interface Theme Mode</label>
              <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2);">
                <button class="btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}" id="setDarkThemeBtn">🌙 Dark Mode (Glassmorphism)</button>
                <button class="btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-outline'}" id="setLightThemeBtn">☀️ Light Mode (Classic)</button>
              </div>
            </div>

            <div class="form-group" style="margin-top: var(--space-2);">
              <label class="form-label">Zoho Mail Region / Domain</label>
              <select id="zohoDomainSelect" class="form-select">
                <option value="mail.zoho.in" ${zohoDomain === 'mail.zoho.in' ? 'selected' : ''}>India (zoho.in)</option>
                <option value="mail.zoho.com" ${zohoDomain === 'mail.zoho.com' ? 'selected' : ''}>US / Global (zoho.com)</option>
                <option value="mail.zoho.eu" ${zohoDomain === 'mail.zoho.eu' ? 'selected' : ''}>Europe (zoho.eu)</option>
                <option value="mail.zoho.com.au" ${zohoDomain === 'mail.zoho.com.au' ? 'selected' : ''}>Australia (zoho.com.au)</option>
              </select>
            </div>

            <div class="form-group" style="margin-top: var(--space-2);">
              <label class="form-label">Email Outreach Integration Mode</label>
              <select id="emailMethodSelect" class="form-select">
                <option value="zoho" ${emailMethod === 'zoho' ? 'selected' : ''}>Compose in Zoho Mail (Webmail Tab)</option>
                <option value="mailto" ${emailMethod === 'mailto' ? 'selected' : ''}>Standard mailto: link (Desktop Client)</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (activeSettingsTab === 'general') {
      contentHtml = `
        <div class="card" style="padding: var(--space-5);">
          <h3 class="card-title" style="margin-bottom: var(--space-4);">Global Configurations</h3>
          
          <div class="form-group">
            <label class="form-label">Company / Organization Name</label>
            <input type="text" class="form-input" value="Jivanta Global Pvt Ltd" readonly style="background: rgba(255, 255, 255, 0.05); cursor: not-allowed;" />
          </div>

          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label">Application Version</label>
            <input type="text" class="form-input" value="v1.1.0 (Enterprise Pro)" readonly style="background: rgba(255,255,255,0.05); cursor: not-allowed;" />
          </div>
        </div>
      `;
    } else if (activeSettingsTab === 'users') {
      const userRows = users.map(u => {
        const canDelete = u.role !== ROLES.SUPER_ADMIN && u.id !== currentUser.id;
        const roleDisp = u.role.toUpperCase().replaceAll('_', ' ');
        
        return `
          <tr>
            <td>
              <div style="font-weight: var(--weight-bold);">${u.name}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${u.designation || 'Staff'}</div>
            </td>
            <td>${u.email}</td>
            <td><span class="badge" style="text-transform: uppercase; font-size: 10px; background: rgba(59, 130, 246, 0.15); color: #3b82f6;">${roleDisp}</span></td>
            <td>${(u.team || 'Sales').toUpperCase().replaceAll('_', ' ')}</td>
            <td>
              <span class="badge ${u.isActive !== false ? 'badge-success' : 'badge-danger'}">
                ${u.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="btn btn-xs btn-outline edit-user-btn" data-id="${u.id}" style="margin-right: 4px;">✏️ Edit</button>
              ${canDelete ? `<button class="btn btn-xs btn-outline btn-danger delete-user-btn" data-id="${u.id}">🗑️ Delete</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      contentHtml = `
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-5);">
          <div class="card-header" style="padding: var(--space-4); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">Authorized System Users</h3>
            <button class="btn btn-sm btn-primary" id="addTeamUserBtn">➕ Add Team User</button>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Security Role</th>
                  <th>Department / Team</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${userRows || `<tr><td colspan="6" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No users found.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSettingsTab === 'database') {
      const dbStatus = DB.getFirebaseStatus();
      const savedConfig = localStorage.getItem('jivanta_firebase_config');
      const firebaseConfigStr = savedConfig ? JSON.stringify(JSON.parse(savedConfig), null, 2) : '';

      contentHtml = `
        <!-- Firebase Cloud Storage Sync Card -->
        <div class="card" style="padding: var(--space-5); margin-bottom: var(--space-6);">
          <h3 class="card-title" style="margin-bottom: var(--space-3); color: var(--color-primary);">Firebase Cloud Storage Sync</h3>
          <p style="color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-4);">
            To sync employee database updates, credentials, and settings across different devices universally, you must initialize Firestore on your Firebase Console.
          </p>

          <div style="margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
            <span style="font-size: var(--text-sm); font-weight: 500;">Connection Status:</span>
            ${dbStatus.enabled 
              ? `<span class="badge" style="background-color: var(--color-success); color: #fff; padding: 4px 8px; font-size: 10px; border-radius: 4px;">Live Sync Connected (Project: ${dbStatus.projectId})</span>`
              : `<span class="badge" style="background-color: var(--color-warning); color: #000; padding: 4px 8px; font-size: 10px; border-radius: 4px;">Offline Mode Only</span>`
            }
          </div>

          <div class="form-group" style="margin-bottom: var(--space-5);">
            <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Firebase configuration object (JSON)</label>
            <textarea id="firebaseConfigTextarea" class="form-textarea" rows="5" style="font-family: monospace; font-size: 11px;" placeholder="Paste your firebaseConfig object here...">${firebaseConfigStr}</textarea>
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px;">
              Leave blank to connect to default live cloud project: <code>abs-hrm-cloud</code>.
            </div>
          </div>

          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            <button class="btn btn-sm btn-primary" id="saveFirebaseConfigBtn">Save & Connect Cloud</button>
            <button class="btn btn-sm btn-outline" id="disableFirebaseBtn">Disconnect Cloud Sync</button>
            <button class="btn btn-sm btn-outline" id="forcePushCloudBtn" ${dbStatus.enabled ? '' : 'disabled'}>Force Push Local ➔ Cloud</button>
            <button class="btn btn-sm btn-outline" id="forcePullCloudBtn" ${dbStatus.enabled ? '' : 'disabled'}>Force Pull Cloud ➔ Local</button>
          </div>
        </div>

        <div class="card" style="padding: var(--space-5);">
          <h3 class="card-title" style="margin-bottom: var(--space-3); color: #ef4444;">Danger Zone</h3>
          <p style="color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-5);">System maintenance and database reset commands. Be cautious with these operations.</p>
          
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: var(--space-3);">
              <div>
                <strong>Factory Reset Leads Database</strong>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">Clears all leads, documents, and logs, then re-migrates the 319 default leads.</div>
              </div>
              <button class="btn btn-danger" id="factoryResetDbBtn">Factory Reset DB</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-3);">
              <div>
                <strong>Wipe All Custom Data</strong>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">Completely purges all database tables (leads, tasks, calls, documents, quotations, users).</div>
              </div>
              <button class="btn btn-danger" id="purgeAllDataBtn">Purge All Tables</button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="settings-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">System Settings & Configurations</h2>
            <p class="page-header-subtitle">Configure application settings, manage user roles/access, and database reset features</p>
          </div>
        </div>

        <!-- Navigation tabs -->
        ${tabsHtml}

        <!-- Active View -->
        <div style="max-width: 800px;">
          ${contentHtml}
        </div>
      </div>
    `;
  }
});

// Event handlers
document.addEventListener('click', async (e) => {
  // Tab click
  if (e.target && e.target.classList.contains('settings-tab-btn')) {
    activeSettingsTab = e.target.dataset.tab;
    Router.reload();
  }

  // Save Firebase Cloud Config
  if (e.target && e.target.id === 'saveFirebaseConfigBtn') {
    e.preventDefault();
    const configVal = document.getElementById('firebaseConfigTextarea').value.trim();
    try {
      if (configVal) {
        const parsed = JSON.parse(configVal);
        await DB.setFirebaseConfig(parsed);
        renderToast('Firebase Cloud Sync configured and connected successfully!', 'success');
      } else {
        await DB.setFirebaseConfig(null);
        renderToast('Reset to default cloud project successfully.', 'success');
      }
      Router.reload();
    } catch (err) {
      alert('Invalid Firebase configuration object (must be valid JSON):\n' + err.message);
    }
  }

  // Disconnect Firebase Cloud Sync
  if (e.target && e.target.id === 'disableFirebaseBtn') {
    e.preventDefault();
    DB.disableFirebase();
    renderToast('Disconnected from Cloud Sync. CRM is now in offline-only Mode.', 'info');
    Router.reload();
  }

  // Force Push Local Database to Cloud
  if (e.target && e.target.id === 'forcePushCloudBtn') {
    e.preventDefault();
    if (confirm('Are you sure you want to force-push all local data to the Cloud? This will overwrite existing cloud CRM records.')) {
      AppStore.setLoading(true);
      try {
        await DB.forcePushLocalToCloud();
        renderToast('Successfully uploaded local data to Firebase cloud!', 'success');
      } catch (err) {
        alert('Cloud upload failed: ' + err.message);
      } finally {
        AppStore.setLoading(false);
        Router.reload();
      }
    }
  }

  // Force Pull Cloud Database to Local
  if (e.target && e.target.id === 'forcePullCloudBtn') {
    e.preventDefault();
    if (confirm('Are you sure you want to force-pull all records from the Cloud? This will wipe your current local records.')) {
      AppStore.setLoading(true);
      try {
        await DB.forcePullCloudToLocal();
        renderToast('Successfully synchronized cloud database to local IndexedDB!', 'success');
      } catch (err) {
        alert('Cloud download failed: ' + err.message);
      } finally {
        AppStore.setLoading(false);
        Router.reload();
      }
    }
  }

  // Save Profile Details
  if (e.target && e.target.id === 'saveProfileBtn') {
    e.preventDefault();
    const form = document.getElementById('profileEditForm');
    if (!form.reportValidity()) return;

    const name = document.getElementById('profileName').value;
    const designation = document.getElementById('profileDesignation').value;
    const phone = document.getElementById('profilePhone').value;
    const currentUser = AppStore.getState().currentUser;
    
    if (currentUser) {
      // 1. Fetch user from DB
      const user = await DB.get('users', currentUser.id);
      if (user) {
        user.name = name;
        user.designation = designation;
        user.phone = phone;
        user.updatedAt = new Date().toISOString();
        await DB.put('users', user);
      }

      // 2. Update currentUser in store
      const updatedUser = { ...currentUser, name };
      await AppStore.setCurrentUser(updatedUser);
      
      renderToast('Your profile has been updated successfully.', 'success');
      Router.reload();
    }
  }

  // Save Security Password
  if (e.target && e.target.id === 'changePasswordBtn') {
    e.preventDefault();
    const form = document.getElementById('passwordChangeForm');
    if (!form.reportValidity()) return;

    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmNewPass = document.getElementById('confirmNewPassword').value;

    if (newPass !== confirmNewPass) {
      renderToast('New passwords do not match.', 'error');
      return;
    }

    const currentUser = AppStore.getState().currentUser;
    if (currentUser) {
      const userInDb = await DB.get('users', currentUser.id);
      if (userInDb) {
        const hashedCurrent = await hashPassword(currentPass);
        
        // Validate current password if it exists
        if (userInDb.passwordHash && userInDb.passwordHash !== hashedCurrent) {
          renderToast('Current password is incorrect.', 'error');
          return;
        }

        userInDb.passwordHash = await hashPassword(newPass);
        userInDb.failedAttempts = 0;
        await DB.put('users', userInDb);
        
        renderToast('Password changed successfully.', 'success');
        form.reset();
      }
    }
  }

  // Dark/Light Theme Toggle
  if (e.target && e.target.id === 'setDarkThemeBtn') {
    AppStore.setState({ theme: 'dark' });
    await DB.put('settings', { key: 'theme', value: 'dark' });
    document.body.classList.remove('light-theme');
    renderToast('Dark Theme activated.', 'info');
    Router.reload();
  }
  if (e.target && e.target.id === 'setLightThemeBtn') {
    AppStore.setState({ theme: 'light' });
    await DB.put('settings', { key: 'theme', value: 'light' });
    document.body.classList.add('light-theme');
    renderToast('Light Theme activated.', 'info');
    Router.reload();
  }

  // Add User Trigger
  if (e.target && e.target.id === 'addTeamUserBtn') {
    showAddUserModal();
  }

  // Edit User Trigger
  if (e.target && e.target.classList.contains('edit-user-btn')) {
    showEditUserModal(e.target.dataset.id);
  }

  // Delete User Trigger
  if (e.target && e.target.classList.contains('delete-user-btn')) {
    const id = e.target.dataset.id;
    const currentUser = AppStore.getState().currentUser;
    
    if (id === currentUser.id) {
      renderToast('You cannot delete your own account.', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this system user? This cannot be undone.')) {
      // Reassign leads of this user to admin
      const leads = await DB.getAll('leads');
      for (const lead of leads) {
        if (lead.leadOwner === id) {
          lead.leadOwner = 'admin';
          await DB.put('leads', lead);
        }
      }
      
      // Reassign tasks of this user to admin
      const tasks = await DB.getAll('tasks');
      for (const task of tasks) {
        if (task.assignedTo === id) {
          task.assignedTo = 'admin';
          await DB.put('tasks', task);
        }
      }

      await DB.delete('users', id);
      await UserStore.loadUsers();
      renderToast('System user deleted and their assets reassigned to Super Admin.', 'success');
      Router.reload();
    }
  }

  // Factory Reset Database
  if (e.target && e.target.id === 'factoryResetDbBtn') {
    if (confirm('WARNING: This will clear all current logs, tasks, quotations, and customized leads, and reload the initial 319 leads from the backup registry. Proceed?')) {
      AppStore.setLoading(true);

      try {
        // Clear all stores
        await DB.clear('leads');
        await DB.clear('activities');
        await DB.clear('tasks');
        await DB.clear('calls');
        await DB.clear('quotations');
        await DB.clear('documents');
        await DB.clear('importLogs');

        // Fetch and run migration
        const legacyLeads = await fetchLegacyData();
        if (legacyLeads.length > 0) {
          await migrateLegacyLeads(legacyLeads, DB);
        }

        renderToast('Database successfully reset to initial migrated state.', 'success');
        window.location.reload();
      } catch (err) {
        console.error('[Settings] Factory reset failed:', err);
        renderToast('Reset failed: ' + err.message, 'error');
      } finally {
        AppStore.setLoading(false);
      }
    }
  }

  // Purge All Data
  if (e.target && e.target.id === 'purgeAllDataBtn') {
    if (confirm('CRITICAL WARNING: This will completely wipe all data in the database, including the leads table. You will start with an empty database. Are you absolutely sure?')) {
      AppStore.setLoading(true);

      try {
        const currentUser = AppStore.getState().currentUser;

        await DB.clear('leads');
        await DB.clear('activities');
        await DB.clear('tasks');
        await DB.clear('calls');
        await DB.clear('quotations');
        await DB.clear('documents');
        await DB.clear('importLogs');
        await DB.clear('users');

        // Restore logged in user
        if (currentUser) {
          await DB.put('users', {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            avatar: currentUser.avatar || '',
            isActive: true,
            createdAt: new Date().toISOString()
          });
        }

        renderToast('All database tables successfully purged.', 'success');
        window.location.reload();
      } catch (err) {
        console.error('[Settings] Purge failed:', err);
        renderToast('Purge failed: ' + err.message, 'error');
      } finally {
        AppStore.setLoading(false);
      }
    }
  }
});

// Dropdown/Form Value change listener
document.addEventListener('change', async (e) => {
  if (e.target && e.target.id === 'zohoDomainSelect') {
    const val = e.target.value;
    AppStore.setState({ zohoDomain: val });
    await DB.put('settings', { key: 'zohoDomain', value: val });
    renderToast('Zoho Mail region updated.', 'success');
  }
  if (e.target && e.target.id === 'emailMethodSelect') {
    const val = e.target.value;
    AppStore.setState({ emailMethod: val });
    await DB.put('settings', { key: 'emailMethod', value: val });
    renderToast('Email integration method updated.', 'success');
  }
});

function showAddUserModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const roleOptions = Object.values(ROLES).map(r => `
    <option value="${r}">${r.replaceAll('_', ' ').toUpperCase()}</option>
  `).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="addUserModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Authorize Team User</h3>
          <button class="modal-close" onclick="document.getElementById('addUserModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="newUserForm">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="newUserName" class="form-input" required placeholder="e.g. Sanjay Kumar" />
            </div>
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" id="newUserEmail" class="form-input" required placeholder="e.g. sanjay.k@jivanta.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Security Role *</label>
              <select id="newUserRole" class="form-select" required>
                ${roleOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Team / Department</label>
              <input type="text" id="newUserTeam" class="form-input" placeholder="e.g. Sales, Export Logistics" value="Sales" />
            </div>
            <div class="form-group">
              <label class="form-label">Password *</label>
              <input type="password" id="newUserPassword" class="form-input" required placeholder="Minimum 6 characters" minlength="6" />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('addUserModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveNewUserBtn">Add User</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveNewUserBtn').addEventListener('click', async () => {
    const form = document.getElementById('newUserForm');
    if (!form.reportValidity()) return;

    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const role = document.getElementById('newUserRole').value;
    const team = document.getElementById('newUserTeam').value;
    const password = document.getElementById('newUserPassword').value;

    const allUsers = await DB.getAll('users');
    if (allUsers.some(u => u.email.toLowerCase() === email)) {
      renderToast('A user with this email address already exists.', 'error');
      return;
    }

    const passwordHash = await hashPassword(password);
    const userRecord = {
      id: generateId('USR'),
      name,
      email,
      role,
      team,
      isActive: true,
      failedAttempts: 0,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString()
    };

    // Save to DB
    await DB.put('users', userRecord);
    await UserStore.loadUsers();
    renderToast(`Added team user "${name}" successfully.`, 'success');
    document.getElementById('addUserModalOverlay').remove();
    Router.reload();
  });
}

async function showEditUserModal(id) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const user = await DB.get('users', id);
  if (!user) return;

  const roleOptions = Object.values(ROLES).map(r => `
    <option value="${r}" ${user.role === r ? 'selected' : ''}>${r.replaceAll('_', ' ').toUpperCase()}</option>
  `).join('');

  // Define checkboxes for all key permissions
  const permissionCheckboxes = Object.entries(PERMISSIONS).map(([key, permVal]) => {
    const defaultRolePerms = ROLE_PERMISSIONS[user.role] || [];
    const isCustom = Array.isArray(user.customPermissions);
    const hasPerm = isCustom ? user.customPermissions.includes(permVal) : defaultRolePerms.includes(permVal);
    const isChecked = hasPerm ? 'checked' : '';

    const label = permVal.toUpperCase().replace(':', ' - ').replaceAll('_', ' ');

    return `
      <label class="checkbox-container" style="display: flex; align-items: center; margin-bottom: var(--space-2);">
        <input type="checkbox" class="user-perm-checkbox" name="customPermissions" value="${permVal}" ${isChecked} />
        <span class="checkbox-box" style="margin-right: var(--space-2);"></span>
        <span style="font-size: var(--text-xs); font-weight: var(--weight-medium);">${label}</span>
      </label>
    `;
  }).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="editUserModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">Edit User Permissions & Role</h3>
          <button class="modal-close" onclick="document.getElementById('editUserModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form id="editUserForm">
            <div class="grid grid-2-col" style="gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" id="editUserName" class="form-input" required value="${user.name || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" id="editUserEmail" class="form-input" required value="${user.email || ''}" readonly style="background: rgba(0,0,0,0.2);" />
              </div>
              <div class="form-group">
                <label class="form-label">Security Role *</label>
                <select id="editUserRole" class="form-select" required>
                  ${roleOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Team / Department</label>
                <input type="text" id="editUserTeam" class="form-input" value="${user.team || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Reset Password (Leave blank to keep current)</label>
                <input type="password" id="editUserPassword" class="form-input" placeholder="New password (min 6 characters)" minlength="6" />
              </div>
              <div class="form-group" style="display: flex; align-items: flex-end;">
                <label class="checkbox-container" style="display: inline-flex; align-items: center; margin-bottom: 8px;">
                  <input type="checkbox" id="editUserActive" ${user.isActive !== false ? 'checked' : ''} />
                  <span class="checkbox-box" style="margin-right: 6px;"></span>
                  <span style="font-weight: var(--weight-bold); font-size: var(--text-sm);">Active Status (Enable System Login)</span>
                </label>
              </div>
              
              <div class="form-group" style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: var(--space-4);">
                <label class="form-label" style="font-weight: var(--weight-bold); margin-bottom: var(--space-2);">Direct Access Control (Accessibility Checkboxes)</label>
                <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-3);">Toggle permissions below to override the default access level for their role. Leave checked to grant, uncheck to restrict.</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); max-height: 200px; overflow-y: auto; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgba(0,0,0,0.15);">
                  ${permissionCheckboxes}
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('editUserModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveEditUserBtn">Save Permissions</button>
        </div>
      </div>
    </div>
  `;

  // Auto select/deselect checkboxes when role changes to match default role permissions
  document.getElementById('editUserRole').addEventListener('change', (e) => {
    const selectedRole = e.target.value;
    const defaultPerms = ROLE_PERMISSIONS[selectedRole] || [];
    document.querySelectorAll('.user-perm-checkbox').forEach(cb => {
      cb.checked = defaultPerms.includes(cb.value);
    });
  });

  document.getElementById('saveEditUserBtn').addEventListener('click', async () => {
    const form = document.getElementById('editUserForm');
    if (!form.reportValidity()) return;

    const name = document.getElementById('editUserName').value.trim();
    const role = document.getElementById('editUserRole').value;
    const team = document.getElementById('editUserTeam').value;
    const isActive = document.getElementById('editUserActive').checked;
    const newPassword = document.getElementById('editUserPassword').value;
    
    const checkboxes = Array.from(document.querySelectorAll('.user-perm-checkbox'));
    const customPermissions = checkboxes
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const updatedUser = {
      ...user,
      name,
      role,
      team,
      isActive,
      customPermissions,
      updatedAt: new Date().toISOString()
    };

    if (newPassword) {
      updatedUser.passwordHash = await hashPassword(newPassword);
      updatedUser.failedAttempts = 0;
    }

    // Save to IndexedDB
    await DB.put('users', updatedUser);
    await UserStore.loadUsers();

    // If it's the current user, update AppStore state
    const currentUser = AppStore.getState().currentUser;
    if (currentUser && currentUser.id === user.id) {
      const updatedSessionUser = {
        ...currentUser,
        name,
        role,
        team,
        customPermissions
      };
      await AppStore.setCurrentUser(updatedSessionUser);
    }

    renderToast(`Updated user permissions for "${name}" successfully.`, 'success');
    document.getElementById('editUserModalOverlay').remove();
    Router.reload();
  });
}
