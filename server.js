const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BIN_ID = '69de1e8d36566621a8b063bc';
const API_KEY = '$2a$10$RtQ4M/XD9wjo6tblMUCJbeYe/19NUQB0hrbY5z/PhshWBlPBIQlGy';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function getDB() {
  const res = await fetch(`${BIN_URL}/latest`, {
    headers: { 'X-Master-Key': API_KEY }
  });
  const data = await res.json();
  return data.record || { candidates: [] };
}

async function saveDB(db) {
  await fetch(BIN_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
    body: JSON.stringify(db)
  });
}

app.get('/api/results', async (req, res) => {
  try {
    const db = await getDB();
    res.json(db.candidates || []);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const db = await getDB();
    if (!db.candidates) db.candidates = [];
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...req.body,
      date: new Date().toISOString()
    };
    db.candidates.unshift(entry);
    await saveDB(db);
    res.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    const db = await getDB();
    db.candidates = (db.candidates || []).filter(c => c.id !== req.params.id);
    await saveDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => {
  console.log(`✅ PC Check in esecuzione su http://localhost:${PORT}`);
});
