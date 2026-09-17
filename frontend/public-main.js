// ==========================================
// PUBLIC-MAIN.JS (Optimized UI & Animations)
// ==========================================

// ==========================================
// THEME MANAGEMENT & SYNC
// ==========================================
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    syncThemeIcons();
}

function syncThemeIcons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const modalMoon = document.getElementById('modal-theme-icon-moon');
    const modalSun = document.getElementById('modal-theme-icon-sun');
    if (modalMoon && modalSun) {
        modalMoon.style.display = isDark ? 'none' : 'block';
        modalSun.style.display = isDark ? 'block' : 'none';
    }

    const modalSwitch = document.getElementById('modal-theme-toggle-switch');
    if (modalSwitch) {
        if (isDark) {
            modalSwitch.classList.add('dark-active');
            modalSwitch.setAttribute('aria-checked', 'true');
        } else {
            modalSwitch.classList.remove('dark-active');
            modalSwitch.setAttribute('aria-checked', 'false');
        }
    }

    const modalStatusText = document.getElementById('modal-theme-status-text');
    if (modalStatusText) {
        modalStatusText.textContent = isDark ? 'Dark appearance enabled' : 'Light appearance enabled';
    }
}

// ==========================================
// VOLUNTEER & ADMIN PROFILE MODAL LOGIC
// ==========================================
function openAdminModal() {
    const modalOverlay = document.getElementById('admin-modal-overlay') || document.getElementById('volunteer-modal-overlay');
    if (!modalOverlay) return;
    
    syncVolunteerProfile();
    syncThemeIcons();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function closeAdminModal() {
    const modalOverlay = document.getElementById('admin-modal-overlay') || document.getElementById('volunteer-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

function handleAdminOverlayClick(e) {
    if (e.target.id === 'admin-modal-overlay' || e.target.id === 'volunteer-modal-overlay') {
        closeAdminModal();
    }
}

// Aliases for volunteer naming consistency
const openVolunteerModal = openAdminModal;
const closeVolunteerModal = closeAdminModal;
const handleVolunteerOverlayClick = handleAdminOverlayClick;

function syncVolunteerProfile() {
    try {
        const stored = localStorage.getItem('samithi_user');
        let user = {};
        if (stored) {
            try { user = JSON.parse(stored); } catch (e) { user = {}; }
        }

        const fName = user.firstName || user.first_name || 'Volunteer';
        const lName = user.lastName || user.last_name || '';
        const fullName = `${fName} ${lName}`.trim() || 'Volunteer User';
        const initial = fName.charAt(0).toUpperCase() || 'V';
        const rawRole = (user.role || 'volunteer').toLowerCase();
        const roleBadge = rawRole === 'volunteer' ? 'Volunteer' : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));
        const fullRole = rawRole === 'volunteer' ? 'Active Volunteer' : (roleBadge + ' Volunteer');
        const email = user.email || 'volunteer@sevalog.in';

        // Header Avatar and Name Elements
        const headerAvatar = document.getElementById('header-user-avatar');
        if (headerAvatar) headerAvatar.textContent = initial;
        const userInitial = document.getElementById('user-initial');
        if (userInitial) userInitial.textContent = initial;
        const userNameTop = document.getElementById('user-name-top');
        if (userNameTop) userNameTop.textContent = fName;

        // Modal Elements
        const modalAvatar = document.getElementById('modal-user-avatar');
        const modalName = document.getElementById('modal-user-name');
        const modalRoleBadge = document.getElementById('modal-user-role-badge');
        const modalUserEmail = document.getElementById('modal-user-email');
        const modalInfoRole = document.getElementById('modal-info-role');

        if (modalAvatar) modalAvatar.textContent = initial;
        if (modalName) modalName.textContent = fullName;
        if (modalRoleBadge) modalRoleBadge.textContent = roleBadge;
        if (modalUserEmail) modalUserEmail.textContent = email;
        if (modalInfoRole) modalInfoRole.textContent = fullRole;
    } catch (e) {
        console.warn("[Volunteer] Could not parse session for profile display:", e);
    }
}

// Expose globally
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.handleAdminOverlayClick = handleAdminOverlayClick;
window.openVolunteerModal = openVolunteerModal;
window.closeVolunteerModal = closeVolunteerModal;
window.handleVolunteerOverlayClick = handleVolunteerOverlayClick;
window.toggleTheme = toggleTheme;
window.syncThemeIcons = syncThemeIcons;
window.syncVolunteerProfile = syncVolunteerProfile;

// ==========================================
// VOLUNTEER ACCOUNT SETTINGS MODAL LOGIC
// ==========================================

function getVolunteerSettingsModalHtml() {
    return `
    <div id="volunteer-settings-modal-overlay" class="settings-modal-overlay" onclick="handleSettingsOverlayClick(event)">
        <div class="settings-modal-container" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <!-- Modal Header -->
            <div class="settings-modal-header">
                <div class="settings-header-left">
                    <button type="button" class="settings-back-btn" onclick="backToVolunteerProfileModal()" title="Back to Profile" aria-label="Back to Profile">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <div class="settings-title-group">
                        <div class="settings-title-badge">
                            <i data-lucide="user-cog"></i>
                            <span>Volunteer Account</span>
                        </div>
                        <h2 id="settings-modal-title">Account Settings</h2>
                    </div>
                </div>
                <button type="button" class="sheet-close-btn" onclick="closeVolunteerSettingsModal()" aria-label="Close Settings">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <!-- Tab Navigation Bar -->
            <div class="settings-modal-tabs" role="tablist">
                <button type="button" class="settings-tab-btn active" data-tab="tab-personal" onclick="switchSettingsTab('tab-personal')">
                    <i data-lucide="user"></i>
                    <span>Personal</span>
                </button>
                <button type="button" class="settings-tab-btn" data-tab="tab-skills" onclick="switchSettingsTab('tab-skills')">
                    <i data-lucide="briefcase"></i>
                    <span>Skills & Service</span>
                </button>
                <button type="button" class="settings-tab-btn" data-tab="tab-emergency" onclick="switchSettingsTab('tab-emergency')">
                    <i data-lucide="heart-pulse"></i>
                    <span>Emergency</span>
                </button>
                <button type="button" class="settings-tab-btn" data-tab="tab-security" onclick="switchSettingsTab('tab-security')">
                    <i data-lucide="shield-check"></i>
                    <span>Security</span>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="settings-modal-body">
                <!-- Form: Profile Details -->
                <form id="modal-profile-form" onsubmit="handleModalProfileSubmit(event)">
                    <!-- TAB 1: Personal -->
                    <div class="settings-modal-panel active" id="modal-tab-personal">
                        <div class="panel-intro">
                            <h3>Personal Information</h3>
                            <p>Update your volunteer identity and residential address.</p>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-first-name">First Name <span class="req-star">*</span></label>
                                <input type="text" id="modal-first-name" required placeholder="First name">
                            </div>
                            <div class="form-group">
                                <label for="modal-last-name">Last Name <span class="req-star">*</span></label>
                                <input type="text" id="modal-last-name" required placeholder="Last name">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-dob">Date of Birth</label>
                                <input type="date" id="modal-dob">
                            </div>
                            <div class="form-group">
                                <label for="modal-gender">Gender</label>
                                <select id="modal-gender" class="form-input">
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="modal-blood-group">Blood Group</label>
                            <select id="modal-blood-group" class="form-input">
                                <option value="">Select Blood Group</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="modal-address">Residential Address</label>
                            <textarea id="modal-address" rows="2" placeholder="Full residential street address"></textarea>
                        </div>

                        <div class="form-row form-row-3">
                            <div class="form-group">
                                <label for="modal-city">City</label>
                                <input type="text" id="modal-city" placeholder="City">
                            </div>
                            <div class="form-group">
                                <label for="modal-state">State</label>
                                <input type="text" id="modal-state" placeholder="State">
                            </div>
                            <div class="form-group">
                                <label for="modal-pincode">Pincode</label>
                                <input type="text" id="modal-pincode" placeholder="Pincode">
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: Skills & Service -->
                    <div class="settings-modal-panel" id="modal-tab-skills">
                        <div class="panel-intro">
                            <h3>Background & Skills</h3>
                            <p>Education, current vocation, and skills you bring to seva.</p>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-education">Highest Education Level</label>
                                <input type="text" id="modal-education" placeholder="e.g. Bachelor's Degree">
                            </div>
                            <div class="form-group">
                                <label for="modal-college">College / University</label>
                                <input type="text" id="modal-college" placeholder="e.g. IIT Bombay">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="modal-profession">Profession / Vocation</label>
                            <input type="text" id="modal-profession" placeholder="e.g. Software Engineer, Teacher, Student">
                        </div>

                        <div class="form-group">
                            <label for="modal-skills">Skills <span class="label-hint">(Comma separated)</span></label>
                            <input type="text" id="modal-skills" placeholder="e.g. Teaching, Event Coordination, First Aid">
                        </div>

                        <div class="form-group">
                            <label for="modal-languages">Languages Spoken <span class="label-hint">(Comma separated)</span></label>
                            <input type="text" id="modal-languages" placeholder="e.g. English, Hindi, Telugu, Marathi">
                        </div>

                        <div class="form-group">
                            <label for="modal-activities">Interested Activities <span class="label-hint">(Comma separated)</span></label>
                            <input type="text" id="modal-activities" placeholder="e.g. Food Distribution, Tree Plantation, Medical Camp">
                        </div>
                    </div>

                    <!-- TAB 3: Emergency & Health -->
                    <div class="settings-modal-panel" id="modal-tab-emergency">
                        <div class="panel-intro">
                            <h3>Emergency & Medical Information</h3>
                            <p>Critical details for on-field safety during volunteer drives.</p>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-emergency-name">Emergency Contact Name</label>
                                <input type="text" id="modal-emergency-name" placeholder="Full name of contact">
                            </div>
                            <div class="form-group">
                                <label for="modal-emergency-relation">Relationship</label>
                                <input type="text" id="modal-emergency-relation" placeholder="e.g. Parent, Spouse, Sibling">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="modal-emergency-phone">Emergency Contact Phone</label>
                            <input type="tel" id="modal-emergency-phone" placeholder="10-digit mobile number">
                        </div>

                        <div class="form-group">
                            <label for="modal-medical">Medical Conditions / Allergies (if any)</label>
                            <textarea id="modal-medical" rows="3" placeholder="List any allergies, dietary or physical conditions coordinators should know"></textarea>
                        </div>
                    </div>

                    <!-- Shared Action Bar for Tabs 1, 2, 3 -->
                    <div class="settings-modal-footer" id="modal-profile-footer">
                        <div class="settings-footer-left">
                            <span id="modal-profile-msg" class="settings-status-msg"></span>
                        </div>
                        <div class="settings-footer-actions">
                            <button type="button" class="btn-cancel-modal" onclick="closeVolunteerSettingsModal()">Cancel</button>
                            <button type="submit" class="btn-save-modal" id="modal-save-profile-btn">
                                <i data-lucide="check"></i>
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </form>

                <!-- TAB 4: Security & Password (Separate Form) -->
                <div class="settings-modal-panel" id="modal-tab-security">
                    <div class="panel-intro">
                        <h3>Account Credentials & Security</h3>
                        <p>Your verified login identifiers and password management.</p>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="modal-email">Registered Email</label>
                            <input type="email" id="modal-email" class="input-readonly" readonly>
                            <span class="field-note"><i data-lucide="lock"></i> Contact admin to change email</span>
                        </div>
                        <div class="form-group">
                            <label for="modal-phone">Registered Phone</label>
                            <input type="text" id="modal-phone" class="input-readonly" readonly>
                            <span class="field-note"><i data-lucide="lock"></i> Verified login phone number</span>
                        </div>
                    </div>

                    <div class="security-divider">
                        <div class="divider-line"></div>
                        <span class="divider-text">Change Password</span>
                        <div class="divider-line"></div>
                    </div>

                    <form id="modal-password-form" onsubmit="handleModalPasswordSubmit(event)">
                        <div class="form-group">
                            <label for="modal-curr-pwd">Current Password <span class="req-star">*</span></label>
                            <div class="password-input-wrap">
                                <input type="password" id="modal-curr-pwd" required placeholder="Enter current password">
                                <button type="button" class="pwd-toggle-btn" onclick="togglePasswordVisibility('modal-curr-pwd')" title="Toggle visibility" aria-label="Toggle password visibility">
                                    <i data-lucide="eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-new-pwd">New Password <span class="req-star">*</span></label>
                                <div class="password-input-wrap">
                                    <input type="password" id="modal-new-pwd" required minlength="6" placeholder="Min 6 characters">
                                    <button type="button" class="pwd-toggle-btn" onclick="togglePasswordVisibility('modal-new-pwd')" title="Toggle visibility" aria-label="Toggle password visibility">
                                        <i data-lucide="eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="modal-confirm-pwd">Confirm New Password <span class="req-star">*</span></label>
                                <div class="password-input-wrap">
                                    <input type="password" id="modal-confirm-pwd" required minlength="6" placeholder="Retype new password">
                                    <button type="button" class="pwd-toggle-btn" onclick="togglePasswordVisibility('modal-confirm-pwd')" title="Toggle visibility" aria-label="Toggle password visibility">
                                        <i data-lucide="eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="password-form-footer">
                            <div id="modal-pwd-msg-wrap" style="min-height: 20px;">
                                <span id="modal-pwd-msg" class="settings-status-msg"></span>
                            </div>
                            <button type="submit" class="btn-save-modal btn-update-pwd-full" id="modal-save-pwd-btn">
                                <i data-lucide="key"></i>
                                <span>Update Password</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
    `;
}

function ensureSettingsModalInDom() {
    let overlay = document.getElementById('volunteer-settings-modal-overlay');
    if (!overlay) {
        const div = document.createElement('div');
        div.innerHTML = getVolunteerSettingsModalHtml().trim();
        overlay = div.firstElementChild;
        document.body.appendChild(overlay);
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    return overlay;
}

function openVolunteerSettingsModal() {
    closeAdminModal(); // close the bottom sheet first
    const overlay = ensureSettingsModalInDom();
    if (!overlay) return;

    // Reset status messages
    const profMsg = document.getElementById('modal-profile-msg');
    if (profMsg) profMsg.innerHTML = '';
    const pwdMsg = document.getElementById('modal-pwd-msg');
    if (pwdMsg) pwdMsg.innerHTML = '';

    // Switch to first tab
    switchSettingsTab('tab-personal');

    // Populate data
    loadVolunteerSettingsData();

    // Show modal
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.lucide) {
        lucide.createIcons();
    }
}

function closeVolunteerSettingsModal() {
    const overlay = document.getElementById('volunteer-settings-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

function backToVolunteerProfileModal() {
    closeVolunteerSettingsModal();
    setTimeout(() => {
        openAdminModal();
    }, 150);
}

function handleSettingsOverlayClick(e) {
    if (e.target.id === 'volunteer-settings-modal-overlay') {
        closeVolunteerSettingsModal();
    }
}

function switchSettingsTab(tabId) {
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    const panels = document.querySelectorAll('.settings-modal-panel');
    const footer = document.getElementById('modal-profile-footer');

    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    panels.forEach(panel => {
        if (panel.id === `modal-${tabId}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    if (footer) {
        // Tab 4 (Security) has its own form & submit button
        if (tabId === 'tab-security') {
            footer.style.display = 'none';
        } else {
            footer.style.display = 'flex';
        }
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

async function loadVolunteerSettingsData() {
    // 1. Instant pre-fill from cached session data
    try {
        const stored = localStorage.getItem('samithi_user');
        if (stored) {
            const user = JSON.parse(stored);
            const fn = document.getElementById('modal-first-name');
            const ln = document.getElementById('modal-last-name');
            const em = document.getElementById('modal-email');
            const ph = document.getElementById('modal-phone');

            if (fn && !fn.value) fn.value = user.firstName || user.first_name || '';
            if (ln && !ln.value) ln.value = user.lastName || user.last_name || '';
            if (em) em.value = user.email || '';
            if (ph) ph.value = user.phoneNumber || user.phone_number || '';
        }
    } catch (err) {
        console.warn("[Settings Modal] Session parse warning:", err);
    }

    // 2. Fetch complete profile from API
    if (typeof ApiClient === 'undefined') return;
    try {
        const response = await ApiClient.request('/volunteer/profile', 'GET');
        const data = response && response.data ? response.data : null;
        if (!data) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) {
                el.value = val;
            }
        };

        setVal('modal-first-name', data.first_name || data.firstName);
        setVal('modal-last-name', data.last_name || data.lastName);
        setVal('modal-email', data.email);
        setVal('modal-phone', data.phone_number || data.phoneNumber);
        setVal('modal-gender', data.gender);
        setVal('modal-blood-group', data.blood_group);
        setVal('modal-address', data.residential_address);
        setVal('modal-city', data.city);
        setVal('modal-state', data.state);
        setVal('modal-pincode', data.pincode);

        if (data.date_of_birth) {
            try {
                const dob = new Date(data.date_of_birth).toISOString().split('T')[0];
                setVal('modal-dob', dob);
            } catch (_) {
                setVal('modal-dob', data.date_of_birth);
            }
        }

        setVal('modal-education', data.education_level);
        setVal('modal-college', data.college_name);
        setVal('modal-profession', data.profession);

        const setCsv = (id, arr) => {
            const el = document.getElementById(id);
            if (el) {
                if (Array.isArray(arr)) {
                    el.value = arr.join(', ');
                } else if (typeof arr === 'string') {
                    el.value = arr;
                }
            }
        };

        setCsv('modal-skills', data.skills);
        setCsv('modal-languages', data.languages_spoken);
        setCsv('modal-activities', data.interested_activities);

        setVal('modal-emergency-name', data.emergency_contact_name);
        setVal('modal-emergency-relation', data.emergency_contact_relation);
        setVal('modal-emergency-phone', data.emergency_contact_number);
        setVal('modal-medical', data.medical_conditions);

    } catch (err) {
        console.warn("[Settings Modal] Fetch profile notice:", err);
    }
}

async function handleModalProfileSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('modal-save-profile-btn');
    const msg = document.getElementById('modal-profile-msg');

    const collegeName = document.getElementById('modal-college')?.value.trim() || '';
    const profession = document.getElementById('modal-profession')?.value.trim() || '';

    // Frontend validation for DB constraint (chk_college_or_profession)
    if (!collegeName && !profession) {
        if (msg) {
            msg.className = 'settings-status-msg error';
            msg.innerHTML = `<i data-lucide="alert-circle"></i> Please provide College Name or Profession.`;
            if (window.lucide) lucide.createIcons();
        }
        switchSettingsTab('tab-skills');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="settings-spin" style="width:16px;height:16px;"></i> <span>Saving...</span>`;
        if (window.lucide) lucide.createIcons();
    }

    const parseCsv = (val) => {
        if (!val) return [];
        return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    const firstName = document.getElementById('modal-first-name')?.value.trim() || '';
    const lastName = document.getElementById('modal-last-name')?.value.trim() || '';

    const payload = {
        firstName,
        lastName,
        dateOfBirth: document.getElementById('modal-dob')?.value || null,
        gender: document.getElementById('modal-gender')?.value || null,
        bloodGroup: document.getElementById('modal-blood-group')?.value || null,
        residentialAddress: document.getElementById('modal-address')?.value || '',
        city: document.getElementById('modal-city')?.value || '',
        state: document.getElementById('modal-state')?.value || '',
        pincode: document.getElementById('modal-pincode')?.value || '',
        educationLevel: document.getElementById('modal-education')?.value || '',
        collegeName: collegeName || null,
        profession: profession || null,
        skills: parseCsv(document.getElementById('modal-skills')?.value),
        languagesSpoken: parseCsv(document.getElementById('modal-languages')?.value),
        interestedActivities: parseCsv(document.getElementById('modal-activities')?.value),
        emergencyContactName: document.getElementById('modal-emergency-name')?.value || '',
        emergencyContactRelation: document.getElementById('modal-emergency-relation')?.value || '',
        emergencyContactNumber: document.getElementById('modal-emergency-phone')?.value || '',
        medicalConditions: document.getElementById('modal-medical')?.value || ''
    };

    try {
        await ApiClient.request('/volunteer/profile', 'PUT', payload);

        // Update local session immediately
        try {
            const session = JSON.parse(localStorage.getItem('samithi_user') || '{}');
            session.firstName = firstName;
            session.lastName = lastName;
            localStorage.setItem('samithi_user', JSON.stringify(session));
        } catch (_) {}

        // Refresh UI
        syncVolunteerProfile();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check"></i> <span>Saved!</span>`;
            btn.style.background = '#10B981';
        }
        if (msg) {
            msg.className = 'settings-status-msg success';
            msg.innerHTML = `<i data-lucide="check-circle-2"></i> Profile updated successfully`;
        }
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = `<i data-lucide="check"></i> <span>Save Changes</span>`;
                btn.style.background = '';
                if (window.lucide) lucide.createIcons();
            }
            if (msg) msg.innerHTML = '';
        }, 3000);

    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check"></i> <span>Save Changes</span>`;
            if (window.lucide) lucide.createIcons();
        }
        if (msg) {
            msg.className = 'settings-status-msg error';
            msg.innerHTML = `<i data-lucide="alert-circle"></i> ${err.message || 'Failed to update profile'}`;
            if (window.lucide) lucide.createIcons();
        }
    }
}

async function handleModalPasswordSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('modal-save-pwd-btn');
    const msg = document.getElementById('modal-pwd-msg');

    const currentPassword = document.getElementById('modal-curr-pwd')?.value || '';
    const newPassword = document.getElementById('modal-new-pwd')?.value || '';
    const confirmPassword = document.getElementById('modal-confirm-pwd')?.value || '';

    if (newPassword !== confirmPassword) {
        if (msg) {
            msg.className = 'settings-status-msg error';
            msg.innerHTML = `<i data-lucide="alert-circle"></i> Passwords do not match.`;
            if (window.lucide) lucide.createIcons();
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="settings-spin" style="width:16px;height:16px;"></i> <span>Updating...</span>`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        await ApiClient.request('/auth/change-password', 'PUT', { currentPassword, newPassword });

        document.getElementById('modal-password-form')?.reset();

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check"></i> <span>Password Changed!</span>`;
            btn.style.background = '#10B981';
        }
        if (msg) {
            msg.className = 'settings-status-msg success';
            msg.innerHTML = `<i data-lucide="check-circle-2"></i> Password changed securely`;
        }
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = `<i data-lucide="key"></i> <span>Update Password</span>`;
                btn.style.background = '';
                if (window.lucide) lucide.createIcons();
            }
            if (msg) msg.innerHTML = '';
        }, 3000);

    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="key"></i> <span>Update Password</span>`;
            if (window.lucide) lucide.createIcons();
        }
        if (msg) {
            msg.className = 'settings-status-msg error';
            msg.innerHTML = `<i data-lucide="alert-circle"></i> ${err.message || 'Could not update password'}`;
            if (window.lucide) lucide.createIcons();
        }
    }
}

function togglePasswordVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const isPwd = el.type === 'password';
    el.type = isPwd ? 'text' : 'password';
    const btn = el.parentElement.querySelector('.pwd-toggle-btn');
    if (btn) {
        btn.innerHTML = isPwd ? `<i data-lucide="eye-off"></i>` : `<i data-lucide="eye"></i>`;
        if (window.lucide) lucide.createIcons();
    }
}

// Expose settings modal functions globally
window.openVolunteerSettingsModal = openVolunteerSettingsModal;
window.closeVolunteerSettingsModal = closeVolunteerSettingsModal;
window.backToVolunteerProfileModal = backToVolunteerProfileModal;
window.handleSettingsOverlayClick = handleSettingsOverlayClick;
window.switchSettingsTab = switchSettingsTab;
window.handleModalProfileSubmit = handleModalProfileSubmit;
window.handleModalPasswordSubmit = handleModalPasswordSubmit;
window.togglePasswordVisibility = togglePasswordVisibility;

// Global Listeners for Modal & Logout
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const settingsModal = document.getElementById('volunteer-settings-modal-overlay');
        if (settingsModal && settingsModal.classList.contains('active')) {
            closeVolunteerSettingsModal();
        } else {
            closeAdminModal();
        }
    }
});

// Intercept Account Settings clicks anywhere to trigger modal instead of navigating
document.addEventListener('click', (e) => {
    const settingsTrigger = e.target.closest('.account-settings-row, .sheet-settings-link, #open-settings-modal-btn');
    if (settingsTrigger) {
        // If it's a volunteer page, open modal instead of navigating!
        const isVolunteer = window.location.pathname.includes('/volunteer/') || document.querySelector('.volunteer-mobile-nav');
        if (isVolunteer) {
            e.preventDefault();
            e.stopPropagation();
            openVolunteerSettingsModal();
        }
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.account-settings-row, #open-settings-modal-btn')) {
        e.preventDefault();
        openVolunteerSettingsModal();
    }
});

document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
        e.preventDefault();
        closeAdminModal();
        if (typeof ApiClient !== 'undefined' && ApiClient.clearSession) {
            ApiClient.clearSession();
        } else {
            localStorage.removeItem('samithi_token');
            localStorage.removeItem('samithi_user');
            window.location.replace('../login.html');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    syncThemeIcons();
    syncVolunteerProfile();

    // Check if settings modal was requested via URL query param
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('settings') === 'open' || urlParams.get('openSettings') === '1') {
            setTimeout(() => {
                if (typeof openVolunteerSettingsModal === 'function') {
                    openVolunteerSettingsModal();
                }
            }, 250);
        }
    } catch (_) {}
    
    // 1. Initialize Icons
    if (window.lucide) lucide.createIcons();

    // 2. High-Performance Scroll Listener
    const navbar = document.getElementById('navbar');
    if (navbar) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    navbar.classList.toggle('scrolled', window.scrollY > 40);
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // 3. Mobile Hamburger Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const iconElement = mobileBtn.querySelector('i');
            const targetContainer = document.getElementById('navbar') || document.getElementById('sidebar');
            const toggleClass = targetContainer.id === 'navbar' ? 'menu-active' : 'open';

            if (targetContainer) {
                targetContainer.classList.toggle(toggleClass);
                const isOpen = targetContainer.classList.contains(toggleClass);
                
                if (iconElement) {
                    iconElement.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                    if (window.lucide) lucide.createIcons();
                }
            }
        });
    }

    // ==========================================
    // 3.5. Close Sidebar on Outside Click (Mobile)
    // ==========================================
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        
        // Check if the sidebar exists and is currently open
        if (sidebar && sidebar.classList.contains('open')) {
            // If the click was NOT inside the sidebar, and NOT on the menu button itself
            if (!sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
                sidebar.classList.remove('open');
                
                // Reset the hamburger icon back to 'menu'
                if (mobileBtn) {
                    const iconElement = mobileBtn.querySelector('i');
                    if (iconElement) {
                        iconElement.setAttribute('data-lucide', 'menu');
                        if (window.lucide) lucide.createIcons();
                    }
                }
            }
        }
    });

    // ==========================================
    // 3.6. Volunteer Profile Modal Handlers
    // ==========================================
    const userProfileTrigger = document.querySelector('.user-profile-menu');
    if (userProfileTrigger) {
        userProfileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openAdminModal();
        });
    }

    // Sync theme and profile data on initial page load
    syncThemeIcons();
    syncVolunteerProfile();

    // ==========================================
    // 3.7. 1:1 Real-Time Sidebar Swipe Gesture
    // ==========================================
    let touchStartX = 0;
    let touchStartY = 0;
    let currentX = 0;
    let isDragging = false;
    let isScrolling = false; // To prevent sidebar movement when scrolling down the page
    let sidebarWidth = 0;

    const sidebar = document.getElementById('sidebar');

    if (sidebar) {
        document.addEventListener('touchstart', (e) => {
            if (window.innerWidth > 900) return; // Only active on mobile
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            const isOpen = sidebar.classList.contains('open');

            // Safety Lock: To open, swipe must start near left edge (< 40px). 
            // To close, swipe can start anywhere on the open sidebar.
            if (!isOpen && touchStartX > 40) return;

            isDragging = true;
            isScrolling = false;
            sidebarWidth = sidebar.offsetWidth;

            // Remove CSS transition so it sticks instantly to the finger without lagging
            sidebar.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const deltaX = currentX - touchStartX;
            const deltaY = currentY - touchStartY;

            // Determine if the user is trying to scroll vertically instead of swiping
            if (!isScrolling && Math.abs(deltaY) > Math.abs(deltaX)) {
                isDragging = false;
                isScrolling = true;
                sidebar.style.transition = ''; // Restore animation
                sidebar.style.transform = '';  // Clear inline position
                return;
            }

            // If it's a valid horizontal swipe, calculate the exact pixel position
            const isOpen = sidebar.classList.contains('open');
            let translateX = 0;

            if (isOpen) {
                // Starts at 0px (fully visible). Dragging left (negative deltaX) pushes it off-screen.
                translateX = Math.min(0, deltaX);
            } else {
                // Starts at -sidebarWidth (hidden). Dragging right (positive deltaX) pulls it on-screen.
                translateX = -sidebarWidth + Math.max(0, deltaX);
            }

            // Clamp the values so it can't be dragged too far right or left
            translateX = Math.max(-sidebarWidth, Math.min(0, translateX));

            // Apply the exact pixel translation in real-time
            sidebar.style.transform = `translateX(${translateX}px)`;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            // Clear the inline styles and let the CSS classes take over again
            sidebar.style.transition = '';
            sidebar.style.transform = ''; 

            const deltaX = currentX - touchStartX;
            const isOpen = sidebar.classList.contains('open');
            
            // Threshold: User must drag it at least 30% of its width to commit to the action
            const threshold = sidebarWidth * 0.3; 

            if (isOpen) {
                // Was open, user dragged left to close it
                if (deltaX < -threshold) {
                    sidebar.classList.remove('open');
                    updateMenuIcon(false);
                }
            } else {
                // Was closed, user dragged right to open it
                if (deltaX > threshold) {
                    sidebar.classList.add('open');
                    updateMenuIcon(true);
                }
            }
        });

        function updateMenuIcon(isOpen) {
            if (mobileBtn) {
                const iconEl = mobileBtn.querySelector('i');
                if (iconEl) {
                    iconEl.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                    if (window.lucide) lucide.createIcons();
                }
            }
        }
    }

    // 4. Scroll Reveal Animations
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // 5. Smooth Number Counting Animation
    const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endValue = parseInt(target.getAttribute('data-target') || 0, 10);
                const suffix = target.getAttribute('data-suffix') || '';
                let startTime = null;

                const countUp = (currentTime) => {
                    if (!startTime) startTime = currentTime;
                    const progress = Math.min((currentTime - startTime) / 2000, 1); // 2000ms duration
                    
                    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
                    const currentVal = Math.floor(easeProgress * endValue);
                    
                    target.innerText = currentVal.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(countUp);
                    }
                };
                
                requestAnimationFrame(countUp);
                obs.unobserve(target); 
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));
});