/**
 * @fileoverview Call management page module for Jivanta Global Revenue OS.
 * Logs inbound/outbound calls, schedules automatic follow-up tasks, and displays product-specific scripts.
 */

import { Router } from '../router.js';
import { LeadStore, TaskStore, ActivityStore, AppStore } from '../store.js';
import { CALL_OUTCOMES, CALL_TYPES, PRODUCTS } from '../constants.js';
import { renderToast, renderPagination, getIconSvg } from '../components.js';
import { DB, generateId } from '../db.js';

let currentPage = 1;
const pageSize = 10;

// Pre-defined call scripts matching PRODUCTS constants
const CALL_SCRIPTS = [
  { 
    prodId: 'biomass', 
    title: 'Biomass Pellets Boiler Pitch', 
    script: `<strong>Opening:</strong> "Hello [Name], this is Subham from Jivanta Global. I am reaching out to discuss your biomass procurement for your industrial boilers. We supply high GCV pellets (4000+ kcal/kg) with consistent monthly volume supply."<br><br>
    <strong>Value Proposition:</strong> "Our pellets have moisture below 8% and ash content under 2%, which prevents slagging and keeps your boilers running at max efficiency. We can commit to a supply of 500-1000 tons/month on steady pricing."<br><br>
    <strong>Objection Handling (Price too high):</strong> "We understand biomass prices fluctuate, but we offer a fixed annual contract. The savings from ash removal labor and consistent boiler heating GCV actually reduce your net fuel cost by 12% compared to local unorganized suppliers."<br><br>
    <strong>Call-to-Action (Next Step):</strong> "I would love to send you a 10kg test sample to your plant. Shall I dispatch that today or schedule a factory visit?"`
  },
  { 
    prodId: 'peanuts', 
    title: 'Peanuts Bulk Sourcing Pitch', 
    script: `<strong>Opening:</strong> "Hello [Name], this is Subham from Jivanta Global. I noticed your company manufactures peanut butter/snacks. We are direct packers of export-grade Bold and Java peanuts from Saurashtra region."<br><br>
    <strong>Value Proposition:</strong> "We supply 50/60 and 80/90 counts with strict aflatoxin certification and moisture capped at 7%. We can deliver containers direct to your factory or CIF port with full certificates."<br><br>
    <strong>Objection (Aflatoxin issues):</strong> "We test every batch at SGS/Geo-Chem labs before packing. You will receive a copy of the lab analysis matching your specific batch number before loading."<br><br>
    <strong>Call-to-Action:</strong> "Could I send you our current season price list and specifications sheet for bold peanuts?"`
  },
  { 
    prodId: 'maize', 
    title: 'Maize Poultry Feed/Brewery Sourcing Pitch', 
    script: `<strong>Opening:</strong> "Hello [Name], this is Subham from Jivanta Global. I wanted to check your bulk maize sourcing requirements for your feed mill/brewery."<br><br>
    <strong>Value Proposition:</strong> "We source directly from Bihar and Karnataka hubs, ensuring starch content above 70% and moisture under 14%. We handle transport directly to your mill, ensuring no supply disruptions during high-demand months."<br><br>
    <strong>Call-to-Action:</strong> "What is your weekly buying capacity? I'd like to quote you a delivered price (FOR mill-gate) for our next dispatch."`
  }
];

