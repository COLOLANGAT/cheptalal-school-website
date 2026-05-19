// Admin Panel JavaScript

// Tab Switching
let firebaseGalleryListenerAttached = false;

function showTab(tabName, event) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Update menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Load data if needed
    if (tabName === 'gallery') {
        loadGallery();
    } else if (tabName === 'events') {
        loadEvents();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }
}

// Logo Preview
function previewLogo(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('logoPreview');

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Logo Preview">`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }
}

// Upload Logo
function uploadLogo() {
    const logoInput = document.getElementById('logoInput');
    const messageDiv = document.getElementById('logoMessage');

    if (!logoInput.files[0]) {
        showMessage('Please select a logo image', 'error', messageDiv);
        return;
    }

    const file = logoInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        // Store logo in localStorage
        localStorage.setItem('schoolLogo', e.target.result);

        // Update logo display on main page
        const logoImages = parent.document.querySelectorAll('#schoolLogo, #heroLogo') || [];
        logoImages.forEach(img => {
            img.src = e.target.result;
        });

        showMessage('Logo uploaded successfully! Changes will appear on the homepage.', 'success', messageDiv);

        // Update dashboard
        localStorage.setItem('logoUploaded', 'true');
        updateDashboard();

        // Reset form
        logoInput.value = '';
        document.getElementById('logoPreview').innerHTML = '<i class="fas fa-image"></i><p>Logo Preview</p>';
        document.getElementById('logoPreview').classList.remove('has-image');
    };

    reader.readAsDataURL(file);
}

// Photo Preview
function previewPhotos(event) {
    const files = event.target.files;
    // Photos will be previewed on upload
}
//Upload Photos to Cloudinary

function uploadPhotos() {
    const photoInput = document.getElementById('photoInput');
    const caption = document.getElementById('photoCaption').value;
    const messageDiv = document.getElementById('photoMessage');

    if (!photoInput.files.length) {
        showMessage('Please select at least one photo', 'error', messageDiv);
        return;
    }

    const files = photoInput.files;
    let uploadedCount = 0;
    let photos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');

    showMessage('Uploading photos...', 'success', messageDiv);

    for (let file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'school_photoso');
        formData.append('cloud_name', 'dwa3uy1bv');

        fetch('https://api.cloudinary.com/v1_1/dwa3uy1bv/image/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                const photoData = {
                    id: Date.now() + Math.random(),
                    image: data.secure_url,
                    caption: caption || 'School Photo',
                    date: new Date().toLocaleDateString()
                };
                photos.push(photoData);
                uploadedCount++;

                // Save after each successful upload
                localStorage.setItem('galleryPhotos', JSON.stringify(photos));
                
                // Also save to Firebase if available (so other devices see the uploads)
                if (window.savePhotoToFirebase) {
                    // Firebase will generate its own id; push minimal data
                    const fbData = {
                        image: data.secure_url,
                        caption: caption || 'School Photo',
                        date: new Date().toLocaleDateString()
                    };
                    console.log('Attempting Firebase save:', fbData);
                    window.savePhotoToFirebase(fbData).then(() => {
                        console.log('✓ Photo saved to Firebase successfully');
                    }).catch(err => {
                        console.warn('✗ Firebase save error:', err.message);
                    });
                } else {
                    console.warn('Firebase save function not available');
                }

                if (uploadedCount === files.length) {
                    showMessage(`${uploadedCount} photo(s) uploaded successfully!`, 'success', messageDiv);
                    photoInput.value = '';
                    document.getElementById('photoCaption').value = '';
                    loadGallery();
                    updateDashboard();
                }
            }
        })
        .catch(error => {
            showMessage('Error uploading photo: ' + error.message, 'error', messageDiv);
        });
    }
}

// Load Gallery
function loadGallery() {
    const galleryItems = document.getElementById('galleryItems');
    if (!galleryItems) return;

    // If Firebase is available, listen to realtime updates
    if (window.onGalleryUpdate && !firebaseGalleryListenerAttached) {
        firebaseGalleryListenerAttached = true;
        window.onGalleryUpdate((photos) => {
            if (!photos || photos.length === 0) {
                galleryItems.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No photos uploaded yet. Upload your first photo above!</p>';
                document.getElementById('imageCount').textContent = '0';
                return;
            }

            document.getElementById('imageCount').textContent = photos.length;
            galleryItems.innerHTML = photos.map(photo => `
                <div class="gallery-item">
                    <img src="${photo.image}" alt="${photo.caption}">
                    <button class="gallery-item-delete" onclick="deletePhoto('${photo.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="gallery-item-overlay">
                        <p><strong>${photo.caption}</strong></p>
                        <p>${photo.date}</p>
                    </div>
                </div>
            `).join('');
        });
        return;
    }

    // Fallback to localStorage when Firebase is not configured
    const photos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');

    if (photos.length === 0) {
        galleryItems.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No photos uploaded yet. Upload your first photo above!</p>';
        return;
    }

    galleryItems.innerHTML = photos.map(photo => `
        <div class="gallery-item">
            <img src="${photo.image}" alt="${photo.caption}">
            <button class="gallery-item-delete" onclick="deletePhoto('${photo.id}')">
                <i class="fas fa-trash"></i>
            </button>
            <div class="gallery-item-overlay">
                <p><strong>${photo.caption}</strong></p>
                <p>${photo.date}</p>
            </div>
        </div>
    `).join('');
}

// Delete Photo
function deletePhoto(photoId) {
    if (confirm('Are you sure you want to delete this photo?')) {
        const messageDiv = document.getElementById('photoMessage');
        
        // If Firebase deletion function is available, use it
        if (window.deletePhotoFromFirebase) {
            console.log('Deleting from Firebase:', photoId);
            window.deletePhotoFromFirebase(photoId)
                .then(() => {
                    loadGallery();
                    updateDashboard();
                    showMessage('Photo deleted successfully!', 'success', messageDiv);
                })
                .catch(err => {
                    console.error('Delete error:', err);
                    showMessage('Error deleting photo: ' + err.message, 'error', messageDiv);
                });
            return;
        }

        // Fallback: delete from localStorage
        console.log('Deleting from localStorage:', photoId);
        let photos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
        photos = photos.filter(p => p.id !== photoId);
        localStorage.setItem('galleryPhotos', JSON.stringify(photos));
        loadGallery();
        updateDashboard();
        showMessage('Photo deleted successfully!', 'success', messageDiv);
    }
}

// Save School Info
function saveSchoolInfo(event) {
    event.preventDefault();

    const info = {
        established: document.getElementById('established').value,
        motto: document.getElementById('motto').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        about: document.getElementById('about').value
    };

    localStorage.setItem('schoolInfo', JSON.stringify(info));
    showMessage('School information saved successfully!', 'success', document.getElementById('infoMessage'));
}

// Add Event
function addEvent(event) {
    event.preventDefault();

    const eventData = {
        id: Date.now(),
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        description: document.getElementById('eventDescription').value,
        location: document.getElementById('eventLocation').value
    };

    const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
    events.push(eventData);
    localStorage.setItem('schoolEvents', JSON.stringify(events));

    showMessage('Event added successfully!', 'success', document.getElementById('eventMessage'));

    // Reset form
    document.querySelector('.event-form').reset();

    // Reload events
    loadEvents();
    updateDashboard();
}

// Load Events
function loadEvents() {
    const eventsList = document.getElementById('eventsList');
    const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (events.length === 0) {
        eventsList.innerHTML = '<p style="text-align: center; color: #999;">No events added yet. Create your first event above!</p>';
        return;
    }

    eventsList.innerHTML = events.map(evt => `
        <div class="event-card">
            <div class="event-info">
                <h4>${evt.title}</h4>
                <p><span class="event-date">${new Date(evt.date).toLocaleDateString()}</span></p>
                <p>${evt.description}</p>
                <p><strong>Location:</strong> ${evt.location}</p>
            </div>
            <div class="event-actions">
                <button class="btn-delete" onclick="deleteEvent(${evt.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Delete Event
function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        let events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
        events = events.filter(e => e.id !== eventId);
        localStorage.setItem('schoolEvents', JSON.stringify(events));
        loadEvents();
        updateDashboard();
        showMessage('Event deleted successfully!', 'success', document.getElementById('eventMessage'));
    }
}

// Update Dashboard
function updateDashboard() {
    const photos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
    const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
    const logoUploaded = localStorage.getItem('logoUploaded');

    document.getElementById('imageCount').textContent = photos.length;
    document.getElementById('eventCount').textContent = events.length;
    document.getElementById('logoStatus').textContent = logoUploaded ? 'Uploaded' : 'Not Uploaded';
}

// Show Message
function showMessage(message, type, element) {
    if (!element) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;

    element.innerHTML = '';
    element.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => element.innerHTML = '', 300);
    }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();

    // Load school info if exists
    const info = JSON.parse(localStorage.getItem('schoolInfo') || '{}');
    if (info.established) {
        document.getElementById('established').value = info.established;
        document.getElementById('motto').value = info.motto || '';
        document.getElementById('email').value = info.email || '';
        document.getElementById('phone').value = info.phone || '';
        document.getElementById('location').value = info.location || '';
        document.getElementById('about').value = info.about || '';
    }
});

// Drag and drop removed - using direct Cloudinary API

// Setup drag and drop
// Removed - using direct file upload instead
