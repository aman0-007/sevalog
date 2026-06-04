// ==========================================
// ABOUT.JS (Mission Page Specific Logic)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    const cardStack = document.getElementById('mission-card-stack');
    
    if (cardStack) {
        let cards = Array.from(cardStack.querySelectorAll('.stack-card'));
        let isAnimating = false;
        
        // Keeps track of the next automatic click direction
        let nextClickDirection = 'right'; 

        // Core function to handle the animation
        const performSwipe = (direction) => {
            if (isAnimating) return; 
            isAnimating = true;

            const frontCard = cards[0];
            const swipeClass = direction === 'left' ? 'swiping-out-left' : 'swiping-out-right';

            // 1. Trigger the specific swipe away animation
            frontCard.classList.remove('pos-0');
            frontCard.classList.add(swipeClass);

            // 2. Shift the other cards forward immediately
            cards[1].classList.remove('pos-1');
            cards[1].classList.add('pos-0');

            if (cards[2]) {
                cards[2].classList.remove('pos-2');
                cards[2].classList.add('pos-1');
            }

            // 3. Move the swiped card to the back after animation finishes
            setTimeout(() => {
                frontCard.classList.remove(swipeClass);
                frontCard.classList.add('pos-2');

                // Reorder the array and DOM
                cards.push(cards.shift());
                cardStack.appendChild(frontCard);
                
                isAnimating = false;
            }, 400); 
        };

        // --- 1. DESKTOP/TAP LOGIC (Alternating) ---
        cardStack.addEventListener('click', () => {
            performSwipe(nextClickDirection);
            // Toggle the direction for the next tap
            nextClickDirection = nextClickDirection === 'right' ? 'left' : 'right';
        });

        // --- 2. MOBILE SWIPE LOGIC ---
        let touchStartX = 0;
        let touchEndX = 0;

        cardStack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        cardStack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        });

        const handleSwipeGesture = () => {
            const swipeThreshold = 50; // Minimum pixels to travel to count as a swipe

            if (touchEndX < touchStartX - swipeThreshold) {
                // User dragged finger to the left
                performSwipe('left');
            } else if (touchEndX > touchStartX + swipeThreshold) {
                // User dragged finger to the right
                performSwipe('right');
            }
            // If they moved less than 50px, it's just a tap, which the 'click' event listener handles!
        };
    }
});