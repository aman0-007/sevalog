// ==========================================
// VOLUNTEERS.JS (Admin Volunteer Directory)
// ==========================================

let volunteersData = [];
let currentViewingUser = null;

// 1. Fetch Lightweight Profiles from Database
async function loadVolunteers() {
    const tbody = document.getElementById('volunteers-table-body');
    
    try {
        const response = await ApiClient.request('/admin/volunteers', 'GET');
        
        // FIX 1: Safely handle pagination wrapper if present
        volunteersData = response.data.data || response.data || [];
        renderTable(volunteersData);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

// 2. Render Table Function
function renderTable(dataToRender) {
    const tbody = document.getElementById('volunteers-table-body');
    const searchCount = document.getElementById('directory-search-count');
    
    if (searchCount) {
        const total = volunteersData.length;
        const showing = dataToRender ? dataToRender.length : 0;
        searchCount.innerText = showing === total ? `${total} Volunteers` : `${showing} of ${total} Volunteers`;
    }

    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 32px;">No volunteers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataToRender.map(vol => {
        const fullName = `${vol.first_name || ''} ${vol.last_name || ''}`.trim();
        const joinedDate = vol.created_at ? new Date(vol.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '--';

        return `
        <tr onclick="viewProfile('${vol.user_id}')">
            <td class="col-volunteer">
                <div class="volunteer-name-cell">
                    <span class="volunteer-name-text" style="font-weight: 600; color: var(--text-main); ${!vol.is_active ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${fullName || 'Anonymous'}</span>
                </div>
            </td>
            <td class="col-contact">
                <div style="font-size: 13px; font-weight: 500; color: var(--text-main); word-break: break-word; overflow-wrap: anywhere;">${vol.email || '--'}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${vol.phone_number || '--'}</div>
            </td>
            <td class="col-location">
                <div style="font-size: 13px; font-weight: 500; color: var(--text-main);">${vol.city || 'Mumbai'}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Joined ${joinedDate}</div>
            </td>
            <td class="col-hours" style="text-align: right; font-weight: 600; color: ${vol.is_active ? 'var(--accent)' : 'var(--text-muted)'}; white-space: nowrap;">
                ${vol.total_hours_served || 0} hrs
            </td>
        </tr>
    `}).join('');
}

// 3. Search Bar Logic (Name, Email, or Mobile Number)
function filterVolunteers(query) {
    const cleanTerm = (query || '').toLowerCase().trim();
    const numericTerm = cleanTerm.replace(/[^0-9]/g, '');

    if (!cleanTerm) {
        renderTable(volunteersData);
        return;
    }

    const filteredData = volunteersData.filter(vol => {
        const fullName = `${vol.first_name || ''} ${vol.last_name || ''}`.toLowerCase();
        const email = (vol.email || '').toLowerCase();
        const rawPhone = (vol.phone_number || '').toLowerCase();
        const numericPhone = rawPhone.replace(/[^0-9]/g, '');

        const matchesName = fullName.includes(cleanTerm);
        const matchesEmail = email.includes(cleanTerm);
        const matchesPhone = rawPhone.includes(cleanTerm) || (numericTerm && numericPhone.includes(numericTerm));

        return matchesName || matchesEmail || matchesPhone;
    });

    renderTable(filteredData);
}

// Attach listeners for both header search and in-page directory search
const dirSearchInput = document.getElementById('directory-search-input');
const dirSearchClear = document.getElementById('directory-search-clear');
const topSearchInput = document.getElementById('search-input');

if (dirSearchInput) {
    dirSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (dirSearchClear) dirSearchClear.style.display = val ? 'inline-flex' : 'none';
        if (topSearchInput) topSearchInput.value = val;
        filterVolunteers(val);
    });
}

if (dirSearchClear) {
    dirSearchClear.addEventListener('click', () => {
        if (dirSearchInput) dirSearchInput.value = '';
        if (topSearchInput) topSearchInput.value = '';
        dirSearchClear.style.display = 'none';
        filterVolunteers('');
        if (dirSearchInput) dirSearchInput.focus();
    });
}

if (topSearchInput) {
    topSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (dirSearchInput) dirSearchInput.value = val;
        if (dirSearchClear) dirSearchClear.style.display = val ? 'inline-flex' : 'none';
        filterVolunteers(val);
    });
}

