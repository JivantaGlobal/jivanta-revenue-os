/**
 * @fileoverview Leads Master List and Details pages.
 * Handles the complete lead database CRUD, filtering, inline editing, outreach templates, and modals.
 */

import { Router } from '../router.js';
import { LeadStore, TaskStore, ActivityStore, AppStore } from '../store.js';
import { 
  PRODUCTS, PIPELINE_STAGES, PRIORITIES, 
  CONFIDENCE_SCORES, LEAD_SOURCES, COUNTRIES, 
  INDIAN_STATES, DOCUMENT_CATEGORIES 
} from '../constants.js';
import { renderToast, esc } from '../components.js';
import { DB, generateId } from '../db.js';
import { hasPermission, PERMISSIONS } from '../permissions.js';
import { formatDate } from '../utils.js';

// Local UI state for Leads list
let currentFilters = {
  product: '',
  country: '',
  status: '',
  confidence: '',
  priority: '',
  owner: '',
  search: ''
};
let currentPage = 1;
const pageSize = 15;
let selectedLeads = new Set();
let sortField = 'createdAt'; // Default sorting by date added
let sortDir = -1; // -1 = descending (newest first), 1 = ascending

function renderHeaderCell(label, field) {
  if (!field) return `<th>${label}</th>`;
  
  const isSorted = sortField === field;
  let arrow = '↕️'; // Up-down arrow for unsorted fields
  if (isSorted) {
    arrow = sortDir === 1 ? '▲' : '▼'; // Up or Down solid arrows
  }
  
  return `
    <th class="sortable-header" data-sort-field="${field}" data-action="sort" style="cursor: pointer; user-select: none;">
      <div style="display: inline-flex; align-items: center; gap: 4px;">
        ${label}
        <span class="sort-icon" style="font-size: 10px; opacity: ${isSorted ? 1 : 0.4}; color: ${isSorted ? 'var(--color-primary)' : 'inherit'};">${arrow}</span>
      </div>
    </th>
  `;
}

