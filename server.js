const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const SUPA_URL = 'https://htwwnmwwkmzmgwqxsamf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d3dubXd3a216bWd3cXhzYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzg1NzksImV4cCI6MjA5MTgxNDU3OX0.jRaWxHUTD-mfInv0L0qpwWAHwBX5kjchzHTZAK0d8qU';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function supabase(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPA_URL + endpoint);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : '',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve(JSON.parse(s)); } catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Endpoint speedtest upload
app.post('/api/speedtest', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
  res.json({ ok: true });
});

app.get('/api/results', async (req, res) => {
  try {
    const rows = await supabase('GET', '/rest/v1/candidates?order=date.desc&select=*');
    res.json(Array.isArray(rows) ? rows : []);
  } catch(e) {
    console.error('GET error:', e.message);
    res.json([]);
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: req.body.name,
      email: req.body.email,
      idoneo: req.body.idoneo,
      date: new Date().toISOString(),
      results: req.body.results
    };
    const result = await supabase('POST', '/rest/v1/candidates', entry);
    console.log('Salvato:', entry.name);
    res.json({ ok: true, id: entry.id });
  } catch(e) {
    console.error('POST error:', e.message);
    res.status(500).json({ ok: false });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    await supabase('DELETE', `/rest/v1/candidates?id=eq.${req.params.id}`);
    res.json({ ok: true });
  } catch(e) {
    console.error('DELETE error:', e.message);
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => console.log(`PC Check attivo su porta ${PORT}`));
