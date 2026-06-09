// Persistent, file-backed store for contact form messages.
// Works without MongoDB so submitted messages survive server restarts.
// When MongoDB is connected the Contact model is used instead; this store
// is the durable fallback (and the primary store for low-traffic deployments).

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'contacts.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, '[]', 'utf8');
  }
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('contactStore: failed to read store, starting empty:', error.message);
    return [];
  }
}

// Atomic write (write to temp then rename) so a crash mid-write can't corrupt the file.
function save(list) {
  ensureFile();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
}

function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Newest first, matching the MongoDB sort({ createdAt: -1 }) behaviour.
function getAll() {
  return load().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function add({ name, email, phone, subject, message }) {
  const list = load();
  const contact = {
    _id: generateId(),
    name,
    email,
    phone: phone || '',
    subject,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  list.push(contact);
  save(list);
  return contact;
}

function markRead(id) {
  const list = load();
  const idx = list.findIndex(m => m._id === id);
  if (idx === -1) return null;
  list[idx].read = true;
  save(list);
  return list[idx];
}

function remove(id) {
  const list = load();
  const idx = list.findIndex(m => m._id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  save(list);
  return true;
}

module.exports = { getAll, add, markRead, remove, _file: FILE };
