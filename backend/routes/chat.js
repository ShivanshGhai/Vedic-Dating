// routes/chat.js — REST endpoints for message history
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// Verify the requesting user is part of the match
async function verifyMatchAccess(matchId, userId) {
  const [[row]] = await db.query(
    'SELECT 1 FROM INVOLVES WHERE MatchID = ? AND (UserA = ? OR UserB = ?)',
    [matchId, userId, userId]
  );
  return !!row;
}

// ── GET /api/chat/:matchId/messages ──────────────────────────────────────
router.get('/:matchId/messages', auth, async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (!(await verifyMatchAccess(matchId, req.user.userId))) {
      return res.status(403).json({ error: 'Not a participant in this match' });
    }

    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // MessageID cursor for pagination

    let query = 'SELECT * FROM MESSAGES WHERE MatchID = ?';
    const params = [matchId];
    if (before) { query += ' AND MessageID < ?'; params.push(before); }
    query += ' ORDER BY SentAt DESC LIMIT ?';
    params.push(limit);

    const [messages] = await db.query(query, params);

    // Mark messages from other user as read
    await db.query(
      'UPDATE MESSAGES SET ReadAt = NOW() WHERE MatchID = ? AND SenderID != ? AND ReadAt IS NULL',
      [matchId, req.user.userId]
    );

    return res.json({ messages: messages.reverse() }); // chronological order
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chat/:matchId/messages (fallback for no-WS clients) ─────────
router.post('/:matchId/messages', auth, async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (!(await verifyMatchAccess(matchId, req.user.userId))) {
      return res.status(403).json({ error: 'Not a participant in this match' });
    }
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body required' });
    const [result] = await db.query(
      'INSERT INTO MESSAGES (MatchID, SenderID, Body) VALUES (?, ?, ?)',
      [matchId, req.user.userId, body.trim().slice(0, 2000)]
    );
    const [[msg]] = await db.query('SELECT * FROM MESSAGES WHERE MessageID = ?', [result.insertId]);
    return res.status(201).json({ message: msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── Socket.io real-time chat handler ─────────────────────────────────────
// Called from server.js: setupChat(io)
const jwt = require('jsonwebtoken');

module.exports.setupChat = function setupChat(io) {
  const chatNs = io.of('/chat');

  chatNs.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthenticated'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chatNs.on('connection', async (socket) => {
    const userId = socket.user.userId;

    // User joins a match room
    socket.on('join_match', async ({ matchId }) => {
      const ok = await verifyMatchAccess(matchId, userId);
      if (!ok) return socket.emit('error', 'Not a participant');
      socket.join(`match:${matchId}`);
    });

    // Send a message
    socket.on('send_message', async ({ matchId, body }) => {
      if (!body?.trim()) return;
      const ok = await verifyMatchAccess(matchId, userId);
      if (!ok) return socket.emit('error', 'Not a participant');

      try {
        const [result] = await db.query(
          'INSERT INTO MESSAGES (MatchID, SenderID, Body) VALUES (?, ?, ?)',
          [matchId, userId, body.trim().slice(0, 2000)]
        );
        const [[msg]] = await db.query('SELECT * FROM MESSAGES WHERE MessageID = ?', [result.insertId]);

        // Broadcast to both participants in the room
        chatNs.to(`match:${matchId}`).emit('new_message', {
          ...msg,
          senderUsername: socket.user.username,
        });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('disconnect', () => {});
  });
};
