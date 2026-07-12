/**
 * @fileoverview Quotations page module for Jivanta Global Revenue OS.
 * Manages B2B quotations, calculates line items, and generates print-friendly invoices/quotes.
 */

import { Router } from '../router.js';
import { LeadStore, AppStore } from '../store.js';
import { PRODUCTS, EXPORT_PORTS } from '../constants.js';
import { DB, generateId } from '../db.js';
import { renderToast } from '../components.js';

let isCreatingQuote = false;
let currentQuoteView = null; // null or quote object for detail/print preview
let quoteLineItems = [
  { id: 1, product: 'biomass', description: 'Premium Biomass Wood Pellets', qty: 100, unit: 'MT', rate: 6500, amount: 650000 }
];

Router.register('/quotations', {
  title: 'Quotations Builder',
  icon: '📄',
  requiresAuth: true,
  async render() {
    const leads = LeadStore.getState().leads || [];
    const quotes = await DB.getAll('quotations');
    
    // Sort quotes: newest first
    quotes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Detail/Print View
    if (currentQuoteView) {
      return renderQuoteDetail(currentQuoteView, leads);
    }

    // Create Form
    if (isCreatingQuote) {
      return renderCreateQuoteForm(leads);
    }

    // List View
    const rowsHtml = quotes.map(q => {
      const lead = leads.find(l => l.id === q.leadId);
      const totalAmount = (q.lineItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      return `
        <tr>
          <td><strong>${q.quoteNumber}</strong></td>
          <td>${lead ? lead.companyName : '—'}</td>
          <td>${new Date(q.date).toLocaleDateString()}</td>
          <td>₹${totalAmount.toLocaleString('en-IN')}</td>
          <td><span class="badge ${q.status === 'Accepted' ? 'badge-success' : 'badge-primary'}">${q.status}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-xs btn-outline view-quote-btn" data-id="${q.id}">👁️ View / Print</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="quotations-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Quotation Management</h2>
            <p class="page-header-subtitle">Build export and domestic B2B contract quotes with dynamic line calculation</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="startCreateQuoteBtn">📄 Create Quotation</button>
          </div>
        </div>

        <!-- Quotes Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Quotation No.</th>
                  <th>Company Name</th>
                  <th>Quote Date</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No quotations generated yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
});

function renderCreateQuoteForm(leads) {
  const leadOptions = leads.map(l => `<option value="${l.id}">${l.companyName}</option>`).join('');
  const productOptions = PRODUCTS.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('');
  const portOptions = EXPORT_PORTS.map(p => `<option value="${p}">${p}</option>`).join('');

  // Auto quotation number
  const nextNum = 'JG/QT/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 900) + 100);

  const linesHtml = quoteLineItems.map(item => `
    <div class="quote-line-row" data-id="${item.id}" style="display: flex; gap: var(--space-3); margin-bottom: var(--space-3); align-items: flex-end;">
      <div style="flex: 2;">
        <label class="form-label" style="font-size: 10px;">PRODUCT</label>
        <select class="form-select line-product" style="margin-bottom: 0;">
          ${PRODUCTS.map(p => `<option value="${p.id}" ${item.product === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="flex: 3;">
        <label class="form-label" style="font-size: 10px;">DESCRIPTION</label>
        <input type="text" class="form-input line-desc" value="${item.description}" style="margin-bottom: 0;" />
      </div>
      <div style="flex: 1;">
        <label class="form-label" style="font-size: 10px;">QTY</label>
        <input type="number" class="form-input line-qty" value="${item.qty}" min="1" style="margin-bottom: 0;" />
      </div>
      <div style="flex: 1;">
        <label class="form-label" style="font-size: 10px;">UNIT</label>
        <input type="text" class="form-input line-unit" value="${item.unit}" style="margin-bottom: 0;" placeholder="MT" />
      </div>
      <div style="flex: 2;">
        <label class="form-label" style="font-size: 10px;">RATE (₹)</label>
        <input type="number" class="form-input line-rate" value="${item.rate}" min="0" style="margin-bottom: 0;" />
      </div>
      <div style="flex: 2;">
        <label class="form-label" style="font-size: 10px;">AMOUNT</label>
        <input type="text" class="form-input line-amount" value="₹${item.amount.toLocaleString('en-IN')}" readonly style="margin-bottom: 0; background: rgba(0,0,0,0.2);" />
      </div>
      <button class="btn btn-danger remove-line-btn" data-id="${item.id}" style="padding: 10px 12px; margin-bottom: 0;">×</button>
    </div>
  `).join('');

  return `
    <div class="create-quote-page animate-fadeIn" style="padding: var(--space-6);">
      <div style="margin-bottom: var(--space-5);">
        <button class="btn btn-sm btn-outline" id="cancelQuoteBtn">← Cancel</button>
        <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); margin-top: var(--space-3);">Create Quotation / Offer Sheet</h2>
      </div>

      <div class="card" style="padding: var(--space-5);">
        <form id="quoteForm">
          <div class="grid grid-3-col" style="gap: var(--space-4); margin-bottom: var(--space-5);">
            <div class="form-group">
              <label class="form-label">Quotation Number</label>
              <input type="text" id="quoteNumber" class="form-input" value="${nextNum}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Linked Lead / Customer *</label>
              <select id="quoteLeadSelect" class="form-select" required>
                <option value="">-- Select Customer --</option>
                ${leadOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Quote Date</label>
              <input type="date" id="quoteDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Payment Terms</label>
              <input type="text" id="quotePaymentTerms" class="form-input" placeholder="e.g. 30% Advance, 70% against BL scan" value="100% Irrevocable LC at Sight" />
            </div>
            <div class="form-group">
              <label class="form-label">Delivery Terms</label>
              <input type="text" id="quoteDeliveryTerms" class="form-input" placeholder="e.g. FOB Mundra, CIF Rotterdam" value="FOB Mundra Port" />
            </div>
            <div class="form-group">
              <label class="form-label">Port of Loading</label>
              <select id="quoteLoadingPort" class="form-select">
                ${portOptions}
              </select>
            </div>
          </div>

          <!-- Product Line Items -->
          <div style="border-top: 1px solid var(--border); padding-top: var(--space-4); margin-bottom: var(--space-5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
              <h4 style="font-weight: var(--weight-bold); font-size: var(--text-md);">Product Line Items</h4>
              <button type="button" class="btn btn-sm btn-outline" id="addQuoteLineBtn">➕ Add Line</button>
            </div>
            <div id="quoteLinesContainer">
              ${linesHtml}
            </div>
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label class="form-label">Terms & Contract Conditions</label>
            <textarea id="quoteNotes" class="form-textarea" rows="3">1. Specification parameters guaranteed +/- 2% tolerance.
2. Delivery within 15-20 days of order confirmation/LC opening.
3. Rates are valid for 7 business days from date of issue.</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: var(--space-3); border-top: 1px solid var(--border); padding-top: var(--space-4);">
            <button type="button" class="btn btn-outline" id="cancelQuoteBtn2">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveQuotationBtn">Save & View Quote</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderQuoteDetail(quote, leads) {
  const lead = leads.find(l => l.id === quote.leadId);
  const totalVal = (quote.lineItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return `
    <div class="quote-detail-page animate-fadeIn" style="padding: var(--space-6);">
      <!-- Actions Bar -->
      <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-6);">
        <button class="btn btn-sm btn-outline" id="closeQuoteDetailBtn">← Back to List</button>
        <div style="display: flex; gap: var(--space-3);">
          <button class="btn btn-primary" id="printQuoteBtn">🖨️ Print / Download PDF</button>
          <button class="btn btn-outline" id="acceptQuoteBtn" data-id="${quote.id}" ${quote.status === 'Accepted' ? 'disabled' : ''}>✓ Accept Quote</button>
        </div>
      </div>

      <!-- Printable Card Wrapper -->
      <div class="card printable-quote-card" id="printableInvoiceCard" style="background: #fff; color: #1e293b; padding: var(--space-6); font-family: 'Inter', sans-serif;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: var(--space-4); margin-bottom: var(--space-5);">
          <div>
            <h2 style="color: #0f172a; font-weight: 800; font-size: 24px; margin-bottom: 4px;">Jivanta Global Pvt Ltd</h2>
            <p style="font-size: 12px; color: #64748b;">Plot 42, GIDC Agro Park, Mundra, Gujarat, India</p>
            <p style="font-size: 12px; color: #64748b;">Email: trade@jivantaglobal.com | Web: www.jivantaglobal.com</p>
          </div>
          <div style="text-align: right;">
            <h1 style="color: #3b82f6; font-weight: 800; font-size: 28px; margin-bottom: 4px;">QUOTATION</h1>
            <p style="font-size: 14px; font-weight: 600; color: #0f172a;">NO: ${quote.quoteNumber}</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${new Date(quote.date).toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Customer/Supplier Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-5);">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">PROPOSAL FOR:</span>
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; margin-bottom: 4px;">${lead ? lead.companyName : 'Unknown Company'}</h3>
            <p style="font-size: 13px; color: #334155; margin-bottom: 2px;">Attn: ${lead ? lead.contactPerson || 'Procurement In-charge' : 'Procurement'}</p>
            <p style="font-size: 13px; color: #334155;">Destination: ${lead ? `${lead.state ? `${lead.state}, ` : ''}${lead.country}` : '—'}</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">SHIPMENT PARAMETERS:</span>
            <p style="font-size: 13px; color: #334155; margin-top: 2px; margin-bottom: 2px;"><strong>Port of Loading:</strong> ${quote.portOfLoading || 'Mundra Port'}</p>
            <p style="font-size: 13px; color: #334155; margin-bottom: 2px;"><strong>Delivery Terms:</strong> ${quote.deliveryTerms || 'FOB Loading Port'}</p>
            <p style="font-size: 13px; color: #334155;"><strong>Payment Terms:</strong> ${quote.paymentTerms || 'LC at sight'}</p>
          </div>
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: var(--space-5); text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #0f172a; font-weight: 700; font-size: 13px;">
              <th style="padding: 10px;">Item Description</th>
              <th style="padding: 10px; text-align: right;">Quantity</th>
              <th style="padding: 10px; text-align: center;">Unit</th>
              <th style="padding: 10px; text-align: right;">Rate</th>
              <th style="padding: 10px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.lineItems || []).map(item => `
              <tr style="border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px;">
                <td style="padding: 10px;">
                  <strong style="color: #0f172a;">${item.description}</strong>
                </td>
                <td style="padding: 10px; text-align: right;">${item.qty}</td>
                <td style="padding: 10px; text-align: center;">${item.unit}</td>
                <td style="padding: 10px; text-align: right;">₹${item.rate.toLocaleString('en-IN')}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600; color: #0f172a;">₹${item.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr style="font-size: 15px; font-weight: 800; color: #0f172a; background: #f8fafc;">
              <td colspan="4" style="padding: 12px; text-align: right; border-top: 2px solid #94a3b8;">Total Proposal Value (INR):</td>
              <td style="padding: 12px; text-align: right; border-top: 2px solid #94a3b8; color: #3b82f6;">₹${totalVal.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Conditions & Notes -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: var(--space-4); margin-top: var(--space-5);">
          <h4 style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: var(--space-2);">Terms & Conditions:</h4>
          <pre style="font-family: inherit; font-size: 12px; color: #475569; white-space: pre-wrap; line-height: 1.5; background: none; border: none; padding: 0;">${quote.notes || 'Default contract terms apply.'}</pre>
        </div>

        <!-- Signature -->
        <div style="display: flex; justify-content: flex-end; margin-top: 60px;">
          <div style="text-align: center; width: 200px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
            <p style="font-size: 12px; font-weight: 700; color: #0f172a;">Authorized Signatory</p>
            <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Jivanta Global Pvt Ltd</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Recalculate line amounts
function updateLineItemAmounts() {
  const container = document.getElementById('quoteLinesContainer');
  if (!container) return;

  const rows = container.querySelectorAll('.quote-line-row');
  let items = [];
  rows.forEach(row => {
    const id = parseInt(row.dataset.id, 10);
    const product = row.querySelector('.line-product').value;
    const description = row.querySelector('.line-desc').value;
    const qty = parseFloat(row.querySelector('.line-qty').value) || 0;
    const unit = row.querySelector('.line-unit').value;
    const rate = parseFloat(row.querySelector('.line-rate').value) || 0;
    
    const amount = qty * rate;
    row.querySelector('.line-amount').value = `₹${amount.toLocaleString('en-IN')}`;

    items.push({ id, product, description, qty, unit, rate, amount });
  });

  quoteLineItems = items;
}

// Event handlers
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'startCreateQuoteBtn') {
    isCreatingQuote = true;
    quoteLineItems = [
      { id: 1, product: 'biomass', description: 'Premium Biomass Wood Pellets', qty: 100, unit: 'MT', rate: 6500, amount: 650000 }
    ];
    Router.reload();
  }

  if (e.target && (e.target.id === 'cancelQuoteBtn' || e.target.id === 'cancelQuoteBtn2')) {
    isCreatingQuote = false;
    Router.reload();
  }

  if (e.target && e.target.id === 'addQuoteLineBtn') {
    updateLineItemAmounts();
    const nextId = quoteLineItems.length > 0 ? Math.max(...quoteLineItems.map(i => i.id)) + 1 : 1;
    quoteLineItems.push({
      id: nextId,
      product: 'biomass',
      description: 'New Item Description',
      qty: 50,
      unit: 'MT',
      rate: 5000,
      amount: 250000
    });
    Router.reload();
  }

  if (e.target && e.target.classList.contains('remove-line-btn')) {
    const id = parseInt(e.target.dataset.id, 10);
    updateLineItemAmounts();
    quoteLineItems = quoteLineItems.filter(item => item.id !== id);
    Router.reload();
  }

  if (e.target && e.target.classList.contains('view-quote-btn')) {
    const qId = e.target.dataset.id;
    const quote = await DB.get('quotations', qId);
    if (quote) {
      currentQuoteView = quote;
      Router.reload();
    }
  }

  if (e.target && e.target.id === 'closeQuoteDetailBtn') {
    currentQuoteView = null;
    Router.reload();
  }

  if (e.target && e.target.id === 'printQuoteBtn') {
    // Open print dialog specifically targeting the printable invoice element
    const printContents = document.getElementById('printableInvoiceCard').outerHTML;
    
    // Create iframe to print to avoid printing sidebar/etc
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.write(`
      <html>
        <head>
          <title>Quotation PDF Print</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; background: #fff; color: #1e293b; }
            th, td { text-align: left; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  }

  if (e.target && e.target.id === 'acceptQuoteBtn') {
    const qId = e.target.dataset.id;
    const quote = await DB.get('quotations', qId);
    if (quote) {
      quote.status = 'Accepted';
      await DB.put('quotations', quote);
      
      // Log Activity
      await ActivityStore.logActivity({
        leadId: quote.leadId,
        type: 'quotation',
        description: `Quotation ${quote.quoteNumber} has been accepted by client`
      });

      renderToast('Quotation marked as ACCEPTED.', 'success');
      currentQuoteView = quote;
      Router.reload();
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target && (e.target.classList.contains('line-product') || e.target.classList.contains('line-qty') || e.target.classList.contains('line-rate') || e.target.classList.contains('line-desc') || e.target.classList.contains('line-unit'))) {
    updateLineItemAmounts();
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'quoteForm') {
    e.preventDefault();
    updateLineItemAmounts();

    const quoteNumber = document.getElementById('quoteNumber').value;
    const leadId = document.getElementById('quoteLeadSelect').value;
    const date = document.getElementById('quoteDate').value;
    const notes = document.getElementById('quoteNotes').value;
    const paymentTerms = document.getElementById('quotePaymentTerms').value;
    const deliveryTerms = document.getElementById('quoteDeliveryTerms').value;
    const portOfLoading = document.getElementById('quoteLoadingPort').value;

    const newQuote = {
      id: generateId('QUOTE'),
      quoteNumber,
      leadId,
      date,
      notes,
      paymentTerms,
      deliveryTerms,
      portOfLoading,
      lineItems: quoteLineItems,
      status: 'Draft',
      createdAt: new Date().toISOString()
    };

    // Save quotation to DB
    await DB.put('quotations', newQuote);

    // Log Activity
    await ActivityStore.logActivity({
      leadId,
      type: 'quotation',
      description: `Generated B2B Quotation ${newQuote.quoteNumber}`
    });

    renderToast('Quotation saved successfully.', 'success');
    isCreatingQuote = false;
    currentQuoteView = newQuote; // Open detail view
    Router.reload();
  }
});
