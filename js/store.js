/**
 * @file store.js
 * @description Reactive state management system for Jivanta Global Revenue OS.
 * Implements a lightweight pub/sub store pattern with IndexedDB persistence,
 * derived selectors, and async data operations.
 *
 * @module Store
 * @version 1.0.0
 */

import { DB, generateId } from './db.js';

// ────────────────────────────────────────────────────────────────────────────
// Store Factory
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {function(Object): void} Subscriber
 * A callback invoked whenever the store state changes.
 */

/**
 * @typedef {Object} Store
 * @property {function(): Object} getState - Returns current state snapshot
 * @property {function(Object|function(Object): Object): void} setState - Merges partial state or applies updater function
 * @property {function(Subscriber): function(): void} subscribe - Registers a listener, returns unsubscribe function
 * @property {function(function(Object): *): function(): *} select - Creates a derived selector
 */

/**
 * Creates a reactive store with pub/sub notifications.
 *
 * The store is synchronous by default — subscribers fire immediately
 * on state change. For batched updates, wrap multiple `setState` calls
 * in a `batchUpdate()`.
 *
 * @param {Object} initialState - The initial state shape
 * @returns {Store} A reactive store instance
 *
 * @example
 * const store = createStore({ count: 0 });
 * const unsub = store.subscribe((state) => console.log(state.count));
 * store.setState({ count: 1 }); // logs: 1
 * unsub(); // stop listening
 */
export function createStore(initialState) {
  /** @type {Object} */
  let state = { ...initialState };

  /** @type {Set<Subscriber>} */
  const subscribers = new Set();

  /** @type {boolean} */
  let isBatching = false;

  /** @type {boolean} */
  let hasPendingNotify = false;

  /**
   * Notify all subscribers of the current state.
   * Skipped during batch mode — flushed once at the end.
   */
  function notify() {
    if (isBatching) {
      hasPendingNotify = true;
      return;
    }
    const snapshot = { ...state };
    for (const subscriber of subscribers) {
      try {
        subscriber(snapshot);
      } catch (err) {
        console.error('[Store] Subscriber threw an error:', err);
      }
    }
  }

  return {
    /**
     * Returns a shallow copy of the current state.
     *
     * @returns {Object} Current state snapshot
     */
    getState() {
      return { ...state };
    },

    /**
     * Merges partial state into the store, or applies an updater function.
     *
     * @param {Object|function(Object): Object} partial - Partial state object or updater `(prevState) => newPartial`
     */
    setState(partial) {
      const updates = typeof partial === 'function' ? partial(state) : partial;
      if (!updates || typeof updates !== 'object') return;

      // Shallow merge
      let hasChanged = false;
      for (const key of Object.keys(updates)) {
        if (!Object.is(state[key], updates[key])) {
          hasChanged = true;
          break;
        }
      }

      if (!hasChanged) return;

      state = { ...state, ...updates };
      notify();
    },

    /**
     * Registers a subscriber that fires on every state change.
     *
     * @param {Subscriber} callback - Listener function receiving the new state
     * @returns {function(): void} Unsubscribe function
     */
    subscribe(callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('[Store] subscribe() expects a function callback.');
      }
      subscribers.add(callback);

      // Immediately fire with current state so the subscriber can initialize
      try {
        callback({ ...state });
      } catch (err) {
        console.error('[Store] Subscriber threw during initial call:', err);
      }

      return () => {
        subscribers.delete(callback);
      };
    },

    /**
     * Creates a derived selector for computed/derived state.
     * Returns a function that, when called, applies the selector
     * to the current state.
     *
     * @template T
     * @param {function(Object): T} selectorFn - Pure function mapping state to derived value
     * @returns {function(): T} Getter function for the derived value
     *
     * @example
     * const getActiveLeads = LeadStore.select(s => s.leads.filter(l => l.leadStatus === 'active'));
     * console.log(getActiveLeads()); // [...active leads]
     */
    select(selectorFn) {
      if (typeof selectorFn !== 'function') {
        throw new TypeError('[Store] select() expects a selector function.');
      }
      return () => selectorFn(state);
    },

    /**
     * Batches multiple setState calls into a single notification.
     *
     * @param {function(): void} fn - Function containing multiple setState calls
     */
    batchUpdate(fn) {
      isBatching = true;
      hasPendingNotify = false;
      try {
        fn();
      } finally {
        isBatching = false;
        if (hasPendingNotify) {
          hasPendingNotify = false;
          notify();
        }
      }
    },

    /**
     * Returns the current subscriber count (useful for debugging).
     *
     * @returns {number}
     */
    get subscriberCount() {
      return subscribers.size;
    },
  };
}