Router.register('/leads', {
  title: 'Leads',
  icon: '👥',
  requiresAuth: true,
  async render() {
    const leads = LeadStore.getState().leads || [];
    const users = await DB.getAll('users');
    
    // Apply filters
    let filtered = leads.filter(lead => {
      if (currentFilters.product && !(lead.productInterest || []).includes(currentFilters.product)) return false;
      if (currentFilters.country && lead.country !== currentFilters.country) return false;
      if (currentFilters.status && lead.leadStatus !== currentFilters.status) return false;
      if (currentFilters.confidence && lead.confidenceScore !== currentFilters.confidence) return false;
      if (currentFilters.priority && lead.priority !== currentFilters.priority) return false;
      if (currentFilters.owner && lead.leadOwner !== currentFilters.owner) return false;
      if (currentFilters.search) {
        const q = currentFilters.search.toLowerCase();
        const company = (lead.companyName || '').toLowerCase();
        const contact = (lead.contactPerson || '').toLowerCase();
        const phone = (lead.mobile || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        if (!company.includes(q) && !contact.includes(q) && !phone.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });

    // Sort leads
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      // Standardize string casing for fair sorting
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return -1 * sortDir;
      if (aVal > bVal) return 1 * sortDir;
      return 0;
    });

    // Pagination
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedLeads = filtered.slice(startIdx, startIdx + pageSize);

    // Filter bar options
    const productOptions = PRODUCTS.map(p => `<option value="${p.id}" ${currentFilters.product === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('');
    const countryOptions = COUNTRIES.map(c => `<option value="${c}" ${currentFilters.country === c ? 'selected' : ''}>${c}</option>`).join('');
    const statusOptions = PIPELINE_STAGES.map(s => `<option value="${s.id}" ${currentFilters.status === s.id ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('');
    const confidenceOptions = CONFIDENCE_SCORES.map(c => `<option value="${c}" ${currentFilters.confidence === c ? 'selected' : ''}>${c}</option>`).join('');
    const priorityOptions = PRIORITIES.map(p => `<option value="${p.id}" ${currentFilters.priority === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('');
    const userOptions = users.map(u => `<option value="${u.id}" ${currentFilters.owner === u.id ? 'selected' : ''}>${u.name}</option>`).join('');

    // Table rows
    const tableRowsHtml = paginatedLeads.map(lead => {
      const isSelected = selectedLeads.has(lead.id) ? 'checked' : '';
      const prodBadges = (lead.productInterest || []).map(pId => {
        const p = PRODUCTS.find(prod => prod.id === pId);
        return p ? `<span class="badge" style="background-color: ${p.color}15; color: ${p.color}; border: 1px solid ${p.color}35; margin-right: 4px; font-size: 10px; font-weight: 600; padding: 2px 6px;" title="${p.name}">${p.name}</span>` : '';
      }).join('');
      
      const statusStage = PIPELINE_STAGES.find(s => s.id === lead.leadStatus) || { name: lead.leadStatus, color: '#666' };
      const priorityObj = PRIORITIES.find(p => p.id === lead.priority) || { name: lead.priority || 'Medium', color: '#6b7280' };
      const ownerUser = users.find(u => u.id === lead.leadOwner) || { name: 'Unassigned' };

      return `
        <tr class="lead-row" data-id="${lead.id}">
          <td class="td-checkbox" onclick="event.stopPropagation();">
            <label class="checkbox-container">
              <input type="checkbox" class="lead-select-checkbox" data-id="${lead.id}" ${isSelected} />
              <span class="checkbox-box"></span>
            </label>
          </td>
          <td class="clickable-row-cell"><strong>${lead.companyName}</strong></td>
          <td class="clickable-row-cell">${lead.country} ${lead.state ? `<span style="color: var(--text-muted); font-size: var(--text-xs);">(${lead.state})</span>` : ''}</td>
          <td class="clickable-row-cell">${prodBadges}</td>
          <td class="clickable-row-cell">${formatDate(lead.createdAt)}</td>
          <td class="clickable-row-cell">${lead.contactPerson || '—'}</td>
          <td class="clickable-row-cell">${lead.mobile || '—'}</td>
          <td class="clickable-row-cell">${lead.email || '—'}</td>
          <td class="clickable-row-cell">
            <span class="badge badge-neutral" style="font-size: 10px; font-weight: 500;">👤 ${ownerUser.name}</span>
          </td>
          <td class="clickable-row-cell">
            <span class="badge" style="background-color: ${statusStage.color}15; color: ${statusStage.color}; border: 1px solid ${statusStage.color}35; font-size: 10px; font-weight: 600; padding: 2px 6px;">${statusStage.name}</span>
          </td>
          <td class="clickable-row-cell">
            <span class="badge" style="background-color: ${priorityObj.color}15; color: ${priorityObj.color}; border: 1px solid ${priorityObj.color}35; font-size: 10px; font-weight: 600; padding: 2px 6px;">${priorityObj.name}</span>
          </td>
          <td class="clickable-row-cell">${lead.leadScore || 50}%</td>
        </tr>
      `;
    }).join('');

    // Pagination HTML
    let paginationHtml = '';
    if (totalPages > 1) {
      paginationHtml = `
        <div class="pagination" style="margin-top: var(--space-4); display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted); font-size: var(--text-sm);">Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, totalCount)} of ${totalCount} leads</span>
          <div class="pagination-buttons">
            <button class="btn btn-outline btn-sm" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span style="margin: 0 var(--space-3); color: var(--text-primary); font-weight: var(--weight-bold);">Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-outline btn-sm" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="leads-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Actions & Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-5); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Lead Database <span class="badge badge-neutral">${totalCount} total</span></h2>
          </div>
          <div class="page-header-actions" style="display: flex; gap: var(--space-3);">
            <button class="btn btn-primary" id="addLeadBtn">➕ Add Lead</button>
            <button class="btn btn-outline" id="importLeadsBtn" data-route="/import">📥 Import CSV</button>
            <button class="btn btn-outline" id="exportLeadsBtn">📤 Export CSV</button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="card" style="margin-bottom: var(--space-5); padding: var(--space-4);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-4);">
            <div class="form-group" style="margin-bottom: 0;">
              <input type="text" id="leadSearchInput" class="form-input" placeholder="Search leads..." value="${currentFilters.search}" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <select id="filterProduct" class="form-select">
                <option value="">All Products</option>
                ${productOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <select id="filterCountry" class="form-select">
                <option value="">All Countries</option>
                ${countryOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <select id="filterStatus" class="form-select">
                <option value="">All Stages</option>
                ${statusOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <select id="filterPriority" class="form-select">
                <option value="">All Priorities</option>
                ${priorityOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <select id="filterOwner" class="form-select">
                <option value="">All Owners</option>
                ${userOptions}
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0; display: flex; align-items: flex-end;">
              <button class="btn btn-outline btn-block" id="clearFiltersBtn">Reset</button>
            </div>
          </div>
        </div>

        <!-- Bulk Action Bar -->
        <div id="bulkActionBar" class="bulk-action-bar" style="display: ${selectedLeads.size > 0 ? 'flex' : 'none'}; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-5); background: rgba(59, 130, 246, 0.15); border: 1px solid var(--color-primary); border-radius: var(--radius-md); margin-bottom: var(--space-5);">
          <span style="color: var(--text-primary); font-weight: var(--weight-bold);">${selectedLeads.size} leads selected</span>
          <div class="bulk-actions" style="display: flex; gap: var(--space-3);">
            <button class="btn btn-sm btn-outline btn-danger" id="bulkDeleteBtn">🗑️ Delete Selected</button>
            <button class="btn btn-sm btn-outline" id="bulkMassUpdateBtn">✏️ Mass Update</button>
          </div>
        </div>

        <!-- Master List Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 48px;">
                    <label class="checkbox-container">
                      <input type="checkbox" id="selectAllLeadsCheckbox" ${selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0 ? 'checked' : ''} />
                      <span class="checkbox-box"></span>
                    </label>
                  </th>
                  ${renderHeaderCell('Company Name', 'companyName')}
                  ${renderHeaderCell('Location', 'country')}
                  <th>Products</th>
                  ${renderHeaderCell('Date Added', 'createdAt')}
                  ${renderHeaderCell('Contact Person', 'contactPerson')}
                  <th>Phone</th>
                  <th>Email</th>
                  ${renderHeaderCell('Owner', 'leadOwner')}
                  ${renderHeaderCell('Stage', 'leadStatus')}
                  ${renderHeaderCell('Priority', 'priority')}
                  ${renderHeaderCell('Score', 'leadScore')}
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml || `<tr><td colspan="12" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No leads match the filters.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        ${paginationHtml}
      </div>
    `;
  }
});

Router.register('/leads/:id', {
  title: 'Lead Detail',
  icon: '👤',
  requiresAuth: true,
  async render(params) {
    const leadId = params.id;
    const lead = await DB.get('leads', leadId);
    if (!lead) {
      return `<div style="padding: var(--space-6); text-align: center;"><h2>Lead not found</h2><a href="/leads" data-route class="btn btn-primary">Back to Leads</a></div>`;
    }

    // Check permissions and load users
    const hasAssignPermission = hasPermission(AppStore.getState().currentUser?.role, PERMISSIONS.LEAD_ASSIGN);
    const users = await DB.getAll('users');

    let ownerSelectHtml = '';
    if (hasAssignPermission) {
      ownerSelectHtml = `
        <select id="leadOwnerSelect" data-lead-id="${lead.id}" class="form-select select-sm" style="display: inline-block; width: auto; font-size: var(--text-xs); padding: 2px 6px; margin-bottom: 0;">
          ${users.map(u => `<option value="${u.id}" ${lead.leadOwner === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
        </select>
      `;
    } else {
      const ownerUser = users.find(u => u.id === lead.leadOwner) || { name: 'Unassigned' };
      ownerSelectHtml = `<span class="badge badge-neutral" style="padding: 3px 8px; font-weight: 500;">👤 ${ownerUser.name}</span>`;
    }

    // Load tasks, activities, documents linked to this lead
    const tasks = (TaskStore.getState().tasks || []).filter(t => t.leadId === leadId);
    const activities = await ActivityStore.getActivitiesForLead(leadId);
    
    // We fetch documents matching leadId from DB
    const documents = await DB.query('documents', 'leadId', leadId);

    // Product badges
    const prodBadges = (lead.productInterest || []).map(pId => {
      const p = PRODUCTS.find(prod => prod.id === pId);
      return p ? `<span class="badge" style="background-color: ${p.color}15; color: ${p.color}; border: 1px solid ${p.color}35; margin-right: 4px; font-size: 11px; font-weight: 600; padding: 3px 8px;">${p.name}</span>` : '';
    }).join('');

    // Pre-filled Outreach Template Texts
    const primaryProduct = lead.productInterest && lead.productInterest[0] ? PRODUCTS.find(p => p.id === lead.productInterest[0])?.name : 'Biomass Pellets';
    const whatsappTemplate = `Hello ${lead.contactPerson || 'sir'},\n\nThis is Subham from Jivanta Global. We are bulk suppliers of high-quality ${primaryProduct}. We have immediate availability for supply in your region.\n\nCould we schedule a quick call to discuss your requirement?\n\nWebsite: www.jivantaglobal.com`;
    
    const emailTemplate = `Subject: Bulk Supply Inquiry - ${primaryProduct} - Jivanta Global\n\nDear ${lead.contactPerson || 'Sir/Madam'},\n\nI hope this email finds you well.\n\nWe would like to introduce Jivanta Global Pvt Ltd as a premier bulk trader and exporter of agricultural commodities and bio-fuels, specifically ${primaryProduct}.\n\nWe understand that ${lead.companyName} requires a reliable supply of these materials. We can deliver consistent quality with prompt shipments.\n\nCould we schedule a brief introduction call next week?\n\nBest regards,\nSubham Jain\nDirector, Jivanta Global\n+91 99999 99999\nwww.jivantaglobal.com`;

    const linkedinTemplate = `Hi ${lead.contactPerson || 'there'},\n\nI noticed you manage procurement at ${lead.companyName}. We supply bulk ${primaryProduct} at competitive prices.\n\nWould love to connect and see if we can support your raw material needs.\n\nBest,\nSubham Jain`;

    // Fetch calls for this lead
    const calls = await DB.query('calls', 'leadId', leadId);
    
    // Compile items: notes, calls, tasks, activities
    const timelineItems = [];

    // 1. Add notes
    if (Array.isArray(lead.notes)) {
      lead.notes.forEach(note => {
        timelineItems.push({
          id: note.id,
          type: 'note',
          date: new Date(note.createdAt),
          rawDate: note.createdAt,
          title: `Note added by ${esc(note.createdBy || 'User')}`,
          content: esc(note.text),
          rawItem: note
        });
      });
    }

    // 2. Add calls
    if (Array.isArray(calls)) {
      calls.forEach(call => {
        timelineItems.push({
          id: call.id,
          type: 'call',
          date: new Date(call.date),
          rawDate: call.date,
          title: `Call logged by ${esc(call.contactPerson || 'User')}`,
          content: `${esc(call.type)} Call | Duration: ${call.duration}s | Outcome: <strong>${esc(call.outcome)}</strong><br/>${esc(call.notes)}`,
          rawItem: call
        });
      });
    }

    // 3. Add tasks
    if (Array.isArray(tasks)) {
      tasks.forEach(task => {
        timelineItems.push({
          id: task.id,
          type: 'task',
          date: new Date(task.createdAt || lead.createdAt),
          rawDate: task.createdAt || lead.createdAt,
          title: `Task scheduled`,
          content: `Task: <strong>${esc(task.title)}</strong> | Due: ${new Date(task.dueDate).toLocaleDateString()} | Priority: ${esc(task.priority)}`,
          status: task.status,
          rawItem: task
        });
      });
    }

    // 4. Add activities (audit logs)
    if (Array.isArray(activities)) {
      activities.forEach(act => {
        if (['stage_change', 'lead_created', 'assignment', 'quotation', 'document', 'import', 'general'].includes(act.type)) {
          timelineItems.push({
            id: act.id,
            type: 'activity',
            date: new Date(act.createdAt),
            rawDate: act.createdAt,
            title: act.type.toUpperCase().replaceAll('_', ' '),
            content: esc(act.description),
            rawItem: act
          });
        }
      });
    }

    // Sort timeline: newest first
    timelineItems.sort((a, b) => b.date - a.date);

    // Render timeline items
    const timelineHtml = timelineItems.map(item => {
      let icon = '⚡';
      let iconBg = 'var(--border)';
      let contentHtml = item.content;
      let actionsHtml = '';

      if (item.type === 'note') {
        icon = '📝';
        iconBg = 'rgba(59, 130, 246, 0.15)';
        contentHtml = `
          <div id="note-display-${item.id}">
            <p style="margin-bottom: var(--space-2); line-height: 1.5; font-size: var(--text-sm); white-space: pre-wrap;">${item.content}</p>
          </div>
          <div id="note-edit-${item.id}" style="display: none; margin-bottom: var(--space-2);">
            <textarea class="form-textarea" rows="3" style="margin-bottom: var(--space-1);">${item.content}</textarea>
            <div style="display: flex; gap: var(--space-2); justify-content: flex-end;">
              <button class="btn btn-xs btn-outline cancel-edit-note-btn" data-id="${item.id}">Cancel</button>
              <button class="btn btn-xs btn-primary save-edited-note-btn" data-id="${item.id}">Save</button>
            </div>
          </div>
        `;
        actionsHtml = `
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn-xs btn-outline edit-timeline-note-btn" data-id="${item.id}">✏️ Edit</button>
            <button class="btn btn-xs btn-outline btn-danger-outline delete-timeline-note-btn" data-id="${item.id}">🗑️ Delete</button>
          </div>
        `;
      } else if (item.type === 'call') {
        icon = '📞';
        iconBg = 'rgba(16, 185, 129, 0.15)';
        actionsHtml = `
          <button class="btn btn-xs btn-outline btn-danger-outline delete-timeline-call-btn" data-id="${item.id}">🗑️ Delete</button>
        `;
      } else if (item.type === 'task') {
        icon = '📅';
        iconBg = 'rgba(245, 158, 11, 0.15)';
        const isCompleted = item.status === 'Done';
        contentHtml = `
          <div style="display: flex; align-items: flex-start; gap: var(--space-2);">
            <label class="checkbox-container" style="margin-top: 2px;">
              <input type="checkbox" class="toggle-timeline-task-btn" data-id="${item.id}" ${isCompleted ? 'checked' : ''} />
              <span class="checkbox-box"></span>
            </label>
            <span style="${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
              ${item.content}
            </span>
          </div>
        `;
        actionsHtml = `
          <button class="btn btn-xs btn-outline btn-danger-outline delete-timeline-task-btn" data-id="${item.id}">🗑️ Delete</button>
        `;
      } else if (item.type === 'activity') {
        icon = '⚙️';
        iconBg = 'rgba(107, 114, 128, 0.15)';
        if (item.title === 'LEAD CREATED') { icon = '🎉'; iconBg = 'rgba(236, 72, 153, 0.15)'; }
        if (item.title === 'STAGE CHANGE') { icon = '🔄'; iconBg = 'rgba(139, 92, 246, 0.15)'; }
        if (item.title === 'ASSIGNMENT') { icon = '👤'; iconBg = 'rgba(6, 182, 212, 0.15)'; }
        if (item.title === 'DOCUMENT') { icon = '📄'; iconBg = 'rgba(59, 130, 246, 0.15)'; }
      }

      return `
        <div class="timeline-item" style="padding-bottom: var(--space-4); position: relative; padding-left: var(--space-6); border-left: 2px solid var(--border); margin-left: var(--space-4);">
          <div class="timeline-dot" style="position: absolute; left: -11px; top: 4px; width: 20px; height: 20px; border-radius: 50%; background-color: var(--bg-card); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 10px; z-index: 1;" title="${item.type}">
            ${icon}
          </div>
          <div class="timeline-content" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap; gap: var(--space-2);">
              <span style="font-size: var(--text-xs); font-weight: var(--weight-bold); text-transform: uppercase; color: var(--text-muted);">${item.title}</span>
              <span style="font-size: var(--text-xs); color: var(--text-muted);">${new Date(item.rawDate).toLocaleString()}</span>
            </div>
            <div style="font-size: var(--text-sm); line-height: 1.5; color: var(--text-primary); margin-bottom: var(--space-3);">
              ${contentHtml}
            </div>
            ${actionsHtml ? `<div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: var(--space-2);">${actionsHtml}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Render page layout
    return `
      <div class="lead-detail-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Details Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6);">
          <div>
            <a href="/leads" data-route class="btn btn-sm btn-outline" style="margin-bottom: var(--space-3);">← Back to Master List</a>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--weight-bold); display: flex; align-items: center; gap: var(--space-3);">
              ${lead.companyName}
              <span class="badge badge-primary">${lead.confidenceScore || 'Medium'} Confidence</span>
            </h2>
            <div style="margin-top: var(--space-2); display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;">
              <span>Interest: ${prodBadges || 'None'}</span>
              <span style="color: var(--text-muted);">|</span>
              <span>Score: ${lead.leadScore || 50}%</span>
              <span style="color: var(--text-muted);">|</span>
              <span style="display: inline-flex; align-items: center; gap: var(--space-2);">Owner: ${ownerSelectHtml}</span>
            </div>
          </div>
          <div style="display: flex; gap: var(--space-3);">
            <button class="btn btn-outline" id="editLeadDetailsBtn" data-id="${lead.id}">✏️ Edit Info</button>
            <button class="btn btn-danger" id="deleteLeadBtn" data-id="${lead.id}">🗑️ Delete Lead</button>
          </div>
        </div>

        <!-- Details Dashboard Grid -->
        <div class="grid grid-3-col" style="gap: var(--space-6); align-items: start;">
          
          <!-- Left 2 Columns: Tabs & Subsections -->
          <div style="grid-column: span 2; display: flex; flex-direction: column; gap: var(--space-6);">
            
            <!-- Quick Fields Grid -->
            <div class="card">
              <div class="card-header"><h3 class="card-title">Key Information</h3></div>
              <div class="card-body grid grid-2-col" style="gap: var(--space-4);">
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">CONTACT PERSON</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.contactPerson || '—'} ${lead.designation ? `(${lead.designation})` : ''}</p>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">LOCATION</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.city ? `${lead.city}, ` : ''}${lead.state ? `${lead.state}, ` : ''}${lead.country}</p>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">MOBILE / PHONE</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.mobile ? `<a href="tel:${lead.mobile}" style="color: var(--color-primary);">${lead.mobile}</a>` : '—'}</p>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">EMAIL</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.email ? `<a href="mailto:${lead.email}" style="color: var(--color-primary);">${lead.email}</a>` : '—'}</p>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">WEBSITE</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.website ? `<a href="${lead.website}" target="_blank" style="color: var(--color-primary);">${lead.website}</a>` : '—'}</p>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">LINKEDIN</span>
                  <p style="font-weight: var(--weight-medium); margin-top: var(--space-1);">${lead.linkedin ? `<a href="${lead.linkedin}" target="_blank" style="color: var(--color-primary);">${lead.linkedin}</a>` : '—'}</p>
                </div>
                <div style="grid-column: span 2;">
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">LEAD OWNER</span>
                  <div style="margin-top: var(--space-1);">${ownerSelectHtml}</div>
                </div>
                <div style="grid-column: span 2;">
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">IMPORT/EXPORT EVIDENCE</span>
                  <p style="margin-top: var(--space-1); line-height: 1.5; font-size: var(--text-sm);">${lead.importExportEvidence || 'No historical import/export evidence verified.'}</p>
                </div>
              </div>
            </div>

            <!-- Outreach Templates -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Outreach Templates</h3>
                <p class="card-subtitle">Personalized communication templates ready for copy & send</p>
              </div>
              <div class="card-body">
                <div class="tabs" style="margin-bottom: var(--space-4);">
                  <button class="btn btn-sm btn-outline tab-btn active" data-tab="tab-wa">WhatsApp</button>
                  <button class="btn btn-sm btn-outline tab-btn" data-tab="tab-email">Email</button>
                  <button class="btn btn-sm btn-outline tab-btn" data-tab="tab-li">LinkedIn</button>
                </div>

                <div id="tab-wa" class="tab-pane-content">
                  <pre class="outreach-box" id="waText">${whatsappTemplate}</pre>
                  <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-3);">
                    <button class="btn btn-sm btn-outline copy-template-btn" data-target="waText">📋 Copy Text</button>
                    ${lead.mobile ? `<a href="https://wa.me/${lead.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappTemplate)}" target="_blank" class="btn btn-sm btn-primary">📱 Open WhatsApp</a>` : ''}
                  </div>
                </div>

                <div id="tab-email" class="tab-pane-content" style="display: none;">
                  <pre class="outreach-box" id="emailText">${emailTemplate}</pre>
                  <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-3);">
                    <button class="btn btn-sm btn-outline copy-template-btn" data-target="emailText">📋 Copy Email</button>
                    ${lead.email ? `<button class="btn btn-sm btn-primary" id="openZohoComposeBtn" data-email="${lead.email}">✉️ Send Email</button>` : ''}
                  </div>
                </div>

                <div id="tab-li" class="tab-pane-content" style="display: none;">
                  <pre class="outreach-box" id="liText">${linkedinTemplate}</pre>
                  <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-3);">
                    <button class="btn btn-sm btn-outline copy-template-btn" data-target="liText">📋 Copy Message</button>
                    ${lead.linkedin ? `<a href="${lead.linkedin}" target="_blank" class="btn btn-sm btn-primary">🔗 Open Profile</a>` : ''}
                  </div>
                </div>
              </div>
            </div>

            <!-- Linked Tasks -->
            <div class="card">
              <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="card-title">Tasks & Reminders</h3>
                <button class="btn btn-sm btn-outline" id="addLeadTaskBtn" data-id="${lead.id}">➕ New Task</button>
              </div>
              <div class="card-body">
                ${tasks.length > 0 ? `
                  <div class="tasks-list">
                    ${tasks.map(t => `
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border);">
                        <div>
                          <strong style="${t.status === 'Done' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.title}</strong>
                          <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1);">Due: ${new Date(t.dueDate).toLocaleDateString()} | Priority: ${t.priority}</div>
                        </div>
                        <div>
                          ${t.status !== 'Done' ? `<button class="btn btn-xs btn-primary mark-task-done-btn" data-id="${t.id}">Done</button>` : `<span style="color: var(--color-success); font-size: var(--text-sm);">✓ Completed</span>`}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : '<p style="color: var(--text-muted); text-align: center;">No active tasks scheduled.</p>'}
              </div>
            </div>
          </div>

          <!-- Right Column: Action Logger & Unified Timeline -->
          <div style="display: flex; flex-direction: column; gap: var(--space-6);">
            
            <!-- Action Logger Card -->
            <div class="card">
              <div class="card-header"><h3 class="card-title">Action Logger</h3></div>
              <div class="card-body">
                <div class="tabs" style="margin-bottom: var(--space-4);">
                  <button class="btn btn-sm btn-outline logger-tab-btn active" data-tab="logger-tab-note">📝 Note</button>
                  <button class="btn btn-sm btn-outline logger-tab-btn" data-tab="logger-tab-call">📞 Call</button>
                  <button class="btn btn-sm btn-outline logger-tab-btn" data-tab="logger-tab-activity">⚙️ Custom Activity</button>
                </div>

                <!-- Add Note Tab -->
                <div id="logger-tab-note" class="logger-tab-pane-content">
                  <form id="loggerAddNoteForm">
                    <input type="hidden" id="noteLeadId" value="${lead.id}" />
                    <textarea id="noteTextInput" class="form-textarea" rows="3" required placeholder="Add outreach notes..." style="margin-bottom: var(--space-2);"></textarea>
                    <button type="submit" class="btn btn-sm btn-primary btn-block">Save Note</button>
                  </form>
                </div>

                <!-- Log Call Tab -->
                <div id="logger-tab-call" class="logger-tab-pane-content" style="display: none;">
                  <form id="loggerLogCallForm">
                    <input type="hidden" id="callLeadId" value="${lead.id}" />
                    <div class="grid grid-2-col" style="gap: var(--space-3); margin-bottom: var(--space-3);">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Call Type</label>
                        <select id="callTypeSelect" class="form-select select-sm">
                          <option value="Outgoing">Outgoing</option>
                          <option value="Incoming">Incoming</option>
                        </select>
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Outcome</label>
                        <select id="callOutcomeSelect" class="form-select select-sm">
                          <option value="Connected">Connected</option>
                          <option value="Interested">Interested</option>
                          <option value="Busy">Busy</option>
                          <option value="No Answer">No Answer</option>
                          <option value="Left Voicemail">Left Voicemail</option>
                          <option value="Not Interested">Not Interested</option>
                        </select>
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Duration (Secs)</label>
                        <input type="number" id="callDurationInput" class="form-input input-sm" value="60" required />
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Contact Person</label>
                        <input type="text" id="callContactInput" class="form-input input-sm" value="${lead.contactPerson || ''}" />
                      </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: var(--space-3);">
                      <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Call Summary</label>
                      <textarea id="callNotesInput" class="form-textarea" rows="2" placeholder="Summary of what was discussed..." required></textarea>
                    </div>

                    <!-- Follow-up Checkbox & Subfields -->
                    <div style="margin-bottom: var(--space-3); border-top: 1px solid var(--border); padding-top: var(--space-2);">
                      <label class="checkbox-container" style="display: flex; align-items: center; font-size: var(--text-xs);">
                        <input type="checkbox" id="scheduleCallFollowUpCheck" />
                        <span class="checkbox-box" style="margin-right: 6px;"></span>
                        <span>Schedule follow-up task?</span>
                      </label>
                      <div id="followUpTaskConfig" style="display: none; margin-top: var(--space-2); padding-left: var(--space-4);">
                        <div class="form-group" style="margin-bottom: var(--space-2);">
                          <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Task Title</label>
                          <input type="text" id="followUpTitle" class="form-input input-sm" placeholder="Follow-up task title..." />
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                          <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Due Date</label>
                          <input type="date" id="followUpDate" class="form-input input-sm" value="${new Date(Date.now() + 86400000*2).toISOString().slice(0, 10)}" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" class="btn btn-sm btn-primary btn-block">Log Call</button>
                  </form>
                </div>

                <!-- Log Custom Activity Tab -->
                <div id="logger-tab-activity" class="logger-tab-pane-content" style="display: none;">
                  <form id="loggerLogActivityForm">
                    <input type="hidden" id="activityLeadId" value="${lead.id}" />
                    <div class="form-group" style="margin-bottom: var(--space-3);">
                      <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Activity Type / Channel</label>
                      <select id="activityTypeSelect" class="form-select select-sm">
                        <option value="WhatsApp Outreach">WhatsApp Outreach</option>
                        <option value="Sample Sent">Sample Sent</option>
                        <option value="Price Sheet Shared">Price Sheet Shared</option>
                        <option value="Meeting Details">Meeting Details</option>
                        <option value="Custom Activity">Other Custom Activity</option>
                      </select>
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-3);">
                      <label class="form-label" style="font-size: var(--text-xs); font-weight: 600;">Description / Summary</label>
                      <textarea id="activityNotesInput" class="form-textarea" rows="3" placeholder="Describe the activity..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-sm btn-primary btn-block">Log Activity</button>
                  </form>
                </div>
              </div>
            </div>

            <!-- Documents -->
            <div class="card">
              <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="card-title">Documents</h3>
                <button class="btn btn-sm btn-outline" id="uploadLeadDocBtn" data-id="${lead.id}">📁 Upload</button>
              </div>
              <div class="card-body">
                ${documents.length > 0 ? `
                  <div class="document-list">
                    ${documents.map(doc => `
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--border);">
                        <a href="#" class="view-doc-link" data-path="${doc.filePath || ''}" style="color: var(--color-primary); font-size: var(--text-sm); font-weight: var(--weight-medium);">${doc.name}</a>
                        <span class="badge badge-neutral" style="font-size: 10px;">${doc.category}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : '<p style="color: var(--text-muted); text-align: center;">No documents uploaded.</p>'}
              </div>
            </div>

            <!-- Unified Activity Timeline -->
            <div class="card">
              <div class="card-header"><h3 class="card-title">Activity Timeline</h3></div>
              <div class="card-body" style="max-height: 500px; overflow-y: auto; padding: var(--space-4) var(--space-2);">
                ${timelineHtml ? `
                  <div class="timeline" style="margin-left: 0;">
                    ${timelineHtml}
                  </div>
                ` : '<p style="color: var(--text-muted); text-align: center; padding: var(--space-4);">No activities logged yet.</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

// Event handling
document.addEventListener('change', async (e) => {
  // Filters change
  if (e.target && e.target.id === 'filterProduct') { currentFilters.product = e.target.value; currentPage = 1; Router.reload(); }
  if (e.target && e.target.id === 'filterCountry') { currentFilters.country = e.target.value; currentPage = 1; Router.reload(); }
  if (e.target && e.target.id === 'filterStatus') { currentFilters.status = e.target.value; currentPage = 1; Router.reload(); }
  if (e.target && e.target.id === 'filterPriority') { currentFilters.priority = e.target.value; currentPage = 1; Router.reload(); }
  if (e.target && e.target.id === 'filterOwner') { currentFilters.owner = e.target.value; currentPage = 1; Router.reload(); }

  // Lead Owner Assignment dropdown
  if (e.target && e.target.id === 'leadOwnerSelect') {
    const leadId = e.target.dataset.id || e.target.dataset.leadId;
    const newOwnerId = e.target.value;
    const lead = await DB.get('leads', leadId);
    if (lead) {
      lead.leadOwner = newOwnerId;
      lead.updatedAt = new Date().toISOString();
      await LeadStore.updateLead(lead.id, lead);
      
      const users = await DB.getAll('users');
      const newOwner = users.find(u => u.id === newOwnerId) || { name: 'Unknown' };
      
      await ActivityStore.logActivity({
        leadId: leadId,
        type: 'assignment',
        description: `Assigned lead to ${newOwner.name}`
      });
      
      renderToast(`Assigned lead to ${newOwner.name}`, 'success');
      Router.reload();
    }
  }

  // Toggle follow-up task config
  if (e.target && e.target.id === 'scheduleCallFollowUpCheck') {
    const configDiv = document.getElementById('followUpTaskConfig');
    if (configDiv) {
      configDiv.style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked) {
        const titleInput = document.getElementById('followUpTitle');
        if (titleInput && !titleInput.value) {
          const companyNameElement = document.querySelector('.lead-detail-page h2');
          const companyName = companyNameElement ? companyNameElement.textContent.trim().split('\n')[0] : 'Lead';
          titleInput.value = `Follow up call with ${companyName}`;
        }
      }
    }
  }

  // Toggle task status on timeline
  if (e.target && e.target.classList.contains('toggle-timeline-task-btn')) {
    const id = e.target.dataset.id;
    const isCompleted = e.target.checked;
    const leadId = Router.currentParams.id;
    
    if (isCompleted) {
      await TaskStore.completeTask(id);
      renderToast('Task marked completed.', 'success');
    } else {
      const task = await DB.get('tasks', id);
      if (task) {
        task.status = 'Todo';
        task.updatedAt = new Date().toISOString();
        await DB.put('tasks', task);
        
        const tasks = TaskStore.getState().tasks || [];
        const idx = tasks.findIndex(t => t.id === id);
        if (idx > -1) {
          tasks[idx] = task;
          TaskStore.setState({ tasks: [...tasks] });
        }
        
        await ActivityStore.logActivity({
          leadId: leadId,
          type: 'task',
          description: `Reopened task: "${task.title}"`
        });
        
        renderToast('Task marked incomplete.', 'info');
      }
    }
    Router.reload();
  }

  // Checkbox select lead
  if (e.target && e.target.classList.contains('lead-select-checkbox')) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      selectedLeads.add(id);
    } else {
      selectedLeads.delete(id);
    }
    updateBulkActionBar();
  }

  // Select all checkbox
  if (e.target && e.target.id === 'selectAllLeadsCheckbox') {
    const tableCheckboxes = document.querySelectorAll('.lead-select-checkbox');
    tableCheckboxes.forEach(cb => {
      cb.checked = e.target.checked;
      const id = cb.dataset.id;
      if (e.target.checked) {
        selectedLeads.add(id);
      } else {
        selectedLeads.delete(id);
      }
    });
    updateBulkActionBar();
  }
});

