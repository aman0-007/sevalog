// ==========================================
// VERIFY.JS (Public Certificate Verification Logic)
// Endpoints:
// - GET /api/public/verify-certificate/{id}
// - GET /api/public/verify-certificate/{id}/download
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('cert-id-input');
    const clearBtn = document.getElementById('cert-clear-btn');
    const verifyForm = document.getElementById('verify-form');

    // Handle clear button visibility
    if (input && clearBtn) {
        input.addEventListener('input', () => {
            clearBtn.style.display = input.value.trim() ? 'inline-flex' : 'none';
        });
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
        });
    }

    // Handle form submit
    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = input.value.trim();
            if (id) {
                runVerification(id);
            }
        });
    }

    // Check for query parameters (?id=... or ?cert=...) or path /verify/:id
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id') || urlParams.get('cert') || urlParams.get('uuid');

    if (idFromQuery) {
        if (input) {
            input.value = idFromQuery;
            if (clearBtn) clearBtn.style.display = 'inline-flex';
        }
        runVerification(idFromQuery);
    } else {
        // Check if path has an ID, e.g., /verify/550e8400...
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart !== 'verify' && lastPart !== 'verify.html' && lastPart.length > 10) {
            if (input) {
                input.value = lastPart;
                if (clearBtn) clearBtn.style.display = 'inline-flex';
            }
            runVerification(lastPart);
        }
    }
});

