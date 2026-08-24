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
            window.location.href = '../volunteer/settings.html';
        });
    }

    // ==========================================
    // 3.7. 1:1 Real-Time Sidebar Swipe Gesture
    // ==========================================
    let touchStartX = 0;
    let touchStartY = 0;
    let currentX = 0;
    let isDragging = false;
    let isScrolling = false; // To prevent sidebar movement when scrolling down the page
    let sidebarWidth = 0;

    const sidebar = document.getElementById('sidebar');

    if (sidebar) {
        document.addEventListener('touchstart', (e) => {
            if (window.innerWidth > 900) return; // Only active on mobile
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            const isOpen = sidebar.classList.contains('open');

            // Safety Lock: To open, swipe must start near left edge (< 40px). 
            // To close, swipe can start anywhere on the open sidebar.
            if (!isOpen && touchStartX > 40) return;

            isDragging = true;
            isScrolling = false;
            sidebarWidth = sidebar.offsetWidth;

            // Remove CSS transition so it sticks instantly to the finger without lagging
            sidebar.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const deltaX = currentX - touchStartX;
            const deltaY = currentY - touchStartY;

            // Determine if the user is trying to scroll vertically instead of swiping
            if (!isScrolling && Math.abs(deltaY) > Math.abs(deltaX)) {
                isDragging = false;
                isScrolling = true;
                sidebar.style.transition = ''; // Restore animation
                sidebar.style.transform = '';  // Clear inline position
                return;
            }

            // If it's a valid horizontal swipe, calculate the exact pixel position
            const isOpen = sidebar.classList.contains('open');
            let translateX = 0;

            if (isOpen) {
                // Starts at 0px (fully visible). Dragging left (negative deltaX) pushes it off-screen.
                translateX = Math.min(0, deltaX);
            } else {
                // Starts at -sidebarWidth (hidden). Dragging right (positive deltaX) pulls it on-screen.
                translateX = -sidebarWidth + Math.max(0, deltaX);
            }

            // Clamp the values so it can't be dragged too far right or left
            translateX = Math.max(-sidebarWidth, Math.min(0, translateX));

            // Apply the exact pixel translation in real-time
            sidebar.style.transform = `translateX(${translateX}px)`;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            // Clear the inline styles and let the CSS classes take over again
            sidebar.style.transition = '';
            sidebar.style.transform = ''; 

            const deltaX = currentX - touchStartX;
            const isOpen = sidebar.classList.contains('open');
            
            // Threshold: User must drag it at least 30% of its width to commit to the action
            const threshold = sidebarWidth * 0.3; 

            if (isOpen) {
                // Was open, user dragged left to close it
                if (deltaX < -threshold) {
                    sidebar.classList.remove('open');
                    updateMenuIcon(false);
                }
            } else {
                // Was closed, user dragged right to open it
                if (deltaX > threshold) {
                    sidebar.classList.add('open');
                    updateMenuIcon(true);
                }
            }
        });

        function updateMenuIcon(isOpen) {
            if (mobileBtn) {
                const iconEl = mobileBtn.querySelector('i');
                if (iconEl) {
                    iconEl.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                    if (window.lucide) lucide.createIcons();
                }
            }
        }
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