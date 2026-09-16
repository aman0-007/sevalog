// ==========================================
// API.JS (Optimized Fetch Core)
// ==========================================
const BASE_URL = 'https://sai9.tech/api';

const ApiClient = {
    _tokenCache: null, // Memory cache for faster access

    getToken: () => {
        if (!ApiClient._tokenCache) {
            ApiClient._tokenCache = localStorage.getItem('samithi_token');
        }
        return ApiClient._tokenCache;
    },

    setSession: (token, user) => {
        localStorage.setItem('samithi_token', token);
        localStorage.setItem('samithi_user', JSON.stringify(user));
        ApiClient._tokenCache = token;
    },

    clearSession: (redirectUrl = null) => {
        localStorage.removeItem('samithi_token');
        localStorage.removeItem('samithi_user');
        ApiClient._tokenCache = null;
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            const isVolunteer = window.location.pathname.includes('/volunteer/');
            const isAdmin = window.location.pathname.includes('/admin/');
            const prefix = (isVolunteer || isAdmin) ? '../../' : (window.location.pathname.includes('/frontend/') ? '../' : '');
            window.location.href = prefix + 'index.html';
        }
    },

    validateSession: async () => {
        const token = ApiClient.getToken();
        if (!token) return null;

        try {
            // First attempt to call /auth/me with Bearer token
            const headers = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            const res = await fetch(`${BASE_URL}/auth/me`, { method: 'GET', headers });

            if (res.ok) {
                const data = await res.json();
                const freshUser = data.data || data.user || data;
                if (freshUser && (freshUser.id || freshUser.user_id || freshUser.email)) {
                    // Standardize firstName / lastName
                    if (!freshUser.firstName && freshUser.first_name) freshUser.firstName = freshUser.first_name;
                    if (!freshUser.lastName && freshUser.last_name) freshUser.lastName = freshUser.last_name;

                    const existing = JSON.parse(localStorage.getItem('samithi_user') || '{}');
                    const merged = { ...existing, ...freshUser };
                    localStorage.setItem('samithi_user', JSON.stringify(merged));
                    return merged;
                }
            } else if (res.status === 401) {
                console.warn("[Auth] Session expired or invalid (401). Clearing session.");
                ApiClient.clearSession();
                return null;
            } else if (res.status === 404) {
                // If backend does not have /auth/me route yet, fall back to /volunteer/profile or /admin/dashboard-stats
                const existing = JSON.parse(localStorage.getItem('samithi_user') || '{}');
                if (existing.role === 'volunteer') {
                    try {
                        const profRes = await ApiClient.request('/volunteer/profile', 'GET');
                        if (profRes && profRes.data) {
                            const p = profRes.data;
                            const merged = {
                                ...existing,
                                firstName: p.first_name || existing.firstName,
                                lastName: p.last_name || existing.lastName,
                                email: p.email || existing.email,
                                total_hours: p.total_hours !== undefined ? p.total_hours : existing.total_hours
                            };
                            localStorage.setItem('samithi_user', JSON.stringify(merged));
                            return merged;
                        }
                    } catch (e) {
                        if (e.message && e.message.includes('401')) {
                            ApiClient.clearSession();
                            return null;
                        }
                    }
                }
            }
            return JSON.parse(localStorage.getItem('samithi_user') || 'null');
        } catch (err) {
            console.warn("[Auth] Session validation failed:", err.message);
            return JSON.parse(localStorage.getItem('samithi_user') || 'null');
        }
    },

    throwTo404: () => {
        window.location.href = '../404.html'; 
    },

    request: async (endpoint, method = 'GET', body = null) => {
        const headers = { 'Content-Type': 'application/json' };
        const token = ApiClient.getToken();
        
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle unauthorized access (Session Expiry) gracefully
                if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.startsWith('/public/')) {
                    ApiClient.clearSession();
                }
                // Fallback to error or message depending on backend structure
                throw new Error(data.message || data.error || 'API Request Failed');
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${method} ${endpoint}:`, error.message);
            throw error; 
        }
    }
};