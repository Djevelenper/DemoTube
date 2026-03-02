import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('demovault.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'user'))
  );

  CREATE TABLE IF NOT EXISTS demos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    genre TEXT,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER,
    demo_id INTEGER,
    PRIMARY KEY (user_id, demo_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (demo_id) REFERENCES demos(id)
  );
`);

// Seed admin if not exists
const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!admin) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
}

export default db;
