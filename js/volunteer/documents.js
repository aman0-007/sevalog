// ==========================================
// DOCUMENTS.JS (List View & Pop-up Modal)
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
    
    // Store data globally so the modal can access it when clicked
    let globalCertificates = [];

    async function loadCertificates() {
        const container = document.getElementById('certificates-container');
        
        try {
            // Concurrent fetch
            const [certRes, dashRes] = await Promise.all([
                ApiClient.request('/volunteer/certificates', 'GET'),
                ApiClient.request('/volunteer/dashboard', 'GET')
            ]);

            // Save globally for the popup modal
            globalCertificates = certRes.data || [];
            
            const dashboardData = dashRes.data || {};
            // Safely grab total hours (Handle different API return structures)
            const currentHours = parseFloat((dashboardData.impact && dashboardData.impact.total_hours_logged) ? dashboardData.impact.total_hours_logged : 0);

            // Separate Master vs Standard (Events + Tasks) certificates
            const masterCert = globalCertificates.find(c => c.type === 'master');
            const standardCerts = globalCertificates.filter(c => c.type === 'event' || c.type === 'task');

            let html = '';

            // --- 1. THE LOCKED MASTER BANNER ---
            if (masterCert) {
                html += renderCertCard(masterCert, true);
            } else {
                const progressPct = Math.min((currentHours / 60) * 100, 100);
                html += `
                <div class="locked-certificate">
                    <!-- Left: Icon & Text Grouped Together -->
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                        <div class="locked-cert-icon-box">
                            <i data-lucide="lock" style="width: 24px; height: 24px; color: var(--text-muted);"></i>
                        </div>
                        <div>
                            <h3 class="locked-cert-title">Master Service Diploma</h3>
                            <p class="locked-cert-subtitle">Unlocks at 60 verified hours.</p>
                        </div>
                    </div>
                    
                    <!-- Right/Bottom: Progress Bar -->
                    <div class="locked-progress-container">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="locked-progress-label">Progress</span>
                            <span class="locked-progress-val">${currentHours} / 60 Hrs</span>
                        </div>
                        <div class="locked-progress-bg">
                            <div class="locked-progress-fill" style="width: ${progressPct}%;"></div>
                        </div>
                    </div>
                </div>`;
            }

            // --- 2. THE EVENT CERTIFICATES LIST ---
            html += `<h3 class="doc-section-header">Event Certificates</h3>`;
            
            if (standardCerts.length > 0) {
                html += `<div class="cert-card-grid">`;
                html += standardCerts.map(cert => renderCertCard(cert, false)).join('');
                html += `</div>`;
            } else {
                html += `
                <div class="doc-empty-state">
                    <div class="doc-empty-icon">
                        <i data-lucide="award" style="width: 24px; height: 24px;"></i>
                    </div>
                    <p class="doc-empty-text">Complete your first event check-out to earn an event certificate.</p>
                </div>`;
            }

            container.innerHTML = html;
            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Failed to load certificates:", err);
            container.innerHTML = '<p class="empty-msg" style="color: #EF4444;">Unable to load your certificates at this time.</p>';
        }
    }

    // Helper: Draws the small clickable cards for the list view
    function renderCertCard(cert, isMaster) {
        const date = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const title = isMaster ? 'Master Volunteer Diploma' : (cert.event_title || 'Certificate of Appreciation');
        let badgeText = 'VERIFIED EVENT';
        if (isMaster) badgeText = 'MILESTONE ACHIEVED';
        else if (cert.type === 'task') badgeText = 'VERIFIED TASK';

        const icon = isMaster ? 'crown' : 'award';
        const cssClass = isMaster ? 'cert-card cert-card-master' : 'cert-card';
        
        return `
        <div class="${cssClass}" onclick="openCertificateModal('${cert.certificate_id}')">
            <span class="status-badge" style="background: var(--bg-surface); color: var(--accent-primary); border: 1px solid var(--border); width: fit-content; font-size: 11px;">
                <i data-lucide="${icon}" style="width: 12px; display: inline; margin-bottom: -2px;"></i> ${badgeText}
            </span>
            <h4 style="margin: 0; font-size: 16px; color: var(--text-main); line-height: 1.3;">${title}</h4>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: auto;">
                <i data-lucide="clock" style="width: 14px; display: inline; margin-bottom: -2px; color: var(--accent-primary);"></i> <b style="color: var(--text-main);">${cert.hours_credited}</b> Hours Credited
                <br>
                <i data-lucide="calendar" style="width: 14px; display: inline; margin-bottom: -2px; margin-top: 6px; color: var(--accent-primary);"></i> Issued: ${date}
            </div>
        </div>`;
    }

    // Modal Builder: Generates the full high-res verifiable certificate inside the popup
    window.openCertificateModal = function(certId) {
        const cert = globalCertificates.find(c => c.certificate_id === certId);
        if (!cert) return;

        const isMaster = cert.type === 'master';
        const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const certTitle = isMaster ? 'Master Volunteer Diploma' : 'Certificate of Appreciation';
        const themeClass = isMaster ? 'master-theme' : '';
        
        // FIX: Grab the dynamic description directly from the database!
        // Added a fallback just in case you have old certificates generated before the DB update.
        const dynamicDescriptionHtml = cert.description || `<p class="cert-text">for their active participation and successful completion of the <strong style="color: #0F172A;">${cert.event_title || 'Seva Initiative'}</strong>.</p>`;
        
        const fullCertHtml = `
        <div class="certificate-frame ${themeClass}" id="cert-frame-${cert.certificate_id}">
            <div class="certificate-inner">
                <div class="certificate-core">
                    
                    <div class="cert-header">
                        <i data-lucide="shield-check" style="color: #D4AF37; width: 32px; height: 32px;"></i>
                        <span class="cert-org">Seva Hub Initiative</span>
                    </div>

                    <h1 class="cert-title">${certTitle}</h1>
                    <span class="cert-subtitle">is hereby proudly awarded to</span>
                    
                    <h2 class="cert-name">${fullName}</h2>
                    
                    <!-- INJECTED DYNAMIC DB TEMPLATE HERE -->
                    ${dynamicDescriptionHtml}
                    
                    <div class="cert-footer">
                        <!-- Left: QR Code Verification -->
                        <div class="cert-qr-block">
                            <span class="cert-qr-label">SCAN TO VERIFY</span>
                            <div class="cert-qr-box" id="cert-qr-${cert.certificate_id}"></div>
                            <span class="cert-id-text">ID: ${cert.certificate_id.split('-')[0].toUpperCase()}</span>
                        </div>

                        <!-- Center: Signature -->
                        <div class="cert-sig-block">
                            <span class="cert-date">${issueDate}</span>
                            <div class="cert-sig-line"></div>
                            <span class="cert-sig-label">Official Administrator</span>
                        </div>

                        <!-- Right: Premium Gold Seal -->
                        <div class="premium-seal">
                            <div class="premium-seal-inner">
                                <span class="seal-hrs">${cert.hours_credited}</span>
                                <span class="seal-txt">Verified<br>Hours</span>
                            </div>
                            <div class="seal-ribbon left"></div>
                            <div class="seal-ribbon right"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>`;

        // 1. Inject HTML into the modal
        document.getElementById('modal-certificate-render-area').innerHTML = fullCertHtml;
        document.getElementById('modal-download-btn').onclick = function() { downloadCertificate(this, cert.certificate_id); };
        
        // 2. Generate the QR Code directly into the box we just created
        const qrContainer = document.getElementById(`cert-qr-${cert.certificate_id}`);
        qrContainer.innerHTML = ""; // Clear it just in case
        const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(cert.certificate_id)}`;
        new QRCode(qrContainer, {
            text: verifyUrl,
            width: 70,
            height: 70,
            colorDark: "#0F172A",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L
        });

        // 3. Show Modal & render icons
        document.getElementById('certificateModal').classList.add('active');
        if (window.lucide) lucide.createIcons();
    };

    window.closeCertificateModal = function() {
        document.getElementById('certificateModal').classList.remove('active');
    };

    // Initialization
    loadCertificates();
});

// Canvas Downloader (Modified to work inside the modal)
window.downloadCertificate = async function(btnElement, certId) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px;"></i> Generating PDF...`;
    btnElement.disabled = true;
    if (window.lucide) lucide.createIcons();

    try {
        // Query GET /api/volunteer/certificates/{id}/download
        try {
            const downloadRes = await ApiClient.request(`/volunteer/certificates/${encodeURIComponent(certId)}/download`, 'GET');
            if (downloadRes && downloadRes.success && downloadRes.data) {
                const freshData = downloadRes.data;
                // If backend returns updated fields, reflect them dynamically in the DOM
                if (freshData.recipient_name || freshData.volunteer_name) {
                    const nameEl = document.querySelector(`#cert-frame-${certId} .cert-name`);
                    if (nameEl) nameEl.textContent = freshData.recipient_name || freshData.volunteer_name;
                }
                if (freshData.event_title) {
                    const titleEl = document.querySelector(`#cert-frame-${certId} strong`);
                    if (titleEl) titleEl.textContent = freshData.event_title;
                }
                if (freshData.hours_credited) {
                    const hrsEl = document.querySelector(`#cert-frame-${certId} .seal-hrs`);
                    if (hrsEl) hrsEl.textContent = freshData.hours_credited;
                }
            }
        } catch (downloadApiErr) {
            console.log("[Documents] Using cached modal canvas state:", downloadApiErr.message);
        }

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