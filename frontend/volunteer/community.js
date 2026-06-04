// ==========================================
// COMMUNITY.JS (Social Interactions)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. Render Mock Feed
    function renderFeed() {
        const feedContainer = document.getElementById('live-feed');
        const posts = [
            { name: "Rahul Desai", avatar: "RD", action: "checked in to", event: "Juhu Beach Cleanup", hours: 4, time: "2 hours ago", likes: 12 },
            { name: "Aisha Patel", avatar: "AP", action: "earned a new badge:", event: "Environment Champion", hours: null, time: "5 hours ago", likes: 8 },
            { name: "Global Alert", avatar: "🌍", action: "milestone reached:", event: "50,000 Community Hours", hours: null, time: "1 day ago", likes: 45 }
        ];

        feedContainer.innerHTML = posts.map(post => `
            <div class="feed-post reveal">
                <div class="post-header">
                    <div class="post-avatar">${post.avatar}</div>
                    <div class="post-meta">
                        <h4>${post.name}</h4>
                        <span>${post.time}</span>
                    </div>
                </div>
                <div class="post-body">
                    ${post.name} ${post.action} <span class="post-highlight">${post.event}</span>!
                    ${post.hours ? `<br>Earned <strong>${post.hours} verified hours.</strong>` : ''}
                </div>
                <div class="post-actions">
                    <button class="action-btn high-five-btn" data-likes="${post.likes}">
                        <i data-lucide="hand"></i> <span class="like-count">${post.likes}</span> High Fives
                    </button>
                </div>
            </div>
        `).join('');

        // Attach High-Five Logic
        document.querySelectorAll('.high-five-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.toggle('active');
                let countSpan = this.querySelector('.like-count');
                let currentLikes = parseInt(this.dataset.likes);
                countSpan.innerText = this.classList.contains('active') ? currentLikes + 1 : currentLikes;
            });
        });
    }

    // 2. Leaderboard Tab Logic
    const lbTabs = document.querySelectorAll('.lb-tab');
    const lbContent = document.getElementById('leaderboard-list');

    const boardData = {
        city: [
            { name: "Priya Sharma", tag: "Mumbai", hrs: 142 },
            { name: "Rahul Desai", tag: "Mumbai", hrs: 118 },
            { name: "Anita Patel", tag: "Mumbai", hrs: 95 },
            { name: "Vikram Singh", tag: "Mumbai", hrs: 88 }
        ],
        college: [
            { name: "IIT Bombay", tag: "1,200 active", hrs: "14k" },
            { name: "St. Xaviers", tag: "980 active", hrs: "12k" },
            { name: "NMIMS", tag: "850 active", hrs: "9.5k" }
        ],
        global: [
            { name: "Samira Khan", tag: "Delhi", hrs: 310 },
            { name: "John Davis", tag: "London", hrs: 285 },
            { name: "Chen Wei", tag: "Singapore", hrs: 240 }
        ]
    };

    function renderBoard(type) {
        const data = boardData[type];
        lbContent.innerHTML = data.map((item, index) => {
            let rankClass = index < 3 ? `rank-${index + 1}` : '';
            return `
                <div class="lb-row">
                    <div class="lb-rank ${rankClass}">#${index + 1}</div>
                    <div class="lb-user">
                        <div class="lb-user-avatar">${item.name.charAt(0)}</div>
                        <div class="lb-user-info">
                            <h5>${item.name}</h5>
                            <span>${item.tag}</span>
                        </div>
                    </div>
                    <div class="lb-score">${item.hrs} ${type === 'college' ? 'hrs' : 'h'}</div>
                </div>
            `;
        }).join('');
    }

    lbTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            lbTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderBoard(tab.dataset.board);
        });
    });

    // Initialize
    renderFeed();
    renderBoard('city');
    lucide.createIcons();
});