Router.register('/calls', {
  title: 'Call Management',
  icon: '📞',
  requiresAuth: true,
  async render() {
    const leads = LeadStore.getState().leads || [];
    
    // Fetch all calls from DB
    const calls = await DB.getAll('calls');
    
    // Sort calls: newest first
    calls.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Stats
    const totalCallsCount = calls.length;
    const connectedCalls = calls.filter(c => c.outcome === 'Connected' || c.outcome === 'Interested' || c.outcome === 'Meeting Scheduled');
    const connectedPct = totalCallsCount > 0 ? ((connectedCalls.length / totalCallsCount) * 100).toFixed(0) : 0;
    
    let totalDuration = 0;
    calls.forEach(c => {
      const dur = parseInt(c.duration, 10);
      if (!isNaN(dur)) totalDuration += dur;
    });
    const avgDuration = totalCallsCount > 0 ? (totalDuration / totalCallsCount).toFixed(1) : 0;

    const statsHtml = `
      <div class="dashboard-kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="stat-card" style="border-top-color: #3b82f6;">
          <div class="stat-label">Total Logs</div>
          <div class="stat-value">${totalCallsCount}</div>
          <div class="stat-sub">Calls logged in database</div>
        </div>
        <div class="stat-card" style="border-top-color: #10b981;">
          <div class="stat-label">Connection Rate</div>
          <div class="stat-value">${connectedPct}%</div>
          <div class="stat-sub">${connectedCalls.length} connected logs</div>
        </div>
        <div class="stat-card" style="border-top-color: #8b5cf6;">
          <div class="stat-label">Average Duration</div>
          <div class="stat-value">${avgDuration} mins</div>
          <div class="stat-sub">Talk time efficiency</div>
        </div>
        <div class="stat-card" style="border-top-color: #f59e0b;">
          <div class="stat-label">Total Time</div>
          <div class="stat-value">${totalDuration} mins</div>
          <div class="stat-sub">Talk duration log</div>
        </div>
      </div>
    `;

    // Script library HTML
    const scriptsHtml = CALL_SCRIPTS.map(s => `
      <div class="accordion-item" style="border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: var(--space-3); overflow: hidden;">
        <button class="accordion-title btn-block" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); background: rgba(255,255,255,0.03); color: var(--text-primary); border: none; text-align: left; font-weight: var(--weight-bold); font-size: var(--text-sm);" onclick="const pane = this.nextElementSibling; pane.style.display = pane.style.display === 'none' ? 'block' : 'none';">
          <span>${s.title}</span>
          <span>▼</span>
        </button>
        <div class="accordion-panel" style="display: none; padding: var(--space-4); background: rgba(0,0,0,0.1); border-top: 1px solid var(--border); line-height: 1.6; font-size: var(--text-sm);">
          ${s.script}
        </div>
      </div>
    `).join('');

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(totalCallsCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedCalls = calls.slice(startIdx, startIdx + pageSize);

    // Calls Table Rows
    const rowsHtml = paginatedCalls.map(c => {
      const lead = leads.find(l => l.id === c.leadId);
      const leadNameText = lead ? `<a href="/leads/${lead.id}" data-route style="color: var(--color-primary); font-weight: var(--weight-medium);">${lead.companyName}</a>` : '—';
      const outcomeBadge = c.outcome === 'Connected' || c.outcome === 'Interested' || c.outcome === 'Meeting Scheduled'
        ? `<span class="badge" style="background-color: var(--color-success); color: #fff;">${c.outcome}</span>`
        : `<span class="badge" style="background-color: var(--border);">${c.outcome}</span>`;
      
      const typeBadge = c.type === 'Outgoing'
        ? `<span style="color: #3b82f6;">↗ Outgoing</span>`
        : c.type === 'Incoming'
          ? `<span style="color: #10b981;">↙ Incoming</span>`
          : `<span style="color: #ef4444;">❌ Missed</span>`;

      return `
        <tr>
          <td>${new Date(c.date).toLocaleString()}</td>
          <td>${leadNameText}</td>
          <td>${c.contactPerson || '—'}</td>
          <td>${typeBadge}</td>
          <td>${c.duration} mins</td>
          <td>${outcomeBadge}</td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.notes || '—'}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-xs btn-outline edit-call-btn" data-id="${c.id}" style="margin-right: 4px;">✏️ Edit</button>
            <button class="btn btn-xs btn-outline btn-danger-outline delete-call-btn" data-id="${c.id}">🗑️ Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    const paginationHtml = totalCallsCount > pageSize ? `
      <div style="margin-top: var(--space-4);">
        ${renderPagination(currentPage, totalPages, 'calls-page-change')}
      </div>
    ` : '';

    return `
      <div class="calls-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-5); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Call Management Logs</h2>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="logCallBtn">📞 Log Phone Call</button>
          </div>
        </div>

        <!-- Stats Section -->
        ${statsHtml}

        <div class="grid grid-3-col" style="gap: var(--space-6); align-items: start;">
          <!-- Left 2 columns: Call list -->
          <div style="grid-column: span 2;">
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="card-header" style="padding: var(--space-4); border-bottom: 1px solid var(--border);">
                <h3 class="card-title">Outreach History Logs</h3>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Company Name</th>
                      <th>Contact Person</th>
                      <th>Call Type</th>
                      <th>Duration</th>
                      <th>Outcome</th>
                      <th>Call Summary / Notes</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || `<tr><td colspan="8" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No phone calls logged yet.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
            ${paginationHtml}
          </div>

          <!-- Right 1 column: Call Scripts Library -->
          <div>
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Agri-Commodity Sales Scripts</h3>
                <p class="card-subtitle">Personalized phone pitches</p>
              </div>
              <div class="card-body">
                ${scriptsHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

// Event delegation
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'logCallBtn') {
    showLogCallModal();
  }

  // Handle pagination clicks
  const pageBtn = e.target.closest('[data-action="calls-page-change"]');
  if (pageBtn) {
    currentPage = parseInt(pageBtn.dataset.page, 10);
    Router.reload();
  }

  // Delete Call Trigger
  const deleteBtn = e.target.closest('.delete-call-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (confirm('Are you sure you want to delete this call log?')) {
      const call = await DB.get('calls', id);
      await DB.delete('calls', id);
      if (call) {
        await ActivityStore.logActivity({
          leadId: call.leadId,
          type: 'general',
          description: `Deleted call log: "${(call.notes || '').substring(0, 30)}..."`
        });
      }
      renderToast('Call log deleted successfully.', 'success');
      Router.reload();
    }
  }

  // Edit Call Trigger
  const editBtn = e.target.closest('.edit-call-btn');
  if (editBtn) {
    showEditCallModal(editBtn.dataset.id);
  }
});

function showLogCallModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const leads = LeadStore.getState().leads || [];
  const leadOptions = leads.map(l => `<option value="${l.id}">${l.companyName}</option>`).join('');

  const outcomeOptions = CALL_OUTCOMES.map(o => `<option value="${o}">${o}</option>`).join('');
  const typeOptions = CALL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="logCallModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Log Phone Call</h3>
          <button class="modal-close" onclick="document.getElementById('logCallModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form id="newCallForm">
            <div class="form-group">
              <label class="form-label">Linked Lead / Company *</label>
              <select id="callLeadSelect" class="form-select" required>
                <option value="">-- Select Company --</option>
                ${leadOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Contact Person</label>
              <input type="text" id="callContactInput" class="form-input" placeholder="Name of contact" />
            </div>
            <div class="form-group">
              <label class="form-label">Call Type</label>
              <select id="callTypeSelect" class="form-select">
                ${typeOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Duration (minutes)</label>
              <input type="number" id="callDurationInput" class="form-input" min="0" value="5" />
            </div>
            <div class="form-group">
              <label class="form-label">Call Outcome</label>
              <select id="callOutcomeSelect" class="form-select">
                ${outcomeOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Call Summary / Notes</label>
              <textarea id="callNotesInput" class="form-textarea" rows="3" placeholder="What did you discuss? What is their current feedstock requirement?"></textarea>
            </div>
            <div style="padding: var(--space-3) 0; border-top: 1px solid var(--border); margin-top: var(--space-4);">
              <label class="checkbox-container">
                <input type="checkbox" id="scheduleCallFollowUpCheck" checked />
                <span class="checkbox-box" style="margin-right: 6px;"></span>
                <span style="font-weight: var(--weight-bold); font-size: var(--text-sm);">Schedule Follow-up Task</span>
              </label>
              <div id="followUpTaskConfig" style="margin-top: var(--space-3); padding-left: var(--space-5);">
                <div class="form-group">
                  <label class="form-label">Follow-up Task Title</label>
                  <input type="text" id="followUpTitle" class="form-input" value="Call back for feedback" />
                </div>
                <div class="form-group">
                  <label class="form-label">Follow-up Due Date</label>
                  <input type="date" id="followUpDate" class="form-input" value="${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('logCallModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveLoggedCallBtn">Log Call</button>
        </div>
      </div>
    </div>
  `;

  // Auto-fill contact person on lead selection
  document.getElementById('callLeadSelect').addEventListener('change', async (e) => {
    const leadId = e.target.value;
    if (leadId) {
      const lead = await DB.get('leads', leadId);
      if (lead) {
        document.getElementById('callContactInput').value = lead.contactPerson || '';
        document.getElementById('followUpTitle').value = `Follow up with ${lead.companyName}`;
      }
    }
  });

  // Toggle follow-up config visibility
  document.getElementById('scheduleCallFollowUpCheck').addEventListener('change', (e) => {
    document.getElementById('followUpTaskConfig').style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('saveLoggedCallBtn').addEventListener('click', async () => {
    const form = document.getElementById('newCallForm');
    if (!form.reportValidity()) return;

    const leadId = document.getElementById('callLeadSelect').value;
    const lead = await DB.get('leads', leadId);

    const callRecord = {
      id: generateId('CALL'),
      leadId,
      contactPerson: document.getElementById('callContactInput').value,
      type: document.getElementById('callTypeSelect').value,
      duration: document.getElementById('callDurationInput').value,
      outcome: document.getElementById('callOutcomeSelect').value,
      notes: document.getElementById('callNotesInput').value,
      date: new Date().toISOString()
    };

    // Save call to DB
    await DB.put('calls', callRecord);

    // Update lead last activity
    if (lead) {
      lead.lastActivity = new Date().toISOString();
      if (lead.leadStatus === 'new_lead' && (callRecord.outcome === 'Connected' || callRecord.outcome === 'Interested')) {
        lead.leadStatus = 'contacted';
      }
      await LeadStore.updateLead(lead.id, lead);
    }

    // Log activity
    await ActivityStore.logActivity({
      leadId,
      type: 'call',
      description: `Logged ${callRecord.type} call: ${callRecord.outcome} (${callRecord.duration} mins)`
    });

    // Schedule follow-up task
    const scheduleFollowUp = document.getElementById('scheduleCallFollowUpCheck').checked;
    if (scheduleFollowUp && leadId) {
      const taskTitle = document.getElementById('followUpTitle').value;
      const taskDate = document.getElementById('followUpDate').value;
      
      const newTask = {
        id: generateId('TASK'),
        leadId,
        title: taskTitle,
        dueDate: taskDate,
        priority: 'medium',
        status: 'Todo',
        assignedTo: AppStore.getState().currentUser?.id || 'admin',
        createdAt: new Date().toISOString()
      };

      await TaskStore.addTask(newTask);
      await ActivityStore.logActivity({
        leadId,
        type: 'task',
        description: `Scheduled follow-up task: "${newTask.title}" for ${new Date(newTask.dueDate).toLocaleDateString()}`
      });
    }

    renderToast('Call logged successfully.', 'success');
    document.getElementById('logCallModalOverlay').remove();
    Router.reload();
  });
}

async function showEditCallModal(id) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const call = await DB.get('calls', id);
  if (!call) return;

  const outcomeOptions = CALL_OUTCOMES.map(o => `<option value="${o}" ${call.outcome === o ? 'selected' : ''}>${o}</option>`).join('');
  const typeOptions = CALL_TYPES.map(t => `<option value="${t}" ${call.type === t ? 'selected' : ''}>${t}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="editCallModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Edit Call Log</h3>
          <button class="modal-close" onclick="document.getElementById('editCallModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editCallForm">
            <div class="form-group">
              <label class="form-label">Contact Person</label>
              <input type="text" id="editCallContact" class="form-input" value="${call.contactPerson || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Call Type</label>
              <select id="editCallType" class="form-select">
                ${typeOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Duration (minutes)</label>
              <input type="number" id="editCallDuration" class="form-input" min="0" value="${call.duration || 5}" />
            </div>
            <div class="form-group">
              <label class="form-label">Call Outcome</label>
              <select id="editCallOutcome" class="form-select">
                ${outcomeOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Call Summary / Notes</label>
              <textarea id="editCallNotes" class="form-textarea" rows="3">${call.notes || ''}</textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('editCallModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveEditCallBtn">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveEditCallBtn').addEventListener('click', async () => {
    const form = document.getElementById('editCallForm');
    if (!form.reportValidity()) return;

    const updated = {
      ...call,
      contactPerson: document.getElementById('editCallContact').value,
      type: document.getElementById('editCallType').value,
      duration: document.getElementById('editCallDuration').value,
      outcome: document.getElementById('editCallOutcome').value,
      notes: document.getElementById('editCallNotes').value
    };

    await DB.put('calls', updated);
    await ActivityStore.logActivity({
      leadId: call.leadId,
      type: 'call',
      description: `Edited call log: ${updated.outcome} (${updated.duration} mins)`
    });

    renderToast('Call log updated successfully.', 'success');
    document.getElementById('editCallModalOverlay').remove();
    Router.reload();
  });
}
