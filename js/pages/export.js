/**
 * @fileoverview Export CRM page module. Includes HS code indices, port directories, documentation checklists, and shipment tracking.
 */

import { Router } from '../router.js';
import { LeadStore } from '../store.js';
import { HS_CODES, EXPORT_PORTS } from '../constants.js';
import { renderToast } from '../components.js';

// Pre-defined export checklists matching compliance/trade needs
const EXPORT_CHECKLIST = [
  { id: 'kyc', text: 'Exporter Registration (IEC / GST / AD Code)', category: 'Compliance' },
  { id: 'fito', text: 'Phytosanitary Certification (For agri products)', category: 'Compliance' },
  { id: 'coo', text: 'Certificate of Origin (COO)', category: 'Documents' },
  { id: 'inv', text: 'Commercial Invoice & Packing List', category: 'Documents' },
  { id: 'bl', text: 'Bill of Lading / Airway Bill', category: 'Shipping' },
  { id: 'ins', text: 'Marine Insurance Certificate', category: 'Shipping' }
];

Router.register('/export', {
  title: 'Export CRM Compliance',
  icon: '🌍',
  requiresAuth: true,
  render() {
    const leads = LeadStore.getState().leads || [];
    
    // Calculate export leads (leads where country is NOT India)
    const exportLeads = leads.filter(l => l.country && l.country !== 'India');

    const hsRowsHtml = HS_CODES.map(item => `
      <tr>
        <td><strong>${item.code}</strong></td>
        <td>${item.description}</td>
        <td><span class="badge badge-neutral" style="text-transform: uppercase;">${item.product}</span></td>
      </tr>
    `).join('');

    const portRowsHtml = EXPORT_PORTS.map(p => `
      <tr>
        <td><strong>${p}</strong></td>
        <td>India</td>
        <td>Active Commercial Loading</td>
      </tr>
    `).join('');

    const exportLeadsRowsHtml = exportLeads.slice(0, 5).map(l => `
      <tr class="clickable-row" data-route="/leads/${l.id}">
        <td><strong>${l.companyName}</strong></td>
        <td>${l.country}</td>
        <td>${l.productInterest ? l.productInterest.join(', ') : '—'}</td>
        <td><span class="badge badge-primary">${l.leadScore}% Score</span></td>
      </tr>
    `).join('');

    return `
      <div class="export-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">International Export CRM</h2>
            <p class="page-header-subtitle">Global commodity trade utilities, HS Codes compliance, shipping port directories, and documentation checklists</p>
          </div>
        </div>

        <div class="grid grid-3-col" style="gap: var(--space-6); align-items: start;">
          <!-- Left 2 columns: Leads & Compliance -->
          <div style="grid-column: span 2; display: flex; flex-direction: column; gap: var(--space-6);">
            
            <!-- Global Export Leads -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="card-header" style="padding: var(--space-4); border-bottom: 1px solid var(--border);">
                <h3 class="card-title">Top International Prospects</h3>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Destination Country</th>
                      <th>Commodity Interest</th>
                      <th>Opportunity Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exportLeadsRowsHtml || `<tr><td colspan="4" style="text-align: center; padding: var(--space-5); color: var(--text-muted);">No international export leads registered.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- HS Code Reference -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="card-header" style="padding: var(--space-4); border-bottom: 1px solid var(--border);">
                <h3 class="card-title">Harmonized System (HS) Codes Directory</h3>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>HS Code</th>
                      <th>Description</th>
                      <th>Product Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${hsRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Indian Shipping Ports Directory -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="card-header" style="padding: var(--space-4); border-bottom: 1px solid var(--border);">
                <h3 class="card-title">Approved Loading Ports Directory</h3>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Port Name</th>
                      <th>Country</th>
                      <th>Customs Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${portRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right Column: Compliance Checklist -->
          <div>
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Export Documentation Checklist</h3>
                <p class="card-subtitle">Mandatory certificates for international shipping</p>
              </div>
              <div class="card-body">
                <div class="export-checklist">
                  ${EXPORT_CHECKLIST.map(item => `
                    <label class="checkbox-container" style="display: flex; align-items: flex-start; padding: var(--space-2) 0; border-bottom: 1px solid var(--border); margin-bottom: 0;">
                      <input type="checkbox" data-id="${item.id}" />
                      <span class="checkbox-box" style="margin-top: 2px; margin-right: 10px;"></span>
                      <div>
                        <span style="font-weight: var(--weight-medium); font-size: var(--text-sm); display: block;">${item.text}</span>
                        <span class="badge badge-xs badge-neutral" style="margin-top: 4px; font-size: 9px;">${item.category}</span>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

// Event handlers
document.addEventListener('click', (e) => {
  const row = e.target.closest('.clickable-row');
  if (row && row.dataset.route) {
    Router.navigate(row.dataset.route);
  }
});
