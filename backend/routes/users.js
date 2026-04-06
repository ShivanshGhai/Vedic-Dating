// routes/users.js
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const { sanitizeUser } = require('./auth');

const USER_SELECT = `
  SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
         n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler
  FROM USER u
  JOIN RASHI r ON u.RashiID = r.RashiID
  JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
  JOIN PLANET p ON r.PlanetID = p.PlanetID
`;

// ── GET /api/users — browse all users (excluding self) ───────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { search, minScore, rashiFilter, ganaFilter } = req.query;
    let query = USER_SELECT + ' WHERE u.UserID != ?';
    const params = [req.user.userId];

    if (search) {
      query += ' AND (u.Username LIKE ? OR u.BirthLocation LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (rashiFilter) {
      query += ' AND r.RashiName = ?';
      params.push(rashiFilter);
    }
    if (ganaFilter) {
      query += ' AND n.Gana = ?';
      params.push(ganaFilter);
    }
    query += ' ORDER BY u.CreatedAt DESC LIMIT 100';

    const [users] = await db.query(query, params);

    // Attach any existing compatibility evals with the current user
    const userIds = users.map(u => u.UserID);
    let evals = [];
    if (userIds.length) {
      [evals] = await db.query(
        `SELECT * FROM COMPATIBILITY_EVAL
         WHERE (EvalUser1ID = ? AND EvalUser2ID IN (?))
            OR (EvalUser2ID = ? AND EvalUser1ID IN (?))`,
        [req.user.userId, userIds, req.user.userId, userIds]
      );
    }

    const evalMap = {};
    evals.forEach(e => {
      const otherId = e.EvalUser1ID === req.user.userId ? e.EvalUser2ID : e.EvalUser1ID;
      evalMap[otherId] = e;
    });

    // Attach like status
    let likes = [];
    if (userIds.length) {
      [likes] = await db.query(
        'SELECT UserB FROM LIKES WHERE UserA = ? AND UserB IN (?)',
        [req.user.userId, userIds]
      );
    }
    const likedSet = new Set(likes.map(l => l.UserB));

    const result = users.map(u => ({
      ...sanitizeUser(u),
      compatEval: evalMap[u.UserID] ? {
        evalId:     evalMap[u.UserID].EvalID,
        totalScore: evalMap[u.UserID].TotalScore,
        label:      evalMap[u.UserID].MatchQualityLabel,
      } : null,
      liked: likedSet.has(u.UserID),
    }));

    // If minScore filter, apply after eval lookup
    const filtered = minScore
      ? result.filter(u => u.compatEval && u.compatEval.totalScore >= parseInt(minScore))
      : result;

    return res.json({ users: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/best-matches — top 3 compatible profiles ──────────────
router.get('/best-matches', auth, async (req, res) => {
  try {
    const [evals] = await db.query(
      `SELECT ce.*, 
              u1.UserID AS u1id, u2.UserID AS u2id
       FROM COMPATIBILITY_EVAL ce
       JOIN USER u1 ON ce.EvalUser1ID = u1.UserID
       JOIN USER u2 ON ce.EvalUser2ID = u2.UserID
       WHERE ce.EvalUser1ID = ? OR ce.EvalUser2ID = ?
       ORDER BY ce.TotalScore DESC
       LIMIT 3`,
      [req.user.userId, req.user.userId]
    );

    const results = [];
    for (const e of evals) {
      const otherId = e.EvalUser1ID === req.user.userId ? e.EvalUser2ID : e.EvalUser1ID;
      const [[user]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [otherId]);
      if (user) {
        results.push({
          user: sanitizeUser(user),
          evalId:     e.EvalID,
          totalScore: e.TotalScore,
          label:      e.MatchQualityLabel,
        });
      }
    }

    return res.json({ bestMatches: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:id — single profile ──────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const [[user]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [[evalRow]] = await db.query(
      `SELECT * FROM COMPATIBILITY_EVAL
       WHERE (EvalUser1ID = ? AND EvalUser2ID = ?)
          OR (EvalUser1ID = ? AND EvalUser2ID = ?)
       LIMIT 1`,
      [req.user.userId, user.UserID, user.UserID, req.user.userId]
    );
    const [[likeRow]] = await db.query(
      'SELECT 1 FROM LIKES WHERE UserA = ? AND UserB = ?',
      [req.user.userId, user.UserID]
    );

    return res.json({
      user: sanitizeUser(user),
      compatEval: evalRow ? {
        evalId:     evalRow.EvalID,
        totalScore: evalRow.TotalScore,
        label:      evalRow.MatchQualityLabel,
        evaluatedAt: evalRow.EvaluatedAtTimestamp,
      } : null,
      liked: !!likeRow,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/me — update bio / avatar ────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.patch('/me', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { bio } = req.body;
    const updates = {};
    if (bio !== undefined) updates.Bio = bio.slice(0, 300);
    if (req.file) updates.AvatarURL = `/uploads/${req.file.filename}`;
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(`UPDATE USER SET ${setClauses} WHERE UserID = ?`,
      [...Object.values(updates), req.user.userId]);

    return res.json({ updated: updates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
