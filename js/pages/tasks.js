/**
 * @fileoverview Tasks page module for Jivanta Global Revenue OS.
 * Manages tasks and follow-ups, with overdue alerts and automated warning banner.
 */

import { Router } from '../router.js';
import { AppStore, TaskStore, LeadStore, ActivityStore } from '../store.js';
import { PRIORITIES } from '../constants.js';
import { renderToast } from '../components.js';
import { DB, generateId } from '../db.js';

let currentTab = 'all'; // all, today, overdue, upcoming, completed
let priorityFilter = '';

Router.register('/tasks', {
  title: 'Tasks & Follow-ups',
  icon: '✅',
  requiresAuth: true,
  async render() {
    const tasks = TaskStore.getState().tasks || [];
    const leads = LeadStore.getState().leads || [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Calculate stats
    const todayTasks = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === todayStr && t.status !== 'Done');
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) < todayStr && t.status !== 'Done');
    const upcomingTasks = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) > todayStr && t.status !== 'Done');
    const completedTasks = tasks.filter(t => t.status === 'Done');

    // Filter tasks based on selected tab and filters
    let filtered = tasks.filter(t => {
      // Priority filter
      if (priorityFilter && t.priority !== priorityFilter) return false;
      
      // Tab filter
      if (currentTab === 'today') return t.dueDate && t.dueDate.slice(0, 10) === todayStr && t.status !== 'Done';
      if (currentTab === 'overdue') return t.dueDate && t.dueDate.slice(0, 10) < todayStr && t.status !== 'Done';
      if (currentTab === 'upcoming') return t.dueDate && t.dueDate.slice(0, 10) > todayStr && t.status !== 'Done';
      if (currentTab === 'completed') return t.status === 'Done';
      
      return true; // 'all'
    });

    // Sort: Overdue first, then by date ascending
    filtered.sort((a, b) => {
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });

    // Stats Row
    const statCardsHtml = `
      <div class="dashboard-kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="stat-card" style="border-top-color: #3b82f6;">
          <div class="stat-label">Tasks Today</div>
          <div class="stat-value">${todayTasks.length}</div>
          <div class="stat-sub">Pending completion</div>
        </div>
        <div class="stat-card" style="border-top-color: ${overdueTasks.length > 0 ? '#ef4444' : '#10b981'};">
          <div class="stat-label">Overdue Tasks</div>
          <div class="stat-value" style="color: ${overdueTasks.length > 0 ? '#ef4444' : 'inherit'};">${overdueTasks.length}</div>
          <div class="stat-sub">Need immediate action</div>
        </div>
        <div class="stat-card" style="border-top-color: #8b5cf6;">
          <div class="stat-label">Upcoming</div>
          <div class="stat-value">${upcomingTasks.length}</div>
          <div class="stat-sub">Due in future</div>
        </div>
        <div class="stat-card" style="border-top-color: #10b981;">
          <div class="stat-label">Completed</div>
          <div class="stat-value">${completedTasks.length}</div>
          <div class="stat-sub">Historical task total</div>
        </div>
      </div>
    `;

    // Overdue Red Alert Banner
    const overdueBannerHtml = overdueTasks.length > 0
      ? `
        <div class="alert alert-danger" style="margin-bottom: var(--space-5); background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: var(--radius-md); padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <span style="font-size: 20px;">⚠️</span>
            <div>
              <strong style="color: #ef4444;">Missed Follow-up Warning!</strong>
              <div style="font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px;">You have ${overdueTasks.length} overdue outreach task(s). Schedule follow-ups immediately to avoid lost pipeline opportunity.</div>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" id="filterOverdueBannerBtn">Fix Now</button>
        </div>
      `
      : '';

    // Task rows
    const rowsHtml = filtered.map(t => {
      const isDone = t.status === 'Done';
      const isOver = t.dueDate && t.dueDate.slice(0, 10) < todayStr && !isDone;
      const lead = leads.find(l => l.id === t.leadId);
      
      const priorityObj = PRIORITIES.find(p => p.id === t.priority) || { name: t.priority || 'Medium', color: '#6b7280' };

      return `
        <tr class="task-row-item" style="${isDone ? 'opacity: 0.6;' : ''}">
          <td style="width: 48px; text-align: center;">
            <label class="checkbox-container">
              <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${isDone ? 'checked' : ''} />
              <span class="checkbox-box"></span>
            </label>
          </td>
          <td>
            <div style="font-weight: var(--weight-semibold); ${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.title}</div>
            ${t.description ? `<div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">${t.description}</div>` : ''}
          </td>
          <td>
            ${lead ? `<a href="/leads/${lead.id}" data-route style="color: var(--color-primary); font-weight: var(--weight-medium);">${lead.companyName}</a>` : '—'}
          </td>
          <td>
            <span style="${isOver ? 'color: #ef4444; font-weight: var(--weight-bold);' : ''}">
              ${new Date(t.dueDate).toLocaleDateString()}
              ${isOver ? ' (Overdue)' : ''}
            </span>
          </td>
          <td>
            <span class="badge" style="background-color: ${priorityObj.color}; color: #fff;">${priorityObj.name}</span>
          </td>
          <td>
            <span class="badge ${isDone ? 'badge-neutral' : 'badge-primary'}">${t.status}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-xs btn-outline delete-task-btn" data-id="${t.id}">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="tasks-page animate-fadeIn" style="padding: var(--space-6);">
        <!-- Header -->
        <div class="page-header" style="padding: 0 0 var(--space-5) 0; margin-bottom: var(--space-5); border-bottom: 1px solid var(--border);">
          <div class="page-header-left">
            <h2 class="page-header-title">Tasks & Reminders</h2>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="createNewTaskBtn">➕ Add Task</button>
          </div>
        </div>

        <!-- Overdue Alert Banner -->
        ${overdueBannerHtml}

        <!-- Stats Section -->
        ${statCardsHtml}

        <!-- Tabs & Filters -->
        <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-5);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4);">
            <div class="tabs" style="margin-bottom: 0;">
              <button class="btn btn-sm btn-outline task-tab-btn ${currentTab === 'all' ? 'active' : ''}" data-tab="all">All</button>
              <button class="btn btn-sm btn-outline task-tab-btn ${currentTab === 'today' ? 'active' : ''}" data-tab="today">Due Today (${todayTasks.length})</button>
              <button class="btn btn-sm btn-outline task-tab-btn ${currentTab === 'overdue' ? 'active' : ''}" data-tab="overdue">Overdue (${overdueTasks.length})</button>
              <button class="btn btn-sm btn-outline task-tab-btn ${currentTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">Upcoming</button>
              <button class="btn btn-sm btn-outline task-tab-btn ${currentTab === 'completed' ? 'active' : ''}" data-tab="completed">Completed</button>
            </div>
            <div style="display: flex; gap: var(--space-3); align-items: center;">
              <span style="font-size: var(--text-sm); color: var(--text-muted);">Priority:</span>
              <select id="taskPriorityFilter" class="form-select" style="width: 150px; margin-bottom: 0;">
                <option value="">All Priorities</option>
                ${PRIORITIES.map(p => `<option value="${p.id}" ${priorityFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Tasks Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 48px; text-align: center;"></th>
                  <th>Task Title</th>
                  <th>Linked Company</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="7" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No tasks found for this view.</td></tr>`}
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
  // Tab changes
  if (e.target && e.target.classList.contains('task-tab-btn')) {
    currentTab = e.target.dataset.tab;
    Router.reload();
  }

  // Fix overdue button in warning banner
  if (e.target && e.target.id === 'filterOverdueBannerBtn') {
    currentTab = 'overdue';
    Router.reload();
  }

  // Delete task button
  if (e.target && e.target.classList.contains('delete-task-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Delete this task?')) {
      await TaskStore.deleteTask(id);
      renderToast('Task deleted successfully.', 'success');
      Router.reload();
    }
  }

  // Checkbox complete task toggle
  if (e.target && e.target.classList.contains('task-checkbox')) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      await TaskStore.completeTask(id);
      renderToast('Task marked completed.', 'success');
    } else {
      // Toggle back to Todo
      const task = await DB.get('tasks', id);
      if (task) {
        task.status = 'Todo';
        await TaskStore.updateTask(task);
        renderToast('Task marked pending.', 'info');
      }
    }
    Router.reload();
  }

  // Show create task modal
  if (e.target && e.target.id === 'createNewTaskBtn') {
    showCreateTaskModal();
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'taskPriorityFilter') {
    priorityFilter = e.target.value;
    Router.reload();
  }
});

function showCreateTaskModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const leads = LeadStore.getState().leads || [];
  const priorityOptions = PRIORITIES.map(p => `<option value="${p.id}" ${p.id === 'medium' ? 'selected' : ''}>${p.name}</option>`).join('');
  const leadOptions = leads.map(l => `<option value="${l.id}">${l.companyName}</option>`).join('');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="createTaskModalOverlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Create Follow-up Task</h3>
          <button class="modal-close" onclick="document.getElementById('createTaskModalOverlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="globalNewTaskForm">
            <div class="form-group">
              <label class="form-label">Task Title *</label>
              <input type="text" id="taskTitleInput" class="form-input" required placeholder="e.g. Call client, Send samples" />
            </div>
            <div class="form-group">
              <label class="form-label">Description / Notes</label>
              <textarea id="taskDescInput" class="form-textarea" rows="2" placeholder="Specific notes on what needs to be discussed..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Link to Lead / Company</label>
              <select id="taskLeadSelect" class="form-select">
                <option value="">-- No Linked Company --</option>
                ${leadOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date *</label>
              <input type="date" id="taskDateInput" class="form-input" required value="${new Date().toISOString().slice(0, 10)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="taskPriorityInput" class="form-select">
                ${priorityOptions}
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('createTaskModalOverlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="saveGlobalTaskBtn">Create Task</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveGlobalTaskBtn').addEventListener('click', async () => {
    const form = document.getElementById('globalNewTaskForm');
    if (!form.reportValidity()) return;

    const leadId = document.getElementById('taskLeadSelect').value;
    const newTask = {
      id: generateId('TASK'),
      leadId: leadId || null,
      title: document.getElementById('taskTitleInput').value,
      description: document.getElementById('taskDescInput').value,
      dueDate: document.getElementById('taskDateInput').value,
      priority: document.getElementById('taskPriorityInput').value,
      status: 'Todo',
      assignedTo: AppStore.getState().currentUser?.id || 'admin',
      createdAt: new Date().toISOString()
    };

    await TaskStore.addTask(newTask);

    if (leadId) {
      await ActivityStore.logActivity({
        leadId: leadId,
        type: 'task',
        description: `Scheduled task: "${newTask.title}"`
      });
    }

    renderToast('Task scheduled successfully.', 'success');
    document.getElementById('createTaskModalOverlay').remove();
    Router.reload();
  });
}
