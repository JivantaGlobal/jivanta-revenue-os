/**
 * @fileoverview Lead import wizard module. Supporting CSV uploads, field mapping, preview, and historical import logging.
 */

import { Router } from '../router.js';
import { LeadStore, ActivityStore } from '../store.js';
import { COUNTRIES } from '../constants.js';
import { DB, generateId } from '../db.js';
import { renderToast } from '../components.js';

let importStep = 1; // 1: Upload, 2: Map Fields, 3: Preview & Confirm, 4: Success
let parsedCsvData = null; // { headers: [], rows: [] }
let fieldMappings = {}; // mapped CRM field -> CSV header index
let importHistory = [];

const CRM_FIELDS = [
  { id: 'companyName', label: 'Company Name *', required: true },
  { id: 'contactPerson', label: 'Contact Person', required: false },
  { id: 'mobile', label: 'Phone Number', required: false },
  { id: 'email', label: 'Email Address', required: false },
  { id: 'country', label: 'Country', required: false },
  { id: 'state', label: 'State / Region', required: false },
  { id: 'notes', label: 'Outreach Notes', required: false }
];

Router.register('/import', {
  title: 'Import Wizard',
  icon: '📥',
  requiresAuth: true,
  async render() {
    // Load history
    importHistory = await DB.getAll('importLogs');
    importHistory.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    let stepHtml = '';
    if (importStep === 1) {
      stepHtml = renderStep1();
    } else if (importStep === 2) {
      stepHtml = renderStep2();
    } else if (importStep === 3) {
      stepHtml = renderStep3();
    } else if (importStep === 4) {
      stepHtml = renderStep4();
    }

    const historyRows = importHistory.map(h => `
      <tr>
        <td>${new Date(h.createdAt).toLocaleDateString()}</td>
        <td>${h.source}</td>
        <td>${h.imported} leads</td>
        <td>${h.errors && h.errors.length > 0 ? `<span style="color: #ef4444;">${h.errors.length} errors</span>` : '—'}</td>
        <td>${h.createdBy}</td>
      </tr>
    `).join('');

    return `
      <div class="import-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">CSV Lead Import Wizard</h2>
            <p class="page-header-subtitle">Bulk import leads from cold call files, industry registries, or export catalogs</p>
          </div>
        </div>

        <div class="grid grid-3-col" style="gap: var(--space-6); align-items: start;">
          <!-- Wizard Card -->
          <div style="grid-column: span 2;">
            <div class="card" style="padding: var(--space-5);">
              <!-- Step Progress Tracker -->
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-6); padding: 0 var(--space-4);">
                <div style="text-align: center; opacity: ${importStep === 1 ? '1' : '0.5'};">
                  <span class="badge ${importStep === 1 ? 'badge-primary' : 'badge-neutral'}">1</span>
                  <div style="font-size: var(--text-xs); margin-top: 4px; font-weight: var(--weight-bold);">Upload CSV</div>
                </div>
                <div style="text-align: center; opacity: ${importStep === 2 ? '1' : '0.5'};">
                  <span class="badge ${importStep === 2 ? 'badge-primary' : 'badge-neutral'}">2</span>
                  <div style="font-size: var(--text-xs); margin-top: 4px; font-weight: var(--weight-bold);">Map Columns</div>
                </div>
                <div style="text-align: center; opacity: ${importStep === 3 ? '1' : '0.5'};">
                  <span class="badge ${importStep === 3 ? 'badge-primary' : 'badge-neutral'}">3</span>
                  <div style="font-size: var(--text-xs); margin-top: 4px; font-weight: var(--weight-bold);">Preview</div>
                </div>
                <div style="text-align: center; opacity: ${importStep === 4 ? '1' : '0.5'};">
                  <span class="badge ${importStep === 4 ? 'badge-primary' : 'badge-neutral'}">4</span>
                  <div style="font-size: var(--text-xs); margin-top: 4px; font-weight: var(--weight-bold);">Complete</div>
                </div>
              </div>

              <!-- Step Content -->
              <div id="importStepContent">
                ${stepHtml}
              </div>
            </div>
          </div>

          <!-- History Sidebar -->
          <div>
            <div class="card" style="padding: var(--space-4);">
              <div class="card-header" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); margin-bottom: var(--space-3);">
                <h3 class="card-title" style="font-size: var(--text-md);">Import History</h3>
              </div>
              <div class="card-body" style="padding: 0;">
                <div class="table-container">
                  <table class="table" style="font-size: var(--text-xs);">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th>Imported</th>
                        <th>Errors</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${historyRows || `<tr><td colspan="5" style="text-align: center; padding: var(--space-4); color: var(--text-muted);">No history found.</td></tr>`}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

function renderStep1() {
  return `
    <div style="text-align: center; padding: var(--space-6); border: 2px dashed var(--border); border-radius: var(--radius-md); background: rgba(255,255,255,0.01);">
      <span style="font-size: 48px;">📄</span>
      <h3 style="font-size: var(--text-lg); font-weight: var(--weight-bold); margin-top: var(--space-3);">Select CSV File</h3>
      <p style="color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-1); margin-bottom: var(--space-5);">Ensure your file is in .csv format. Excel sheets should be saved as CSV before upload.</p>
      
      <input type="file" id="csvFileInput" accept=".csv" style="display: none;" />
      <button class="btn btn-primary" onclick="document.getElementById('csvFileInput').click()">Choose File...</button>
    </div>
  `;
}

function renderStep2() {
  const mappingRows = CRM_FIELDS.map(field => {
    const optionsHtml = parsedCsvData.headers.map((hdr, idx) => `
      <option value="${idx}" ${hdr.toLowerCase().replace(/[^a-z]/g, '').includes(field.id.toLowerCase()) ? 'selected' : ''}>
        ${hdr} (e.g. "${parsedCsvData.rows[0]?.[idx]?.substring(0, 15) || ''}")
      </option>
    `).join('');

    return `
      <div class="grid grid-2-col" style="gap: var(--space-4); margin-bottom: var(--space-3); align-items: center; border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">
        <div>
          <strong style="color: var(--text-primary);">${field.label}</strong>
        </div>
        <div>
          <select class="form-select crm-mapping-select" data-field-id="${field.id}" style="margin-bottom: 0;">
            <option value="">-- Ignore Field --</option>
            ${optionsHtml}
          </select>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div>
      <h3 style="font-weight: var(--weight-bold); font-size: var(--text-md); margin-bottom: var(--space-4);">Map CSV Columns to CRM Fields</h3>
      <div style="margin-bottom: var(--space-5);">
        ${mappingRows}
      </div>
      <div style="display: flex; justify-content: space-between;">
        <button class="btn btn-outline" id="importCancelBtn">Back to Upload</button>
        <button class="btn btn-primary" id="importStep2NextBtn">Next: Preview Data</button>
      </div>
    </div>
  `;
}

function renderStep3() {
  // Map preview headers
  const activeFields = CRM_FIELDS.filter(f => fieldMappings[f.id] !== undefined && fieldMappings[f.id] !== '');
  
  const headerHtml = activeFields.map(f => `<th>${f.label.replace(' *', '')}</th>`).join('');

  // First 5 rows preview
  const previewRows = parsedCsvData.rows.slice(0, 5).map(row => {
    const cols = activeFields.map(f => {
      const idx = fieldMappings[f.id];
      return `<td>${row[idx] || '—'}</td>`;
    }).join('');
    return `<tr>${cols}</tr>`;
  }).join('');

  return `
    <div>
      <h3 style="font-weight: var(--weight-bold); font-size: var(--text-md); margin-bottom: var(--space-3);">Preview Import Data</h3>
      <p style="color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-4);">Review the first 5 records mapping preview. Total records in file: ${parsedCsvData.rows.length}.</p>
      
      <div class="table-container" style="margin-bottom: var(--space-5);">
        <table class="table">
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${previewRows}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: space-between;">
        <button class="btn btn-outline" id="importStep3BackBtn">Back to Mapping</button>
        <button class="btn btn-primary" id="importRunBtn">Run Import</button>
      </div>
    </div>
  `;
}

function renderStep4() {
  return `
    <div style="text-align: center; padding: var(--space-5);">
      <span style="font-size: 48px; color: var(--color-success);">✅</span>
      <h3 style="font-size: var(--text-lg); font-weight: var(--weight-bold); margin-top: var(--space-3);">Import Completed Successfully!</h3>
      <p style="color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-1); margin-bottom: var(--space-5);">Successfully imported ${parsedCsvData.rows.length} leads into the master database.</p>
      <button class="btn btn-primary" id="importResetBtn">Start New Import</button>
    </div>
  `;
}

// Read CSV utility
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = [];
  const rows = [];
  
  if (lines.length > 0) {
    // Parse header
    const rawHeaders = lines[0].split(',');
    rawHeaders.forEach(h => headers.push(h.trim().replace(/^["']|["']$/g, '')));
    
    // Parse body lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Simple comma split (doesn't handle commas in quotes, PAPA parse alternative)
        const row = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        rows.push(row);
      }
    }
  }
  return { headers, rows };
}

// Event handlers
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'csvFileInput') {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        parsedCsvData = parseCSV(text);
        if (parsedCsvData && parsedCsvData.headers.length > 0) {
          importStep = 2;
          Router.reload();
        } else {
          renderToast('Failed to parse CSV file. Ensure it is not empty.', 'error');
        }
      };
      reader.readAsText(file);
    }
  }
});

document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'importCancelBtn') {
    importStep = 1;
    parsedCsvData = null;
    Router.reload();
  }

  if (e.target && e.target.id === 'importStep2NextBtn') {
    // Collect mappings
    fieldMappings = {};
    const selects = document.querySelectorAll('.crm-mapping-select');
    selects.forEach(select => {
      const fieldId = select.dataset.fieldId;
      const idx = select.value;
      if (idx !== '') {
        fieldMappings[fieldId] = parseInt(idx, 10);
      }
    });

    if (fieldMappings['companyName'] === undefined) {
      alert('Company Name is a required field mapping.');
      return;
    }

    importStep = 3;
    Router.reload();
  }

  if (e.target && e.target.id === 'importStep3BackBtn') {
    importStep = 2;
    Router.reload();
  }

  if (e.target && e.target.id === 'importRunBtn') {
    // Run lead import
    AppStore.setLoading(true);

    try {
      const importedLeads = [];
      parsedCsvData.rows.forEach(row => {
        const companyName = row[fieldMappings['companyName']];
        if (companyName) {
          const lead = {
            id: generateId('LEAD'),
            companyName,
            contactPerson: fieldMappings['contactPerson'] !== undefined ? row[fieldMappings['contactPerson']] || '' : '',
            mobile: fieldMappings['mobile'] !== undefined ? row[fieldMappings['mobile']] || '' : '',
            email: fieldMappings['email'] !== undefined ? row[fieldMappings['email']] || '' : '',
            country: fieldMappings['country'] !== undefined ? row[fieldMappings['country']] || 'India' : 'India',
            state: fieldMappings['state'] !== undefined ? row[fieldMappings['state']] || '' : '',
            notes: fieldMappings['notes'] !== undefined && row[fieldMappings['notes']] ? [{ id: generateId('NOTE'), text: row[fieldMappings['notes']], createdAt: new Date().toISOString(), createdBy: 'import' }] : [],
            leadStatus: 'new_lead',
            productInterest: ['biomass'],
            priority: 'medium',
            leadScore: 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          importedLeads.push(lead);
        }
      });

      // Save imported leads to DB and store
      for (const lead of importedLeads) {
        await LeadStore.addLead(lead);
      }

      // Log import history
      await DB.put('importLogs', {
        id: generateId('IMPORT'),
        source: 'CSV Upload',
        imported: importedLeads.length,
        errors: [],
        createdAt: new Date().toISOString(),
        createdBy: AppStore.getState().currentUser?.name || 'Admin'
      });

      await ActivityStore.logActivity({
        type: 'import',
        description: `Imported ${importedLeads.length} leads via CSV wizard`
      });

      renderToast(`Successfully imported ${importedLeads.length} leads!`, 'success');
      importStep = 4;
      Router.reload();
    } catch (err) {
      console.error('[Import] Failed to run import:', err);
      renderToast('Import failed: ' + err.message, 'error');
    } finally {
      AppStore.setLoading(false);
    }
  }

  if (e.target && e.target.id === 'importResetBtn') {
    importStep = 1;
    parsedCsvData = null;
    fieldMappings = {};
    Router.reload();
  }
});