// ────────────────────────────────────────────────────────────────────────────
// Application Stores
// ────────────────────────────────────────────────────────────────────────────

// ─── AppStore ───────────────────────────────────────────────────────────────

/**
 * Global application state store.
 * Manages user session, navigation, UI state, notifications, and toasts.
 *
 * @type {Store & { addToast: Function, removeToast: Function, setLoading: Function, setCurrentUser: Function, navigateTo: Function, toggleSidebar: Function }}
 */
export const AppStore = createStore({
  /** @type {null|{id: string, name: string, email: string, role: string, avatar: string}} */
  currentUser: null,
  /** @type {string} */
  currentPage: 'dashboard',
  /** @type {boolean} */
  sidebarCollapsed: false,
  /** @type {string} */
  searchQuery: '',
  /** @type {Array<Object>} */
  notifications: [],
  /** @type {Array<{id: string, message: string, type: string, duration: number}>} */
  toasts: [],
  /** @type {boolean} */
  loading: false,
  /** @type {'dark'|'light'} */
  theme: 'dark',
  /** @type {string} */
  zohoDomain: 'mail.zoho.in',
  /** @type {string} */
  emailMethod: 'zoho',
});

/**
 * Adds a toast notification to the app.
 * Automatically removes it after the specified duration.
 *
 * @param {string} message - Toast message
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Toast severity
 * @param {number} [duration=4000] - Auto-dismiss duration in ms
 */
AppStore.addToast = function (message, type = 'info', duration = 4000) {
  const toast = {
    id: generateId(),
    message,
    type,
    duration,
    createdAt: Date.now(),
  };

  const current = this.getState().toasts;
  this.setState({ toasts: [...current, toast] });

  if (duration > 0) {
    setTimeout(() => {
      this.removeToast(toast.id);
    }, duration);
  }
};

/**
 * Removes a toast by ID.
 *
 * @param {string} toastId - ID of the toast to remove
 */
AppStore.removeToast = function (toastId) {
  const current = this.getState().toasts;
  this.setState({ toasts: current.filter((t) => t.id !== toastId) });
};

/**
 * Sets the global loading state.
 *
 * @param {boolean} isLoading
 */
AppStore.setLoading = function (isLoading) {
  this.setState({ loading: isLoading });
};

/**
 * Sets the current authenticated user and persists to IndexedDB.
 *
 * @param {Object|null} user - The user object or null to log out
 * @returns {Promise<void>}
 */
AppStore.setCurrentUser = async function (user) {
  this.setState({ currentUser: user });
  if (user) {
    await DB.put('settings', { key: 'currentUser', value: user });
  } else {
    await DB.delete('settings', 'currentUser');
  }
};

/**
 * Navigates to a page and updates state.
 *
 * @param {string} page - Page identifier (e.g., 'dashboard', 'leads', 'pipeline')
 */
AppStore.navigateTo = function (page) {
  this.setState({ currentPage: page });
};

/**
 * Toggles sidebar collapsed/expanded state.
 */
AppStore.toggleSidebar = function () {
  const { sidebarCollapsed } = this.getState();
  this.setState({ sidebarCollapsed: !sidebarCollapsed });
};

/**
 * Loads persisted app settings from IndexedDB.
 *
 * @returns {Promise<void>}
 */
AppStore.loadSettings = async function () {
  const userSetting = await DB.get('settings', 'currentUser');
  const themeSetting = await DB.get('settings', 'theme');
  const sidebarSetting = await DB.get('settings', 'sidebarCollapsed');
  const zohoDomainSetting = await DB.get('settings', 'zohoDomain');
  const emailMethodSetting = await DB.get('settings', 'emailMethod');

  this.batchUpdate(() => {
    if (userSetting) this.setState({ currentUser: userSetting.value });
    if (themeSetting) this.setState({ theme: themeSetting.value });
    if (sidebarSetting) this.setState({ sidebarCollapsed: sidebarSetting.value });
    if (zohoDomainSetting) this.setState({ zohoDomain: zohoDomainSetting.value });
    if (emailMethodSetting) this.setState({ emailMethod: emailMethodSetting.value });
  });
};


