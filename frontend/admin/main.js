/* =========================================
   MAIN.JS (Global Layout, Theme & Database)
   ========================================= */

// 1. SUPABASE INITIALIZATION (Global Variable)
// Because this is in main.js, ALL other JS files can now use the `_supabase` variable!
const SB_URL = "https://lvkgvmtmeyonifmxzcmo.supabase.co";
const SB_KEY = "sb_publishable_Zu5ag__-tMgzRkt7ATDtjQ_dZQAR-XF";                   
const _supabase = supabase.createClient(SB_URL, SB_KEY);


// 2. THEME MANAGEMENT
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
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    
    // Safety check in case a page doesn't have the theme toggle button
    if (moon && sun) {
        if (isDark) {
            moon.style.display = 'none';
            sun.style.display = 'block';
        } else {
            moon.style.display = 'block';
            sun.style.display = 'none';
        }
    }
}


// 3. SIDEBAR MEMORY LOGIC
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return; // Safety check

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
        // Save state to Local Storage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarState', isCollapsed ? 'closed' : 'open');
    }
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
}

// 4. GLOBAL INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    syncThemeIcons();
    
    // Give the browser 1 millisecond to paint the UI, then turn transitions back on!
    setTimeout(() => {
        document.body.classList.remove('preload');
    }, 1);
});


// ==========================================
// 5. THE ROUTE GUARD (Security Bouncer)
// ==========================================

async function enforceAdminSecurity() {
    // 1. Check which page we are currently on
    const currentPath = window.location.pathname;
    
    // We don't want to block people from the login page or the 404 page!
    if (currentPath.includes('login.html') || currentPath.includes('404.html')) {
        return; 
    }

    // 2. Check if the browser has a logged-in session
    const { data: { session } } = await _supabase.auth.getSession();

    if (!session) {
        // Not logged in! Kick them to 404.
        window.location.replace('404.html');
        return;
    }

    // 3. Double-check they are an Admin (in case a volunteer somehow got here)
    const { data: profile } = await _supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        // Log them out and kick them to 404
        await _supabase.auth.signOut();
        window.location.replace('404.html');
    }
}

// 4. Run the security check the millisecond the page starts loading
enforceAdminSecurity();