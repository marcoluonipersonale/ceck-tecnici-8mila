const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const BIN_ID = '69de1e8d36566621a8b063bc';
const API_KEY = '$2a$10$RtQ4M/XD9wjo6tblMUCJbeYe/19NUQB0hrbY5z/PhshWBlPBIQlGy';

// DB in memoria — velocissimo
let DB = { candidates: [] };

function jsonbin(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.jsonbin.io', path: urlPath, method,
      headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json',
        ...(data ? {'Content-Length': Buffer.byteLength(data)} : {}) }
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Carica da JSONBin all'avvio
async function loadFromJsonbin() {
  try {
    const res = await jsonbin('GET', `/v3/b/${BIN_ID}/latest`);
    if (res.record && res.record.candidates) {
      DB = res.record;
      console.log(`✅ Caricati ${DB.candidates.length} candidati da JSONBin`);
    }
  } catch(e) { console.error('Load error:', e.message); }
}

// Salva su JSONBin in background
function saveToJsonbin() {
  jsonbin('PUT', `/v3/b/${BIN_ID}`, DB)
    .then(() => console.log('Backup OK'))
    .catch(e => console.error('Backup error:', e.message));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/results', (req, res) => {
  res.json(DB.candidates || []);
});

app.post('/api/submit', (req, res) => {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    ...req.body,
    date: new Date().toISOString()
  };
  DB.candidates.unshift(entry);
  saveToJsonbin();
  console.log('Saved:', entry.name);
  res.json({ ok: true, id: entry.id });
});

app.delete('/api/results/:id', (req, res) => {
  DB.candidates = DB.candidates.filter(c => c.id !== req.params.id);
  saveToJsonbin();
  res.json({ ok: true });
});

// Avvio: prima carica i dati, poi parte il server
loadFromJsonbin().then(() => {
  app.listen(PORT, () => console.log(`✅ PC Check attivo porta ${PORT}`));
});
