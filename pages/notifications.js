function getAllNotifications() {
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');

    const notifications = [];

    applications.forEach(app => {
        notifications.push({
            id: `app-${app.id}`,
            type: 'registration',
            title: `Registration: ${app.studentName}`,
            preview: `Parent: ${app.parentName} · Phone: ${app.parentPhone}`,
            detail: `Student: ${app.studentName}\nEmail: ${app.email}\nPhone: ${app.parentPhone}\nCurrent Form: ${app.currentForm}\nCurrent School: ${app.currentSchool}\nBoarding: ${app.boarding}\nAchievements: ${app.achievements || 'None'}\nApplication Date: ${app.applicationDate}`,
            status: app.status || 'submitted',
            timestamp: app.applicationDate || ''
        });
    });

    contacts.forEach(msg => {
        notifications.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: `Message: ${msg.subject}`,
            preview: `${msg.name} (${msg.email})`,
            detail: `From: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone}\nSubject: ${msg.subject}\nMessage: ${msg.message}\nReceived: ${msg.date} ${msg.time}`,
            status: msg.status || 'new',
            timestamp: `${msg.date} ${msg.time}`
        });
    });

    return notifications.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function setNotificationRead(notificationId) {
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

function renderNotificationsPage() {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    const notifications = getAllNotifications();
    if (notifications.length === 0) {
        list.innerHTML = '<p class="notification-empty">No notifications yet. Messages and applications will appear here.</p>';
        return;
    }

    list.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.status === 'new' ? 'notification-new' : ''}">
            <button type="button" class="notification-item-summary" data-id="${notification.id}">
                <div class="notification-item-header">
                    <h4>${notification.title}</h4>
                    <span class="notification-status">${notification.status === 'new' ? 'New' : 'Read'}</span>
                </div>
                <p class="notification-item-preview">${notification.preview}</p>
                <small>${notification.timestamp}</small>
            </button>
            <div class="notification-item-detail hidden">
                <pre>${notification.detail}</pre>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.notification-item-summary').forEach(button => {
        button.addEventListener('click', event => {
            const item = event.currentTarget.closest('.notification-item');
            if (!item) return;
            const detail = item.querySelector('.notification-item-detail');
            const notificationId = event.currentTarget.dataset.id;

            document.querySelectorAll('.notification-item-detail').forEach(otherDetail => {
                if (otherDetail !== detail) {
                    otherDetail.classList.add('hidden');
                }
            });

            detail.classList.toggle('hidden');
            setNotificationRead(notificationId);

            const statusSpan = item.querySelector('.notification-status');
            if (statusSpan) {
                statusSpan.textContent = 'Read';
            }
            item.classList.remove('notification-new');
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', () => {
    renderNotificationsPage();
});