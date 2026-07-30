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


function getEventBadges(event) {
    let badgesHTML = '';
    
    // Check if backend provided a dynamic_status, otherwise fallback to DB status
    const primaryStatus = (event.dynamic_status || event.status || '').toLowerCase();
    
    const ui = STATUS_UI_MAP[primaryStatus] || STATUS_UI_MAP['draft'];
    badgesHTML += `<span class="status-badge" style="background: ${ui.bg}; color: ${ui.text}; margin-right: 6px;">${ui.label}</span>`;
    
    // 2. Determine Registration Badge (ONLY show if event is not draft/cancelled/completed/archived)
    if (['upcoming', 'ongoing', 'published'].includes(primaryStatus)) {
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

        // Fast string buffer accumulation using Array.map.join
        tbody.innerHTML = events.map(ev => {
            const currentRegs = ev.volunteers_registered || 0; 
            const maxVols = ev.max_volunteers || ev.volunteers_needed || 0;
            const isFull = currentRegs >= maxVols;

            let badgeHtml = getEventBadges(ev);

            return `
            <tr onclick="openDetailsModal('${ev.event_id}')">
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
                <td>${badgeHtml}</td>
            </tr>`;
        }).join('');

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: #EF4444; text-align: center;">Error loading matrix: ${error.message}</td></tr>`;
    }
}

// --- Core API: Deep-Fetch Details Modal ---
async function openDetailsModal(eventId) {
    currentActiveEventId = eventId;
    
    // DOM Caching for scoped updates
    const modal = document.getElementById('eventDetailsModal');
    const tbodyVols = document.getElementById('detail-volunteers-body');
    const tbodyTimeline = document.getElementById('detail-timeline-body');
    const delBtn = document.getElementById('btn-delete-event');
    const qrBtn = document.getElementById('btn-launch-qr');
    
    document.getElementById('detail-title').innerText = "Fetching Event Data...";
    
    document.getElementById('detail-status-badge').innerHTML = "";
    tbodyVols.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Fetching secure roster...</td></tr>`;
    tbodyTimeline.innerHTML = `<tr><td style="text-align: center; color: var(--text-muted);">Fetching audit logs...</td></tr>`;
    delBtn.style.display = 'none'; 
    
    modal.classList.add('active');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}`, 'GET');
        const evData = response.data || response; 

        // Populate Core Stats
        document.getElementById('detail-title').innerText = evData.title;
        
        document.getElementById('detail-status-badge').innerHTML = getEventBadges(evData);

        document.getElementById('detail-category').innerText = `Category: ${evData.category || 'N/A'}`;
        document.getElementById('detail-datetime').innerText = `${dateFormatter.format(new Date(evData.event_date))} | ${formatTime(evData.start_time)} - ${formatTime(evData.end_time)}`;
        document.getElementById('detail-location').innerText = evData.location_name;
        document.getElementById('detail-desc').innerText = evData.description || 'No description provided.';
        
        // Roster Fast-Filter logic
        const roster = evData.roster || [];
        const activeCount = roster.filter(v => v.status !== 'withdrawn' && v.status !== 'waitlisted').length;
        const waitlistCount = roster.filter(v => v.status === 'waitlisted').length;
        
        document.getElementById('detail-capacity').innerText = `${activeCount} / ${evData.max_volunteers} Registered`;
        document.getElementById('detail-waitlist').innerText = waitlistCount;

        // Render Roster (NEW: Interactive Status Dropdowns)
        if (roster.length === 0) {
            tbodyVols.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteers registered yet.</td></tr>`;
        } else {
            const statusOptions = ['registered', 'present', 'absent', 'waitlisted', 'withdrawn', 'excused', 'late'];
            
            tbodyVols.innerHTML = roster.map(vol => {
                const color = vol.status === 'withdrawn' ? '#EF4444' : (vol.status === 'present' ? '#10B981' : (vol.status === 'waitlisted' ? '#F59E0B' : 'var(--text-main)'));
                
                // Interactive select element for manual admin overrides
                const selectHtml = `
                    <select class="form-input" style="padding: 4px 8px; height: auto; font-size: 12px; font-weight: 600; color: ${color}; border: 1px solid ${color}40; background: ${color}10; border-radius: 4px; cursor: pointer;" onchange="updateVolunteerStatus('${vol.attendance_id}', this.value, '${eventId}')">
                        ${statusOptions.map(opt => `<option value="${opt}" ${vol.status === opt ? 'selected' : ''}>${opt.toUpperCase()}</option>`).join('')}
                    </select>
                `;

                return `
                <tr>
                    <td style="font-weight: 500;">${vol.first_name} ${vol.last_name}</td>
                    <td>
                        <div style="font-size: 13px;">${vol.email}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${vol.phone_number || 'No Phone'}</div>
                    </td>
                    <td>${selectHtml}</td>
                    <td>${parseFloat(vol.hours_logged || 0).toFixed(2)} hrs</td>
                </tr>`;
            }).join('');
        }

        // Render Timeline Logs
        const timeline = evData.timeline || [];
        if (timeline.length === 0) {
            tbodyTimeline.innerHTML = `<tr><td style="text-align: center; color: var(--text-muted);">No audit data found.</td></tr>`;
        } else {
            tbodyTimeline.innerHTML = timeline.map(log => `
                <tr>
                    <td>
                        <div style="font-size: 13px; font-weight: 500;">${log.action}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                            ${new Date(log.timestamp).toLocaleString()} &bull; Triggered by: ${log.first_name ? `${log.first_name} ${log.last_name}` : 'System Auto'}
                        </div>
                    </td>
                </tr>`).join('');
        }

        // 1. Setup Lifecycle Control Buttons based on decoupled states (Timeline vs. Registration)
        const lifecycleContainer = document.getElementById('lifecycle-actions');
        lifecycleContainer.innerHTML = ''; 
        
        if (evData.status === 'draft') {
            lifecycleContainer.innerHTML = `<button class="primary-btn" onclick="changeEventLifecycleStatus('${eventId}', 'registration_open', '${evData.title.replace(/'/g, "\\'")}')">Publish & Open Reg</button>`;
        } 
        else if (evData.registration_open) {
            lifecycleContainer.innerHTML = `<button class="btn-secondary" style="color: #F59E0B; border-color: rgba(245, 158, 11, 0.3);" onclick="changeEventLifecycleStatus('${eventId}', 'registration_closed', '${evData.title.replace(/'/g, "\\'")}')">Close Registration</button>`;
        }
        else if (!evData.registration_open && ['upcoming', 'ongoing'].includes(evData.dynamic_status)) {
            // Allow admins to re-open registration if the event hasn't finished yet
            lifecycleContainer.innerHTML = `<button class="btn-secondary" style="color: #10B981; border-color: rgba(16, 185, 129, 0.3);" onclick="changeEventLifecycleStatus('${eventId}', 'registration_open', '${evData.title.replace(/'/g, "\\'")}')">Re-open Registration</button>`;
        }

        // Archive button explicitly relies on the timeline being over
        if (['completed', 'cancelled'].includes(evData.dynamic_status) && evData.status !== 'archived') {
            lifecycleContainer.innerHTML += `<button class="btn-secondary" onclick="changeEventLifecycleStatus('${eventId}', 'archived', '${evData.title.replace(/'/g, "\\'")}')"><i data-lucide="archive" style="width: 14px; height: 14px; margin-right: 4px;"></i> Archive</button>`;
        }

        // 2. Setup Delete Button (Disabled if already cancelled/archived)
        if (evData.dynamic_status !== 'cancelled' && evData.status !== 'archived') {
            delBtn.style.display = 'block';
            delBtn.onclick = () => confirmDeleteEvent(eventId, evData.title);
        } else {
            delBtn.style.display = 'none';
        }

        // 3. Setup QR Kiosk Button (Relies on timeline, NOT registration state)
        if (['upcoming', 'ongoing'].includes(evData.dynamic_status)) {
            qrBtn.style.display = 'flex';
            qrBtn.onclick = () => openQRModal(eventId, evData.title);
        } else {
            qrBtn.style.display = 'none';
        }

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        document.getElementById('detail-title').innerText = "Network Error";
        tbodyVols.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #EF4444;">Failed to load secure context: ${error.message}</td></tr>`;
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

