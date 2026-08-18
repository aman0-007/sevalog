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
                        <div style="background: white; padding: 12px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="lock" style="width: 24px; height: 24px; color: #94A3B8;"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 15px; color: #0F172A; margin-bottom: 2px; font-weight: 700;">Master Service Diploma</h3>
                            <p style="color: #64748B; font-size: 12px; margin: 0;">Unlocks at 60 verified hours.</p>
                        </div>
                    </div>
                    
                    <!-- Right/Bottom: Progress Bar -->
                    <div class="locked-progress-container">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Progress</span>
                            <span style="font-size: 11px; font-weight: 800; color: #0F172A;">${currentHours} / 60 Hrs</span>
                        </div>
                        <div class="locked-progress-bg">
                            <div class="locked-progress-fill" style="width: ${progressPct}%;"></div>
                        </div>
                    </div>
                </div>`;
            }

            // --- 2. THE EVENT CERTIFICATES LIST ---
            html += `<h3 style="font-size: 18px; color: var(--text-main); margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Event Certificates</h3>`;
            
            if (standardCerts.length > 0) {
                html += `<div class="cert-card-grid">`;
                html += standardCerts.map(cert => renderCertCard(cert, false)).join('');
                html += `</div>`;
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
            <span class="status-badge" style="background: rgba(15, 23, 42, 0.05); color: #0F172A; width: fit-content; font-size: 11px;">
                <i data-lucide="${icon}" style="width: 12px; display: inline; margin-bottom: -2px;"></i> ${badgeText}
            </span>
            <h4 style="margin: 0; font-size: 16px; color: #0F172A; line-height: 1.3;">${title}</h4>
            <div style="font-size: 13px; color: #475569; margin-top: auto;">
                <i data-lucide="clock" style="width: 14px; display: inline; margin-bottom: -2px;"></i> <b>${cert.hours_credited}</b> Hours Credited
                <br>
                <i data-lucide="calendar" style="width: 14px; display: inline; margin-bottom: -2px; margin-top: 6px;"></i> Issued: ${date}
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
        
        let eventContextHtml = '';
        if (isMaster) {
            eventContextHtml = `in recognition of their outstanding overall dedication and achieving the milestone of <strong>${cert.hours_credited} hours</strong> of selfless service to the community.`;
        } else if (cert.type === 'task') {
            eventContextHtml = `for their exceptional individual contribution and successful completion of the <strong style="color: #0F172A;">${cert.event_title}</strong> assignment.`;
        } else {
            eventContextHtml = `for their active participation, dedication, and successful completion of the <strong style="color: #0F172A;">${cert.event_title}</strong> initiative.`;
        }
        
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
                    
                    <p class="cert-text">${eventContextHtml}</p>
                    
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
        new QRCode(qrContainer, {
            text: `https://sevalog.org/verify/${cert.certificate_id}`, // A standard verification URL
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