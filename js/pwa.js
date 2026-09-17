// ==========================================
// PWA.JS (Service Worker & Install Logic)
// ==========================================

let deferredPrompt;

// 1. Register the Service Worker with automatic updates
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('[PWA] Service Worker Registered successfully:', reg.scope);
                
                // Immediately check if there is an updated service worker on server
                reg.update().catch(() => {});

                // If an updated worker is found and already waiting, prompt/force it to activate
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[PWA] New version ready - auto activating');
                            }
                        });
                    }
                });
            })
            .catch(err => console.error('[PWA] Service Worker Registration Failed:', err));
    });

    // Check for updates when user returns to app/tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(reg => {
                reg.update().catch(() => {});
            });
        }
    });

    // When the new service worker takes control, refresh page smoothly to load new assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            console.log('[PWA] Service worker updated. Refreshing page to load latest version...');
            window.location.reload();
        }
    });
}

// 2. Handle the "Install App" prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the mini-infobar
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Find the install button in the DOM
    const installBtn = document.getElementById('install-pwa-btn');
    
    if (installBtn) {
        // Unhide the button if the app is installable
        installBtn.style.display = 'flex';
        
        installBtn.addEventListener('click', async () => {
            // Hide the button once clicked
            installBtn.style.display = 'none';
            // Show the native browser install prompt
            deferredPrompt.prompt();
            
            // Wait for the user's choice
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`[PWA] User ${outcome} the install prompt`);
            
            // Clear the deferred prompt variable
            deferredPrompt = null;
        });
    }
});

// 3. Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('[PWA] SevaLog was installed successfully!');
    deferredPrompt = null;
    
    // Optional: Hide the install button just in case it's still visible
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.style.display = 'none';
});