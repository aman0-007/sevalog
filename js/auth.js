// ==========================================
// AUTH.JS (Identity & Session Management)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. GLOBAL SESSION & HEADER LOGIC
    // (Runs on every page where auth.js is loaded)
    // ==========================================
    const logoutBtn = document.getElementById('logout-btn');
    const nameElement = document.getElementById('user-name-top');
    const welcomeElement = document.getElementById('welcome-text');
    const initialElement = document.getElementById('user-initial');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            ApiClient.clearSession(); // Clears localStorage and redirects to login
        });
    }

    const storedUserData = localStorage.getItem('samithi_user');
    if (storedUserData) {
        const user = JSON.parse(storedUserData);
        const displayName = `${user.firstName} ${user.lastName}`;

        if (welcomeElement) welcomeElement.innerText = `Welcome back, ${user.firstName}!`;
        if (nameElement) nameElement.innerText = displayName;

        if (initialElement && user.firstName) {
            initialElement.innerText = user.firstName.charAt(0).toUpperCase();
        }
    }


    // ==========================================
    // 2. LOGIN FORM LOGIC
    // (Only runs on the login.html page)
    // ==========================================
    const loginForm = document.getElementById('login-form'); 
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Updated to match your specific HTML IDs
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const btn = loginForm.querySelector('button');
            const originalBtnHtml = btn.innerHTML; // Saves the default button text and icon
            
            try {
                // UI Feedback
                btn.disabled = true;
                btn.innerHTML = 'Verifying...';

                // Send request to your Node.js API
                const response = await ApiClient.request('/auth/login', 'POST', { email, password });
                
                // Save token and user data
                ApiClient.setSession(response.token, response.user);

                // Redirect based on role
                if (response.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'volunteer/dashboard.html'; // Updated to your preferred path
                }
            } catch (error) {
                // Error Handling
                alert(error.message || 'Login failed. Please check your credentials.');
                
                // Reset Button
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml; // Restores "Sign In to Dashboard"
                if (typeof lucide !== 'undefined') lucide.createIcons(); // Re-render the icon
            }
        });
    }


    // ==========================================
    // 3. REGISTRATION FORM LOGIC
    // (Only runs on the join-us.html page)
    // ==========================================
    const regForm = document.getElementById('registration-form');

    if (regForm) {
        regForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const btn = regForm.querySelector('button');
            const originalBtnHtml = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:18px;"></i> Processing...`;
            if (typeof lucide !== 'undefined') lucide.createIcons();

            const getInputValue = (id) => {
                const element = document.getElementById(id);
                return element ? element.value.trim() : '';
            };

            const getCheckedValues = (name) => {
                return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
                            .map(checkbox => checkbox.value);
            };

            const selectedLanguages = getCheckedValues('languages_spoken');

            try {
                // Extract Auth Data
                const firstName = getInputValue('first_name');
                const lastName = getInputValue('last_name');
                const email = getInputValue('email');
                const password = getInputValue('password_hash');
                const phoneNumber = getInputValue('phone_number');

                // Step 1: Register Account
                const authPayload = { firstName, lastName, email, password, phoneNumber };
                const authResponse = await ApiClient.request('/auth/register', 'POST', authPayload);
                
                ApiClient.setSession(authResponse.token, authResponse.user);

                // Step 2: Update Profile Bio
                const profilePayload = {
                    firstName,
                    lastName,
                    phoneNumber,
                    professionOrCollege: getInputValue('profession_or_college'),
                    city: getInputValue('city'),
                    residentialAddress: getInputValue('residential_address'),
                    dateOfBirth: getInputValue('date_of_birth'),
                    gender: getInputValue('gender'),
                    bloodGroup: getInputValue('blood_group'),
                    educationLevel: getInputValue('education_level'),
                    state: getInputValue('state'),
                    pincode: getInputValue('pincode'),
                    emergencyContactName: getInputValue('emergency_contact_name'),
                    emergencyContactRelation: getInputValue('emergency_contact_relation'),
                    emergencyContactNumber: getInputValue('emergency_contact_number'),
                    medicalConditions: getInputValue('medical_conditions'),
                    languages: selectedLanguages,
                    languagesSpoken: selectedLanguages,
                    languages_spoken: selectedLanguages,
                    skills: getCheckedValues('skills'),
                    interestedActivities: getCheckedValues('interested_activities'),
                    userId: authResponse.user.userId 
                };

                await ApiClient.request('/volunteer/profile', 'PUT', profilePayload);

                // Redirect on success
                window.location.href = 'volunteer/dashboard.html'; 

            } catch (error) {
                console.error("Registration Error:", error.message);
                alert("Registration Failed: " + error.message);
                
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // ==========================================
    // 4. ADMIN PORTAL LOGIN LOGIC
    // (Only runs on the admin verification page)
    // ==========================================
    const adminLoginForm = document.getElementById('loginForm');

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('login-btn');
            const errBox = document.getElementById('error-msg');
            const errText = document.getElementById('error-text');
            
            // UI Loading State
            btn.innerHTML = `<span>Authenticating...</span>`;
            btn.disabled = true;
            errBox.style.display = 'none';
            
            try {
                // Request token from Node.js backend
                const response = await ApiClient.request('/auth/login', 'POST', { email, password });
                
                // Security Check: Deny access if they are not an admin
                if (response.user.role !== 'admin') {
                    errText.innerText = "Access Denied: Not an Admin.";
                    errBox.style.display = "flex";
                    
                    btn.innerHTML = `<span>Unlock Dashboard</span><i data-lucide="chevron-right"></i>`;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    btn.disabled = false;
                    return; // Stop execution here, do NOT save token
                }

                // If authorized, save token and proceed
                ApiClient.setSession(response.token, response.user);
                window.location.href = 'admin.html';

            } catch (error) {
                // Backend Error Handling (Wrong password, etc.)
                errText.innerText = error.message || "Invalid credentials. Unauthorized access logged.";
                errBox.style.display = "flex";
                
                btn.innerHTML = `<span>Unlock Dashboard</span><i data-lucide="chevron-right"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                btn.disabled = false;
            }
        });
    }
});