// ─── LeadStore ──────────────────────────────────────────────────────────────

/** Default filters shape for lead filtering */
const DEFAULT_FILTERS = {
  product: '',
  country: '',
  confidence: '',
  status: '',
  owner: '',
  search: '',
  tags: [],
};

/**
 * Lead management store.
 * Handles lead CRUD, filtering, sorting, search, and pagination.
 *
 * @type {Store}
 */
export const LeadStore = createStore({
  /** @type {Array<Object>} */
  leads: [],
  /** @type {Array<Object>} */
  filteredLeads: [],
  /** @type {Set<string>} */
  selectedLeadIds: new Set(),
  /** @type {typeof DEFAULT_FILTERS} */
  filters: { ...DEFAULT_FILTERS },
  /** @type {string} */
  sortField: 'updatedAt',
  /** @type {-1|1} */
  sortDir: -1,
  /** @type {Object|null} */
  currentLead: null,
  /** @type {{page: number, pageSize: number, total: number}} */
  pagination: { page: 1, pageSize: 50, total: 0 },
});

/**
 * Applies current filters, sorting, and pagination to the leads array.
 * Called internally after any mutation that affects the displayed list.
 */
LeadStore.applyFilters = function () {
  const { leads, filters, sortField, sortDir } = this.getState();

  let filtered = [...leads];

  // Apply text search
  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter((lead) => {
      const searchable = [
        lead.companyName,
        lead.contactPerson,
        lead.email,
        lead.country,
        lead.productInterest,
        lead.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });
  }

  // Apply discrete filters
  if (filters.product) {
    filtered = filtered.filter((l) => l.productInterest === filters.product);
  }
  if (filters.country) {
    filtered = filtered.filter((l) => l.country === filters.country);
  }
  if (filters.confidence) {
    filtered = filtered.filter((l) => l.confidence === filters.confidence);
  }
  if (filters.status) {
    filtered = filtered.filter((l) => l.leadStatus === filters.status);
  }
  if (filters.owner) {
    filtered = filtered.filter((l) => l.leadOwner === filters.owner);
  }
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((l) =>
      filters.tags.every((tag) => l.tags && l.tags.includes(tag))
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    if (aVal < bVal) return -1 * sortDir;
    if (aVal > bVal) return 1 * sortDir;
    return 0;
  });

  const total = filtered.length;
  const { page, pageSize } = this.getState().pagination;

  this.setState({
    filteredLeads: filtered,
    pagination: { page, pageSize, total },
  });
};

/**
 * Loads all leads from IndexedDB into the store and applies filters.
 *
 * @returns {Promise<void>}
 */
LeadStore.loadLeads = async function () {
  AppStore.setLoading(true);
  try {
    const leads = await DB.getAll('leads');
    this.setState({ leads });
    this.applyFilters();
  } catch (err) {
    console.error('[LeadStore] Failed to load leads:', err);
    AppStore.addToast('Failed to load leads', 'error');
  } finally {
    AppStore.setLoading(false);
  }
};

/**
 * Adds a new lead to IndexedDB and the store.
 *
 * @param {Object} leadData - Lead fields (id will be auto-generated if missing)
 * @returns {Promise<Object>} The created lead record
 */
LeadStore.addLead = async function (leadData) {
  const lead = {
    id: generateId(),
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: '',
    productInterest: '',
    leadStatus: 'New Lead',
    leadOwner: '',
    priority: 'Medium',
    confidence: '',
    source: '',
    notes: '',
    tags: [],
    ...leadData,
  };

  await DB.put('leads', lead);

  const { leads } = this.getState();
  this.setState({ leads: [lead, ...leads] });
  this.applyFilters();

  // Log activity
  await ActivityStore.logActivity({
    leadId: lead.id,
    type: 'lead_created',
    description: `Lead "${lead.companyName}" created`,
  });

  AppStore.addToast(`Lead "${lead.companyName}" created`, 'success');
  return lead;
};

