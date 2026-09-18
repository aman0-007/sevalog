// ==========================================
// VOLUNTEER-TASKS.JS (Optimized & Non-Blocking API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    let globalTasks = [];
    let currentUser = null;

    // 1. Initialize Auth Check
    const sessionData = localStorage.getItem('samithi_user');
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    
    if (!sessionData || !token) {
        window.location.href = '../login.html'; 
        return;
    }

    try {
        currentUser = JSON.parse(sessionData) || {};
    } catch (_) {
        currentUser = {};
    }

    // Safely extract user attributes
    const fName = currentUser.firstName || currentUser.first_name || 'Volunteer';
    const lName = currentUser.lastName || currentUser.last_name || '';
    const fullName = `${fName} ${lName}`.trim() || 'Volunteer';
    const initial = (fName.charAt(0) || 'V').toUpperCase();
    const currentUserId = String(currentUser.user_id || currentUser.userId || currentUser.id || currentUser.volunteer_id || '').trim();
    const currentUserEmail = (currentUser.email || '').toLowerCase().trim();

    // Setup User UI safely
    const topNameEl = document.getElementById('user-name-top');
    if (topNameEl) topNameEl.innerText = fullName;
    const initialEl = document.getElementById('user-initial');
    if (initialEl) initialEl.innerText = initial;

    // 2. Tab Navigation Logic
    const tabHeader = document.getElementById('task-tabs');
    if (tabHeader) {
        tabHeader.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn && tabBtn.dataset.target) {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tabBtn.classList.add('active');
                const targetContent = document.getElementById(tabBtn.dataset.target);
                if (targetContent) targetContent.classList.add('active');

                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // 3. Status UI Dictionary
    const STATUS_MAP = {
        'assigned': { label: 'Assigned', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
        'in_progress': { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
        'pending_verification': { label: 'Review Pending', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
        'completed': { label: 'Completed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
        'cancelled': { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' }
    };

    // 4. URL Linkifier
    function linkify(text) {
        if (!text) return 'No description provided.';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" class="auto-link" rel="noopener noreferrer">${url}</a>`);
    }

    // 5. Deadline Formatter
    function formatDeadline(dateString, status) {
        if (!dateString) return `<span class="deadline-text"><i data-lucide="clock" style="width:14px;"></i> No Deadline</span>`;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return escapeHTML(dateString);

        // Format: "Sep 17, 07:49 AM"
        const formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        // Completed, cancelled, and review-pending tasks must NOT be flagged as Overdue or Due Soon
        const isResolvedOrSubmitted = ['completed', 'cancelled', 'pending_verification'].includes(status);
        if (isResolvedOrSubmitted) {
            return `<span class="deadline-text"><i data-lucide="calendar" style="width:14px;"></i> ${formatted}</span>`;
        }

        const now = new Date();
        const isPast = date < now;
        
        if (isPast) {
            return `<span class="deadline-text deadline-danger"><i data-lucide="alert-circle" style="width:14px;"></i> Overdue: ${formatted}</span>`;
        }
        if ((date - now) < 86400000) {
            return `<span class="deadline-text deadline-warning"><i data-lucide="clock" style="width:14px;"></i> Due Soon: ${formatted}</span>`; 
        }
        return `<span class="deadline-text"><i data-lucide="calendar" style="width:14px;"></i> ${formatted}</span>`;
    }

    // --- HELPER: Escape HTML to prevent XSS ---
    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
            }[tag] || tag)
        );
    }

    // 6. Fetch & Categorize Data
    async function loadTasks() {
        const activeGrid = document.getElementById('my-active-grid');
        const pastGrid = document.getElementById('my-past-grid');
        const publicGrid = document.getElementById('public-tasks-grid');

        if (activeGrid) {
            activeGrid.innerHTML = '<div class="loading-state" style="padding: 30px; text-align: center;"><i data-lucide="loader-2" class="spin" style="width: 24px; height: 24px; color: var(--accent-primary);"></i> <span style="display:block; margin-top:8px; font-weight:600; color:var(--text-muted);">Fetching your active tasks...</span></div>';
            if (window.lucide) lucide.createIcons();
        }

        try {
            const response = await ApiClient.request('/volunteer/tasks', 'GET');
            
            // Normalize task data across multiple pagination and response shapes
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
            
            globalTasks = rawList;

            const myActiveTasks = [];
            const myPastTasks = [];
            const publicTasks = [];

            globalTasks.forEach(task => {
                const taskAssigneeId = String(task.assigned_to || task.assignee_id || task.volunteer_id || (task.assignee && (task.assignee.user_id || task.assignee.id)) || '').trim();
                const taskAssigneeEmail = String(task.assignee_email || (task.assignee && task.assignee.email) || '').toLowerCase().trim();

                const isAssignedToMe = Boolean(
                    (currentUserId && taskAssigneeId && taskAssigneeId === currentUserId) ||
                    (currentUserEmail && taskAssigneeEmail && taskAssigneeEmail === currentUserEmail)
                );

                const isPast = ['completed', 'cancelled'].includes(task.status);
                const isPublic = Boolean(task.is_public === true || task.is_public === 1 || task.is_public === 'true' || task.is_public === '1');

                if (isAssignedToMe) {
                    if (isPast) {
                        myPastTasks.push(task);
                    } else {
                        myActiveTasks.push(task);
                    }
                } else if (isPublic || !taskAssigneeId) {
                    publicTasks.push(task);
                }
            });

            renderTaskCards(myActiveTasks, 'my-active-grid', "You have no active tasks assigned to you.");
            renderTaskCards(myPastTasks, 'my-past-grid', "No completed or cancelled tasks yet.");
            renderTaskCards(publicTasks, 'public-tasks-grid', "There are no public tasks available right now.");

            if (window.lucide) lucide.createIcons();

        } catch (error) {
            console.error("Error loading volunteer tasks:", error);
            if (activeGrid) {
                activeGrid.innerHTML = `
                    <div class="empty-msg" style="color: #EF4444; text-align: center; padding: 32px 16px;">
                        <i data-lucide="alert-circle" style="width: 28px; height: 28px; margin: 0 auto 10px auto; display: block; color: #EF4444;"></i>
                        <p style="font-weight: 700; margin-bottom: 6px;">Unable to load tasks</p>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${escapeHTML(error.message || 'Connection error with the task server')}</p>
                        <button type="button" class="action-btn btn-start" id="retry-volunteer-tasks-btn" style="width: auto; padding: 8px 20px; font-size: 13px; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
                            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Retry
                        </button>
                    </div>
                `;
                document.getElementById('retry-volunteer-tasks-btn')?.addEventListener('click', () => {
                    loadTasks();
                });
            }
            if (pastGrid) pastGrid.innerHTML = '';
            if (publicGrid) publicGrid.innerHTML = '';
            if (window.lucide) lucide.createIcons();
        }
    }

    // 7. Render using DocumentFragment
    function renderTaskCards(tasks, containerId, emptyMessage) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ''; 

        if (tasks.length === 0) {
            container.innerHTML = `<p class="empty-msg">${emptyMessage}</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        tasks.forEach(task => {
            const taskId = task.task_id || task.id;
            const style = STATUS_MAP[task.status] || { label: task.status || 'Assigned', color: '#64748B', bg: '#F1F5F9' };
            const card = document.createElement('div');
            card.className = 'task-card';
            card.dataset.taskId = String(taskId);
            
            if (['completed', 'cancelled'].includes(task.status)) {
                card.style.opacity = '0.6';
            }

            const hours = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;
            const hoursHtml = hours > 0 
                ? `<span style="font-size: 12px; font-weight: 800; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 6px;"><i data-lucide="award" style="width:12px; display:inline; margin-right:2px;"></i>${hours} Hrs</span>` 
                : '';

            card.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div class="card-title">${escapeHTML(task.title || 'Untitled Task')}</div>
                    ${hoursHtml}
                </div>
                ${task.event_title ? `<div class="card-event"><i data-lucide="map-pin" style="width:12px;"></i> ${escapeHTML(task.event_title)}</div>` : ''}
                <div class="card-footer">
                    <span class="status-badge" style="background: ${style.bg}; color: ${style.color};">${style.label}</span>
                    ${formatDeadline(task.deadline, task.status)}
                </div>
            `;
            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    }

    // 8. Open Task Details Modal (Instant Responsive Opening + Background Refresh)
    const tasksContainer = document.querySelector('.tasks-container');
    if (tasksContainer) {
        tasksContainer.addEventListener('click', async (e) => {
            const card = e.target.closest('.task-card');
            if (!card) return;
            
            const clickedId = String(card.dataset.taskId);
            
            // 1. Instantly populate modal from local task data for zero lag
            const cachedTask = globalTasks.find(t => String(t.task_id || t.id) === clickedId);
            if (cachedTask) {
                openActionModal(cachedTask);
            }
            
            // 2. Fetch fresh details in background to sync latest remarks/status
            try {
                const response = await ApiClient.request(`/volunteer/tasks/${clickedId}`, 'GET');
                const freshTask = response.data || response.task || response;
                if (freshTask && (freshTask.task_id || freshTask.id)) {
                    const idx = globalTasks.findIndex(t => String(t.task_id || t.id) === clickedId);
                    if (idx !== -1) globalTasks[idx] = freshTask;
                    openActionModal(freshTask);
                }
            } catch (err) {
                if (!cachedTask) {
                    showToast("Failed to load task details: " + err.message, false);
                }
            }
        });
    }

    function openActionModal(task) {
        const taskAssigneeId = String(task.assigned_to || task.assignee_id || task.volunteer_id || (task.assignee && (task.assignee.user_id || task.assignee.id)) || '').trim();
        const taskAssigneeEmail = String(task.assignee_email || (task.assignee && task.assignee.email) || '').toLowerCase().trim();

        const isAssignedToMe = Boolean(
            (currentUserId && taskAssigneeId && taskAssigneeId === currentUserId) ||
            (currentUserEmail && taskAssigneeEmail && taskAssigneeEmail === currentUserEmail)
        );

        // Populate Header Data
        const style = STATUS_MAP[task.status] || { label: task.status || 'Active', color: '#64748B', bg: '#F1F5F9' };
        const modalStatus = document.getElementById('modal-task-status');
        if (modalStatus) modalStatus.innerHTML = `<span class="status-badge" style="background: ${style.bg}; color: ${style.color}; margin-bottom: 8px;">${style.label}</span>`;
        
        const modalTitle = document.getElementById('modal-task-title');
        if (modalTitle) modalTitle.innerText = task.title || 'Untitled Task';
        
        const modalEvent = document.getElementById('modal-task-event');
        if (modalEvent) modalEvent.innerHTML = task.event_title ? `<i data-lucide="map-pin" style="width:14px;"></i> ${escapeHTML(task.event_title)}` : '';
        
        // Populate Body Data
        const modalDeadline = document.getElementById('modal-task-deadline');
        if (modalDeadline) modalDeadline.innerHTML = formatDeadline(task.deadline, task.status);
        
        // Assignee Display
        let assigneeText = '';
        if (isAssignedToMe) {
            assigneeText = 'You (Me)';
        } else if (task.assignee_first) {
            assigneeText = `${task.assignee_first} ${task.assignee_last || ''}`.trim();
        } else if (task.assignee && (task.assignee.first_name || task.assignee.name)) {
            assigneeText = task.assignee.first_name || task.assignee.name;
        } else {
            assigneeText = 'Community Member';
        }
        
        const modalAssignee = document.getElementById('modal-task-assignee');
        if (modalAssignee) {
            modalAssignee.innerHTML = `<span style="color: ${isAssignedToMe ? 'var(--accent-primary)' : 'var(--text-main)'}">${escapeHTML(assigneeText)}</span>`;
        }
        
        const rewardEl = document.getElementById('modal-task-reward');
        if (rewardEl) {
            rewardEl.innerText = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;
        }
        
        const modalDesc = document.getElementById('modal-task-desc');
        if (modalDesc) modalDesc.innerHTML = linkify(escapeHTML(task.description));

        // Render Interactive Area
        const interactArea = document.getElementById('modal-interaction-area');
        if (interactArea) {
            interactArea.innerHTML = ''; 

            const currentTaskId = task.task_id || task.id;

            if (!isAssignedToMe) {
                // Read-Only Public View
                interactArea.innerHTML = `
                    <div class="interaction-box" style="text-align: center; padding: 20px; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border);">
                        <i data-lucide="lock" style="color: var(--text-muted); margin-bottom: 8px; width: 20px; height: 20px;"></i>
                        <p style="font-size: 13px; color: var(--text-muted); font-weight: 500;">This is a community task assigned to another volunteer. You are viewing this for transparency.</p>
                    </div>
                `;
            } else {
                // Interactive Assigned View
                if (task.status === 'assigned') {
                    interactArea.innerHTML = `
                        <div class="interaction-box" style="padding: 16px; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border);">
                            <h4 style="font-size: 14px; margin-bottom: 8px; font-weight: 700;">Action Required</h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">You have been assigned this task. Click below when you are ready to begin working on it.</p>
                            <button class="btn-start action-btn" data-action="in_progress" data-id="${currentTaskId}" style="width: 100%; padding: 10px; background: var(--accent-primary); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Start Task</button>
                        </div>
                    `;
                } 
                else if (task.status === 'in_progress') {
                    interactArea.innerHTML = `
                        <div class="interaction-box" style="padding: 16px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px;">
                            <h4 style="font-size: 14px; margin-bottom: 8px; font-weight: 700; color: #059669;">Submit Your Work</h4>
                            <textarea id="volunteer-remarks-input" class="form-input" rows="3" placeholder="Describe the work you completed, add links to documents, or leave notes for the admin..." style="width: 100%; box-sizing: border-box; margin-bottom: 12px; padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-family: inherit; font-size: 13px;"></textarea>
                            <button class="btn-submit action-btn" data-action="pending_verification" data-id="${currentTaskId}" style="width: 100%; padding: 10px; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Mark for Review</button>
                        </div>
                    `;
                } 
                else if (['pending_verification', 'completed', 'cancelled'].includes(task.status)) {
                    let remarksHtml = '';
                    if (task.volunteer_remarks) {
                        remarksHtml += `
                            <div style="background: var(--bg-surface); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light); margin-bottom: 12px;">
                                <span style="font-size: 11px; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.05em;">Your Submitted Notes</span>
                                <p style="font-size: 14px; margin-top: 8px; color: var(--text-main); line-height: 1.5;">${escapeHTML(task.volunteer_remarks)}</p>
                            </div>
                        `;
                    }
                    if (task.admin_remarks) {
                        remarksHtml += `
                            <div style="background: rgba(245, 158, 11, 0.05); padding: 16px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <span style="font-size: 11px; font-weight: 800; color: #D97706; text-transform: uppercase; letter-spacing: 0.05em;">Admin Feedback</span>
                                <p style="font-size: 14px; margin-top: 8px; color: var(--text-main); line-height: 1.5;">${escapeHTML(task.admin_remarks)}</p>
                            </div>
                        `;
                    }
                    if (remarksHtml === '') {
                        remarksHtml = `<div style="text-align: center; padding: 20px; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border);"><span style="font-size: 13px; color: var(--text-muted); font-style: italic;">No remarks were left for this task.</span></div>`;
                    }
                    interactArea.innerHTML = remarksHtml;
                }
            }
        }

        const modalEl = document.getElementById('taskActionModal');
        if (modalEl) modalEl.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    window.closeTaskModal = function() {
        const modalEl = document.getElementById('taskActionModal');
        if (modalEl) modalEl.classList.remove('active');
    };

    // 9. Handle API Actions inside Task Modal
    const interactArea = document.getElementById('modal-interaction-area');
    if (interactArea) {
        interactArea.addEventListener('click', async (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;

            const taskId = btn.dataset.id;
            const targetStatus = btn.dataset.action;
            
            let remarks = null;
            if (targetStatus === 'pending_verification') {
                const remarksInput = document.getElementById('volunteer-remarks-input');
                remarks = remarksInput ? remarksInput.value.trim() : '';
            }

            btn.disabled = true;
            const origHtml = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:16px;"></i> Processing...`;
            if (window.lucide) lucide.createIcons();

            try {
                await ApiClient.request(`/volunteer/tasks/${taskId}/progress`, 'PATCH', { 
                    status: targetStatus, 
                    volunteer_remarks: remarks 
                });
                
                showToast("Task updated successfully!", true);
                closeTaskModal();
                await loadTasks(); 
            } catch (error) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
                showToast(error.message || "Failed to update task.", false);
            }
        });
    }

    // 10. Toast Notification Helper
    function showToast(message, isSuccess) {
        let toast = document.querySelector('.notification-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'notification-toast';
            document.body.appendChild(toast);
        }
        
        const iconColor = isSuccess ? '#10B981' : '#EF4444';
        const iconSvg = isSuccess 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `${iconSvg} <span style="font-weight: 600;">${escapeHTML(message)}</span>`;
        toast.classList.add('show');
        
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
        }
    });

    // Boot Up: Fetch Tasks
    loadTasks();
});
