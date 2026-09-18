// ==========================================
// COMMUNITY.JS (Real API Integration & PWA Tab Switcher)
// ==========================================

// Global Mobile Tab Switcher: Immediately available regardless of lifecycle state
window.switchCommunityTab = function(target) {
    const communityGrid = document.getElementById('community-grid');
    const mobileTabs = document.querySelectorAll('.comm-mobile-tab-btn');
    const feedBtn = document.getElementById('tab-btn-feed');
    const lbBtn = document.getElementById('tab-btn-leaderboard');

    if (!communityGrid) return;

    if (target === 'leaderboard') {
        communityGrid.classList.remove('show-feed');
        communityGrid.classList.add('show-leaderboard');
        if (feedBtn) {
            feedBtn.classList.remove('active');
            feedBtn.setAttribute('aria-selected', 'false');
        }
        if (lbBtn) {
            lbBtn.classList.add('active');
            lbBtn.setAttribute('aria-selected', 'true');
        }
        // If board renderer exists and hasn't loaded, trigger load
        if (typeof window.renderCommunityBoard === 'function') {
            window.renderCommunityBoard(window.currentBoardFilter || 'global');
        }
    } else {
        communityGrid.classList.remove('show-leaderboard');
        communityGrid.classList.add('show-feed');
        if (lbBtn) {
            lbBtn.classList.remove('active');
            lbBtn.setAttribute('aria-selected', 'false');
        }
        if (feedBtn) {
            feedBtn.classList.add('active');
            feedBtn.setAttribute('aria-selected', 'true');
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.onCommunityTabSwitched = function(target) {
    if (target === 'leaderboard' && typeof window.renderCommunityBoard === 'function') {
        window.renderCommunityBoard(window.currentBoardFilter || 'global');
    }
};

let communityInitialized = false;

async function initCommunity() {
    if (communityInitialized) return;
    communityInitialized = true;

    // 1. Auth Check
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    if (!token) {
        window.location.href = '../login.html'; 
        return;
    }

    // 2. Attach Mobile View Toggle Tab Listeners with Touch/Click Dual-Support
    const mobileTabs = document.querySelectorAll('.comm-mobile-tab-btn');
    let lastTabTapTime = 0;

    mobileTabs.forEach(btn => {
        const handleTabSwitch = (e) => {
            const now = Date.now();
            if (now - lastTabTapTime < 300) return; // Prevent double-triggering from touch+click
            lastTabTapTime = now;

            const target = btn.dataset.target || (btn.id === 'tab-btn-leaderboard' ? 'leaderboard' : 'feed');
            window.switchCommunityTab(target);
        };

        btn.addEventListener('click', handleTabSwitch);
        btn.addEventListener('touchend', handleTabSwitch, { passive: true });
    });

    // 3. Render Real Activity Feed
    async function renderFeed() {
        const feedContainer = document.getElementById('live-feed');
        if (!feedContainer) return;
        feedContainer.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading live feed...</div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        try {
            const response = await ApiClient.request('/volunteer/feed?limit=15', 'GET');
            const posts = response.data || [];

            if (posts.length === 0) {
                feedContainer.innerHTML = `
                    <div class="empty-state-card">
                        <div class="empty-state-icon">
                            <i data-lucide="activity"></i>
                        </div>
                        <h4 class="empty-state-title">No Recent Activity</h4>
                        <p class="empty-state-desc">Live community actions and verified hours will appear here in real time as volunteers participate.</p>
                        <a href="my-events.html" class="empty-state-action">
                            <i data-lucide="calendar"></i> Explore Events
                        </a>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            feedContainer.innerHTML = posts.map(post => {
                const date = new Date(post.timestamp);
                const timeString = isNaN(date.getTime()) 
                    ? 'Just now' 
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const avatar = `${(post.first_name || 'V').charAt(0)}${post.last_name_initial || ''}`;

                return `
                <div class="feed-post reveal">
                    <div class="post-header">
                        <div class="post-avatar">${avatar}</div>
                        <div class="post-meta">
                            <h4>${post.first_name || 'Volunteer'} ${post.last_name_initial ? post.last_name_initial + '.' : ''}</h4>
                            <span>${timeString}</span>
                        </div>
                    </div>
                    <div class="post-body">
                        ${post.action || 'Participated in community service'} 
                        ${post.event_title ? `<br><span class="post-highlight">${post.event_title}</span>` : ''}
                    </div>
                    <div class="post-actions">
                        <button class="action-btn high-five-btn" type="button" aria-label="High Five">
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

            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error("Failed to load feed:", error);
            feedContainer.innerHTML = `
                <div class="empty-state-card">
                    <div class="empty-state-icon" style="color: #EF4444; background: rgba(239, 68, 68, 0.08);">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <h4 class="empty-state-title">Unable to Load Stream</h4>
                    <p class="empty-state-desc">We couldn't connect to the live community stream right now.</p>
                    <button class="empty-state-action" type="button" onclick="window.refreshCommunityFeed()">
                        <i data-lucide="refresh-cw"></i> Try Again
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // Expose refresh function
    window.refreshCommunityFeed = renderFeed;

    // 4. Leaderboard Logic
    const lbTabs = document.querySelectorAll('.lb-tab');
    const lbContent = document.getElementById('leaderboard-list');
    window.currentBoardFilter = 'global';

    async function renderBoard(filterType) {
        if (!lbContent) return;
        window.currentBoardFilter = filterType;
        lbContent.innerHTML = '<div class="loading-state"><i data-lucide="loader-2" class="spin"></i> Loading rankings...</div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const response = await ApiClient.request(`/volunteer/leaderboard?type=${filterType}`, 'GET');
            const data = response.data || [];

            if (data.length === 0) {
                lbContent.innerHTML = `
                    <div class="empty-state-card" style="border: none; padding: 32px 16px; box-shadow: none;">
                        <div class="empty-state-icon">
                            <i data-lucide="trophy"></i>
                        </div>
                        <h4 class="empty-state-title">No Leaderboard Data Yet</h4>
                        <p class="empty-state-desc">Ranks for this category will appear once service hours are recorded and verified.</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            lbContent.innerHTML = data.map((item, index) => {
                let rankClass = index < 3 ? `rank-${index + 1}` : '';
                return `
                    <div class="lb-row">
                        <div class="lb-rank ${rankClass}">#${index + 1}</div>
                        <div class="lb-user">
                            <div class="lb-user-avatar">${(item.first_name || 'V').charAt(0)}</div>
                            <div class="lb-user-info">
                                <h5>${item.first_name || 'Volunteer'} ${item.last_name_initial ? item.last_name_initial + '.' : ''}</h5>
                                <span>${item.group_tag || 'Active Volunteer'}</span>
                            </div>
                        </div>
                        <div class="lb-score">${item.total_hours || 0} hrs</div>
                    </div>
                `;
            }).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error("Failed to load leaderboard:", error);
            lbContent.innerHTML = `
                <div class="empty-state-card" style="border: none; padding: 32px 16px; box-shadow: none;">
                    <div class="empty-state-icon" style="color: #EF4444; background: rgba(239, 68, 68, 0.08);">
                        <i data-lucide="alert-circle"></i>
                    </div>
                    <h4 class="empty-state-title">Leaderboard Offline</h4>
                    <p class="empty-state-desc">Unable to retrieve rankings at this moment.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    window.renderCommunityBoard = renderBoard;

    // Tab Listeners for Leaderboard (Global, City, College)
    lbTabs.forEach(tab => {
        const switchLbTab = () => {
            lbTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderBoard(tab.dataset.board);
        };
        tab.addEventListener('click', switchLbTab);
        tab.addEventListener('touchend', switchLbTab, { passive: true });
    });

    // Initialize
    renderFeed();
    renderBoard('global'); // Default to global tab
    
    // Periodically refresh the live feed every 60 seconds
    setInterval(renderFeed, 60000); 
}

// Lifecycle Safe Execution (works in cached PWA and normal navigation)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommunity);
} else {
    initCommunity();
}