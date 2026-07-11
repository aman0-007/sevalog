/* =========================================
   MAIN.JS (Global Layout, Theme & Database)
   ========================================= */

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
