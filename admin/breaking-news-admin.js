const adminPassword = 'admin123';
const adminLoginKey = 'breakingNewsAdminLoggedIn';
const adminTokenKey = 'breakingNewsAdminToken';
const storageKey = 'breakingNewsItems';
const currentNewsKey = 'breakingNewsCurrentId';
let currentPublishAction = 'publish';
let editingId = null;

function setLoggedIn() {
  localStorage.setItem(adminLoginKey, 'true');
}

function setAdminToken(token) {
  if (token) localStorage.setItem(adminTokenKey, token);
}

function getAdminToken() {
  return localStorage.getItem(adminTokenKey);
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
  // Try server login first (preferred). Fallback to local password if server unavailable.
  try {
    fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      .then(r => r.json())
      .then(j => {
        if (j && j.token) {
          setAdminToken(j.token);
          setLoggedIn();
          showMessage('adminLoginMessage', 'Login successful (server). Loading admin panel.');
          showAdminPanel();
          startBreakingNewsInactivityTracking();
        } else {
          // server responded but no token -> fall back to local
          if (password !== adminPassword) {
            showMessage('adminLoginMessage', 'Invalid password. Please try again.', true);
            return;
          }
          setLoggedIn();
          showMessage('adminLoginMessage', 'Login successful (local). Loading admin panel.');
          showAdminPanel();
          startBreakingNewsInactivityTracking();
        }
      })
      .catch(() => {
        // server not reachable, fallback to local password
        if (password !== adminPassword) {
          showMessage('adminLoginMessage', 'Invalid password. Please try again.', true);
          return;
        }
        setLoggedIn();
        showMessage('adminLoginMessage', 'Login successful (local). Loading admin panel.');
        showAdminPanel();
        startBreakingNewsInactivityTracking();
      });
  } catch (err) {
    if (password !== adminPassword) {
      showMessage('adminLoginMessage', 'Invalid password. Please try again.', true);
      return;
    }
    setLoggedIn();
    showMessage('adminLoginMessage', 'Login successful (local). Loading admin panel.');
    showAdminPanel();
    startBreakingNewsInactivityTracking();
  }
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
  const token = getAdminToken();
  if (token) {
    // prefer server data when authenticated
    loadBreakingNewsItemsFromServer();
    return;
  }
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
            <button class="btn btn-secondary" data-action="edit-item" data-id="${item.id}">Edit</button>
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

  container.querySelectorAll('button[data-action="edit-item"]').forEach(button => {
    button.addEventListener('click', handleEditClick);
  });
}

async function loadBreakingNewsItemsFromServer() {
  const container = document.getElementById('breakingNewsTable');
  const token = getAdminToken();
  if (!token) return loadBreakingNewsItems();
  try {
    const res = await fetch('/api/breaking-news', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) throw new Error('Server error');
    const json = await res.json();
    const items = json.items || [];
    // normalize fields
    const mapped = items.map(it => ({
      id: it.id,
      title: it.title,
      date: it.date,
      type: it.type,
      location: it.level || it.location || '',
      uniform: it.uniform || '',
      description: it.description || '',
      media: it.media || (it.imageUrl ? [{ type: 'image', url: it.imageUrl }] : []),
      status: it.status || 'draft',
      createdAt: it.createdAt || ''
    }));
    saveStoredItems(mapped);
    // render using existing renderer
    const prev = container.innerHTML;
    loadBreakingNewsItems();
  } catch (err) {
    console.warn('Failed to load breaking news from server', err);
    loadBreakingNewsItems();
  }
}

