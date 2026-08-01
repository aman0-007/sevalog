// ==========================================
// EVENTS.JS (Optimized Build)
// ==========================================

let searchTimeout = null;
let currentActiveEventId = null;

// --- Performance Formatters & Lookups ---
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

// --- Performance Formatters & Lookups ---
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

    // 1. Primary Status Badge
    let ui = STATUS_UI_MAP[primaryStatus] || STATUS_UI_MAP['draft'];
    
    // Override: If it's upcoming but within the 30-minute window, switch to "STARTING SOON"
    if (isWithin30Mins && primaryStatus === 'upcoming') {
        ui = { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', label: 'STARTING SOON' };
    }
    
    badgesHTML += `<span class="status-badge" style="background: ${ui.bg}; color: ${ui.text}; margin-right: 6px;">${ui.label}</span>`;
    
    // 2. Registration Badge
    // HIDE REGISTRATION DATA if within 30 mins, already started, completed, or cancelled
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

// --- Modal Controls ---
function openModal() { document.getElementById('eventModal').classList.add('active'); }

function closeModal() { 
    document.getElementById('eventModal').classList.remove('active'); 
    document.getElementById('createEventForm').reset(); 
}
function closeDetailsModal() {
    document.getElementById('eventDetailsModal').classList.remove('active');
    currentActiveEventId = null; // Free memory reference
}

// --- Debounced Matrix Search ---
function debounceLoadEvents() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEvents, 350); // 350ms is the optimal typing buffer
}

