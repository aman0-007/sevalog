// ==========================================
// VOLUNTEERS.JS (Logic for Directory)
// Relies on main.js for _supabase and layout
// ==========================================

// Global state for fast searching without re-fetching
let volunteersData = [];

// 1. Fetch Profiles and Stats from Database
async function loadVolunteers() {
    const tbody = document.getElementById('volunteers-table-body');
    
    // A. Fetch the standard profile data
    const { data: profiles, error: profileError } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (profileError) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${profileError.message}</td></tr>`;
        return;
    }

    // B. Fetch the dynamic calculations from your new View
    const { data: stats, error: statsError } = await _supabase
        .from('volunteer_stats')
        .select('*');

    if (statsError) {
        console.error("Stats Error:", statsError.message);
    }

    // C. Merge the View data into the Profiles data
    volunteersData = profiles.map(profile => {
        const userStats = (stats || []).find(s => s.id === profile.id);
        
        return {
            ...profile,
            // Replace the static database columns with the dynamic view calculations
            total_hours_served: userStats ? (userStats.total_hours || 0) : 0,
            total_activities_count: userStats ? (userStats.total_events || 0) : 0
        };
    });

    // D. Render the combined data
    renderTable(volunteersData);
}

// 2. Render Table Function
function renderTable(dataToRender) {
    const tbody = document.getElementById('volunteers-table-body');
    
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px;">No volunteers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataToRender.map(vol => `
        <tr>
            <td>
                <div class="volunteer-name-cell">
                    <div class="mini-avatar">${vol.full_name ? vol.full_name.charAt(0).toUpperCase() : 'V'}</div>
                    <span style="font-weight: 600;">${vol.full_name || 'Anonymous'}</span>
                </div>
            </td>
            <td>
                <div style="font-size: 13px;">${vol.email}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${vol.phone || 'No phone added'}</div>
            </td>
            <td><span class="role-badge ${vol.role === 'admin' ? 'role-admin' : 'role-volunteer'}">${vol.role}</span></td>
            
            <td style="font-weight: 600;">${vol.total_hours_served} hrs</td>
            
            <td><button class="btn-text" onclick="viewProfile('${vol.id}')">View Profile</button></td>
        </tr>
    `).join('');
}

// 3. Search Bar Logic
document.getElementById('search-input').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredData = volunteersData.filter(vol => 
        (vol.full_name && vol.full_name.toLowerCase().includes(searchTerm)) || 
        (vol.email && vol.email.toLowerCase().includes(searchTerm))
    );
    renderTable(filteredData);
});

// 4. Profile Modal Logic
function viewProfile(userId) {
    const user = volunteersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modal-avatar').innerText = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'V';
    document.getElementById('modal-name').innerText = user.full_name || 'Anonymous User';
    document.getElementById('modal-role').innerText = user.role.toUpperCase();
    document.getElementById('modal-email').innerText = user.email;
    document.getElementById('modal-phone').innerText = user.phone || '--';
    document.getElementById('modal-edu').innerText = user.education || '--';
    document.getElementById('modal-bio').innerText = user.bio || 'No bio provided.';
    
    // These now display the dynamic calculations!
    document.getElementById('modal-hours').innerText = user.total_hours_served;
    document.getElementById('modal-events').innerText = user.total_activities_count;

    const skillsContainer = document.getElementById('modal-skills');
    skillsContainer.innerHTML = (user.skills && user.skills.length > 0) 
        ? user.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('') 
        : `<span style="font-size: 13px; color: var(--text-muted);">No skills listed.</span>`;

    document.getElementById('profileModal').classList.add('active');
}

function closeModal() { document.getElementById('profileModal').classList.remove('active'); }

// 5. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadVolunteers);