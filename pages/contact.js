// Contact Form Handler
function submitContactForm(event) {
    event.preventDefault();

    // Get form values
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const phone = document.getElementById('contactPhone').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;

    // Validate
    if (!name || !email || !subject || !message) {
        showContactMessage('Please fill in all required fields', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showContactMessage('Please enter a valid email address', 'error');
        return;
    }

    // Create contact object
    const contact = {
        id: Date.now(),
        name,
        email,
        phone: phone || 'Not provided',
        subject,
        message,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        status: 'new'
    };

    // Store in localStorage
    const contacts = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    contacts.push(contact);
    localStorage.setItem('contactMessages', JSON.stringify(contacts));

    // Show success message
    showContactMessage('Your message has been sent successfully! We will get back to you as soon as possible.', 'success');

    // Reset form
    document.querySelector('.contact-form').reset();

    console.log('Contact message:', contact);
}

function showContactMessage(message, type) {
    const messageDiv = document.getElementById('contactFormMessage');
    const messageEl = document.createElement('div');
    messageEl.className = `${type}-message`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    messageDiv.innerHTML = '';
    messageDiv.appendChild(messageEl);

    if (type === 'success') {
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    }

    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
