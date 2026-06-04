// ==========================================
// EVENTS.JS (Logic for Events Management)
// Relies on main.js for _supabase and layout
// ==========================================

// 1. Modal Controls
function openModal() { document.getElementById('eventModal').classList.add('active'); }
function closeModal() { 
    document.getElementById('eventModal').classList.remove('active'); 
    document.getElementById('createEventForm').reset(); 
}

// 2. Fetch and Display Events
async function loadEvents() {
    const tbody = document.getElementById('events-table-body');
    
    // 🔥 NEW: We fetch events AND count the associated registrations in one query!
    const { data, error } = await _supabase
        .from('events')
        .select('*, registrations(id)') 
        .order('event_date', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px;">No events found. Click 'Create Event' to start!</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(ev => {
        const startTime = ev.start_time ? ev.start_time.substring(0,5) : '--:--';
        const endTime = ev.end_time ? ev.end_time.substring(0,5) : '--:--';
        
        // Count how many registrations exist for this event
        const currentRegs = ev.registrations ? ev.registrations.length : 0;
        const maxVols = ev.max_volunteers || 0;

        // Visual feedback: if full, make the text green. If empty, normal color.
        const capacityColor = currentRegs >= maxVols ? '#10B981' : 'var(--text-main)';

        return `
        <tr>
            <td style="font-weight: 600;">${ev.title}</td>
            <td>
                <div>${new Date(ev.event_date).toLocaleDateString()}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                    <i data-lucide="clock" style="width: 12px; height: 12px; display: inline; margin-bottom: -2px;"></i> 
                    ${startTime} - ${endTime}
                </div>
            </td>
            <td>${ev.location}</td>
            
            <td>
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: ${capacityColor};">
                    <i data-lucide="users" style="width: 16px; height: 16px;"></i>
                    ${currentRegs} / ${maxVols}
                </div>
            </td>

            <td><span class="status-badge status-${ev.status || 'upcoming'}">${(ev.status || 'upcoming').toUpperCase()}</span></td>
        </tr>
    `}).join('');

    // Re-render icons for the newly injected HTML
    lucide.createIcons();
}

// 3. Handle Form Submission
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;
    
    // NEW: Capture the max_volunteers from the form
    const newEvent = {
        title: document.getElementById('ev-title').value,
        event_date: document.getElementById('ev-date').value,
        category: document.getElementById('ev-category').value,
        start_time: document.getElementById('ev-start').value,
        end_time: document.getElementById('ev-end').value,
        location: document.getElementById('ev-location').value,
        max_volunteers: parseInt(document.getElementById('ev-max-volunteers').value),
        description: document.getElementById('ev-desc').value,
        status: 'upcoming'
    };

    const { error } = await _supabase.from('events').insert([newEvent]);

    submitBtn.innerText = originalText;
    submitBtn.disabled = false;

    if (error) {
        alert("Failed to create event! \nError: " + error.message);
    } else {
        closeModal();
        loadEvents(); 
    }
});

// 4. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadEvents);