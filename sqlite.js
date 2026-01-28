const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.resolve(dataDir, "database.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS form_tokens (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    userId TEXT NOT NULL,
    discordTag TEXT NOT NULL,
    nick TEXT NOT NULL,
    idade INTEGER NOT NULL,
    recrutador TEXT NOT NULL,
    motivo TEXT NOT NULL,
    linkBonde TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    staffId TEXT,
    staffTag TEXT,
    createdAt INTEGER NOT NULL
  )`);
});

module.exports = db;
