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
                const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const certTitle = cert.type === 'master' ? 'Master Volunteer Certificate' : 'Certificate of Appreciation';
                const eventContextHtml = cert.event_title 
                    ? `<p class="cert-text">for their active participation and successful completion of the <strong style="color: #0F172A;">${cert.event_title}</strong> initiative.</p>`
                    : `<p class="cert-text">in recognition of their outstanding overall dedication and selfless service to the community.</p>`;

                const hoursStr = parseFloat(cert.hours_credited).toString();

                return `
                <div class="certificate-wrapper reveal" style="margin-bottom: 30px;">
                    
                    <!-- NEW: Per-Certificate Action Bar -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                        <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">${certTitle}</span>
                        <button class="btn btn-primary" onclick="downloadCertificate(this, '${cert.certificate_id}')" style="font-size: 13px; padding: 6px 12px; border-radius: 8px;">
                            <i data-lucide="download" style="width: 16px; height: 16px;"></i> Download PNG
                        </button>
                    </div>

                    <div class="mobile-swipe-hint">
                        <i data-lucide="chevrons-right"></i> Swipe to view full certificate
                    </div>

                    <!-- Target ID added for HTML2Canvas -->
                    <div class="certificate-frame" id="cert-frame-${cert.certificate_id}">
                        <div class="certificate-inner">
                            
                            <div class="cert-header">
                                <i data-lucide="award" style="color: #0F172A; width: 36px; height: 36px;"></i>
                                <span class="cert-org">Seva Hub Initiative</span>
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

// ==========================================
// 3. HTML5 Canvas Download Generator
// ==========================================
window.downloadCertificate = async function(btnElement, certId) {
    // 1. UI Loading State
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px;"></i> Generating...`;
    btnElement.disabled = true;
    if (window.lucide) lucide.createIcons();

    try {
        // Optional: Ping your backend download API endpoint here if you want to log the download event
        // await ApiClient.request(`/volunteer/certificates/${certId}/download`, 'GET');

        // 2. Select the specific certificate frame
        const certFrame = document.getElementById(`cert-frame-${certId}`);
        
        // 3. Convert HTML to High-Res Canvas
        const canvas = await html2canvas(certFrame, {
            scale: 3, // Multiplies resolution for crisp, printable text
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        // 4. Convert Canvas to PNG image data
        const imgData = canvas.toDataURL('image/png');
        
        // 5. Trigger fake click to download the image
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `SevaLog_Certificate_${certId.substring(0,6)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Certificate generation failed:", error);
        alert("Failed to generate certificate image. Please try again.");
    } finally {
        // 6. Restore Button UI
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
};