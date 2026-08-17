// ==========================================
// COMMUNITY.JS (Real API Integration)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Auth Check
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    if (!token) {
        window.location.href = '../login.html'; 
        return;
    }

    // 2. Render Real Activity Feed
    async function renderFeed() {
        const feedContainer = document.getElementById('live-feed');
        feedContainer.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading live feed...</div>';
        
        try {
            const response = await ApiClient.request('/volunteer/feed?limit=15', 'GET');
            const posts = response.data || [];

            if (posts.length === 0) {
                feedContainer.innerHTML = '<p class="empty-msg">No recent activity.</p>';
                return;
            }

            feedContainer.innerHTML = posts.map(post => {
                const date = new Date(post.timestamp);
                const timeString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const avatar = `${post.first_name.charAt(0)}${post.last_name_initial}`;

                return `
                <div class="feed-post reveal">
                    <div class="post-header">
                        <div class="post-avatar">${avatar}</div>
                        <div class="post-meta">
                            <h4>${post.first_name} ${post.last_name_initial}.</h4>
                            <span>${timeString}</span>
                        </div>
                    </div>
                    <div class="post-body">
                        ${post.action} 
                        ${post.event_title ? `<br><span class="post-highlight">${post.event_title}</span>` : ''}
                    </div>
                    <div class="post-actions">
                        <!-- High Fives are local/visual only for now, can be wired to a DB later -->
                        <button class="action-btn high-five-btn">
                            <i data-lucide="hand"></i> <span>High Five!</span>
                        </button>
                    </div>
                </div>`;
            }).join('');

            // Attach Visual High-Five Logic
            document.querySelectorAll('.high-five-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const span = this.querySelector('span');
                    span.innerText = this.classList.contains('active') ? 'High Fived!' : 'High Five!';
                });
            });

        } catch (error) {
            console.error("Failed to load feed:", error);
            feedContainer.innerHTML = '<p class="empty-msg" style="color:#EF4444;">Unable to load the live feed.</p>';
        }
    }

    // 3. Leaderboard Logic
    const lbTabs = document.querySelectorAll('.lb-tab');
    const lbContent = document.getElementById('leaderboard-list');

    async function renderBoard(filterType) {
        lbContent.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);"><i data-lucide="loader-2" class="spin"></i> Loading...</div>';
        if (window.lucide) lucide.createIcons();

        try {
            // Note: You will need to add this route to your Node.js backend!
            const response = await ApiClient.request(`/volunteer/leaderboard?type=${filterType}`, 'GET');
            const data = response.data || [];

            if (data.length === 0) {
                lbContent.innerHTML = '<p class="empty-msg">No data available yet.</p>';
                return;
            }

            lbContent.innerHTML = data.map((item, index) => {
                let rankClass = index < 3 ? `rank-${index + 1}` : '';
                return `
                    <div class="lb-row">
                        <div class="lb-rank ${rankClass}">#${index + 1}</div>
                        <div class="lb-user">
                            <div class="lb-user-avatar">${item.first_name.charAt(0)}</div>
                            <div class="lb-user-info">
                                <h5>${item.first_name} ${item.last_name_initial}.</h5>
                                <span>${item.group_tag || 'Global Volunteer'}</span>
                            </div>
                        </div>
                        <div class="lb-score">${item.total_hours} hrs</div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error("Failed to load leaderboard:", error);
            lbContent.innerHTML = '<p class="empty-msg" style="color:#EF4444;">Unable to load leaderboard.</p>';
        }
    }

    // Tab Listeners
    lbTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            lbTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderBoard(tab.dataset.board);
        });
    });

    // Initialize
    renderFeed();
    renderBoard('global'); // Default to global tab
    
    // Periodically refresh the live feed every 60 seconds
    setInterval(renderFeed, 60000); 

});