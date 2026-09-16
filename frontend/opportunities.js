// ==========================================
// OPPORTUNITIES.JS (Seva Hub Logic using ApiClient)
// Uses /api/public/events and /api/public/events/{id}
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const upcomingGrid = document.getElementById('upcoming-grid');
    const pastGrid = document.getElementById('past-grid');
    const modal = document.getElementById('publicEventModal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Close modal handlers
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeEventModal);
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEventModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
            closeEventModal();
        }
    });

    function closeEventModal() {
        if (modal) modal.style.display = 'none';
    }

    // Fetch and render Seva Hub Events
    async function loadHubData() {
        try {
            const response = await ApiClient.request('/public/events', 'GET');
            const events = (response && response.data) ? response.data : [];

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Separate upcoming and past events
            const upcomingEvents = [];
            const pastEvents = [];

            events.forEach(ev => {
                const evDate = ev.event_date ? ev.event_date.split('T')[0] : '';
                if (ev.status === 'completed' || (evDate && evDate < todayStr)) {
                    pastEvents.push(ev);
                } else {
                    upcomingEvents.push(ev);
                }
            });

            renderUpcoming(upcomingEvents);
            renderPast(pastEvents);

        } catch (err) {
            console.error("Error loading public events:", err);
            if (upcomingGrid) {
                upcomingGrid.innerHTML = `<div class="empty-state">Unable to load events at this moment. Please try again later.</div>`;
            }
            if (pastGrid) {
                pastGrid.innerHTML = `<div class="empty-state" style="text-align: left;">Event history unavailable.</div>`;
            }
        }
    }

    // Render Upcoming Events Grid
    function renderUpcoming(events) {
        if (!upcomingGrid) return;

        if (!events || events.length === 0) {
            upcomingGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: white; border-radius: 16px; border: 1px solid var(--border-light);">
                    <div style="width: 56px; height: 56px; background: var(--bg-surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--accent-primary);">
                        <i data-lucide="calendar" style="width: 28px; height: 28px;"></i>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">No Upcoming Events Scheduled</h3>
                    <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto; font-size: 14px;">We are currently planning our next community seva drives. Please check back soon or join our community to receive updates!</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        upcomingGrid.innerHTML = events.map((ev, i) => {
            const evId = ev.id || ev.event_id;
            const dateObj = new Date(ev.event_date);
            const monthStr = isNaN(dateObj.getTime()) ? 'Upcoming' : dateObj.toLocaleString('default', { month: 'short' });
            const dayStr = isNaN(dateObj.getTime()) ? '--' : dateObj.getDate();
            const timeStr = ev.start_time ? ev.start_time.substring(0, 5) : 'TBD';
            const locationStr = ev.location_name || ev.location_address || 'Community Center';
            const volunteersNeeded = ev.volunteers_needed || 'Open';

            return `
                <div class="event-card reveal active" data-event-id="${evId}" style="transition-delay: ${i * 0.05}s">
                    <div class="event-card-header">
                        <span class="category-badge">${escapeHTML(ev.category || 'General')}</span>
                        <div class="date-box">
                            <div class="month">${monthStr}</div>
                            <div class="day">${dayStr}</div>
                        </div>
                    </div>
                    <div class="event-card-body">
                        <h3>${escapeHTML(ev.title)}</h3>
                        <div class="event-detail"><i data-lucide="clock"></i> ${timeStr}${ev.end_time ? ' - ' + ev.end_time.substring(0, 5) : ''}</div>
                        <div class="event-detail"><i data-lucide="map-pin"></i> ${escapeHTML(locationStr)}</div>
                    </div>
                    <div class="event-card-footer">
                        <div class="capacity-info">
                            <span>Volunteers Needed</span>
                            <span style="font-weight: 700; color: var(--accent-primary);">${volunteersNeeded}</span>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            <button type="button" class="btn btn-outline btn-view-details" data-event-id="${evId}" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;">
                                View Details
                            </button>
                            <a href="login.html?redirect=volunteer/my-events.html" class="btn btn-primary" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;">
                                Register
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();

        // Attach Click Listener to cards and View Details buttons
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = btn.getAttribute('data-event-id');
                if (eventId) openPublicEventDetails(eventId);
            });
        });

        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', () => {
                const eventId = card.getAttribute('data-event-id');
                if (eventId) openPublicEventDetails(eventId);
            });
        });
    }

    // Render Past Events (Horizontal Scroll / Grid)
    function renderPast(events) {
        if (!pastGrid) return;

        if (!events || events.length === 0) {
            pastGrid.innerHTML = `<div class="empty-state" style="text-align: left; color: var(--text-muted); font-size: 14px;">Recent past activities and community milestones will appear here.</div>`;
            return;
        }

        pastGrid.innerHTML = events.map((ev, i) => {
            const dateObj = new Date(ev.event_date);
            const dateFormatted = isNaN(dateObj.getTime()) ? 'Completed' : dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const locationStr = ev.location_name || ev.location_address || 'Mumbai';

            return `
                <div class="past-card reveal active" style="transition-delay: ${i * 0.05}s">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">
                        ${dateFormatted}
                    </div>
                    <h4>${escapeHTML(ev.title)}</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin: 6px 0 14px;">${escapeHTML(locationStr)}</p>
                    <div class="past-stats">
                        <div><i data-lucide="check-circle" style="color: #10B981;"></i> Completed</div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    // Open Event Details Modal using GET /api/public/events/{id}
    async function openPublicEventDetails(eventId) {
        if (!modal) return;
        modal.style.display = 'flex';

        const categoryEl = document.getElementById('modal-ev-category');
        const titleEl = document.getElementById('modal-ev-title');
        const datetimeEl = document.getElementById('modal-ev-datetime');
        const bodyEl = document.getElementById('modal-ev-body');

        if (titleEl) titleEl.innerText = "Loading Event Details...";
        if (categoryEl) categoryEl.innerText = "Loading";
        if (datetimeEl) datetimeEl.innerHTML = "";
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i data-lucide="loader-2" class="spin"></i> Fetching details...</div>`;
        if (window.lucide) lucide.createIcons();

        try {
            const res = await ApiClient.request(`/public/events/${eventId}`, 'GET');
            const ev = res.data || res;

            if (!ev || !ev.title) {
                if (bodyEl) bodyEl.innerHTML = `<div style="color: #EF4444; padding: 20px; text-align: center;">Event details could not be retrieved.</div>`;
                return;
            }

            if (categoryEl) categoryEl.innerText = ev.category || 'Community Service';
            if (titleEl) titleEl.innerText = ev.title;

            const dateObj = new Date(ev.event_date);
            const dateStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const startTimeStr = ev.start_time ? ev.start_time.substring(0, 5) : '';
            const endTimeStr = ev.end_time ? ev.end_time.substring(0, 5) : '';

            if (datetimeEl) {
                datetimeEl.innerHTML = `
                    <i data-lucide="calendar" style="width: 15px; height: 15px;"></i> ${dateStr}
                    ${startTimeStr ? `&nbsp;•&nbsp;<i data-lucide="clock" style="width: 15px; height: 15px;"></i> ${startTimeStr} - ${endTimeStr}` : ''}
                `;
            }

            let perksHtml = '';
            if (ev.perks && Array.isArray(ev.perks) && ev.perks.length > 0) {
                perksHtml = `
                    <div style="margin-top: 16px;">
                        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Volunteer Perks</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${ev.perks.map(p => `<span style="background: rgba(16,185,129,0.1); color: #059669; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ ${escapeHTML(p)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            let skillsHtml = '';
            if (ev.required_skills && Array.isArray(ev.required_skills) && ev.required_skills.length > 0) {
                skillsHtml = `
                    <div style="margin-top: 16px;">
                        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Required Skills</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${ev.required_skills.map(s => `<span style="background: var(--bg-surface); border: 1px solid var(--border-light); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">${escapeHTML(s)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            let contactHtml = '';
            if (ev.contact_person_name || ev.contact_person_phone || ev.contact_person_email) {
                contactHtml = `
                    <div style="margin-top: 16px; padding: 12px 16px; background: var(--bg-surface); border-radius: 8px; font-size: 13px;">
                        <span style="font-weight: 600; color: var(--text-main);">Coordinator:</span> ${escapeHTML(ev.contact_person_name || 'Event Coordinator')}
                        ${ev.contact_person_phone ? `<br><span style="color: var(--text-muted);">Phone:</span> ${escapeHTML(ev.contact_person_phone)}` : ''}
                        ${ev.contact_person_email ? `<br><span style="color: var(--text-muted);">Email:</span> ${escapeHTML(ev.contact_person_email)}` : ''}
                    </div>
                `;
            }

            if (bodyEl) {
                bodyEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: 10px; display: flex; align-items: flex-start; gap: 12px;">
                            <i data-lucide="map-pin" style="color: var(--accent-primary); flex-shrink: 0; margin-top: 2px;"></i>
                            <div>
                                <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">${escapeHTML(ev.location_name || 'Location')}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${escapeHTML(ev.location_address || 'Address provided upon registration')}</div>
                                ${ev.meeting_point ? `<div style="font-size: 12px; color: var(--accent-primary); margin-top: 4px; font-weight: 500;">Meeting Point: ${escapeHTML(ev.meeting_point)}</div>` : ''}
                            </div>
                        </div>

                        <div>
                            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">About this Event</h4>
                            <p style="font-size: 14px; line-height: 1.6; color: var(--text-main); white-space: pre-line;">${escapeHTML(ev.description || 'Join fellow volunteers in making a tangible difference in the community.')}</p>
                        </div>

                        ${perksHtml}
                        ${skillsHtml}
                        ${contactHtml}

                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-light); display: flex; gap: 12px; align-items: center;">
                            <div style="font-size: 13px; color: var(--text-muted);">
                                <strong>${ev.volunteers_needed || 0}</strong> volunteers needed
                            </div>
                            <div style="margin-left: auto; display: flex; gap: 8px;">
                                <a href="login.html?redirect=volunteer/my-events.html" class="btn btn-primary" style="padding: 10px 20px; font-size: 14px;">
                                    Sign In & Register
                                </a>
                                <a href="join-us.html" class="btn btn-outline" style="padding: 10px 16px; font-size: 14px;">
                                    Join SevaLog
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Failed to load public event details:", err);
            if (bodyEl) {
                bodyEl.innerHTML = `<div style="color: #EF4444; padding: 20px; text-align: center;">Unable to load event details (${escapeHTML(err.message || 'Error')}).</div>`;
            }
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize Hub
    loadHubData();
});
