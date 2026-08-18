// ==========================================
// VOLUNTEER-TASKS.JS (Task Management API - FIXED)
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
    currentUser = JSON.parse(sessionData);

    // GLOBALLY define the ID safely to prevent scope shadowing bugs
    const currentUserId = String(currentUser.user_id || currentUser.userId || currentUser.id || 'anonymous');

    // Setup User UI
    document.getElementById('user-name-top').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('user-initial').innerText = currentUser.firstName.charAt(0).toUpperCase();

    // 2. Tab Navigation Logic
    document.getElementById('task-tabs').addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tabBtn.classList.add('active');
            document.getElementById(tabBtn.dataset.target).classList.add('active');
        }
    });

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
    function formatDeadline(dateString) {
        if (!dateString) return `<span class="deadline-text"><i data-lucide="clock" style="width:14px;"></i> No Deadline</span>`;
        const date = new Date(dateString);
        const now = new Date();
        const isPast = date < now;
        
        // Format: "Sep 17, 07:49 AM"
        const formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        if (isPast) {
            return `<span class="deadline-text deadline-danger"><i data-lucide="alert-circle" style="width:14px;"></i> Overdue: ${formatted}</span>`;
        }
        if ((date - now) < 86400000) {
            return `<span class="deadline-text deadline-warning"><i data-lucide="clock" style="width:14px;"></i> Due Soon: ${formatted}</span>`; 
        }
        return `<span class="deadline-text"><i data-lucide="calendar" style="width:14px;"></i> ${formatted}</span>`;
    }

    // 6. Fetch & Categorize Data
    async function loadTasks() {
        try {
            const response = await ApiClient.request('/volunteer/tasks', 'GET');
            globalTasks = response.data || [];

            const myActiveTasks = [];
            const myPastTasks = [];
            const publicTasks = [];

            globalTasks.forEach(task => {
                const isAssignedToMe = String(task.assigned_to) === currentUserId;
                const isPast = ['completed', 'cancelled'].includes(task.status);

                if (isAssignedToMe) {
                    if (isPast) {
                        myPastTasks.push(task);
                    } else {
                        myActiveTasks.push(task);
                    }
                } else if (task.is_public) {
                    publicTasks.push(task);
                }
            });

            renderTaskCards(myActiveTasks, 'my-active-grid', "You have no active tasks assigned to you.");
            renderTaskCards(myPastTasks, 'my-past-grid', "No completed or cancelled tasks yet.");
            renderTaskCards(publicTasks, 'public-tasks-grid', "There are no public tasks available right now.");

            if (window.lucide) lucide.createIcons();

        } catch (error) {
            console.error(error);
            document.getElementById('my-active-grid').innerHTML = `<p class="empty-msg" style="color:#EF4444;">Failed to load tasks.</p>`;
        }
    }

    // 7. Render using DocumentFragment
    function renderTaskCards(tasks, containerId, emptyMessage) {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; 

        if (tasks.length === 0) {
            container.innerHTML = `<p class="empty-msg">${emptyMessage}</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        tasks.forEach(task => {
            const style = STATUS_MAP[task.status] || { label: task.status, color: '#64748B', bg: '#F1F5F9' };
            const card = document.createElement('div');
            card.className = 'task-card';
            card.dataset.taskId = task.task_id;
            
            if (['completed', 'cancelled'].includes(task.status)) {
                card.style.opacity = '0.6';
            }

            const hours = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;
            const hoursHtml = hours > 0 
                ? `<span style="font-size: 12px; font-weight: 800; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 6px;"><i data-lucide="award" style="width:12px; display:inline; margin-right:2px;"></i>${hours} Hrs</span>` 
                : '';

            card.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                    <div class="card-title">${task.title}</div>
                    ${hoursHtml}
                </div>
                ${task.event_title ? `<div class="card-event"><i data-lucide="map-pin" style="width:12px;"></i> ${task.event_title}</div>` : ''}
                <div class="card-footer">
                    <span class="status-badge" style="background: ${style.bg}; color: ${style.color};">${style.label}</span>
                    ${formatDeadline(task.deadline)}
                </div>
            `;
            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    }

    // 8. Open Task Details Modal (FIXED ID MATCHING)
    document.querySelector('.tasks-container').addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        
        const clickedId = String(card.dataset.taskId);
        // FIX: Force both to String so "5" matches 5.
        const task = globalTasks.find(t => String(t.task_id) === clickedId);
        
        if (task) {
            openActionModal(task);
        }
    });

    function openActionModal(task) {
        const isAssignedToMe = String(task.assigned_to) === currentUserId;

        // Populate Header Data
        const style = STATUS_MAP[task.status] || { label: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
        document.getElementById('modal-task-status').innerHTML = `<span class="status-badge" style="background: ${style.bg}; color: ${style.color}; margin-bottom: 8px;">${style.label}</span>`;
        document.getElementById('modal-task-title').innerText = task.title;
        document.getElementById('modal-task-event').innerHTML = task.event_title ? `<i data-lucide="map-pin" style="width:14px;"></i> ${task.event_title}` : '';
        
        // Populate Body Data
        document.getElementById('modal-task-deadline').innerHTML = formatDeadline(task.deadline);
        
        // FIX: Display the actual volunteer name if public, otherwise fallback gracefully
        let assigneeText = '';
        if (isAssignedToMe) {
            assigneeText = 'You (Me)';
        } else if (task.assignee_first) {
            assigneeText = `${task.assignee_first} ${task.assignee_last || ''}`;
        } else {
            assigneeText = 'Community Member';
        }
        
        document.getElementById('modal-task-assignee').innerHTML = `<span style="color: ${isAssignedToMe ? 'var(--accent-primary)' : 'var(--text-main)'}">${assigneeText}</span>`;
        
        const rewardEl = document.getElementById('modal-task-reward');
        if (rewardEl) {
            rewardEl.innerText = task.hours_awarded ? parseFloat(task.hours_awarded) : 0;
        }
        
        document.getElementById('modal-task-desc').innerHTML = linkify(task.description);

        // Render Interactive Area
        const interactArea = document.getElementById('modal-interaction-area');
        interactArea.innerHTML = ''; 

        if (!isAssignedToMe) {
            // Read-Only Public View
            interactArea.innerHTML = `
                <div class="interaction-box" style="text-align: center;">
                    <i data-lucide="lock" style="color: var(--text-muted); margin-bottom: 8px;"></i>
                    <p style="font-size: 13px; color: var(--text-muted); font-weight: 500;">This is a community task assigned to another volunteer. You are viewing this for transparency.</p>
                </div>
            `;
        } else {
            // Interactive Assigned View
            if (task.status === 'assigned') {
                interactArea.innerHTML = `
                    <div class="interaction-box">
                        <h4 style="font-size: 14px; margin-bottom: 12px; font-weight: 700;">Action Required</h4>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">You have been assigned this task. Click below when you are ready to begin working on it.</p>
                        <button class="btn-start action-btn" data-action="in_progress" data-id="${task.task_id}">Start Task</button>
                    </div>
                `;
            } 
            else if (task.status === 'in_progress') {
                interactArea.innerHTML = `
                    <div class="interaction-box" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2);">
                        <h4 style="font-size: 14px; margin-bottom: 12px; font-weight: 700; color: #059669;">Submit Your Work</h4>
                        <textarea id="volunteer-remarks-input" class="form-input" rows="3" placeholder="Describe the work you completed, add links to documents, or leave notes for the admin..."></textarea>
                        <button class="btn-submit action-btn" data-action="pending_verification" data-id="${task.task_id}">Mark for Review</button>
                    </div>
                `;
            } 
            else if (['pending_verification', 'completed', 'cancelled'].includes(task.status)) {
                let remarksHtml = '';
                if (task.volunteer_remarks) {
                    remarksHtml += `
                        <div style="background: var(--bg-surface); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light); margin-bottom: 12px;">
                            <span style="font-size: 11px; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.05em;">Your Submitted Notes</span>
                            <p style="font-size: 14px; margin-top: 8px; color: var(--text-main);">${task.volunteer_remarks}</p>
                        </div>
                    `;
                }
                if (task.admin_remarks) {
                    remarksHtml += `
                        <div style="background: rgba(245, 158, 11, 0.05); padding: 16px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
                            <span style="font-size: 11px; font-weight: 800; color: #D97706; text-transform: uppercase; letter-spacing: 0.05em;">Admin Feedback</span>
                            <p style="font-size: 14px; margin-top: 8px; color: var(--text-main);">${task.admin_remarks}</p>
                        </div>
                    `;
                }
                if (remarksHtml === '') {
                    remarksHtml = `<div style="text-align: center; padding: 20px; background: var(--bg-surface); border-radius: 12px;"><span style="font-size: 13px; color: var(--text-muted); font-style: italic;">No remarks were left for this task.</span></div>`;
                }
                interactArea.innerHTML = remarksHtml;
            }
        }

        document.getElementById('taskActionModal').classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    window.closeTaskModal = function() {
        document.getElementById('taskActionModal').classList.remove('active');
    };

    // 9. Handle API Actions
    document.getElementById('modal-interaction-area').addEventListener('click', async (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const taskId = btn.dataset.id;
        const targetStatus = btn.dataset.action;
        
        let remarks = null;
        if (targetStatus === 'pending_verification') {
            remarks = document.getElementById('volunteer-remarks-input').value.trim();
        }

        btn.disabled = true;
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
            btn.innerText = "Try Again";
            showToast(error.message || "Failed to update task.", false);
        }
    });

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

        toast.innerHTML = `${iconSvg} <span style="font-weight: 600;">${message}</span>`;
        toast.classList.add('show');
        
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Boot Up
    loadTasks();
});