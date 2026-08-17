// ==========================================
// ADMIN DASHBOARD.JS (Clean Custom API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. Strict Security & Role Check
    // ==========================================
    const storedUserData = localStorage.getItem('samithi_user');
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;

    if (!storedUserData || !token) {
        if (typeof ApiClient !== 'undefined') ApiClient.throwTo404();
        return;
    }

    const user = JSON.parse(storedUserData);
    if (user.role !== 'admin') {
        if (typeof ApiClient !== 'undefined') ApiClient.throwTo404();
        return;
    }

    // ==========================================
    // 2. Initialize Dashboard Data
    // ==========================================
    async function initDashboard() {
        try {
            // FIX 1: Matched the backend endpoint
            const response = await ApiClient.request('/admin/dashboard-stats', 'GET');
            const data = response.data; // Contains: overview, topVolunteers, upcomingEvents, recentActivity

            // FIX 2: Safely access the nested 'overview' object
            const overview = data.overview || {};

            // Update UI (Safely checking if the elements exist)
            const volEl = document.getElementById('stat-volunteers');
            const eventEl = document.getElementById('stat-events');
            const participantEl = document.getElementById('stat-participants');

            if (volEl) volEl.innerText = overview.total_active_volunteers || 0;
            if (eventEl) eventEl.innerText = overview.upcoming_published_events || 0;
            
            // We use total_seva_hours for the third box to show the NGO's impact
            if (participantEl) participantEl.innerText = overview.total_seva_hours || 0;

            // ==========================================
            // 3. Handle Recent Activity List (Real Data)
            // ==========================================
            const listContainer = document.getElementById('recent-reg-list');
            
            if (listContainer) {
                const activities = data.recentActivity || [];
                
                if (activities.length === 0) {
                    listContainer.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                            <i data-lucide="clock" style="margin-bottom: 10px; opacity: 0.5;"></i>
                            <p style="font-size: 14px;">Recent activity will appear here.</p>
                        </div>
                    `;
                } else {
                    // Generate UI for each timeline action
                    listContainer.innerHTML = activities.map(act => {
                        const dateStr = new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const actor = act.actor_first_name ? `${act.actor_first_name} ${act.actor_last_name}` : 'System Auto';
                        const initial = actor.charAt(0);
                        
                        return `
                        <div class="activity-item">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-color); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: #3B82F6; flex-shrink: 0;">
                                ${initial}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <p style="font-size: 14px; font-weight: 600; color: var(--text-main); margin: 0;">${act.action}</p>
                                <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
                                    ${actor} &bull; ${dateStr}
                                </p>
                            </div>
                        </div>
                        `;
                    }).join('');
                }
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error("Error fetching admin data:", error);
            const listContainer = document.getElementById('recent-reg-list');
            if (listContainer) {
                listContainer.innerHTML = "<p style='color: #EF4444; padding: 16px;'>Failed to load dashboard data.</p>";
            }
        }
    }

    // Run the initialization
    initDashboard();
});