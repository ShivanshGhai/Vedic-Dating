// routes/compatRequests.js — Intentional compatibility reading system
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const { calculateAshtakoota } = require('../utils/koota');
const mailer = require('../utils/mailer');

async function loadUserForKoota(userId) {
  const [[u]] = await db.query(
    `SELECT u.UserID, r.Varna, r.VashyaGroup, r.RashiID,
            n.Index1to27, n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler
     FROM USER u
     JOIN RASHI r ON u.RashiID = r.RashiID
     JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
     JOIN PLANET p ON r.PlanetID = p.PlanetID
     WHERE u.UserID = ?`, [userId]
  );
  return {
    userId, varna: u.Varna, vashyaGroup: u.VashyaGroup,
    nakshatraIndex: u.Index1to27, yoni: u.Yoni, rashiRuler: u.RashiRuler,
    gana: u.Gana, nadi: u.Nadi, rashiIndex: u.RashiID - 1,
  };
}

async function notify(userId, type, payload) {
  await db.query('INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
    [userId, type, JSON.stringify(payload)]);
}

// ── POST /api/compat-requests/:targetId ──────────────────────────────────
router.post('/:targetId', auth, async (req, res) => {
  try {
    const fromId = req.user.userId;
    const toId   = parseInt(req.params.targetId);
    if (fromId === toId) return res.status(400).json({ error: 'Cannot request yourself' });

    // Check if already exists
    const [[existing]] = await db.query(
      'SELECT RequestID, Status FROM COMPAT_REQUEST WHERE FromUserID = ? AND ToUserID = ?',
      [fromId, toId]
    );
    if (existing) {
      if (existing.Status === 'pending') return res.status(409).json({ error: 'Request already pending' });
      // Re-request after decline/expire: update
      await db.query(
        `UPDATE COMPAT_REQUEST SET Status='pending', CreatedAt=NOW(), ExpiresAt=DATE_ADD(NOW(), INTERVAL 48 HOUR), RespondedAt=NULL
         WHERE RequestID = ?`, [existing.RequestID]
      );
    } else {
      await db.query(
        `INSERT INTO COMPAT_REQUEST (FromUserID, ToUserID, ExpiresAt)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`, [fromId, toId]
      );
    }

    await notify(toId, 'compat_request', { fromUserId: fromId, fromUsername: req.user.username });

    try {
      const [[target]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [toId]);
      if (target) mailer.sendCompatRequestNotification(target.Email, target.Username, req.user.username).catch(() => {});
    } catch {}

    return res.json({ sent: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/compat-requests — incoming pending requests ─────────────────
router.get('/', auth, async (req, res) => {
  try {
    // Auto-expire old ones first
    await db.query(
      `UPDATE COMPAT_REQUEST SET Status='expired' WHERE Status='pending' AND ExpiresAt < NOW()`
    );
    const [rows] = await db.query(
      `SELECT cr.*, u.Username AS FromUsername, u.AvatarURL AS FromAvatar,
              r.RashiName AS FromRashi, n.NakshatraName AS FromNakshatra
       FROM COMPAT_REQUEST cr
       JOIN USER u ON cr.FromUserID = u.UserID
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       WHERE cr.ToUserID = ? AND cr.Status = 'pending'
       ORDER BY cr.CreatedAt DESC`,
      [req.user.userId]
    );
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/compat-requests/sent — my sent requests ────────────────────
router.get('/sent', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cr.*, u.Username AS ToUsername, u.AvatarURL AS ToAvatar,
              r.RashiName AS ToRashi
       FROM COMPAT_REQUEST cr
       JOIN USER u ON cr.ToUserID = u.UserID
       JOIN RASHI r ON u.RashiID = r.RashiID
       WHERE cr.FromUserID = ? ORDER BY cr.CreatedAt DESC`,
      [req.user.userId]
    );
    return res.json({ sent: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/compat-requests/:requestId — accept/decline ───────────────
router.patch('/:requestId', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accepted' or 'declined'
    if (!['accepted','declined'].includes(action))
      return res.status(400).json({ error: 'action must be accepted or declined' });

    const [[cr]] = await db.query(
      'SELECT * FROM COMPAT_REQUEST WHERE RequestID = ? AND ToUserID = ? AND Status = ?',
      [req.params.requestId, req.user.userId, 'pending']
    );
    if (!cr) return res.status(404).json({ error: 'Request not found or already responded' });

    await db.query(
      `UPDATE COMPAT_REQUEST SET Status = ?, RespondedAt = NOW() WHERE RequestID = ?`,
      [action, cr.RequestID]
    );

    let evalData = null;
    if (action === 'accepted') {
      // Run Ashtakoota for this pair
      const [[existing]] = await db.query(
        `SELECT EvalID FROM COMPATIBILITY_EVAL
         WHERE (EvalUser1ID = ? AND EvalUser2ID = ?) OR (EvalUser1ID = ? AND EvalUser2ID = ?)`,
        [cr.FromUserID, cr.ToUserID, cr.ToUserID, cr.FromUserID]
      );
      if (existing) {
        evalData = { evalId: existing.EvalID, alreadyExists: true };
      } else {
        const boy  = await loadUserForKoota(cr.FromUserID);
        const girl = await loadUserForKoota(cr.ToUserID);
        const { kootas, totalScore, matchQualityLabel } = calculateAshtakoota(boy, girl);

        const [evalResult] = await db.query(
          `INSERT INTO COMPATIBILITY_EVAL (TotalScore, MatchQualityLabel, EvalUser1ID, EvalUser2ID, RequestID)
           VALUES (?, ?, ?, ?, ?)`,
          [totalScore, matchQualityLabel, cr.FromUserID, cr.ToUserID, cr.RequestID]
        );
        const evalId = evalResult.insertId;

        const kootaRows = Object.entries(kootas).map(([type, k]) =>
          [evalId, type, k.max, k.score, k.explanation]
        );
        await db.query(
          'INSERT INTO KOOTA_SCORE (EvalID, KootaType, MaxScore, ScoreValue, ExplanationText) VALUES ?',
          [kootaRows]
        );

        // Notify requester
        await db.query(
          'INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
          [cr.FromUserID, 'request_accepted', JSON.stringify({
            byUserId: req.user.userId, byUsername: req.user.username,
            evalId, totalScore, label: matchQualityLabel,
          })]
        );

        evalData = { evalId, totalScore, matchQualityLabel };
      }
    }

    return res.json({ status: action, eval: evalData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
