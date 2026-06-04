// ==========================================
// JOIN-US.JS (Comprehensive Registration)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registration-form');

    if (!regForm) return;

    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Visual Feedback - Disable button and show loading
        const btn = regForm.querySelector('button');
        const originalBtnHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:18px;"></i> Processing...`;
        lucide.createIcons();

        // 2. Helper function to gather checkbox arrays (Skills & Interests)
        const getCheckedValues = (name) => {
            return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
                        .map(checkbox => checkbox.value);
        };

        // 3. Gather all data points
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        const userData = {
            full_name: document.getElementById('reg-name').value,
            phone: document.getElementById('reg-phone').value,
            employment_status: document.getElementById('reg-employment').value,
            college_name: document.getElementById('reg-college').value,
            year_of_study: document.getElementById('reg-year').value,
            city: document.getElementById('reg-city').value,
            address: document.getElementById('reg-address').value,
            bio: document.getElementById('reg-bio').value,
            skills: getCheckedValues('skills'),
            interests: getCheckedValues('interests')
        };

        try {
            // 4. Supabase Auth Sign Up
            // Make sure _supabase is initialized in your public-main.js or globally
            const { data, error } = await _supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: userData 
                }
            });

            if (error) throw error;

            // 5. Success Handling
            if (data.user && data.session === null) {
                alert("Registration successful! Please check your email inbox to verify your account.");
                window.location.href = 'login.html';
            } else if (data.user && data.session) {
                // Logged in immediately
                window.location.href = 'volunteer/dashboard.html';
            }

        } catch (err) {
            // 6. Error Handling
            console.error("Registration Error:", err.message);
            alert("Registration Failed: " + err.message);
            
            // Reset button state
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
            lucide.createIcons();
        }
    });
});