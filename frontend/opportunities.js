// ==========================================
// OPPORTUNITIES.JS (Seva Hub Logic)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    const upcomingGrid = document.getElementById('upcoming-grid');
    const pastGrid = document.getElementById('past-grid');

    // Fetch and render both sections
    async function loadHubData() {
        if (typeof _supabase === 'undefined') {
            const errorMsg = `<div class="empty-state">Database connection failed.</div>`;
            upcomingGrid.innerHTML = errorMsg;
            pastGrid.innerHTML = errorMsg;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Fetch Upcoming Events
            const { data: upcomingData, error: upError } = await _supabase
                .from('events')
                .select('*, registrations(id)')
                .eq('status', 'upcoming')
                .gte('event_date', today)
                .order('event_date', { ascending: true })
                .limit(6);

            if (upError) throw upError;
            renderUpcoming(upcomingData || []);

            // 2. Fetch Past Events
            const { data: pastData, error: pastError } = await _supabase
                .from('events')
                .select('*, registrations(id)')
                .eq('status', 'completed')
                .order('event_date', { ascending: false })
                .limit(8);

            if (pastError) throw pastError;
            renderPast(pastData || []);

        } catch (err) {
            console.error("Error loading hub data:", err);
        }
    }

    // Render Upcoming Cards (Vertical Grid)
    function renderUpcoming(events) {
        if (events.length === 0) {
            upcomingGrid.innerHTML = `<div class="empty-state">No upcoming events currently scheduled. Check back soon!</div>`;
            return;
        }

        upcomingGrid.innerHTML = events.map((ev, i) => {
            const dateObj = new Date(ev.event_date);
            const currentRegs = ev.registrations ? ev.registrations.length : 0;
            const maxVols = ev.max_volunteers || 1;
            const percentFilled = Math.min((currentRegs / maxVols) * 100, 100);
            const isFull = currentRegs >= maxVols;
            
            return `
                <div class="event-card reveal active" style="transition-delay: ${i * 0.1}s">
                    <div class="event-card-header">
                        <span class="category-badge">${ev.category || 'General'}</span>
                        <div class="date-box">
                            <div class="month">${dateObj.toLocaleString('default', { month: 'short' })}</div>
                            <div class="day">${dateObj.getDate()}</div>
                        </div>
                    </div>
                    <div class="event-card-body">
                        <h3>${ev.title}</h3>
                        <div class="event-detail"><i data-lucide="clock"></i> ${ev.start_time ? ev.start_time.substring(0, 5) : 'TBD'}</div>
                        <div class="event-detail"><i data-lucide="map-pin"></i> ${ev.location}</div>
                    </div>
                    <div class="event-card-footer">
                        <div class="capacity-info">
                            <span>Volunteers</span>
                            <span class="${isFull ? 'text-full' : ''}">${currentRegs} / ${ev.max_volunteers}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${isFull ? 'progress-full' : ''}" style="width: ${percentFilled}%"></div>
                        </div>
                        <a href="login.html" class="btn ${isFull ? 'btn-outline' : 'btn-primary'}" style="width: 100%; justify-content: center;">
                            ${isFull ? 'Join Waitlist' : 'Register Now'}
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    // Render Past Cards (Horizontal Scroll)
    function renderPast(events) {
        if (events.length === 0) {
            pastGrid.innerHTML = `<div class="empty-state" style="text-align: left;">Our event history will appear here.</div>`;
            return;
        }

        pastGrid.innerHTML = events.map((ev, i) => {
            const dateObj = new Date(ev.event_date);
            const currentRegs = ev.registrations ? ev.registrations.length : 0;

            return `
                <div class="past-card reveal active" style="transition-delay: ${i * 0.1}s">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">
                        ${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <h4>${ev.title}</h4>
                    <p>${ev.location}</p>
                    <div class="past-stats">
                        <div><i data-lucide="users"></i> ${currentRegs} Attended</div>
                        <div><i data-lucide="check-circle"></i> Completed</div>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    // Initialize
    loadHubData();
});