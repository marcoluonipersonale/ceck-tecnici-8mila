const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const BIN_ID = '69de1e8d36566621a8b063bc';
const API_KEY = '$2a$10$RtQ4M/XD9wjo6tblMUCJbeYe/19NUQB0hrbY5z/PhshWBlPBIQlGy';

function jsonbinRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.jsonbin.io',
      path: urlPath,
      method,
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let str = '';
      res.on('data', c => str += c);
      res.on('end', () => { try { resolve(JSON.parse(str)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getDB() {
  const res = await jsonbinRequest('GET', `/v3/b/${BIN_ID}/latest`);
  return res.record || { candidates: [] };
}

async function saveDB(db) {
  await jsonbinRequest('PUT', `/v3/b/${BIN_ID}`, db);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/results', async (req, res) => {
  try { const db = await getDB(); res.json(db.candidates || []); }
  catch(e) { console.error(e); res.json([]); }
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
  } catch(e) { console.error(e); res.status(500).json({ ok: false }); }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    const db = await getDB();
    db.candidates = (db.candidates || []).filter(c => c.id !== req.params.id);
    await saveDB(db);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ ok: false }); }
});

app.listen(PORT, () => {
  console.log(`✅ PC Check in esecuzione su http://localhost:${PORT}`);
});