function handleSetHomeClick(event) {
  const itemId = event.currentTarget.dataset.id;
  const items = getStoredItems();
  const token = getAdminToken();
  if (token) {
    fetch(`/api/breaking-news/${itemId}/set-home`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(j => {
        // refresh local store from server
        loadBreakingNewsItemsFromServer();
      }).catch(() => {
        // fallback to local
        items.forEach(item => {
          if (item.id === itemId) item.status = 'active'; else if (item.status === 'active') item.status = 'archived';
        });
        saveStoredItems(items);
        setCurrentNewsId(itemId);
        showMessage('breakingNewsMessage', 'Homepage banner updated successfully.');
        loadBreakingNewsItems();
      });
    return;
  }
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
  const token = getAdminToken();
  if (token) {
    fetch(`/api/breaking-news/${itemId}/archive`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(j => loadBreakingNewsItemsFromServer())
      .catch(() => {
        items.forEach(item => { if (item.id === itemId) item.status = 'archived'; });
        if (getCurrentNewsId() === itemId) setCurrentNewsId(null);
        saveStoredItems(items);
        showMessage('breakingNewsMessage', 'Achievement archived successfully.');
        loadBreakingNewsItems();
      });
    return;
  }

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
  const token = getAdminToken();
  if (token) {
    fetch(`/api/breaking-news/${itemId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(j => {
        showMessage('breakingNewsMessage', 'Achievement deleted successfully (server).');
        loadBreakingNewsItemsFromServer();
      })
      .catch(() => {
        let items = getStoredItems();
        items = items.filter(item => item.id !== itemId);
        if (getCurrentNewsId() === itemId) setCurrentNewsId(null);
        saveStoredItems(items);
        showMessage('breakingNewsMessage', 'Achievement deleted successfully.');
        loadBreakingNewsItems();
      });
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

function handleEditClick(event) {
  const itemId = event.currentTarget.dataset.id;
  const token = getAdminToken();
  if (token) {
    // load from server
    fetch('/api/breaking-news', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(j => {
        const items = j.items || [];
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        loadItemIntoForm(item);
      })
      .catch(() => {
        const items = getStoredItems();
        const item = items.find(i => i.id === itemId);
        if (item) loadItemIntoForm(item);
      });
    return;
  }
  const items = getStoredItems();
  const item = items.find(i => i.id === itemId);
  if (item) loadItemIntoForm(item);
}

function loadItemIntoForm(item) {
  editingId = item.id;
  document.getElementById('breakingTitle').value = item.title || '';
  document.getElementById('breakingDate').value = item.date || '';
  document.getElementById('breakingType').value = item.type || 'sports';
  document.getElementById('breakingLocation').value = item.location || item.level || '';
  document.getElementById('breakingUniform').value = item.uniform || '';
  document.getElementById('breakingDescription').value = item.description || '';
  updatePublishAction(item.status === 'draft' ? 'draft' : 'publish');
  showMessage('breakingNewsMessage', 'Loaded item into form for editing. Select new media to replace existing.', false);
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
  const localItem = {
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

  // If we have an admin token, attempt server upload (single photo supported by server)
  const token = getAdminToken();
  if (token && (files.length || editingId)) {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('date', date);
    fd.append('type', type);
    fd.append('level', location);
    fd.append('uniform', uniform);
    fd.append('description', description);
    fd.append('action', action === 'draft' ? 'draft' : 'publish');
    // server accepts multiple files as 'photos'
    files.forEach(f => fd.append('photos', f));

    try {
      let res;
      if (editingId) {
        res = await fetch('/api/breaking-news/' + editingId, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
      } else {
        res = await fetch('/api/breaking-news', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
      }
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const json = await res.json();
      // convert server item to local format and persist so admin UI shows consistent state
      const serverItem = json.item;
      if (serverItem) {
        const mapped = {
          id: serverItem.id,
          title: serverItem.title,
          date: serverItem.date,
          type: serverItem.type,
          location: serverItem.level || serverItem.location || '',
          uniform: serverItem.uniform || '',
          description: serverItem.description || '',
          media: serverItem.media || (serverItem.imageUrl ? [{ type: 'image', url: serverItem.imageUrl }] : []),
          status: serverItem.status || (action === 'draft' ? 'draft' : 'active'),
          createdAt: serverItem.createdAt || new Date().toISOString()
        };

        // update local store
        items.forEach(i => { if (i.status === 'active') i.status = 'archived'; });
        if (action === 'publish') setCurrentNewsId(mapped.id);
        items.unshift(mapped);
        saveStoredItems(items);
        showMessage('breakingNewsMessage', action === 'draft' ? 'Saved as draft (server).' : 'Published to spotlight (server).');
        clearNewsForm();
        editingId = null;
        loadBreakingNewsItemsFromServer();
        return;
      }
    } catch (err) {
      console.warn('Server publish failed, falling back to local:', err);
      // fall through to local save
    }
  }

  // Local fallback (existing behaviour)
  if (editingId) {
    // update existing local item
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === editingId) {
        items[i] = { ...items[i], ...localItem, id: editingId };
      } else if (action === 'publish' && items[i].status === 'active') {
        items[i].status = 'archived';
      }
    }
    if (action === 'publish') setCurrentNewsId(editingId);
  } else {
    if (action === 'publish') {
      items.forEach(item => { if (item.status === 'active') item.status = 'archived'; });
      setCurrentNewsId(localItem.id);
    }
    items.unshift(localItem);
  }
  saveStoredItems(items);

  showMessage('breakingNewsMessage', action === 'draft' ? 'Saved as draft successfully.' : 'Published to spotlight successfully.');
  clearNewsForm();
  editingId = null;
  loadBreakingNewsItems();
}

function initializeAdminPage() {
  const loginForm = document.getElementById('adminLoginForm');
  const publishButton = document.getElementById('publishButton');
  const draftButton = document.getElementById('draftButton');
  const backBtn = document.getElementById('backToAdminBtn');

  loginForm?.addEventListener('submit', handleLogin);
  publishButton?.addEventListener('click', () => publishBreakingNews('publish'));
  draftButton?.addEventListener('click', () => publishBreakingNews('draft'));
  backBtn?.addEventListener('click', () => { window.location.href = 'admin.html'; });

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
