// Admin Panel JavaScript

// Tab Switching
let firebaseGalleryListenerAttached = false;

function getGalleryPhotos() {
    return JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
}

function saveGalleryPhotos(photos) {
    localStorage.setItem('galleryPhotos', JSON.stringify(photos));
}

function removeLocalGalleryPhoto(photoId) {
    const photos = getGalleryPhotos().filter(p => String(p.id) !== String(photoId));
    saveGalleryPhotos(photos);
}

function showTab(tabName, event) {
    if (event) {
        event.preventDefault();
    }

    const tabs = document.querySelectorAll('.tab-content');
    const menuItems = document.querySelectorAll('.admin-menu .menu-item');

    tabs.forEach(tab => tab.classList.remove('active'));
    menuItems.forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const defaultItem = document.querySelector(`.admin-menu .menu-item[href="#${tabName}"]`);
        if (defaultItem) {
            defaultItem.classList.add('active');
        }
    }

    if (tabName === 'gallery') {
        loadGallery();
    }
    if (tabName === 'events') {
        loadEvents();
    }
    if (tabName === 'notifications') {
        renderAdminNotifications();
    }
}

function previewLogo(event) {
    const file = event.target.files[0];
    const logoPreview = document.getElementById('logoPreview');

    logoPreview.innerHTML = '<i class="fas fa-image"></i><p>Logo Preview</p>';
    logoPreview.classList.remove('has-image');

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Logo Preview';
        logoPreview.innerHTML = '';
        logoPreview.appendChild(img);
        logoPreview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function uploadLogo() {
    const logoInput = document.getElementById('logoInput');
    const messageDiv = document.getElementById('logoMessage');

    if (!logoInput.files.length) {
        showMessage('Please select a logo image first.', 'error', messageDiv);
        return;
    }

    const file = logoInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem('schoolLogo', e.target.result);
        localStorage.setItem('logoUploaded', 'true');
        showMessage('Logo uploaded successfully!', 'success', messageDiv);
        document.getElementById('logoStatus').textContent = 'Uploaded';
        updateDashboard();
    };
    reader.onerror = function() {
        showMessage('Failed to read the logo file. Please try again.', 'error', messageDiv);
    };
    reader.readAsDataURL(file);
}

// Upload Photos to Cloudinary

async function uploadPhotos() {
    const photoInput = document.getElementById('photoInput');
    const caption = document.getElementById('photoCaption').value;
    const messageDiv = document.getElementById('photoMessage');

    if (!photoInput.files.length) {
        showMessage('Please select at least one photo', 'error', messageDiv);
        return;
    }

    const files = Array.from(photoInput.files);
    let uploadedCount = 0;
    let photos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');

    showMessage('Uploading photos...', 'success', messageDiv);

    for (let file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'school_photoso');
        formData.append('cloud_name', 'dwa3uy1bv');

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dwa3uy1bv/image/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!data.secure_url) {
                throw new Error(data.error?.message || 'Upload did not return a secure URL.');
            }

            const photoData = {
                id: Date.now() + Math.random(),
                image: data.secure_url,
                caption: caption || 'School Photo',
                date: new Date().toLocaleDateString()
            };

            photos.push(photoData);
            localStorage.setItem('galleryPhotos', JSON.stringify(photos));
            uploadedCount++;

            const fbData = {
                image: data.secure_url,
                caption: caption || 'School Photo',
                date: new Date().toLocaleDateString()
            };

            if (window.savePhotoToFirebase) {
                try {
                    await window.savePhotoToFirebase(fbData);
                } catch (err) {
                    const pending = JSON.parse(localStorage.getItem('pendingFirebaseUploads') || '[]');
                    pending.push(fbData);
                    localStorage.setItem('pendingFirebaseUploads', JSON.stringify(pending));
                }
            } else {
                const pending = JSON.parse(localStorage.getItem('pendingFirebaseUploads') || '[]');
                pending.push(fbData);
                localStorage.setItem('pendingFirebaseUploads', JSON.stringify(pending));
            }
        } catch (error) {
            showMessage('Error uploading photo: ' + error.message, 'error', messageDiv);
            console.error('Photo upload error:', error);
        }
    }

    if (uploadedCount > 0) {
        showMessage(`${uploadedCount} photo(s) uploaded successfully!`, 'success', messageDiv);
        photoInput.value = '';
        document.getElementById('photoCaption').value = '';
        loadGallery();
        updateDashboard();
    }
}

// Load Gallery
function loadGallery() {
    const galleryItems = document.getElementById('galleryItems');
    if (!galleryItems) return;

    // If Firebase is available, listen to realtime updates
    if (window.onGalleryUpdate) {
        if (!firebaseGalleryListenerAttached) {
            firebaseGalleryListenerAttached = true;
            window.onGalleryUpdate((photos) => {
                if (!photos || photos.length === 0) {
                    galleryItems.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No photos uploaded yet. Upload your first photo above!</p>';
                    document.getElementById('imageCount').textContent = '0';
                    saveGalleryPhotos([]);
                    return;
                }

                saveGalleryPhotos(photos);
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
        }
        return;
    }

    // Fallback to localStorage when Firebase is not configured
    const photos = getGalleryPhotos();

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
    const messageDiv = document.getElementById('photoMessage');
    if (!confirm('Delete this photo permanently? This action cannot be undone.')) {
        return;
    }

    photoId = String(photoId);

    // If Firebase deletion function is available, use it
    if (window.deletePhotoFromFirebase) {
        console.log('Deleting from Firebase:', photoId);
        window.deletePhotoFromFirebase(photoId)
            .then(() => {
                removeLocalGalleryPhoto(photoId);
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
    removeLocalGalleryPhoto(photoId);
    loadGallery();
    updateDashboard();
    showMessage('Photo deleted successfully!', 'success', messageDiv);
}

const ADMIN_INACTIVITY_MS = 5 * 60 * 1000;
let adminInactivityTimer = null;

function resetAdminInactivityTimer() {
    if (adminInactivityTimer) {
        clearTimeout(adminInactivityTimer);
    }
    adminInactivityTimer = setTimeout(() => {
        localStorage.removeItem('adminLoggedIn');
        alert('You have been logged out due to 5 minutes of inactivity.');
        window.location.href = 'login.html';
    }, ADMIN_INACTIVITY_MS);
}

function startAdminInactivityTracking() {
    const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(eventName => {
        document.addEventListener(eventName, resetAdminInactivityTimer);
    });
    resetAdminInactivityTimer();
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
async function addEvent(event) {
    event.preventDefault();
    const eventData = {
        id: Date.now(),
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        description: document.getElementById('eventDescription').value,
        location: document.getElementById('eventLocation').value
    };

    const eventMessageEl = document.getElementById('eventMessage');

    async function saveLocally() {
        const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
        events.push(eventData);
        localStorage.setItem('schoolEvents', JSON.stringify(events));
        showMessage('Event added locally.', 'success', eventMessageEl);
        document.querySelector('.event-form').reset();
        loadEvents();
        updateDashboard();
    }

    // If server admin token is available, try to save to server
    let token = localStorage.getItem('breakingNewsAdminToken');
    if (!token) {
        // ask admin for password to obtain a token (only when needed)
        const pw = window.prompt('Enter admin password to save event to server (leave blank to save locally):');
        if (pw) {
            try {
                const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
                if (res.ok) {
                    const j = await res.json();
                    if (j && j.token) {
                        token = j.token;
                        localStorage.setItem('breakingNewsAdminToken', token);
                        showMessage('Authenticated with server. Saving event...', 'success', eventMessageEl);
                    }
                }
            } catch (err) {
                console.warn('Server login failed', err);
            }
        }
    }

    if (token) {
        try {
            const r = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(eventData) });
            if (!r.ok) throw new Error('Server returned ' + r.status);
            showMessage('Event added successfully (server).', 'success', eventMessageEl);
            document.querySelector('.event-form').reset();
            // refresh admin list from server
            await loadEvents();
            updateDashboard();
            return;
        } catch (err) {
            console.warn('Server save failed, falling back to local', err);
            await saveLocally();
            return;
        }
    }

    // Fallback: save locally
    await saveLocally();
}

// Load Events
async function loadEvents() {
    const eventsList = document.getElementById('eventsList');
    const token = localStorage.getItem('breakingNewsAdminToken');

    // If token exists, try to load events from server
    if (token) {
        try {
            const res = await fetch('/api/events', { headers: { 'Authorization': 'Bearer ' + token } });
            if (res.ok) {
                const json = await res.json();
                const events = json.items || [];
                localStorage.setItem('schoolEvents', JSON.stringify(events));
                renderEventsList(eventsList, events);
                return;
            }
        } catch (err) {
            console.warn('Failed to fetch events from server', err);
            // fallthrough to local
        }
    }

    const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
    renderEventsList(eventsList, events);
}

function renderEventsList(eventsList, events) {
    if (!eventsList) return;
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
                <p><span class="event-date">${evt.date ? new Date(evt.date).toLocaleDateString() : ''}</span></p>
                <p>${evt.description || ''}</p>
                <p><strong>Location:</strong> ${evt.location || ''}</p>
            </div>
            <div class="event-actions">
                <button class="btn-delete" onclick="deleteEvent('${evt.id}')">
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
    updateAdminNotificationBadge();
}

function getPendingAdminNotifications() {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const unreadApplications = applications.filter(app => app.status === 'submitted');
    const unreadContacts = contacts.filter(msg => msg.status === 'new');

    return {
        applications,
        contacts,
        unreadApplications,
        unreadContacts,
        total: unreadApplications.length + unreadContacts.length
    };
}

function updateAdminNotificationBadge() {
    const badge = document.getElementById('adminNotificationBadge');
    if (!badge) return;
    const { total } = getPendingAdminNotifications();
    badge.textContent = total > 0 ? total : '0';
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
}

function renderAdminNotifications() {
    const container = document.getElementById('adminNotificationsList');
    if (!container) return;

    const { applications, contacts } = getPendingAdminNotifications();
    const items = [];

    applications.forEach(app => {
        items.push({
            id: `app-${app.id}`,
            title: `Registration: ${app.studentName}`,
            preview: `Parent: ${app.parentName} · ${app.parentPhone}`,
            detail: `Student: ${app.studentName}\nEmail: ${app.email}\nPhone: ${app.parentPhone}\nCurrent Form: ${app.currentForm}\nCurrent School: ${app.currentSchool}\nBoarding: ${app.boarding}\nAchievements: ${app.achievements || 'None'}\nApplication Date: ${app.applicationDate}`,
            status: app.status === 'submitted' ? 'New' : 'Read',
            timestamp: app.applicationDate || ''
        });
    });

    contacts.forEach(msg => {
        items.push({
            id: `msg-${msg.id}`,
            title: `Message: ${msg.subject}`,
            preview: `${msg.name} (${msg.email})`, 
            detail: `From: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone}\nSubject: ${msg.subject}\nMessage: ${msg.message}\nReceived: ${msg.date} ${msg.time}`,
            status: msg.status === 'new' ? 'New' : 'Read',
            timestamp: `${msg.date} ${msg.time}`
        });
    });

    if (items.length === 0) {
        container.innerHTML = '<p class="notification-empty">No messages or applications yet.</p>';
        return;
    }

    const sorted = items.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    container.innerHTML = sorted.map(item => `
        <div class="notification-item ${item.status === 'New' ? 'notification-new' : ''}" data-id="${item.id}">
            <button type="button" class="notification-item-summary" data-id="${item.id}">
                <div class="notification-item-header">
                    <h4>${item.title}</h4>
                    <span class="notification-status">${item.status}</span>
                </div>
                <p class="notification-item-preview">${item.preview}</p>
                <small>${item.timestamp}</small>
            </button>
            <div class="notification-item-detail hidden">
                <pre>${item.detail}</pre>
                <div class="notification-actions">
                    <button class="btn btn-secondary delete-btn" data-id="${item.id}">Delete</button>
                    <button class="btn btn-primary reply-btn" data-id="${item.id}">Reply</button>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.notification-item-summary').forEach(button => {
        button.addEventListener('click', event => {
            const item = event.currentTarget.closest('.notification-item');
            if (!item) return;
            const detail = item.querySelector('.notification-item-detail');
            document.querySelectorAll('.notification-item-detail').forEach(other => {
                if (other !== detail) {
                    other.classList.add('hidden');
                }
            });
            detail.classList.toggle('hidden');
            setAdminNotificationRead(event.currentTarget.dataset.id);
            item.classList.remove('notification-new');
            const status = item.querySelector('.notification-status');
            if (status) status.textContent = 'Read';
            updateAdminNotificationBadge();
        });
    });

    container.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', event => {
            const id = event.currentTarget.dataset.id;
            if (!id) return;
            if (!confirm('Delete this notification permanently?')) return;
            deleteAdminNotification(id);
            renderAdminNotifications();
            updateAdminNotificationBadge();
        });
    });

    container.querySelectorAll('.reply-btn').forEach(button => {
        button.addEventListener('click', event => {
            const id = event.currentTarget.dataset.id;
            openAdminReplyComposer(id);
        });
    });
}

function setAdminNotificationRead(notificationId) {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const updatedApplications = applications.map(app => {
        if (`app-${app.id}` === notificationId && app.status === 'submitted') {
            return { ...app, status: 'read' };
        }
        return app;
    });

    const updatedContacts = contacts.map(msg => {
        if (`msg-${msg.id}` === notificationId && msg.status === 'new') {
            return { ...msg, status: 'read' };
        }
        return msg;
    });

    localStorage.setItem('admissionApplications', JSON.stringify(updatedApplications));
    localStorage.setItem('contactMessages', JSON.stringify(updatedContacts));
}

function deleteAdminNotification(notificationId) {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const updatedApplications = applications.filter(app => `app-${app.id}` !== notificationId);
    const updatedContacts = contacts.filter(msg => `msg-${msg.id}` !== notificationId);

    localStorage.setItem('admissionApplications', JSON.stringify(updatedApplications));
    localStorage.setItem('contactMessages', JSON.stringify(updatedContacts));
}

function openAdminReplyComposer(notificationId) {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    let email = '';
    let subject = '';

    if (notificationId.startsWith('app-')) {
        const id = notificationId.replace('app-', '');
        const app = applications.find(a => String(a.id) === String(id));
        if (app) {
            email = app.email || '';
            subject = `Re: Registration - ${app.studentName}`;
        }
    } else if (notificationId.startsWith('msg-')) {
        const id = notificationId.replace('msg-', '');
        const msg = contacts.find(m => String(m.id) === String(id));
        if (msg) {
            email = msg.email || '';
            subject = `Re: ${msg.subject || 'Your message to Cheptalal'}`;
        }
    }

    if (!email) {
        alert('No email address is available to reply to.');
        return;
    }

    const body = encodeURIComponent('\n\n---\nReplying from Cheptalal admin panel');
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailto;
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
    loadGallery();
    loadEvents();

    const hash = window.location.hash || '#dashboard';
    const initialTab = hash.replace('#', '');
    showTab(initialTab);

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

    if (localStorage.getItem('adminLoggedIn') === 'true') {
        startAdminInactivityTracking();
    }

    // Attempt to flush any pending Firebase uploads queued earlier
    (async function flushPendingUploads() {
        try {
            const pending = JSON.parse(localStorage.getItem('pendingFirebaseUploads') || '[]');
            if (!pending.length) return;
            if (!window.savePhotoToFirebase) return;
            console.log('Flushing', pending.length, 'pending Firebase uploads');
            const remaining = [];
            for (let p of pending) {
                try {
                    await window.savePhotoToFirebase(p);
                    console.log('Flushed upload to Firebase:', p.image || p.url || '(no-url)');
                } catch (err) {
                    console.warn('Failed to flush upload:', err.message);
                    remaining.push(p);
                }
            }
            if (remaining.length) {
                localStorage.setItem('pendingFirebaseUploads', JSON.stringify(remaining));
            } else {
                localStorage.removeItem('pendingFirebaseUploads');
            }
        } catch (e) {
            console.warn('Error flushing pending uploads:', e.message);
        }
    })();
});

// Drag and drop removed - using direct Cloudinary API

// Setup drag and drop
// Removed - using direct file upload instead
