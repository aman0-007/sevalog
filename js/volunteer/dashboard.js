// ==========================================
// DASHBOARD.JS (Clean Custom API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. Initial Authentication Check
    // ==========================================
    // Ensure the user is logged in before rendering sensitive data
    const storedUserData = localStorage.getItem('samithi_user');
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;

    // If they aren't logged in at all, pretend the page doesn't exist
    if (!storedUserData || !token) {
        ApiClient.throwTo404(); 
        return;
    }

    // Initialize Data Loaders
    await loadDashboardStats();
    await loadUpcomingEvents();
    loadCommunityFeed(); // Mock data for now

    // ==========================================
    // 2. Load Dashboard Stats (Hours & Activities)
    // ==========================================
    async function loadDashboardStats() {
        try {
            // Fetch from your Node.js backend cache table
            const response = await ApiClient.request('/volunteer/dashboard', 'GET');
            const stats = response.data;

            // Update UI with real database numbers
            const totalHours = parseFloat(stats.total_hours_logged || 0);
            document.getElementById('stat-hours').innerText = totalHours;
            document.getElementById('stat-count').innerText = stats.total_activities_attended || 0;

            updateMilestoneRing(totalHours);
        } catch (error) {
            console.error("Failed to load dashboard stats:", error);
        }
    }

    // ==========================================
    // 3. Load Upcoming Events
    // ==========================================
    async function loadUpcomingEvents() {
        const container = document.getElementById('upcoming-events-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading events...</div>';

        try {
            // Fetch upcoming events from the custom API
            const response = await ApiClient.request('/volunteer/events', 'GET');
            const data = response.data;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="empty-msg">There are no upcoming events yet.</p>';
                return;
            }

            const eventCards = data.map(ev => {
                const evDate = new Date(ev.event_date);
                const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = String(evDate.getDate()).padStart(2, '0');
                const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';

                // Check the status returned from the backend
                let actionHtml = '';
                if (ev.user_status === 'registered' || ev.user_status === 'present') {
                    actionHtml = '<span class="registered-pill">Registered</span>';
                } else {
                    // Show register button if they haven't applied, or if they previously 'withdrawn'
                    actionHtml = `<button class="btn-register" data-event-id="${ev.event_id}">Register</button>`;
                }

                return `
                    <div class="event-ticket">
                        <div class="ticket-date">
                            <span class="month">${month}</span>
                            <span class="day">${day}</span>
                        </div>
                        <div class="ticket-details">
                            <h4>${ev.title}</h4>
                            <div class="t-row"><i data-lucide="clock"></i> ${time}</div>
                            <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location_name || 'Location TBD'}</div>
                            <div class="ticket-actions">
                                ${actionHtml}
                                <span style="font-size: 13px; font-weight: 700; color: var(--accent-primary);">Seva Activity</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = `<div class="ticket-grid">${eventCards.join('')}</div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();

            registerEventButtons();

        } catch (err) {
            console.error('Error loading upcoming events:', err);
            container.innerHTML = '<p class="empty-msg">Unable to load events.</p>';
        }
    }

    // ==========================================
    // 4. Handle Event Registration
    // ==========================================
    function registerEventButtons() {
        const buttons = document.querySelectorAll('.btn-register');
        buttons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;

                btn.disabled = true;
                btn.innerText = 'Registering...';

                const success = await registerForEvent(eventId);
                
                // Update UI based on API response
                if (success === true) {
                    btn.closest('.ticket-actions').innerHTML = '<span class="registered-pill">Registered</span>';
                } else if (success === 'ALREADY_REGISTERED') {
                    showRegistrationToast('You are already registered for this event.', false);
                    btn.closest('.ticket-actions').innerHTML = '<span class="registered-pill">Registered</span>';
                } else {
                    btn.disabled = false;
                    btn.innerText = 'Register';
                }
            });
        });
    }

    async function registerForEvent(eventId) {
        try {
            // Hit the Node.js apply endpoint
            await ApiClient.request('/volunteer/apply', 'POST', { eventId });
            showRegistrationToast('Successfully registered!', true);
            return true;
        } catch (err) {
            // The backend database trigger throws a specific error if already applied
            if (err.message && err.message.toLowerCase().includes('already applied')) {
                return 'ALREADY_REGISTERED';
            }
            
            showRegistrationToast(err.message || 'Registration failed. Try again.', false);
            return false;
        }
    }

    // ==========================================
    // 5. UI Helpers (Toast & Progress Ring)
    // ==========================================
    function showRegistrationToast(message, success = true) {
        let toast = document.querySelector('.notification-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'notification-toast';
            toast.innerHTML = `
                <div class="toast-icon"> 
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                </div>
                <div class="toast-message"></div>
            `;
            document.body.appendChild(toast);
        }

        toast.querySelector('.toast-message').innerText = message;
        toast.classList.add('show');

        window.clearTimeout(toast.dismissTimeout);
        toast.dismissTimeout = window.setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    function updateMilestoneRing(currentHours) {
        let nextMilestone = 20;
        let rank = "Rookie";

        if (currentHours >= 20) { nextMilestone = 50; rank = "Bronze Volunteer"; }
        if (currentHours >= 50) { nextMilestone = 100; rank = "Silver Volunteer"; }
        if (currentHours >= 100) { nextMilestone = 250; rank = "Gold Leader"; }

        document.getElementById('stat-rank').innerText = rank;
        
        let hoursLeft = nextMilestone - currentHours;
        if (hoursLeft < 0) hoursLeft = 0; 
        
        document.getElementById('hours-left').innerText = hoursLeft;

        const circle = document.getElementById('milestone-ring');
        if (!circle) return;

        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;

        const percentFill = currentHours / nextMilestone;
        const safePercent = Math.min(percentFill, 1); 
        const offset = circumference - (safePercent * circumference);

        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 300);
    }

    function loadCommunityFeed() {
        const feed = document.getElementById('community-feed');
        if (!feed) return;

        const activities = [
            { name: "Rahul D.", action: "completed 4h at Beach Cleanup", time: "2h ago" },
            { name: "Sneha K.", action: "earned the 'Green Warrior' badge", time: "5h ago" },
            { name: "Global Hub", action: "reached 50,000 community hours!", time: "1d ago" }
        ];

        feed.innerHTML = activities.map(act => `
            <div class="feed-item">
                <div class="feed-dot"></div>
                <div class="feed-content">
                    <strong>${act.name}</strong> ${act.action}
                    <div class="feed-time">${act.time}</div>
                </div>
            </div>
        `).join('');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});