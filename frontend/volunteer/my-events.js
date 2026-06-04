// ==========================================
// MY-EVENTS.JS (Tab Logic, DB Fetching & Rendering)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    let currentUserId = null;

    // 1. Setup Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add to clicked
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // 2. Check Authentication
    async function checkUser() {
        const { data: { user } } = await _supabase.auth.getUser();
        
        if (!user) {
            // No user found, redirect to login
            window.location.href = '../login.html'; 
            return;
        }

        currentUserId = user.id;
        loadUserEvents();
    }

    // 3. Fetch Registered Events from Database
    async function loadUserEvents() {
        const upcomingGrid = document.getElementById('upcoming-grid');
        const pastGrid = document.getElementById('past-grid');

        upcomingGrid.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading schedule...</div>';
        pastGrid.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading past events...</div>';

        try {
            // Fetch the user's registrations and perform a join with the events table
            const { data: registrations, error } = await _supabase
                .from('registrations')
                .select(`
                    event_id,
                    events (*)
                `)
                .eq('user_id', currentUserId);

            if (error) throw error;

            const today = new Date().toISOString().split('T')[0];
            const upcomingEvents = [];
            const pastEvents = [];

            if (registrations) {
                registrations.forEach(reg => {
                    if (reg.events) {
                        // Categorize based on date
                        if (reg.events.event_date >= today) {
                            upcomingEvents.push(reg.events);
                        } else {
                            pastEvents.push(reg.events);
                        }
                    }
                });
            }

            // Sort upcoming events by closest date first
            upcomingEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            
            // Sort past events by most recent first
            pastEvents.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

            renderUpcomingEvents(upcomingEvents, upcomingGrid);
            renderPastEvents(pastEvents, pastGrid);

            lucide.createIcons();
            bindCancelButtons();

        } catch (err) {
            console.error('Error loading events:', err);
            upcomingGrid.innerHTML = '<p class="empty-msg">Unable to load your schedule at this time.</p>';
            pastGrid.innerHTML = '<p class="empty-msg">Unable to load past events.</p>';
        }
    }

    // 4. Render Upcoming Tickets
    function renderUpcomingEvents(events, container) {
        if (events.length === 0) {
            container.innerHTML = '<p class="empty-msg">You have no upcoming events.</p>';
            return;
        }

        container.innerHTML = events.map(ev => {
            const evDate = new Date(ev.event_date);
            const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(evDate.getDate()).padStart(2, '0');
            const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';

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
                            <button class="btn-cancel" data-event-id="${ev.id}" style="border: none; cursor: pointer;">Cancel Registration</button>
                            <span style="font-size: 13px; font-weight: 700; color: var(--accent-primary);">Registered <i data-lucide="check-circle" style="width: 14px; vertical-align: middle;"></i></span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 5. Render Past Tickets
    function renderPastEvents(events, container) {
        if (events.length === 0) {
            container.innerHTML = '<p class="empty-msg">You have no past events.</p>';
            return;
        }

        container.innerHTML = events.map(ev => {
            const evDate = new Date(ev.event_date);
            const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(evDate.getDate()).padStart(2, '0');
            const hours = ev.hours || 0; // Defaulting to 0 if your DB doesn't have an hours column yet

            return `
                <div class="event-ticket">
                    <div class="ticket-date" style="background: #F1F5F9; color: #94A3B8;">
                        <span class="month" style="color: #64748B;">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="ticket-details">
                        <h4>${ev.title}</h4>
                        <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location || 'Location TBD'}</div>
                        <div class="ticket-actions">
                            <span class="verified-badge"><i data-lucide="award" style="width: 14px;"></i> ${hours} Hours Verified</span>
                            <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Completed</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 6. Handle Cancellation Logic
    function bindCancelButtons() {
        const cancelButtons = document.querySelectorAll('.btn-cancel');
        cancelButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;

                btn.disabled = true;
                btn.innerText = 'Canceling...';

                try {
                    // Delete and explicitly select the deleted rows to verify success
                    const { data, error } = await _supabase
                        .from('registrations')
                        .delete()
                        .eq('event_id', eventId)
                        .eq('user_id', currentUserId)
                        .select(); // <-- This is the magic key

                    if (error) throw error;

                    // If RLS blocked the deletion, 'data' will be an empty array
                    if (!data || data.length === 0) {
                        throw new Error("Deletion blocked by database. Check RLS policies.");
                    }

                    showToast('Registration canceled successfully.', true);
                    
                    // Reload the schedule to immediately remove the deleted event from the UI
                    loadUserEvents(); 

                } catch (err) {
                    console.error('Cancellation error:', err.message);
                    showToast('Failed to cancel. Check database permissions.', false);
                    btn.disabled = false;
                    btn.innerText = 'Cancel Registration';
                }
            });
        });
    }

    // 7. Dynamic Toast Messaging System
    function showToast(message, success = true) {
        let toast = document.querySelector('.notification-toast');
        
        // Create the toast container dynamically if it doesn't exist
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'notification-toast';
            toast.innerHTML = `
                <div class="toast-icon"></div>
                <div class="toast-message"></div>
            `;
            document.body.appendChild(toast);
        }

        const iconContainer = toast.querySelector('.toast-icon');
        
        if (success) {
            iconContainer.style.background = '#10B981'; 
            iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
        } else {
            iconContainer.style.background = '#EF4444'; 
            iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }

        toast.querySelector('.toast-message').innerText = message;
        toast.classList.add('show');

        // Reset the timer if a user triggers multiple toasts in a row
        window.clearTimeout(toast.dismissTimeout);
        toast.dismissTimeout = window.setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    // Initialize
    checkUser();
});