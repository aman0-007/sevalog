// ==========================================
// SETTINGS.JS (Form Interactions & API)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Check Auth
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Tab Navigation Logic
    const tabBtns = document.querySelectorAll('.s-nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveBar = document.getElementById('save-bar');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.dataset.target;
            document.getElementById(targetId).classList.add('active');

            // Hide the Profile Save button if we are on the Security tab
            if (targetId === 'tab-security') {
                saveBar.classList.remove('active');
            } else {
                saveBar.classList.add('active');
            }
        });
    });

    // 3. Fetch and Populate Profile Data
    async function loadProfile() {
        try {
            const response = await ApiClient.request('/volunteer/profile', 'GET');
            const data = response.data;

            // Simple text inputs
            const fields = [
                'first_name', 'last_name', 'email', 'phone_number',
                'date_of_birth', 'gender', 'blood_group', 'residential_address',
                'city', 'state', 'pincode', 'emergency_contact_name',
                'emergency_contact_relation', 'emergency_contact_number',
                'medical_conditions', 'education_level', 'college_name', 'profession' // <-- Fixed here
            ];

            fields.forEach(field => {
                const el = document.getElementById(field);
                if (el && data[field]) {
                    if (field === 'date_of_birth') {
                        // Format date for HTML date input (YYYY-MM-DD)
                        el.value = new Date(data[field]).toISOString().split('T')[0];
                    } else {
                        el.value = data[field];
                    }
                }
            });

            // Handle Array fields (Join with comma)
            const arrayFields = ['skills', 'languages_spoken', 'interested_activities'];
            arrayFields.forEach(field => {
                const el = document.getElementById(field);
                if (el && Array.isArray(data[field])) {
                    el.value = data[field].join(', ');
                }
            });

        } catch (error) {
            console.error("Failed to load profile:", error);
            alert("Could not load profile data.");
        }
    }

    await loadProfile();

    // 4. Handle Profile Update
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('save-profile-btn');
        const msg = document.getElementById('profile-msg');

        const collegeName = document.getElementById('college_name').value.trim();
        const profession = document.getElementById('profession').value.trim();

        // Frontend validation for DB constraint (chk_college_or_profession)
        if (!collegeName && !profession) {
            msg.innerText = "Please provide either your College Name or Profession.";
            msg.style.color = "#EF4444";
            return;
        }

        btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:16px;"></i> Saving...`;
        btn.disabled = true;
        lucide.createIcons();

        // Helper to get array from comma-separated string
        const getArray = (id) => {
            const val = document.getElementById(id).value;
            if (!val) return [];
            return val.split(',').map(s => s.trim()).filter(Boolean);
        };

        const payload = {
            firstName: document.getElementById('first_name').value,
            lastName: document.getElementById('last_name').value,
            dateOfBirth: document.getElementById('date_of_birth').value || null,
            gender: document.getElementById('gender').value,
            bloodGroup: document.getElementById('blood_group').value,
            residentialAddress: document.getElementById('residential_address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            emergencyContactName: document.getElementById('emergency_contact_name').value,
            emergencyContactRelation: document.getElementById('emergency_contact_relation').value,
            emergencyContactNumber: document.getElementById('emergency_contact_number').value,
            medicalConditions: document.getElementById('medical_conditions').value,
            educationLevel: document.getElementById('education_level').value,
            collegeName: collegeName || null,
            profession: profession || null,
            skills: getArray('skills'),
            languagesSpoken: getArray('languages_spoken'),
            interestedActivities: getArray('interested_activities')
        };

        try {
            const response = await ApiClient.request('/volunteer/profile', 'PUT', payload);

            // Update local storage name if it changed
            const session = JSON.parse(localStorage.getItem('samithi_user') || '{}');
            session.firstName = payload.firstName;
            session.lastName = payload.lastName;
            localStorage.setItem('samithi_user', JSON.stringify(session));

            // Update top bar name immediately
            document.getElementById('user-name-top').innerText = `${payload.firstName} ${payload.lastName}`;

            btn.innerHTML = `<i data-lucide="check"></i> Saved`;
            btn.style.background = "#10B981";
            msg.innerText = "Profile updated successfully.";
            msg.style.color = "#10B981";

            setTimeout(() => {
                btn.innerText = "Save Profile";
                btn.style.background = "";
                btn.disabled = false;
                msg.innerText = "";
            }, 3000);

        } catch (error) {
            btn.innerText = "Save Profile";
            btn.disabled = false;
            msg.innerText = error.message;
            msg.style.color = "#EF4444";
        }
    });

    // 5. Handle Password Change
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const btn = document.getElementById('save-pwd-btn');
        const msg = document.getElementById('pwd-msg');

        if (newPassword !== confirmPassword) {
            msg.innerText = "New passwords do not match.";
            msg.style.color = "#EF4444";
            return;
        }

        btn.innerText = "Updating...";
        btn.disabled = true;

        try {
            await ApiClient.request('/auth/change-password', 'PUT', { currentPassword, newPassword });

            document.getElementById('password-form').reset();
            msg.innerText = "Password changed securely.";
            msg.style.color = "#10B981";

        } catch (error) {
            msg.innerText = error.message;
            msg.style.color = "#EF4444";
        } finally {
            btn.innerText = "Update Password";
            btn.disabled = false;
        }
    });

});