// ==========================================
// SETTINGS.JS (Form Interactions)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');

    if(saveBtn) {
        saveBtn.addEventListener('click', function() {
            const originalText = this.innerText;
            this.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:16px;"></i> Saving...`;
            this.disabled = true;
            lucide.createIcons();

            // Simulate DB Update
            setTimeout(() => {
                this.innerHTML = `<i data-lucide="check"></i> Saved`;
                this.style.background = "#10B981"; // Turn green
                
                setTimeout(() => {
                    this.innerText = originalText;
                    this.style.background = ""; // Reset
                    this.disabled = false;
                }, 2000);
            }, 1000);
        });
    }
});