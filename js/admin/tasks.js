// ==========================================
// TASKS.JS (Admin Task Management & Role Logic)
// ==========================================

let allTasks = [];
let currentUser = null;

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
    currentUser = JSON.parse(userData);

    // Setup Top Header
    document.getElementById('top-user-name').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('top-user-initial').innerText = currentUser.firstName.charAt(0).toUpperCase();

    // 2. Initialize Data
    await loadDropdownData();
    await fetchTasks();

    // 3. Event Listeners
    document.getElementById('task-search-input').addEventListener('input', debounceRender);
    document.getElementById('filter-task-status').addEventListener('change', fetchTasks);
    
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
function formatDeadline(dateString) {
    if (!dateString) return 'No Deadline';
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;
    const isSoon = (date - now) < (24 * 60 * 60 * 1000) && !isPast; // within 24 hrs
    
    let formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (isPast) return `<span class="deadline-danger"><i data-lucide="alert-circle" style="width:12px; height:12px; display:inline;"></i> Overdue: ${formatted}</span>`;
    if (isSoon) return `<span class="deadline-warning"><i data-lucide="clock" style="width:12px; height:12px; display:inline;"></i> Due Soon: ${formatted}</span>`;
    return formatted;
}

// ==========================================
// DATA FETCHING & RENDERING
// ==========================================
async function loadDropdownData() {
    try {
        // Fetch users for assignee dropdown
        const volRes = await ApiClient.request('/admin/volunteers?limit=1000', 'GET');
        const assigneeSelect = document.getElementById('task-assignee');
        assigneeSelect.innerHTML = '<option value="">Select a user...</option>';
        volRes.data.forEach(user => {
            assigneeSelect.innerHTML += `<option value="${user.user_id}">${user.first_name} ${user.last_name} (${user.role})</option>`;
        });

        // Fetch events for linked event dropdown
        const evRes = await ApiClient.request('/admin/events?limit=100', 'GET');
        const eventSelect = document.getElementById('task-event');
        eventSelect.innerHTML = '<option value="">No Event Linked</option>';
        evRes.data.forEach(ev => {
            eventSelect.innerHTML += `<option value="${ev.event_id}">${ev.title} (${new Date(ev.event_date).toLocaleDateString()})</option>`;
        });
    } catch (e) {
        console.error("Failed to load dropdowns:", e);
    }
}

async function fetchTasks() {
    const statusFilter = document.getElementById('filter-task-status').value;
    let url = `/admin/tasks?limit=200`;
    if (statusFilter) url += `&status=${statusFilter}`;

    try {
        const response = await ApiClient.request(url, 'GET');
        allTasks = response.data;
        renderKanban();
    } catch (error) {
        document.getElementById('kanban-board').innerHTML = `<p style="color:red; padding: 20px;">Failed to load tasks: ${error.message}</p>`;
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
    
    // FIX 3: Get the current status filter
    const statusFilter = document.getElementById('filter-task-status').value;
    
    // Filter by search
    const filteredTasks = allTasks.filter(t => t.title.toLowerCase().includes(searchTerm) || (t.assignee_first && t.assignee_first.toLowerCase().includes(searchTerm)));

    // FIX 3: If a status is selected, only keep that specific column. Otherwise, show all.
    const visibleColumns = statusFilter 
        ? COLUMNS.filter(col => col.id === statusFilter)
        : COLUMNS;

    board.innerHTML = visibleColumns.map(col => {
        const colTasks = filteredTasks.filter(t => t.status === col.id);
        
        const tasksHtml = colTasks.map(task => {
            // Check if cancelled to apply visual styling
            const isCancelled = task.status === 'cancelled';
            const cardOpacity = isCancelled ? '0.6' : '1';
            const titleStyle = isCancelled ? 'text-decoration: line-through; color: var(--text-muted);' : '';

            return `
            <div class="task-card" data-id="${task.task_id}" style="opacity: ${cardOpacity};">
                <div class="task-card-title" style="${titleStyle}">${task.title}</div>
                ${task.event_title ? `<div style="font-size:11px; color:var(--primary); margin-bottom: 8px; font-weight:500;">📍 ${task.event_title}</div>` : ''}
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="task-avatar">${task.assignee_first ? task.assignee_first[0] : '?'}</div>
                        ${task.assignee_first} ${task.assignee_last || ''}
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 11px;">
                    ${formatDeadline(task.deadline)}
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
    document.getElementById('createTaskModal').classList.add('active'); 
}

function closeCreateTaskModal() { 
    document.getElementById('createTaskModal').classList.remove('active');
    document.getElementById('createTaskForm').reset();
}

function closeTaskDetailsModal() { 
    document.getElementById('taskDetailsModal').classList.remove('active'); 
}


async function openTaskDetailsModal(taskId) {
    const modal = document.getElementById('taskDetailsModal');
    modal.classList.add('active');
    
    // Loading State
    document.getElementById('detail-task-title').innerText = "Loading...";
    document.getElementById('task-action-area').style.display = 'none';

    try {
        const res = await ApiClient.request(`/admin/tasks/${taskId}`, 'GET');
        const task = res.data;

        // Base Info
        const colDef = COLUMNS.find(c => c.id === task.status) || { title: task.status.toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
        document.getElementById('detail-task-status').innerHTML = `<span class="status-badge" style="background: ${colDef.bg}; color: ${colDef.color};">${colDef.title}</span>`;
        document.getElementById('detail-task-title').innerText = task.title;
        document.getElementById('detail-task-event').innerText = task.event_title ? `Linked to: ${task.event_title}` : '';
        document.getElementById('detail-task-assignee').innerText = `${task.assignee_first} ${task.assignee_last}`;
        document.getElementById('detail-task-deadline').innerHTML = formatDeadline(task.deadline);
        document.getElementById('detail-task-desc').innerHTML = linkify(task.description);

        // Remarks display
        let remarksHtml = '';
        if (task.volunteer_remarks) remarksHtml += `<div style="background:var(--bg-color); padding:12px; border-radius:8px; margin-bottom:8px; border-left: 3px solid #3B82F6;"><span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Assignee Notes:</span><p style="font-size:13px; margin-top:4px;">${task.volunteer_remarks}</p></div>`;
        if (task.admin_remarks) remarksHtml += `<div style="background:rgba(245,158,11,0.05); padding:12px; border-radius:8px; border-left: 3px solid #F59E0B;"><span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Admin Review Remarks:</span><p style="font-size:13px; margin-top:4px;">${task.admin_remarks}</p></div>`;
        document.getElementById('remarks-container').innerHTML = remarksHtml;

        // FIX 2: Timeline JS generation removed entirely

        // ==========================================
        // DYNAMIC ROLE-BASED UI GENERATION
        // ==========================================
        const actionArea = document.getElementById('task-action-area');
        const isCreator = task.created_by === currentUser.userId;
        const isAssignee = task.assigned_to === currentUser.userId;
        const isFrozen = ['completed', 'cancelled'].includes(task.status);
        
        let actionHtml = '';

        if (!isFrozen) {
            // 1. ASSIGNEE VIEW
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

            // 2. CREATOR VIEW
            if (isCreator) {
                if (isAssignee) actionHtml += `<hr style="margin: 20px 0; border: none; border-top: 1px dashed rgba(59,130,246,0.3);">`;
                
                actionHtml += `
                    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #F59E0B;">Admin Controls (Creator)</h3>
                    <textarea id="my-admin-remarks" class="form-input" rows="2" placeholder="Add official review remarks..." style="width: 100%;"></textarea>
                    <div class="action-row">
                        ${task.status === 'pending_verification' ? `<button class="btn-success" onclick="handleTaskAction('${task.task_id}', 'status', 'completed')"><i data-lucide="check-circle" style="width:14px; height:14px; display:inline; margin-bottom:-2px;"></i> Approve & Complete</button>` : ''}
                        ${task.status !== 'pending_verification' ? `<button class="primary-btn" onclick="handleTaskAction('${task.task_id}', 'status', 'completed')">Force Complete</button>` : ''}
                        <button class="btn-danger-outline" onclick="handleTaskAction('${task.task_id}', 'status', 'cancelled')">Cancel Task</button>
                    </div>
                `;
            }

            if (actionHtml !== '') {
                actionArea.innerHTML = actionHtml;
                actionArea.style.display = 'block';
            }
        }

        if (window.lucide) lucide.createIcons();

    } catch (e) {
        document.getElementById('detail-task-title').innerText = "Error loading task";
        console.error(e);
    }
}

// ==========================================
// API MUTATIONS
// ==========================================

// Create Task Submit
document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-task-btn');
    btn.innerText = "Creating...";
    btn.disabled = true;

    const payload = {
        title: document.getElementById('task-title').value,
        assigned_to: document.getElementById('task-assignee').value,
        event_id: document.getElementById('task-event').value || null,
        deadline: document.getElementById('task-deadline').value || null,
        description: document.getElementById('task-desc').value,
        is_public: document.getElementById('task-public-toggle').checked
    };

    try {
        await ApiClient.request('/admin/tasks', 'POST', payload);
        closeCreateTaskModal();
        await fetchTasks();
    } catch (err) {
        alert("Failed to create task: " + err.message);
    } finally {
        btn.innerText = "Assign Task";
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
        } else if (actionType === 'status') {
            const remarks = document.getElementById('my-admin-remarks')?.value;
            await ApiClient.request(`/admin/tasks/${taskId}/status`, 'PATCH', { status: newStatus, admin_remarks: remarks });
        }
        
        // Refresh UI smoothly
        await openTaskDetailsModal(taskId); // Re-fetch current modal
        fetchTasks(); // Refresh board behind it
    } catch (e) {
        alert("Action failed: " + e.message);
    }
}