/**
 * Updates an existing lead in IndexedDB and the store.
 *
 * @param {string} leadId - The lead ID to update
 * @param {Object} updates - Partial lead fields to merge
 * @returns {Promise<Object|null>} The updated lead, or null if not found
 */
LeadStore.updateLead = async function (leadId, updates) {
  const existing = await DB.get('leads', leadId);
  if (!existing) {
    AppStore.addToast('Lead not found', 'error');
    return null;
  }

  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await DB.put('leads', updated);

  const { leads, currentLead } = this.getState();
  const newLeads = leads.map((l) => (l.id === leadId ? updated : l));

  this.setState({
    leads: newLeads,
    currentLead: currentLead?.id === leadId ? updated : currentLead,
  });
  this.applyFilters();

  await ActivityStore.logActivity({
    leadId,
    type: 'lead_updated',
    description: `Lead "${updated.companyName}" updated`,
    metadata: { fields: Object.keys(updates) },
  });

  return updated;
};

/**
 * Deletes a lead from IndexedDB and the store.
 *
 * @param {string} leadId - The lead ID to delete
 * @returns {Promise<void>}
 */
LeadStore.deleteLead = async function (leadId) {
  const existing = await DB.get('leads', leadId);
  await DB.delete('leads', leadId);

  const { leads, selectedLeadIds } = this.getState();
  const newSelected = new Set(selectedLeadIds);
  newSelected.delete(leadId);

  this.setState({
    leads: leads.filter((l) => l.id !== leadId),
    selectedLeadIds: newSelected,
    currentLead: this.getState().currentLead?.id === leadId ? null : this.getState().currentLead,
  });
  this.applyFilters();

  AppStore.addToast(`Lead "${existing?.companyName ?? leadId}" deleted`, 'success');
};

/**
 * Sets the sort field and direction, then re-applies filters.
 *
 * @param {string} field - Field name to sort by
 * @param {-1|1} [dir] - Sort direction (-1 = descending, 1 = ascending). Toggles if same field.
 */
LeadStore.setSort = function (field, dir) {
  const { sortField, sortDir } = this.getState();
  const newDir = dir ?? (sortField === field ? sortDir * -1 : -1);
  this.setState({ sortField: field, sortDir: newDir });
  this.applyFilters();
};

/**
 * Performs a full-text search and updates filters.
 *
 * @param {string} term - Search query
 */
LeadStore.searchLeads = function (term) {
  const { filters } = this.getState();
  this.setState({ filters: { ...filters, search: term } });
  this.applyFilters();
};

/**
 * Returns leads grouped by product interest.
 *
 * @returns {Record<string, Array<Object>>}
 */
LeadStore.getLeadsByProduct = function () {
  const { leads } = this.getState();
  /** @type {Record<string, Array<Object>>} */
  const grouped = {};
  for (const lead of leads) {
    const product = lead.productInterest || 'Unspecified';
    if (!grouped[product]) grouped[product] = [];
    grouped[product].push(lead);
  }
  return grouped;
};

/**
 * Returns leads grouped by status.
 *
 * @returns {Record<string, Array<Object>>}
 */
LeadStore.getLeadsByStatus = function () {
  const { leads } = this.getState();
  /** @type {Record<string, Array<Object>>} */
  const grouped = {};
  for (const lead of leads) {
    const status = lead.leadStatus || 'Unknown';
    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(lead);
  }
  return grouped;
};


// ─── PipelineStore ──────────────────────────────────────────────────────────

/** @type {Array<string>} All pipeline stage names in order */
const PIPELINE_STAGES = [
  'New Lead',
  'Research',
  'Contacted',
  'Interested',
  'Meeting Scheduled',
  'Quotation Sent',
  'Negotiation',
  'Sample Sent',
  'Follow-up',
  'Purchase Order',
  'Won',
  'Lost',
  'Dormant',
];

/**
 * Builds the initial empty stageLeads map.
 *
 * @returns {Record<string, Array<Object>>}
 */
function buildEmptyStageLeads() {
  /** @type {Record<string, Array<Object>>} */
  const map = {};
  for (const stage of PIPELINE_STAGES) {
    map[stage] = [];
  }
  return map;
}

