// ==========================================
// DOCUMENTS.JS (Certificate Generator)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    async function generateCertificate() {
        // Mock authentication check
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            document.getElementById('cert-name').innerText = "Please Log In";
            return;
        }

        // Fetch User Data
        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name, total_hours_served')
            .eq('id', user.id)
            .single();

        if (profile) {
            // Populate the Digital Certificate
            document.getElementById('cert-name').innerText = profile.full_name;
            document.getElementById('cert-hours').innerText = profile.total_hours_served || 0;
            
            // Set today's date
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('cert-date').innerText = today;
        }
    }

    generateCertificate();
    lucide.createIcons();
});