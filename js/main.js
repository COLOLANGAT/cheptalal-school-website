// Hamburger Menu
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Close menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
}

// Slider Functionality
let slideIndex = 1;
let slideTimer;

function getSavedGalleryPhotos() {
    return JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
}

function showSlides(n) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (n > slides.length) {
        slideIndex = 1;
    }
    if (n < 1) {
        slideIndex = slides.length;
    }

    slides.forEach(slide => {
        slide.classList.remove('active');
    });

    dots.forEach(dot => {
        dot.classList.remove('active');
    });

    if (slides[slideIndex - 1]) {
        slides[slideIndex - 1].classList.add('active');
    }
    if (dots[slideIndex - 1]) {
        dots[slideIndex - 1].classList.add('active');
    }
}

function changeSlide(n) {
    clearTimeout(slideTimer);
    showSlides(slideIndex += n);
    autoSlide();
}

function currentSlide(n) {
    clearTimeout(slideTimer);
    showSlides(slideIndex = n);
    autoSlide();
}

function autoSlide() {
    slideTimer = setTimeout(() => {
        slideIndex++;
        showSlides(slideIndex);
        autoSlide();
    }, 5000); // Change slide every 5 seconds
}

// Load and Initialize Gallery Slider with Hard-Coded Photos
function initializeGallerySlider() {
    const photoSlider = document.getElementById('photoSlider');
    const dotsContainer = document.getElementById('dotsContainer');
    
    if (photoSlider && dotsContainer) {
        // Clear existing slides and dots
        photoSlider.innerHTML = '';
        dotsContainer.innerHTML = '';

        const renderSlides = (photos) => {
            photoSlider.innerHTML = '';
            dotsContainer.innerHTML = '';

            if (!photos || photos.length === 0) {
                console.log('No gallery photos available');
                const placeholder = document.createElement('div');
                placeholder.className = 'slide fade placeholder-slide';
                placeholder.innerHTML = '<div class="slide-placeholder">No gallery photos are available.</div>';
                photoSlider.appendChild(placeholder);
                slideIndex = 1;
                showSlides(slideIndex);
                return;
            }

            console.log('Rendering', photos.length, 'slides');
            photos.forEach((photo, index) => {
                const slide = document.createElement('div');
                slide.className = 'slide fade';
                slide.innerHTML = `<img src="${photo.image || photo.src}" alt="${photo.caption || photo.alt || ''}">`;
                photoSlider.appendChild(slide);

                // Create dot
                const dot = document.createElement('span');
                dot.className = 'dot';
                dot.onclick = () => currentSlide(index + 1);
                dotsContainer.appendChild(dot);
            });

            // Initialize slider
            slideIndex = 1;
            showSlides(slideIndex);
            autoSlide();
        };

        // If Firebase is available, use realtime gallery updates
        const localPhotos = getSavedGalleryPhotos();

        if (window.onGalleryUpdate) {
            console.log('Firebase listener available, loading gallery from Firebase...');
            window.onGalleryUpdate((photos) => {
                console.log('Gallery callback received with', photos.length, 'photos');
                if (photos && photos.length > 0) {
                    console.log('Using Firebase photos');
                    renderSlides(photos);
                } else if (localPhotos && localPhotos.length > 0) {
                    console.log('No Firebase photos, using saved local gallery photos');
                    renderSlides(localPhotos);
                } else {
                    console.log('No gallery photos found');
                    renderSlides([]);
                }
            });
            return;
        }

        console.log('Firebase not available, loading saved local gallery photos');
        renderSlides(localPhotos);
    }
}

// Initialize slider on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for Firebase to fully initialize before loading gallery
    setTimeout(() => {
        initializeGallerySlider();
        setupAdminEntryMode();
        initializeHomeNotifications();
    }, 1000);
});

// Scroll Animation for Elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s ease';
    observer.observe(card);
});

// Logo Upload Handler
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const logoImages = document.querySelectorAll('#schoolLogo, #heroLogo');
            logoImages.forEach(img => {
                img.src = e.target.result;
            });
            // Store logo in localStorage
            localStorage.setItem('schoolLogo', e.target.result);
            showNotification('Logo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }
}

// Load saved logo on page load
window.addEventListener('load', () => {
    const savedLogo = localStorage.getItem('schoolLogo');
    if (savedLogo) {
        const logoImages = document.querySelectorAll('#schoolLogo, #heroLogo');
        logoImages.forEach(img => {
            img.src = savedLogo;
        });
    }
});

// Notification Function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `${type}-message notification`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getPendingNotifications() {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const unreadApplications = applications.filter(app => app.status === 'submitted');
    const unreadContacts = contacts.filter(msg => msg.status === 'new');

    return {
        unreadApplications,
        unreadContacts,
        total: unreadApplications.length + unreadContacts.length,
        applications,
        contacts
    };
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationCount');
    if (!badge) return;

    const { total } = getPendingNotifications();
    badge.textContent = total > 0 ? total : '0';
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
}