// 4. Fetch & View Single Profile Modal Logic
window.viewProfile = async function(userId) {
    // Show Modal Loading State
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('modal-body-content').style.display = 'none';
    document.getElementById('modal-name').innerText = "Loading profile...";
    document.getElementById('modal-role-city').innerText = "Fetching data...";

    try {
        const response = await ApiClient.request(`/admin/volunteers/${userId}`, 'GET');
        const user = response.data;
        currentViewingUser = user;

        // Header
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        document.getElementById('modal-avatar').innerText = user.first_name ? user.first_name.charAt(0).toUpperCase() : 'V';
        document.getElementById('modal-name').innerText = fullName || 'Anonymous User';
        document.getElementById('modal-role-city').innerText = user.city ? `${user.city}` : 'Volunteer';

        // Stats Banner
        document.getElementById('modal-hours').innerText = user.total_hours_served || 0;
        document.getElementById('modal-events').innerText = user.total_activities_count || 0;
        document.getElementById('modal-status').innerText = user.is_active ? 'Active' : 'Deactivated';
        document.getElementById('modal-status').style.color = user.is_active ? '#10B981' : '#EF4444';

        // Card 1: Contact & Demographics
        document.getElementById('modal-email').innerText = user.email;
        document.getElementById('modal-phone').innerText = user.phone_number || '--';
        
        const dob = user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-IN') : '--';
        document.getElementById('modal-demographics').innerText = `${dob} / ${user.gender || '--'}`;
        document.getElementById('modal-blood').innerText = user.blood_group || 'Unknown';

        // Card 2: Background (FIX 2: Merging profession and college safely)
        document.getElementById('modal-edu').innerText = user.education_level || '--';
        const profStr = [user.profession, user.college_name].filter(Boolean).join(' / ');
        document.getElementById('modal-profession').innerText = profStr || '--';
        
        const addressStr = [user.residential_address, user.city, user.pincode].filter(Boolean).join(', ');
        document.getElementById('modal-address').innerText = addressStr || '--';

        // Card 3: Emergency & Medical
        const emergName = user.emergency_contact_name || '--';
        const emergRel = user.emergency_contact_relation ? `(${user.emergency_contact_relation})` : '';
        const emergPhone = user.emergency_contact_number || '--';
        document.getElementById('modal-emergency-contact').innerHTML = `${emergName} ${emergRel}<br><span style="font-size:12px; font-weight:400;">${emergPhone}</span>`;
        
        const medicalElement = document.getElementById('modal-medical');
        if(user.medical_conditions) {
            medicalElement.innerText = user.medical_conditions;
            medicalElement.classList.add('font-red', 'font-bold');
        } else {
            medicalElement.innerText = 'None reported';
            medicalElement.classList.remove('font-red', 'font-bold');
        }

        // Card 4: Tags helper
        const renderTags = (arr, elementId) => {
            const container = document.getElementById(elementId);
            container.innerHTML = (arr && arr.length > 0) 
                ? arr.map(item => `<span class="skill-tag">${item}</span>`).join('') 
                : `<span style="font-size: 13px; color: var(--text-muted); font-style: italic;">None provided</span>`;
        };

        renderTags(user.skills, 'modal-skills');
        renderTags(user.languages_spoken, 'modal-languages');
        renderTags(user.interested_activities, 'modal-interests');

        // ==========================================
        // FIX 3: Inject Event History into the UI
        // ==========================================
        let historyContainer = document.getElementById('modal-history-container');
        if (!historyContainer) {
            historyContainer = document.createElement('div');
            historyContainer.id = 'modal-history-container';
            historyContainer.className = 'profile-card full-width';
            historyContainer.style.marginTop = '16px';
            document.querySelector('.profile-grid').appendChild(historyContainer);
        }

        if (user.attendance_history && user.attendance_history.length > 0) {
            let historyHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 13px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; border: none; padding: 0;">Recent Event History</h4>
                    <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 500;">${user.attendance_history.length} Event Record(s)</span>
                </div>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse; text-align: left;">
                        <thead style="position: sticky; top: 0; background: var(--bg-color); border-bottom: 1px solid var(--border); z-index: 1;">
                            <tr>
                                <th style="padding: 10px; font-weight: 600;">Event</th>
                                <th style="padding: 10px; font-weight: 600;">Date</th>
                                <th style="padding: 10px; font-weight: 600;">Status</th>
                                <th style="padding: 10px; font-weight: 600;">Hours</th>
                                <th style="padding: 10px; font-weight: 600; text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            historyHtml += user.attendance_history.map((record, index) => {
                const dateStr = record.event_date ? new Date(record.event_date).toLocaleDateString('en-IN') : '--';
                const status = (record.status || 'registered').toLowerCase();
                const statusColor = status === 'present' ? '#10B981' : (['withdrawn', 'absent'].includes(status) ? '#EF4444' : 'var(--text-muted)');
                const hours = parseFloat(record.hours_logged || record.hours_attended || 0).toFixed(1);
                return `<tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px; font-weight: 500;">${record.title || 'Untitled Event'}</td>
                    <td style="padding: 10px; color: var(--text-muted);">${dateStr}</td>
                    <td style="padding: 10px; color: ${statusColor}; font-weight: 600;">${status.toUpperCase()}</td>
                    <td style="padding: 10px; font-weight: 600;">${hours} hrs</td>
                    <td style="padding: 10px; text-align: right;">
                        <button type="button" class="btn-secondary" style="padding: 3px 8px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px; cursor: pointer;" onclick="openPatchAttendanceModal(event, ${index})" title="Adjust hours or status (PATCH)">
                            <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Adjust
                        </button>
                    </td>
                </tr>`;
            }).join('');
            
            historyHtml += `</tbody></table></div>`;
            historyContainer.innerHTML = historyHtml;
        } else {
            historyContainer.innerHTML = `<h4>Recent Event History</h4><p style="font-size: 13px; color: var(--text-muted); font-style: italic;">No event history found.</p>`;
        }

        // ==========================================
        // FIX 4: Inject Deactivate Account Button
        // ==========================================
        let actionContainer = document.getElementById('modal-action-container');
        if (!actionContainer) {
            actionContainer = document.createElement('div');
            actionContainer.id = 'modal-action-container';
            actionContainer.style.marginTop = '24px';
            actionContainer.style.paddingTop = '16px';
            actionContainer.style.borderTop = '1px solid var(--border)';
            actionContainer.style.textAlign = 'right';
            document.getElementById('modal-body-content').appendChild(actionContainer);
        }

        if (user.is_active && user.role !== 'admin') {
            // Cannot deactivate other admins, but can deactivate volunteers
            actionContainer.innerHTML = `
                <button class="btn-secondary" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.3);" onclick="deactivateVolunteer('${user.user_id}', '${fullName.replace(/'/g, "\\'")}')">
                    <i data-lucide="user-x" style="width: 14px; height: 14px; display: inline; margin-bottom: -2px;"></i> Deactivate Volunteer
                </button>
            `;
        } else if (!user.is_active) {
            actionContainer.innerHTML = `<span style="color: #EF4444; font-size: 13px; font-weight: 600;"><i data-lucide="user-x" style="width: 14px; height: 14px; display: inline; margin-bottom: -2px;"></i> Account Deactivated</span>`;
        } else {
            actionContainer.innerHTML = ``; // Hide for active admins
        }

        // Reveal content
        document.getElementById('modal-body-content').style.display = 'block';
        if (window.lucide) lucide.createIcons();

    } catch (error) {
        document.getElementById('modal-name').innerText = "Error Loading Profile";
        document.getElementById('modal-role-city').innerText = error.message;
    }
}

