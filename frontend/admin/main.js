/* =========================================
   MAIN.JS (Global Layout, Theme & Admin Modal)
   ========================================= */

// 1. THEME MANAGEMENT
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    syncThemeIcons();
}

function syncThemeIcons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Header icons (legacy/fallback if present)
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    if (moon && sun) {
        moon.style.display = isDark ? 'none' : 'block';
        sun.style.display = isDark ? 'block' : 'none';
    }

    // Modal theme icons & toggle state
    const modalMoon = document.getElementById('modal-theme-icon-moon');
    const modalSun = document.getElementById('modal-theme-icon-sun');
    if (modalMoon && modalSun) {
        modalMoon.style.display = isDark ? 'none' : 'block';
        modalSun.style.display = isDark ? 'block' : 'none';
    }

    const modalSwitch = document.getElementById('modal-theme-toggle-switch');
    if (modalSwitch) {
        if (isDark) {
            modalSwitch.classList.add('dark-active');
            modalSwitch.setAttribute('aria-checked', 'true');
        } else {
            modalSwitch.classList.remove('dark-active');
            modalSwitch.setAttribute('aria-checked', 'false');
        }
    }

    const modalStatusText = document.getElementById('modal-theme-status-text');
    if (modalStatusText) {
        modalStatusText.textContent = isDark ? 'Dark appearance enabled' : 'Light appearance enabled';
    }
}

// 2. ADMIN PROFILE BOTTOM SHEET MODAL
function openAdminModal() {
    const modalOverlay = document.getElementById('admin-modal-overlay');
    if (!modalOverlay) return;
    
    syncAdminProfile();
    syncThemeIcons();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent background scrolling

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function closeAdminModal() {
    const modalOverlay = document.getElementById('admin-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

function handleAdminOverlayClick(e) {
    if (e.target.id === 'admin-modal-overlay') {
        closeAdminModal();
    }
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdminModal();
    }
});

// 3. ADMIN PROFILE & SESSION SYNC
function syncAdminProfile() {
    try {
        const stored = localStorage.getItem('samithi_user');
        let user = {};
        if (stored) {
            try { user = JSON.parse(stored); } catch (e) { user = {}; }
        }

        const fName = user.firstName || user.first_name || 'Master';
        const lName = user.lastName || user.last_name || 'Admin';
        const fullName = `${fName} ${lName}`.trim() || 'Master Admin';
        const initial = fName.charAt(0).toUpperCase() || 'M';
        const rawRole = (user.role || 'admin').toLowerCase();
        const roleBadge = rawRole === 'admin' ? 'Admin' : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));
        const fullRole = rawRole === 'admin' ? 'System Administrator' : roleBadge;
        const email = user.email || 'admin@sevalog.in';

        // Header Elements (Initial circle button)
        const headerAvatar = document.getElementById('header-user-avatar');
        if (headerAvatar) headerAvatar.textContent = initial;

        // Modal Elements
        const modalAvatar = document.getElementById('modal-user-avatar');
        const modalName = document.getElementById('modal-user-name');
        const modalRoleBadge = document.getElementById('modal-user-role-badge');
        const modalUserEmail = document.getElementById('modal-user-email');
        const modalInfoRole = document.getElementById('modal-info-role');

        if (modalAvatar) modalAvatar.textContent = initial;
        if (modalName) modalName.textContent = fullName;
        if (modalRoleBadge) modalRoleBadge.textContent = roleBadge;
        if (modalUserEmail) modalUserEmail.textContent = email;
        if (modalInfoRole) modalInfoRole.textContent = fullRole;
    } catch (e) {
        console.warn("[Admin] Could not parse session for profile display:", e);
    }
}

// 4. GLOBAL INITIALIZATION & LOGOUT LISTENER
document.addEventListener('DOMContentLoaded', () => {
    syncThemeIcons();
    syncAdminProfile();
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    setTimeout(() => {
        document.body.classList.remove('preload');
    }, 1);
});

// Resilient Logout Click Handler
document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
        e.preventDefault();
        closeAdminModal();
        if (typeof ApiClient !== 'undefined' && ApiClient.clearSession) {
            ApiClient.clearSession();
        } else {
            localStorage.removeItem('samithi_token');
            localStorage.removeItem('samithi_user');
            const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
            window.location.replace(prefix + 'login.html');
        }
    }
});
