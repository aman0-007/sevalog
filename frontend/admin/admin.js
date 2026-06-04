async function initDashboard() {
    try {
        // Fetch Stats
        const { count: volCount } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: eventCount } = await _supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'upcoming');
        const { count: regCount } = await _supabase.from('registrations').select('*', { count: 'exact', head: true });

        // Update UI
        document.getElementById('stat-volunteers').innerText = volCount || 0;
        document.getElementById('stat-events').innerText = eventCount || 0;
        document.getElementById('stat-participants').innerText = regCount || 0;

        // Fetch Recent
        const { data: recentRegs } = await _supabase.from('registrations').select('created_at, profiles(full_name)').order('registration_date', { ascending: false }).limit(4);
        const listContainer = document.getElementById('recent-reg-list');
        
        if (!recentRegs || recentRegs.length === 0) {
            listContainer.innerHTML = "<p class='loading-text'>No recent registrations.</p>";
            return;
        }

        listContainer.innerHTML = recentRegs.map(reg => `
            <div class="activity-item">
                <div class="avatar" style="width: 36px; height: 36px; font-size: 14px;">${reg.profiles?.full_name?.charAt(0) || 'V'}</div>
                <div>
                    <h4 style="font-size: 15px; font-weight: 600;">${reg.profiles?.full_name || 'Anonymous'}</h4>
                    <p style="font-size: 13px; color: var(--text-muted);">Joined on ${new Date(reg.registration_date || reg.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');

        lucide.createIcons(); // Re-run for dynamically injected icons

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);