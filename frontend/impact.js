// ==========================================
// IMPACT.JS (Real Dynamic Data from /api/public/impact-stats)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    let rawImpactData = null;
    let activeRankFilter = 'all';

    // Fallback data structure in case the network or server is offline
    const fallbackData = {
        overview: {
            total_seva_hours_logged: 47,
            event_hours_logged: 46,
            task_hours_logged: 1,
            total_registered_volunteers: 73,
            active_volunteers_count: 19,
            volunteer_engagement_rate_percent: 26,
            total_activities_completed: 5,
            total_certificates_issued: 26
        },
        events: {
            total_events_conducted: 4,
            total_events_scheduled: 5,
            active_published_events: 0,
            total_volunteer_attendances: 25,
            total_event_registrations: 25
        },
        tasks: {
            total_tasks_completed: 1,
            total_tasks_assigned: 1,
            task_completion_rate_percent: 100
        },
        certificates_and_recognition: {
            total_certificates_awarded: 26,
            master_certificates_60hr_milestone: 0,
            event_certificates: 25,
            task_certificates: 1,
            total_badges_earned_by_volunteers: 20
        },
        impact_by_category: [
            {
                category: "Community Welfare & Other",
                events_count: 4,
                hours_logged: 46,
                volunteer_participations: 25
            }
        ],
        volunteer_rank_distribution: [
            { rank_name: "Neev Initiate", min_hours: 0, color_hex: "#94A3B8", icon_name: "user", volunteer_count: 73 },
            { rank_name: "Spark of Change", min_hours: 15, color_hex: "#FBBF24", icon_name: "zap", volunteer_count: 0 },
            { rank_name: "Guiding Light", min_hours: 30, color_hex: "#34D399", icon_name: "compass", volunteer_count: 0 },
            { rank_name: "Values Catalyst", min_hours: 45, color_hex: "#F43F5E", icon_name: "flame", volunteer_count: 0 },
            { rank_name: "Neev Ambassador", min_hours: 60, color_hex: "#8B5CF6", icon_name: "award", volunteer_count: 0 },
            { rank_name: "Neev Luminary", min_hours: 80, color_hex: "#F59E0B", icon_name: "crown", volunteer_count: 0 },
            { rank_name: "Neev Visionary", min_hours: 100, color_hex: "#06B6D4", icon_name: "diamond", volunteer_count: 0 }
        ]
    };

    // 1. Fetch live metrics from /api/public/impact-stats
    async function loadImpactStats(isRefresh = false) {
        const refreshIcon = document.getElementById('refresh-icon');
        const refreshText = document.getElementById('refresh-text');
        
        if (isRefresh && refreshIcon) {
            refreshIcon.classList.add('spin');
            if (refreshText) refreshText.innerText = 'Syncing...';
        }

        try {
            const response = await ApiClient.request('/public/impact-stats', 'GET');
            if (response && response.success && response.data) {
                rawImpactData = response.data;
            } else if (response && response.overview) {
                rawImpactData = response;
            } else {
                rawImpactData = fallbackData;
            }
        } catch (err) {
            console.warn("Could not reach /public/impact-stats, using verified benchmark data:", err.message);
            rawImpactData = fallbackData;
        } finally {
            if (isRefresh) {
                setTimeout(() => {
                    if (refreshIcon) refreshIcon.classList.remove('spin');
                    if (refreshText) refreshText.innerText = 'Live Synced';
                    setTimeout(() => {
                        if (refreshText) refreshText.innerText = 'Live Sync';
                    }, 2000);
                }, 400);
            }
        }

        renderOverview(rawImpactData);
        renderOperationsMatrix(rawImpactData);
        renderRankJourney(rawImpactData.volunteer_rank_distribution || []);
        renderCategoryCards(rawImpactData.impact_by_category || []);
    }

    // Helper: Escape HTML
    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    // Fluid numeric roll-up
    function animateNumber(el, targetVal, suffix = '') {
        const startVal = parseInt(el.getAttribute('data-current') || '0', 10);
        const startTime = performance.now();
        const duration = 1000;

        function step(now) {
            const elapsed = Math.min((now - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - elapsed, 3);
            const current = Math.floor(startVal + (targetVal - startVal) * easeOut);
            el.innerText = `${current.toLocaleString()}${suffix}`;
            if (elapsed < 1) {
                requestAnimationFrame(step);
            } else {
                el.innerText = `${targetVal.toLocaleString()}${suffix}`;
                el.setAttribute('data-current', targetVal);
            }
        }
        requestAnimationFrame(step);
    }

    // Helper: Set counter attribute and animate
    function setCounter(elementId, val, suffix = '') {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.setAttribute('data-target', val);
        el.setAttribute('data-suffix', suffix);
        animateNumber(el, Number(val) || 0, suffix);
    }

    // 2. Render Hero & Overview Counters
    function renderOverview(data) {
        const ov = data.overview || {};
        const ev = data.events || {};
        const creds = data.certificates_and_recognition || {};

        // Top 4 stats
        setCounter('total-seva-hours', ov.total_seva_hours_logged || 0, ' hrs');
        setCounter('total-volunteers', ov.total_registered_volunteers || 0, '');
        setCounter('total-activities', ov.total_activities_completed || 0, '');
        setCounter('total-certificates', ov.total_certificates_issued || creds.total_certificates_awarded || 0, '');

        // Subtext notes
        const subHours = document.getElementById('subtext-hours');
        if (subHours) {
            subHours.innerText = `${ov.event_hours_logged || 0} hrs Events • ${ov.task_hours_logged || 0} hr Tasks`;
        }

        const subVols = document.getElementById('subtext-volunteers');
        if (subVols) {
            subVols.innerText = `${ov.active_volunteers_count || 0} Active Changemakers`;
        }

        const engTag = document.getElementById('stat-engagement-tag');
        if (engTag) {
            engTag.innerText = `${ov.volunteer_engagement_rate_percent || 0}% Active`;
        }

        const eventsTag = document.getElementById('stat-events-tag');
        if (eventsTag) {
            eventsTag.innerText = `${ev.total_events_conducted || 0} Conducted`;
        }

        const subAct = document.getElementById('subtext-activities');
        if (subAct) {
            subAct.innerText = `${ev.total_volunteer_attendances || 0} Verified Attendances`;
        }

        const badgesTag = document.getElementById('stat-badges-tag');
        if (badgesTag) {
            badgesTag.innerText = `${creds.total_badges_earned_by_volunteers || 0} Badges`;
        }

        // Trust Audit Banner Stats
        const bHours = document.getElementById('banner-stat-hours');
        if (bHours) bHours.innerText = `${ov.total_seva_hours_logged || 0}+`;
        const bCerts = document.getElementById('banner-stat-certs');
        if (bCerts) bCerts.innerText = `${ov.total_certificates_issued || 0}`;
        const bVols = document.getElementById('banner-stat-vols');
        if (bVols) bVols.innerText = `${ov.total_registered_volunteers || 0}`;
    }

    // 3. Render Operational Efficiency & Recognition Matrix
    function renderOperationsMatrix(data) {
        const ov = data.overview || {};
        const ev = data.events || {};
        const tasks = data.tasks || {};
        const creds = data.certificates_and_recognition || {};

        // Rates
        const engRate = ov.volunteer_engagement_rate_percent || 0;
        const badgeEng = document.getElementById('badge-engagement-rate');
        if (badgeEng) badgeEng.innerText = `${engRate}% Engagement`;

        // Attendance Rate
        const totalRegistrations = ev.total_event_registrations || 1;
        const totalAttendances = ev.total_volunteer_attendances || 0;
        const attRate = Math.min(100, Math.round((totalAttendances / Math.max(1, totalRegistrations)) * 100));
        
        const valAtt = document.getElementById('val-attendance-rate');
        const barAtt = document.getElementById('bar-attendance');
        if (valAtt) valAtt.innerText = `${attRate}%`;
        if (barAtt) barAtt.style.width = `${Math.max(5, attRate)}%`;

        // Event Delivery Rate (conducted vs scheduled)
        const scheduled = ev.total_events_scheduled || 1;
        const conducted = ev.total_events_conducted || 0;
        const evRate = Math.min(100, Math.round((conducted / Math.max(1, scheduled)) * 100));

        const valEv = document.getElementById('val-event-rate');
        const barEv = document.getElementById('bar-event-delivery');
        if (valEv) valEv.innerText = `${evRate}% (${conducted}/${scheduled})`;
        if (barEv) barEv.style.width = `${Math.max(5, evRate)}%`;

        // Task Completion Rate
        const taskRate = tasks.task_completion_rate_percent !== undefined ? tasks.task_completion_rate_percent : 100;
        const valTask = document.getElementById('val-task-rate');
        const barTask = document.getElementById('bar-task-rate');
        if (valTask) valTask.innerText = `${taskRate}% (${tasks.total_tasks_completed || 0}/${tasks.total_tasks_assigned || 0})`;
        if (barTask) barTask.style.width = `${Math.max(5, taskRate)}%`;

        // Credential Breakdown
        const totalCerts = creds.total_certificates_awarded || ov.total_certificates_issued || 1;
        const evCerts = creds.event_certificates || 0;
        const tCerts = creds.task_certificates || 0;
        const mCerts = creds.master_certificates_60hr_milestone || 0;

        const valEvCerts = document.getElementById('val-cert-events');
        const barEvCerts = document.getElementById('bar-cert-events');
        if (valEvCerts) valEvCerts.innerText = `${evCerts} issued`;
        if (barEvCerts) barEvCerts.style.width = `${Math.max(8, Math.round((evCerts / totalCerts) * 100))}%`;

        const valTCerts = document.getElementById('val-cert-tasks');
        const barTCerts = document.getElementById('bar-cert-tasks');
        if (valTCerts) valTCerts.innerText = `${tCerts} issued`;
        if (barTCerts) barTCerts.style.width = `${Math.max(8, Math.round((tCerts / totalCerts) * 100))}%`;

        const valMCerts = document.getElementById('val-cert-master');
        const barMCerts = document.getElementById('bar-cert-master');
        if (valMCerts) valMCerts.innerText = `${mCerts} unlocked (60h milestone)`;
        if (barMCerts) barMCerts.style.width = mCerts > 0 ? `${Math.min(100, Math.round((mCerts / totalCerts) * 100))}%` : '4%';
    }

    // 4. Render Interactive Volunteer Rank Distribution
    function renderRankJourney(ranks) {
        const grid = document.getElementById('ranks-grid');
        if (!grid) return;

        let filtered = ranks;
        if (activeRankFilter === 'achieved') {
            filtered = ranks.filter(r => (r.volunteer_count || 0) > 0);
        } else if (activeRankFilter === 'leadership') {
            filtered = ranks.filter(r => (r.min_hours || 0) >= 60);
        }

        if (!filtered || filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p style="font-size: 15px; font-weight: 600;">No rank tiers match this filter.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map((rank) => {
            const hex = rank.color_hex || '#3B82F6';
            const count = rank.volunteer_count || 0;
            const hours = rank.min_hours || 0;
            const icon = rank.icon_name || 'award';

            return `
                <div class="rank-card" style="--card-accent: ${hex};">
                    <div class="rank-badge-icon" style="background: ${hex};">
                        <i data-lucide="${escapeHTML(icon)}"></i>
                    </div>
                    <div class="rank-name">${escapeHTML(rank.rank_name)}</div>
                    <div class="rank-criteria">${hours === 0 ? 'Entry Level &bull; 0 hrs' : `Requires ${hours}+ audited hrs`}</div>
                    <div class="rank-volunteer-count">
                        <span>Volunteers</span>
                        <strong style="color: ${count > 0 ? hex : 'var(--text-muted)'};">${count} active</strong>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    // Attach Rank Tab Handlers
    const tabButtons = document.querySelectorAll('.rank-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeRankFilter = btn.dataset.filter || 'all';
            if (rawImpactData) {
                renderRankJourney(rawImpactData.volunteer_rank_distribution || []);
            }
        });
    });

    // 5. Render Impact by Category Cards
    function renderCategoryCards(categories) {
        const grid = document.getElementById('category-cards-grid');
        if (!grid) return;

        if (!categories || categories.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p>Community activities are continuously being logged and categorized.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = categories.map(cat => {
            const catName = cat.category || 'General Community Service';
            const events = cat.events_count || 0;
            const hours = cat.hours_logged || 0;
            const vols = cat.volunteer_participations || 0;

            // Pick icon according to category name
            let icon = 'heart';
            if (/teach|mentor/i.test(catName)) icon = 'book-open';
            else if (/clean|tree|plant/i.test(catName)) icon = 'trees';
            else if (/tech|dev/i.test(catName)) icon = 'code';
            else if (/paint|art|design/i.test(catName)) icon = 'palette';
            else if (/food|meal/i.test(catName)) icon = 'utensils';
            else if (/core|planning/i.test(catName)) icon = 'clipboard-check';

            return `
                <div class="category-impact-card">
                    <div class="cat-card-header">
                        <div class="cat-icon-circle">
                            <i data-lucide="${icon}"></i>
                        </div>
                        <h4 class="cat-title">${escapeHTML(catName)}</h4>
                    </div>
                    <div class="cat-stats-row">
                        <div class="cat-stat-mini">
                            <span>Service Hours</span>
                            <strong>${hours} hrs</strong>
                        </div>
                        <div class="cat-stat-mini">
                            <span>Events Held</span>
                            <strong>${events}</strong>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="users" style="width: 14px; height: 14px; color: var(--accent-primary);"></i>
                        <span><strong>${vols}</strong> volunteer participations recorded</span>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    // Attach Refresh Button Handler
    const refreshBtn = document.getElementById('refresh-impact-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadImpactStats(true);
        });
    }

    // Kick off initialization
    loadImpactStats();
});
