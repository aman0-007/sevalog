// ==========================================
// EVENTS.JS (Logic for Events Management)
// ==========================================

// 1. Create Modal Controls
function openModal() { document.getElementById('eventModal').classList.add('active'); }
function closeModal() { 
    document.getElementById('eventModal').classList.remove('active'); 
    document.getElementById('createEventForm').reset(); 
}

// 2. Fetch and Display Events (Updated to add onclick)
async function loadEvents() {
    const tbody = document.getElementById('events-table-body');
    
    try {
        const response = await ApiClient.request('/admin/events', 'GET');
        const data = response.data;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px;">No events found. Click 'Create Event' to start!</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(ev => {
            const startTime = ev.start_time ? ev.start_time.substring(0,5) : '--:--';
            const endTime = ev.end_time ? ev.end_time.substring(0,5) : '--:--';
            const currentRegs = ev.current_registrations || 0; 
            const maxVols = ev.volunteers_needed || 0;
            const capacityColor = currentRegs >= maxVols ? '#10B981' : 'var(--text-main)';

            // Added onclick handler to open the details modal
            return `
            <tr onclick="openDetailsModal('${ev.event_id}')">
                <td style="font-weight: 600;">${ev.title}</td>
                <td>
                    <div>${new Date(ev.event_date).toLocaleDateString()}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        <i data-lucide="clock" style="width: 12px; height: 12px; display: inline; margin-bottom: -2px;"></i> 
                        ${startTime} - ${endTime}
                    </div>
                </td>
                <td>${ev.location_name}</td>
                
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: ${capacityColor};">
                        <i data-lucide="users" style="width: 16px; height: 16px;"></i>
                        ${currentRegs} / ${maxVols}
                    </div>
                </td>

                <td><span class="status-badge status-upcoming">UPCOMING</span></td>
            </tr>
        `}).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`;
    }
}

// 3. Details Modal Controls & Logic (NEW)
function closeDetailsModal() {
    document.getElementById('eventDetailsModal').classList.remove('active');
}

async function openDetailsModal(eventId) {
    // Open modal and show loading state
    const modal = document.getElementById('eventDetailsModal');
    const tbody = document.getElementById('detail-volunteers-body');
    
    document.getElementById('detail-title').innerText = "Loading Event Details...";
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Fetching data...</td></tr>`;
    modal.classList.add('active');

    try {
        const response = await ApiClient.request(`/admin/events/${eventId}/report`, 'GET');
        const { event, volunteers } = response.data;

        // Populate Event Info
        document.getElementById('detail-title').innerText = event.title;
        document.getElementById('detail-category').innerText = `Category: ${event.category || 'N/A'}`;
        
        const dateStr = new Date(event.event_date).toLocaleDateString();
        const timeStr = `${event.start_time.substring(0,5)} - ${event.end_time.substring(0,5)}`;
        document.getElementById('detail-datetime').innerText = `${dateStr} | ${timeStr}`;
        
        document.getElementById('detail-location').innerText = event.location_name;
        
        const contactName = event.contact_person_name || 'No Name';
        const contactPhone = event.contact_person_phone || 'No Phone';
        document.getElementById('detail-contact').innerText = `${contactName} (${contactPhone})`;
        
        document.getElementById('detail-capacity').innerText = `${volunteers.filter(v => v.attendance_status !== 'withdrawn').length} / ${event.volunteers_needed} Registered`;
        
        document.getElementById('detail-desc').innerText = event.description || 'No description provided.';

        // Populate Volunteers Table
        if (!volunteers || volunteers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteers have registered yet.</td></tr>`;
        } else {
            tbody.innerHTML = volunteers.map(vol => {
                // Determine styling based on status
                let statusColor = "var(--text-main)";
                if(vol.attendance_status === 'withdrawn') statusColor = "red";
                if(vol.attendance_status === 'present') statusColor = "#10B981";

                return `
                <tr>
                    <td style="font-weight: 500;">${vol.first_name} ${vol.last_name}</td>
                    <td>
                        <div style="font-size: 13px;">${vol.email}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${vol.phone_number}</div>
                    </td>
                    <td style="text-transform: capitalize; font-weight: 600; color: ${statusColor};">
                        ${vol.attendance_status}
                    </td>
                    <td>${vol.hours_logged} hrs</td>
                </tr>
                `;
            }).join('');
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        document.getElementById('detail-title').innerText = "Error Loading Details";
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Failed to load report: ${error.message}</td></tr>`;
    }
}

// 4. Handle Form Submission (Create Event)
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;
    
    const newEventPayload = {
        title: document.getElementById('ev-title').value,
        eventDate: document.getElementById('ev-date').value,
        startTime: document.getElementById('ev-start').value,
        endTime: document.getElementById('ev-end').value,
        category: document.getElementById('ev-category').value, 
        locationName: document.getElementById('ev-location-name').value,
        locationAddress: document.getElementById('ev-location-address').value,
        googleMapsLink: document.getElementById('ev-maps-link').value || null,
        contactPersonName: document.getElementById('ev-contact-name').value || null,
        contactPersonPhone: document.getElementById('ev-contact-phone').value || null,
        volunteersNeeded: parseInt(document.getElementById('ev-max-volunteers').value),
        description: document.getElementById('ev-desc').value
    };

    try {
        await ApiClient.request('/admin/events', 'POST', newEventPayload);
        closeModal();
        loadEvents(); 
    } catch (error) {
        alert("Failed to create event! \nError: " + error.message);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// 5. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadEvents);