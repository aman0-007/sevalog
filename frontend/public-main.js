// ==========================================
// PUBLIC-MAIN.JS (Global Public Scripts)
// ==========================================

const SB_URL = "https://lvkgvmtmeyonifmxzcmo.supabase.co";
const SB_KEY = "sb_publishable_Zu5ag__-tMgzRkt7ATDtjQ_dZQAR-XF";                   
const _supabase = supabase.createClient(SB_URL, SB_KEY);

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Icons
    lucide.createIcons();

    // 1b. Volunteer header/profile updates and logout
    async function initializeVolunteerHeader() {
        const logoutBtn = document.getElementById('logout-btn');
        const nameElement = document.getElementById('user-name-top');
        const initialElement = document.getElementById('user-initial');
        const welcomeElement = document.getElementById('welcome-text');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                await _supabase.auth.signOut();
                window.location.href = '../login.html';
            });
        }

        if (!nameElement && !initialElement && !welcomeElement) return;

        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const displayName = profile?.full_name || user.email || 'Volunteer';
        const firstName = displayName.split(' ')[0];

        if (welcomeElement) welcomeElement.innerText = `Welcome back, ${firstName}!`;
        if (nameElement) nameElement.innerText = displayName;
        if (initialElement) initialElement.innerText = displayName.charAt(0).toUpperCase();
    }

    initializeVolunteerHeader();

    // 2. Dynamic Floating Navbar Logic
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (!navbar) return;
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Mobile Hamburger Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const iconElement = mobileBtn.querySelector('i');

            // Prefer toggling the navbar 'menu-active' class (matches CSS rules)
            const navbarEl = document.getElementById('navbar');
            if (navbarEl) {
                navbarEl.classList.toggle('menu-active');
                const isOpen = navbarEl.classList.contains('menu-active');
                if (iconElement) iconElement.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                lucide.createIcons(); // Re-render icon state
                return;
            }

            // Fallback: toggle a sidebar element if present (older pages)
            if (sidebar) {
                sidebar.classList.toggle('open');
                const isOpen = sidebar.classList.contains('open');
                if (iconElement) iconElement.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                lucide.createIcons();
            }
        });
    }

    // 4. Scroll Reveal Animations
    const observerOptions = {
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px" 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach((el) => {
        observer.observe(el);
    });

    // 5. Fetch Latest Event for Hero Card
    async function loadHeroEvent() {
        // Ensure Supabase is connected
        if (typeof _supabase === 'undefined') return;

        const titleEl = document.getElementById('hero-event-title');
        const dateEl = document.getElementById('hero-event-date');
        const countEl = document.getElementById('hero-event-count');

        if (!titleEl) return; // Exit if not on the homepage

        try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];

            // Query Supabase: Get nearest upcoming event + registration count
            const { data, error } = await _supabase
                .from('events')
                .select('*, registrations(id)')
                .eq('status', 'upcoming')
                .gte('event_date', today) // Must be today or in the future
                .order('event_date', { ascending: true }) // Get the closest one
                .limit(1)
                .single(); // We only need one event

            if (error || !data) {
                titleEl.innerText = "No Upcoming Events";
                dateEl.innerText = "Check back later!";
                countEl.innerText = "0 / 0";
                return;
            }

            // Update UI with real data
            titleEl.innerText = data.title;
            
            // Format Date (e.g., "Oct 24, 09:00 AM")
            const evDate = new Date(data.event_date);
            const dateStr = evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = data.start_time ? data.start_time.substring(0, 5) : '';
            dateEl.innerText = `${dateStr}, ${timeStr}`;

            // Calculate Volunteer Ratio
            const currentRegs = data.registrations ? data.registrations.length : 0;
            const maxVols = data.max_volunteers || 0;
            countEl.innerText = `${currentRegs} / ${maxVols}`;

            // Optional: If event is full, change text color
            if (currentRegs >= maxVols && maxVols > 0) {
                countEl.style.color = "#10B981"; // Green color indicating full
                countEl.innerText += " (Full)";
            }

        } catch (err) {
            console.error("Failed to load hero event:", err);
        }
    }

    loadHeroEvent();

    // 6. Smooth Number Counting Animation
    const counters = document.querySelectorAll('.counter');
    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endValue = parseInt(target.getAttribute('data-target'));
                const suffix = target.getAttribute('data-suffix') || '';
                const duration = 2000; // Animation duration in ms (2 seconds)
                let startTime = null;

                const countUp = (currentTime) => {
                    if (!startTime) startTime = currentTime;
                    const progress = Math.min((currentTime - startTime) / duration, 1);
                    
                    // Cubic easing out for a smooth slow-down at the end
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    const currentVal = Math.floor(easeProgress * endValue);
                    
                    // Format with commas and suffix
                    target.innerText = currentVal.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(countUp);
                    } else {
                        target.innerText = endValue.toLocaleString() + suffix;
                    }
                };
                
                requestAnimationFrame(countUp);
                observer.unobserve(target); // Only animate once
            }
        });
    }, { threshold: 0.5 }); // Trigger when 50% of the element is visible

    counters.forEach(counter => counterObserver.observe(counter));

});