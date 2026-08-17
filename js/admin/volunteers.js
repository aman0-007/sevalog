// ==========================================
// VOLUNTEERS.JS (Admin Volunteer Directory)
// ==========================================

let volunteersData = [];

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
    
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px;">No volunteers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataToRender.map(vol => {
        const fullName = `${vol.first_name} ${vol.last_name}`.trim();
        const initial = vol.first_name ? vol.first_name.charAt(0).toUpperCase() : 'V';
        const joinedDate = new Date(vol.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        return `
        <tr onclick="viewProfile('${vol.user_id}')">
            <td>
                <div class="volunteer-name-cell">
                    <div class="mini-avatar" style="${!vol.is_active ? 'filter: grayscale(1); opacity: 0.5;' : ''}">${initial}</div>
                    <span style="font-weight: 600; ${!vol.is_active ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${fullName || 'Anonymous'}</span>
                </div>
            </td>
            <td>
                <div style="font-size: 13px;">${vol.email}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${vol.phone_number || '--'}</div>
            </td>
            <td><span class="role-badge ${vol.role === 'admin' ? 'role-admin' : 'role-volunteer'}">${vol.role}</span></td>
            
            <td>
                <div style="font-size: 13px;">${vol.city || 'Mumbai'}</div>
                <div style="font-size: 12px; color: var(--text-muted);">Joined ${joinedDate}</div>
            </td>

            <td style="font-weight: 600; color: ${vol.is_active ? 'var(--accent)' : 'var(--text-muted)'};">${vol.total_hours_served || 0} hrs</td>
        </tr>
    `}).join('');
}

// 3. Search Bar Logic
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = volunteersData.filter(vol => {
            const fullName = `${vol.first_name} ${vol.last_name}`.toLowerCase();
            return fullName.includes(searchTerm) || (vol.email && vol.email.toLowerCase().includes(searchTerm));
        });
        renderTable(filteredData);
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

        // Header
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        document.getElementById('modal-avatar').innerText = user.first_name ? user.first_name.charAt(0).toUpperCase() : 'V';
        document.getElementById('modal-name').innerText = fullName || 'Anonymous User';
        document.getElementById('modal-role-city').innerText = `${user.role.toUpperCase()} • ${user.city || 'Mumbai'}`;

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
                <h4 style="margin-bottom:12px; font-size: 13px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; border-bottom: 1px solid var(--border); padding-bottom: 8px;">Recent Event History</h4>
                <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse; text-align: left;">
                        <thead style="position: sticky; top: 0; background: var(--bg-color); border-bottom: 1px solid var(--border);">
                            <tr>
                                <th style="padding: 10px; font-weight: 600;">Event</th>
                                <th style="padding: 10px; font-weight: 600;">Date</th>
                                <th style="padding: 10px; font-weight: 600;">Status</th>
                                <th style="padding: 10px; font-weight: 600;">Hours</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            historyHtml += user.attendance_history.map(record => {
                const dateStr = new Date(record.event_date).toLocaleDateString('en-IN');
                const statusColor = record.status === 'present' ? '#10B981' : (['withdrawn', 'absent'].includes(record.status) ? '#EF4444' : 'var(--text-muted)');
                return `<tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px;">${record.title}</td>
                    <td style="padding: 10px;">${dateStr}</td>
                    <td style="padding: 10px; color: ${statusColor}; font-weight: 600;">${record.status.toUpperCase()}</td>
                    <td style="padding: 10px;">${parseFloat(record.hours_logged || 0).toFixed(1)}</td>
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

// 6. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadVolunteers);