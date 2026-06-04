// ==========================================
// IMPACT.JS (Impact Page Specific Logic)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // Fetch and render the Leaderboard Podium
    async function loadLeaderboard() {
        const podiumContainer = document.getElementById('podium-container');
        if (!podiumContainer) return;

        let topVolunteers = [];

        try {
            // Attempt to fetch real data from Supabase
            if (typeof _supabase !== 'undefined') {
                const { data, error } = await _supabase
                    .from('profiles')
                    .select('full_name, total_hours_served')
                    .order('total_hours_served', { ascending: false })
                    .limit(3);

                if (!error && data && data.length > 0) {
                    topVolunteers = data;
                }
            }
        } catch (err) {
            console.warn("Could not fetch leaderboard data, using fallback.", err);
        }

        // Fallback data if DB is empty or fails
        if (topVolunteers.length < 3) {
            topVolunteers = [
                { full_name: "Priya Sharma", total_hours_served: 142 }, // 1st
                { full_name: "Rahul Desai", total_hours_served: 118 },  // 2nd
                { full_name: "Anita Patel", total_hours_served: 95 }    // 3rd
            ];
        }

        // To build a podium, the order in HTML needs to be: 2nd, 1st, 3rd
        const podiumOrder = [
            { rank: 2, user: topVolunteers[1] },
            { rank: 1, user: topVolunteers[0] },
            { rank: 3, user: topVolunteers[2] }
        ];

        // Generate the HTML for the podium
        podiumContainer.innerHTML = podiumOrder.map(item => {
            if (!item.user) return ''; // Safety check

            // Extract first letter of name for avatar
            const initial = item.user.full_name ? item.user.full_name.charAt(0).toUpperCase() : 'V';
            const name = item.user.full_name || 'Anonymous';
            const hours = item.user.total_hours_served || 0;

            return `
                <div class="podium-item rank-${item.rank}">
                    <div class="podium-avatar">${initial}</div>
                    <div class="podium-name">${name}</div>
                    <div class="podium-hrs">${hours} hrs</div>
                    <div class="podium-block">${item.rank}</div>
                </div>
            `;
        }).join('');
    }

    // Initialize
    loadLeaderboard();
});