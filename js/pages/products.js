/**
 * @fileoverview Products catalog page. Shows product statistics, cards, and filtered lead listings.
 */

import { Router } from '../router.js';
import { LeadStore } from '../store.js';
import { PRODUCTS } from '../constants.js';

let activeProductFilter = '';

Router.register('/products', {
  title: 'Products Matrix',
  icon: '📦',
  requiresAuth: true,
  render() {
    const leads = LeadStore.getState().leads || [];

    // Calculate lead counts per product
    const productCounts = {};
    PRODUCTS.forEach(p => { productCounts[p.id] = 0; });
    leads.forEach(l => {
      if (l.productInterest && Array.isArray(l.productInterest)) {
        l.productInterest.forEach(pId => {
          if (productCounts[pId] !== undefined) productCounts[pId]++;
        });
      }
    });

    // If a product filter is active, show the lead list for that product
    if (activeProductFilter) {
      const activeProd = PRODUCTS.find(p => p.id === activeProductFilter);
      const filteredLeads = leads.filter(l => (l.productInterest || []).includes(activeProductFilter));

      const rowsHtml = filteredLeads.map(l => `
        <tr class="clickable-row" data-route="/leads/${l.id}">
          <td><strong>${l.companyName}</strong></td>
          <td>${l.country}</td>
          <td>${l.contactPerson || '—'}</td>
          <td>${l.mobile || '—'}</td>
          <td>${l.email || '—'}</td>
          <td><span class="badge badge-neutral">${l.leadScore}%</span></td>
        </tr>
      `).join('');

      return `
        <div class="products-detail-page animate-fadeIn" style="padding: var(--space-6);">
          <div style="margin-bottom: var(--space-5);">
            <button class="btn btn-sm btn-outline" id="backToProductsBtn">← Back to Catalog</button>
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); margin-top: var(--space-3); display: flex; align-items: center; gap: var(--space-3);">
              ${activeProd.icon} ${activeProd.name} Leads
              <span class="badge" style="background-color: ${activeProd.color}; color: #fff;">${filteredLeads.length} leads</span>
            </h2>
          </div>

          <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Country</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Lead Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No leads matching this product interest.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // Grid of product cards
    const cardsHtml = PRODUCTS.map(p => {
      const count = productCounts[p.id] || 0;
      
      // Top 3 leads preview
      const previewLeads = leads
        .filter(l => (l.productInterest || []).includes(p.id))
        .slice(0, 3);
      
      const previewHtml = previewLeads.length > 0
        ? `<div style="margin-top: var(--space-4); border-top: 1px solid var(--border); padding-top: var(--space-3);">
            <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: var(--weight-bold); text-transform: uppercase;">Top Buyers:</span>
            <ul style="list-style: none; margin-top: var(--space-2); padding: 0;">
              ${previewLeads.map(l => `
                <li style="font-size: var(--text-sm); margin-bottom: var(--space-1); display: flex; justify-content: space-between;">
                  <span style="color: var(--text-primary); font-weight: var(--weight-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">${l.companyName}</span>
                  <span style="color: var(--text-muted); font-size: var(--text-xs);">${l.country}</span>
                </li>
              `).join('')}
            </ul>
           </div>`
        : `<div style="margin-top: var(--space-4); border-top: 1px solid var(--border); padding-top: var(--space-3); color: var(--text-muted); font-size: var(--text-sm); text-align: center;">No active buyers in system.</div>`;

      return `
        <div class="card product-catalog-card" style="position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${p.gradient || p.color};"></div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
              <span style="font-size: 32px;">${p.icon}</span>
              <span class="badge" style="background-color: ${p.color}; color: #fff; font-size: var(--text-xs); font-weight: var(--weight-bold);">${count} leads</span>
            </div>
            <h3 style="font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--text-primary);">${p.name}</h3>
            ${previewHtml}
          </div>
          <button class="btn btn-sm btn-outline btn-block view-product-leads-btn" data-prod-id="${p.id}" style="margin-top: var(--space-5);">
            View all ${count} buyers →
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="products-catalog-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Agricultural & Fuel Commodity Catalog</h2>
            <p class="page-header-subtitle">Outreach targets and buyer pools classified by commodity categories</p>
          </div>
        </div>

        <!-- Catalog Grid -->
        <div class="grid grid-3-col" style="gap: var(--space-6);">
          ${cardsHtml}
        </div>
      </div>
    `;
  }
});

// Event delegation
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('view-product-leads-btn')) {
    activeProductFilter = e.target.dataset.prodId;
    Router.reload();
  }

  if (e.target && e.target.id === 'backToProductsBtn') {
    activeProductFilter = '';
    Router.reload();
  }

  // Click on row to navigate to details
  const row = e.target.closest('.clickable-row');
  if (row && row.dataset.route) {
    Router.navigate(row.dataset.route);
  }
});
