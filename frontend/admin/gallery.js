// ==========================================
// GALLERY.JS (Image Uploads & Impact Grid)
// Relies on main.js for _supabase and layout
// ==========================================

// 1. Modal & Preview Controls
function openModal() { document.getElementById('activityModal').classList.add('active'); }
function closeModal() { 
    document.getElementById('activityModal').classList.remove('active'); 
    document.getElementById('activityForm').reset(); 
    document.getElementById('image-preview').style.display='none'; 
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById('image-preview');
        preview.src = reader.result;
        preview.style.display = 'block';
    }
    reader.readAsDataURL(event.target.files[0]);
}

// 2. Fetch and Render Gallery
async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    const { data, error } = await _supabase.from('activities').select('*').order('date_completed', { ascending: false });

    if (error) return console.error("Gallery Error:", error);
    
    grid.innerHTML = data.map(act => `
        <div class="activity-card">
            <img src="${act.image_url}" class="activity-image" alt="${act.title}">
            <div class="activity-content">
                <h3>${act.title}</h3>
                <p>${act.description || 'No description provided.'}</p>
                <div class="impact-badges">
                    <div class="impact-item"><i data-lucide="users"></i> ${act.total_beneficiaries || 0} Reached</div>
                    <div class="impact-item"><i data-lucide="tag"></i> ${act.impact_category}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Re-render icons injected into the cards
    lucide.createIcons();
}

// 3. Handle Form Submission & Image Upload
document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const file = document.getElementById('file-input').files[0];
    
    if (!file) return alert("Please select an image!");
    
    btn.innerText = "Uploading...";
    btn.disabled = true;

    // A. Upload Image to Supabase Storage Bucket
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
    const { data: uploadData, error: uploadError } = await _supabase.storage
        .from('activity-images')
        .upload(fileName, file);

    if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        btn.innerText = "Publish Post";
        btn.disabled = false;
        return;
    }

    // B. Get the Public URL
    const { data: urlData } = _supabase.storage.from('activity-images').getPublicUrl(fileName);

    // C. Save the post to the Database
    const { error: dbError } = await _supabase.from('activities').insert([{
        title: document.getElementById('act-title').value,
        description: document.getElementById('act-desc').value,
        total_beneficiaries: document.getElementById('act-reached').value,
        impact_category: document.getElementById('act-category').value,
        image_url: urlData.publicUrl
    }]);

    if (dbError) alert("Database Error: " + dbError.message);
    else {
        closeModal();
        loadGallery(); // Refresh the grid
    }
    btn.innerText = "Publish Post";
    btn.disabled = false;
});

// 4. Initialize Data on Load
document.addEventListener('DOMContentLoaded', loadGallery);