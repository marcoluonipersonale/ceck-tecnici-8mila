const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ candidates: [] }));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/results", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(db.candidates || []);
  } catch (e) {
    res.json([]);
  }
});

app.post("/api/submit", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    if (!db.candidates) db.candidates = [];
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...req.body,
      date: new Date().toISOString(),
    };
    db.candidates.unshift(entry);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.delete("/api/results/:id", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    db.candidates = (db.candidates || []).filter((c) => c.id !== req.params.id);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => {
  console.log(`✅ PC Check in esecuzione su http://localhost:${PORT}`);
});