async function openQRModal(eventId, eventTitle) {
    document.getElementById('qr-event-title').innerText = eventTitle;
    document.getElementById('qrCheckInModal').classList.add('active');
    
    // Hide wrapper initially until we confirm token
    document.getElementById('qr-code-wrapper').style.display = 'none';
    document.getElementById('qr-status-message').style.display = 'none';
    
    await fetchAndRenderQR(eventId);
}

async function fetchAndRenderQR(eventId) {
    clearQRTimers(); // Strict cleanup before new cycle

    const statusDiv = document.getElementById('qr-status-message');
    const qrWrapper = document.getElementById('qr-code-wrapper');
    const qrContainer = document.getElementById('qr-code-container');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}/qr-token`, 'GET');
        
        // Hide error message if successful
        statusDiv.style.display = 'none';
        qrWrapper.style.display = 'inline-block';
        
        const { token, refreshIntervalMs } = response.data;

        // Clear old canvas and render new
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: token,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#F8FAFC", // Matches the wrapper background
            correctLevel: QRCode.CorrectLevel.H
        });

        startQRTimers(eventId, refreshIntervalMs);

    } catch (error) {
        // Handle 403 (Too early, too late) gracefully on screen
        qrWrapper.style.display = 'none';
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.color = '#EF4444';
        statusDiv.innerText = error.message || "Failed to generate check-in token.";
        
        // Reset timers UI
        document.getElementById('qr-timer-bar').style.width = '0%';
        document.getElementById('qr-timer-text').innerText = 'Check-in inactive';
    }
}

function startQRTimers(eventId, refreshIntervalMs) {
    const timerBar = document.getElementById('qr-timer-bar');
    const timerText = document.getElementById('qr-timer-text');
    
    let secondsLeft = Math.floor(refreshIntervalMs / 1000);

    // CSS Reflow Trick to snap bar back to 100% instantly
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    void timerBar.offsetWidth; 
    timerBar.style.transition = 'width 1s linear'; // Re-apply smooth shrinking

    qrCountdownInterval = setInterval(() => {
        secondsLeft--;
        const percentage = (secondsLeft / (refreshIntervalMs / 1000)) * 100;
        
        timerBar.style.width = `${Math.max(0, percentage)}%`;
        timerText.innerText = `Code changing in ${secondsLeft}s...`;
        
        if (secondsLeft <= 0) clearInterval(qrCountdownInterval);
    }, 1000);

    // Fetch the next token slightly before this one expires
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
    clearQRTimers(); // CRITICAL: Stop background polling
    document.getElementById('qr-code-container').innerHTML = "";
    document.getElementById('qr-status-message').style.display = 'none';
}

// --- Initialization Lifecycle ---
document.addEventListener('DOMContentLoaded', loadEvents);