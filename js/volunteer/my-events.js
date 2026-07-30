// ==========================================
// MY-EVENTS.JS (Optimized Build with Scanner)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    let globalEventsData = [];
    let html5QrCode = null; // Global reference for hardware cleanup

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

    // 2. Initialize Auth Check
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
            const response = await ApiClient.request('/volunteer/events/all?limit=50', 'GET');
            globalEventsData = response.data || [];
            
            const upcoming = [];
            const past = [];
            const myRegistrations = [];
            const now = new Date();

            globalEventsData.forEach(ev => {
                const eventDate = new Date(`${ev.event_date.split('T')[0]}T${ev.end_time}`);
                const isCompleted = ev.event_status === 'completed' || eventDate < now;
                const isCancelled = ev.event_status === 'cancelled';
                const isActiveReg = ['registered', 'waitlisted', 'present', 'absent'].includes(ev.user_registration_status);
                
                if (isCancelled || isCompleted) {
                    past.push(ev); // Locks past events exclusively to the history tab
                } else {
                    upcoming.push(ev);
                    if (isActiveReg) {
                        myRegistrations.push(ev); // Only active future/ongoing events go here
                    }
                }
            });

            past.sort((a, b) => new Date(b.event_date) - new Date(a.event_date)); 
            myRegistrations.sort((a, b) => new Date(a.event_date) - new Date(b.event_date)); 

            renderEvents(upcoming, upcomingGrid);
            renderEvents(myRegistrations, myRegsGrid);
            renderEvents(past, pastGrid);

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error('Error loading events:', err);
            myRegsGrid.innerHTML = '<p class="empty-msg">Unable to load schedule.</p>';
        }
    }

    // 4. Render Function
    function renderEvents(events, container) {
        if (events.length === 0) {
            container.innerHTML = `<p class="empty-msg">No events found in this category.</p>`;
            return;
        }

        container.innerHTML = events.map(ev => {
            const evDate = new Date(ev.event_date);
            const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(evDate.getDate()).padStart(2, '0');
            const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';
            const eventEnd = new Date(`${ev.event_date.split('T')[0]}T${ev.end_time}`);
            const isCompleted = ev.event_status === 'completed' || eventEnd < new Date();

            let actionHtml = '';
            const status = ev.user_registration_status;

            if (status === 'present') {
                actionHtml = `<span class="verified-badge"><i data-lucide="award" style="width: 14px;"></i> Verified Attendance</span>`;
            } else if (status === 'absent') {
                actionHtml = `<span style="font-size: 13px; font-weight: 700; color: #EF4444;">Marked Absent</span>`;
            } else if (status === 'registered') {
                actionHtml = `
                    <div style="display: flex; gap: 8px;">
                        ${!isCompleted ? `<button class="btn-checkin action-btn" data-action="scan" data-event-id="${ev.event_id}"><i data-lucide="qr-code"></i> Check-in</button>` : ''}
                        <button class="btn-cancel action-btn" data-action="withdraw" data-event-id="${ev.event_id}">Withdraw</button>
                    </div>
                    <span class="registered-pill">Registered</span>
                `;
            } else if (status === 'waitlisted') {
                actionHtml = `
                    <button class="btn-cancel action-btn" data-action="withdraw" data-event-id="${ev.event_id}">Leave Waitlist</button>
                    <span class="registered-pill" style="color: #F59E0B; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2);">Waitlisted</span>
                `;
            } else {
                if (isCompleted) {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Event Completed</span>`;
                } else if (!ev.registration_open || ev.event_status === 'cancelled') {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Closed</span>`;
                } else if (ev.max_volunteers && ev.current_registrations >= ev.max_volunteers) {
                    // NEW: Distinct styling for Waitlist action button
                    actionHtml = `<button class="btn-register action-btn" data-action="register" data-event-id="${ev.event_id}" style="background: #F59E0B; border-color: #F59E0B; color: #FFFFFF;">Join Waitlist</button>`;
                } else {
                    actionHtml = `<button class="btn-register action-btn" data-action="register" data-event-id="${ev.event_id}">Register Now</button>`;
                }
            }

            const dateBg = isCompleted ? 'background: #F1F5F9; color: #94A3B8;' : '';
            const monthColor = isCompleted ? 'color: #64748B;' : '';

            return `
                <div class="event-ticket" data-card-id="${ev.event_id}" style="${isCompleted ? 'opacity: 0.8;' : ''}">
                    <div class="ticket-date" style="${dateBg}">
                        <span class="month" style="${monthColor}">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="ticket-details">
                        <h4>${ev.title}</h4>
                        <div class="t-row"><i data-lucide="clock"></i> ${time}</div>
                        <div class="t-row"><i data-lucide="map-pin"></i> ${ev.location_name || 'Location TBD'}</div>
                        <div class="ticket-actions">
                            ${actionHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 5. Centralized Event Delegation
    document.querySelector('.events-container').addEventListener('click', async (e) => {
        
        const actionBtn = e.target.closest('.action-btn');
        if (actionBtn) {
            e.stopPropagation(); 
            const eventId = actionBtn.dataset.eventId;
            const action = actionBtn.dataset.action; 
            
            // Branch for the new Scanner action
            if (action === 'scan') {
                startScannerModal(eventId);
                return;
            }
            
            if (action === 'withdraw' && !confirm("Are you sure you want to withdraw from this event?")) return;

            actionBtn.disabled = true;
            actionBtn.innerText = 'Processing...';

            try {
                const response = await ApiClient.request(`/volunteer/events/${eventId}/${action}`, 'POST');
                showToast(response.message || 'Success!', true);
                loadAllEvents(); 
            } catch (err) {
                showToast(err.message, false);
                actionBtn.disabled = false;
                actionBtn.innerText = action === 'register' ? 'Register Now' : 'Withdraw';
            }
            return;
        }

        const ticketCard = e.target.closest('.event-ticket');
        if (ticketCard) {
            openEventDetails(ticketCard.dataset.cardId);
        }
    });

    // 6. Toast System
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

        clearTimeout(toast.dismissTimeout);
        toast.dismissTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
    }

    // 7. Details Modal logic
    function openEventDetails(eventId) {
        const ev = globalEventsData.find(e => e.event_id === eventId);
        if (!ev) return;

        document.getElementById('detail-title').innerText = ev.title;
        document.getElementById('detail-category').innerText = ev.category || 'Seva Activity';
        
        const badge = document.getElementById('detail-status-badge');
        const status = ev.user_registration_status;
        if (['registered', 'present', 'waitlisted'].includes(status)) {
            badge.style.display = 'inline-flex';
            badge.innerText = status.charAt(0).toUpperCase() + status.slice(1);
        } else {
            badge.style.display = 'none';
        }
        
        // Format dates cleanly
        const evDate = new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = ev.start_time ? `${ev.start_time.substring(0,5)} - ${ev.end_time.substring(0,5)}` : 'TBA';
        
        document.getElementById('detail-datetime').innerText = `${evDate}\n${time}`;
        document.getElementById('detail-capacity').innerText = ev.max_volunteers ? `${ev.current_registrations} / ${ev.max_volunteers}` : `${ev.current_registrations} (No Limit)`;
        
        // INJECT NEW DATA FIELDS
        document.getElementById('detail-location-name').innerText = ev.location_name || 'Location TBD';
        document.getElementById('detail-desc').innerText = ev.description || 'No specific instructions provided for this event.';
        
        // Handle Address & Optional Google Maps Link
        let addressHtml = ev.location_address || '';
        if (ev.google_maps_link) {
            addressHtml += `<br><a href="${ev.google_maps_link}" target="_blank" style="color: var(--accent-primary); display: inline-block; margin-top: 6px; font-weight: 600; text-decoration: none;">View on Google Maps &rarr;</a>`;
        }
        document.getElementById('detail-address').innerHTML = addressHtml || '--';

        document.getElementById('eventDetailsModal').classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    window.closeDetailsModal = function() {
        document.getElementById('eventDetailsModal').classList.remove('active');
    };

    // ==========================================
    // 8. CAMERA SCANNER ENGINE & HARDWARE CONTROL
    // ==========================================
    
    async function startScannerModal(eventId) {
        document.getElementById('qrScannerModal').classList.add('active');
        const placeholder = document.getElementById('reader-placeholder');
        placeholder.style.display = 'block';
        placeholder.innerText = 'Requesting camera...';

        // 1. Strict HTTPS Check (Browser Security Requirement)
        if (!window.isSecureContext) {
            placeholder.innerHTML = `<span style="color: #EF4444; text-align: center; display: block;">Camera Blocked.<br>Browsers require HTTPS for camera access.</span>`;
            console.error("Camera access blocked: Environment is not a secure context (HTTPS/localhost).");
            setTimeout(closeScannerModal, 4000);
            return;
        }

        // Ensure fresh instance
        if (html5QrCode) {
            try { await html5QrCode.clear(); } catch(e) {}
        }
        html5QrCode = new Html5Qrcode("reader");
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            // Request rear camera explicitly
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText) => handleSuccessfulScan(decodedText, eventId)
            );
            placeholder.style.display = 'none';
        } catch (err) {
            console.error("Camera startup failed:", err);
            
            // Detailed error handling
            let errorMsg = "Camera access unavailable.";
            if (err.name === 'NotAllowedError') errorMsg = "Camera permission denied in browser settings.";
            else if (err.name === 'NotFoundError') errorMsg = "No camera hardware detected.";
            
            showToast(errorMsg, false);
            closeScannerModal();
        }
    }

    async function handleSuccessfulScan(decodedToken, eventId) {
        if (!html5QrCode) return;

        // Immediately pause camera to prevent duplicate rapid-fire API calls
        await html5QrCode.stop();
        html5QrCode = null; 

        // Send token to backend check-in route
        try {
            const response = await ApiClient.request('/volunteer/events/check-in', 'POST', {
                token: decodedToken 
                // We pass eventId if the backend requires double verification, though JWTs usually encapsulate it.
            });
            
            closeScannerModal();
            showToast("Attendance verified successfully!", true);
            loadAllEvents(); // Refresh data to show "Verified Attendance" badge

        } catch (err) {
            closeScannerModal();
            // Backend will throw errors if Token is expired, invalid, or wrong event.
            showToast(err.message || "Invalid or expired Check-in Code.", false);
        }
    }

    window.closeScannerModal = async function() {
        document.getElementById('qrScannerModal').classList.remove('active');
        
        // Strict hardware teardown
        if (html5QrCode) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (err) {
                console.error("Failed to stop camera:", err);
            }
            html5QrCode = null;
        }
    };
});