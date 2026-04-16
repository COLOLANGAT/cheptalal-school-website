// Admissions Form Handler
function submitAdmission(event) {
    event.preventDefault();

    // Validate form
    const studentName = document.getElementById('studentName').value;
    const email = document.getElementById('email').value;
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const currentForm = document.getElementById('currentForm').value;
    const parentName = document.getElementById('parentName').value;
    const parentPhone = document.getElementById('parentPhone').value;
    const currentSchool = document.getElementById('currentSchool').value;
    const boarding = document.querySelector('input[name="boarding"]:checked');
    const terms = document.getElementById('terms').checked;

    if (!studentName || !email || !dateOfBirth || !currentForm || !parentName || !parentPhone || !currentSchool || !boarding || !terms) {
        showAdmissionMessage('Please fill in all required fields', 'error');
        return;
    }

    // Validate email
    if (!validateEmail(email)) {
        showAdmissionMessage('Please enter a valid email address', 'error');
        return;
    }

    // Validate phone
    if (!validatePhone(parentPhone)) {
        showAdmissionMessage('Please enter a valid phone number', 'error');
        return;
    }

    // Create application object
    const application = {
        id: Date.now(),
        studentName,
        email,
        dateOfBirth,
        currentForm,
        parentName,
        parentPhone,
        currentSchool,
        achievements: document.getElementById('achievements').value,
        boarding: boarding.value,
        applicationDate: new Date().toLocaleDateString(),
        status: 'submitted'
    };

    // Store in localStorage
    const applications = JSON.parse(localStorage.getItem('admissionApplications') || '[]');
    applications.push(application);
    localStorage.setItem('admissionApplications', JSON.stringify(applications));

    // Show success message
    showAdmissionMessage('Your application has been submitted successfully! We will review it and contact you soon.', 'success');

    // Reset form
    document.querySelector('.admission-form').reset();

    // Optionally send email (in a real scenario)
    console.log('Application submitted:', application);
}

function showAdmissionMessage(message, type) {
    const messageDiv = document.getElementById('formMessage');
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

    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
