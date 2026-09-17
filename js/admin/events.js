// ==========================================
// ADMIN EVENTS.JS (Master Controller)
// ==========================================

let searchTimeout = null;
let currentActiveEventId = null;
let currentActiveRoster = [];

// ==========================================
// ZONE 1: FORMATTERS & LOOKUPS
// ==========================================
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (timeString) => {
    if (!timeString) return '--';
    const [hours, minutes] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const STATUS_UI_MAP = {
    'draft': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748B', label: 'DRAFT' },
    'upcoming': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', label: 'UPCOMING' },
    'ongoing': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: 'ONGOING' },
    'completed': { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280', label: 'COMPLETED' },
    'cancelled': { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: 'CANCELLED' },
    'archived': { bg: 'rgba(71, 85, 105, 0.1)', text: '#475569', label: 'ARCHIVED' }
};

function getEventBadges(event) {
    let badgesHTML = '';
    const primaryStatus = (event.dynamic_status || event.status || '').toLowerCase();
    
    // Time Boundary Math
    const safeStartTime = event.start_time || '00:00:00';
    const evDateStr = event.event_date ? event.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
    const startDateTime = new Date(`${evDateStr}T${safeStartTime}`);
    const minsToStart = (startDateTime - new Date()) / 60000;
    
    const isWithin30Mins = (minsToStart <= 30 && minsToStart > 0);
    const isStarted = minsToStart <= 0;
    const isOngoing = primaryStatus === 'ongoing';

    // Primary Status Badge
    let ui = STATUS_UI_MAP[primaryStatus] || STATUS_UI_MAP['draft'];
    if (isWithin30Mins && primaryStatus === 'upcoming') {
        ui = { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', label: 'STARTING SOON' };
    }
    badgesHTML += `<span class="status-badge" style="background: ${ui.bg}; color: ${ui.text}; margin-right: 6px;">${ui.label}</span>`;
    
    // Registration Badge
    const hideRegBadge = isWithin30Mins || isStarted || isOngoing || ['completed', 'cancelled', 'archived', 'draft'].includes(primaryStatus);
    if (!hideRegBadge) {
        const isRegOpen = event.registration_open === true;
        const regUi = isRegOpen 
            ? { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: 'REG OPEN' }
            : { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: 'REG CLOSED' };
        badgesHTML += `<span class="status-badge" style="background: ${regUi.bg}; color: ${regUi.text};">${regUi.label}</span>`;
    }
    return badgesHTML;
}

// ==========================================
// ZONE 2: MAIN TABLE RENDERING
// ==========================================
function debounceLoadEvents() {
    const searchVal = document.getElementById('filter-search')?.value.trim();
    const clearBtn = document.getElementById('filter-search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchVal ? 'flex' : 'none';
    }
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEvents, 350); 
}

function clearEventSearch() {
    const input = document.getElementById('filter-search');
    if (input) {
        input.value = '';
        const clearBtn = document.getElementById('filter-search-clear');
        if (clearBtn) clearBtn.style.display = 'none';
        loadEvents();
    }
}

function setStatusFilter(status, element) {
    const statusInput = document.getElementById('filter-status');
    if (statusInput) statusInput.value = status;

    const chips = document.querySelectorAll('.events-status-chips .status-chip');
    chips.forEach(chip => {
        const isSelected = (element ? chip === element : chip.getAttribute('data-status') === status);
        chip.classList.toggle('active', isSelected);
        chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    loadEvents();
}

window.debounceLoadEvents = debounceLoadEvents;
window.clearEventSearch = clearEventSearch;
window.setStatusFilter = setStatusFilter;

async function loadEvents() {
    const tbody = document.getElementById('events-table-body');
    const params = new URLSearchParams();
    
    const search = document.getElementById('filter-search')?.value.trim();
    const category = document.getElementById('filter-category')?.value;
    const status = document.getElementById('filter-status')?.value;
    const sortBy = document.getElementById('filter-sort')?.value;

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);

    try {
        const response = await ApiClient.request(`/admin/events?${params.toString()}`, 'GET');
        // FIX 1: Safely unpack the pagination wrapper
        const events = response.data.data || response.data || []; 

        if (events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px; color: var(--text-muted);">No events found matching your criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = events.map(ev => {
            const currentRegs = ev.volunteers_registered || 0; 
            const maxVols = ev.max_volunteers || ev.volunteers_needed || 0;
            const isFull = currentRegs >= maxVols;
            const badgeHtml = getEventBadges(ev);
            
            // Boundary math for Kiosk buttons
            const safeStartTime = ev.start_time || '00:00:00';
            const safeEndTime = ev.end_time || '23:59:59';
            const dateObj = new Date(ev.event_date);
            const evDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const eventStart = new Date(`${evDateStr}T${safeStartTime}`);
            const eventEnd = new Date(`${evDateStr}T${safeEndTime}`);
            const now = new Date();
            
            const checkinOpenTime = new Date(eventStart.getTime() - (30 * 60 * 1000));
            const checkoutCloseTime = new Date(eventEnd.getTime() + (2 * 60 * 60 * 1000));
            
            const canCheckIn = now >= checkinOpenTime && now <= eventEnd;
            const canCheckOut = now >= eventStart && now <= checkoutCloseTime;
            const primaryStatus = (ev.dynamic_status || ev.status || '').toLowerCase();

            let quickActions = '';
            if (['upcoming', 'ongoing', 'published'].includes(primaryStatus) && (canCheckIn || canCheckOut)) {
                quickActions += `
                    <button onclick="event.stopPropagation(); openQRModal('${ev.event_id}', '${ev.title.replace(/'/g, "\\'")}')" 
                            title="Launch Attendance Kiosk"
                            style="background: transparent; color: var(--primary, #3B82F6); border: 1px solid var(--primary, #3B82F6); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <i data-lucide="qr-code" style="width: 14px; height: 14px;"></i> Kiosk
                    </button>`;
            }

            return `
            <tr onclick="openDetailsModal('${ev.event_id}')" style="cursor: pointer;">
                <td style="font-weight: 600; min-width: 160px;">${ev.title}</td>
                <td class="col-datetime-cell">
                    <div class="event-datetime-box">
                        <div class="event-date-row">${dateFormatter.format(new Date(ev.event_date))}</div>
                        <div class="event-time-row">
                            <i data-lucide="clock" class="time-icon"></i> 
                            <span>${formatTime(ev.start_time)} – ${formatTime(ev.end_time)}</span>
                        </div>
                    </div>
                </td>
                <td style="white-space: nowrap;">${ev.location_name || '--'}</td>
                <td style="white-space: nowrap;">
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: ${isFull ? '#10B981' : 'var(--text-main)'};">
                        <i data-lucide="users" style="width: 16px; height: 16px;"></i>
                        ${currentRegs} / ${maxVols}
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <div>${badgeHtml}</div>
                        <div style="display: flex; gap: 6px;">${quickActions}</div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (window.lucide) lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: #EF4444; text-align: center;">Error loading matrix: ${error.message}</td></tr>`;
    }
}

// ==========================================
// ZONE 3: EVENT DETAILS MODAL
// ==========================================
async function openDetailsModal(eventId) {
    currentActiveEventId = eventId;
    const modal = document.getElementById('eventDetailsModal');
    
    // Set Loading States
    document.getElementById('detail-title').innerText = "Fetching Event Data...";
    document.getElementById('detail-volunteers-body').innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Fetching secure roster...</td></tr>`;
    const timelineContainer = document.getElementById('detail-timeline-container');
    if(timelineContainer) timelineContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted);">Fetching audit logs...</div>`;
    
    document.getElementById('btn-delete-event').style.display = 'none'; 
    modal.classList.add('active');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}`, 'GET');
        const evData = response.data || response; 
        const dynamicStatus = evData.dynamic_status || evData.status;

        // Render UI blocks
        renderCoreStats(evData);
        renderRoster(evData.roster || [], dynamicStatus, eventId);
        renderTimeline(evData.timeline || []);
        renderLifecycleButtons(eventId, evData, dynamicStatus);

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        document.getElementById('detail-title').innerText = "Network Error";
        document.getElementById('detail-volunteers-body').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #EF4444;">Failed to load secure context: ${error.message}</td></tr>`;
    }
}

function renderCoreStats(evData) {
    document.getElementById('detail-title').innerText = evData.title || 'Untitled Event';
    document.getElementById('detail-status-badge').innerHTML = getEventBadges(evData);
    
    const catEl = document.getElementById('detail-category');
    if (catEl) {
        catEl.innerText = evData.category ? `• ${evData.category}` : '';
        catEl.style.display = evData.category ? 'inline-block' : 'none';
    }

    // Date & Time formatting (compact)
    const evDate = new Date(evData.event_date);
    const dateFormatted = isNaN(evDate.getTime()) 
        ? (evData.event_date || '--') 
        : evDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const timeFormatted = `${formatTime(evData.start_time)} – ${formatTime(evData.end_time)}`;
    
    document.getElementById('detail-datetime').innerHTML = `
        <div class="detail-date-title">${dateFormatted}</div>
        <div class="detail-time-row">
            <i data-lucide="clock" class="detail-time-icon"></i> <span>${timeFormatted}</span>
        </div>
    `;
    const locEl = document.getElementById('detail-location');
    if (locEl) locEl.innerText = evData.location_name || 'No location set';
    document.getElementById('detail-desc').innerText = evData.description || 'No description provided.';

    // Capacity dynamically from the secure roster
    const roster = evData.roster || [];
    const registeredCount = roster.filter(v => ['registered', 'present'].includes(v.attendance_status || v.status)).length;
    const waitlistCount = roster.filter(v => (v.attendance_status || v.status) === 'waitlisted').length;
    
    const hasLimit = evData.max_volunteers && Number(evData.max_volunteers) > 0;
    const maxVolunteers = hasLimit ? evData.max_volunteers : '∞';
    
    document.getElementById('detail-capacity-text').innerText = `${registeredCount} / ${maxVolunteers} Reg.`;
    
    // Progress Bar Coloring
    const progressBar = document.getElementById('detail-capacity-bar');
    if (hasLimit && progressBar) {
        const pct = Math.min((registeredCount / Number(evData.max_volunteers)) * 100, 100);
        progressBar.style.width = `${pct}%`;
        if (pct >= 100) progressBar.style.backgroundColor = '#EF4444'; // Red
        else if (pct >= 80) progressBar.style.backgroundColor = '#F59E0B'; // Yellow
        else progressBar.style.backgroundColor = '#10B981'; // Green
    } else if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#3B82F6'; // Blue
    }

    // Contacts
    document.getElementById('detail-creator').innerHTML = `Created by: <span style="color: var(--text-main); font-weight: 500;">${evData.creator_first || 'System'} ${evData.creator_last || ''}</span>`;
    const pocDiv = document.getElementById('detail-poc');
    if (evData.contact_person_name && pocDiv) {
        pocDiv.innerHTML = `
            <div style="font-weight: 600; color: var(--text-main); font-size: 13.5px;">${evData.contact_person_name}</div>
            ${evData.contact_person_phone ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 4px;"><i data-lucide="phone" style="width: 12px; height: 12px;"></i> ${evData.contact_person_phone}</div>` : ''}
        `;
        pocDiv.style.display = 'block';
    } else if (pocDiv) pocDiv.style.display = 'none';

    // Registration Deadline - only show if the event is NOT completed, cancelled, or archived
    const deadlineDiv = document.getElementById('detail-deadline');
    const primaryStatus = (evData.dynamic_status || evData.status || '').toLowerCase();
    const isCompletedOrInactive = ['completed', 'cancelled', 'archived'].includes(primaryStatus);

    if (evData.registration_deadline && deadlineDiv && !isCompletedOrInactive) {
        const dObj = new Date(evData.registration_deadline);
        const formattedDeadline = !isNaN(dObj.getTime())
            ? dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : evData.registration_deadline;
        const isPastDeadline = !isNaN(dObj.getTime()) && dObj < new Date();
        const label = isPastDeadline ? 'Reg. closed on' : 'Reg. closes';
        deadlineDiv.innerHTML = `<i data-lucide="${isPastDeadline ? 'clock' : 'alert-circle'}" style="width: 12px; height: 12px;"></i> ${label} ${formattedDeadline}`;
        deadlineDiv.style.display = 'inline-flex';
    } else if (deadlineDiv) {
        deadlineDiv.style.display = 'none';
    }
}

function renderRoster(roster, dynamicStatus, eventId) {
    currentActiveRoster = roster || [];
    currentActiveEventId = eventId;

    const tbodyVols = document.getElementById('detail-volunteers-body');
    const theadVols = document.getElementById('detail-volunteers-head');
    if (!tbodyVols || !theadVols) return;
    
    // Separate distinct In and Out columns
    theadVols.innerHTML = `<tr>
        <th>Volunteer</th>
        <th style="white-space: nowrap;">In</th>
        <th style="white-space: nowrap;">Out</th>
        <th>Status</th>
        <th style="white-space: nowrap;">Hours</th>
        <th style="text-align: right; white-space: nowrap;">Action</th>
    </tr>`;

    if (roster.length === 0) {
        tbodyVols.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No volunteers registered yet.</td></tr>`;
        return;
    }

    tbodyVols.innerHTML = roster.map(vol => {
        const status = (vol.attendance_status || vol.status || 'UNKNOWN').toLowerCase();
        const color = status === 'withdrawn' ? '#EF4444' : (status === 'present' ? '#10B981' : (status === 'waitlisted' ? '#F59E0B' : 'var(--text-main)'));
        
        const inTime = vol.check_in_time 
            ? new Date(vol.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '--';
        const outTime = vol.check_out_time 
            ? new Date(vol.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '--';

        // Interactive Quick Status Override Dropdown
        const interactiveStatusHtml = `
            <select onchange="updateVolunteerStatus('${vol.user_id}', this.value, '${eventId}')" 
                    style="font-size: 12px; font-weight: 600; color: ${color}; padding: 4px; background: ${color}10; border: 1px solid ${color}40; border-radius: 4px; outline: none; cursor: pointer; width: 100%;">
                <option value="registered" ${status === 'registered' ? 'selected' : ''}>Registered</option>
                <option value="present" ${status === 'present' ? 'selected' : ''}>Present</option>
                <option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option>
                <option value="withdrawn" ${status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
                <option value="waitlisted" ${status === 'waitlisted' ? 'selected' : ''}>Waitlisted</option>
            </select>
        `;

        const hoursDisplay = `${parseFloat(vol.hours_logged || 0).toFixed(2)} hrs`;

        return `
        <tr>
            <td>
                <div class="roster-user">
                    <span style="font-weight: 600; color: var(--text-main); font-size: 13.5px;">${vol.first_name || ''} ${vol.last_name || ''}</span>
                </div>
            </td>
            <td style="white-space: nowrap; font-weight: 500; font-size: 13px; color: var(--text-main);">${inTime}</td>
            <td style="white-space: nowrap; font-weight: 500; font-size: 13px; color: var(--text-muted);">${outTime}</td>
            <td style="min-width: 110px;">${interactiveStatusHtml}</td>
            <td style="white-space: nowrap; font-size: 13px; font-weight: 500; color: var(--text-main);">${hoursDisplay}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px; cursor: pointer;" onclick="openEditAttendanceModal('${vol.user_id}', '${eventId}')" title="Edit status, check-in, and check-out">
                    <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Edit
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderTimeline(timeline) {
    const timelineContainer = document.getElementById('detail-timeline-container');
    if (!timelineContainer) return;
    
    if (timeline.length === 0) {
        timelineContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); margin-top: 10px;">No audit data found.</div>`;
    } else {
        timelineContainer.innerHTML = timeline.map(log => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <strong>${log.action}</strong>
                </div>
                <div class="timeline-meta">
                    ${new Date(log.timestamp).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} &bull; By: ${log.first_name ? `${log.first_name} ${log.last_name}` : 'System Auto'}
                </div>
            </div>
        `).join('');
    }
}

// ==========================================
// ZONE 4: LIFECYCLE CONTROLS (Publish/Complete/Cancel)
// ==========================================
function renderLifecycleButtons(eventId, evData, dynamicStatus) {
    const lifecycleContainer = document.getElementById('lifecycle-actions');
    const delBtn = document.getElementById('btn-delete-event');
    if (lifecycleContainer) lifecycleContainer.innerHTML = ''; 
    if (delBtn) delBtn.style.display = 'none';

    const safeTitle = evData.title.replace(/'/g, "\\'");
    
    // Boundary Math
    const safeStartTime = evData.start_time || '00:00:00';
    const safeEndTime = evData.end_time || '23:59:59';
    const dateObj = new Date(evData.event_date);
    const evDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    const eventStart = new Date(`${evDateStr}T${safeStartTime}`);
    const eventEnd = new Date(`${evDateStr}T${safeEndTime}`);
    const now = new Date();
    
    const checkinOpenTime = new Date(eventStart.getTime() - (30 * 60 * 1000));
    const isMoreThan30MinsAway = now < checkinOpenTime;

    // FIX 3: Route proper dedicated API paths based on status
    if (evData.status === 'draft') {
        lifecycleContainer.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-secondary" style="padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="openEditEventModal('${eventId}')">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                </button>
                <button class="primary-btn" onclick="fireLifecycleApi('${eventId}', 'publish', '${safeTitle}')">Publish Event</button>
            </div>
        `;
        if (delBtn) {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        }
    } else if (['upcoming', 'ongoing', 'published'].includes(dynamicStatus)) {
        let buttonsHTML = `<div style="display: flex; gap: 8px; align-items: center;">`;
        
        buttonsHTML += `
            <button type="button" class="btn-secondary" style="padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="openEditEventModal('${eventId}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
            </button>
        `;

        // Complete Event manually
        if (now >= eventEnd) {
            buttonsHTML += `<button class="primary-btn" style="background: #10B981; border:none;" onclick="fireLifecycleApi('${eventId}', 'complete', '${safeTitle}')">Mark Completed</button>`;
        }

        // Cancel
        if (isMoreThan30MinsAway) {
            buttonsHTML += `
                <button style="background: transparent; color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer;" 
                        onclick="confirmCancelEvent('${eventId}', '${safeTitle}')">
                    <i data-lucide="x-circle" style="width: 14px; height: 14px; display:inline;"></i> Cancel
                </button>
            `;
        }
        buttonsHTML += `</div>`;
        lifecycleContainer.innerHTML = buttonsHTML;
        
    } else if (dynamicStatus === 'completed' && evData.status !== 'archived') {
        lifecycleContainer.innerHTML = `
            <button class="btn-archive" 
                    style="background: transparent; color: var(--text-main); border: 1px solid var(--border); padding: 5px 12px; border-radius: 6px; font-weight: 500; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" 
                    onmouseover="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)';" 
                    onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';"
                    onclick="fireLifecycleApi('${eventId}', 'archive', '${safeTitle}')">
                <i data-lucide="archive" style="width: 14px; height: 14px;"></i> Archive
            </button>`;
    } else if (['cancelled', 'archived'].includes(dynamicStatus)) {
        if (delBtn) {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        }
    }
}

// FIX 3: Master Lifecycle API Caller
window.fireLifecycleApi = async function(eventId, action, currentTitle) {
    const actionText = action.toUpperCase();
    if (!confirm(`Are you sure you want to ${actionText} "${currentTitle}"?`)) return;

    try {
        await ApiClient.request(`/admin/events/${eventId}/${action}`, 'POST');
        openDetailsModal(eventId);
        loadEvents(); 
    } catch (error) {
        alert(`Failed to ${action}: ${error.message}`);
    }
}

// ==========================================
// ZONE 4B: ATTENDANCE MANAGEMENT (PUT /api/admin/events/{id}/attendance)
// ==========================================

function toLocalDatetimeString(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

window.openEditAttendanceModal = function(volunteerId, eventId) {
    const vol = (currentActiveRoster || []).find(v => (v.user_id === volunteerId || v.volunteer_id === volunteerId || v.id === volunteerId));
    if (!vol) {
        alert("Volunteer record not found in current roster.");
        return;
    }

    document.getElementById('att-volunteer-id').value = volunteerId;
    document.getElementById('att-event-id').value = eventId;

    const initials = ((vol.first_name?.[0] || '') + (vol.last_name?.[0] || '')).toUpperCase() || 'V';
    const avatarEl = document.getElementById('att-volunteer-avatar');
    if (avatarEl) avatarEl.innerText = initials;

    const nameEl = document.getElementById('att-volunteer-name');
    if (nameEl) nameEl.innerText = `${vol.first_name || ''} ${vol.last_name || ''}`.trim() || 'Volunteer';

    const emailEl = document.getElementById('att-volunteer-email');
    if (emailEl) emailEl.innerText = vol.email || vol.phone_number || 'Registered Volunteer';

    const statusEl = document.getElementById('att-status');
    if (statusEl) statusEl.value = (vol.attendance_status || vol.status || 'registered').toLowerCase();

    const inInput = document.getElementById('att-checkin-time');
    if (inInput) inInput.value = toLocalDatetimeString(vol.check_in_time);

    const outInput = document.getElementById('att-checkout-time');
    if (outInput) outInput.value = toLocalDatetimeString(vol.check_out_time);

    calculateAttendedHoursPreview();

    const modal = document.getElementById('editAttendanceModal');
    if (modal) modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.closeAttendanceModal = function() {
    const modal = document.getElementById('editAttendanceModal');
    if (modal) modal.classList.remove('active');
};

window.setAttendanceCheckInNow = function() {
    const inInput = document.getElementById('att-checkin-time');
    if (inInput) {
        inInput.value = toLocalDatetimeString(new Date().toISOString());
        calculateAttendedHoursPreview();
    }
};

window.clearAttendanceCheckIn = function() {
    const inInput = document.getElementById('att-checkin-time');
    if (inInput) {
        inInput.value = '';
        calculateAttendedHoursPreview();
    }
};

window.setAttendanceCheckOutNow = function() {
    const outInput = document.getElementById('att-checkout-time');
    if (outInput) {
        outInput.value = toLocalDatetimeString(new Date().toISOString());
        calculateAttendedHoursPreview();
    }
};

window.clearAttendanceCheckOut = function() {
    const outInput = document.getElementById('att-checkout-time');
    if (outInput) {
        outInput.value = '';
        calculateAttendedHoursPreview();
    }
};

window.calculateAttendedHoursPreview = function() {
    const inVal = document.getElementById('att-checkin-time')?.value;
    const outVal = document.getElementById('att-checkout-time')?.value;
    const previewVal = document.getElementById('att-hours-value');
    if (!previewVal) return;

    if (inVal && outVal) {
        const inDate = new Date(inVal);
        const outDate = new Date(outVal);
        const diffMs = outDate - inDate;
        if (diffMs > 0) {
            const hrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
            previewVal.innerText = `${hrs} hrs`;
            previewVal.style.color = '#10B981';
        } else {
            previewVal.innerText = 'Check-out must be after check-in';
            previewVal.style.color = '#EF4444';
        }
    } else if (inVal) {
        previewVal.innerText = 'In Progress (Checked-In)';
        previewVal.style.color = '#3B82F6';
    } else {
        previewVal.innerText = '0.00 hrs';
        previewVal.style.color = 'var(--text-muted)';
    }
};

window.saveVolunteerAttendance = async function(e) {
    if (e) e.preventDefault();
    const volunteerId = document.getElementById('att-volunteer-id')?.value;
    const eventId = document.getElementById('att-event-id')?.value;
    const status = document.getElementById('att-status')?.value;
    const inVal = document.getElementById('att-checkin-time')?.value;
    const outVal = document.getElementById('att-checkout-time')?.value;

    if (!volunteerId || !eventId) return;

    const submitBtn = document.getElementById('att-submit-btn');
    const origText = submitBtn ? submitBtn.innerText : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';
    }

    try {
        const payload = {
            volunteer_id: volunteerId,
            status: status,
            check_in_time: inVal ? new Date(inVal).toISOString() : null,
            check_out_time: outVal ? new Date(outVal).toISOString() : null
        };

        await ApiClient.request(`/admin/events/${eventId}/attendance`, 'PUT', payload);
        closeAttendanceModal();
        await openDetailsModal(eventId);
    } catch (err) {
        alert(`Failed to save attendance: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
        }
    }
};

// Quick 1-click status dropdown handler
window.updateVolunteerStatus = async function(volunteerId, newStatus, eventId) {
    try {
        const payload = { volunteer_id: volunteerId, status: newStatus };
        
        // Auto-inject check in time if manually marked present so math works
        if (newStatus === 'present') {
            payload.check_in_time = new Date().toISOString();
        } else if (newStatus === 'absent' || newStatus === 'withdrawn') {
            payload.check_in_time = null;
            payload.check_out_time = null;
        }

        await ApiClient.request(`/admin/events/${eventId}/attendance`, 'PUT', payload);
        openDetailsModal(eventId); 
    } catch (error) {
        alert(`Failed to update status: ${error.message}`);
        openDetailsModal(eventId);
    }
};

async function confirmCancelEvent(eventId, eventTitle) {
    if(!confirm(`WARNING: Are you sure you want to CANCEL "${eventTitle}"?\n\nThis will withdraw all registered volunteers and permanently mark the event as cancelled.`)) return;
    try {
        await ApiClient.request(`/admin/events/${eventId}/cancel`, 'POST');
        openDetailsModal(eventId);
        loadEvents(); 
    } catch (error) {
        alert(`Cancellation Failed: ${error.message}`);
    }
}

async function confirmDeleteEvent(eventId, eventTitle) {
    if(!confirm(`DANGER: Are you sure you want to soft-delete "${eventTitle}"?\n\nThis removes it from public views but retains audit history.`)) return;
    try {
        await ApiClient.request(`/admin/events/${eventId}`, 'DELETE');
        closeDetailsModal();
        loadEvents(); 
    } catch (error) {
        alert(`Deletion Failed: ${error.message}`);
    }
}

// ==========================================
// ZONE 5: CREATE & EDIT EVENT FORM
// ==========================================
function openModal() { 
    const titleEl = document.getElementById('eventModalTitle');
    if (titleEl) titleEl.innerText = "Create New Event";
    const editIdEl = document.getElementById('ev-editing-id');
    if (editIdEl) editIdEl.value = "";
    document.getElementById('createEventForm').reset();
    
    const toggleContainer = document.getElementById('ev-publish-toggle-container');
    if (toggleContainer) toggleContainer.style.display = 'flex';
    
    const submitBtn = document.getElementById('submit-event-btn');
    const isToggleChecked = document.getElementById('ev-publish-toggle').checked;
    submitBtn.innerText = isToggleChecked ? 'Create & Publish Event' : 'Save Event as Draft';
    if (isToggleChecked) submitBtn.classList.remove('btn-draft'); else submitBtn.classList.add('btn-draft');
    
    document.getElementById('eventModal').classList.add('active'); 
}

function closeModal() { 
    document.getElementById('eventModal').classList.remove('active'); 
    document.getElementById('createEventForm').reset(); 
    const editIdEl = document.getElementById('ev-editing-id');
    if (editIdEl) editIdEl.value = "";
}

function closeDetailsModal() { 
    document.getElementById('eventDetailsModal').classList.remove('active'); 
    currentActiveEventId = null; 
}

// Open Edit Event Modal (PUT /api/admin/events/{id})
window.openEditEventModal = async function(eventId) {
    try {
        const res = await ApiClient.request(`/admin/events/${eventId}`, 'GET');
        const ev = res.data || res;
        if (!ev) return alert("Could not load event data.");

        const titleEl = document.getElementById('eventModalTitle');
        if (titleEl) titleEl.innerText = "Edit Event Details";
        
        const editIdEl = document.getElementById('ev-editing-id');
        if (editIdEl) editIdEl.value = eventId;

        const form = document.getElementById('createEventForm');
        form.querySelector('#ev-title').value = ev.title || '';
        form.querySelector('#ev-category').value = ev.category || 'Food Drive';
        
        if (ev.event_date) {
            const dateObj = new Date(ev.event_date);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            form.querySelector('#ev-date').value = `${yyyy}-${mm}-${dd}`;
        }
        
        form.querySelector('#ev-start').value = ev.start_time ? ev.start_time.substring(0, 5) : '';
        form.querySelector('#ev-end').value = ev.end_time ? ev.end_time.substring(0, 5) : '';
        form.querySelector('#ev-location-name').value = ev.location_name || '';
        form.querySelector('#ev-location-address').value = ev.location_address || '';
        form.querySelector('#ev-maps-link').value = ev.google_maps_link || '';
        form.querySelector('#ev-vol-needed').value = ev.volunteers_needed || 10;
        form.querySelector('#ev-min-vol').value = ev.min_volunteers || 1;
        form.querySelector('#ev-max-volunteers').value = ev.max_volunteers || '';
        
        if (ev.registration_deadline) {
            const dlObj = new Date(ev.registration_deadline);
            dlObj.setMinutes(dlObj.getMinutes() - dlObj.getTimezoneOffset());
            form.querySelector('#ev-deadline').value = dlObj.toISOString().slice(0, 16);
        } else {
            form.querySelector('#ev-deadline').value = '';
        }

        form.querySelector('#ev-contact-name').value = ev.contact_person_name || '';
        form.querySelector('#ev-contact-phone').value = ev.contact_person_phone || '';
        form.querySelector('#ev-desc').value = ev.description || '';

        // Hide publish toggle in edit mode
        const toggleContainer = document.getElementById('ev-publish-toggle-container');
        if (toggleContainer) toggleContainer.style.display = 'none';

        const submitBtn = document.getElementById('submit-event-btn');
        submitBtn.innerText = "Save Changes";
        submitBtn.classList.remove('btn-draft');

        document.getElementById('eventModal').classList.add('active');
    } catch (err) {
        alert("Failed to load event for editing: " + err.message);
    }
};

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const isPublishing = document.getElementById('ev-publish-toggle').checked;
    const editingId = document.getElementById('ev-editing-id').value;
    
    const eventDate = form.querySelector('#ev-date').value;
    const startTime = form.querySelector('#ev-start').value;
    const endTime = form.querySelector('#ev-end').value;
    const deadline = form.querySelector('#ev-deadline').value;
    
    if (startTime >= endTime) return alert("Error: End time must be after the start time.");
    if (deadline && new Date(deadline) >= new Date(`${eventDate}T${startTime}`)) {
        return alert("Error: Registration deadline must be before the event starts.");
    }

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    
    const payload = {
        title: form.querySelector('#ev-title').value.trim(),
        category: form.querySelector('#ev-category').value, 
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        location_name: form.querySelector('#ev-location-name').value.trim(),
        location_address: form.querySelector('#ev-location-address').value.trim(),
        google_maps_link: form.querySelector('#ev-maps-link').value.trim() || null,
        volunteers_needed: parseInt(form.querySelector('#ev-vol-needed').value, 10),
        min_volunteers: parseInt(form.querySelector('#ev-min-vol').value, 10) || 1,
        max_volunteers: form.querySelector('#ev-max-volunteers').value ? parseInt(form.querySelector('#ev-max-volunteers').value, 10) : null,
        registration_deadline: deadline || null,
        contact_person_name: form.querySelector('#ev-contact-name').value.trim() || null,
        contact_person_phone: form.querySelector('#ev-contact-phone').value.trim() || null,
        description: form.querySelector('#ev-desc').value.trim() || null
    };

    try {
        if (editingId) {
            // PUT /api/admin/events/{id}
            await ApiClient.request(`/admin/events/${editingId}`, 'PUT', payload);
            alert("Event details updated successfully!");
            closeModal();
            loadEvents();
            if (currentActiveEventId === editingId) {
                openEventDetails(editingId);
            }
        } else {
            // POST /api/admin/events
            const createResponse = await ApiClient.request('/admin/events', 'POST', payload);
            if (isPublishing) await ApiClient.request(`/admin/events/${createResponse.data.event_id}/publish`, 'POST');
            form.reset();
            closeModal();
            loadEvents(); 
        }
    } catch (error) {
        alert(`Action Failed: ${error.message}`);
    } finally {
        const isToggleChecked = document.getElementById('ev-publish-toggle').checked;
        if (document.getElementById('ev-editing-id').value) {
            submitBtn.innerText = 'Save Changes';
            submitBtn.classList.remove('btn-draft');
        } else {
            submitBtn.innerText = isToggleChecked ? 'Create & Publish Event' : 'Save Event as Draft';
            if(isToggleChecked) submitBtn.classList.remove('btn-draft'); else submitBtn.classList.add('btn-draft');
        }
        submitBtn.disabled = false;
    }
});

document.getElementById('ev-publish-toggle').addEventListener('change', function() {
    const submitBtn = document.getElementById('submit-event-btn');
    if (this.checked) {
        submitBtn.innerText = 'Create & Publish Event';
        submitBtn.classList.remove('btn-draft'); 
    } else {
        submitBtn.innerText = 'Save Event as Draft';
        submitBtn.classList.add('btn-draft');    
    }
});

// ==========================================
// ZONE 6: DYNAMIC QR CHECK-IN KIOSK
// ==========================================
let qrRefreshTimeout = null;
let qrCountdownInterval = null;
let currentKioskType = 'checkin'; 
let currentKioskEventId = null; 

window.openQRModal = async function(eventId, eventTitle) {
    currentKioskEventId = eventId;
    document.getElementById('qr-event-title').innerText = eventTitle;
    document.getElementById('qrCheckInModal').classList.add('active');
    
    document.getElementById('qr-code-wrapper').style.display = 'none';
    document.getElementById('qr-status-message').style.display = 'none';
    
    // FIX BUG 7 & 12: Safely parse date & smartly default the tab
    try {
        const response = await ApiClient.request(`/admin/events/${eventId}`, 'GET');
        const ev = response.data;
        
        const safeStartTime = ev.start_time || '00:00:00';
        const dateObj = new Date(ev.event_date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        
        // Construct standard ISO string assuming local time
        const eventEnd = new Date(`${yyyy}-${mm}-${dd}T${ev.end_time}`);
        const now = new Date();
        
        // If the event has already started, default to Check-out tab
        if (now >= eventEnd) {
            await switchKioskTab('checkout');
        } else {
            await switchKioskTab('checkin');
        }
    } catch (error) {
        console.error("Failed to fetch event data for Kiosk:", error);
        await switchKioskTab('checkin'); // fallback
    }
}

window.switchKioskTab = async function(type) {
    currentKioskType = type;
    const btnIn = document.getElementById('kiosk-tab-checkin');
    const btnOut = document.getElementById('kiosk-tab-checkout');
    
    if (type === 'checkin') {
        btnIn.style.background = 'white'; btnIn.style.color = '#10B981'; btnIn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnOut.style.background = 'transparent'; btnOut.style.color = '#64748B'; btnOut.style.boxShadow = 'none';
    } else {
        btnOut.style.background = 'white'; btnOut.style.color = '#3B82F6'; btnOut.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnIn.style.background = 'transparent'; btnIn.style.color = '#64748B'; btnIn.style.boxShadow = 'none';
    }

    document.getElementById('qr-code-container').innerHTML = "";
    document.getElementById('qr-code-wrapper').style.display = 'none';
    document.getElementById('qr-status-message').style.display = 'none';
    
    await fetchAndRenderQR(currentKioskEventId);
}

async function fetchAndRenderQR(eventId) {
    clearQRTimers(); 
    const statusDiv = document.getElementById('qr-status-message');
    const qrWrapper = document.getElementById('qr-code-wrapper');
    const qrContainer = document.getElementById('qr-code-container');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}/qr-token?type=${currentKioskType}`, 'GET');
        
        statusDiv.style.display = 'none';
        qrWrapper.style.display = 'inline-block';
        qrContainer.innerHTML = "";
        
        qrWrapper.style.borderColor = currentKioskType === 'checkin' ? "#10B981" : "#3B82F6";
        const qrColor = currentKioskType === 'checkin' ? "#064E3B" : "#1E3A8A";

        new QRCode(qrContainer, {
            text: response.data.token,
            width: 256, height: 256,
            colorDark: qrColor, colorLight: "#F8FAFC", 
            correctLevel: QRCode.CorrectLevel.H
        });

        startQRTimers(eventId, response.data.refreshIntervalMs);

    } catch (error) {
        qrWrapper.style.display = 'none';
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.color = '#EF4444';
        statusDiv.innerText = error.message || `Failed to generate ${currentKioskType} token.`;
        document.getElementById('qr-timer-bar').style.width = '0%';
        document.getElementById('qr-timer-text').innerText = 'Kiosk inactive';
    }
}

function startQRTimers(eventId, refreshIntervalMs) {
    const timerBar = document.getElementById('qr-timer-bar');
    const timerText = document.getElementById('qr-timer-text');
    let secondsLeft = Math.floor(refreshIntervalMs / 1000);

    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    void timerBar.offsetWidth; 
    timerBar.style.transition = 'width 1s linear'; 

    qrCountdownInterval = setInterval(() => {
        secondsLeft--;
        timerBar.style.width = `${Math.max(0, (secondsLeft / (refreshIntervalMs / 1000)) * 100)}%`;
        timerText.innerText = `Code changing in ${secondsLeft}s...`;
        if (secondsLeft <= 0) clearInterval(qrCountdownInterval);
    }, 1000);

    qrRefreshTimeout = setTimeout(() => fetchAndRenderQR(eventId), refreshIntervalMs);
}

function clearQRTimers() {
    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    if (qrRefreshTimeout) clearTimeout(qrRefreshTimeout);
    qrCountdownInterval = null; qrRefreshTimeout = null;
}

window.closeQRModal = function() {
    document.getElementById('qrCheckInModal').classList.remove('active');
    clearQRTimers(); 
    document.getElementById('qr-code-container').innerHTML = "";
    document.getElementById('qr-status-message').style.display = 'none';
    currentKioskEventId = null;
}

// Initial Boot
document.addEventListener('DOMContentLoaded', loadEvents);