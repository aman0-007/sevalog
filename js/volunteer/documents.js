// ==========================================
// DOCUMENTS.JS (Real Certificate Generator)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Check Authentication
    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    const sessionStr = localStorage.getItem('samithi_user');
    
    if (!token || !sessionStr) {
        window.location.href = '../login.html'; 
        return;
    }

    const user = JSON.parse(sessionStr);
    const fullName = `${user.firstName} ${user.lastName}`;

    // 2. Load Certificates from API
    async function loadCertificates() {
        const container = document.getElementById('certificates-container');
        
        try {
            const response = await ApiClient.request('/volunteer/certificates', 'GET');
            const certificates = response.data || [];

            if (certificates.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 20px; border: 1px solid var(--border-light);">
                        <i data-lucide="award" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                        <h3 style="font-size: 18px; color: var(--text-main); margin-bottom: 8px;">No Certificates Yet</h3>
                        <p style="color: var(--text-muted); font-size: 14px;">Complete your first event check-out to earn a verified certificate.</p>
                    </div>`;
                if (window.lucide) lucide.createIcons();
                return;
            }

            // Generate HTML for each certificate
            container.innerHTML = certificates.map(cert => {
                // Formatting data safely
                const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const certTitle = cert.type === 'master' ? 'Master Volunteer Certificate' : 'Certificate of Appreciation';
                const eventContextHtml = cert.event_title 
                    ? `<p class="cert-text">for their active participation and successful completion of the <strong style="color: #0F172A;">${cert.event_title}</strong> initiative.</p>`
                    : `<p class="cert-text">in recognition of their outstanding overall dedication and selfless service to the community.</p>`;

                const hoursStr = parseFloat(cert.hours_credited).toFixed(2).replace(/\.00$/, ''); // Cleans up "4.00" to "4"

                return `
                <div class="certificate-wrapper reveal" style="margin-bottom: 20px;">
                    <div class="mobile-swipe-hint">
                        <i data-lucide="chevrons-right"></i> Swipe to view full certificate
                    </div>

                    <div class="certificate-frame">
                        <div class="certificate-inner">
                            
                            <div class="cert-header">
                                <i data-lucide="award" style="color: #0F172A; width: 36px; height: 36px;"></i>
                                <span class="cert-org">SevaLog Initiative</span>
                            </div>

                            <h1 class="cert-title">${certTitle}</h1>
                            
                            <p class="cert-text">This is proudly presented to</p>
                            
                            <h2 class="cert-name">${fullName}</h2>
                            
                            ${eventContextHtml}
                            
                            <div class="cert-hours">
                                <span>${hoursStr}</span>
                                <small>Verified Service Hours</small>
                            </div>

                            <div class="cert-bottom-row">
                                <div class="signature-block">
                                    <div class="signature-line"></div>
                                    <p>Platform Administrator</p>
                                </div>
                                
                                <div class="gold-seal">
                                    <div class="seal-inner">Verified</div>
                                    <div class="ribbon ribbon-left"></div>
                                    <div class="ribbon ribbon-right"></div>
                                </div>

                                <div class="signature-block">
                                    <div class="date-text">${issueDate}</div>
                                    <div class="signature-line"></div>
                                    <p>Date of Issuance</p>
                                </div>
                            </div>
                            
                            <!-- Hidden UUID for verifiable tracking -->
                            <div style="position: absolute; bottom: 20px; right: 60px; font-size: 9px; color: #94A3B8; font-family: monospace;">
                                ID: ${cert.certificate_id}
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Failed to load certificates:", err);
            container.innerHTML = '<p class="empty-msg" style="color: #EF4444;">Unable to load your certificates at this time.</p>';
        }
    }

    loadCertificates();
});