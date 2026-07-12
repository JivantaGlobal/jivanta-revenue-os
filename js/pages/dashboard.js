/**
 * @fileoverview Dashboard page for Jivanta Global Revenue OS.
 * Renders analytics, KPIs, pipeline funnel, product distribution, and recent activities.
 */

import { Router } from '../router.js';
import { LeadStore, TaskStore, ActivityStore } from '../store.js';
import { PRODUCTS, PIPELINE_STAGES } from '../constants.js';
import { renderStatCard, getIconSvg } from '../components.js';
import { DB } from '../db.js';

let dateRangeFilter = 'all'; // all, 7d, 30d, month, quarter, year
let ownerFilter = 'all'; // all, or user ID

Router.register('/', {
  title: 'Dashboard',
  icon: '📊',
  requiresAuth: true,
  async render() {
    const leads = LeadStore.getState().leads || [];
    const tasks = TaskStore.getState().tasks || [];
    const activities = ActivityStore.getState().activities || [];
    const users = await DB.getAll('users');

    // 1. Apply Filters
    let filteredLeads = [...leads];
    let filteredTasks = [...tasks];
    let filteredActivities = [...activities];

    // Filter by Owner
    if (ownerFilter !== 'all') {
      filteredLeads = filteredLeads.filter(l => l.leadOwner === ownerFilter);
      filteredTasks = filteredTasks.filter(t => t.assignedTo === ownerFilter);
      filteredActivities = filteredActivities.filter(a => a.createdBy === ownerFilter);
    }

    // Filter by Date Range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateRangeFilter === '7d') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateRangeFilter === '30d') {
        cutoff.setDate(now.getDate() - 30);
      } else if (dateRangeFilter === 'month') {
        cutoff.setDate(1); // first day of current month
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateRangeFilter === 'quarter') {
        const currentMonth = now.getMonth();
        const startMonthOfQuarter = Math.floor(currentMonth / 3) * 3;
        cutoff = new Date(now.getFullYear(), startMonthOfQuarter, 1);
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateRangeFilter === 'year') {
        cutoff = new Date(now.getFullYear(), 0, 1);
        cutoff.setHours(0, 0, 0, 0);
      }

      filteredLeads = filteredLeads.filter(l => new Date(l.createdAt || l.updatedAt) >= cutoff);
      filteredTasks = filteredTasks.filter(t => new Date(t.createdAt) >= cutoff);
      filteredActivities = filteredActivities.filter(a => new Date(a.createdAt) >= cutoff);
    }

    // Calculate KPI values
    const totalLeads = filteredLeads.length;
    
    // Active pipeline: stages between research and sample/followup
    const activePipelineStages = ['research', 'contacted', 'interested', 'meeting', 'quotation', 'negotiation', 'sample', 'followup'];
    const activeLeads = filteredLeads.filter(l => activePipelineStages.includes(l.leadStatus));
    const activePipelineCount = activeLeads.length;

    const wonLeads = filteredLeads.filter(l => l.leadStatus === 'won');
    const wonCount = wonLeads.length;

    // Revenue forecast: sum of estimated buying capacities of won deals
    let revenueForecast = 0;
    wonLeads.forEach(l => {
      // Parse capacity like "₹10,00,000" or "50,000 MT/year"
      const val = parseFloat((l.estimatedBuyingCapacity || '').replace(/[^0-9.]/g, ''));
      if (!isNaN(val)) {
        revenueForecast += val;
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTasks = filteredTasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === todayStr && t.status !== 'Done');
    const todayTasksCount = todayTasks.length;

    const overdueTasks = filteredTasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) < todayStr && t.status !== 'Done');
    const overdueTasksCount = overdueTasks.length;

    // 1. Render KPI Row HTML
    const kpis = [
      { label: 'Total Leads', value: totalLeads, subtitle: 'In database', icon: '👥', gradient: 'gradient-1' },
      { label: 'Active Pipeline', value: activePipelineCount, subtitle: 'Deals in progress', icon: '🔄', gradient: 'gradient-2' },
      { label: 'Won Deals', value: wonCount, subtitle: 'Closed orders', icon: '🏆', gradient: 'gradient-3' },
      { label: 'Est. Revenue', value: revenueForecast > 0 ? `₹${(revenueForecast / 100000).toFixed(1)} L` : '₹0', subtitle: 'From won deals', icon: '💰', gradient: 'gradient-4' },
      { label: 'Tasks Today', value: todayTasksCount, subtitle: 'Awaiting completion', icon: '📅', gradient: 'gradient-5' },
      { label: 'Overdue Tasks', value: overdueTasksCount, subtitle: 'Require action', icon: '⚠️', gradient: overdueTasksCount > 0 ? 'gradient-danger' : 'gradient-6' }
    ];

    const kpiRowHtml = kpis.map(kpi => renderStatCard(kpi)).join('');

    // 2. Render Funnel Chart (HTML/CSS representation)
    const stageCounts = {};
    PIPELINE_STAGES.forEach(s => { stageCounts[s.id] = 0; });
    filteredLeads.forEach(l => {
      if (stageCounts[l.leadStatus] !== undefined) {
        stageCounts[l.leadStatus]++;
      }
    });

    const maxCount = Math.max(...Object.values(stageCounts), 1);
    const funnelHtml = PIPELINE_STAGES.map(stage => {
      const count = stageCounts[stage.id] || 0;
      const widthPct = (count / maxCount) * 100;
      return `
        <div class="funnel-row">
          <div class="funnel-label">
            <span class="funnel-icon">${getIconSvg(stage.icon)}</span>
            <span class="funnel-name">${stage.name}</span>
          </div>
          <div class="funnel-bar-container">
            <div class="funnel-bar animate-shimmer" style="width: ${widthPct}%; background-color: ${stage.color};">
              <span class="funnel-bar-count">${count}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 3. Render Product Distribution
    const productCounts = {};
    PRODUCTS.forEach(p => { productCounts[p.id] = 0; });
    filteredLeads.forEach(l => {
      if (l.productInterest && Array.isArray(l.productInterest)) {
        l.productInterest.forEach(pId => {
          if (productCounts[pId] !== undefined) productCounts[pId]++;
        });
      }
    });

    const totalProductInterests = Object.values(productCounts).reduce((a, b) => a + b, 0) || 1;
    const productListHtml = PRODUCTS.map(prod => {
      const count = productCounts[prod.id] || 0;
      const pct = ((count / totalProductInterests) * 100).toFixed(0);
      return `
        <div class="product-dist-item">
          <div class="product-dist-meta" style="display:flex; align-items:center; gap:var(--space-2);">
            <span class="product-dist-icon" style="color: ${prod.color}; display:flex; align-items:center; width:16px; height:16px;">${getIconSvg(prod.icon)}</span>
            <span class="product-dist-name" style="font-weight: var(--weight-medium);">${prod.name}</span>
          </div>
          <div class="product-dist-stats">
            <span class="product-dist-count">${count} leads</span>
            <span class="product-dist-pct">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');

    // 4. Render Recent Activities (Limit to 8)
    const recentActivities = filteredActivities.slice(0, 8);
    const activityFeedHtml = recentActivities.length > 0 
      ? `<div class="timeline">
          ${recentActivities.map(act => {
            const timeStr = new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
            return `
              <div class="timeline-item">
                <div class="timeline-time">
                  <div class="time">${timeStr}</div>
                  <div class="date">${dateStr}</div>
                </div>
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <div class="timeline-title">${act.description}</div>
                  <div class="timeline-user">by ${act.userName || 'System'}</div>
                </div>
              </div>
            `;
          }).join('')}
         </div>`
      : `<div class="empty-state-card" style="padding: var(--space-6); text-align: center;">
          <span style="font-size: 32px;">📭</span>
          <p style="color: var(--text-muted); margin-top: var(--space-2);">No recent activities logged.</p>
         </div>`;

    // 5. Render Top High Potential Leads
    const topLeads = filteredLeads
      .filter(l => l.leadStatus !== 'won' && l.leadStatus !== 'lost')
      .sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0))
      .slice(0, 5);

    const topLeadsTableHtml = topLeads.length > 0
      ? `<div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Country</th>
                <th>Products</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${topLeads.map(l => {
                const prodBadges = (l.productInterest || []).map(pId => {
                  const p = PRODUCTS.find(prod => prod.id === pId);
                  return p ? `<span class="badge" style="background-color: ${p.color}15; color: ${p.color}; border: 1px solid ${p.color}35; margin-right: 4px; font-size: 10px; font-weight: 600;">${p.name}</span>` : '';
                }).join('');
                const statusStage = PIPELINE_STAGES.find(s => s.id === l.leadStatus) || { name: l.leadStatus, color: '#666' };
                return `
                  <tr class="clickable-row" data-route="/leads/${l.id}">
                    <td><strong>${l.companyName}</strong></td>
                    <td>${l.country}</td>
                    <td>${prodBadges}</td>
                    <td>
                      <div class="progress-bar-container" style="width: 80px;">
                        <div class="progress-bar-fill" style="width: ${l.leadScore || 50}%; background-color: var(--color-primary);"></div>
                      </div>
                      <span style="font-size: var(--text-xs); color: var(--text-muted);">${l.leadScore || 50}%</span>
                    </td>
                    <td>
                      <span class="badge" style="background-color: ${statusStage.color}; color: #fff;">${statusStage.name}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
         </div>`
      : `<div style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No active leads in database.</div>`;

    return `
      <div class="dashboard-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Dashboard Filters Bar -->
        <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-5); background: rgba(255, 255, 255, 0.02); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); align-items: center; justify-content: flex-end; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">📅 Date Range:</span>
            <select id="dashDateRange" class="form-select" style="width: auto; padding: 4px var(--space-4) 4px var(--space-2); font-size: var(--text-xs); cursor: pointer;">
              <option value="all" ${dateRangeFilter === 'all' ? 'selected' : ''}>All Time</option>
              <option value="7d" ${dateRangeFilter === '7d' ? 'selected' : ''}>Last 7 Days</option>
              <option value="30d" ${dateRangeFilter === '30d' ? 'selected' : ''}>Last 30 Days</option>
              <option value="month" ${dateRangeFilter === 'month' ? 'selected' : ''}>This Month</option>
              <option value="quarter" ${dateRangeFilter === 'quarter' ? 'selected' : ''}>This Quarter</option>
              <option value="year" ${dateRangeFilter === 'year' ? 'selected' : ''}>This Year</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">👤 Lead Owner:</span>
            <select id="dashOwner" class="form-select" style="width: auto; padding: 4px var(--space-4) 4px var(--space-2); font-size: var(--text-xs); cursor: pointer;">
              <option value="all" ${ownerFilter === 'all' ? 'selected' : ''}>All Owners</option>
              ${users.map(u => `<option value="${u.id}" ${ownerFilter === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- KPI Section -->
        <div class="dashboard-kpi-grid">
          ${kpiRowHtml}
        </div>

        <!-- Funnel and Product Distribution Section -->
        <div class="dashboard-charts-grid" style="margin-top: var(--space-6);">
          <div class="card chart-card">
            <div class="card-header">
              <h3 class="card-title">Sales Funnel</h3>
              <p class="card-subtitle">Lead counts across pipeline stages</p>
            </div>
            <div class="card-body funnel-chart-body">
              ${funnelHtml}
            </div>
          </div>

          <div class="card chart-card">
            <div class="card-header">
              <h3 class="card-title">Product Focus</h3>
              <p class="card-subtitle">Leads distributed by product type</p>
            </div>
            <div class="card-body" style="padding-top: var(--space-2);">
              <div class="product-distribution-list">
                ${productListHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- Activity and Top Leads Section -->
        <div class="dashboard-details-grid" style="margin-top: var(--space-6);">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent System Activities</h3>
              <p class="card-subtitle">Real-time audit trail of actions</p>
            </div>
            <div class="card-body" style="max-height: 400px; overflow-y: auto;">
              ${activityFeedHtml}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Top High Potential Leads</h3>
              <p class="card-subtitle">Leads with highest opportunity scores</p>
            </div>
            <div class="card-body">
              ${topLeadsTableHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

// Dropdown Change Listeners for Filtering
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'dashDateRange') {
    dateRangeFilter = e.target.value;
    Router.reload();
  }
  if (e.target && e.target.id === 'dashOwner') {
    ownerFilter = e.target.value;
    Router.reload();
  }
});