// --- Core API: Fetch & Render Matrix ---
async function loadEvents() {
    const tbody = document.getElementById('events-table-body');
    
    const params = new URLSearchParams();
    const search = document.getElementById('filter-search').value.trim();
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('filter-sort').value;

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);

    try {
        const response = await ApiClient.request(`/admin/events?${params.toString()}`, 'GET');
        const events = response.data || response; 

        if (!events || events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px; color: var(--text-muted);">No events found matching your criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = events.map(ev => {
            const currentRegs = ev.volunteers_registered || 0; 
            const maxVols = ev.max_volunteers || ev.volunteers_needed || 0;
            const isFull = currentRegs >= maxVols;

            let badgeHtml = getEventBadges(ev);
            
            // Inline Kiosk Quick Actions
            const safeStartTime = ev.start_time || '00:00:00';
            const safeEndTime = ev.end_time || '23:59:59';

            // Safely convert UTC to local YYYY-MM-DD
            const dateObj = new Date(ev.event_date);
            const evDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const eventStart = new Date(`${evDateStr}T${safeStartTime}`);
            const eventEnd = new Date(`${evDateStr}T${safeEndTime}`);
            const now = new Date();
            
            // Boundary rules matching the backend
            const checkinOpenTime = new Date(eventStart.getTime() - (30 * 60 * 1000));
            const checkoutCloseTime = new Date(eventEnd.getTime() + (2 * 60 * 60 * 1000));
            
            const canCheckIn = now >= checkinOpenTime && now <= eventEnd;
            const canCheckOut = now >= eventStart && now <= checkoutCloseTime;
            
            const primaryStatus = (ev.dynamic_status || ev.status || '').toLowerCase();

            let quickActions = '';
            
            if (['upcoming', 'ongoing', 'published'].includes(primaryStatus)) {
                if (canCheckIn || canCheckOut) {
                    quickActions += `
                        <button onclick="event.stopPropagation(); openQRModal('${ev.event_id}', '${ev.title.replace(/'/g, "\\'")}')" 
                                title="Launch Attendance Kiosk"
                                style="background: transparent; color: var(--primary, #3B82F6); border: 1px solid var(--primary, #3B82F6); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                            <i data-lucide="qr-code" style="width: 14px; height: 14px;"></i> Kiosk
                        </button>
                    `;
                }
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

// --- Core API: Deep-Fetch Details Modal (Orchestrator) ---
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

        // Delegate rendering to helper functions
        renderCoreStats(evData);
        renderRoster(evData.roster || [], dynamicStatus);
        renderTimeline(evData.timeline || []);
        renderLifecycleButtons(eventId, evData, dynamicStatus);

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        document.getElementById('detail-title').innerText = "Network Error";
        document.getElementById('detail-volunteers-body').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #EF4444;">Failed to load secure context: ${error.message}</td></tr>`;
    }
}

// --- Helper 1: Render Core UI & Hidden Data ---
function renderCoreStats(evData) {
    document.getElementById('detail-title').innerText = evData.title || 'Untitled Event';
    document.getElementById('detail-status-badge').innerHTML = getEventBadges(evData);
    document.getElementById('detail-datetime').innerText = `${dateFormatter.format(new Date(evData.event_date))} | ${formatTime(evData.start_time)} - ${formatTime(evData.end_time)}`;
    document.getElementById('detail-location').innerText = evData.location_name || 'No location set';
    document.getElementById('detail-desc').innerText = evData.description || 'No description provided.';

    // Progress Bar & Capacity
    const roster = evData.roster || [];
    const registeredCount = roster.filter(v => ['registered', 'present'].includes(v.attendance_status || v.status)).length;
    const waitlistCount = roster.filter(v => (v.attendance_status || v.status) === 'waitlisted').length;
    const maxVolunteers = evData.max_volunteers || 'No Limit';
    
    document.getElementById('detail-capacity-text').innerText = `${registeredCount} / ${maxVolunteers} Reg.`;
    
    // Waitlist UI
    const waitlistDiv = document.getElementById('detail-waitlist');
    if (waitlistCount > 0 && waitlistDiv) {
        waitlistDiv.innerHTML = `<i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> ${waitlistCount} on Waitlist`;
        waitlistDiv.style.display = 'flex';
    } else if (waitlistDiv) {
        waitlistDiv.style.display = 'none';
    }
    
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

    // Google Maps Link (Fixes missing http:// bug)
    const mapsLink = document.getElementById('detail-maps-link');
    if (evData.google_maps_link && mapsLink) {
        let rawUrl = evData.google_maps_link.trim();
        // If it doesn't start with http:// or https://, add it
        if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = 'https://' + rawUrl;
        }
        mapsLink.href = rawUrl;
        mapsLink.style.display = 'inline-flex';
    } else if (mapsLink) {
        mapsLink.style.display = 'none';
    }

    // Registration Deadline
    const deadlineDiv = document.getElementById('detail-deadline');
    if (evData.registration_deadline && deadlineDiv) {
        deadlineDiv.innerText = `Ends: ${new Date(evData.registration_deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
        deadlineDiv.style.display = 'block';
    } else if (deadlineDiv) {
        deadlineDiv.style.display = 'none';
    }
}

// --- Helper 2: Render Interactive Roster ---
function renderRoster(roster, dynamicStatus) {
    const tbodyVols = document.getElementById('detail-volunteers-body');
    const theadVols = document.getElementById('detail-volunteers-head');
    if (!tbodyVols || !theadVols) return;
    
    const isPastOrOngoing = ['ongoing', 'completed', 'archived'].includes(dynamicStatus);
    
    if (isPastOrOngoing) {
        theadVols.innerHTML = `<tr><th>Volunteer</th><th>Check-In / Out</th><th>Status</th><th>Hours</th></tr>`;
    } else {
        theadVols.innerHTML = `<tr><th>Volunteer</th><th>Contact Info</th><th>Status</th><th>Hours</th></tr>`;
    }

    if (roster.length === 0) {
        tbodyVols.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteers registered yet.</td></tr>`;
    } else {
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

            return `
            <tr>
                <td>
                    <div class="roster-user">
                        <div class="avatar-sm">${initials.toUpperCase()}</div>
                        <span style="font-weight: 500;">${vol.first_name || ''} ${vol.last_name || ''}</span>
                    </div>
                </td>
                <td>${middleColumn}</td>
                <td>
                    <span style="font-size: 12px; font-weight: 600; color: ${color}; padding: 4px 8px; background: ${color}10; border-radius: 4px;">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td>${parseFloat(vol.hours_logged || 0).toFixed(2)} hrs</td>
            </tr>`;
        }).join('');
    }
}

