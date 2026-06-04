// ==========================================
// LOGIN.JS (The Complete Drag, Trap & Auth)
// ==========================================

const bin = document.getElementById('bin');
const playArea = document.getElementById('play-area');
const scoreDisplay = document.getElementById('score');
const gameMsg = document.getElementById('game-msg');
const gameTitle = document.getElementById('game-title');
const gameContainer = document.getElementById('game-container');
const loginCard = document.getElementById('loginCard');

let score = 0;
let chaosTriggered = false;

// 1. SPAWN LOGIC
function spawnTrash(count = 5) {
    const emojis = ['🍾', '🗞️', '📦', '🍌', '🥤', '🍕', '🥫'];
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const trash = document.createElement('div');
            trash.className = 'trash-item';
            trash.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
            trash.style.left = Math.random() * 80 + 10 + '%';
            trash.style.top = Math.random() * 50 + 10 + '%';
            makeDraggable(trash, false);
            playArea.appendChild(trash);
        }, i * 100);
    }
}

// 2. UNIVERSAL DRAG & TACTILE LOGIC
function makeDraggable(el, isBin) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    el.onmousedown = start;
    el.ontouchstart = start;

    function start(e) {
        // Prevent default browser behavior (like highlighting text/emojis)
        if (e.type === 'mousedown') {
            e.preventDefault(); 
        }

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        pos3 = clientX;
        pos4 = clientY;

        el.classList.add('dragging');

        if (isBin) {
            const rect = el.getBoundingClientRect();
            const parentRect = playArea.getBoundingClientRect();
            el.style.bottom = 'auto';
            el.style.top = (rect.top - parentRect.top) + 'px';
            el.style.left = (rect.left - parentRect.left + (rect.width/2)) + 'px'; 
            el.style.transform = 'translateX(-50%)'; 
            el.style.transition = 'none'; 
        }

        document.onmouseup = stop;
        document.ontouchend = stop;
        document.onmousemove = move;
        document.ontouchmove = move;
    }

    function move(e) {
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;

        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";

        if (!isBin) checkProximity(el);
    }

    function stop() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;

        el.classList.remove('dragging', 'near');
        bin.classList.remove('near');

        if (isBin) {
            const tRect = gameTitle.getBoundingClientRect();
            const bRect = el.getBoundingClientRect();

            if (bRect.top < tRect.bottom + 30) {
                unlockPortal();
            } else {
                el.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                el.style.top = 'auto';
                el.style.bottom = '20px';
                el.style.left = '50%';
            }
        }
    }
}
// 3. PROXIMITY & COLLISION
function checkProximity(trash) {
    const b = bin.getBoundingClientRect();
    const t = trash.getBoundingClientRect();
    
    const dx = (t.left + t.width/2) - (b.left + b.width/2);
    const dy = (t.top + t.height/2) - (b.top + b.height/2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 100) {
        trash.classList.add('near');
        bin.classList.add('near');
        checkCollision(trash);
    } else {
        trash.classList.remove('near');
        bin.classList.remove('near');
    }
}

function checkCollision(trash) {
    const b = bin.getBoundingClientRect();
    const t = trash.getBoundingClientRect();
    const hit = !(t.right < b.left || t.left > b.right || t.bottom < b.top || t.top > b.bottom);

    if (hit && !trash.dataset.collected) {
        trash.dataset.collected = "true";
        trash.style.transform = "scale(0)";
        
        setTimeout(() => {
            trash.remove();
            score++;
            scoreDisplay.innerText = score;
            bin.classList.remove('near');

            // The Trap
            if (score === 5 && !chaosTriggered) {
                chaosTriggered = true;
                gameMsg.innerText = "Oh no! A passing truck spilled everything!";
                gameMsg.style.color = "#ef4444";
                spawnTrash(15); 
            } else if (score === 20) {
                gameMsg.innerText = "Is that a storm? Seva never ends...";
                spawnTrash(10);
            }
        }, 200);
    }
}

// 4. TRANSITION TO FORM
function unlockPortal() {
    gameTitle.innerText = "Access Granted";
    gameTitle.style.color = "var(--accent, #2563EB)";
    gameContainer.style.transform = "scale(0.9) translateY(-20px)";
    gameContainer.style.opacity = "0";

    setTimeout(() => {
        gameContainer.style.display = 'none';
        loginCard.classList.add('active');
        
        // Ensure Lucide icons inside the form render properly
        lucide.createIcons();
        document.getElementById('email').focus();
    }, 500);
}

// 5. SUPABASE AUTH
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('error-msg');
    const errText = document.getElementById('error-text');
    
    btn.innerHTML = `<span>Authenticating...</span>`;
    btn.disabled = true;
    errBox.style.display = 'none';
    
    const { data, error } = await _supabase.auth.signInWithPassword({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });

    if (error) {
        errText.innerText = "Invalid credentials. Unauthorized access logged.";
        errBox.style.display = "flex";
        btn.innerHTML = `<span>Unlock Dashboard</span><i data-lucide="chevron-right"></i>`;
        lucide.createIcons();
        btn.disabled = false;
        return;
    }

    const { data: profile } = await _supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        await _supabase.auth.signOut();
        errText.innerText = "Access Denied: Not an Admin.";
        errBox.style.display = "flex";
        btn.innerHTML = `<span>Unlock Dashboard</span><i data-lucide="chevron-right"></i>`;
        lucide.createIcons();
        btn.disabled = false;
    }
});

// Start the game loop
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    spawnTrash(5);
    makeDraggable(bin, true);
});