// Main verification runner
async function runVerification(rawId) {
    const cleanId = rawId.trim();
    if (!cleanId) return;

    // Update URL without reloading for easy sharing
    const newUrl = `${window.location.pathname}?id=${encodeURIComponent(cleanId)}`;
    window.history.replaceState({ certId: cleanId }, '', newUrl);

    const introView = document.getElementById('verify-intro');
    const loadingView = document.getElementById('verify-loading');
    const successView = document.getElementById('verify-success');
    const errorView = document.getElementById('verify-error');
    const submitBtn = document.getElementById('verify-submit-btn');

    // UI state transitions
    if (introView) introView.style.display = 'none';
    if (successView) successView.style.display = 'none';
    if (errorView) errorView.style.display = 'none';
    if (loadingView) loadingView.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    try {
        // Execute GET /api/public/verify-certificate/{id}
        const response = await ApiClient.request(`/public/verify-certificate/${encodeURIComponent(cleanId)}`, 'GET');

        if (loadingView) loadingView.style.display = 'none';

        if (response && response.success && response.data) {
            renderVerifiedCredential(cleanId, response.data);
        } else {
            const errorMsg = (response && response.message) ? response.message : 'The requested certificate could not be validated.';
            renderVerificationError(cleanId, errorMsg);
        }
    } catch (err) {
        if (loadingView) loadingView.style.display = 'none';
        const errorMsg = err.message || 'The certificate identifier is either invalid or does not exist in our registry.';
        renderVerificationError(cleanId, errorMsg);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
}

// Render Success State
function renderVerifiedCredential(certId, cert) {
    const successView = document.getElementById('verify-success');
    if (!successView) return;

    // Standardize field extraction
    const recipientName = cert.volunteer_name || cert.recipient_name || 
        `${cert.first_name || ''} ${cert.last_name || ''}`.trim() || 
        cert.user_name || cert.name || 'Dedicated Volunteer';

    const eventTitle = cert.event_title || cert.title || 
        (cert.type === 'master' ? 'Master Volunteer Milestone (60+ Hours)' : 'Seva Initiative');

    const hoursCredited = parseFloat(cert.hours_credited || cert.hours || cert.hours_awarded || cert.total_hours || 0).toFixed(1);

    const issueDateStr = cert.issued_at || cert.created_at || cert.date;
    const issueDateFormatted = issueDateStr ? new Date(issueDateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Verified Official Record';

    const isMaster = cert.type === 'master';
    const isTask = cert.type === 'task';
    const certTypeLabel = isMaster ? 'Milestone Diploma (60+ Hours)' : (isTask ? 'Special Task Certificate' : 'Event Service Certificate');

    // Populate data fields
    document.getElementById('res-recipient-name').innerText = recipientName;
    document.getElementById('res-event-title').innerText = eventTitle;
    document.getElementById('res-hours-credited').innerText = `${hoursCredited} Hours`;
    document.getElementById('res-issued-date').innerText = issueDateFormatted;
    document.getElementById('res-cert-id').innerText = certId;
    document.getElementById('res-cert-type').innerText = certTypeLabel;

    // Render official replica certificate preview
    renderCertificatePreview(certId, {
        ...cert,
        recipientName,
        eventTitle,
        hoursCredited,
        issueDateFormatted,
        isMaster
    });

    // Wire action buttons
    const downloadBtn = document.getElementById('res-download-btn');
    if (downloadBtn) {
        downloadBtn.onclick = () => downloadOfficialCertificate(certId, cert);
    }

    const copyBtn = document.getElementById('res-copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => copyVerificationLink(certId, copyBtn);
    }

    successView.style.display = 'block';
    successView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.lucide) lucide.createIcons();
}

// Render Certificate Preview in DOM
function renderCertificatePreview(certId, data) {
    const previewContainer = document.getElementById('res-certificate-preview');
    if (!previewContainer) return;

    const certTitle = data.isMaster ? 'Master Volunteer Diploma' : 'Certificate of Appreciation';
    const themeClass = data.isMaster ? 'master-theme' : '';
    const dynamicDescription = data.description || `<p class="cert-text">for their active participation and commendable service in <strong style="color: #0F172A;">${data.eventTitle}</strong>, contributing dedicated effort toward community welfare.</p>`;

    const certHtml = `
    <div class="certificate-frame ${themeClass}" id="public-cert-frame-${certId}">
        <div class="certificate-inner">
            <div class="certificate-core">
                <div class="cert-header">
                    <i data-lucide="shield-check" style="color: #D4AF37; width: 32px; height: 32px;"></i>
                    <span class="cert-org">Sri Sathya Sai Seva Organisations, Chembur Samithi</span>
                </div>

                <h1 class="cert-title">${certTitle}</h1>
                <span class="cert-subtitle">is hereby proudly awarded to</span>

                <h2 class="cert-name">${data.recipientName}</h2>

                ${dynamicDescription}

                <div class="cert-footer">
                    <!-- QR Block -->
                    <div class="cert-qr-block">
                        <span class="cert-qr-label">SCAN TO VERIFY</span>
                        <div class="cert-qr-box" id="public-cert-qr-${certId}"></div>
                        <span class="cert-id-text">ID: ${certId.split('-')[0].toUpperCase()}</span>
                    </div>

                    <!-- Signature -->
                    <div class="cert-sig-block">
                        <span class="cert-date">${data.issueDateFormatted}</span>
                        <div class="cert-sig-line"></div>
                        <span class="cert-sig-label">Authorized Signatory</span>
                    </div>

                    <!-- Seal -->
                    <div class="premium-seal">
                        <div class="premium-seal-inner">
                            <span class="seal-hrs">${data.hoursCredited}</span>
                            <span class="seal-txt">Verified<br>Hours</span>
                        </div>
                        <div class="seal-ribbon left"></div>
                        <div class="seal-ribbon right"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    previewContainer.innerHTML = certHtml;

    // Generate real QR code inside preview linking directly to this verification page
    const qrContainer = document.getElementById(`public-cert-qr-${certId}`);
    if (qrContainer && typeof QRCode !== 'undefined') {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: `${window.location.origin}/frontend/verify.html?id=${encodeURIComponent(certId)}`,
            width: 70,
            height: 70,
            colorDark: '#0F172A',
            colorLight: '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.L
        });
    }

    if (window.lucide) lucide.createIcons();
}

// Render Error / Not Found State
function renderVerificationError(certId, message) {
    const errorView = document.getElementById('verify-error');
    if (!errorView) return;

    const errMsgEl = document.getElementById('error-message-text');
    const errIdEl = document.getElementById('error-attempted-id');

    if (errMsgEl) errMsgEl.innerText = message || 'This certificate ID does not exist in our verified database.';
    if (errIdEl) errIdEl.innerText = certId;

    errorView.style.display = 'block';
    errorView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.lucide) lucide.createIcons();
}

// Download Certificate Handler (Calls GET /api/public/verify-certificate/{id}/download and falls back to high-res canvas render)
async function downloadOfficialCertificate(certId, certData) {
    const btn = document.getElementById('res-download-btn');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 14px; height: 14px;"></i> Generating PDF/PNG...`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        // Attempt to call GET /api/public/verify-certificate/{id}/download
        let downloadMeta = null;
        try {
            const res = await ApiClient.request(`/public/verify-certificate/${encodeURIComponent(certId)}/download`, 'GET');
            if (res && res.success && res.data) {
                downloadMeta = res.data;
            }
        } catch (e) {
            // Backend endpoint fallback
            console.log("Using rendered canvas export:", e.message);
        }

        // Render high-res image via html2canvas
        const certFrame = document.getElementById(`public-cert-frame-${certId}`);
        if (!certFrame) throw new Error("Certificate preview element not found");

        if (typeof html2canvas === 'undefined') {
            throw new Error("Canvas rendering library is not loaded");
        }

        const canvas = await html2canvas(certFrame, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `SevaLog_Certificate_${certId.substring(0, 8).toUpperCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        alert(`Failed to download certificate: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (window.lucide) lucide.createIcons();
        }
    }
}

// Copy Verification Link
function copyVerificationLink(certId, btnEl) {
    const shareUrl = `${window.location.origin}/frontend/verify.html?id=${encodeURIComponent(certId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = btnEl.innerHTML;
        btnEl.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px; color: #10B981;"></i> Copied!`;
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            btnEl.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
        }, 2000);
    }).catch(() => {
        prompt("Copy this verification URL:", shareUrl);
    });
}
