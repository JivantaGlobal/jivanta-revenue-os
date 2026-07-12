/**
 * Jivanta Global Revenue OS — Legacy Data Migrator
 * Converts 319 leads from leads_data.js format to new CRM schema
 */

import { generateId, formatDate } from './utils.js';

/**
 * Map a legacy lead object to the new CRM lead schema
 * @param {Object} legacy - Lead from leads_data.js
 * @returns {Object} - Lead in new CRM format
 */
function mapLegacyLead(legacy) {
  const now = new Date().toISOString();
  
  // Determine product interests (array)
  const productInterests = [];
  const pi = (legacy.productInterest || '').toLowerCase();
  if (pi.includes('biomass')) productInterests.push('biomass');
  if (pi.includes('peanut') || pi.includes('groundnut')) productInterests.push('peanuts');
  if (pi.includes('maize') || pi.includes('corn')) productInterests.push('maize');
  if (pi.includes('tobacco')) {
    productInterests.push('tobacco');
    if (pi.includes('rustica') || pi.includes('motihari')) productInterests.push('rustica');
    if (pi.includes('black')) productInterests.push('black_tobacco');
  }
  if (productInterests.length === 0) productInterests.push('biomass');

  // Determine pipeline stage from legacy data
  let leadStatus = 'new_lead';
  const notes = (legacy.notes || '').toLowerCase();
  const tags = (legacy.tags || []).map(t => t.toLowerCase());
  if (tags.includes('quick-connect') || notes.includes('easy connect')) {
    leadStatus = 'research';
  }

  // Determine priority
  let priority = 'medium';
  if (legacy.confidenceScore === 'High') priority = 'high';
  if (legacy.confidenceScore === 'Low') priority = 'low';
  if (tags.includes('mega-buyer') || tags.includes('government')) priority = 'critical';

  // Determine lead score (0-100)
  let leadScore = 50;
  if (legacy.confidenceScore === 'High') leadScore = 75;
  if (legacy.confidenceScore === 'Medium') leadScore = 50;
  if (legacy.confidenceScore === 'Low') leadScore = 25;
  if (tags.includes('quick-connect')) leadScore += 10;
  if (tags.includes('site-visit')) leadScore += 5;
  if (tags.includes('SME')) leadScore += 5;
  if (legacy.email && !legacy.email.includes('UNVERIFIED')) leadScore += 5;
  if (legacy.phone && !legacy.phone.includes('UNVERIFIED')) leadScore += 5;
  leadScore = Math.min(100, leadScore);

  // Extract city and state
  let state = legacy.state || '';
  let city = '';
  const stateMatch = state.match(/^([^(]+)\s*\(([^)]+)\)/);
  if (stateMatch) {
    state = stateMatch[1].trim();
    city = stateMatch[2].trim();
  }

  // Determine source
  let source = 'Manual Entry';
  if (legacy.id.startsWith('SME-')) source = 'CSV Import';
  if (legacy.id.startsWith('INTL-')) source = 'Manual Entry';
  if (legacy.id.startsWith('IN-')) source = 'Manual Entry';

  // Determine if SME
  const isSME = tags.includes('sme');

  return {
    id: legacy.id,
    companyName: legacy.companyName || 'Unknown',
    industry: legacy.buyerType || '',
    country: legacy.country || 'India',
    state: state,
    city: city,
    contactPerson: (legacy.contactPerson && legacy.contactPerson !== 'UNVERIFIED') ? legacy.contactPerson : '',
    designation: (legacy.designation && legacy.designation !== 'UNVERIFIED') ? legacy.designation : '',
    mobile: (legacy.phone && legacy.phone !== 'UNVERIFIED') ? legacy.phone : '',
    whatsapp: (legacy.whatsapp && legacy.whatsapp !== 'UNVERIFIED' && legacy.whatsapp !== 'N/A') ? legacy.whatsapp : '',
    email: (legacy.email && !legacy.email.includes('UNVERIFIED') && !legacy.email.includes('use website')) ? legacy.email : '',
    website: (legacy.website && legacy.website !== 'UNVERIFIED') ? legacy.website : '',
    linkedin: (legacy.linkedin && legacy.linkedin !== 'UNVERIFIED') ? legacy.linkedin : '',
    source: source,
    productInterest: productInterests,
    leadOwner: 'admin',
    lastActivity: now,
    leadScore: leadScore,
    leadStatus: leadStatus,
    priority: priority,
    tags: legacy.tags || [],
    notes: legacy.notes ? [{ id: generateId('NOTE'), text: legacy.notes, createdAt: now, createdBy: 'system' }] : [],
    attachments: [],
    estimatedBuyingCapacity: legacy.estimatedBuyingCapacity || '',
    importExportEvidence: legacy.importExportEvidence || '',
    confidenceScore: legacy.confidenceScore || 'Medium',
    sourceLinks: legacy.sourceLinks || [],
    buyerType: legacy.buyerType || '',
    isSME: isSME,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    importBatch: 'legacy_migration_v1',
    lastVerified: legacy.lastVerified || '',
  };
}

