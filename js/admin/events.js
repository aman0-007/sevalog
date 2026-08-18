// ==========================================
// ADMIN EVENTS.JS (Master Controller)
// ==========================================

let searchTimeout = null;
let currentActiveEventId = null;

// ==========================================
// ZONE 1: FORMATTERS & LOOKUPS
// ==========================================
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatTime = (timeString) => {
    if (!timeString) return '--';
    const [hours, minutes] = timeString.split(':');
    const d = new Date();
    d.setHours(hours, minutes);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
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
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEvents, 350); 
}

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
                <td style="font-weight: 600;">${ev.title}</td>
                <td>
                    <div>${dateFormatter.format(new Date(ev.event_date))}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        <i data-lucide="clock" style="width: 12px; height: 12px; display: inline; margin-bottom: -2px;"></i> 
                        ${formatTime(ev.start_time)} - ${formatTime(ev.end_time)}
                    </div>
                </td>
                <td>${ev.location_name}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: ${isFull ? '#10B981' : 'var(--text-main)'};">
                        <i data-lucide="users" style="width: 16px; height: 16px;"></i>
                        ${currentRegs} / ${maxVols}
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
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
    document.getElementById('detail-volunteers-body').innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Fetching secure roster...</td></tr>`;
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
        document.getElementById('detail-volunteers-body').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #EF4444;">Failed to load secure context: ${error.message}</td></tr>`;
    }
}

