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
            if (!photos || photos.length === 0) {
                console.log('No photos provided, using fallback');
                photos = [
                    { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.20 AM.jpeg' },
                    { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.21 AM.jpeg' }
                ];
            }

            photoSlider.innerHTML = '';
            dotsContainer.innerHTML = '';

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
        if (window.onGalleryUpdate) {
            console.log('Firebase listener available, loading gallery from Firebase...');
            window.onGalleryUpdate((photos) => {
                console.log('Gallery callback received with', photos.length, 'photos');
                if (photos && photos.length > 0) {
                    console.log('Using Firebase photos');
                    renderSlides(photos);
                } else {
                    console.log('No Firebase photos, using fallback');
                    renderSlides([
                        { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.20 AM.jpeg' },
                        { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.21 AM.jpeg' }
                    ]);
                }
            });
            return;
        }

        console.log('Firebase not available, using fallback hard-coded photos');
        // Fallback: Hard-coded school photos
        renderSlides([
            { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.20 AM.jpeg', alt: 'School Campus Photo 1' },
            { src: 'PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.21 AM.jpeg', alt: 'School Campus Photo 2' }
        ]);
    }
}

// Initialize slider on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for Firebase to fully initialize before loading gallery
    setTimeout(() => {
        initializeGallerySlider();
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

    const { unreadApplications, unreadContacts, applications, contacts } = getPendingNotifications();
    const items = [];

    if (unreadApplications.length > 0) {
        unreadApplications.forEach(app => {
            items.push({
                title: `New registration: ${app.studentName}`,
                message: `Parent: ${app.parentName} · Phone: ${app.parentPhone}`,
                extra: `Date: ${app.applicationDate}`
            });
        });
    }

    if (unreadContacts.length > 0) {
        unreadContacts.forEach(msg => {
            items.push({
                title: `New message: ${msg.subject}`,
                message: `${msg.name} (${msg.email})`,
                extra: `Received: ${msg.date} ${msg.time}`
            });
        });
    }

    if (items.length === 0) {
        if (applications.length === 0 && contacts.length === 0) {
            panelContent.innerHTML = '<p class="notification-empty">No contact messages or registration applications have been submitted yet.</p>';
        } else {
            panelContent.innerHTML = '<p class="notification-empty">No new messages. All contact and application notifications are cleared.</p>';
        }
        return;
    }

    panelContent.innerHTML = items.map(item => `
        <div class="notification-item">
            <h4>${item.title}</h4>
            <p>${item.message}</p>
            <small>${item.extra}</small>
        </div>
    `).join('');
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

function initializeHomeNotifications() {
    const notificationButton = document.getElementById('notificationButton');
    const closeButton = document.getElementById('closeNotificationPanel');

    updateNotificationBadge();
    updateLatestEventTicker();

    if (notificationButton) {
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
