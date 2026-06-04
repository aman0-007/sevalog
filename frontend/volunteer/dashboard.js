// ==========================================
// DASHBOARD.JS (Auth & Data Population)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    let currentUserId = null;

    // 1. Check Authentication
    async function checkUser() {
        const { data: { user } } = await _supabase.auth.getUser();
        
        if (!user) {
            // No user found, redirect to login
            window.location.href = '../login.html';
            return;
        }

        currentUserId = user.id;
        loadUserProfile(user.id);
    }

    // 2. Load Public Profile Data
    async function loadUserProfile(userId) {
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error loading profile:", error);
            return;
        }

        // Update UI with real data
        document.getElementById('welcome-text').innerText = `Welcome back, ${profile.full_name.split(' ')[0]}!`;
        document.getElementById('user-name-top').innerText = profile.full_name;
        document.getElementById('user-initial').innerText = profile.full_name.charAt(0);
        
        document.getElementById('stat-hours').innerText = profile.total_hours_served || 0;
        document.getElementById('stat-count').innerText = profile.total_activities_count || 0;

        updateMilestoneRing(profile.total_hours_served || 0);

        // Load specific dashboard widgets
        loadCommunityFeed();
        // Load upcoming events for the dashboard
        loadUpcomingEvents(userId);
    }

    // 4. Load Upcoming Events (reuses card markup from my-events)
    async function loadUpcomingEvents(userId) {
        const container = document.getElementById('upcoming-events-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading events...</div>';

        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await _supabase
                .from('events')
                .select('*')
                .eq('status', 'upcoming')
                .gte('event_date', today)
                .order('event_date', { ascending: true })
                .limit(8);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="empty-msg">There are no upcoming events yet.</p>';
                return;
            }

            let registeredIds = new Set();
            if (userId) {
                const eventIds = data.map(ev => ev.id);
                const { data: registrations } = await _supabase
                    .from('registrations')
                    .select('event_id')
                    .eq('user_id', userId)
                    .in('event_id', eventIds);

                if (registrations) {
                    registeredIds = new Set(registrations.map(r => r.event_id));
                }
            }

            const eventCards = data.map(ev => {
                const evDate = new Date(ev.event_date);
                const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = String(evDate.getDate()).padStart(2, '0');
                const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';
                const isRegistered = registeredIds.has(ev.id);

                return `
                    <div class="event-ticket">
                        <div class="ticket-date">
                            <span class="month">${month}</span>
                            <span class="day">${day}</span>
                        </div>
                        <div class="ticket-details">
                            <h4>${ev.title}</h4>
                            <div class="t-row"><i data-lucide="clock"></i> ${time}</div>
                            <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location || 'Location TBD'}</div>
                            <div class="ticket-actions">
                                ${isRegistered ? '<span class="registered-pill">Registered</span>' : `<button class="btn-register" data-event-id="${ev.id}">Register</button>`}
                                <span style="font-size: 13px; font-weight: 700; color: var(--accent-primary);">${ev.category || 'General'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = `<div class="ticket-grid">${eventCards.join('')}</div>`;
            lucide.createIcons();

            registerEventButtons();

        } catch (err) {
            console.error('Error loading upcoming events:', err);
            container.innerHTML = '<p class="empty-msg">Unable to load events.</p>';
        }
    }

    function registerEventButtons() {
        const buttons = document.querySelectorAll('.btn-register');
        buttons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;

                btn.disabled = true;
                btn.innerText = 'Registering...';

                const success = await registerForEvent(eventId, btn);
                if (success) {
                    btn.closest('.ticket-actions').innerHTML = '<span class="registered-pill">Registered</span>';
                } else {
                    btn.disabled = false;
                    btn.innerText = 'Register';
                }
            });
        });
    }

    async function registerForEvent(eventId, button) {
        if (!currentUserId) {
            showRegistrationToast('Sign in first to register.', false);
            return false;
        }

        try {
            const { error } = await _supabase
                .from('registrations')
                .insert([{ event_id: eventId, user_id: currentUserId }]);

            if (error) {
                if (error.message && error.message.toLowerCase().includes('duplicate')) {
                    showRegistrationToast('You are already registered for this event.', false);
                } else {
                    showRegistrationToast('Registration failed. Try again.', false);
                }
                console.error('Registration error:', error);
                return false;
            }

            showRegistrationToast('Successfully registered!', true);
            return true;
        } catch (err) {
            showRegistrationToast('Registration failed. Try again.', false);
            console.error('Registration error:', err);
            return false;
        }
    }

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

    // 3. Mock Community Feed (We will make this real later)
    function loadCommunityFeed() {
        const feed = document.getElementById('community-feed');
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

    // --- 4. Milestone Progress Ring Animation ---
    function updateMilestoneRing(currentHours) {
        // Define milestone levels
        let nextMilestone = 20;
        let rank = "Rookie";

        if (currentHours >= 20) { nextMilestone = 50; rank = "Bronze Volunteer"; }
        if (currentHours >= 50) { nextMilestone = 100; rank = "Silver Volunteer"; }
        if (currentHours >= 100) { nextMilestone = 250; rank = "Gold Leader"; }

        document.getElementById('stat-rank').innerText = rank;
        
        let hoursLeft = nextMilestone - currentHours;
        // Prevent negative numbers if they max out
        if (hoursLeft < 0) hoursLeft = 0; 
        
        document.getElementById('hours-left').innerText = hoursLeft;

        // SVG Circle Math
        const circle = document.getElementById('milestone-ring');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI; // Calculate C = 2 * pi * r
        
        // Setup initial SVG properties
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference; // Start empty

        // Calculate how much to fill
        const percentFill = currentHours / nextMilestone;
        // Safety cap at 100%
        const safePercent = Math.min(percentFill, 1); 
        const offset = circumference - (safePercent * circumference);

        // Trigger the animation after a tiny delay for visual effect
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 300);
    }

    // Initialize
    checkUser();
    lucide.createIcons();
});