// 5. Handle Deactivation API Call
window.deactivateVolunteer = async function(userId, name) {
    if(!confirm(`WARNING: Are you sure you want to deactivate ${name}?\n\nThis will soft-delete their account and automatically withdraw them from all upcoming events. This action cannot be easily undone.`)) return;
    
    try {
        await ApiClient.request(`/admin/volunteers/${userId}`, 'DELETE');
        alert(`${name}'s account has been successfully deactivated.`);
        closeModal();
        loadVolunteers(); // Refresh table so they show up grayed out
    } catch (error) {
        alert(`Failed to deactivate: ${error.message}`);
    }
}

window.closeModal = function() { 
    document.getElementById('profileModal').classList.remove('active'); 
}

// ==========================================
// 6. ATTENDANCE PATCH MODAL (PATCH /api/admin/events/{id}/attendance/{regId})
// ==========================================

function toLocalDatetimeString(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

window.openPatchAttendanceModal = function(e, index) {
    if (e) e.stopPropagation();
    if (!currentViewingUser || !currentViewingUser.attendance_history) return;

    const record = currentViewingUser.attendance_history[index];
    if (!record) return;

    // Resolve event ID and registration ID
    const eventId = record.event_id || record.eventId || (record.event && record.event.id) || record.id;
    const regId = record.registration_id || record.reg_id || record.attendance_id || (record.event_id ? record.id : null) || record.id;
    const userId = currentViewingUser.user_id || currentViewingUser.id;

    document.getElementById('patch-reg-id').value = regId || '';
    document.getElementById('patch-event-id').value = eventId || '';
    document.getElementById('patch-user-id').value = userId || '';

    // Context Card
    document.getElementById('patch-event-title').innerText = record.title || 'Event Record';
    const dateStr = record.event_date ? new Date(record.event_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date N/A';
    document.getElementById('patch-event-date').innerText = dateStr;
    const volName = `${currentViewingUser.first_name || ''} ${currentViewingUser.last_name || ''}`.trim() || 'Volunteer';
    document.getElementById('patch-volunteer-name').innerText = volName;

    // Form inputs
    const statusSelect = document.getElementById('patch-status');
    if (statusSelect) statusSelect.value = (record.status || 'registered').toLowerCase();

    const hoursInput = document.getElementById('patch-hours');
    if (hoursInput) hoursInput.value = parseFloat(record.hours_logged || record.hours_attended || 0);

    const checkInInput = document.getElementById('patch-checkin-time');
    if (checkInInput) checkInInput.value = toLocalDatetimeString(record.check_in_time);

    const checkOutInput = document.getElementById('patch-checkout-time');
    if (checkOutInput) checkOutInput.value = toLocalDatetimeString(record.check_out_time);

    const remarksInput = document.getElementById('patch-remarks');
    if (remarksInput) remarksInput.value = record.remarks || record.notes || '';

    const modal = document.getElementById('patchAttendanceModal');
    if (modal) modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.closePatchAttendanceModal = function() {
    const modal = document.getElementById('patchAttendanceModal');
    if (modal) modal.classList.remove('active');
};

window.setPatchHoursPreset = function(hrs) {
    const input = document.getElementById('patch-hours');
    if (input) input.value = hrs;
};

window.setPatchCheckInNow = function() {
    const input = document.getElementById('patch-checkin-time');
    if (input) input.value = toLocalDatetimeString(new Date().toISOString());
};

window.clearPatchCheckIn = function() {
    const input = document.getElementById('patch-checkin-time');
    if (input) input.value = '';
};

window.setPatchCheckOutNow = function() {
    const input = document.getElementById('patch-checkout-time');
    if (input) input.value = toLocalDatetimeString(new Date().toISOString());
};

window.clearPatchCheckOut = function() {
    const input = document.getElementById('patch-checkout-time');
    if (input) input.value = '';
};

window.savePatchAttendance = async function(e) {
    if (e) e.preventDefault();

    const eventId = document.getElementById('patch-event-id')?.value;
    const regId = document.getElementById('patch-reg-id')?.value;
    const userId = document.getElementById('patch-user-id')?.value;
    const statusVal = document.getElementById('patch-status')?.value;
    const hoursVal = document.getElementById('patch-hours')?.value;
    const checkInVal = document.getElementById('patch-checkin-time')?.value;
    const checkOutVal = document.getElementById('patch-checkout-time')?.value;
    const remarksVal = document.getElementById('patch-remarks')?.value?.trim();

    if (!eventId || !regId) {
        alert("Missing event or registration identifier for this record.");
        return;
    }

    const submitBtn = document.getElementById('patch-submit-btn');
    const origText = submitBtn ? submitBtn.innerText : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';
    }

    try {
        // Construct partial PATCH payload
        const payload = {};
        if (statusVal) payload.status = statusVal;
        if (hoursVal !== '' && !isNaN(hoursVal)) payload.hours_logged = parseFloat(hoursVal);
        if (checkInVal) {
            payload.check_in_time = new Date(checkInVal).toISOString();
        } else {
            payload.check_in_time = null;
        }
        if (checkOutVal) {
            payload.check_out_time = new Date(checkOutVal).toISOString();
        } else {
            payload.check_out_time = null;
        }
        if (remarksVal) payload.remarks = remarksVal;

        // Execute PATCH /api/admin/events/{id}/attendance/{regId}
        await ApiClient.request(`/admin/events/${eventId}/attendance/${regId}`, 'PATCH', payload);

        closePatchAttendanceModal();

        // Refresh the profile data and background table so updated hours & status display instantly
        if (userId) {
            await viewProfile(userId);
        }
        loadVolunteers();
    } catch (err) {
        alert(`Failed to update attendance record: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
        }
    }
};

// 7. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadVolunteers);