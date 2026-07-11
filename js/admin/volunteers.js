// ==========================================
// VOLUNTEERS.JS (Admin Volunteer Directory)
// ==========================================

let volunteersData = [];

// 1. Fetch Lightweight Profiles from Database
async function loadVolunteers() {
    const tbody = document.getElementById('volunteers-table-body');
    
    try {
        const response = await ApiClient.request('/admin/volunteers', 'GET');
        volunteersData = response.data;
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
        const joinedDate = new Date(vol.created_at).toLocaleDateString();

        return `
        <tr onclick="viewProfile('${vol.user_id}')">
            <td>
                <div class="volunteer-name-cell">
                    <div class="mini-avatar">${initial}</div>
                    <span style="font-weight: 600;">${fullName || 'Anonymous'}</span>
                </div>
            </td>
            <td>
                <div style="font-size: 13px;">${vol.email}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${vol.phone_number || 'No phone added'}</div>
            </td>
            <td><span class="role-badge ${vol.role === 'admin' ? 'role-admin' : 'role-volunteer'}">${vol.role.toUpperCase()}</span></td>
            
            <td>
                <div style="font-size: 13px;">${vol.city || 'Mumbai'}</div>
                <div style="font-size: 12px; color: var(--text-muted);">Joined ${joinedDate}</div>
            </td>

            <td style="font-weight: 600; color: var(--accent);">${vol.total_hours_served || 0} hrs</td>
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
        document.getElementById('modal-status').innerText = user.is_active ? 'Active' : 'Inactive';
        document.getElementById('modal-status').style.color = user.is_active ? '#10B981' : '#EF4444';

        // Card 1: Contact & Demographics
        document.getElementById('modal-email').innerText = user.email;
        document.getElementById('modal-phone').innerText = user.phone_number || '--';
        
        const dob = user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : '--';
        document.getElementById('modal-demographics').innerText = `${dob} / ${user.gender || '--'}`;
        document.getElementById('modal-blood').innerText = user.blood_group || 'Unknown';

        // Card 2: Background
        document.getElementById('modal-edu').innerText = user.education_level || '--';
        document.getElementById('modal-profession').innerText = user.profession_or_college || '--';
        
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

        // Reveal content
        document.getElementById('modal-body-content').style.display = 'block';

    } catch (error) {
        document.getElementById('modal-name').innerText = "Error Loading Profile";
        document.getElementById('modal-role-city').innerText = error.message;
    }
}

window.closeModal = function() { 
    document.getElementById('profileModal').classList.remove('active'); 
}

// 5. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadVolunteers);