// ==========================================
// GALLERY.JS (Image Uploads & Impact Grid)
// LocalStorage / API-safe fallback
// ==========================================

const DEFAULT_ACTIVITIES = [
    {
        title: "Swachhata Pakhwada Drive",
        description: "Mass cleanliness and environmental awareness drive across Chembur central transit areas.",
        total_beneficiaries: 1200,
        impact_category: "Cleanliness",
        image_url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
        title: "Youth English Literacy Camp",
        description: "Weekend coaching sessions teaching spoken English, foundational grammar, and interview skills.",
        total_beneficiaries: 340,
        impact_category: "Teaching",
        image_url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
        title: "Sunday Annadanam & Food Distribution",
        description: "Warm, nutritious meal packets prepared and served to underprivileged families.",
        total_beneficiaries: 850,
        impact_category: "Food Drive",
        image_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    }
];

// 1. Modal & Preview Controls
function openModal() { document.getElementById('activityModal').classList.add('active'); }
function closeModal() { 
    document.getElementById('activityModal').classList.remove('active'); 
    document.getElementById('activityForm').reset(); 
    document.getElementById('image-preview').style.display = 'none'; 
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById('image-preview');
        preview.src = reader.result;
        preview.style.display = 'block';
    };
    if (event.target.files && event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// 2. Fetch and Render Gallery
async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    let activities = [];
    try {
        const saved = localStorage.getItem('sevalog_gallery_activities');
        if (saved) {
            activities = JSON.parse(saved);
        }
    } catch (e) {
        console.warn("Could not read local gallery data:", e);
    }

    if (!activities || activities.length === 0) {
        activities = DEFAULT_ACTIVITIES;
    }

    grid.innerHTML = activities.map(act => `
        <div class="activity-card">
            <img src="${escapeHTML(act.image_url)}" class="activity-image" alt="${escapeHTML(act.title)}">
            <div class="activity-content">
                <h3>${escapeHTML(act.title)}</h3>
                <p>${escapeHTML(act.description || 'No description provided.')}</p>
                <div class="impact-badges">
                    <div class="impact-item"><i data-lucide="users"></i> ${act.total_beneficiaries || 0} Reached</div>
                    <div class="impact-item"><i data-lucide="tag"></i> ${escapeHTML(act.impact_category || 'General')}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

// 3. Handle Form Submission & Image Upload
document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const file = document.getElementById('file-input').files[0];
    
    btn.innerText = "Publishing...";
    btn.disabled = true;

    try {
        let imageUrl = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";
        if (file) {
            imageUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        const newActivity = {
            title: document.getElementById('act-title').value,
            description: document.getElementById('act-desc').value,
            total_beneficiaries: document.getElementById('act-reached').value,
            impact_category: document.getElementById('act-category').value,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        };

        let currentList = [];
        try {
            const saved = localStorage.getItem('sevalog_gallery_activities');
            currentList = saved ? JSON.parse(saved) : [...DEFAULT_ACTIVITIES];
        } catch (e) {
            currentList = [...DEFAULT_ACTIVITIES];
        }

        currentList.unshift(newActivity);
        localStorage.setItem('sevalog_gallery_activities', JSON.stringify(currentList));

        closeModal();
        loadGallery();
    } catch (err) {
        alert("Failed to save post: " + err.message);
    } finally {
        btn.innerText = "Publish Post";
        btn.disabled = false;
    }
});

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 4. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadGallery);
