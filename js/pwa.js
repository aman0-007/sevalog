// ==========================================
// PWA.JS (Service Worker & Install Logic)
// ==========================================

let deferredPrompt;

// 1. Register the Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker Registered successfully.', reg.scope))
            .catch(err => console.error('[PWA] Service Worker Registration Failed:', err));
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