// ==========================================
// PUBLIC-MAIN.JS (Global Public Scripts)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

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
                if (typeof lucide !== 'undefined') lucide.createIcons(); // Re-render icon state
                return;
            }

            // Fallback: toggle a sidebar element if present (older pages)
            if (sidebar) {
                sidebar.classList.toggle('open');
                const isOpen = sidebar.classList.contains('open');
                if (iconElement) iconElement.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                if (typeof lucide !== 'undefined') lucide.createIcons();
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

    // 5. Smooth Number Counting Animation
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