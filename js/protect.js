// ==========================================
// PROTECT.JS (PWA Native App Enforcements)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. DISABLE CONTEXT MENU (Right-Click / Long-Press)
    document.addEventListener('contextmenu', (e) => {
        // CRITICAL EXCEPTION: Allow context menu on inputs/textareas 
        // so volunteers can still use "Paste" when typing remarks.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault();
    });

    // 2. DISABLE SAFARI PINCH-TO-ZOOM
    // Safari ignores the HTML viewport meta tag, so we must intercept Apple's custom gesture events.
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
    });

    // 3. DISABLE DESKTOP KEYBOARD/MOUSE ZOOMING
    // Prevents Ctrl/Cmd + Wheel scroll zooming
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevents Ctrl/Cmd + "+" or "-" zooming
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '+' || e.key === '-' || e.key === '=') {
                e.preventDefault();
            }
        }
    });

});