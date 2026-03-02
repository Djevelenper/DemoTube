import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import db from './src/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: 'demovault-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 
    }
  }));

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

  app.post('/api/demos', (req, res) => {
    if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
    const { name, genre, url } = req.body;
    const result = db.prepare('INSERT INTO demos (name, genre, url) VALUES (?, ?, ?)').run(name, genre, url);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/demos/:id', (req, res) => {
    if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
    const { name, genre, url } = req.body;
    db.prepare('UPDATE demos SET name = ?, genre = ?, url = ? WHERE id = ?').run(name, genre, url, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/demos/:id', (req, res) => {
    if ((req.session as any).role !== 'admin') return res.status(403).send('Forbidden');
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

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