/**
 * Sales pipeline store.
 * Organizes leads into Kanban-style stages for visual pipeline management.
 *
 * @type {Store}
 */
export const PipelineStore = createStore({
  /** @type {Array<string>} */
  stages: [...PIPELINE_STAGES],
  /** @type {Record<string, Array<Object>>} */
  stageLeads: buildEmptyStageLeads(),
});

/**
 * Refreshes the pipeline by distributing current leads into their stages.
 * Reads directly from LeadStore to ensure consistency.
 *
 * @returns {void}
 */
PipelineStore.refreshPipeline = function () {
  const { leads } = LeadStore.getState();
  const stageLeads = buildEmptyStageLeads();

  for (const lead of leads) {
    const stage = lead.leadStatus || 'New Lead';
    if (stageLeads[stage]) {
      stageLeads[stage].push(lead);
    } else {
      // Lead has a status not in the pipeline stages — put in 'New Lead'
      stageLeads['New Lead'].push(lead);
    }
  }

  this.setState({ stageLeads });
};

/**
 * Moves a lead to a new pipeline stage.
 * Updates both IndexedDB and the pipeline view.
 *
 * @param {string} leadId - ID of the lead to move
 * @param {string} newStage - Target pipeline stage name
 * @returns {Promise<void>}
 */
PipelineStore.moveLeadToStage = async function (leadId, newStage) {
  if (!PIPELINE_STAGES.includes(newStage)) {
    console.error(`[PipelineStore] Invalid stage: "${newStage}"`);
    AppStore.addToast(`Invalid pipeline stage: "${newStage}"`, 'error');
    return;
  }

  await LeadStore.updateLead(leadId, { leadStatus: newStage });

  // Refresh pipeline to reflect the change
  this.refreshPipeline();

  await ActivityStore.logActivity({
    leadId,
    type: 'stage_change',
    description: `Lead moved to "${newStage}"`,
    metadata: { newStage },
  });
};

/**
 * Returns statistics for each pipeline stage.
 *
 * @returns {Array<{stage: string, count: number, percentage: number}>}
 */
PipelineStore.getStageStats = function () {
  const { stageLeads, stages } = this.getState();
  const total = Object.values(stageLeads).reduce((sum, arr) => sum + arr.length, 0);

  return stages.map((stage) => ({
    stage,
    count: stageLeads[stage]?.length ?? 0,
    percentage: total > 0 ? Math.round(((stageLeads[stage]?.length ?? 0) / total) * 100) : 0,
  }));
};


// ─── TaskStore ──────────────────────────────────────────────────────────────

/**
 * Task & follow-up management store.
 *
 * @type {Store}
 */
export const TaskStore = createStore({
  /** @type {Array<Object>} */
  tasks: [],
  /** @type {number} */
  overdueCount: 0,
});

/**
 * Recalculates the overdue task count based on current tasks.
 */
function recalcOverdue() {
  const { tasks } = TaskStore.getState();
  const now = new Date().toISOString();
  const overdueCount = tasks.filter(
    (t) => t.status !== 'Done' && t.dueDate && t.dueDate < now
  ).length;
  TaskStore.setState({ overdueCount });
}

/**
 * Loads all tasks from IndexedDB.
 *
 * @returns {Promise<void>}
 */
TaskStore.loadTasks = async function () {
  try {
    const tasks = await DB.getAll('tasks');
    this.setState({ tasks });
    recalcOverdue();
  } catch (err) {
    console.error('[TaskStore] Failed to load tasks:', err);
    AppStore.addToast('Failed to load tasks', 'error');
  }
};

/**
 * Creates a new task and persists to IndexedDB.
 *
 * @param {Object} taskData - Task fields
 * @returns {Promise<Object>} The created task
 */
TaskStore.addTask = async function (taskData) {
  const task = {
    id: generateId(),
    title: '',
    description: '',
    leadId: null,
    assignedTo: '',
    dueDate: '',
    status: 'Todo',
    priority: 'Medium',
    ...taskData,
  };

  await DB.put('tasks', task);

  const { tasks } = this.getState();
  this.setState({ tasks: [task, ...tasks] });
  recalcOverdue();

  if (task.leadId) {
    await ActivityStore.logActivity({
      leadId: task.leadId,
      type: 'task',
      description: `Scheduled task: "${task.title}"`
    });
  }

  AppStore.addToast(`Task "${task.title}" created`, 'success');
  return task;
};

