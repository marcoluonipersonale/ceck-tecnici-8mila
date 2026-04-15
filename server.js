const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const BIN_ID = '69de1e8d36566621a8b063bc';
const API_KEY = '$2a$10$RtQ4M/XD9wjo6tblMUCJbeYe/19NUQB0hrbY5z/PhshWBlPBIQlGy';

let DB = { candidates: [] };

function jsonbin(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.jsonbin.io',
      path: urlPath,
      method,
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
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

async function loadFromJsonbin() {
  try {
    const res = await jsonbin('GET', `/v3/b/${BIN_ID}/latest`);
    if (res.record && Array.isArray(res.record.candidates)) {
      DB = res.record;
      console.log(`Caricati ${DB.candidates.length} candidati da JSONBin`);
    }
  } catch(e) {
    console.error('Errore caricamento JSONBin:', e.message);
  }
}

async function saveToJsonbin() {
  try {
    await jsonbin('PUT', `/v3/b/${BIN_ID}`, DB);
    console.log('Salvato su JSONBin OK');
  } catch(e) {
    console.error('Errore salvataggio JSONBin:', e.message);
  }
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint speedtest upload (stesso dominio, non bloccato)
app.post('/api/speedtest', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
  res.json({ ok: true });
});

app.get('/api/results', (req, res) => {
  res.json(DB.candidates || []);
});

app.post('/api/submit', async (req, res) => {
  try {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...req.body,
      date: new Date().toISOString()
    };
    DB.candidates.unshift(entry);
    await saveToJsonbin(); // sincrono — garantisce persistenza
    console.log('Salvato:', entry.name);
    res.json({ ok: true, id: entry.id });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    DB.candidates = DB.candidates.filter(c => c.id !== req.params.id);
    await saveToJsonbin();
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false });
  }
});

loadFromJsonbin().then(() => {
  app.listen(PORT, () => console.log(`PC Check attivo su porta ${PORT}`));
});
