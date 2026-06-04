document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');

        btn.innerHTML = `Verifying...`;
        btn.disabled = true;

        try {
            const { data, error } = await _supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            if (data?.user) {
                window.location.href = 'volunteer/dashboard.html';
                return;
            }

            throw new Error('Unable to sign in. Please try again.');
        } catch (err) {
            console.error('Login failed:', err);
            alert(err.message || 'Login failed. Please check your credentials.');
        } finally {
            btn.innerHTML = `Sign In to Dashboard <i data-lucide="log-in"></i>`;
            btn.disabled = false;
            lucide.createIcons();
        }
    });
});