/**
 * Run the migration from legacy data to the new CRM
 * @param {Object} legacyData - The LEADS_DATA object from leads_data.js
 * @param {Object} db - The DB module
 * @returns {Object} - Migration result { migrated: number, skipped: number, errors: string[] }
 */
export async function migrateLegacyLeads(legacyLeads, db) {
  const result = { migrated: 0, skipped: 0, errors: [] };

  // 1. Create default users first if none exist
  const users = await db.getAll('users');
  if (users.length === 0) {
    const defaultUsers = [
      {
        id: 'admin',
        name: 'Subham Jain',
        email: 'admin@jivantaglobal.com',
        role: 'super_admin',
        avatar: '',
        team: 'management',
        isActive: true,
        failedAttempts: 0
      },
      {
        id: 'mgr_sanjay',
        name: 'Sanjay Kumar',
        email: 'manager@jivantaglobal.com',
        role: 'sales_manager',
        avatar: '',
        team: 'domestic_sales',
        isActive: true,
        failedAttempts: 0
      },
      {
        id: 'exec_rahul',
        name: 'Rahul Sen',
        email: 'employee@jivantaglobal.com',
        role: 'sales_executive',
        avatar: '',
        team: 'domestic_sales',
        isActive: true,
        failedAttempts: 0
      }
    ];

    for (const u of defaultUsers) {
      await db.put('users', u);
    }
    console.info('[Migrator] Seeded default users.');
  }

  // Check if migration already happened
  const existingCount = await db.count('leads');
  if (existingCount > 0) {
    console.log(`[Migrator] Database already has ${existingCount} leads. Checking for new ones...`);
    
    // Get existing IDs
    const existingLeads = await db.getAll('leads');
    const existingIds = new Set(existingLeads.map(l => l.id));
    
    // Only migrate new leads
    const newLeads = legacyLeads.filter(l => !existingIds.has(l.id));
    if (newLeads.length === 0) {
      result.skipped = legacyLeads.length;
      console.log('[Migrator] No new leads to migrate.');
      return result;
    }
    
    legacyLeads = newLeads;
    console.log(`[Migrator] Found ${newLeads.length} new leads to migrate.`);
  }

  const allUsers = await db.getAll('users');
  const activeUsers = allUsers.filter(u => u.isActive !== false && u.role !== 'viewer' && u.role !== 'accountant');

  const mapped = [];
  legacyLeads.forEach((legacy, idx) => {
    try {
      const lead = mapLegacyLead(legacy);
      // Round-robin distribution across active sales users
      if (activeUsers.length > 0) {
        lead.leadOwner = activeUsers[idx % activeUsers.length].id;
      } else {
        lead.leadOwner = 'admin';
      }
      mapped.push(lead);
      result.migrated++;
    } catch (err) {
      result.errors.push(`Failed to map lead ${legacy.id}: ${err.message}`);
    }
  });

  // Bulk insert
  if (mapped.length > 0) {
    try {
      await db.bulkPut('leads', mapped);
      console.log(`[Migrator] Successfully migrated ${mapped.length} leads.`);
    } catch (err) {
      result.errors.push(`Bulk insert failed: ${err.message}`);
    }
  }

  // Log the migration
  await db.put('importLogs', {
    id: generateId('IMPORT'),
    type: 'legacy_migration',
    source: 'leads_data.js',
    totalRecords: legacyLeads.length,
    imported: result.migrated,
    skipped: result.skipped,
    errors: result.errors,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  });

  return result;
}

/**
 * Fetch legacy data by loading the existing leads_data.js script
 * @returns {Array} Array of legacy lead objects
 */
export async function fetchLegacyData() {
  try {
    // Try to load from the legacy directory
    const response = await fetch('/legacy/leads_data.js');
    if (!response.ok) {
      console.log('[Migrator] No legacy data found at /legacy/leads_data.js');
      return [];
    }
    
    const scriptText = await response.text();
    
    // Extract the leads array from the script
    // The script defines: const LEADS_DATA = { metadata: {...}, leads: [...] };
    // We need to extract just the leads array
    
    // Use a sandboxed eval approach
    const fn = new Function(scriptText + "\nif (typeof LEADS_DATA === 'undefined') throw new Error('LEADS_DATA global object is missing'); return LEADS_DATA;");
    
    const data = fn();
    if (!data || !data.leads || !Array.isArray(data.leads)) {
      throw new Error('Invalid legacy data structure: LEADS_DATA.leads must be an array.');
    }
    
    console.log(`[Migrator] Loaded ${data.leads.length} legacy leads.`);
    return data.leads;
  } catch (err) {
    console.error('[Migrator] Error loading legacy data:', err);
    return [];
  }
}
