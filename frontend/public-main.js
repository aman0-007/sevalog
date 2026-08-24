// ==========================================
// PUBLIC-MAIN.JS (Optimized UI & Animations)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Icons
    if (window.lucide) lucide.createIcons();

    // 2. High-Performance Scroll Listener
    const navbar = document.getElementById('navbar');
    if (navbar) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    navbar.classList.toggle('scrolled', window.scrollY > 40);
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // 3. Mobile Hamburger Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const iconElement = mobileBtn.querySelector('i');
            const targetContainer = document.getElementById('navbar') || document.getElementById('sidebar');
            const toggleClass = targetContainer.id === 'navbar' ? 'menu-active' : 'open';

            if (targetContainer) {
                targetContainer.classList.toggle(toggleClass);
                const isOpen = targetContainer.classList.contains(toggleClass);
                
                if (iconElement) {
                    iconElement.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                    if (window.lucide) lucide.createIcons();
                }
            }
        });
    }

    // ==========================================
    // 3.5. Close Sidebar on Outside Click (Mobile)
    // ==========================================
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        
        // Check if the sidebar exists and is currently open
        if (sidebar && sidebar.classList.contains('open')) {
            // If the click was NOT inside the sidebar, and NOT on the menu button itself
            if (!sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
                sidebar.classList.remove('open');
                
                // Reset the hamburger icon back to 'menu'
                if (mobileBtn) {
                    const iconElement = mobileBtn.querySelector('i');
                    if (iconElement) {
                        iconElement.setAttribute('data-lucide', 'menu');
                        if (window.lucide) lucide.createIcons();
                    }
                }
            }
        }
    });

    // ==========================================
    // 3.6. User Avatar to Settings Routing
    // ==========================================
    const userProfileMenu = document.querySelector('.user-profile-menu');
    if (userProfileMenu) {
        userProfileMenu.addEventListener('click', () => {
            window.location.href = 'volunteer/settings.html';
        });
    }

    // 4. Scroll Reveal Animations
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // 5. Smooth Number Counting Animation
    const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endValue = parseInt(target.getAttribute('data-target') || 0, 10);
                const suffix = target.getAttribute('data-suffix') || '';
                let startTime = null;

                const countUp = (currentTime) => {
                    if (!startTime) startTime = currentTime;
                    const progress = Math.min((currentTime - startTime) / 2000, 1); // 2000ms duration
                    
                    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
                    const currentVal = Math.floor(easeProgress * endValue);
                    
                    target.innerText = currentVal.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(countUp);
                    }
                };
                
                requestAnimationFrame(countUp);
                obs.unobserve(target); 
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));
});