let searchDebounce = null;
document.addEventListener('input', (e) => {
  // Debounced search
  if (e.target && e.target.id === 'leadSearchInput') {
    const q = e.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentFilters.search = q;
      currentPage = 1;
      Router.reload();
      
      // Restore focus and cursor position after SPA page reload
      setTimeout(() => {
        const input = document.getElementById('leadSearchInput');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 50);
    }, 300);
  }
});

document.addEventListener('click', async (e) => {
  // Sortable header click
  const sortHeader = e.target.closest('.sortable-header');
  if (sortHeader) {
    const field = sortHeader.dataset.sortField;
    if (sortField === field) {
      sortDir = sortDir * -1; // toggle direction
    } else {
      sortField = field;
      sortDir = -1; // default to descending (e.g. for newest first on Date Added)
    }
    currentPage = 1;
    Router.reload();
    return;
  }

  // Click on row to navigate to details
  const cell = e.target.closest('.clickable-row-cell');
  if (cell) {
    const row = cell.closest('tr');
    if (row && row.dataset.id) {
      Router.navigate(`/leads/${row.dataset.id}`);
    }
  }

  // Clear filters button
  if (e.target && e.target.id === 'clearFiltersBtn') {
    currentFilters = { product: '', country: '', status: '', confidence: '', priority: '', owner: '', search: '' };
    sortField = 'createdAt';
    sortDir = -1;
    currentPage = 1;
    Router.reload();
  }

  // Pagination buttons
  if (e.target && e.target.id === 'prevPageBtn') {
    if (currentPage > 1) {
      currentPage--;
      Router.reload();
    }
  }
  if (e.target && e.target.id === 'nextPageBtn') {
    currentPage++;
    Router.reload();
  }

  // Add lead modal triggers
  if (e.target && e.target.id === 'addLeadBtn') {
    showAddLeadModal();
  }

  // Edit lead modal triggers
  if (e.target && e.target.id === 'editLeadDetailsBtn') {
    showEditLeadModal(e.target.dataset.id);
  }

  // Delete lead triggers
  if (e.target && e.target.id === 'deleteLeadBtn') {
    const id = e.target.dataset.id;
    if (confirm('Are you sure you want to delete this lead? This cannot be undone.')) {
      await LeadStore.deleteLead(id);
      renderToast('Lead deleted successfully.', 'success');
      Router.navigate('/leads');
    }
  }

  // Copy outreach message text
  if (e.target && e.target.classList.contains('copy-template-btn')) {
    const targetId = e.target.dataset.target;
    const txt = document.getElementById(targetId).textContent;
    navigator.clipboard.writeText(txt);
    renderToast('Copied outreach text to clipboard!', 'success');
  }

  // Switch outreach tabs
  if (e.target && e.target.classList.contains('tab-btn')) {
    const tabId = e.target.dataset.tab;
    const parent = e.target.closest('.card-body');
    parent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    parent.querySelectorAll('.tab-pane-content').forEach(pane => pane.style.display = 'none');
    parent.querySelector(`#${tabId}`).style.display = 'block';
  }

  // Mark task done
  if (e.target && e.target.classList.contains('mark-task-done-btn')) {
    const taskId = e.target.dataset.id;
    await TaskStore.completeTask(taskId);
    renderToast('Task marked completed.', 'success');
    Router.reload();
  }

  // Add task on lead page
  if (e.target && e.target.id === 'addLeadTaskBtn') {
    showAddTaskModalForLead(e.target.dataset.id);
  }

  // Bulk delete action
  if (e.target && e.target.id === 'bulkDeleteBtn') {
    if (confirm(`Are you sure you want to delete all ${selectedLeads.size} selected leads?`)) {
      AppStore.setLoading(true);
      for (const id of selectedLeads) {
        await LeadStore.deleteLead(id);
      }
      selectedLeads.clear();
      renderToast('Bulk delete completed.', 'success');
      AppStore.setLoading(false);
      Router.reload();
    }
  }

  // Bulk mass update
  if (e.target && e.target.id === 'bulkMassUpdateBtn') {
    showBulkUpdateModal();
  }

  // Export CSV
  if (e.target && e.target.id === 'exportLeadsBtn') {
    exportLeadsCSV();
  }

  // Action logger tabs switch
  if (e.target && e.target.classList.contains('logger-tab-btn')) {
    const tabId = e.target.dataset.tab;
    const parent = e.target.closest('.card-body');
    parent.querySelectorAll('.logger-tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    parent.querySelectorAll('.logger-tab-pane-content').forEach(pane => pane.style.display = 'none');
    parent.querySelector(`#${tabId}`).style.display = 'block';
  }

  // Edit note on timeline
  if (e.target && e.target.classList.contains('edit-timeline-note-btn')) {
    const id = e.target.dataset.id;
    document.getElementById(`note-display-${id}`).style.display = 'none';
    document.getElementById(`note-edit-${id}`).style.display = 'block';
  }

  // Cancel edit note
  if (e.target && e.target.classList.contains('cancel-edit-note-btn')) {
    const id = e.target.dataset.id;
    document.getElementById(`note-display-${id}`).style.display = 'block';
    document.getElementById(`note-edit-${id}`).style.display = 'none';
  }

  // Save edited note on timeline
  if (e.target && e.target.classList.contains('save-edited-note-btn')) {
    const id = e.target.dataset.id;
    const textarea = document.querySelector(`#note-edit-${id} textarea`);
    if (textarea) {
      const newText = textarea.value;
      const leadId = Router.currentParams.id;
      const lead = await DB.get('leads', leadId);
      if (lead && Array.isArray(lead.notes)) {
        const note = lead.notes.find(n => n.id === id);
        if (note) {
          const oldText = note.text;
          note.text = newText;
          note.updatedAt = new Date().toISOString();
          lead.updatedAt = new Date().toISOString();
          await LeadStore.updateLead(lead.id, lead);
          
          await ActivityStore.logActivity({
            leadId: lead.id,
            type: 'note',
            description: `Edited note: "${oldText.substring(0, 20)}..." to "${newText.substring(0, 20)}..."`
          });
          
          renderToast('Note updated successfully.', 'success');
          Router.reload();
        }
      }
    }
  }

  // Delete note from timeline
  if (e.target && e.target.classList.contains('delete-timeline-note-btn')) {
    if (confirm('Are you sure you want to delete this note?')) {
      const id = e.target.dataset.id;
      const leadId = Router.currentParams.id;
      const lead = await DB.get('leads', leadId);
      if (lead && Array.isArray(lead.notes)) {
        const noteIndex = lead.notes.findIndex(n => n.id === id);
        if (noteIndex > -1) {
          const deletedNote = lead.notes.splice(noteIndex, 1)[0];
          lead.updatedAt = new Date().toISOString();
          await LeadStore.updateLead(lead.id, lead);

          await ActivityStore.logActivity({
            leadId: lead.id,
            type: 'note',
            description: `Deleted note: "${deletedNote.text.substring(0, 20)}..."`
          });

          renderToast('Note deleted successfully.', 'success');
          Router.reload();
        }
      }
    }
  }

  // Delete call from timeline
  if (e.target && e.target.classList.contains('delete-timeline-call-btn')) {
    if (confirm('Are you sure you want to delete this call log?')) {
      const id = e.target.dataset.id;
      const leadId = Router.currentParams.id;
      const call = await DB.get('calls', id);
      if (call) {
        await DB.delete('calls', id);
        
        await ActivityStore.logActivity({
          leadId: leadId,
          type: 'call',
          description: `Deleted call log: "${call.notes.substring(0, 20)}..."`
        });

        renderToast('Call log deleted successfully.', 'success');
        Router.reload();
      }
    }
  }

  // Delete task from timeline
  if (e.target && e.target.classList.contains('delete-timeline-task-btn')) {
    if (confirm('Are you sure you want to delete this task?')) {
      const id = e.target.dataset.id;
      const leadId = Router.currentParams.id;
      const task = await DB.get('tasks', id);
      if (task) {
        await DB.delete('tasks', id);
        
        const tasks = TaskStore.getState().tasks || [];
        TaskStore.setState({ tasks: tasks.filter(t => t.id !== id) });
        
        await ActivityStore.logActivity({
          leadId: leadId,
          type: 'task',
          description: `Deleted task: "${task.title}"`
        });

        renderToast('Task deleted successfully.', 'success');
        Router.reload();
      }
    }
  }

  // Open Zoho Compose Modal
  if (e.target && e.target.id === 'openZohoComposeBtn') {
    const email = e.target.dataset.email;
    const leadId = Router.currentParams.id;
    const lead = await DB.get('leads', leadId);
    if (lead) {
      const primaryProduct = lead.productInterest && lead.productInterest[0] ? PRODUCTS.find(p => p.id === lead.productInterest[0])?.name : 'Biomass Pellets';
      const emailTemplate = `Subject: Bulk Supply Inquiry - ${primaryProduct} - Jivanta Global\n\nDear ${lead.contactPerson || 'Sir/Madam'},\n\nI hope this email finds you well.\n\nWe would like to introduce Jivanta Global Pvt Ltd as a premier bulk trader and exporter of agricultural commodities and bio-fuels, specifically ${primaryProduct}.\n\nWe understand that ${lead.companyName} requires a reliable supply of these materials. We can deliver consistent quality with prompt shipments.\n\nCould we schedule a brief introduction call next week?\n\nBest regards,\nSubham Jain\nDirector, Jivanta Global\n+91 99999 99999\nwww.jivantaglobal.com`;

      const defaultSubject = `Bulk Supply Inquiry - ${primaryProduct} - Jivanta Global`;
      const defaultBody = emailTemplate.split('\n\n').slice(1).join('\n\n');
      showZohoComposeModal(leadId, email, defaultSubject, defaultBody);
    }
  }
});

document.addEventListener('submit', async (e) => {
  // Add Note Form
  if (e.target && e.target.id === 'loggerAddNoteForm') {
    e.preventDefault();
    const leadId = document.getElementById('noteLeadId').value;
    const text = document.getElementById('noteTextInput').value;

    const lead = await DB.get('leads', leadId);
    if (lead) {
      const now = new Date().toISOString();
      const newNote = {
        id: generateId('NOTE'),
        text: text,
        createdAt: now,
        createdBy: AppStore.getState().currentUser?.name || 'Admin'
      };
      
      lead.notes = lead.notes || [];
      lead.notes.unshift(newNote);
      lead.updatedAt = now;

      await LeadStore.updateLead(lead.id, lead);
      await ActivityStore.logActivity({
        leadId: leadId,
        type: 'note',
        description: `Added note: "${text.substring(0, 40)}..."`
      });

      renderToast('Note added successfully.', 'success');
      Router.reload();
    }
  }

  // Log Call Form
  if (e.target && e.target.id === 'loggerLogCallForm') {
    e.preventDefault();
    const leadId = document.getElementById('callLeadId').value;
    const type = document.getElementById('callTypeSelect').value;
    const outcome = document.getElementById('callOutcomeSelect').value;
    const duration = document.getElementById('callDurationInput').value;
    const contactPerson = document.getElementById('callContactInput').value;
    const notes = document.getElementById('callNotesInput').value;

    const lead = await DB.get('leads', leadId);
    if (lead) {
      const now = new Date().toISOString();
      const callRecord = {
        id: generateId('CALL'),
        leadId,
        contactPerson,
        type,
        duration,
        outcome,
        notes,
        date: now
      };
      
      await DB.put('calls', callRecord);

      if (lead.leadStatus === 'new_lead' && (outcome === 'Connected' || outcome === 'Interested')) {
        lead.leadStatus = 'contacted';
      }
      lead.lastActivity = now;
      lead.updatedAt = now;
      await LeadStore.updateLead(lead.id, lead);

      await ActivityStore.logActivity({
        leadId: leadId,
        type: 'call',
        description: `Logged ${type.toLowerCase()} call: "${notes.substring(0, 40)}..." (${outcome})`
      });

      const scheduleTask = document.getElementById('scheduleCallFollowUpCheck').checked;
      if (scheduleTask) {
        const taskTitle = document.getElementById('followUpTitle').value || `Call follow-up with ${lead.companyName}`;
        const dueDate = document.getElementById('followUpDate').value;
        const newTask = {
          id: generateId('TASK'),
          leadId: leadId,
          title: taskTitle,
          dueDate: dueDate,
          priority: 'medium',
          status: 'Todo',
          assignedTo: AppStore.getState().currentUser?.id || 'admin',
          createdAt: now
        };
        await TaskStore.addTask(newTask);

        await ActivityStore.logActivity({
          leadId: leadId,
          type: 'task',
          description: `Scheduled task: "${newTask.title}" for ${new Date(newTask.dueDate).toLocaleDateString()}`
        });
      }

      renderToast('Call logged successfully.', 'success');
      Router.reload();
    }
  }

  // Log Activity Form
  if (e.target && e.target.id === 'loggerLogActivityForm') {
    e.preventDefault();
    const leadId = document.getElementById('activityLeadId').value;
    const type = document.getElementById('activityTypeSelect').value;
    const notes = document.getElementById('activityNotesInput').value;

    const lead = await DB.get('leads', leadId);
    if (lead) {
      const now = new Date().toISOString();
      
      await ActivityStore.logActivity({
        leadId: leadId,
        type: 'general',
        description: `Logged Activity (${type}): ${notes}`
      });

      lead.lastActivity = now;
      lead.updatedAt = now;
      await LeadStore.updateLead(lead.id, lead);

      renderToast('Activity logged successfully.', 'success');
      Router.reload();
    }
  }
});

function updateBulkActionBar() {
  const bar = document.getElementById('bulkActionBar');
  if (bar) {
    if (selectedLeads.size > 0) {
      bar.style.display = 'flex';
      bar.querySelector('span').textContent = `${selectedLeads.size} leads selected`;
    } else {
      bar.style.display = 'none';
    }
  }
}

// Add Lead Modal rendering & save logic
function showAddLeadModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const productCheckboxes = PRODUCTS.map(p => `
    <label class="checkbox-container" style="margin-right: var(--space-4); display: inline-flex; align-items: center;">
      <input type="checkbox" name="productInterest" value="${p.id}" />
      <span class="checkbox-box" style="margin-right: 6px;"></span>
      <span style="font-size: var(--text-sm);">${p.icon} ${p.name}</span>
    </label>
  `).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="addLeadModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">Create New Lead</h3>
          <button class="modal-close" onclick="document.getElementById('addLeadModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form id="newLeadForm">
            <div class="grid grid-2-col" style="gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label">Company Name *</label>
                <input type="text" id="addLeadCompanyName" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Industry / Buyer Type</label>
                <input type="text" id="addLeadIndustry" class="form-input" placeholder="e.g. Paper Mill, Snack Food" />
              </div>
              <div class="form-group">
                <label class="form-label">Contact Person</label>
                <input type="text" id="addLeadContact" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Designation</label>
                <input type="text" id="addLeadDesignation" class="form-input" placeholder="e.g. Procurement Manager" />
              </div>
              <div class="form-group">
                <label class="form-label">Mobile Number</label>
                <input type="text" id="addLeadMobile" class="form-input" placeholder="e.g. +91 9876543210" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Contact</label>
                <input type="text" id="addLeadWhatsapp" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="addLeadEmail" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Website URL</label>
                <input type="text" id="addLeadWebsite" class="form-input" placeholder="https://..." />
              </div>
              <div class="form-group">
                <label class="form-label">Country *</label>
                <select id="addLeadCountry" class="form-select" required>
                  ${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">State / Region</label>
                <input type="text" id="addLeadState" class="form-input" placeholder="e.g. Gujarat, California" />
              </div>
              <div class="form-group">
                <label class="form-label">Estimated Buying Capacity</label>
                <input type="text" id="addLeadCapacity" class="form-input" placeholder="e.g. 5,000 MT/year, ₹25 Lakhs" />
              </div>
              <div class="form-group">
                <label class="form-label">Outreach Priority</label>
                <select id="addLeadPriority" class="form-select">
                  ${PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'medium' ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Products of Interest *</label>
                <div style="margin-top: var(--space-2);">${productCheckboxes}</div>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Import / Export Evidence or Notes</label>
                <textarea id="addLeadEvidence" class="form-textarea" rows="3" placeholder="Add verified import/export data, shipping port data or source links..."></textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('addLeadModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveNewLeadBtn">Create Lead</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveNewLeadBtn').addEventListener('click', async () => {
    const form = document.getElementById('newLeadForm');
    if (!form.reportValidity()) return;

    const companyName = document.getElementById('addLeadCompanyName').value;
    const country = document.getElementById('addLeadCountry').value;
    const productsSelected = Array.from(form.elements.productInterest)
      .filter(input => input.checked)
      .map(input => input.value);

    if (productsSelected.length === 0) {
      alert('Please select at least one product of interest.');
      return;
    }

    const newLead = {
      id: generateId('LEAD'),
      companyName,
      industry: document.getElementById('addLeadIndustry').value,
      country,
      state: document.getElementById('addLeadState').value,
      contactPerson: document.getElementById('addLeadContact').value,
      designation: document.getElementById('addLeadDesignation').value,
      mobile: document.getElementById('addLeadMobile').value,
      whatsapp: document.getElementById('addLeadWhatsapp').value,
      email: document.getElementById('addLeadEmail').value,
      website: document.getElementById('addLeadWebsite').value,
      estimatedBuyingCapacity: document.getElementById('addLeadCapacity').value,
      priority: document.getElementById('addLeadPriority').value,
      productInterest: productsSelected,
      importExportEvidence: document.getElementById('addLeadEvidence').value,
      leadStatus: 'new_lead',
      leadScore: 60,
      leadOwner: AppStore.getState().currentUser?.id || 'admin',
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await LeadStore.addLead(newLead);
    await ActivityStore.logActivity({
      leadId: newLead.id,
      type: 'lead_created',
      description: `Created new lead: "${newLead.companyName}"`
    });

    renderToast('New lead created successfully.', 'success');
    document.getElementById('addLeadModalOverlay').remove();
    Router.reload();
  });
}

// Edit Lead Modal rendering & save logic
async function showEditLeadModal(id) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const lead = await DB.get('leads', id);
  if (!lead) return;

  const productCheckboxes = PRODUCTS.map(p => {
    const isChecked = (lead.productInterest || []).includes(p.id) ? 'checked' : '';
    return `
      <label class="checkbox-container" style="margin-right: var(--space-4); display: inline-flex; align-items: center;">
        <input type="checkbox" name="productInterest" value="${p.id}" ${isChecked} />
        <span class="checkbox-box" style="margin-right: 6px;"></span>
        <span style="font-size: var(--text-sm);">${p.icon} ${p.name}</span>
      </label>
    `;
  }).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="editLeadModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">Edit Lead Details</h3>
          <button class="modal-close" onclick="document.getElementById('editLeadModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form id="editLeadForm">
            <div class="grid grid-2-col" style="gap: var(--space-4);">
              <div class="form-group">
                <label class="form-label">Company Name *</label>
                <input type="text" id="editLeadCompanyName" class="form-input" value="${lead.companyName || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Industry / Buyer Type</label>
                <input type="text" id="editLeadIndustry" class="form-input" value="${lead.industry || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Contact Person</label>
                <input type="text" id="editLeadContact" class="form-input" value="${lead.contactPerson || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Designation</label>
                <input type="text" id="editLeadDesignation" class="form-input" value="${lead.designation || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Mobile Number</label>
                <input type="text" id="editLeadMobile" class="form-input" value="${lead.mobile || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Contact</label>
                <input type="text" id="editLeadWhatsapp" class="form-input" value="${lead.whatsapp || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="editLeadEmail" class="form-input" value="${lead.email || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Website URL</label>
                <input type="text" id="editLeadWebsite" class="form-input" value="${lead.website || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Country *</label>
                <select id="editLeadCountry" class="form-select" required>
                  ${COUNTRIES.map(c => `<option value="${c}" ${lead.country === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">State / Region</label>
                <input type="text" id="editLeadState" class="form-input" value="${lead.state || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Estimated Buying Capacity</label>
                <input type="text" id="editLeadCapacity" class="form-input" value="${lead.estimatedBuyingCapacity || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Outreach Priority</label>
                <select id="editLeadPriority" class="form-select">
                  ${PRIORITIES.map(p => `<option value="${p.id}" ${lead.priority === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Products of Interest *</label>
                <div style="margin-top: var(--space-2);">${productCheckboxes}</div>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Import / Export Evidence or Notes</label>
                <textarea id="editLeadEvidence" class="form-textarea" rows="3">${lead.importExportEvidence || ''}</textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('editLeadModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveEditLeadBtn">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveEditLeadBtn').addEventListener('click', async () => {
    const form = document.getElementById('editLeadForm');
    if (!form.reportValidity()) return;

    const companyName = document.getElementById('editLeadCompanyName').value;
    const country = document.getElementById('editLeadCountry').value;
    const productsSelected = Array.from(form.elements.productInterest)
      .filter(input => input.checked)
      .map(input => input.value);

    if (productsSelected.length === 0) {
      alert('Please select at least one product of interest.');
      return;
    }

    const updated = {
      ...lead,
      companyName,
      industry: document.getElementById('editLeadIndustry').value,
      country,
      state: document.getElementById('editLeadState').value,
      contactPerson: document.getElementById('editLeadContact').value,
      designation: document.getElementById('editLeadDesignation').value,
      mobile: document.getElementById('editLeadMobile').value,
      whatsapp: document.getElementById('editLeadWhatsapp').value,
      email: document.getElementById('editLeadEmail').value,
      website: document.getElementById('editLeadWebsite').value,
      estimatedBuyingCapacity: document.getElementById('editLeadCapacity').value,
      priority: document.getElementById('editLeadPriority').value,
      productInterest: productsSelected,
      importExportEvidence: document.getElementById('editLeadEvidence').value,
      updatedAt: new Date().toISOString()
    };

    await LeadStore.updateLead(updated.id, updated);
    await ActivityStore.logActivity({
      leadId: id,
      type: 'lead_updated',
      description: `Updated details for lead: "${updated.companyName}"`
    });

    renderToast('Lead details saved successfully.', 'success');
    document.getElementById('editLeadModalOverlay').remove();
    Router.reload();
  });
}

// Bulk mass update modal
async function showBulkUpdateModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const users = await DB.getAll('users');
  const stageOptions = PIPELINE_STAGES.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
  const priorityOptions = PRIORITIES.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="bulkUpdateModalOverlay">
      <div class="modal animate-slideUp">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Mass Update Leads</h3>
          <button class="modal-close" onclick="document.getElementById('bulkUpdateModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: var(--space-4); color: var(--text-muted); font-size: var(--text-sm);">
            Apply changes to all <strong>${selectedLeads.size}</strong> selected leads. Check the fields you want to update:
          </p>
          
          <div class="form-group" style="margin-bottom: var(--space-4);">
            <label class="checkbox-container" style="display: flex; align-items: center; margin-bottom: 6px; cursor: pointer;">
              <input type="checkbox" id="updateOwnerCheck" style="cursor: pointer;" />
              <span class="checkbox-box" style="margin-right: 6px;"></span>
              <span style="font-weight: 600; font-size: var(--text-sm); color: var(--text-primary);">Assign Lead Owner</span>
            </label>
            <select id="bulkOwnerSelect" class="form-select" disabled style="background: rgba(255, 255, 255, 0.03);">
              ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: var(--space-4);">
            <label class="checkbox-container" style="display: flex; align-items: center; margin-bottom: 6px; cursor: pointer;">
              <input type="checkbox" id="updateStageCheck" style="cursor: pointer;" />
              <span class="checkbox-box" style="margin-right: 6px;"></span>
              <span style="font-weight: 600; font-size: var(--text-sm); color: var(--text-primary);">Move Pipeline Stage</span>
            </label>
            <select id="bulkStageSelect" class="form-select" disabled style="background: rgba(255, 255, 255, 0.03);">
              ${stageOptions}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: var(--space-4);">
            <label class="checkbox-container" style="display: flex; align-items: center; margin-bottom: 6px; cursor: pointer;">
              <input type="checkbox" id="updatePriorityCheck" style="cursor: pointer;" />
              <span class="checkbox-box" style="margin-right: 6px;"></span>
              <span style="font-weight: 600; font-size: var(--text-sm); color: var(--text-primary);">Update Priority</span>
            </label>
            <select id="bulkPrioritySelect" class="form-select" disabled style="background: rgba(255, 255, 255, 0.03);">
              ${priorityOptions}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('bulkUpdateModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveBulkUpdateBtn">Apply Changes</button>
        </div>
      </div>
    </div>
  `;

  // Checkbox state toggles to enable/disable selects
  document.getElementById('updateOwnerCheck').addEventListener('change', (e) => {
    const sel = document.getElementById('bulkOwnerSelect');
    sel.disabled = !e.target.checked;
    sel.style.background = e.target.checked ? '' : 'rgba(255, 255, 255, 0.03)';
  });
  document.getElementById('updateStageCheck').addEventListener('change', (e) => {
    const sel = document.getElementById('bulkStageSelect');
    sel.disabled = !e.target.checked;
    sel.style.background = e.target.checked ? '' : 'rgba(255, 255, 255, 0.03)';
  });
  document.getElementById('updatePriorityCheck').addEventListener('change', (e) => {
    const sel = document.getElementById('bulkPrioritySelect');
    sel.disabled = !e.target.checked;
    sel.style.background = e.target.checked ? '' : 'rgba(255, 255, 255, 0.03)';
  });

  // Apply button handler
  document.getElementById('saveBulkUpdateBtn').addEventListener('click', async () => {
    const updateOwner = document.getElementById('updateOwnerCheck').checked;
    const updateStage = document.getElementById('updateStageCheck').checked;
    const updatePriority = document.getElementById('updatePriorityCheck').checked;
    
    if (!updateOwner && !updateStage && !updatePriority) {
      renderToast('Please check at least one field to update.', 'warning');
      return;
    }

    const newOwner = updateOwner ? document.getElementById('bulkOwnerSelect').value : null;
    const newStage = updateStage ? document.getElementById('bulkStageSelect').value : null;
    const newPriority = updatePriority ? document.getElementById('bulkPrioritySelect').value : null;

    AppStore.setLoading(true);

    const usersList = await DB.getAll('users');
    const ownerName = newOwner ? (usersList.find(u => u.id === newOwner)?.name || 'Unknown') : '';

    for (const id of selectedLeads) {
      const lead = await DB.get('leads', id);
      if (lead) {
        let changed = false;
        let desc = [];

        if (updateOwner) {
          lead.leadOwner = newOwner;
          desc.push(`Owner assigned to ${ownerName}`);
          changed = true;
        }
        if (updateStage) {
          lead.leadStatus = newStage;
          desc.push(`Stage moved to ${newStage}`);
          changed = true;
        }
        if (updatePriority) {
          lead.priority = newPriority;
          desc.push(`Priority set to ${newPriority}`);
          changed = true;
        }

        if (changed) {
          lead.updatedAt = new Date().toISOString();
          await LeadStore.updateLead(lead.id, lead);
          await ActivityStore.logActivity({
            leadId: id,
            type: 'lead_update',
            description: `Mass Update: ` + desc.join(', ')
          });
        }
      }
    }

    selectedLeads.clear();
    updateBulkActionBar();
    renderToast('Mass update completed successfully.', 'success');
    document.getElementById('bulkUpdateModalOverlay').remove();
    AppStore.setLoading(false);
    Router.reload();
  });
}

// Add task modal for specific lead
function showAddTaskModalForLead(leadId) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const priorityOptions = PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'medium' ? 'selected' : ''}>${p.name}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="addLeadTaskModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Schedule Follow-up Task</h3>
          <button class="modal-close" onclick="document.getElementById('addLeadTaskModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="newLeadTaskForm">
            <div class="form-group">
              <label class="form-label">Task Title *</label>
              <input type="text" id="leadTaskTitle" class="form-input" required placeholder="e.g. Send price list, Call back" />
            </div>
            <div class="form-group">
              <label class="form-label">Due Date *</label>
              <input type="date" id="leadTaskDate" class="form-input" required value="${new Date().toISOString().slice(0,10)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="leadTaskPriority" class="form-select">
                ${priorityOptions}
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('addLeadTaskModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveLeadTaskBtn">Schedule Task</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveLeadTaskBtn').addEventListener('click', async () => {
    const form = document.getElementById('newLeadTaskForm');
    if (!form.reportValidity()) return;

    const newTask = {
      id: generateId('TASK'),
      leadId: leadId,
      title: document.getElementById('leadTaskTitle').value,
      dueDate: document.getElementById('leadTaskDate').value,
      priority: document.getElementById('leadTaskPriority').value,
      status: 'Todo',
      assignedTo: AppStore.getState().currentUser?.id || 'admin',
      createdAt: new Date().toISOString()
    };

    await TaskStore.addTask(newTask);
    await ActivityStore.logActivity({
      leadId: leadId,
      type: 'task',
      description: `Scheduled task: "${newTask.title}" for ${new Date(newTask.dueDate).toLocaleDateString()}`
    });

    renderToast('Task scheduled successfully.', 'success');
    document.getElementById('addLeadTaskModalOverlay').remove();
    Router.reload();
  });
}

// Export leads to CSV
function exportLeadsCSV() {
  const leads = LeadStore.getState().leads || [];
  if (leads.length === 0) {
    renderToast('No leads available to export.', 'warning');
    return;
  }

  const headers = ['Company Name', 'Country', 'State', 'Contact Person', 'Designation', 'Phone', 'WhatsApp', 'Email', 'Website', 'Stage', 'Priority', 'Capacity', 'Outreach Evidence'];
  const rows = leads.map(l => [
    l.companyName,
    l.country,
    l.state || '',
    l.contactPerson || '',
    l.designation || '',
    l.mobile || '',
    l.whatsapp || '',
    l.email || '',
    l.website || '',
    l.leadStatus,
    l.priority,
    l.estimatedBuyingCapacity || '',
    l.importExportEvidence || ''
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Jivanta_Global_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  renderToast('Leads database exported to CSV successfully.', 'success');
}

// Zoho Compose Modal
function showZohoComposeModal(leadId, email, defaultSubject, defaultBody) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="zohoComposeModalOverlay">
      <div class="modal modal-lg animate-fadeIn">
        <div class="modal-header">
          <h3 class="modal-title">✉️ Compose Email via Zoho Mail</h3>
          <button class="modal-close" onclick="document.getElementById('zohoComposeModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">To</label>
            <input type="email" id="zohoToEmail" class="form-input" value="${email}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" id="zohoSubject" class="form-input" value="${defaultSubject}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Body</label>
            <textarea id="zohoBody" class="form-textarea" rows="10" required>${defaultBody}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('zohoComposeModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="sendZohoMailBtn" data-lead-id="${leadId}">Compose in Zoho Mail</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('sendZohoMailBtn').addEventListener('click', async () => {
    const to = document.getElementById('zohoToEmail').value;
    const subject = document.getElementById('zohoSubject').value;
    const body = document.getElementById('zohoBody').value;
    
    const zohoDomain = AppStore.getState().zohoDomain || 'mail.zoho.in';
    const emailMethod = AppStore.getState().emailMethod || 'zoho';
    
    let url = '';
    if (emailMethod === 'zoho') {
      url = `https://${zohoDomain}/zm/#mail/compose/to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    window.open(url, '_blank');

    await ActivityStore.logActivity({
      leadId: leadId,
      type: 'general',
      description: `Sent email via ${emailMethod === 'zoho' ? 'Zoho Mail' : 'Email client'}: "${subject}"`
    });

    renderToast('Email composition opened & logged.', 'success');
    document.getElementById('zohoComposeModalOverlay').remove();
    Router.reload();
  });
}
