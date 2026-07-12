/**
 * @fileoverview System audit trail / activity feed page module.
 */

import { Router } from '../router.js';
import { ActivityStore, LeadStore } from '../store.js';
import { DB } from '../db.js';
import { renderPagination } from '../components.js';

let activityTypeFilter = '';
let activityDateRangeFilter = 'all'; // all, 24h, 7d, 30d
let activityUserFilter = 'all'; // all, or user ID
let currentPage = 1;
const pageSize = 15;

Router.register('/activity', {
  title: 'System Activity Logs',
  icon: '📈',
  requiresAuth: true,
  async render() {
    const activities = ActivityStore.getState().activities || [];
    const leads = LeadStore.getState().leads || [];
    const users = await DB.getAll('users');

    // Filter activities
    let filtered = activities.filter(act => {
      // 1. Log Type filter
      if (activityTypeFilter && act.type !== activityTypeFilter) return false;

      // 2. User filter
      if (activityUserFilter !== 'all' && act.createdBy !== activityUserFilter) return false;

      // 3. Date range filter
      if (activityDateRangeFilter !== 'all') {
        const now = new Date();
        let cutoff = new Date();
        if (activityDateRangeFilter === '24h') {
          cutoff.setHours(now.getHours() - 24);
        } else if (activityDateRangeFilter === '7d') {
          cutoff.setDate(now.getDate() - 7);
        } else if (activityDateRangeFilter === '30d') {
          cutoff.setDate(now.getDate() - 30);
        }
        if (new Date(act.createdAt) < cutoff) return false;
      }

      return true;
    });

    // Pagination
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedActivities = filtered.slice(startIdx, startIdx + pageSize);

    const rowsHtml = paginatedActivities.map(act => {
      const lead = act.leadId ? leads.find(l => l.id === act.leadId) : null;
      const typeLabel = act.type.toUpperCase().replaceAll('_', ' ');
      
      let typeBadgeColor = 'var(--border)';
      if (act.type === 'lead_created') typeBadgeColor = 'var(--color-primary)';
      if (act.type === 'stage_change') typeBadgeColor = 'var(--color-warning)';
      if (act.type === 'call') typeBadgeColor = 'var(--color-success)';
      if (act.type === 'quotation') typeBadgeColor = 'var(--color-secondary)';
      if (act.type === 'document') typeBadgeColor = '#8b5cf6';
      if (act.type === 'task') typeBadgeColor = '#f59e0b';

      // Find user name if trigger by user ID
      const userObj = users.find(u => u.id === act.createdBy);
      const userNameDisp = userObj ? userObj.name : (act.userName || 'System');

      return `
        <tr>
          <td>${new Date(act.createdAt).toLocaleString()}</td>
          <td><span class="badge" style="background-color: ${typeBadgeColor}; color: #fff; font-size: 10px;">${typeLabel}</span></td>
          <td><strong>${act.description}</strong></td>
          <td>${lead ? `<a href="/leads/${lead.id}" data-route style="color: var(--color-primary); font-weight: var(--weight-medium);">${lead.companyName}</a>` : '—'}</td>
          <td>${userNameDisp}</td>
        </tr>
      `;
    }).join('');

    const filterOptions = ['lead_created', 'lead_updated', 'stage_change', 'call', 'note', 'task', 'quotation', 'document', 'import'].map(type => {
      const label = type.toUpperCase().replaceAll('_', ' ');
      return `<option value="${type}" ${activityTypeFilter === type ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const userOptions = users.map(u => `
      <option value="${u.id}" ${activityUserFilter === u.id ? 'selected' : ''}>${u.name}</option>
    `).join('');

    const paginationHtml = totalCount > pageSize ? `
      <div style="margin-top: var(--space-4);">
        ${renderPagination(currentPage, totalPages, 'activity-page-change')}
      </div>
    ` : '';

    return `
      <div class="activity-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">System Audit Trails & Activities</h2>
            <p class="page-header-subtitle">Real-time audit log of all lead additions, pipeline updates, follow-ups, calls, and invoices</p>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-5);">
          <div style="display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">📂 Log Type:</span>
              <select id="activityLogTypeFilter" class="form-select" style="width: 160px; margin-bottom: 0; font-size: var(--text-xs); height: 32px; padding: 4px;">
                <option value="">All Logs</option>
                ${filterOptions}
              </select>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">📅 Date Range:</span>
              <select id="activityDateFilter" class="form-select" style="width: 140px; margin-bottom: 0; font-size: var(--text-xs); height: 32px; padding: 4px;">
                <option value="all" ${activityDateRangeFilter === 'all' ? 'selected' : ''}>All Time</option>
                <option value="24h" ${activityDateRangeFilter === '24h' ? 'selected' : ''}>Last 24 Hours</option>
                <option value="7d" ${activityDateRangeFilter === '7d' ? 'selected' : ''}>Last 7 Days</option>
                <option value="30d" ${activityDateRangeFilter === '30d' ? 'selected' : ''}>Last 30 Days</option>
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">👤 User:</span>
              <select id="activityUserFilter" class="form-select" style="width: 160px; margin-bottom: 0; font-size: var(--text-xs); height: 32px; padding: 4px;">
                <option value="all" ${activityUserFilter === 'all' ? 'selected' : ''}>All Users</option>
                ${userOptions}
              </select>
            </div>
          </div>
        </div>

        <!-- Activity Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Log Type</th>
                  <th>Description</th>
                  <th>Linked Company</th>
                  <th>Triggered By</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="5" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No logs match the filters.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        
        ${paginationHtml}
      </div>
    `;
  }
});

// Event handlers
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'activityLogTypeFilter') {
    activityTypeFilter = e.target.value;
    currentPage = 1;
    Router.reload();
  }
  if (e.target && e.target.id === 'activityDateFilter') {
    activityDateRangeFilter = e.target.value;
    currentPage = 1;
    Router.reload();
  }
  if (e.target && e.target.id === 'activityUserFilter') {
    activityUserFilter = e.target.value;
    currentPage = 1;
    Router.reload();
  }
});

document.addEventListener('click', (e) => {
  const pageBtn = e.target.closest('[data-action="activity-page-change"]');
  if (pageBtn) {
    currentPage = parseInt(pageBtn.dataset.page, 10);
    Router.reload();
  }
});