/**
 * Marks a task as completed.
 *
 * @param {string} taskId - ID of the task to complete
 * @returns {Promise<Object|null>} The updated task
 */
TaskStore.completeTask = async function (taskId) {
  const existing = await DB.get('tasks', taskId);
  if (!existing) return null;

  const updated = { ...existing, status: 'Done', completedAt: new Date().toISOString() };
  await DB.put('tasks', updated);

  const { tasks } = this.getState();
  this.setState({ tasks: tasks.map((t) => (t.id === taskId ? updated : t)) });
  recalcOverdue();

  if (updated.leadId) {
    await ActivityStore.logActivity({
      leadId: updated.leadId,
      type: 'task',
      description: `Completed task: "${updated.title}"`
    });
  }

  AppStore.addToast(`Task "${updated.title}" completed`, 'success');
  return updated;
};

/**
 * Updates an existing task in IndexedDB and the store.
 *
 * @param {Object} task - The task object to update
 * @returns {Promise<Object>} The updated task
 */
TaskStore.updateTask = async function (task) {
  await DB.put('tasks', task);

  const { tasks } = this.getState();
  this.setState({ tasks: tasks.map((t) => (t.id === task.id ? task : t)) });
  recalcOverdue();

  return task;
};

/**
 * Deletes a task from IndexedDB and the store.
 *
 * @param {string} taskId - The task ID to delete
 * @returns {Promise<void>}
 */
TaskStore.deleteTask = async function (taskId) {
  await DB.delete('tasks', taskId);

  const { tasks } = this.getState();
  this.setState({ tasks: tasks.filter((t) => t.id !== taskId) });
  recalcOverdue();
};

/**
 * Returns all overdue tasks (due before now and not completed).
 *
 * @returns {Array<Object>}
 */
TaskStore.getOverdueTasks = function () {
  const { tasks } = this.getState();
  const now = new Date().toISOString();
  return tasks.filter((t) => t.status !== 'Done' && t.dueDate && t.dueDate < now);
};

/**
 * Returns all tasks associated with a specific lead.
 *
 * @param {string} leadId - The lead ID
 * @returns {Array<Object>}
 */
TaskStore.getTasksByLead = function (leadId) {
  const { tasks } = this.getState();
  return tasks.filter((t) => t.leadId === leadId);
};

/**
 * Returns tasks due today (regardless of status).
 *
 * @returns {Array<Object>}
 */
TaskStore.getTodayTasks = function () {
  const { tasks } = this.getState();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return tasks.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === today);
};


// ─── ActivityStore ──────────────────────────────────────────────────────────

/**
 * Activity log store.
 * Records all CRM actions for auditing and timeline views.
 *
 * @type {Store}
 */
export const ActivityStore = createStore({
  /** @type {Array<Object>} */
  activities: [],
});

/**
 * Logs a new activity event and persists to IndexedDB.
 *
 * @param {Object} activityData - Activity fields
 * @param {string} [activityData.leadId] - Associated lead ID
 * @param {string} activityData.type - Activity type (e.g., 'lead_created', 'call_logged')
 * @param {string} activityData.description - Human-readable description
 * @param {Object} [activityData.metadata] - Additional structured data
 * @returns {Promise<Object>} The created activity record
 */
ActivityStore.logActivity = async function (activityData) {
  const { currentUser } = AppStore.getState();

  const activity = {
    id: generateId(),
    userId: currentUser?.id ?? 'system',
    userName: currentUser?.name ?? 'System',
    leadId: null,
    type: 'general',
    description: '',
    metadata: {},
    ...activityData,
    createdAt: new Date().toISOString(),
  };

  try {
    await DB.put('activities', activity);

    const { activities } = this.getState();
    // Keep the most recent activities at the top, cap in-memory at 500
    const updated = [activity, ...activities].slice(0, 500);
    this.setState({ activities: updated });
  } catch (err) {
    console.error('[ActivityStore] Failed to log activity:', err);
  }

  return activity;
};

