// ==========================================
// DOCUMENTS.JS (Master & Event Certificates)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    const token = typeof ApiClient !== 'undefined' ? ApiClient.getToken() : null;
    const sessionStr = localStorage.getItem('samithi_user');
    
    if (!token || !sessionStr) {
        window.location.href = '../login.html'; 
        return;
    }

    const user = JSON.parse(sessionStr);
    const fullName = `${user.firstName} ${user.lastName}`;

    async function loadCertificates() {
        const container = document.getElementById('certificates-container');
        
        try {
            // Concurrent fetch: Get Certificates AND Dashboard Stats (for progress bar)
            const [certRes, dashRes] = await Promise.all([
                ApiClient.request('/volunteer/certificates', 'GET'),
                ApiClient.request('/volunteer/dashboard', 'GET')
            ]);

            const certificates = certRes.data || [];
            const dashboardData = dashRes.data || {};
            const currentHours = parseFloat(dashboardData.impact?.total_hours_logged || 0);

            // Separate Master vs Event certificates
            const masterCert = certificates.find(c => c.type === 'master');
            const eventCerts = certificates.filter(c => c.type === 'event');

            let html = '';

            // --- 1. RENDER MASTER CERTIFICATE (Locked or Unlocked) ---
            if (masterCert) {
                html += generateCertHTML(masterCert, true);
            } else {
                const progressPct = Math.min((currentHours / 60) * 100, 100);
                html += `
                <div class="locked-certificate reveal">
                    <i data-lucide="lock" style="width: 48px; height: 48px; color: #94A3B8; margin-bottom: 16px;"></i>
                    <h3 style="font-size: 20px; color: #64748B; margin-bottom: 8px;">Master Service Diploma</h3>
                    <p style="color: #94A3B8; font-size: 14px; max-width: 450px;">This prestigious official diploma remains locked. It automatically unlocks when your combined contributions cross the 60 Verified Service Hours milestone.</p>
                    
                    <div class="locked-progress-container">
                        <div class="locked-progress-bg">
                            <div class="locked-progress-fill" style="width: ${progressPct}%;"></div>
                        </div>
                        <span style="font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase;">
                            ${currentHours} / 60 Hours
                        </span>
                    </div>
                </div>`;
            }

            // --- 2. RENDER EVENT CERTIFICATES ---
            html += `<h3 style="font-size: 18px; color: var(--text-main); margin-bottom: 16px; margin-top: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Event Certificates</h3>`;
            
            if (eventCerts.length > 0) {
                html += eventCerts.map(cert => generateCertHTML(cert, false)).join('');
            } else {
                html += `
                <div style="text-align: center; padding: 40px 20px; background: #F8FAFC; border-radius: 16px; border: 1px dashed var(--border-light);">
                    <p style="color: var(--text-muted); font-size: 14px;">Complete your first event check-out to earn an event certificate.</p>
                </div>`;
            }

            container.innerHTML = html;
            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Failed to load certificates:", err);
            container.innerHTML = '<p class="empty-msg" style="color: #EF4444;">Unable to load your certificates at this time.</p>';
        }
    }

    // Helper: HTML Generator for any valid certificate
    function generateCertHTML(cert, isMaster) {
        const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const certTitle = isMaster ? 'Master Volunteer Diploma' : 'Certificate of Appreciation';
        const themeClass = isMaster ? 'master-theme' : '';
        
        const eventContextHtml = isMaster 
            ? `<p class="cert-text">in recognition of their outstanding overall dedication and achieving the milestone of ${cert.hours_credited} hours of selfless service to the community.</p>`
            : `<p class="cert-text">for their active participation and successful completion of the <strong style="color: #0F172A;">${cert.event_title}</strong> initiative.</p>`;

        const hoursStr = parseFloat(cert.hours_credited).toString();

        return `
        <div class="certificate-wrapper reveal ${themeClass}" style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">${certTitle}</span>
                <button class="btn btn-primary" onclick="downloadCertificate(this, '${cert.certificate_id}')" style="font-size: 13px; padding: 6px 12px; border-radius: 8px;">
                    <i data-lucide="download" style="width: 16px; height: 16px;"></i> Download
                </button>
            </div>
            <div class="mobile-swipe-hint"><i data-lucide="chevrons-right"></i> Swipe to view full certificate</div>

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
    }

    loadCertificates();
});

// Canvas Downloader
window.downloadCertificate = async function(btnElement, certId) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px;"></i>`;
    btnElement.disabled = true;
    if (window.lucide) lucide.createIcons();

    try {
        const certFrame = document.getElementById(`cert-frame-${certId}`);
        const canvas = await html2canvas(certFrame, {
            scale: 3, 
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `SevaLog_Certificate_${certId.substring(0,6)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        alert("Failed to generate image.");
    } finally {
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
};