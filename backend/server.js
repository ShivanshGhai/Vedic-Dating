// server.js — Ashtakoota Backend Entry Point
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5500',
    ],
    methods: ['GET','POST'],
    credentials: true,
  },
});

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve avatars statically
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/likes',           require('./routes/social'));
app.use('/api/matches',         require('./routes/social'));  // same router, handles both
app.use('/api/compat-requests', require('./routes/compatRequests'));
app.use('/api/compatibility',   require('./routes/compatibility'));
app.use('/api/chat',            require('./routes/chat'));
app.use('/api/notifications',   require('./routes/notifications'));

// ── Socket.io Chat ────────────────────────────────────────────────────────
const { setupChat } = require('./routes/chat');
setupChat(io);

// ── Global error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✦ Ashtakoota server running on port ${PORT}`);
});
