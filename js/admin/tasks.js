// ==========================================
// TASKS.JS (Admin Task Management & Role Logic)
// ==========================================

let allTasks = [];
let currentUser = null;
let currentActiveTaskId = null;

// Column definitions for Kanban
const COLUMNS = [
    { id: 'assigned', title: 'Assigned', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'in_progress', title: 'In Progress', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'pending_verification', title: 'Review Pending', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
    { id: 'completed', title: 'Completed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'cancelled', title: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Establish Current User Session
    const userData = localStorage.getItem('samithi_user');
    if (!userData) return window.location.href = '../../index.html';
    try {
        currentUser = JSON.parse(userData) || {};
    } catch (_) {
        currentUser = {};
    }

    // GLOBALLY define the ID safely
    const currentUserId = String(currentUser.user_id || currentUser.userId || currentUser.id || 'anonymous');

    // Setup Admin Details safely
    const topNameEl = document.getElementById('top-user-name');
    const topInitEl = document.getElementById('top-user-initial');
    const fName = currentUser.firstName || currentUser.first_name || 'Admin';
    const lName = currentUser.lastName || currentUser.last_name || '';
    if (topNameEl) topNameEl.innerText = `${fName} ${lName}`.trim();
    if (topInitEl) topInitEl.innerText = (fName.charAt(0) || 'A').toUpperCase();

    // 2. Initialize Data non-blockingly
    // Show immediate loading indicator on Kanban board
    const boardEl = document.getElementById('kanban-board');
    if (boardEl) {
        boardEl.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted);">
                <i data-lucide="loader-2" class="spin" style="width: 28px; height: 28px; margin-bottom: 12px; color: var(--accent-primary);"></i>
                <span style="font-size: 14px; font-weight: 600;">Loading tasks...</span>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    // Fetch tasks immediately so user sees them without waiting for heavy dropdowns
    fetchTasks();
    // Load dropdown options concurrently in background
    loadDropdownData();

    // 3. Event Listeners
    const searchInputEl = document.getElementById('task-search-input');
    if (searchInputEl) searchInputEl.addEventListener('input', debounceRender);
    const filterStatusEl = document.getElementById('filter-task-status');
    if (filterStatusEl) filterStatusEl.addEventListener('change', fetchTasks);
    
    // Event Delegation for clicking Task Cards on the Kanban board
    document.getElementById('kanban-board').addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (card) {
            openTaskDetailsModal(card.dataset.id);
        }
    });

    if (window.lucide) lucide.createIcons();
});

// --- HELPER: URL Auto-Linker ---
function linkify(text) {
    if (!text) return '--';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="auto-link" rel="noopener noreferrer">${url}</a>`;
    }).replace(/\n/g, '<br>');
}

// --- HELPER: Format Deadline ---
function formatDeadline(dateString, status) {
    if (!dateString) return '<span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px; height:12px; display:inline;"></i> No Deadline</span>';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return escapeHTML(dateString);

    const formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Completed, cancelled, and review-pending tasks must NOT be flagged as Overdue or Due Soon
    const isResolvedOrSubmitted = ['completed', 'cancelled', 'pending_verification'].includes(status);
    if (isResolvedOrSubmitted) {
        return `<span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px; height:12px; display:inline;"></i> ${formatted}</span>`;
    }

    const now = new Date();
    const isPast = date < now;
    const isSoon = (date - now) < (24 * 60 * 60 * 1000) && !isPast; // within 24 hrs
    
    if (isPast) return `<span class="deadline-danger" style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="alert-circle" style="width:12px; height:12px; display:inline;"></i> Overdue: ${formatted}</span>`;
    if (isSoon) return `<span class="deadline-warning" style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px; height:12px; display:inline;"></i> Due Soon: ${formatted}</span>`;
    return `<span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px; height:12px; display:inline;"></i> ${formatted}</span>`;
}

// --- HELPER: Escape HTML to prevent XSS ---
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag)
    );
}

// ==========================================
// DATA FETCHING & RENDERING
// ==========================================
async function loadDropdownData() {
    try {
        // Fetch users for assignee dropdown
        const volRes = await ApiClient.request('/admin/volunteers?limit=1000', 'GET');
        const assigneeSelect = document.getElementById('task-assignee');
        if (assigneeSelect) {
            let optionsHtml = '<option value="">Select a user...</option>';
            const vols = (volRes && volRes.data && (volRes.data.data || volRes.data)) || [];
            if (Array.isArray(vols)) {
                vols.forEach(user => {
                    const uName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
                    const uRole = user.role || 'volunteer';
                    optionsHtml += `<option value="${user.user_id}">${escapeHTML(uName)} (${escapeHTML(uRole)})</option>`;
                });
            }
            assigneeSelect.innerHTML = optionsHtml;
        }

        // Fetch events for linked event dropdown
        const evRes = await ApiClient.request('/admin/events?limit=100', 'GET');
        const eventSelect = document.getElementById('task-event');
        if (eventSelect) {
            let evOptionsHtml = '<option value="">No Event Linked</option>';
            const evs = (evRes && evRes.data && (evRes.data.data || evRes.data)) || [];
            if (Array.isArray(evs)) {
                evs.forEach(ev => {
                    const evDate = ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '';
                    evOptionsHtml += `<option value="${ev.event_id}">${escapeHTML(ev.title || 'Event')} (${evDate})</option>`;
                });
            }
            eventSelect.innerHTML = evOptionsHtml;
        }
    } catch (e) {
        console.error("Failed to load dropdowns:", e);
    }
}

async function fetchTasks() {
    const statusFilter = document.getElementById('filter-task-status')?.value || '';
    let url = `/admin/tasks?limit=200`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

    try {
        const response = await ApiClient.request(url, 'GET');
        let rawList = [];
        if (Array.isArray(response)) {
            rawList = response;
        } else if (response && Array.isArray(response.data)) {
            rawList = response.data;
        } else if (response && response.data && Array.isArray(response.data.data)) {
            rawList = response.data.data;
        } else if (response && response.data && Array.isArray(response.data.tasks)) {
            rawList = response.data.tasks;
        } else if (response && Array.isArray(response.tasks)) {
            rawList = response.tasks;
        }

        allTasks = rawList;
        renderKanban();
    } catch (error) {
        console.error("Error fetching admin tasks:", error);
        const board = document.getElementById('kanban-board');
        if (board) {
            board.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #EF4444;">
                    <i data-lucide="alert-circle" style="width: 28px; height: 28px; margin: 0 auto 10px auto; display: block;"></i>
                    <p style="font-weight: 700; margin-bottom: 6px;">Failed to load tasks</p>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${escapeHTML(error.message || 'Connection error with task server')}</p>
                    <button type="button" class="primary-btn" onclick="fetchTasks()" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 13px;">
                        <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Retry
                    </button>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }
}

let searchTimeout;
function debounceRender() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderKanban, 300);
}