// --- Helper 3: Render Vertical Timeline ---
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
                    ${new Date(log.timestamp).toLocaleString()} &bull; By: ${log.first_name ? `${log.first_name} ${log.last_name}` : 'System Auto'}
                </div>
            </div>
        `).join('');
    }
}

// --- Helper 4: Action Buttons & Lifecycle ---
function renderLifecycleButtons(eventId, evData, dynamicStatus) {
    const lifecycleContainer = document.getElementById('lifecycle-actions');
    const delBtn = document.getElementById('btn-delete-event');
    
    const oldQrBtn = document.getElementById('btn-launch-qr');
    if (oldQrBtn) oldQrBtn.style.display = 'none';
    
    if (lifecycleContainer) lifecycleContainer.innerHTML = ''; 
    if (delBtn) delBtn.style.display = 'none';

    const safeTitle = evData.title.replace(/'/g, "\\'");
    
    // --- UPDATED: Time Boundary Math matching the backend ---
    const safeStartTime = evData.start_time || '00:00:00';
    const safeEndTime = evData.end_time || '23:59:59';
    const dateObj = new Date(evData.event_date);
    const evDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    const eventStart = new Date(`${evDateStr}T${safeStartTime}`);
    const eventEnd = new Date(`${evDateStr}T${safeEndTime}`);
    const now = new Date();
    
    // Calculate precise window boundaries
    const checkinOpenTime = new Date(eventStart.getTime() - (30 * 60 * 1000));
    const checkoutCloseTime = new Date(eventEnd.getTime() + (2 * 60 * 60 * 1000));
    
    const canCheckIn = now >= checkinOpenTime && now <= eventEnd;
    const canCheckOut = now >= eventStart && now <= checkoutCloseTime;
    const isMoreThan30MinsAway = now < checkinOpenTime;

    if (evData.status === 'draft') {
        lifecycleContainer.innerHTML = `<button class="primary-btn" onclick="changeEventLifecycleStatus('${eventId}', 'published', '${safeTitle}')">Publish Event</button>`;
        if (delBtn) {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        }
    } else if (['upcoming', 'ongoing'].includes(dynamicStatus)) {
        
        let buttonsHTML = `<div style="display: flex; gap: 8px; align-items: center;">`;
        
        // Show Kiosks dynamically based on new windows
        if (canCheckIn || canCheckOut) {
            buttonsHTML += `
                <button onclick="openQRModal('${eventId}', '${safeTitle}')" 
                        style="background: #0F172A; color: #FFFFFF; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <i data-lucide="qr-code" style="width: 14px; height: 14px;"></i> Open Kiosk
                </button>
            `;
        }

        // ONLY show cancel button if event is strictly more than 30 mins away
        if (isMoreThan30MinsAway) {
            buttonsHTML += `
                <button style="background: transparent; color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" 
                        onclick="confirmCancelEvent('${eventId}', '${safeTitle}')">
                    <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> Cancel Event
                </button>
            `;
        }
        
        buttonsHTML += `</div>`;
        lifecycleContainer.innerHTML = buttonsHTML;
        
    } else if (dynamicStatus === 'completed' && evData.status !== 'archived') {
        lifecycleContainer.innerHTML = `
            <button style="background: transparent; color: #475569; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;" 
                    onclick="changeEventLifecycleStatus('${eventId}', 'archived', '${safeTitle}')">
                <i data-lucide="archive" style="width: 14px; height: 14px;"></i> Archive
            </button>`;
    } else if (['cancelled', 'archived'].includes(dynamicStatus)) {
        if (delBtn) {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        }
    }
}

// --- Action: Update Individual Volunteer Attendance ---
async function updateVolunteerStatus(attendanceId, newStatus, eventId) {
    try {
        const payload = { status: newStatus };
        
        // If marking present manually, auto-inject the check-in time for hours calculation
        if (newStatus === 'present') {
            payload.check_in_time = new Date().toISOString();
        }

        await ApiClient.request(`/admin/events/attendance/${attendanceId}`, 'PUT', payload);
        
        // Refresh the modal seamlessly to recalculate capacities, hours, and log the timeline event
        openDetailsModal(eventId); 
    } catch (error) {
        alert(`Failed to update volunteer status: ${error.message}`);
        // Revert dropdown state by refreshing
        openDetailsModal(eventId);
    }
}

// --- Action: Soft Delete ---
async function confirmDeleteEvent(eventId, eventTitle) {
    if(!confirm(`DANGER: Are you sure you want to cancel and soft-delete "${eventTitle}"?\n\nThis removes it from public views but retains audit history.`)) return;
    
    try {
        await ApiClient.request(`/admin/events/${eventId}`, 'DELETE');
        closeDetailsModal();
        loadEvents(); 
    } catch (error) {
        alert(`Deletion Failed: ${error.message}`);
    }
}

async function confirmCancelEvent(eventId, eventTitle) {
    if(!confirm(`WARNING: Are you sure you want to CANCEL "${eventTitle}"?\n\nThis will withdraw all registered volunteers and permanently mark the event as cancelled.`)) return;
    
    try {
        // Use the dedicated cancel endpoint
        await ApiClient.request(`/admin/events/${eventId}/cancel`, 'POST');
        
        // Refresh the modal data to show the new CANCELLED badge and updated timeline
        openDetailsModal(eventId);
        // Refresh the background table
        loadEvents(); 
    } catch (error) {
        alert(`Cancellation Failed: ${error.message}`);
    }
}

// --- Action: Update Lifecycle Status ---
async function changeEventLifecycleStatus(eventId, newStatus, currentTitle) {
    const actionText = newStatus.replace('_', ' ').toUpperCase();
    if (!confirm(`Are you sure you want to change the status of "${currentTitle}" to ${actionText}?`)) return;

    // Map boolean toggles based on the targeted status
    const updates = { status: newStatus };
    if (newStatus === 'registration_open') {
        updates.registration_open = true;
    } else if (newStatus === 'registration_closed' || newStatus === 'archived' || newStatus === 'cancelled') {
        updates.registration_open = false;
    }

    try {
        await ApiClient.request(`/admin/events/${eventId}`, 'PUT', updates);
        
        // Refresh the modal data without closing it to show the new state
        openDetailsModal(eventId);
        // Refresh the background table
        loadEvents(); 
    } catch (error) {
        alert(`Failed to update status: ${error.message}`);
    }
}

// --- Action: Create Event ---
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const isPublishing = document.getElementById('ev-publish-toggle').checked;
    
    const eventDate = form.querySelector('#ev-date').value;
    const startTime = form.querySelector('#ev-start').value;
    const endTime = form.querySelector('#ev-end').value;
    const deadline = form.querySelector('#ev-deadline').value;
    
    if (startTime >= endTime) {
        alert("Error: End time must be after the start time.");
        return;
    }

    if (deadline) {
        const eventStartDateTime = new Date(`${eventDate}T${startTime}`);
        const deadlineDateTime = new Date(deadline);
        
        if (deadlineDateTime >= eventStartDateTime) {
            alert("Error: Registration deadline must be before the event starts.");
            return;
        }
    }

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    
    const payload = {
        title: form.querySelector('#ev-title').value.trim(),
        category: form.querySelector('#ev-category').value, 
        event_date: form.querySelector('#ev-date').value,
        start_time: startTime,
        end_time: endTime,
        
        location_name: form.querySelector('#ev-location-name').value.trim(),
        location_address: form.querySelector('#ev-location-address').value.trim(),
        google_maps_link: form.querySelector('#ev-maps-link').value.trim() || null,

        // Numbers strictly parsed with fallbacks
        volunteers_needed: parseInt(form.querySelector('#ev-vol-needed').value, 10),
        min_volunteers: parseInt(form.querySelector('#ev-min-vol').value, 10) || 1,
        // If max volunteers is empty, send null
        max_volunteers: form.querySelector('#ev-max-volunteers').value ? parseInt(form.querySelector('#ev-max-volunteers').value, 10) : null,
        
        registration_deadline: form.querySelector('#ev-deadline').value || null,
        
        contact_person_name: form.querySelector('#ev-contact-name').value.trim() || null,
        contact_person_phone: form.querySelector('#ev-contact-phone').value.trim() || null,
        description: form.querySelector('#ev-desc').value.trim() || null
    };

    try {
        const createResponse = await ApiClient.request('/admin/events', 'POST', payload);
        const newEventId = createResponse.data.event_id;

        if (isPublishing) {
            await ApiClient.request(`/admin/events/${newEventId}/publish`, 'POST');
        }
        
        form.reset();
        closeModal();
        if (typeof loadEvents === 'function') loadEvents(); 
        
    } catch (error) {
        alert(`Action Failed: ${error.message}`);
    } finally {
        // Reset button text to correct state based on toggle
        const isToggleChecked = document.getElementById('ev-publish-toggle').checked;
        
        if (isToggleChecked) {
            submitBtn.innerText = 'Create & Publish Event';
            submitBtn.classList.remove('btn-draft');
        } else {
            submitBtn.innerText = 'Save Event as Draft';
            submitBtn.classList.add('btn-draft');
        }
        
        submitBtn.disabled = false;
    }
});

// UX: Change button text AND color based on the publish toggle state
document.getElementById('ev-publish-toggle').addEventListener('change', function() {
    const submitBtn = document.getElementById('submit-event-btn');
    if (this.checked) {
        submitBtn.innerText = 'Create & Publish Event';
        submitBtn.classList.remove('btn-draft'); // Returns to primary color
    } else {
        submitBtn.innerText = 'Save Event as Draft';
        submitBtn.classList.add('btn-draft');    // Changes to muted gray
    }
});

// ==========================================
// DYNAMIC QR CHECK-IN KIOSK
// ==========================================
let qrRefreshTimeout = null;
let qrCountdownInterval = null;
let currentKioskType = 'checkin'; 
let currentKioskEventId = null; 

async function openQRModal(eventId, eventTitle) {
    currentKioskEventId = eventId;
    document.getElementById('qr-event-title').innerText = eventTitle;
    document.getElementById('qrCheckInModal').classList.add('active');
    
    // Hide wrapper initially until we confirm token
    document.getElementById('qr-code-wrapper').style.display = 'none';
    document.getElementById('qr-status-message').style.display = 'none';
    
    // Default to check-in when modal opens
    await switchKioskTab('checkin');
}

async function switchKioskTab(type) {
    currentKioskType = type;
    
    // Update Tab UI Styles
    const btnIn = document.getElementById('kiosk-tab-checkin');
    const btnOut = document.getElementById('kiosk-tab-checkout');
    
    if (type === 'checkin') {
        btnIn.style.background = 'white';
        btnIn.style.color = '#10B981';
        btnIn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        
        btnOut.style.background = 'transparent';
        btnOut.style.color = '#64748B';
        btnOut.style.boxShadow = 'none';
    } else {
        btnOut.style.background = 'white';
        btnOut.style.color = '#3B82F6';
        btnOut.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        
        btnIn.style.background = 'transparent';
        btnIn.style.color = '#64748B';
        btnIn.style.boxShadow = 'none';
    }

    // Clear old data while switching
    document.getElementById('qr-code-container').innerHTML = "";
    document.getElementById('qr-code-wrapper').style.display = 'none';
    document.getElementById('qr-status-message').style.display = 'none';
    
    // Fetch the new QR code for this specific tab
    await fetchAndRenderQR(currentKioskEventId);
}

async function fetchAndRenderQR(eventId) {
    clearQRTimers(); // Strict cleanup before new cycle

    const statusDiv = document.getElementById('qr-status-message');
    const qrWrapper = document.getElementById('qr-code-wrapper');
    const qrContainer = document.getElementById('qr-code-container');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}/qr-token?type=${currentKioskType}`, 'GET');
        
        statusDiv.style.display = 'none';
        qrWrapper.style.display = 'inline-block';
        
        const { token, refreshIntervalMs } = response.data;
        qrContainer.innerHTML = "";
        
        // Visual cue: Tint the QR wrapper based on type
        qrWrapper.style.borderColor = currentKioskType === 'checkin' ? "#10B981" : "#3B82F6";
        const qrColor = currentKioskType === 'checkin' ? "#064E3B" : "#1E3A8A";

        new QRCode(qrContainer, {
            text: token,
            width: 256,
            height: 256,
            colorDark: qrColor,
            colorLight: "#F8FAFC", 
            correctLevel: QRCode.CorrectLevel.H
        });

        startQRTimers(eventId, refreshIntervalMs);

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
        const percentage = (secondsLeft / (refreshIntervalMs / 1000)) * 100;
        
        timerBar.style.width = `${Math.max(0, percentage)}%`;
        timerText.innerText = `Code changing in ${secondsLeft}s...`;
        
        if (secondsLeft <= 0) clearInterval(qrCountdownInterval);
    }, 1000);

    qrRefreshTimeout = setTimeout(() => {
        fetchAndRenderQR(eventId);
    }, refreshIntervalMs);
}

function clearQRTimers() {
    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    if (qrRefreshTimeout) clearTimeout(qrRefreshTimeout);
    qrCountdownInterval = null;
    qrRefreshTimeout = null;
}

function closeQRModal() {
    document.getElementById('qrCheckInModal').classList.remove('active');
    clearQRTimers(); 
    document.getElementById('qr-code-container').innerHTML = "";
    document.getElementById('qr-status-message').style.display = 'none';
    currentKioskEventId = null;
}

// --- Initialization Lifecycle ---
document.addEventListener('DOMContentLoaded', loadEvents);