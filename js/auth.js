// ==========================================
// AUTH.JS (Optimized Identity & Session)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // Helper: Manage button loading states cleanly across all forms
    const setButtonState = (btn, isLoading, originalHtml = '') => {
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:18px;"></i> Processing...`;
        } else {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
        if (window.lucide) lucide.createIcons();
    };

    // Helper: Safely get input values
    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const getChecked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

    // ==========================================
    // 1. GLOBAL SESSION UI
    // ==========================================
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        ApiClient.clearSession();
    });

    const storedUserData = localStorage.getItem('samithi_user');
    if (storedUserData) {
        try {
            const user = JSON.parse(storedUserData);
            const nameEl = document.getElementById('user-name-top');
            const welcomeEl = document.getElementById('welcome-text');
            const initialEl = document.getElementById('user-initial');

            if (welcomeEl) welcomeEl.innerText = `Welcome back, ${user.firstName}!`;
            if (nameEl) nameEl.innerText = `${user.firstName} ${user.lastName}`;
            if (initialEl) initialEl.innerText = user.firstName.charAt(0).toUpperCase();
        } catch (e) {
            console.error("Session parse error, clearing.");
            ApiClient.clearSession();
        }
    }

    // ==========================================
    // 2. LOGIN FORM
    // ==========================================
    const loginForm = document.getElementById('login-form'); 
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button');
            const origHtml = btn.innerHTML;
            
            try {
                setButtonState(btn, true);
                const email = getVal('login-email');
                const password = getVal('login-password');
                
                const response = await ApiClient.request('/auth/login', 'POST', { email, password });
                ApiClient.setSession(response.token, response.user);

                window.location.href = response.user.role === 'admin' ? 'admin.html' : 'volunteer/dashboard.html';
            } catch (error) {
                alert(error.message);
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // ==========================================
    // 3. REGISTRATION FORM
    // ==========================================
    const regForm = document.getElementById('registration-form');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = regForm.querySelector('button');
            const origHtml = btn.innerHTML;
            
            try {
                setButtonState(btn, true);

                // Step 1: Register Core Account
                const authPayload = {
                    firstName: getVal('first_name'),
                    lastName: getVal('last_name'),
                    email: getVal('email'),
                    password: getVal('password_hash'),
                    phoneNumber: getVal('phone_number')
                };
                
                const authRes = await ApiClient.request('/auth/register', 'POST', authPayload);
                ApiClient.setSession(authRes.token, authRes.user);

                // Step 2: Update Detailed Profile
                const profilePayload = {
                    ...authPayload,
                    professionOrCollege: getVal('profession_or_college'),
                    city: getVal('city'),
                    residentialAddress: getVal('residential_address'),
                    dateOfBirth: getVal('date_of_birth'),
                    gender: getVal('gender'),
                    bloodGroup: getVal('blood_group'),
                    educationLevel: getVal('education_level'),
                    state: getVal('state'),
                    pincode: getVal('pincode'),
                    emergencyContactName: getVal('emergency_contact_name'),
                    emergencyContactRelation: getVal('emergency_contact_relation'),
                    emergencyContactNumber: getVal('emergency_contact_number'),
                    medicalConditions: getVal('medical_conditions'),
                    languages: getChecked('languages_spoken'),
                    skills: getChecked('skills'),
                    interestedActivities: getChecked('interested_activities'),
                };

                await ApiClient.request('/volunteer/profile', 'PUT', profilePayload);
                window.location.href = 'volunteer/dashboard.html'; 

            } catch (error) {
                alert("Registration Failed: " + error.message);
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // ==========================================
    // 4. ADMIN PORTAL LOGIN
    // ==========================================
    const adminLoginForm = document.getElementById('loginForm'); // Kept your specific ID
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const errBox = document.getElementById('error-msg');
            const errText = document.getElementById('error-text');
            const origHtml = btn.innerHTML;
            
            try {
                setButtonState(btn, true);
                errBox.style.display = 'none';
                
                const email = getVal('email');
                const password = getVal('password');
                const response = await ApiClient.request('/auth/login', 'POST', { email, password });
                
                if (response.user.role !== 'admin') {
                    throw new Error("Access Denied: Not an Admin.");
                }

                ApiClient.setSession(response.token, response.user);
                window.location.href = 'admin.html';

            } catch (error) {
                errText.innerText = error.message;
                errBox.style.display = "flex";
                setButtonState(btn, false, origHtml);
            }
        });
    }
});