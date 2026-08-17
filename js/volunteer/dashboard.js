// ==========================================
// DASHBOARD.JS (Clean Custom API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    let globalEventsData = [];
    
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
            const response = await ApiClient.request('/volunteer/dashboard', 'GET');
            
            // Your API groups this inside "impact"
            const stats = response.data.impact; 

            const totalHours = parseFloat(stats.total_hours_logged || 0);
            document.getElementById('stat-hours').innerText = totalHours;
            document.getElementById('stat-count').innerText = stats.total_activities_attended || 0;
            
            // Use the real rank from the DB!
            document.getElementById('stat-rank').innerText = stats.current_rank || 'Rookie';

            // If next_rank_hours is null, they hit the max rank
            const nextTarget = stats.next_rank_hours ? parseFloat(stats.next_rank_hours) : totalHours;
            updateMilestoneRing(totalHours, nextTarget);
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
            const response = await ApiClient.request('/volunteer/events', 'GET');
            const data = response.data || [];
            globalEventsData = data;

            const upcomingEvents = data.filter(ev => ev.dynamic_status === 'upcoming' || ev.dynamic_status === 'ongoing');

            if (upcomingEvents.length === 0) {
                container.innerHTML = '<p class="empty-msg">There are no upcoming events yet.</p>';
                return;
            }

            const eventCards = upcomingEvents.map(ev => {
                const evDate = new Date(ev.event_date);
                const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = String(evDate.getDate()).padStart(2, '0');
                const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';

                let actionHtml = '';
                const userStatus = ev.user_registration_status;
                if (['registered', 'present', 'waitlisted'].includes(userStatus)) {
                    const statusText = userStatus.charAt(0).toUpperCase() + userStatus.slice(1);
                    actionHtml = `<span class="registered-pill">${statusText}</span>`;
                } else if (ev.registration_open === false) {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Closed</span>`;
                } else {
                    actionHtml = `<button class="btn-register" data-event-id="${ev.event_id}">Register</button>`;
                }

                return `
                    <div class="event-ticket" onclick="openEventDetails('${ev.event_id}')">
                        <div class="ticket-date">
                            <span class="month">${month}</span>
                            <span class="day">${day}</span>
                        </div>
                        <div class="ticket-details">
                            <h4>${ev.title}</h4>
                            <div class="t-row"><i data-lucide="clock"></i> ${time}</div>
                            <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location_name || 'Location TBD'}</div>
                            <div class="ticket-actions" onclick="event.stopPropagation()">
                                ${actionHtml}
                                <span style="font-size: 13px; font-weight: 700; color: var(--accent-primary);">${ev.category || 'Seva Activity'}</span>
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
                event.stopPropagation();
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;

                btn.disabled = true;
                btn.innerText = 'Registering...';

                const success = await registerForEvent(eventId);
                
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
            await ApiClient.request(`/volunteer/events/${eventId}/register`, 'POST');
            showRegistrationToast('Successfully registered!', true);
            return true;
        } catch (err) {
            if (err.message && err.message.toLowerCase().includes('already registered')) {
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

    function updateMilestoneRing(currentHours, nextMilestone) {
        let hoursLeft = nextMilestone - currentHours;
        if (hoursLeft < 0) hoursLeft = 0; 
        
        // Show "MAX" if they reached the highest tier
        document.getElementById('hours-left').innerText = (hoursLeft === 0 && nextMilestone === currentHours) ? 'MAX' : hoursLeft;

        const circle = document.getElementById('milestone-ring');
        if (!circle) return;

        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;

        // Prevent division by zero
        const percentFill = nextMilestone > 0 ? (currentHours / nextMilestone) : 1;
        const safePercent = Math.min(percentFill, 1); 
        const offset = circumference - (safePercent * circumference);

        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 300);
    }

    window.openEventDetails = function(eventId) {
        const ev = globalEventsData.find(e => e.event_id === eventId);
        if (!ev) return;

        document.getElementById('detail-title').innerText = ev.title;
        document.getElementById('detail-category').innerText = ev.category || 'Seva Activity';

        const badge = document.getElementById('detail-status-badge');
        if (ev.user_registration_status === 'registered' || ev.user_registration_status === 'present') {
            badge.style.display = 'inline-flex';
            badge.innerHTML = ev.user_registration_status === 'present'
                ? '<i data-lucide="award" style="width: 14px;"></i> Verified Attendance'
                : '<i data-lucide="check-circle" style="width: 14px;"></i> Registered';
        } else {
            badge.style.display = 'none';
        }

        const evDate = new Date(ev.event_date).toLocaleDateString();
        const time = ev.start_time ? `${ev.start_time.substring(0,5)} - ${ev.end_time.substring(0,5)}` : 'TBA';
        document.getElementById('detail-datetime').innerText = `${evDate}\n${time}`;

        const contactName = ev.contact_person_name || 'Not provided';
        const contactPhone = ev.contact_person_phone ? `\n${ev.contact_person_phone}` : '';
        document.getElementById('detail-contact').innerText = `${contactName}${contactPhone}`;

        document.getElementById('detail-location-name').innerText = ev.location_name || 'Location TBD';

        const addrElement = document.getElementById('detail-address');
        if (ev.location_address && ev.location_address !== ev.location_name) {
            addrElement.innerText = ev.location_address;
            addrElement.style.display = 'block';
        } else {
            addrElement.style.display = 'none';
        }

        const mapLink = document.getElementById('detail-map-link');
        const mapEmbed = document.getElementById('detail-map-embed');
        const mapIframe = document.getElementById('detail-map-iframe');

        if (ev.google_maps_link) {
            mapLink.href = ev.google_maps_link;
            mapLink.style.display = 'inline-flex';
            mapIframe.src = ev.google_maps_link;
            mapEmbed.style.display = 'block';
        } else {
            mapLink.style.display = 'none';
            mapEmbed.style.display = 'none';
        }

        document.getElementById('detail-desc').innerText = ev.description || 'No description provided.';
        document.getElementById('eventDetailsModal').classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.closeDetailsModal = function() {
        document.getElementById('eventDetailsModal').classList.remove('active');
    };

    async function loadCommunityFeed() {
        const feedContainer = document.getElementById('community-feed');
        if (!feedContainer) return;

        try {
            const response = await ApiClient.request('/volunteer/feed?limit=5', 'GET');
            const activities = response.data || [];
            
            if (activities.length === 0) {
                feedContainer.innerHTML = '<p class="empty-msg">No recent community activity.</p>';
                return;
            }

            feedContainer.innerHTML = activities.map((act, index) => {
                // Parse date for UI
                const date = new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                return `
                    <div class="feed-item">
                        <div class="feed-dot" ${index === 0 ? 'style="animation: livePulse 2s infinite; background: #10B981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);"' : ''}></div>
                        <div class="feed-content">
                            <strong>${act.first_name} ${act.last_name_initial}.</strong> ${act.action}
                            ${act.event_title ? `<br><span style="color: var(--accent-primary); font-size: 13px;">${act.event_title}</span>` : ''}
                            <div class="feed-time">${date}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Error loading community feed:', err);
            feedContainer.innerHTML = '<p class="empty-msg">Unable to load feed right now.</p>';
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});