//Handles data specific to the index.html page

document.addEventListener('DOMContentLoaded', async () => {
    const cardEl = document.getElementById('hero-visual-card');
    const headerEl = document.getElementById('hero-event-header');
    const iconEl = document.getElementById('hero-event-icon');
    const titleEl = document.getElementById('hero-event-title');
    const dateEl = document.getElementById('hero-event-date');
    const countEl = document.getElementById('hero-event-count');
    const statsEl = document.getElementById('hero-event-stats');
    const btnEl = document.getElementById('hero-event-btn');

    if (!titleEl) return; 

    function renderEmptyState(customMsg) {
        if (cardEl) cardEl.classList.add('is-empty');
        if (headerEl) headerEl.style.marginBottom = '0';
        if (iconEl) {
            iconEl.innerHTML = `<i data-lucide="calendar"></i>`;
        }
        titleEl.innerText = customMsg || "No Upcoming Events";
        dateEl.innerText = "Check back soon for new seva drives";
        if (statsEl) statsEl.style.display = 'none';
        if (btnEl) btnEl.style.display = 'none';
        if (window.lucide) lucide.createIcons();
    }

    try {
        const result = await ApiClient.request('/public/latest-event', 'GET');

        if (!result || !result.data) {
            renderEmptyState(result && result.message ? result.message : "No Upcoming Events");
            return;
        }

        const eventData = result.data;

        if (cardEl) cardEl.classList.remove('is-empty');
        if (headerEl) headerEl.style.marginBottom = '20px';
        if (iconEl) {
            iconEl.innerHTML = `<i data-lucide="calendar-check"></i>`;
        }

        titleEl.innerText = eventData.title;
        
        // Format Date safely
        const evDate = new Date(eventData.event_date);
        const dateStr = evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = eventData.start_time ? eventData.start_time.substring(0, 5) : '';
        
        dateEl.innerText = `${dateStr}${timeStr ? ', ' + timeStr : ''} • ${eventData.location_name || 'Community Center'}`;
        if (countEl) countEl.innerText = `${eventData.volunteers_needed || 0} Total Needed`;
        if (statsEl) statsEl.style.display = 'flex';
        if (btnEl) btnEl.style.display = 'flex';
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error("Failed to load hero event:", err);
        renderEmptyState("No Upcoming Events");
    }
});