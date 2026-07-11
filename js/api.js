// ==========================================
// API.JS (The Core API Brain)
// ==========================================
const BASE_URL = 'http://192.168.1.8:5000/api';

const ApiClient = {
    // Helper function to get the token from local storage
    getToken: () => localStorage.getItem('samithi_token'),

    // Helper function to save the token and user data on login
    setSession: (token, user) => {
        localStorage.setItem('samithi_token', token);
        localStorage.setItem('samithi_user', JSON.stringify(user));
    },

    // Standard Logout (Used when they click the logout button)
    clearSession: () => {
        localStorage.removeItem('samithi_token');
        localStorage.removeItem('samithi_user');
        window.location.href = '../../index.html';
    },

    // 👉 NEW: Helper to aggressively kick out unauthorized users to 404
    throwTo404: () => {
        // Adjust this path depending on where 404.html lives in your folders
        window.location.href = '../404.html'; 
    },

    // The Core Fetch Wrapper
    request: async (endpoint, method = 'GET', body = null) => {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = ApiClient.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                // 👉 THE FIX INCLUDED: Don't redirect if they are just trying to log in!
                if (response.status === 401 && endpoint !== '/auth/login') {
                    // If their token expired while browsing, send them to login
                    ApiClient.clearSession();
                }
                throw new Error(data.error || 'API Request Failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error; 
        }
    }
};