function renderNotificationPanel() {
    const panelContent = document.getElementById('notificationPanelContent');
    if (!panelContent) return;

    const { applications, contacts } = getPendingNotifications();
    const items = [];

    applications.forEach(app => {
        items.push({
            title: `Registration: ${app.studentName}`,
            preview: `Parent: ${app.parentName} · Phone: ${app.parentPhone}`,
            detail: `Student: ${app.studentName}\nEmail: ${app.email}\nPhone: ${app.parentPhone}\nCurrent Form: ${app.currentForm}\nCurrent School: ${app.currentSchool}\nBoarding: ${app.boarding}\nAchievements: ${app.achievements || 'None'}\nApplication Date: ${app.applicationDate}`,
            extra: `${app.applicationDate} · ${app.status === 'submitted' ? 'New' : 'Read'}`,
            statusLabel: app.status === 'submitted' ? 'New' : 'Read'
        });
    });

    contacts.forEach(msg => {
        items.push({
            title: `Message: ${msg.subject}`,
            preview: `${msg.name} (${msg.email})`,
            detail: `From: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone}\nSubject: ${msg.subject}\nMessage: ${msg.message}\nReceived: ${msg.date} ${msg.time}`,
            extra: `${msg.date} ${msg.time} · ${msg.status === 'new' ? 'New' : 'Read'}`,
            statusLabel: msg.status === 'new' ? 'New' : 'Read'
        });
    });

    if (items.length === 0) {
        panelContent.innerHTML = '<p class="notification-empty">No contact messages or registration applications have been submitted yet.</p>';
        return;
    }

    panelContent.innerHTML = items.map((item, index) => `
        <div class="notification-item ${item.statusLabel === 'New' ? 'notification-new' : ''}" data-index="${index}">
            <button type="button" class="notification-item-summary" data-index="${index}">
                <div class="notification-item-header">
                    <h4>${item.title}</h4>
                    <span class="notification-status">${item.statusLabel}</span>
                </div>
                <p class="notification-item-preview">${item.preview}</p>
                <small>${item.extra}</small>
            </button>
            <div class="notification-item-detail hidden">
                <pre>${item.detail}</pre>
            </div>
        </div>
    `).join('');

    panelContent.querySelectorAll('.notification-item-summary').forEach(button => {
        button.addEventListener('click', toggleNotificationDetail);
    });
}

function toggleNotificationDetail(event) {
    const button = event.currentTarget;
    const item = button.closest('.notification-item');
    if (!item) return;

    const detail = item.querySelector('.notification-item-detail');
    if (!detail) return;

    const openDetails = document.querySelectorAll('.notification-item-detail:not(.hidden)');
    openDetails.forEach(openDetail => {
        if (openDetail !== detail) {
            openDetail.classList.add('hidden');
        }
    });

    detail.classList.toggle('hidden');
}

function markNotificationsRead() {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const updatedApplications = applications.map(app => ({ ...app, status: app.status === 'submitted' ? 'read' : app.status }));
    const updatedContacts = contacts.map(msg => ({ ...msg, status: msg.status === 'new' ? 'read' : msg.status }));

    localStorage.setItem('admissionApplications', JSON.stringify(updatedApplications));
    localStorage.setItem('contactMessages', JSON.stringify(updatedContacts));
}

function openNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    renderNotificationPanel();
    panel.classList.remove('hidden');
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    markNotificationsRead();
    updateNotificationBadge();
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    panel.classList.remove('visible');
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
}

function getLatestEventMessage() {
    const events = JSON.parse(localStorage.getItem('schoolEvents') || '[]');
    if (!events.length) {
        return 'No event has been published yet. Please add latest events in the admin dashboard.';
    }

    const latestEvent = events
        .filter(evt => evt.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || events[0];

    const dateString = latestEvent.date ? new Date(latestEvent.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }) : '';

    return `${latestEvent.title || 'Latest event'} ${dateString ? ` — ${dateString}` : ''}`.trim();
}

function updateLatestEventTicker() {
    const ticker = document.getElementById('latestEventTicker');
    if (!ticker) return;
    ticker.textContent = getLatestEventMessage();
}

function isAdminQueryMode() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('admin') || params.get('admin-mode');
    return value === '1' || value === 'true' || value === 'cheptalal668';
}

function setupAdminEntryMode() {
    if (!isAdminQueryMode()) return;

    const adminToolbar = document.createElement('div');
    adminToolbar.id = 'adminEntryToolbar';
    adminToolbar.className = 'admin-entry-toolbar';

    const loggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const messageEl = document.createElement('span');
    messageEl.textContent = 'Admin access mode detected.';

    const actionLink = document.createElement('a');
    actionLink.className = 'btn btn-primary';
    actionLink.style.padding = '8px 14px';
    actionLink.style.display = 'inline-flex';
    actionLink.style.alignItems = 'center';
    actionLink.style.gap = '8px';

    if (loggedIn) {
        actionLink.href = 'admin/admin.html';
        actionLink.textContent = 'Open Admin Dashboard';
    } else {
        const target = window.location.href;
        actionLink.href = `admin/login.html?returnUrl=${encodeURIComponent(target)}`;
        actionLink.textContent = 'Admin Login';
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-secondary';
    closeButton.textContent = 'Hide';
    closeButton.style.marginLeft = '10px';
    closeButton.addEventListener('click', () => {
        adminToolbar.remove();
    });

    adminToolbar.appendChild(messageEl);
    adminToolbar.appendChild(actionLink);
    adminToolbar.appendChild(closeButton);
    document.body.prepend(adminToolbar);
}

function initializeHomeNotifications() {
    const notificationButton = document.getElementById('notificationButton');
    const closeButton = document.getElementById('closeNotificationPanel');

    updateNotificationBadge();
    updateLatestEventTicker();

    if (notificationButton && notificationButton.tagName === 'BUTTON') {
        notificationButton.addEventListener('click', openNotificationPanel);
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeNotificationPanel);
    }

    window.addEventListener('storage', () => {
        updateNotificationBadge();
        updateLatestEventTicker();
    });
}

// Add CSS animations
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .notification {
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);

// Smooth Scrolling for Navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form Validation Utility
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^(\+?\d{1,3}[-.\s]?)?\d{10,}$/;
    return re.test(phone);
}

// Export functions for use in other pages
window.handleLogoUpload = handleLogoUpload;
window.changeSlide = changeSlide;
window.currentSlide = currentSlide;
window.showNotification = showNotification;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