/**
 * Returns all activities for a specific lead, sorted newest first.
 *
 * @param {string} leadId - The lead ID
 * @returns {Promise<Array<Object>>}
 */
ActivityStore.getActivitiesForLead = async function (leadId) {
  try {
    const activities = await DB.query('activities', 'leadId', leadId);
    return activities.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch (err) {
    console.error('[ActivityStore] Failed to get activities for lead:', err);
    return [];
  }
};

/**
 * Returns the most recent activities across all leads.
 *
 * @param {number} [limit=50] - Maximum number of activities to return
 * @returns {Promise<Array<Object>>}
 */
ActivityStore.getRecentActivities = async function (limit = 50) {
  try {
    const all = await DB.getAll('activities');
    return all
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);
  } catch (err) {
    console.error('[ActivityStore] Failed to get recent activities:', err);
    return [];
  }
};

/**
 * Loads the most recent activities into the store from IndexedDB.
 *
 * @param {number} [limit=200] - Maximum number to load into memory
 * @returns {Promise<void>}
 */
ActivityStore.loadActivities = async function (limit = 200) {
  try {
    const all = await DB.getAll('activities');
    const sorted = all
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);
    this.setState({ activities: sorted });
  } catch (err) {
    console.error('[ActivityStore] Failed to load activities:', err);
  }
};


// ────────────────────────────────────────────────────────────────────────────
// UserStore Definition
// ────────────────────────────────────────────────────────────────────────────

export const UserStore = createStore({
  users: [],
});

UserStore.loadUsers = async function () {
  try {
    const users = await DB.getAll('users');
    this.setState({ users });
  } catch (err) {
    console.error('[UserStore] Failed to load users:', err);
  }
};

UserStore.addUser = async function (user) {
  await DB.put('users', user);
  await this.loadUsers();
};

UserStore.updateUser = async function (user) {
  await DB.put('users', user);
  await this.loadUsers();
};

UserStore.deleteUser = async function (userId) {
  await DB.delete('users', userId);
  await this.loadUsers();
};


// ────────────────────────────────────────────────────────────────────────────
// Initialization Helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Initializes all stores by loading persisted data from IndexedDB.
 * Should be called once during application bootstrap.
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { initializeStores } from './store.js';
 * await initializeStores();
 */
export async function initializeStores() {
  await DB.init();

  // Pre-populate default users if table is empty
  try {
    const userCount = await DB.count('users');
    if (userCount === 0) {
      const DEFAULT_USERS = [
        { id: 'admin', name: 'Subham Jain', email: 'admin@jivantaglobal.com', role: 'super_admin', team: 'management', isActive: true, failedAttempts: 0, createdAt: new Date().toISOString() },
        { id: 'mgr_sanjay', name: 'Sanjay Kumar', email: 'manager@jivantaglobal.com', role: 'sales_manager', team: 'domestic_sales', isActive: true, failedAttempts: 0, createdAt: new Date().toISOString() },
        { id: 'exec_rahul', name: 'Rahul Sen', email: 'employee@jivantaglobal.com', role: 'sales_executive', team: 'domestic_sales', isActive: true, failedAttempts: 0, createdAt: new Date().toISOString() }
      ];
      for (const u of DEFAULT_USERS) {
        await DB.put('users', u);
      }
      console.info('[Store] Pre-populated default team users in database.');
    }
  } catch (err) {
    console.error('[Store] Failed to check or seed users table:', err);
  }

  // Load all stores concurrently
  await Promise.all([
    AppStore.loadSettings(),
    LeadStore.loadLeads(),
    TaskStore.loadTasks(),
    ActivityStore.loadActivities(),
    UserStore.loadUsers(),
  ]);

  // Pipeline depends on leads being loaded
  PipelineStore.refreshPipeline();

  // Keep pipeline in sync with lead changes
  LeadStore.subscribe(() => {
    PipelineStore.refreshPipeline();
  });

  console.info('[Store] All stores initialized and synced.');
}

export default {
  createStore,
  AppStore,
  LeadStore,
  PipelineStore,
  TaskStore,
  ActivityStore,
  UserStore,
  initializeStores,
};
