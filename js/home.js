//Handles data specific to the index.html page

document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.getElementById('hero-event-title');
    const dateEl = document.getElementById('hero-event-date');
    const countEl = document.getElementById('hero-event-count');

    if (!titleEl) return; 

    try {
        // Look how clean this is! Using our ApiClient from api.js
        const result = await ApiClient.request('/public/latest-event', 'GET');

        if (!result || !result.data) {
            titleEl.innerText = result.message || "No Upcoming Events";
            dateEl.innerText = "Check back later!";
            countEl.innerText = "-- / --";
            return;
        }

        const eventData = result.data;

        titleEl.innerText = eventData.title;
        
        // Format Date safely
        const evDate = new Date(eventData.event_date);
        const dateStr = evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = eventData.start_time ? eventData.start_time.substring(0, 5) : '';
        
        dateEl.innerText = `${dateStr}, ${timeStr} • ${eventData.location_name}`;
        countEl.innerText = `${eventData.volunteers_needed} Total Needed`;

    } catch (err) {
        console.error("Failed to load hero event:", err);
        titleEl.innerText = "Error Loading Event";
    }
});