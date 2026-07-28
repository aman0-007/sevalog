// ==========================================
// API.JS (Optimized Fetch Core)
// ==========================================
const BASE_URL = 'http://192.168.1.8:5000/api';

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

    clearSession: () => {
        localStorage.removeItem('samithi_token');
        localStorage.removeItem('samithi_user');
        ApiClient._tokenCache = null;
        window.location.href = '../../index.html'; // Adjust path if needed
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
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
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