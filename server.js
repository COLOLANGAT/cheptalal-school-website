const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'breaking-news.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'breaking-news');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// separate storage for gallery uploads
const GALLERY_DIR = path.join(__dirname, 'uploads', 'gallery');
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const activeTokens = new Set();

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(GALLERY_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ items: [], currentId: null }, null, 2), 'utf8');
  }
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, JSON.stringify({ items: [] }, null, 2), 'utf8');
  }
}

async function loadData() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function loadEventsData() {
  const raw = await fs.readFile(EVENTS_FILE, 'utf8');
  return JSON.parse(raw);
}

async function saveEventsData(data) {
  await fs.writeFile(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function createId() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizeItem(item, currentId) {
  if (!item.status) {
    item.status = item.id === currentId ? 'active' : 'draft';
  }
  return item;
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.replace('Bearer ', '').trim();
  if (!activeTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

app.post('/api/admin/login', async (req, res) => {
  const password = req.body.password;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.add(token);
  res.json({ token });
});

app.get('/api/breaking-news/latest', async (req, res) => {
  await ensureStorage();
  const data = await loadData();
  const item = data.currentId ? data.items.find(item => item.id === data.currentId) : null;
  res.json({ item: item ? normalizeItem(item, data.currentId) : null });
});

// Events endpoints
app.get('/api/events/latest', async (req, res) => {
  await ensureStorage();
  const data = await loadEventsData();
  if (!data.items || !data.items.length) return res.json({ item: null });
  const sorted = [...data.items].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ item: sorted[0] });
});

app.get('/api/events', async (req, res) => {
  await ensureStorage();
  const data = await loadEventsData();
  res.json({ items: data.items || [] });
});

app.post('/api/events', requireAdmin, async (req, res) => {
  await ensureStorage();
  const { title, date, description, location } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });
  const data = await loadEventsData();
  const item = { id: crypto.randomBytes(12).toString('hex'), title, date, description: description || '', location: location || '', createdAt: new Date().toISOString() };
  data.items = data.items || [];
  data.items.push(item);
  await saveEventsData(data);
  res.json({ item });
});

app.get('/api/breaking-news', async (req, res) => {
  await ensureStorage();
  const data = await loadData();
  const sorted = [...data.items]
    .map(item => normalizeItem(item, data.currentId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ items: sorted, currentId: data.currentId });
});

app.post('/api/breaking-news', requireAdmin, upload.single('photo'), async (req, res) => {
  await ensureStorage();

  const { title, date, type, level, uniform, description, action } = req.body;
  if (!title || !date || !type || !level || !uniform || !description) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Photo upload is required.' });
  }

  const data = await loadData();
  const normalizedType = type.toLowerCase() === 'kcse' ? 'kcse' : type.toLowerCase() === 'general' ? 'general' : 'sports';
  const publishAction = action === 'draft' ? 'draft' : 'publish';
  const item = {
    id: createId(),
    title,
    date,
    type: normalizedType,
    level,
    uniform,
    description,
    status: publishAction === 'draft' ? 'draft' : 'active',
    imageUrl: `/uploads/breaking-news/${req.file.filename}`,
    createdAt: new Date().toISOString()
  };

  if (publishAction === 'publish' && data.currentId) {
    const currentItem = data.items.find(i => i.id === data.currentId);
    if (currentItem) {
      currentItem.status = 'archived';
    }
  }

  data.items.unshift(item);
  if (publishAction === 'publish') {
    data.currentId = item.id;
  }

  await saveData(data);
  res.json({ item });
});

// Endpoint to upload gallery photos to local uploads/gallery
app.post('/api/gallery/upload', requireAdmin, galleryUpload.array('photos', 20), async (req, res) => {
  await ensureStorage();
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const uploaded = req.files.map(f => ({ filename: f.filename, url: `/uploads/gallery/${f.filename}` }));

  // Optionally commit uploads to git automatically if AUTO_COMMIT env is true
  if (process.env.AUTO_COMMIT === 'true') {
    const { exec } = require('child_process');
    const msgs = [];
    try {
      // Stage new files
      await new Promise((res, rej) => exec(`git add ${uploaded.map(u => '"' + path.join('uploads','gallery', u.filename) + '"').join(' ')}`, { cwd: __dirname }, (err, stdout, stderr) => err ? rej(stderr || err) : res(stdout)));
      // Commit
      await new Promise((res, rej) => exec(`git commit -m "Add gallery uploads" --no-verify`, { cwd: __dirname }, (err, stdout, stderr) => err ? rej(stderr || err) : res(stdout)));
      // Push
      await new Promise((res, rej) => exec(`git push origin HEAD:gh-pages`, { cwd: __dirname }, (err, stdout, stderr) => err ? rej(stderr || err) : res(stdout)));
      msgs.push('Committed and pushed uploads to gh-pages');
    } catch (err) {
      console.warn('Auto-commit failed:', err);
      msgs.push('Auto-commit failed: ' + String(err).slice(0, 200));
    }
    return res.json({ uploaded, messages: msgs });
  }

  res.json({ uploaded });
});

app.put('/api/breaking-news/:id/set-home', requireAdmin, async (req, res) => {
  await ensureStorage();
  const data = await loadData();
  const item = data.items.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  if (data.currentId && data.currentId !== item.id) {
    const currentItem = data.items.find(i => i.id === data.currentId);
    if (currentItem) {
      currentItem.status = 'archived';
    }
  }

  item.status = 'active';
  data.currentId = item.id;
  await saveData(data);
  res.json({ item });
});

app.put('/api/breaking-news/:id/archive', requireAdmin, async (req, res) => {
  await ensureStorage();
  const data = await loadData();
  const item = data.items.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  item.status = 'archived';
  if (data.currentId === item.id) {
    data.currentId = null;
  }

  await saveData(data);
  res.json({ item });
});

app.delete('/api/breaking-news/:id', requireAdmin, async (req, res) => {
  await ensureStorage();
  const data = await loadData();
  const index = data.items.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const [deleted] = data.items.splice(index, 1);
  if (data.currentId === deleted.id) {
    data.currentId = data.items.length ? data.items[0].id : null;
  }
  await saveData(data);

  if (deleted.imageUrl) {
    const filePath = path.join(__dirname, deleted.imageUrl.replace('/uploads/', 'uploads/'));
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Could not remove file:', filePath, error.message);
    }
  }

  res.json({ success: true });
});

app.listen(PORT, async () => {
  await ensureStorage();
  console.log(`School website backend running on http://localhost:${PORT}`);
});
