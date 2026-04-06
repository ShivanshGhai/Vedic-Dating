// routes/notifications.js
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// ── GET /api/notifications ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM NOTIFICATIONS WHERE UserID = ?
       ORDER BY CreatedAt DESC LIMIT 50`,
      [req.user.userId]
    );
    const unreadCount = rows.filter(r => !r.IsRead).length;
    return res.json({ notifications: rows, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────
router.patch('/read-all', auth, async (req, res) => {
  await db.query('UPDATE NOTIFICATIONS SET IsRead = 1 WHERE UserID = ?', [req.user.userId]);
  return res.json({ ok: true });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────
router.patch('/:id/read', auth, async (req, res) => {
  await db.query(
    'UPDATE NOTIFICATIONS SET IsRead = 1 WHERE NotifID = ? AND UserID = ?',
    [req.params.id, req.user.userId]
  );
  return res.json({ ok: true });
});

module.exports = router;