function renderKanban() {
    const board = document.getElementById('kanban-board');
    const searchTerm = document.getElementById('task-search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-task-status').value;
    
    const filteredTasks = allTasks.filter(t => t.title.toLowerCase().includes(searchTerm) || (t.assignee_first && t.assignee_first.toLowerCase().includes(searchTerm)));

    const visibleColumns = statusFilter 
        ? COLUMNS.filter(col => col.id === statusFilter)
        : COLUMNS;

    board.innerHTML = visibleColumns.map(col => {
        const colTasks = filteredTasks.filter(t => t.status === col.id);
        
        const tasksHtml = colTasks.map(task => {
            const isCancelled = task.status === 'cancelled';
            const cardOpacity = isCancelled ? '0.6' : '1';
            const titleStyle = isCancelled ? 'text-decoration: line-through; color: var(--text-muted);' : '';

            // The hour badge we created earlier!
            const hours = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;
            const hoursHtml = hours > 0 
                ? `<span style="font-size: 11px; font-weight: 800; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 6px;"><i data-lucide="award" style="width:10px; display:inline; margin-right:2px;"></i>${hours}</span>` 
                : '';

            return `
            <div class="task-card" data-id="${task.task_id}" style="opacity: ${cardOpacity};">
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div class="task-card-title" style="${titleStyle}">${task.title}</div>
                    ${hoursHtml}
                </div>
                ${task.event_title ? `<div style="font-size:11px; color:var(--primary); margin-bottom: 8px; font-weight:500;">📍 ${task.event_title}</div>` : ''}
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="task-avatar">${task.assignee_first ? task.assignee_first[0] : '?'}</div>
                        ${task.assignee_first} ${task.assignee_last || ''}
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 11px;">
                    ${formatDeadline(task.deadline, task.status)}
                </div>
            </div>
            `;
        }).join('');

        return `
            <div class="kanban-column">
                <div class="kanban-header" style="border-bottom-color: ${col.color};">
                    <span style="color: ${col.color}">${col.title}</span>
                    <span class="kanban-count">${colTasks.length}</span>
                </div>
                <div class="kanban-body">
                    ${tasksHtml || `<div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">No tasks here</div>`}
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// ==========================================
// MODAL CONTROLS & DYNAMIC ROLE LOGIC
// ==========================================
function openCreateTaskModal() { 
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const localNow = now.toISOString().slice(0, 16);
    document.getElementById('task-deadline').min = localNow;    
    
    const titleEl = document.getElementById('taskModalTitle');
    if (titleEl) titleEl.innerText = "Create New Task";
    const editIdEl = document.getElementById('task-editing-id');
    if (editIdEl) editIdEl.value = "";
    document.getElementById('createTaskForm').reset();
    
    const eventField = document.getElementById('task-event');
    if (eventField) eventField.closest('.form-group').style.display = 'block';
    const hoursField = document.getElementById('task-est-hours');
    if (hoursField) hoursField.closest('.form-group').style.display = 'block';

    const btn = document.getElementById('submit-task-btn');
    if (btn) btn.innerText = "Assign Task";

    document.getElementById('createTaskModal').classList.add('active'); 
}

function closeCreateTaskModal() { 
    document.getElementById('createTaskModal').classList.remove('active');
    document.getElementById('createTaskForm').reset();
    const editIdEl = document.getElementById('task-editing-id');
    if (editIdEl) editIdEl.value = "";
}

function closeTaskDetailsModal() { 
    document.getElementById('taskDetailsModal').classList.remove('active'); 
    currentActiveTaskId = null;
}

// Open Edit Task Modal (PUT /api/admin/tasks/{id})
window.openEditTaskModal = async function(taskId) {
    try {
        const res = await ApiClient.request(`/admin/tasks/${taskId}`, 'GET');
        const task = res.data;
        if (!task) return alert("Task not found.");

        const titleEl = document.getElementById('taskModalTitle');
        if (titleEl) titleEl.innerText = "Edit Task Details";
        
        const editIdEl = document.getElementById('task-editing-id');
        if (editIdEl) editIdEl.value = taskId;

        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-desc').value = task.description || '';
        document.getElementById('task-assignee').value = task.assigned_to || '';
        
        if (task.deadline) {
            const dl = new Date(task.deadline);
            dl.setMinutes(dl.getMinutes() - dl.getTimezoneOffset());
            document.getElementById('task-deadline').value = dl.toISOString().slice(0, 16);
        } else {
            document.getElementById('task-deadline').value = '';
        }

        document.getElementById('task-public-toggle').checked = task.is_public !== false;

        // Hide non-editable fields during detail edit
        const eventField = document.getElementById('task-event');
        if (eventField) eventField.closest('.form-group').style.display = 'none';
        const hoursField = document.getElementById('task-est-hours');
        if (hoursField) hoursField.closest('.form-group').style.display = 'none';

        const btn = document.getElementById('submit-task-btn');
        if (btn) btn.innerText = "Save Task Changes";

        document.getElementById('createTaskModal').classList.add('active');
    } catch (err) {
        alert("Failed to load task for editing: " + err.message);
    }
};

window.openEditTaskFromModal = function() {
    if (!currentActiveTaskId) return;
    const tId = currentActiveTaskId;
    closeTaskDetailsModal();
    openEditTaskModal(tId);
};

window.confirmDeleteTaskFromModal = async function() {
    if (!currentActiveTaskId) return;
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
    try {
        await ApiClient.request(`/admin/tasks/${currentActiveTaskId}`, 'DELETE');
        alert("Task deleted successfully.");
        closeTaskDetailsModal();
        await fetchTasks();
    } catch (err) {
        alert("Failed to delete task: " + err.message);
    }
};

function renderTaskDetailData(task) {
    // Base Info
    const colDef = COLUMNS.find(c => c.id === task.status) || { title: (task.status || 'Active').toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
    const statusEl = document.getElementById('detail-task-status');
    if (statusEl) statusEl.innerHTML = `<span class="status-badge" style="background: ${colDef.bg}; color: ${colDef.color};">${colDef.title}</span>`;
    
    const titleEl = document.getElementById('detail-task-title');
    if (titleEl) titleEl.innerText = task.title || 'Untitled Task';
    
    const eventEl = document.getElementById('detail-task-event');
    if (eventEl) eventEl.innerText = task.event_title ? `Linked to: ${task.event_title}` : '';
    
    const assigneeEl = document.getElementById('detail-task-assignee');
    const aName = `${task.assignee_first || ''} ${task.assignee_last || ''}`.trim() || task.assignee_name || 'Unassigned';
    if (assigneeEl) assigneeEl.innerText = aName;
    
    const deadlineEl = document.getElementById('detail-task-deadline');
    if (deadlineEl) deadlineEl.innerHTML = formatDeadline(task.deadline, task.status);
    
    const descEl = document.getElementById('detail-task-desc');
    if (descEl) descEl.innerHTML = linkify(escapeHTML(task.description));

    // Map the reward hours to the 3rd column if it exists in HTML
    const rewardEl = document.getElementById('modal-task-reward');
    if (rewardEl) rewardEl.innerText = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;

    // Remarks display
    let remarksHtml = '';
    if (task.volunteer_remarks) remarksHtml += `<div style="background:var(--bg-color); padding:12px; border-radius:8px; margin-bottom:8px; border-left: 3px solid #3B82F6;"><span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Assignee Notes:</span><p style="font-size:13px; margin-top:4px;">${escapeHTML(task.volunteer_remarks)}</p></div>`;
    if (task.admin_remarks) remarksHtml += `<div style="background:rgba(245,158,11,0.05); padding:12px; border-radius:8px; border-left: 3px solid #F59E0B;"><span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Admin Review Remarks:</span><p style="font-size:13px; margin-top:4px;">${escapeHTML(task.admin_remarks)}</p></div>`;
    const remEl = document.getElementById('remarks-container');
    if (remEl) remEl.innerHTML = remarksHtml;

    // Dynamic Role-Based UI Generation
    const actionArea = document.getElementById('task-action-area');
    const currentUserId = String(currentUser.user_id || currentUser.userId || currentUser.id || 'anonymous');
    const isCreator = String(task.created_by) === currentUserId;
    const isAssignee = String(task.assigned_to) === currentUserId;
    const isFrozen = ['completed', 'cancelled'].includes(task.status);
    
    const editBtn = document.getElementById('btn-edit-task');
    const deleteBtn = document.getElementById('btn-delete-task');
    if (editBtn) editBtn.style.display = (isCreator && !isFrozen) ? 'inline-flex' : 'none';
    if (deleteBtn) deleteBtn.style.display = isCreator ? 'inline-flex' : 'none';

    let actionHtml = '';

    if (!isFrozen) {
        if (isAssignee) {
            actionHtml += `
                <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">My Progress</h3>
                <textarea id="my-volunteer-remarks" class="form-input" rows="2" placeholder="Add notes about your progress (Optional)..." style="width: 100%;"></textarea>
                <div class="action-row">
                    ${task.status === 'assigned' ? `<button class="btn-warning" onclick="handleTaskAction('${task.task_id}', 'progress', 'in_progress')">Start Work</button>` : ''}
                    ${task.status === 'in_progress' ? `<button class="btn-success" onclick="handleTaskAction('${task.task_id}', 'progress', 'pending_verification')">Submit for Review</button>` : ''}
                </div>
            `;
        }

        if (isCreator) {
            if (isAssignee) actionHtml += `<hr style="margin: 20px 0; border: none; border-top: 1px dashed rgba(59,130,246,0.3);">`;
            
            actionHtml += `
                <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #F59E0B;">Admin Controls (Creator)</h3>
                <textarea id="my-admin-remarks" class="form-input" rows="2" placeholder="Add official review remarks..." style="width: 100%;"></textarea>
            `;

            if (task.status !== 'completed' && task.status !== 'cancelled') {
                actionHtml += `
                    <div style="margin-top: 12px; margin-bottom: 12px;">
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 4px;">Hours to Award (Confirm)</label>
                        <input type="number" id="task-award-hours" class="form-input" value="${parseFloat(task.hours_awarded || 0)}" step="0.5" min="0" style="width: 100%;">
                    </div>
                `;
            }

            actionHtml += `
                <div class="action-row">
                    ${task.status === 'pending_verification' ? `<button class="btn-success" onclick="handleTaskAction('${task.task_id}', 'status', 'completed')"><i data-lucide="check-circle" style="width:14px; height:14px; display:inline; margin-bottom:-2px;"></i> Approve & Complete</button>` : ''}
                    ${task.status !== 'pending_verification' ? `<button class="primary-btn" onclick="handleTaskAction('${task.task_id}', 'status', 'completed')">Force Complete</button>` : ''}
                    <button class="btn-danger-outline" onclick="handleTaskAction('${task.task_id}', 'status', 'cancelled')">Cancel Task</button>
                </div>
            `;
        }

        if (actionArea) {
            actionArea.innerHTML = actionHtml;
            actionArea.style.display = actionHtml !== '' ? 'block' : 'none';
        }
    } else {
        if (actionArea) {
            actionArea.innerHTML = `<div class="interaction-box" style="text-align:center; padding:16px; background:var(--bg-color); border-radius:8px;"><p style="font-size:13px; color:var(--text-muted);">This task has concluded and is closed to modifications.</p></div>`;
            actionArea.style.display = 'block';
        }
    }

    if (window.lucide) lucide.createIcons();
}

async function openTaskDetailsModal(taskId) {
    currentActiveTaskId = taskId;
    const modal = document.getElementById('taskDetailsModal');
    if (modal) modal.classList.add('active');
    
    // 1. Instantly populate from local cache if available (zero lag)
    const cachedTask = allTasks.find(t => String(t.task_id || t.id) === String(taskId));
    if (cachedTask) {
        renderTaskDetailData(cachedTask);
    } else {
        const titleEl = document.getElementById('detail-task-title');
        if (titleEl) titleEl.innerText = "Loading...";
        const actionArea = document.getElementById('task-action-area');
        if (actionArea) actionArea.style.display = 'none';
    }

    // 2. Fetch fresh details from server in background
    try {
        const res = await ApiClient.request(`/admin/tasks/${taskId}`, 'GET');
        const freshTask = res.data || res.task || res;
        if (freshTask && (freshTask.task_id || freshTask.id)) {
            const idx = allTasks.findIndex(t => String(t.task_id || t.id) === String(taskId));
            if (idx !== -1) allTasks[idx] = freshTask;
            renderTaskDetailData(freshTask);
        }
    } catch (e) {
        if (!cachedTask) {
            const titleEl = document.getElementById('detail-task-title');
            if (titleEl) titleEl.innerText = "Error loading task";
            console.error(e);
        }
    }
}

// ==========================================
// API MUTATIONS
// ==========================================

// Create & Edit Task Submit
document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-task-btn');
    const editingId = document.getElementById('task-editing-id').value;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        if (editingId) {
            // PUT /api/admin/tasks/{id}
            const updatePayload = {
                title: document.getElementById('task-title').value.trim(),
                description: document.getElementById('task-desc').value.trim() || null,
                deadline: document.getElementById('task-deadline').value || null,
                assigned_to: document.getElementById('task-assignee').value,
                is_public: document.getElementById('task-public-toggle').checked
            };
            await ApiClient.request(`/admin/tasks/${editingId}`, 'PUT', updatePayload);
            alert("Task updated successfully!");
            closeCreateTaskModal();
            await fetchTasks();
        } else {
            // POST /api/admin/tasks
            const payload = {
                title: document.getElementById('task-title').value,
                assigned_to: document.getElementById('task-assignee').value,
                event_id: document.getElementById('task-event').value || null,
                deadline: document.getElementById('task-deadline').value || null,
                description: document.getElementById('task-desc').value,
                is_public: document.getElementById('task-public-toggle').checked,
                hours_awarded: parseFloat(document.getElementById('task-est-hours').value) || 0
            };

            await ApiClient.request('/admin/tasks', 'POST', payload);
            closeCreateTaskModal();
            await fetchTasks();
        }
    } catch (err) {
        alert("Operation failed: " + err.message);
    } finally {
        if (document.getElementById('task-editing-id').value) {
            btn.innerText = "Save Task Changes";
        } else {
            btn.innerText = "Assign Task";
        }
        btn.disabled = false;
    }
});

// Handle Dynamic Actions (Progress or Status)
window.handleTaskAction = async function(taskId, actionType, newStatus) {
    if (!confirm(`Are you sure you want to mark this task as: ${newStatus.replace('_', ' ').toUpperCase()}?`)) return;

    try {
        if (actionType === 'progress') {
            const remarks = document.getElementById('my-volunteer-remarks')?.value;
            await ApiClient.request(`/admin/tasks/${taskId}/progress`, 'PATCH', { status: newStatus, volunteer_remarks: remarks });
        } 
        else if (actionType === 'status') {
            const payload = { 
                status: newStatus,
                admin_remarks: document.getElementById('my-admin-remarks')?.value || null
            };

            // FIX 3: Parse and enforce the hours input if completing
            if (newStatus === 'completed') {
                const hoursInput = document.getElementById('task-award-hours')?.value;
                if (!hoursInput || isNaN(parseFloat(hoursInput)) || parseFloat(hoursInput) < 0) {
                    alert("Validation Error: Please enter a valid number of hours to award before completing this task.");
                    return; // Stop execution
                }
                payload.hours_awarded = parseFloat(hoursInput);
            }

            await ApiClient.request(`/admin/tasks/${taskId}/status`, 'PATCH', payload);
        }
        
        // Refresh UI smoothly
        await openTaskDetailsModal(taskId); 
        fetchTasks(); 
    } catch (e) {
        alert("Action failed: " + e.message);
    }
}