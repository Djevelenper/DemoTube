import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
import fs from 'fs';
import db from './src/db.ts';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'demovault-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Serve static uploads
app.use('/uploads', express.static(uploadDir));

// --- API Routes ---

// Auth
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, role) as any;
  
  if (user && user.password === password) {
    (req.session as any).userId = user.id;
    (req.session as any).role = user.role;
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if ((req.session as any).userId) {
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get((req.session as any).userId) as any;
    res.json({ user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Demos
app.get('/api/demos', (req, res) => {
  const sort = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
  const demos = db.prepare(`SELECT * FROM demos ORDER BY created_at ${sort}`).all();
  res.json(demos);
});

app.post('/api/demos', upload.single('file'), (req, res) => {
  if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
  const { name, genre } = req.body;
  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded');
  
  const url = `/uploads/${file.filename}`;
  const result = db.prepare('INSERT INTO demos (name, genre, url) VALUES (?, ?, ?)').run(name, genre, url);
  res.json({ id: result.lastInsertRowid, url });
});

app.put('/api/demos/:id', upload.single('file'), (req, res) => {
  if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
  const { name, genre } = req.body;
  const file = req.file;
  
  if (file) {
    const url = `/uploads/${file.filename}`;
    db.prepare('UPDATE demos SET name = ?, genre = ?, url = ? WHERE id = ?').run(name, genre, url, req.params.id);
  } else {
    db.prepare('UPDATE demos SET name = ?, genre = ? WHERE id = ?').run(name, genre, req.params.id);
  }
  res.json({ success: true });
});

app.delete('/api/demos/:id', (req, res) => {
  if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
  
  const demo = db.prepare('SELECT url FROM demos WHERE id = ?').get(req.params.id) as any;
  if (demo && demo.url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', demo.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM favorites WHERE demo_id = ?').run(req.params.id);
  db.prepare('DELETE FROM demos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Favorites
app.get('/api/favorites', (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).send('Unauthorized');
  const demos = db.prepare(`
    SELECT d.* FROM demos d
    JOIN favorites f ON d.id = f.demo_id
    WHERE f.user_id = ?
  `).all(userId);
  res.json(demos);
});

app.post('/api/favorites/:demoId', (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).send('Unauthorized');
  try {
    db.prepare('INSERT INTO favorites (user_id, demo_id) VALUES (?, ?)').run(userId, req.params.demoId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Already in favorites' });
  }
});

app.delete('/api/favorites/:demoId', (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).send('Unauthorized');
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND demo_id = ?').run(userId, req.params.demoId);
  res.json({ success: true });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    // In production (Vercel), assets are served by Vercel's edge
    // But we still need the SPA fallback if not handled by vercel.json
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }
}

startServer();

export default app;
