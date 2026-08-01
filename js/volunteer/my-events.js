// ==========================================
// MY-EVENTS.JS (Optimized Build with Scanner - API FIXED)
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
            // FIX 1: Matched the endpoint to your router.get('/events')
            const response = await ApiClient.request('/volunteer/events', 'GET');
            globalEventsData = response.data || [];
            
            const upcoming = [];
            const past = [];
            const myRegistrations = [];
            const now = new Date();

            globalEventsData.forEach(ev => {
                // Ensure time string fallback to avoid crashes if start/end time is missing
                const safeEndTime = ev.end_time || '23:59:00';
                const eventDate = new Date(`${ev.event_date.split('T')[0]}T${safeEndTime}`);
                
                // FIX 2: Changed ev.event_status to ev.dynamic_status to match the SQL query
                const isCompleted = ev.dynamic_status === 'completed' || eventDate < now;
                const isCancelled = ev.dynamic_status === 'cancelled';
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
    // 4. Render Function
    function renderEvents(events, container) {
        if (events.length === 0) {
            container.innerHTML = `<p class="empty-msg">No events found in this category.</p>`;
            return;
        }

        const now = new Date();

        container.innerHTML = events.map(ev => {
            const evDate = new Date(ev.event_date);
            const month = evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(evDate.getDate()).padStart(2, '0');
            const time = ev.start_time ? ev.start_time.substring(0,5) : 'TBA';
            
            // Build proper start and end Date objects for math
            const safeStartTime = ev.start_time || '00:00:00';
            const safeEndTime = ev.end_time || '23:59:00';
            const eventStart = new Date(`${ev.event_date.split('T')[0]}T${safeStartTime}`);
            const eventEnd = new Date(`${ev.event_date.split('T')[0]}T${safeEndTime}`);
            
            const isCompleted = ev.dynamic_status === 'completed' || eventEnd < now;

            // Calculate minutes until the event starts
            const minsToStart = (eventStart - now) / (1000 * 60);
            
            // LOGIC: Check-in is available 30 mins before start (and during). 
            // Withdraw is ONLY available strictly more than 30 mins before start.
            const canCheckIn = !isCompleted && minsToStart <= 30;
            const canWithdraw = !isCompleted && minsToStart > 30;

            let actionHtml = '';
            const status = ev.user_registration_status;
            const hasCheckedOut = ev.check_out_time !== null && ev.check_out_time !== undefined;

            if (status === 'present' && hasCheckedOut) {
                // State 4: Both done.
                actionHtml = `<span class="verified-badge" style="display: flex; justify-content: center; align-items: center; gap: 4px; color: #10B981; font-weight: 600; padding: 6px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 20px; width: 100%;">
                                <i data-lucide="check-circle" style="width: 16px;"></i> Attendance Completed
                              </span>`;
            } else if (status === 'present' && !hasCheckedOut) {
                // State 3: Checked In, waiting to Check Out
                actionHtml = `
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                        <button class="btn-checkin action-btn" disabled style="opacity: 0.5; cursor: not-allowed; background: #10B981; color: white; border: none; padding: 6px 12px; border-radius: 6px;">
                            <i data-lucide="check"></i> Checked In
                        </button>
                        <button class="btn-checkout action-btn" data-action="scan-checkout" data-event-id="${ev.event_id}" style="background: #3B82F6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                            <i data-lucide="qr-code"></i> Check-Out
                        </button>
                    </div>
                `;
            } else if (status === 'absent') {
                actionHtml = `<span style="font-size: 13px; font-weight: 700; color: #EF4444;">Marked Absent</span>`;
            } else if (status === 'registered') {
                // State 1 & 2: Registered (Waiting for 30 min window OR ready to Check-In)
                if (canCheckIn) {
                    actionHtml = `
                        <div style="display: flex; justify-content: space-between; width: 100%;">
                            <button class="btn-checkin action-btn" data-action="scan-checkin" data-event-id="${ev.event_id}" style="background: #10B981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                <i data-lucide="qr-code"></i> Check-In
                            </button>
                            <button class="btn-checkout action-btn" disabled style="opacity: 0.5; cursor: not-allowed; background: #94A3B8; color: white; border: none; padding: 6px 12px; border-radius: 6px;">
                                Check-Out
                            </button>
                        </div>
                    `;
                } else if (canWithdraw) {
                    actionHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <button class="btn-cancel action-btn" data-action="withdraw" data-event-id="${ev.event_id}">Withdraw</button>
                            <span class="registered-pill">Registered</span>
                        </div>
                    `;
                }
            } else if (status === 'waitlisted') {
                actionHtml = `
                    <button class="btn-cancel action-btn" data-action="withdraw" data-event-id="${ev.event_id}">Leave Waitlist</button>
                    <span class="registered-pill" style="color: #F59E0B; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2);">Waitlisted</span>
                `;
            } else {
                if (isCompleted) {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Event Completed</span>`;
                } else if (ev.registration_open === false || ev.dynamic_status === 'cancelled') {
                    actionHtml = `<span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">Closed</span>`;
                } else if (ev.max_volunteers && ev.current_registrations >= ev.max_volunteers) {
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
            if (action === 'scan-checkin') {
                startScannerModal(eventId, 'check-in');
                return;
            }
            if (action === 'scan-checkout') {
                startScannerModal(eventId, 'check-out');
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
                actionBtn.innerText = action === 'register' ? 'Register Now' : (action === 'withdraw' ? 'Withdraw' : 'Action');
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

    /// 7. Details Modal logic
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
        
        // Date & Capacity
        const evDate = new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = ev.start_time ? `${ev.start_time.substring(0,5)} - ${ev.end_time ? ev.end_time.substring(0,5) : ''}` : 'TBA';
        document.getElementById('detail-datetime').innerText = `${evDate}\n${time}`;
        document.getElementById('detail-capacity').innerText = ev.max_volunteers ? `${ev.current_registrations} / ${ev.max_volunteers}` : `${ev.current_registrations} (No Limit)`;
        
        // Missing Data Fields: Contact & Deadline
        document.getElementById('detail-contact').innerText = ev.contact_person_name 
            ? `${ev.contact_person_name}\n${ev.contact_person_phone || ''}` 
            : 'Not Provided';
            
        document.getElementById('detail-deadline').innerText = ev.registration_deadline 
            ? new Date(ev.registration_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
            : 'No Deadline';

        // Missing Data Fields: Attendance Stats (Check-in / out / hours)
        const attendanceStats = document.getElementById('detail-attendance-stats');
        if (ev.user_registration_status === 'present') {
            attendanceStats.style.display = 'flex';
            
            // FIX: Parse the full timestamp into a readable AM/PM time
            document.getElementById('detail-checkin').innerText = ev.check_in_time 
                ? new Date(ev.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                : '--';
                
            document.getElementById('detail-checkout').innerText = ev.check_out_time 
                ? new Date(ev.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                : '--';
                
            // Format hours to max 2 decimal places to keep the UI clean
            document.getElementById('detail-hours').innerText = ev.hours_logged 
                ? `${parseFloat(ev.hours_logged).toFixed(2)} hrs` 
                : '--';
        } else {
            attendanceStats.style.display = 'none';
        }

        // Location & Iframe Embedded Map
        document.getElementById('detail-location-name').innerText = ev.location_name || 'Location TBD';
        document.getElementById('detail-address').innerText = ev.location_address || '--';
        document.getElementById('detail-desc').innerText = ev.description || 'No specific instructions provided for this event.';
        
        const mapEmbed = document.getElementById('detail-map-embed');
        const mapIframe = document.getElementById('detail-map-iframe');

        if (ev.location_address || ev.location_name) {
            mapEmbed.style.display = 'block';
            
            // Standard fallback query to generate a map iframe
            const mapQuery = encodeURIComponent(`${ev.location_name || ''} ${ev.location_address || ''}`);
            mapIframe.src = `https://maps.google.com/maps?q=${mapQuery}&output=embed`;
        } else {
            mapEmbed.style.display = 'none';
        }

        document.getElementById('eventDetailsModal').classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    window.closeDetailsModal = function() {
        document.getElementById('eventDetailsModal').classList.remove('active');
    };

    // ==========================================
    // 8. CAMERA SCANNER ENGINE & HARDWARE CONTROL
    // ==========================================
    
    let currentScanType = 'check-in'; 

    async function startScannerModal(eventId, scanType = 'check-in') {
        currentScanType = scanType;
        
        const modalTitle = document.querySelector('#qrScannerModal h2');
        if (modalTitle) {
            modalTitle.innerText = scanType === 'check-in' ? 'Scan Check-In QR' : 'Scan Check-Out QR';
        }

        document.getElementById('qrScannerModal').classList.add('active');
        const placeholder = document.getElementById('reader-placeholder');
        placeholder.style.display = 'block';
        placeholder.innerText = 'Requesting camera...';

        if (!window.isSecureContext) {
            placeholder.innerHTML = `<span style="color: #EF4444; text-align: center; display: block;">Camera Blocked.<br>Browsers require HTTPS for camera access.</span>`;
            setTimeout(closeScannerModal, 4000);
            return;
        }

        if (html5QrCode) {
            try { await html5QrCode.clear(); } catch(e) {}
        }
        html5QrCode = new Html5Qrcode("reader");
        
        const config = { 
            fps: 30, // Increased to 30 for much faster capturing on shaky hands
            qrbox: { width: 250, height: 250 }, // Slightly larger sweet spot
        };

        try {
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                async (decodedText) => {
                    if (!html5QrCode) return;

                    // Stop camera immediately upon reading code
                    try {
                        await html5QrCode.stop();
                    } catch (e) {}
                    html5QrCode = null; 

                    const endpoint = currentScanType === 'check-in' 
                        ? '/volunteer/events/check-in' 
                        : '/volunteer/events/check-out';

                    try {
                        const response = await ApiClient.request(endpoint, 'POST', {
                            token: decodedText 
                        });
                        
                        closeScannerModal();
                        const successMsg = currentScanType === 'check-in' 
                            ? "Attendance verified successfully!" 
                            : "Check-out successful! Hours logged.";
                        showToast(successMsg, true);
                        
                        loadAllEvents(); 

                    } catch (err) {
                        closeScannerModal();
                        showToast(err.message || `Invalid or expired ${currentScanType} Code.`, false);
                    }
                },
                (errorMessage) => {
                    // Scanning error frame (safe to ignore as it runs continuously per frame)
                }
            );
            placeholder.style.display = 'none';
        } catch (err) {
            console.error("Camera startup failed:", err);
            let errorMsg = "Camera access unavailable.";
            if (err.name === 'NotAllowedError') {
                errorMsg = "Camera permission denied. Please allow camera access in browser settings.";
            } else if (err.name === 'NotFoundError') {
                errorMsg = "No camera hardware detected.";
            } else if (err.name === 'NotSupportedError' || !window.isSecureContext) {
                errorMsg = "Camera blocked by browser. Mobile devices require HTTPS to use the camera.";
            } else if (err.name === 'OverconstrainedError') {
                errorMsg = "Camera configuration not supported by this phone.";
            }
            showToast(errorMsg, false);
            closeScannerModal();
        }
    }

    window.closeScannerModal = async function() {
        document.getElementById('qrScannerModal').classList.remove('active');
        
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