function renderCoreStats(evData) {
    document.getElementById('detail-title').innerText = evData.title || 'Untitled Event';
    document.getElementById('detail-status-badge').innerHTML = getEventBadges(evData);
    document.getElementById('detail-datetime').innerText = `${dateFormatter.format(new Date(evData.event_date))} | ${formatTime(evData.start_time)} - ${formatTime(evData.end_time)}`;
    document.getElementById('detail-location').innerText = evData.location_name || 'No location set';
    document.getElementById('detail-desc').innerText = evData.description || 'No description provided.';

    // FIX 2: Calculate capacity dynamically from the secure roster
    const roster = evData.roster || [];
    const registeredCount = roster.filter(v => ['registered', 'present'].includes(v.attendance_status || v.status)).length;
    const waitlistCount = roster.filter(v => (v.attendance_status || v.status) === 'waitlisted').length;
    const maxVolunteers = evData.max_volunteers || 'No Limit';
    
    document.getElementById('detail-capacity-text').innerText = `${registeredCount} / ${maxVolunteers} Reg.`;
    
    // Progress Bar Coloring
    const progressBar = document.getElementById('detail-capacity-bar');
    if (evData.max_volunteers && progressBar) {
        const pct = Math.min((registeredCount / evData.max_volunteers) * 100, 100);
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
        pocDiv.innerHTML = `PoC: <span style="color: var(--text-main);">${evData.contact_person_name}</span> ${evData.contact_person_phone ? `<br/>📞 ${evData.contact_person_phone}` : ''}`;
        pocDiv.style.display = 'block';
    } else if (pocDiv) pocDiv.style.display = 'none';

    // Registration Deadline
    const deadlineDiv = document.getElementById('detail-deadline');
    if (evData.registration_deadline && deadlineDiv) {
        deadlineDiv.innerText = `Ends: ${new Date(evData.registration_deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
        deadlineDiv.style.display = 'block';
    } else if (deadlineDiv) {
        deadlineDiv.style.display = 'none';
    }
}

function renderRoster(roster, dynamicStatus, eventId) {
    const tbodyVols = document.getElementById('detail-volunteers-body');
    const theadVols = document.getElementById('detail-volunteers-head');
    if (!tbodyVols || !theadVols) return;
    
    const isPastOrOngoing = ['ongoing', 'completed', 'archived'].includes(dynamicStatus);
    
    // Table Headers
    if (isPastOrOngoing) {
        theadVols.innerHTML = `<tr><th>Volunteer</th><th>Check-In / Out</th><th>Status Override</th><th>Hours</th></tr>`;
    } else {
        theadVols.innerHTML = `<tr><th>Volunteer</th><th>Contact Info</th><th>Status Override</th><th>Hours</th></tr>`;
    }

    if (roster.length === 0) {
        tbodyVols.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteers registered yet.</td></tr>`;
        return;
    }

    tbodyVols.innerHTML = roster.map(vol => {
        const status = (vol.attendance_status || vol.status || 'UNKNOWN').toLowerCase();
        const color = status === 'withdrawn' ? '#EF4444' : (status === 'present' ? '#10B981' : (status === 'waitlisted' ? '#F59E0B' : 'var(--text-main)'));
        const initials = (vol.first_name?.[0] || '') + (vol.last_name?.[0] || '');
        
        let middleColumn = '';
        if (isPastOrOngoing) {
            const inTime = vol.check_in_time ? new Date(vol.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
            const outTime = vol.check_out_time ? new Date(vol.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
            middleColumn = `<div style="font-size: 13px;">In: <b>${inTime}</b></div><div style="font-size: 13px; color: var(--text-muted);">Out: <b>${outTime}</b></div>`;
        } else {
            middleColumn = `<div style="font-size: 13px;">${vol.email || '--'}</div><div style="font-size: 12px; color: var(--text-muted);">${vol.phone_number || '--'}</div>`;
        }

        // FIX 4: Interactive Admin Attendance Override Dropdown
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

        return `
        <tr>
            <td>
                <div class="roster-user">
                    <div class="avatar-sm">${initials.toUpperCase()}</div>
                    <span style="font-weight: 500;">${vol.first_name || ''} ${vol.last_name || ''}</span>
                </div>
            </td>
            <td>${middleColumn}</td>
            <td style="min-width: 120px;">${interactiveStatusHtml}</td>
            <td>${parseFloat(vol.hours_logged || 0).toFixed(2)} hrs</td>
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
        lifecycleContainer.innerHTML = `<button class="primary-btn" onclick="fireLifecycleApi('${eventId}', 'publish', '${safeTitle}')">Publish Event</button>`;
        if (delBtn) {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        }
    } else if (['upcoming', 'ongoing'].includes(dynamicStatus)) {
        let buttonsHTML = `<div style="display: flex; gap: 8px; align-items: center;">`;
        
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
            <button style="background: transparent; color: #475569; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer;" 
                    onclick="fireLifecycleApi('${eventId}', 'archive', '${safeTitle}')">
                <i data-lucide="archive" style="width: 14px; height: 14px; display:inline;"></i> Archive
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

// FIX 4: Dedicated Manual Attendance Override
window.updateVolunteerStatus = async function(volunteerId, newStatus, eventId) {
    try {
        const payload = { volunteer_id: volunteerId, status: newStatus };
        
        // Auto-inject check in time if manually marked present so math works
        if (newStatus === 'present') {
            payload.check_in_time = new Date().toISOString();
        }

        await ApiClient.request(`/admin/events/${eventId}/attendance`, 'PUT', payload);
        openDetailsModal(eventId); 
    } catch (error) {
        alert(`Failed to update status: ${error.message}`);
        openDetailsModal(eventId);
    }
}

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
// ZONE 5: CREATE EVENT FORM
// ==========================================
function openModal() { document.getElementById('eventModal').classList.add('active'); }
function closeModal() { document.getElementById('eventModal').classList.remove('active'); document.getElementById('createEventForm').reset(); }
function closeDetailsModal() { document.getElementById('eventDetailsModal').classList.remove('active'); currentActiveEventId = null; }

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const isPublishing = document.getElementById('ev-publish-toggle').checked;
    
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
        const createResponse = await ApiClient.request('/admin/events', 'POST', payload);
        if (isPublishing) await ApiClient.request(`/admin/events/${createResponse.data.event_id}/publish`, 'POST');
        
        form.reset();
        closeModal();
        loadEvents(); 
    } catch (error) {
        alert(`Action Failed: ${error.message}`);
    } finally {
        const isToggleChecked = document.getElementById('ev-publish-toggle').checked;
        submitBtn.innerText = isToggleChecked ? 'Create & Publish Event' : 'Save Event as Draft';
        if(isToggleChecked) submitBtn.classList.remove('btn-draft'); else submitBtn.classList.add('btn-draft');
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
    
    await switchKioskTab('checkin');
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