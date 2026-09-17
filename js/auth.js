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

    // Global Alert Notification Helpers
    const showAlert = (elId, message, type = 'error') => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.className = `auth-alert auth-alert-${type} visible`;
        const iconName = type === 'success' ? 'check-circle-2' : (type === 'info' ? 'info' : 'alert-circle');
        el.innerHTML = `<i data-lucide="${iconName}"></i><div>${message}</div>`;
        if (window.lucide) lucide.createIcons();
    };

    const hideAlert = (elId) => {
        const el = document.getElementById(elId);
        if (el) {
            el.className = 'auth-alert';
            el.innerHTML = '';
        }
    };

    // Global Password Visibility Toggle
    const setupPwToggle = (toggleBtnId, inputId) => {
        const toggleBtn = document.getElementById(toggleBtnId);
        const input = document.getElementById(inputId);
        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                toggleBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>`;
                if (window.lucide) lucide.createIcons();
            });
        }
    };

    // ==========================================
    // 1. GLOBAL SESSION UI
    // ==========================================
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        ApiClient.clearSession();
    });

    const storedUserData = localStorage.getItem('samithi_user');
    const token = localStorage.getItem('samithi_token');

    // Route Protection: Redirect if attempting to access protected area without token
    const currentPath = window.location.pathname;
    const isProtectedArea = currentPath.includes('/admin/') || currentPath.includes('/volunteer/');
    const isLoginPage = currentPath.endsWith('login.html');

    if (isProtectedArea && !isLoginPage && (!token || !storedUserData)) {
        console.warn("[Auth] Access to protected area denied: No session found.");
        const prefix = currentPath.includes('/admin/') || currentPath.includes('/volunteer/') ? '../' : '';
        window.location.replace(prefix + 'login.html');
        return;
    }

    if (storedUserData && token) {
        try {
            const cachedUser = JSON.parse(storedUserData);
            const nameEl = document.getElementById('user-name-top');
            const welcomeEl = document.getElementById('welcome-text');
            const initialEl = document.getElementById('user-initial');
            const sidebarName = document.getElementById('sidebar-user-name');
            const sidebarRole = document.getElementById('sidebar-user-role');
            const sidebarAvatar = document.getElementById('sidebar-user-avatar');

            const fName = cachedUser.firstName || cachedUser.first_name || 'User';
            const lName = cachedUser.lastName || cachedUser.last_name || '';
            const fullName = `${fName} ${lName}`.trim();
            const role = cachedUser.role === 'admin' ? 'Administrator' : (cachedUser.role ? cachedUser.role.charAt(0).toUpperCase() + cachedUser.role.slice(1) : 'Admin');

            if (welcomeEl) welcomeEl.innerText = `Welcome back, ${fName}!`;
            if (nameEl) nameEl.innerText = fullName;
            if (initialEl) initialEl.innerText = fName.charAt(0).toUpperCase();
            if (sidebarName) sidebarName.innerText = fullName;
            if (sidebarRole) sidebarRole.innerText = role;
            if (sidebarAvatar) sidebarAvatar.innerText = fName.charAt(0).toUpperCase();

            // Auto-redirect if user lands on public/login page while authenticated
            if (currentPath.endsWith('login.html') || currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('SevaLog/')) {
                const prefix = currentPath.includes('frontend') ? '' : 'frontend/';
                const dest = cachedUser.role === 'admin' ? 'admin/admin.html' : 'volunteer/dashboard.html';
                window.location.replace(prefix + dest);
            }

            // Asynchronously validate session against /api/auth/me
            ApiClient.validateSession().then((freshUser) => {
                if (freshUser) {
                    const freshFName = freshUser.firstName || freshUser.first_name || fName;
                    const freshLName = freshUser.lastName || freshUser.last_name || lName;
                    const freshFullName = `${freshFName} ${freshLName}`.trim();
                    const freshRole = freshUser.role === 'admin' ? 'Administrator' : (freshUser.role ? freshUser.role.charAt(0).toUpperCase() + freshUser.role.slice(1) : 'Admin');

                    if (welcomeEl) welcomeEl.innerText = `Welcome back, ${freshFName}!`;
                    if (nameEl) nameEl.innerText = freshFullName;
                    if (initialEl) initialEl.innerText = freshFName.charAt(0).toUpperCase();
                    if (sidebarName) sidebarName.innerText = freshFullName;
                    if (sidebarRole) sidebarRole.innerText = freshRole;
                    if (sidebarAvatar) sidebarAvatar.innerText = freshFName.charAt(0).toUpperCase();
                }
            });

        } catch (e) {
            console.error("Session parse error, clearing:", e);
            ApiClient.clearSession();
        }
    }

    // ==========================================
    // 2. LOGIN FORM
    // ==========================================
    const loginForm = document.getElementById('login-form'); 
    if (loginForm) {
        setupPwToggle('toggle-login-password', 'login-password');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-submit-btn') || loginForm.querySelector('button[type="submit"]') || loginForm.querySelector('button');
            const origHtml = btn.innerHTML;
            
            try {
                hideAlert('login-alert');
                setButtonState(btn, true);
                const email = getVal('login-email');
                const password = getVal('login-password');
                
                const response = await ApiClient.request('/auth/login', 'POST', { email, password });
                ApiClient.setSession(response.data.token, response.data.user);

                window.location.href = response.data.user.role === 'admin' ? 'admin/admin.html' : 'volunteer/dashboard.html';
            } catch (error) {
                showAlert('login-alert', error.message || 'Invalid email or password. Please try again.', 'error');
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // ==========================================
    // 3. REGISTRATION FORM
    // ==========================================
    const regForm = document.getElementById('registration-form');
    if (regForm) {
        setupPwToggle('toggle-reg-password', 'password_hash');
        setupPwToggle('toggle-reg-confirm', 'confirm_password');

        // Helper: Focus and smoothly scroll to the first invalid field
        const focusAndScrollToField = (fieldId, errorMessage) => {
            const field = document.getElementById(fieldId);
            if (field) {
                const wrapper = field.closest('.input-field') || field;
                wrapper.classList.add('is-invalid', 'field-error-pulse');
                setTimeout(() => wrapper.classList.remove('field-error-pulse'), 600);
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    try { field.focus(); } catch (err) {}
                }, 300);
            }
            if (errorMessage) {
                showAlert('reg-alert', errorMessage, 'error');
            }
        };

        // 3a. Dynamic Date of Birth range: Min 14 years old, Max 60 years old
        const dobInput = document.getElementById('date_of_birth');
        const dobHint = document.getElementById('dob-hint');
        const dobWrapper = document.getElementById('dob-field-wrapper');
        const now = new Date();
        const maxDobDate = new Date(now.getFullYear() - 14, now.getMonth(), now.getDate());
        const minDobDate = new Date(now.getFullYear() - 60, now.getMonth(), now.getDate());
        const maxDobStr = maxDobDate.toISOString().split('T')[0];
        const minDobStr = minDobDate.toISOString().split('T')[0];

        if (dobInput) {
            dobInput.min = minDobStr;
            dobInput.max = maxDobStr;

            const checkDobLive = () => {
                const val = dobInput.value;
                if (!val) {
                    if (dobHint) { dobHint.textContent = ''; dobHint.className = 'field-live-feedback'; }
                    dobWrapper?.classList.remove('is-valid', 'is-invalid');
                    return null;
                }
                const chosenDate = new Date(val);
                if (chosenDate > maxDobDate) {
                    if (dobHint) {
                        dobHint.textContent = 'Volunteers must be at least 14 years old.';
                        dobHint.className = 'field-live-feedback is-invalid';
                    }
                    dobWrapper?.classList.add('is-invalid');
                    dobWrapper?.classList.remove('is-valid');
                    return false;
                } else if (chosenDate < minDobDate) {
                    if (dobHint) {
                        dobHint.textContent = 'Volunteer age limit is up to 60 years.';
                        dobHint.className = 'field-live-feedback is-invalid';
                    }
                    dobWrapper?.classList.add('is-invalid');
                    dobWrapper?.classList.remove('is-valid');
                    return false;
                } else {
                    const ageDiffMs = Date.now() - chosenDate.getTime();
                    const ageDate = new Date(ageDiffMs);
                    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
                    if (dobHint) {
                        dobHint.textContent = `✓ Age: ${calculatedAge} years (Eligible range 14–60)`;
                        dobHint.className = 'field-live-feedback is-valid';
                    }
                    dobWrapper?.classList.add('is-valid');
                    dobWrapper?.classList.remove('is-invalid');
                    return true;
                }
            };

            dobInput.addEventListener('change', checkDobLive);
            dobInput.addEventListener('input', checkDobLive);
        }

        // 1c. College vs. Profession Visual Indicator
        const collegeInput = document.getElementById('college_name');
        const profInput = document.getElementById('profession');
        const occBadge = document.getElementById('occupation-requirement-badge');
        const collegeWrapper = document.getElementById('college-field-wrapper');
        const profWrapper = document.getElementById('profession-field-wrapper');

        const checkOccupationRequirement = () => {
            const collegeVal = collegeInput?.value.trim() || '';
            const profVal = profInput?.value.trim() || '';
            const isMet = !!(collegeVal || profVal);

            if (occBadge) {
                if (isMet) {
                    occBadge.className = 'occupation-requirement-badge is-satisfied';
                    const detail = (collegeVal && profVal) ? 'Both provided' : (collegeVal ? `College: ${collegeVal}` : `Profession: ${profVal}`);
                    occBadge.innerHTML = `<i data-lucide="check-circle-2" style="width: 15px; height: 15px;"></i> <span>✓ Requirement met (${detail})</span>`;
                } else {
                    occBadge.className = 'occupation-requirement-badge';
                    occBadge.innerHTML = `<i data-lucide="alert-circle" style="width: 15px; height: 15px;"></i> <span>Provide at least one: College Name or Current Profession</span>`;
                }
                if (window.lucide) lucide.createIcons();
            }

            if (collegeVal) collegeWrapper?.classList.add('is-valid'); else collegeWrapper?.classList.remove('is-valid');
            if (profVal) profWrapper?.classList.add('is-valid'); else profWrapper?.classList.remove('is-valid');

            if (isMet) {
                collegeWrapper?.classList.remove('is-invalid');
                profWrapper?.classList.remove('is-invalid');
            }
            return isMet;
        };

        collegeInput?.addEventListener('input', checkOccupationRequirement);
        profInput?.addEventListener('input', checkOccupationRequirement);

        // Live validation for email
        const emailInput = document.getElementById('email');
        const emailHint = document.getElementById('email-hint');
        const emailWrapper = document.getElementById('email-field-wrapper');
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        const validateEmailLive = () => {
            if (!emailInput || !emailHint) return;
            const val = emailInput.value.trim();
            if (!val) {
                emailHint.textContent = '';
                emailHint.className = 'field-live-feedback';
                emailWrapper?.classList.remove('is-valid', 'is-invalid');
                return;
            }
            if (emailRegex.test(val)) {
                emailHint.textContent = '✓ Valid email address format';
                emailHint.className = 'field-live-feedback is-valid';
                emailWrapper?.classList.add('is-valid');
                emailWrapper?.classList.remove('is-invalid');
            } else {
                emailHint.textContent = 'Please enter a valid email format (e.g. name@domain.com)';
                emailHint.className = 'field-live-feedback is-invalid';
                emailWrapper?.classList.add('is-invalid');
                emailWrapper?.classList.remove('is-valid');
            }
        };

        if (emailInput) {
            emailInput.addEventListener('input', validateEmailLive);
            emailInput.addEventListener('blur', validateEmailLive);
        }

        // 2a. Password Strength calculation & Live validation
        const pwInput = document.getElementById('password_hash');
        const confirmPwInput = document.getElementById('confirm_password');
        const pwHint = document.getElementById('password-hint');
        const confirmPwHint = document.getElementById('confirm-password-hint');
        const pwWrapper = document.getElementById('password-field-wrapper');
        const confirmPwWrapper = document.getElementById('confirm-password-field-wrapper');
        const pwStrengthContainer = document.getElementById('password-strength-container');
        const strengthText = document.getElementById('strength-text');

        const evaluatePasswordStrength = (pw) => {
            if (!pw) return { score: 0, label: 'Enter password', levelClass: '' };
            if (pw.length < 6) return { score: 1, label: 'Too short (min 6)', levelClass: 'strength-weak' };

            let score = 0;
            if (pw.length >= 6) score++;
            if (pw.length >= 8) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;

            if (score <= 2) {
                return { score: 1, label: 'Weak (add numbers/uppercase)', levelClass: 'strength-weak' };
            } else if (score <= 4) {
                return { score: 2, label: 'Medium (good password)', levelClass: 'strength-medium' };
            } else {
                return { score: 3, label: 'Strong (great password!)', levelClass: 'strength-strong' };
            }
        };

        const validatePasswordsLive = () => {
            const pwVal = pwInput?.value || '';
            const confirmVal = confirmPwInput?.value || '';

            // Password strength evaluation
            if (pwStrengthContainer && strengthText) {
                const strength = evaluatePasswordStrength(pwVal);
                pwStrengthContainer.className = 'password-strength-container ' + strength.levelClass;
                strengthText.innerHTML = `Password Strength: <span>${strength.label}</span>`;
            }

            // Password length check
            if (pwHint) {
                if (!pwVal) {
                    pwHint.textContent = '';
                    pwHint.className = 'field-live-feedback';
                    pwWrapper?.classList.remove('is-valid', 'is-invalid');
                } else if (pwVal.length < 6) {
                    pwHint.textContent = `At least 6 characters required (${pwVal.length}/6)`;
                    pwHint.className = 'field-live-feedback is-invalid';
                    pwWrapper?.classList.add('is-invalid');
                    pwWrapper?.classList.remove('is-valid');
                } else {
                    pwHint.textContent = '✓ Minimum 6 characters met';
                    pwHint.className = 'field-live-feedback is-valid';
                    pwWrapper?.classList.add('is-valid');
                    pwWrapper?.classList.remove('is-invalid');
                }
            }

            // Confirm password matching check
            if (confirmPwHint) {
                if (!confirmVal) {
                    confirmPwHint.textContent = '';
                    confirmPwHint.className = 'field-live-feedback';
                    confirmPwWrapper?.classList.remove('is-valid', 'is-invalid');
                } else if (pwVal && confirmVal === pwVal) {
                    if (pwVal.length >= 6) {
                        confirmPwHint.textContent = '✓ Passwords match';
                        confirmPwHint.className = 'field-live-feedback is-valid';
                        confirmPwWrapper?.classList.add('is-valid');
                        confirmPwWrapper?.classList.remove('is-invalid');
                    } else {
                        confirmPwHint.textContent = 'Passwords match, but min. 6 characters required';
                        confirmPwHint.className = 'field-live-feedback is-invalid';
                        confirmPwWrapper?.classList.add('is-invalid');
                        confirmPwWrapper?.classList.remove('is-valid');
                    }
                } else {
                    confirmPwHint.textContent = '✕ Passwords do not match';
                    confirmPwHint.className = 'field-live-feedback is-invalid';
                    confirmPwWrapper?.classList.add('is-invalid');
                    confirmPwWrapper?.classList.remove('is-valid');
                }
            }
        };

        if (pwInput) {
            pwInput.addEventListener('input', validatePasswordsLive);
        }
        if (confirmPwInput) {
            confirmPwInput.addEventListener('input', validatePasswordsLive);
        }

        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = regForm.querySelector('button[type="submit"]') || regForm.querySelector('button');
            const origHtml = btn.innerHTML;
            
            try {
                hideAlert('reg-alert');

                // Basic required fields check with auto-scroll
                const firstName = getVal('first_name');
                if (!firstName) {
                    focusAndScrollToField('first_name', "Please enter your first name.");
                    return;
                }

                const lastName = getVal('last_name');
                if (!lastName) {
                    focusAndScrollToField('last_name', "Please enter your last name.");
                    return;
                }

                // Email constraint
                const email = getVal('email');
                if (!email || !emailRegex.test(email)) {
                    focusAndScrollToField('email', "Please enter a valid email address (e.g. name@domain.com).");
                    return;
                }

                // Phone number constraint (10 digits, optional +91)
                const phone = getVal('phone_number');
                const cleanPhone = phone.replace(/[\s\-]/g, '');
                if (!cleanPhone || !/^(\+91)?[0-9]{10}$/.test(cleanPhone)) {
                    focusAndScrollToField('phone_number', "Please enter a valid 10-digit mobile number.");
                    return;
                }

                // Date of birth constraint: Eligible range 14 to 60 years
                const dob = getVal('date_of_birth');
                if (dob) {
                    const dobDate = new Date(dob);
                    if (dobDate > maxDobDate) {
                        focusAndScrollToField('date_of_birth', "Volunteers must be at least 14 years old.");
                        return;
                    }
                    if (dobDate < minDobDate) {
                        focusAndScrollToField('date_of_birth', "Volunteer age limit is up to 60 years.");
                        return;
                    }
                }

                // Gender & Blood Group constraints
                const gender = getVal('gender');
                if (!gender) {
                    focusAndScrollToField('gender', "Please select your Gender.");
                    return;
                }

                const bloodGroup = getVal('blood_group');
                if (!bloodGroup) {
                    focusAndScrollToField('blood_group', "Please select your Blood Group.");
                    return;
                }

                // Pre-flight check for the CHECK constraint: College or Profession
                const college = getVal('college_name');
                const prof = getVal('profession');
                if (!college && !prof) {
                    focusAndScrollToField('college_name', "Please provide either your College Name or Profession.");
                    return;
                }

                // Emergency contact phone constraint (if provided)
                const emergencyPhone = getVal('emergency_contact_number');
                if (emergencyPhone) {
                    const cleanEmergPhone = emergencyPhone.replace(/[\s\-]/g, '');
                    if (!/^(\+91)?[0-9]{10}$/.test(cleanEmergPhone)) {
                        focusAndScrollToField('emergency_contact_number', "Please enter a valid 10-digit emergency contact number.");
                        return;
                    }
                }

                // Pincode constraint (6 digits if provided)
                const pincode = getVal('pincode');
                if (pincode && !/^[0-9]{6}$/.test(pincode.trim())) {
                    focusAndScrollToField('pincode', "Please enter a valid 6-digit postal pincode.");
                    return;
                }

                // Password validation & matching
                const password = getVal('password_hash');
                const confirmPassword = getVal('confirm_password');
                if (password.length < 6) {
                    focusAndScrollToField('password_hash', "Password must be at least 6 characters long.");
                    return;
                }
                if (password !== confirmPassword) {
                    focusAndScrollToField('confirm_password', "Passwords do not match. Please verify your confirm password.");
                    return;
                }

                setButtonState(btn, true);

                // Step 1: Register Core Account
                const authPayload = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    password: password,
                    phoneNumber: cleanPhone,
                    collegeName: college,
                    profession: prof
                };
                
                const authRes = await ApiClient.request('/auth/register', 'POST', authPayload);
                ApiClient.setSession(authRes.data.token, authRes.data.user);

                // Step 2: Update Detailed Profile
                const profilePayload = {
                    ...authPayload,
                    collegeName: college,
                    profession: prof,
                    city: getVal('city'),
                    residentialAddress: getVal('residential_address'),
                    dateOfBirth: dob,
                    gender: gender,
                    bloodGroup: bloodGroup,
                    educationLevel: getVal('education_level'),
                    state: getVal('state'),
                    pincode: pincode ? pincode.trim() : '',
                    emergencyContactName: getVal('emergency_contact_name'),
                    emergencyContactRelation: getVal('emergency_contact_relation'),
                    emergencyContactNumber: emergencyPhone ? emergencyPhone.trim() : '',
                    medicalConditions: getVal('medical_conditions'),
                    languagesSpoken: getChecked('languages_spoken'),
                    skills: getChecked('skills'),
                    interestedActivities: getChecked('interested_activities'),
                };

                await ApiClient.request('/volunteer/profile', 'PUT', profilePayload);
                window.location.href = 'volunteer/dashboard.html'; 

            } catch (error) {
                showAlert('reg-alert', error.message || 'Registration failed. Please review your details.', 'error');
                document.getElementById('reg-alert')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                
                const user = response.data.user;
                const token = response.data.token;

                if (user.role !== 'admin') {
                    throw new Error("Access Denied: Not an Admin.");
                }

                ApiClient.setSession(token, user);
                window.location.href = 'admin.html';

            } catch (error) {
                errText.innerText = error.message;
                errBox.style.display = "flex";
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // ==========================================
    // 5. ALERT NOTIFICATION HELPERS (Hoisted to top)
    // ==========================================

    // ==========================================
    // 6. FORGOT PASSWORD (MODAL & STANDALONE)
    // ==========================================
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotModalClose = document.getElementById('forgot-modal-close');

    if (forgotLink && forgotModal) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotModal.classList.add('active');
            const emailInput = document.getElementById('forgot-modal-email');
            const loginEmail = document.getElementById('login-email');
            if (emailInput && loginEmail && loginEmail.value.trim()) {
                emailInput.value = loginEmail.value.trim();
            }
            emailInput?.focus();
        });

        forgotModalClose?.addEventListener('click', () => {
            forgotModal.classList.remove('active');
            hideAlert('forgot-modal-alert');
        });

        forgotModal.addEventListener('click', (e) => {
            if (e.target === forgotModal) {
                forgotModal.classList.remove('active');
                hideAlert('forgot-modal-alert');
            }
        });
    }

    // Modal Form submission
    const forgotModalForm = document.getElementById('forgot-password-modal-form');
    if (forgotModalForm) {
        forgotModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('forgot-modal-submit-btn') || forgotModalForm.querySelector('button[type="submit"]');
            const origHtml = btn.innerHTML;
            const email = getVal('forgot-modal-email');

            try {
                hideAlert('forgot-modal-alert');
                setButtonState(btn, true);

                const response = await ApiClient.request('/auth/forgot-password', 'POST', { email });
                const successMsg = response.message || "A password reset link has been dispatched to your email.";
                showAlert('forgot-modal-alert', successMsg, 'success');
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="check" style="width:18px;"></i> Reset Link Sent`;
                if (window.lucide) lucide.createIcons();
            } catch (error) {
                showAlert('forgot-modal-alert', error.message || "Failed to send reset link. Please try again.", 'error');
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // Standalone Page Form submission (frontend/forgot-password.html)
    const forgotPageForm = document.getElementById('forgot-password-page-form');
    if (forgotPageForm) {
        forgotPageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('forgot-page-submit-btn') || forgotPageForm.querySelector('button[type="submit"]');
            const origHtml = btn.innerHTML;
            const email = getVal('forgot-page-email');

            try {
                hideAlert('forgot-page-alert');
                setButtonState(btn, true);

                const response = await ApiClient.request('/auth/forgot-password', 'POST', { email });
                const successMsg = response.message || "A password reset link has been dispatched to your email address.";
                showAlert('forgot-page-alert', successMsg, 'success');
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="check" style="width:18px;"></i> Reset Link Sent`;
                if (window.lucide) lucide.createIcons();
            } catch (error) {
                showAlert('forgot-page-alert', error.message || "Failed to request password reset.", 'error');
                setButtonState(btn, false, origHtml);
            }
        });
    }

    // ==========================================
    // 7. RESET PASSWORD (POST /auth/reset-password/{userId}/{token})
    // ==========================================
    const resetPageForm = document.getElementById('reset-password-page-form');
    if (resetPageForm) {
        const tokenBadge = document.getElementById('token-detected-badge');
        const tokenBadgeText = document.getElementById('token-badge-text');
        const manualFields = document.getElementById('manual-token-fields');
        const hiddenUserIdInput = document.getElementById('hidden-user-id');
        const hiddenTokenInput = document.getElementById('hidden-token');
        const manualUserIdInput = document.getElementById('reset-user-id');
        const manualTokenInput = document.getElementById('reset-token');

        const linkInput = document.getElementById('reset-link-input');
        const parseLinkBtn = document.getElementById('btn-parse-link');
        const linkFeedback = document.getElementById('link-extract-feedback');

        // Helper to parse reset links in any format
        const parseResetLink = (linkStr) => {
            if (!linkStr || typeof linkStr !== 'string') return null;
            linkStr = linkStr.trim();
            if (!linkStr) return null;

            let userId = null;
            let token = null;

            try {
                // Ensure proper protocol for URL constructor
                const testUrl = (linkStr.startsWith('http://') || linkStr.startsWith('https://'))
                    ? linkStr
                    : 'https://placeholder.local/' + linkStr.replace(/^\/+/, '');
                const urlObj = new URL(testUrl);

                // 1. Check query parameters (?userId=...&token=...)
                userId = urlObj.searchParams.get('userId') || urlObj.searchParams.get('user_id') || urlObj.searchParams.get('id');
                token = urlObj.searchParams.get('token') || urlObj.searchParams.get('t');

                // 2. Check path segments (/reset-password/:userId/:token)
                if (!userId || !token) {
                    const segments = urlObj.pathname.split('/').filter(Boolean);
                    const resetIdx = segments.findIndex(s => s === 'reset-password' || s === 'reset-password.html');
                    if (resetIdx !== -1 && segments.length >= resetIdx + 3) {
                        userId = segments[resetIdx + 1];
                        token = segments[resetIdx + 2];
                    }
                }
            } catch (e) {
                // URL parsing failed, fall through to regex
            }

            // 3. Fallback regex matching for path segment (/reset-password/UUID/TOKEN)
            if (!userId || !token) {
                const pathMatch = linkStr.match(/reset-password(?:\.html)?\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i);
                if (pathMatch) {
                    userId = pathMatch[1];
                    token = pathMatch[2];
                }
            }

            // 4. Fallback regex for query parameters
            if (!userId) {
                const uMatch = linkStr.match(/[?&](?:userId|user_id|id)=([a-zA-Z0-9_-]+)/i);
                if (uMatch) userId = uMatch[1];
            }
            if (!token) {
                const tMatch = linkStr.match(/[?&](?:token|t)=([a-zA-Z0-9_.-]+)/i);
                if (tMatch) token = tMatch[1];
            }

            if (userId && token) {
                return { userId, token };
            }
            return null;
        };

        // Helper to apply extracted details to DOM
        const applyExtractedDetails = (userId, token, fromInput = false) => {
            if (hiddenUserIdInput) hiddenUserIdInput.value = userId;
            if (hiddenTokenInput) hiddenTokenInput.value = token;
            if (manualUserIdInput) manualUserIdInput.value = userId;
            if (manualTokenInput) manualTokenInput.value = token;

            if (tokenBadge) {
                tokenBadge.style.display = 'inline-flex';
                if (tokenBadgeText) {
                    const shortId = userId.length > 8 ? `${userId.slice(0, 8)}...` : userId;
                    tokenBadgeText.textContent = `Security Token Verified (${shortId})`;
                }
            }

            if (manualFields) {
                manualFields.style.display = 'none';
            }

            if (fromInput && linkFeedback) {
                linkFeedback.style.display = 'block';
                linkFeedback.style.color = '#166534';
                linkFeedback.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="check-circle" style="width: 14px;"></i> Link verified! Details auto-fetched.</span>`;
                if (window.lucide) lucide.createIcons();

                // Focus new password input for instant smooth UX
                const newPwInput = document.getElementById('reset-new-password');
                if (newPwInput) newPwInput.focus();
            }
        };

        // Step 1: Detect userId and token from existing browser URL (Path or Query Parameter)
        const initialParsed = parseResetLink(window.location.href);
        if (initialParsed) {
            if (linkInput) linkInput.value = window.location.href;
            applyExtractedDetails(initialParsed.userId, initialParsed.token, false);
        } else {
            if (manualFields) manualFields.style.display = 'block';
            if (tokenBadge) tokenBadge.style.display = 'none';
        }

        // Handler for parsing pasted/entered link
        const handleProcessLink = () => {
            const rawVal = linkInput ? linkInput.value.trim() : '';
            if (!rawVal) {
                if (linkFeedback) {
                    linkFeedback.style.display = 'block';
                    linkFeedback.style.color = '#991B1B';
                    linkFeedback.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="alert-circle" style="width: 14px;"></i> Please paste a link first.</span>`;
                    if (window.lucide) lucide.createIcons();
                }
                return;
            }

            const parsed = parseResetLink(rawVal);
            if (parsed) {
                applyExtractedDetails(parsed.userId, parsed.token, true);
            } else {
                if (linkFeedback) {
                    linkFeedback.style.display = 'block';
                    linkFeedback.style.color = '#991B1B';
                    linkFeedback.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 5px;"><i data-lucide="alert-circle" style="width: 14px;"></i> Could not find both User ID and Token in the link. Please check the URL or use manual fields below.</span>`;
                    if (window.lucide) lucide.createIcons();
                }
                if (manualFields) manualFields.style.display = 'block';
            }
        };

        if (parseLinkBtn) {
            parseLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleProcessLink();
            });
        }

        if (linkInput) {
            linkInput.addEventListener('paste', () => {
                setTimeout(handleProcessLink, 50);
            });
            linkInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProcessLink();
                }
            });
        }

        // Toggle Password Visibility Handlers (Reusing shared helper)
        setupPwToggle('toggle-new-pw', 'reset-new-password');
        setupPwToggle('toggle-confirm-pw', 'reset-confirm-password');

        // Form Submit Handler
        resetPageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('reset-page-submit-btn') || resetPageForm.querySelector('button[type="submit"]');
            const origHtml = btn.innerHTML;

            const userId = (hiddenUserIdInput && hiddenUserIdInput.value.trim()) || getVal('reset-user-id');
            const token = (hiddenTokenInput && hiddenTokenInput.value.trim()) || getVal('reset-token');
            const newPassword = getVal('reset-new-password');
            const confirmPassword = getVal('reset-confirm-password');

            try {
                hideAlert('reset-page-alert');

                if (!userId) {
                    throw new Error("User ID is missing. Paste your reset link in the box above or enter your User ID.");
                }
                if (!token) {
                    throw new Error("Security Token is missing. Paste your reset link in the box above or enter your token.");
                }
                if (newPassword.length < 6) {
                    throw new Error("Password must be at least 6 characters long.");
                }
                if (newPassword !== confirmPassword) {
                    throw new Error("Passwords do not match. Please re-enter.");
                }

                setButtonState(btn, true);

                const response = await ApiClient.request(
                    `/auth/reset-password/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`,
                    'POST',
                    { newPassword }
                );

                const successMsg = (response && response.message) || "Password reset successfully! Redirecting you to sign in...";
                showAlert('reset-page-alert', successMsg, 'success');
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="check" style="width:18px;"></i> Password Updated!`;
                if (window.lucide) lucide.createIcons();

                // Smooth redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                showAlert('reset-page-alert', error.message || "Failed to reset password. The link or token may be invalid or expired.", 'error');
                setButtonState(btn, false, origHtml);
            }
        });
    }
});