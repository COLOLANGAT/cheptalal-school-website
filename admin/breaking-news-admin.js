const adminPassword = 'admin123';
const adminLoginKey = 'breakingNewsAdminLoggedIn';
const storageKey = 'breakingNewsItems';
const currentNewsKey = 'breakingNewsCurrentId';
let currentPublishAction = 'publish';

function setLoggedIn() {
  localStorage.setItem(adminLoginKey, 'true');
}

function isLoggedIn() {
  return localStorage.getItem(adminLoginKey) === 'true';
}

function showMessage(id, message, isError = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? '#c0392b' : '#1b6a9f';
}

function showElement(selector) {
  document.querySelector(selector)?.classList.remove('hidden');
}

function hideElement(selector) {
  document.querySelector(selector)?.classList.add('hidden');
}

function formatStatus(item) {
  if (item.status === 'active') return 'Homepage';
  if (item.status === 'draft') return 'Draft';
  if (item.status === 'archived') return 'Archived';
  return 'Stored';
}

function getStoredItems() {
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

function saveStoredItems(items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function getCurrentNewsId() {
  return localStorage.getItem(currentNewsKey);
}

function setCurrentNewsId(id) {
  if (id) {
    localStorage.setItem(currentNewsKey, id);
  } else {
    localStorage.removeItem(currentNewsKey);
  }
}

function showAdminPanel() {
  hideElement('#adminLoginCard');
  showElement('#adminPanel');
  loadBreakingNewsItems();
}

function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById('adminPassword').value.trim();
  if (!password) {
    showMessage('adminLoginMessage', 'Please enter the admin password.', true);
    return;
  }

  if (password !== adminPassword) {
    showMessage('adminLoginMessage', 'Invalid password. Please try again.', true);
    return;
  }

  setLoggedIn();
  showMessage('adminLoginMessage', 'Login successful! Loading admin panel.');
  showAdminPanel();
  startBreakingNewsInactivityTracking();
}

function clearNewsForm() {
  document.getElementById('breakingTitle').value = '';
  document.getElementById('breakingDate').value = '';
  document.getElementById('breakingType').value = 'sports';
  document.getElementById('breakingLocation').value = '';
  document.getElementById('breakingUniform').value = '';
  document.getElementById('breakingDescription').value = '';
  document.getElementById('breakingPhoto').value = '';
  updatePublishAction('publish');
}

function updatePublishAction(action) {
  currentPublishAction = action;
  document.getElementById('publishButton')?.classList.toggle('active-action', action === 'publish');
  document.getElementById('draftButton')?.classList.toggle('active-action', action === 'draft');
}

function loadBreakingNewsItems() {
  const container = document.getElementById('breakingNewsTable');
  const items = getStoredItems();
  const currentId = getCurrentNewsId();

  if (!items.length) {
    container.innerHTML = '<p class="notification-empty">No achievements available yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Photo</th>
          <th>Title</th>
          <th>Type</th>
          <th>Location / Level</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${items.map(item => `
        <tr>
                <td>${item.media && item.media.length ? (item.media[0].type === 'video' ? `<video src="${item.media[0].url}" class="admin-thumb" muted playsinline></video>` : `<img src="${item.media[0].url}" alt="${item.title}" class="admin-thumb">`) : ''}</td>
                <td>${item.title}</td>
                <td>${item.type.toUpperCase()}</td>
                <td>${item.location}</td>
                <td>${formatStatus(item)}</td>
          <td>
            <button class="btn btn-primary" data-action="set-home" data-id="${item.id}">Set to Homepage</button>
            ${item.status !== 'archived' ? `<button class="btn btn-warning" data-action="archive-item" data-id="${item.id}">Archive</button>` : ''}
            <button class="btn btn-danger" data-action="delete-item" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('button[data-action="set-home"]').forEach(button => {
    button.addEventListener('click', handleSetHomeClick);
  });

  container.querySelectorAll('button[data-action="archive-item"]').forEach(button => {
    button.addEventListener('click', handleArchiveClick);
  });

  container.querySelectorAll('button[data-action="delete-item"]').forEach(button => {
    button.addEventListener('click', handleDeleteClick);
  });
}

function handleSetHomeClick(event) {
  const itemId = event.currentTarget.dataset.id;
  const items = getStoredItems();
  let hasActive = false;

  items.forEach(item => {
    if (item.id === itemId) {
      item.status = 'active';
      hasActive = true;
    } else if (item.status === 'active') {
      item.status = 'archived';
    }
  });

  if (!hasActive) return;
  saveStoredItems(items);
  setCurrentNewsId(itemId);
  showMessage('breakingNewsMessage', 'Homepage banner updated successfully.');
  loadBreakingNewsItems();
}

function handleArchiveClick(event) {
  const itemId = event.currentTarget.dataset.id;
  const items = getStoredItems();

  items.forEach(item => {
    if (item.id === itemId) {
      item.status = 'archived';
    }
  });

  if (getCurrentNewsId() === itemId) {
    setCurrentNewsId(null);
  }

  saveStoredItems(items);
  showMessage('breakingNewsMessage', 'Achievement archived successfully.');
  loadBreakingNewsItems();
}

function handleDeleteClick(event) {
  const itemId = event.currentTarget.dataset.id;
  if (!window.confirm('Delete this achievement permanently?')) {
    return;
  }

  let items = getStoredItems();
  items = items.filter(item => item.id !== itemId);

  if (getCurrentNewsId() === itemId) {
    setCurrentNewsId(null);
  }

  saveStoredItems(items);
  showMessage('breakingNewsMessage', 'Achievement deleted successfully.');
  loadBreakingNewsItems();
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function publishBreakingNews(action) {
  const title = document.getElementById('breakingTitle').value.trim();
  const date = document.getElementById('breakingDate').value;
  const type = document.getElementById('breakingType').value;
  const location = document.getElementById('breakingLocation').value.trim();
  const uniform = document.getElementById('breakingUniform').value.trim();
  const description = document.getElementById('breakingDescription').value.trim();
  const files = Array.from(document.getElementById('breakingPhoto').files || []);

  if (!title || !date || !type || !location || !uniform || !description || files.length === 0) {
    showMessage('breakingNewsMessage', 'All fields and at least one media file are required before uploading.', true);
    return;
  }

  // Read all files as data URLs
  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const mediaType = file.type && file.type.startsWith('video') ? 'video' : 'image';
      resolve({ type: mediaType, url });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let media = [];
  try {
    media = await Promise.all(files.map(f => readFile(f)));
  } catch (err) {
    showMessage('breakingNewsMessage', 'Error reading files: ' + err.message, true);
    return;
  }

  const items = getStoredItems();
  const newItem = {
    id: createId(),
    title,
    date,
    type,
    location,
    uniform,
    description,
    media,
    status: action === 'draft' ? 'draft' : 'active',
    createdAt: new Date().toISOString()
  };

  if (action === 'publish') {
    items.forEach(item => {
      if (item.status === 'active') item.status = 'archived';
    });
    setCurrentNewsId(newItem.id);
  }

  items.unshift(newItem);
  saveStoredItems(items);

  showMessage('breakingNewsMessage', action === 'draft' ? 'Saved as draft successfully.' : 'Published to spotlight successfully.');
  clearNewsForm();
  loadBreakingNewsItems();
}

function initializeAdminPage() {
  const loginForm = document.getElementById('adminLoginForm');
  const publishButton = document.getElementById('publishButton');
  const draftButton = document.getElementById('draftButton');

  loginForm?.addEventListener('submit', handleLogin);
  publishButton?.addEventListener('click', () => publishBreakingNews('publish'));
  draftButton?.addEventListener('click', () => publishBreakingNews('draft'));

  updatePublishAction('publish');

  if (isLoggedIn()) {
    showAdminPanel();
    startBreakingNewsInactivityTracking();
  }
}

const BREAKING_NEWS_INACTIVITY_MS = 60 * 1000;
let breakingNewsInactivityTimer = null;

function resetBreakingNewsInactivityTimer() {
  if (breakingNewsInactivityTimer) {
    clearTimeout(breakingNewsInactivityTimer);
  }
  breakingNewsInactivityTimer = setTimeout(() => {
    localStorage.removeItem(adminLoginKey);
    alert('You have been logged out from Breaking News admin after 1 minute of inactivity.');
    window.location.reload();
  }, BREAKING_NEWS_INACTIVITY_MS);
}

function startBreakingNewsInactivityTracking() {
  const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(eventName => {
    document.addEventListener(eventName, resetBreakingNewsInactivityTimer);
  });
  resetBreakingNewsInactivityTimer();
}

window.addEventListener('DOMContentLoaded', initializeAdminPage);
