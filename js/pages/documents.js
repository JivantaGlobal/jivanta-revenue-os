/**
 * @fileoverview Documents repository module. Stores, links, and filters documents by categories and leads.
 */

import { Router } from '../router.js';
import { LeadStore, ActivityStore } from '../store.js';
import { DOCUMENT_CATEGORIES } from '../constants.js';
import { DB, generateId } from '../db.js';
import { renderToast } from '../components.js';

Router.register('/documents', {
  title: 'Documents Vault',
  icon: '📁',
  requiresAuth: true,
  async render() {
    const leads = LeadStore.getState().leads || [];
    
    // Fetch all documents from DB
    const documents = await DB.getAll('documents');
    
    // Sort documents: newest first
    documents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const rowsHtml = documents.map(doc => {
      const lead = leads.find(l => l.id === doc.leadId);
      return `
        <tr>
          <td><strong>📄 ${doc.name}</strong></td>
          <td><span class="badge badge-neutral">${doc.category}</span></td>
          <td>${lead ? `<a href="/leads/${lead.id}" data-route style="color: var(--color-primary);">${lead.companyName}</a>` : '—'}</td>
          <td>${new Date(doc.createdAt).toLocaleDateString()}</td>
          <td style="text-align: right;">
            <button class="btn btn-xs btn-outline delete-doc-btn" data-id="${doc.id}">🗑️ Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="documents-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Document Repository Vault</h2>
            <p class="page-header-subtitle">Secure central document vault for contracts, invoices, specifications certificates, and KYC</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="uploadDocumentBtn">➕ Upload Document</button>
          </div>
        </div>

        <!-- Documents Table Card -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Linked Company</th>
                  <th>Date Uploaded</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="5" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No documents uploaded yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
});

// Event delegation
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'uploadDocumentBtn') {
    showUploadDocumentModal();
  }

  if (e.target && e.target.classList.contains('delete-doc-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Are you sure you want to delete this document?')) {
      const doc = await DB.get('documents', id);
      await DB.delete('documents', id);
      
      if (doc) {
        await ActivityStore.logActivity({
          leadId: doc.leadId,
          type: 'document',
          description: `Deleted document: "${doc.name}"`
        });
      }

      renderToast('Document deleted successfully.', 'success');
      Router.reload();
    }
  }
});

function showUploadDocumentModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const leads = LeadStore.getState().leads || [];
  const leadOptions = leads.map(l => `<option value="${l.id}">${l.companyName}</option>`).join('');
  const categoryOptions = DOCUMENT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="uploadDocModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Upload B2B Document</h3>
          <button class="modal-close" onclick="document.getElementById('uploadDocModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="uploadDocForm">
            <div class="form-group">
              <label class="form-label">Document Name *</label>
              <input type="text" id="docNameInput" class="form-input" required placeholder="e.g. Contract-2026.pdf, Specification-Biomass" />
            </div>
            <div class="form-group">
              <label class="form-label">Document Category *</label>
              <select id="docCategorySelect" class="form-select" required>
                ${categoryOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Link to Lead / Company</label>
              <select id="docLeadSelect" class="form-select">
                <option value="">-- No Linked Company --</option>
                ${leadOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select File *</label>
              <input type="file" id="docFileInput" class="form-input" required />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('uploadDocModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveDocUploadBtn">Upload File</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveDocUploadBtn').addEventListener('click', async () => {
    const form = document.getElementById('uploadDocForm');
    if (!form.reportValidity()) return;

    const fileInput = document.getElementById('docFileInput');
    const fileName = fileInput.files[0] ? fileInput.files[0].name : 'unknown';
    const name = document.getElementById('docNameInput').value;
    const category = document.getElementById('docCategorySelect').value;
    const leadId = document.getElementById('docLeadSelect').value;

    const docRecord = {
      id: generateId('DOC'),
      name,
      fileName,
      category,
      leadId: leadId || null,
      filePath: '/assets/' + fileName, // mock path
      createdAt: new Date().toISOString(),
      createdBy: AppStore.getState().currentUser?.name || 'Admin'
    };

    // Save document to DB
    await DB.put('documents', docRecord);

    if (leadId) {
      await ActivityStore.logActivity({
        leadId,
        type: 'document',
        description: `Uploaded document: "${docRecord.name}" (${docRecord.category})`
      });
    } else {
      await ActivityStore.logActivity({
        type: 'document',
        description: `Uploaded document: "${docRecord.name}" (${docRecord.category})`
      });
    }

    renderToast('Document uploaded successfully.', 'success');
    document.getElementById('uploadDocModalOverlay').remove();
    Router.reload();
  });
}
