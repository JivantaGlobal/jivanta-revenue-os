/**
 * @fileoverview Pipeline page for Jivanta Global Revenue OS.
 * Implements a drag-and-drop Kanban board for managing deals across 13 stages.
 */

import { Router } from '../router.js';
import { LeadStore, ActivityStore, AppStore } from '../store.js';
import { PIPELINE_STAGES, PRODUCTS } from '../constants.js';
import { renderToast, getIconSvg } from '../components.js';

Router.register('/pipeline', {
  title: 'Sales Pipeline',
  icon: '🔄',
  requiresAuth: true,
  render() {
    const leads = LeadStore.getState().leads || [];

    // Group leads by stage
    const stageLeads = {};
    PIPELINE_STAGES.forEach(stage => {
      stageLeads[stage.id] = [];
    });

    leads.forEach(lead => {
      if (stageLeads[lead.leadStatus]) {
        stageLeads[lead.leadStatus].push(lead);
      } else {
        // Fallback for new or unmatched stages
        stageLeads['new_lead'].push(lead);
      }
    });

    // Calculate total pipeline value (using sum of numeric capacity estimates)
    let totalPipelineValue = 0;
    leads.forEach(l => {
      const val = parseFloat((l.estimatedBuyingCapacity || '').replace(/[^0-9.]/g, ''));
      if (!isNaN(val)) totalPipelineValue += val;
    });

    // Calculate stage total values
    const stageValues = {};
    PIPELINE_STAGES.forEach(stage => {
      let valSum = 0;
      stageLeads[stage.id].forEach(l => {
        const val = parseFloat((l.estimatedBuyingCapacity || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) valSum += val;
      });
      stageValues[stage.id] = valSum;
    });

    // Render Columns
    const columnsHtml = PIPELINE_STAGES.map(stage => {
      const currentLeads = stageLeads[stage.id] || [];
      const valText = stageValues[stage.id] > 0 
        ? `₹${(stageValues[stage.id] / 100000).toFixed(1)} L` 
        : '₹0';
      
      const cardsHtml = currentLeads.map(lead => {
        const prodBadges = (lead.productInterest || []).map(pId => {
          const p = PRODUCTS.find(prod => prod.id === pId);
          return p ? `<span class="badge" style="background-color: ${p.color}15; color: ${p.color}; border: 1px solid ${p.color}35; font-size: 9px; font-weight: 600; padding: 1px 4px; margin-right: 4px;">${p.name}</span>` : '';
        }).join('');

        return `
          <div class="kanban-card" draggable="true" data-id="${lead.id}">
            <div class="kanban-card-header">
              <span class="kanban-card-title">${lead.companyName}</span>
            </div>
            <div class="kanban-card-body">
              <div style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-2); display: flex; align-items: center; gap: 4px;">
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px; display: block;"><path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>${lead.contactPerson || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="pipeline-card-badges-row">${prodBadges}</div>
                <span class="badge badge-xs" style="background-color: var(--border);">${lead.leadScore}%</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="kanban-column" data-stage="${stage.id}">
          <div class="kanban-column-header" style="border-top-color: ${stage.color};">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span class="kanban-column-title" style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
                <span style="display: flex; align-items: center; width: 14px; height: 14px; color: ${stage.color};">${getIconSvg(stage.icon)}</span>
                <span>${stage.name}</span>
              </span>
              <span class="badge badge-neutral">${currentLeads.length}</span>
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px; font-weight: var(--weight-medium);">Value: ${valText}</div>
          </div>
          <div class="kanban-column-body">
            ${cardsHtml || `<div class="kanban-empty-state">No leads</div>`}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="pipeline-page animate-fadeIn" style="padding: var(--space-6); display: flex; flex-direction: column; height: 100%;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);">
          <div>
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold);">Sales Pipeline (Kanban)</h2>
            <p style="color: var(--text-muted); font-size: var(--text-sm);">Drag and drop deals across stages to update status</p>
          </div>
          <div style="display: flex; gap: var(--space-4); align-items: center;">
            <div style="text-align: right;">
              <span style="color: var(--text-muted); font-size: var(--text-xs); display: block;">TOTAL PIPELINE VALUE</span>
              <strong style="color: var(--color-primary); font-size: var(--text-lg);">₹${(totalPipelineValue / 100000).toFixed(2)} Lakhs</strong>
            </div>
          </div>
        </div>

        <!-- Kanban Board Container -->
        <div class="kanban-board-scroll" style="flex: 1; overflow-x: auto; overflow-y: hidden; display: flex; gap: var(--space-4); padding-bottom: var(--space-4);">
          <div class="kanban-board" style="display: flex; gap: var(--space-4); align-items: stretch; height: 100%;">
            ${columnsHtml}
          </div>
        </div>
      </div>
    `;
  }
});

// Drag and drop event handling
let draggedLeadId = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.kanban-card');
  if (card) {
    draggedLeadId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedLeadId);
  }
});

document.addEventListener('dragend', (e) => {
  const card = e.target.closest('.kanban-card');
  if (card) {
    card.classList.remove('dragging');
  }
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.classList.remove('drag-over');
  });
});

document.addEventListener('dragover', (e) => {
  const col = e.target.closest('.kanban-column');
  if (col) {
    e.preventDefault();
    col.classList.add('drag-over');
  }
});

document.addEventListener('dragleave', (e) => {
  const col = e.target.closest('.kanban-column');
  if (col && !col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
  }
});

document.addEventListener('drop', async (e) => {
  const col = e.target.closest('.kanban-column');
  if (col && draggedLeadId) {
    e.preventDefault();
    const newStage = col.dataset.stage;
    col.classList.remove('drag-over');

    try {
      // Get lead and update status
      const lead = await LeadStore.getState().leads.find(l => l.id === draggedLeadId);
      if (lead && lead.leadStatus !== newStage) {
        const oldStageName = PIPELINE_STAGES.find(s => s.id === lead.leadStatus)?.name || lead.leadStatus;
        const newStageName = PIPELINE_STAGES.find(s => s.id === newStage)?.name || newStage;
        
        lead.leadStatus = newStage;
        lead.updatedAt = new Date().toISOString();
        
        // Update LeadStore (persists to DB)
        await LeadStore.updateLead(lead.id, lead);

        // Log system activity
        await ActivityStore.logActivity({
          leadId: lead.id,
          type: 'stage_change',
          description: `Moved "${lead.companyName}" from ${oldStageName} to ${newStageName}`
        });

        renderToast(`Moved to ${newStageName}`, 'success');
        Router.reload();
      }
    } catch (err) {
      console.error('[Pipeline] Move failed:', err);
      renderToast('Failed to update stage.', 'error');
    }
  }
});

document.addEventListener('click', (e) => {
  // Click on card opens detail page
  const card = e.target.closest('.kanban-card');
  if (card && !card.classList.contains('dragging')) {
    Router.navigate(`/leads/${card.dataset.id}`);
  }
});
