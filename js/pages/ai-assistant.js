/**
 * @fileoverview AI Sales Assistant page module. Generates personalized cold email, WhatsApp, and call pitches.
 */

import { Router } from '../router.js';
import { LeadStore } from '../store.js';
import { PRODUCTS } from '../constants.js';
import { renderToast } from '../components.js';

let generatedEmail = '';
let generatedWhatsapp = '';
let generatedScript = '';

let selectedLeadId = '';
let selectedProductId = 'biomass';
let selectedTone = 'Professional';

Router.register('/ai-assistant', {
  title: 'AI Sales Assistant',
  icon: '🤖',
  requiresAuth: true,
  render() {
    const leads = LeadStore.getState().leads || [];
    
    const leadOptions = leads.map(l => `
      <option value="${l.id}" ${selectedLeadId === l.id ? 'selected' : ''}>${l.companyName} (${l.contactPerson || 'No Contact'})</option>
    `).join('');

    const productOptions = PRODUCTS.map(p => `
      <option value="${p.id}" ${selectedProductId === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>
    `).join('');

    return `
      <div class="ai-assistant-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-6); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">AI Sales Assistant & Proposal Generator</h2>
            <p class="page-header-subtitle">Generate hyper-personalized cold outreach copy, intro pitches, and objection-handling scripts using lead data</p>
          </div>
        </div>

        <div class="grid grid-3-col" style="gap: var(--space-6); align-items: start;">
          <!-- Configuration Panel -->
          <div>
            <div class="card" style="padding: var(--space-5);">
              <h3 class="card-title" style="margin-bottom: var(--space-4);">Outreach Parameters</h3>
              
              <form id="aiConfigForm">
                <div class="form-group">
                  <label class="form-label">Link to Lead / Company</label>
                  <select id="aiLeadSelect" class="form-select">
                    <option value="">-- Choose Company --</option>
                    ${leadOptions}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Outreach Product</label>
                  <select id="aiProductSelect" class="form-select">
                    ${productOptions}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Tone / Style</label>
                  <select id="aiToneSelect" class="form-select">
                    <option value="Professional" ${selectedTone === 'Professional' ? 'selected' : ''}>💼 Professional & Consultative</option>
                    <option value="Direct" ${selectedTone === 'Direct' ? 'selected' : ''}>⚡ Direct & Pitch-oriented</option>
                    <option value="Value" ${selectedTone === 'Value' ? 'selected' : ''}>📈 Focus on ROI & Savings</option>
                  </select>
                </div>

                <button type="submit" class="btn btn-primary btn-block" style="margin-top: var(--space-4);">
                  Generate Proposals 🤖
                </button>
              </form>
            </div>
          </div>

          <!-- Generation Results -->
          <div style="grid-column: span 2; display: flex; flex-direction: column; gap: var(--space-6);">
            <div class="card">
              <div class="card-header"><h3 class="card-title">Generated Outreach Proposal Sheets</h3></div>
              <div class="card-body">
                ${generatedEmail ? `
                  <div style="margin-bottom: var(--space-5);">
                    <h4 style="font-weight: var(--weight-bold); font-size: var(--text-sm); margin-bottom: var(--space-2); color: var(--color-primary);">✉️ Cold Email Pitch</h4>
                    <pre class="outreach-box" id="aiGeneratedEmailText">${generatedEmail}</pre>
                    <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
                      <button class="btn btn-sm btn-outline copy-template-btn" data-target="aiGeneratedEmailText">📋 Copy Email</button>
                    </div>
                  </div>

                  <div style="margin-bottom: var(--space-5);">
                    <h4 style="font-weight: var(--weight-bold); font-size: var(--text-sm); margin-bottom: var(--space-2); color: var(--color-success);">💬 WhatsApp outreach Pitch</h4>
                    <pre class="outreach-box" id="aiGeneratedWaText">${generatedWhatsapp}</pre>
                    <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
                      <button class="btn btn-sm btn-outline copy-template-btn" data-target="aiGeneratedWaText">📋 Copy WhatsApp Message</button>
                    </div>
                  </div>

                  <div>
                    <h4 style="font-weight: var(--weight-bold); font-size: var(--text-sm); margin-bottom: var(--space-2); color: var(--color-secondary);">📞 Custom Call Script & Objection Handling</h4>
                    <pre class="outreach-box" id="aiGeneratedScriptText">${generatedScript}</pre>
                    <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
                      <button class="btn btn-sm btn-outline copy-template-btn" data-target="aiGeneratedScriptText">📋 Copy Script</button>
                    </div>
                  </div>
                ` : `
                  <div style="text-align: center; padding: var(--space-6); color: var(--text-muted);">
                    <span style="font-size: 48px;">🤖</span>
                    <p style="margin-top: var(--space-3); font-weight: var(--weight-medium);">Configure parameters and click "Generate Proposals" to construct personalized sales pitches.</p>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});

// Event handlers
document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'aiConfigForm') {
    e.preventDefault();

    selectedLeadId = document.getElementById('aiLeadSelect').value;
    selectedProductId = document.getElementById('aiProductSelect').value;
    selectedTone = document.getElementById('aiToneSelect').value;

    let companyName = 'Your Company';
    let contactPerson = 'Sir/Madam';
    let country = 'your country';

    if (selectedLeadId) {
      const lead = await LeadStore.getState().leads.find(l => l.id === selectedLeadId);
      if (lead) {
        companyName = lead.companyName;
        contactPerson = lead.contactPerson || 'Sir/Madam';
        country = lead.country;
      }
    }

    const prod = PRODUCTS.find(p => p.id === selectedProductId) || { name: 'Agricultural Commodities' };

    // Construct Pitch variants depending on selected Tone
    if (selectedTone === 'Professional') {
      generatedEmail = `Subject: Bulk Sourcing Proposal: ${prod.name} for ${companyName}\n\nDear ${contactPerson},\n\nI hope this email finds you well.\n\nI am writing to you from Jivanta Global. We are bulk suppliers of export-grade ${prod.name}. We understand that you manage raw material procurement for ${companyName} and want to check if you have any active feedstock requisitions.\n\nWe would be glad to submit our quality specs sheet and standard price listings.\n\nCould we connect briefly on a call next week?\n\nSincerely,\nSubham Jain\nDirector, Jivanta Global\nwww.jivantaglobal.com`;
      generatedWhatsapp = `Hello ${contactPerson},\nThis is Subham from Jivanta Global. We are bulk suppliers of high-grade ${prod.name}.\nWe currently have dispatches available for delivery to ${country}.\nWould it be possible to check your requirement specs?`;
      generatedScript = `[OPENING]\n"Hello ${contactPerson}, this is Subham from Jivanta Global. I am calling to follow up on bulk ${prod.name} supply proposals for ${companyName}."\n\n[OBJECTION HANDLING: ALREADY HAS SUPPLIER]\n"I understand you have existing supply pipelines. We actually work as a secondary buffer supplier for most paper mills/feed processors to guarantee they never experience shut-downs during high seasonal demand."`;
    } else if (selectedTone === 'Direct') {
      generatedEmail = `Subject: delivered price quote: ${prod.name} supply\n\nHi ${contactPerson},\n\nWe supply bulk ${prod.name} directly to factories in your region. We currently have immediate truckloads/containers available with fully verified specifications.\n\nWould you like me to send over our direct FOB/CIF quote for ${companyName} to review?\n\nBest,\nSubham Jain\nDirector, Jivanta Global\n+91 99999 99999`;
      generatedWhatsapp = `Hi ${contactPerson}, Subham here from Jivanta Global. We supply bulk ${prod.name} direct. Can I send you our pricing list for this week?`;
      generatedScript = `[OPENING]\n"Hi ${contactPerson}, this is Subham from Jivanta Global. We supply export-grade ${prod.name} direct. Are you looking to secure volumes for this month?"\n\n[OBJECTION HANDLING: PRICE SENSITIVE]\n"Our rates are indexed directly to raw source hubs, meaning we bypass intermediate traders to save you 5-7% net purchase margins."`;
    } else { // Value/ROI
      generatedEmail = `Subject: Reducing feedstock costs: Jivanta Global ${prod.name} Proposal\n\nDear ${contactPerson},\n\nManaging bulk supply chain constraints and feedstock quality issues for ${companyName} can heavily impact processing margins.\n\nJivanta Global specializes in direct-farm sourcing of ${prod.name}, guaranteeing ash content under 2% and moisture under 8% for biomass (or certified aflatoxin clearance for peanuts/maize).\n\nBy ensuring consistent feedstock specifications, our clients save up to 10% on processing wastage.\n\nCan we schedule a call to review your specifications parameters?\n\nBest regards,\nSubham Jain\nDirector, Jivanta Global`;
      generatedWhatsapp = `Hello ${contactPerson}, Subham from Jivanta Global. We help companies like ${companyName} reduce procurement costs for bulk ${prod.name} by sourcing direct from source hubs. Let me know if you would like a spec comparison sheet.`;
      generatedScript = `[OPENING]\n"Hello ${contactPerson}, I am calling from Jivanta Global. We specialize in reducing raw feedstock overheads for ${prod.name} by providing certified laboratory testing before dispatch."\n\n[OBJECTION: SEND EMAIL FIRST]\n"I will send the email right now with our SGS testing specs, but I wanted to verify: is GCV (or aflatoxin) your main parameter or is it delivery timelines?"`;
    }

    renderToast('AI Proposal Templates generated successfully!', 'success');
    Router.reload();
  }
});
