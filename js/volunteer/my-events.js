// ==========================================
// MY-EVENTS.JS (Custom API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    // Store fetched events globally so the modal can access them without another API call
    let globalEventsData = [];

    // 1. Setup Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // 2. Initialize
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    if (!token) {
        window.location.href = '../login.html'; 
        return;
    }

    loadAllEvents();

    // 3. Fetch Data & Categorize
    async function loadAllEvents() {
        const upcomingGrid = document.getElementById('upcoming-grid');
        const myRegsGrid = document.getElementById('my-regs-grid');
        const pastGrid = document.getElementById('past-grid');

        myRegsGrid.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Fetching your schedule...</div>';

        try {
            // Hit your new unified endpoint
            const response = await ApiClient.request('/volunteer/events/all', 'GET');
            
            // Save to global array for the modal popup
            globalEventsData = response.data || [];
            const allEvents = globalEventsData;

            const upcoming = [];
            const past = [];
            const myRegistrations = [];

            allEvents.forEach(ev => {
                // Determine if user has an active involvement
                const isActiveReg = ['registered', 'present', 'absent'].includes(ev.user_status);
                
                if (isActiveReg) {
                    myRegistrations.push(ev);
                }

                // Categorize by timeline using your database view status
                if (ev.event_status === 'upcoming' || ev.event_status === 'live') {
                    upcoming.push(ev);
                } else if (ev.event_status === 'completed') {
                    past.push(ev);
                }
            });

            // Past events should show newest first
            past.reverse();
            // My Regs should show upcoming first, then past
            myRegistrations.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

            renderEvents(upcoming, upcomingGrid, 'upcoming');
            renderEvents(myRegistrations, myRegsGrid, 'my-regs');
            renderEvents(past, pastGrid, 'past');

            lucide.createIcons();
            bindActionButtons();

        } catch (err) {
            console.error('Error loading events:', err);
            myRegsGrid.innerHTML = '<p class="empty-msg">Unable to load schedule.</p>';
            upcomingGrid.innerHTML = '<p class="empty-msg">Unable to load schedule.</p>';
        }
    }

    // 4. Unified Render Function
    function renderEvents(events, container, tabType) {
        if (events.length === 0) {
            container.innerHTML = `<p class="empty-msg">No events found in this category.</p>`;
            return;
        }

        container.innerHTML = events.map(ev => {
            const evDate = new Date(ev.event_date);
            const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(evDate.getDate()).padStart(2, '0');
            const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';
            const isCompleted = ev.event_status === 'completed';

            // Determine what buttons/badges to show based on status
            let actionHtml = '';

            if (ev.user_status === 'present') {
                actionHtml = `<span class="verified-badge"><i data-lucide="award" style="width: 14px;"></i> ${ev.hours_logged} Hours Verified</span>`;
            } 
            else if (ev.user_status === 'absent') {
                actionHtml = `<span style="font-size: 13px; font-weight: 700; color: #EF4444;">Marked Absent</span>`;
            }
            else if (ev.user_status === 'registered') {
                actionHtml = `
                    <button class="btn-cancel" data-event-id="${ev.event_id}">Withdraw</button>
                    <span class="registered-pill">Registered</span>
                `;
            }
            else {
                // They are not registered.
                if (isCompleted) {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Event Completed</span>`;
                } else {
                    actionHtml = `<button class="btn-register" data-event-id="${ev.event_id}">Register Now</button>`;
                }
            }

            // Visual dimming for completed events
            const dateBg = isCompleted ? 'background: #F1F5F9; color: #94A3B8;' : '';
            const monthColor = isCompleted ? 'color: #64748B;' : '';

            // Note the onclick event to open the modal, and event.stopPropagation() on the actions container
            return `
                <div class="event-ticket" style="${isCompleted ? 'opacity: 0.8;' : ''}" onclick="openEventDetails('${ev.event_id}')">
                    <div class="ticket-date" style="${dateBg}">
                        <span class="month" style="${monthColor}">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="ticket-details">
                        <h4>${ev.title}</h4>
                        <div class="t-row"><i data-lucide="clock"></i> ${time}</div>
                        <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location_name || 'Location TBD'}</div>
                        
                        <div class="ticket-actions" onclick="event.stopPropagation()">
                            ${actionHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 5. Action Handlers (Register & Withdraw)
    function bindActionButtons() {
        // Handle Registrations
        document.querySelectorAll('.btn-register').forEach(button => {
            button.addEventListener('click', async (event) => {
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;
                
                btn.disabled = true;
                btn.innerText = 'Processing...';

                try {
                    await ApiClient.request('/volunteer/apply', 'POST', { eventId });
                    showToast('Successfully registered!', true);
                    loadAllEvents(); // Refresh data to update all tabs
                } catch (err) {
                    showToast(err.message, false);
                    btn.disabled = false;
                    btn.innerText = 'Register Now';
                }
            });
        });

        // Handle Withdrawals
        document.querySelectorAll('.btn-cancel').forEach(button => {
            button.addEventListener('click', async (event) => {
                const btn = event.currentTarget;
                const eventId = btn.dataset.eventId;
                
                if(!confirm("Are you sure you want to withdraw from this event?")) return;

                btn.disabled = true;
                btn.innerText = 'Withdrawing...';

                try {
                    await ApiClient.request('/volunteer/withdraw', 'POST', { eventId });
                    showToast('Registration withdrawn.', true);
                    loadAllEvents(); // Refresh data to update all tabs
                } catch (err) {
                    showToast(err.message, false);
                    btn.disabled = false;
                    btn.innerText = 'Withdraw';
                }
            });
        });
    }

    // 6. Dynamic Toast Message
    function showToast(message, success = true) {
        let toast = document.querySelector('.notification-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'notification-toast';
            toast.innerHTML = `<div class="toast-icon"></div><div class="toast-message"></div>`;
            document.body.appendChild(toast);
        }

        const iconContainer = toast.querySelector('.toast-icon');
        iconContainer.style.background = success ? '#10B981' : '#EF4444'; 
        iconContainer.innerHTML = success 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        toast.querySelector('.toast-message').innerText = message;
        toast.classList.add('show');

        window.clearTimeout(toast.dismissTimeout);
        toast.dismissTimeout = window.setTimeout(() => toast.classList.remove('show'), 3200);
    }

    // 7. Event Details Modal Logic
    window.openEventDetails = function(eventId) {
        const ev = globalEventsData.find(e => e.event_id === eventId);
        if (!ev) return;

        // Header Data
        document.getElementById('detail-title').innerText = ev.title;
        document.getElementById('detail-category').innerText = ev.category || 'Seva Activity';
        
        // Show status badge inside modal if applicable
        const badge = document.getElementById('detail-status-badge');
        if (ev.user_status === 'registered' || ev.user_status === 'present') {
            badge.style.display = 'inline-flex';
            badge.innerHTML = ev.user_status === 'present'
                ? '<i data-lucide="award" style="width: 14px;"></i> Verified Attendance'
                : '<i data-lucide="check-circle" style="width: 14px;"></i> Registered';
        } else {
            badge.style.display = 'none';
        }
        
        // Date & Time
        const evDate = new Date(ev.event_date).toLocaleDateString();
        const time = ev.start_time ? `${ev.start_time.substring(0,5)} - ${ev.end_time.substring(0,5)}` : 'TBA';
        document.getElementById('detail-datetime').innerText = `${evDate}\n${time}`;

        // Contact
        const contactName = ev.contact_person_name || 'Not provided';
        const contactPhone = ev.contact_person_phone ? `\n${ev.contact_person_phone}` : '';
        document.getElementById('detail-contact').innerText = `${contactName}${contactPhone}`;

        // Separate Location Name and Full Address
        document.getElementById('detail-location-name').innerText = ev.location_name || 'Location TBD';
        
        const addrElement = document.getElementById('detail-address');
        if (ev.location_address && ev.location_address !== ev.location_name) {
            addrElement.innerText = ev.location_address;
            addrElement.style.display = 'block';
        } else {
            addrElement.style.display = 'none'; // Hide if address is same as name or empty
        }
        
        // Google Maps link and embedded preview
        const mapLink = document.getElementById('detail-map-link');
        const mapEmbed = document.getElementById('detail-map-embed');
        const mapIframe = document.getElementById('detail-map-iframe');

        if (ev.google_maps_link) {
            mapLink.href = ev.google_maps_link;
            mapLink.style.display = 'inline-flex';

            const embedUrl = ev.google_maps_link.includes('maps.app.goo.gl')
                ? ev.google_maps_link
                : ev.google_maps_link.replace('https://www.google.com/maps?q=', 'https://www.google.com/maps?q=');

            mapIframe.src = embedUrl;
            mapEmbed.style.display = 'block';
        } else {
            mapLink.style.display = 'none';
            mapEmbed.style.display = 'none';
        }

        // Description
        document.getElementById('detail-desc').innerText = ev.description || 'No description provided.';

        // Reveal Modal and re-render icons
        document.getElementById('eventDetailsModal').classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.closeDetailsModal = function() {
        document.getElementById('eventDetailsModal').classList.remove('active');
    };
});