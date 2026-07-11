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
            // Fetch Global Stats from your Node.js backend
            const response = await ApiClient.request('/admin/summary-stats', 'GET');
            const stats = response.data;

            // Update UI (Safely checking if the elements exist)
            const volEl = document.getElementById('stat-volunteers') || document.getElementById('total-volunteers');
            const eventEl = document.getElementById('stat-events') || document.getElementById('total-events');
            
            // Your old HTML used 'stat-participants', your new HTML uses 'total-hours'. 
            // We support both here just in case!
            const hoursEl = document.getElementById('total-hours'); 
            const participantEl = document.getElementById('stat-participants');

            if (volEl) volEl.innerText = stats.total_active_volunteers || 0;
            if (eventEl) eventEl.innerText = stats.total_events_conducted || 0;
            
            // Prioritize showing Total Hours if the element exists
            if (hoursEl) hoursEl.innerText = stats.total_cumulative_seva_hours || 0;
            if (participantEl) participantEl.innerText = stats.total_cumulative_seva_hours || 0;

            // ==========================================
            // 3. Handle Recent Registrations List
            // ==========================================
            const listContainer = document.getElementById('recent-reg-list');
            
            if (listContainer) {
                // Note: We haven't built the backend API route for this specific list yet.
                // For now, we display a clean placeholder. 
                listContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                        <i data-lucide="clock" style="margin-bottom: 10px; opacity: 0.5;"></i>
                        <p style="font-size: 14px;">Recent volunteer activity will appear here.</p>
                    </div>
                `;
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error("Error fetching admin data:", error);
            
            // Optional fallback UI if the server is unreachable
            const listContainer = document.getElementById('recent-reg-list');
            if (listContainer) {
                listContainer.innerHTML = "<p class='error-text'>Failed to load data.</p>";
            }
        }
    }

    // Run the initialization
    initDashboard();
});