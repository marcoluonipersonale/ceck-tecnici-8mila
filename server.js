const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');
const BIN_ID = '69de1e8d36566621a8b063bc';
const API_KEY = '$2a$10$RtQ4M/XD9wjo6tblMUCJbeYe/19NUQB0hrbY5z/PhshWBlPBIQlGy';

// Init local DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({candidates: []}));
}

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE)); }
  catch(e) { return {candidates: []}; }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Backup su JSONBin in background (non blocca)
function backupToJsonbin(db) {
  try {
    const data = JSON.stringify(db);
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${BIN_ID}`,
      method: 'PUT',
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, res => {
      res.on('data', () => {});
      res.on('end', () => console.log('Backup JSONBin OK'));
    });
    req.on('error', e => console.error('Backup error:', e.message));
    req.write(data);
    req.end();
  } catch(e) {
    console.error('Backup failed:', e.message);
  }
}

app.use(express.json({limit: '1mb'}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/results', (req, res) => {
  const db = readDB();
  res.json(db.candidates || []);
});

app.post('/api/submit', (req, res) => {
  try {
    const db = readDB();
    if (!db.candidates) db.candidates = [];
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...req.body,
      date: new Date().toISOString()
    };
    db.candidates.unshift(entry);
    writeDB(db);
    backupToJsonbin(db); // backup asincrono
    console.log('Saved:', entry.name);
    res.json({ok: true, id: entry.id});
  } catch(e) {
    console.error(e);
    res.status(500).json({ok: false});
  }
});

app.delete('/api/results/:id', (req, res) => {
  try {
    const db = readDB();
    db.candidates = (db.candidates || []).filter(c => c.id !== req.params.id);
    writeDB(db);
    backupToJsonbin(db);
    res.json({ok: true});
  } catch(e) {
    res.status(500).json({ok: false});
  }
});

app.listen(PORT, () => {
  console.log(`✅ PC Check attivo su porta ${PORT}`);
});
