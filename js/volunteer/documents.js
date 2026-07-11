// ==========================================
// DOCUMENTS.JS (Certificate Generator)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Check Authentication
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    if (!token) {
        window.location.href = '../login.html'; 
        return;
    }

    async function generateCertificate() {
        // 2. Fetch User Name from Local Session
        const sessionStr = localStorage.getItem('samithi_user');
        if (sessionStr) {
            const user = JSON.parse(sessionStr);
            document.getElementById('cert-name').innerText = `${user.firstName} ${user.lastName}`;
        } else {
            document.getElementById('cert-name').innerText = "Valued Volunteer";
        }

        // 3. Set Today's Date
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('cert-date').innerText = today;

        // 4. Fetch Verified Hours from API
        try {
            const response = await ApiClient.request('/volunteer/dashboard', 'GET');
            if (response.data) {
                // Remove trailing zeros if it's a clean number, otherwise show 2 decimals
                const hours = parseFloat(response.data.total_hours_logged || 0);
                document.getElementById('cert-hours').innerText = hours;
            }
        } catch (err) {
            console.error("Failed to fetch verified hours:", err);
            document.getElementById('cert-hours').innerText = "0";
        }
    }

    generateCertificate();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});