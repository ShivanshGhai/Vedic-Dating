// routes/social.js — Likes, Matches, Compatibility Requests
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const { calculateAshtakoota } = require('../utils/koota');
const mailer = require('../utils/mailer');

// Helper: load full user data for Koota engine
async function loadUserForKoota(userId) {
  const [[u]] = await db.query(
    `SELECT u.UserID, u.Email, u.Username,
            r.RashiName, r.Varna, r.VashyaGroup, r.RashiID,
            n.NakshatraName, n.Index1to27, n.Gana, n.Nadi, n.Yoni,
            p.PlanetName AS RashiRuler
     FROM USER u
     JOIN RASHI r ON u.RashiID = r.RashiID
     JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
     JOIN PLANET p ON r.PlanetID = p.PlanetID
     WHERE u.UserID = ?`, [userId]
  );
  if (!u) throw new Error('User not found: ' + userId);
  return {
    userId:        u.UserID,
    email:         u.Email,
    username:      u.Username,
    varna:         u.Varna,
    vashyaGroup:   u.VashyaGroup,
    nakshatraIndex: u.Index1to27,
    yoni:          u.Yoni,
    rashiRuler:    u.RashiRuler,
    gana:          u.Gana,
    nadi:          u.Nadi,
    rashiIndex:    u.RashiID - 1,
  };
}

// Helper: create notification
async function notify(userId, type, payload) {
  await db.query(
    'INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
    [userId, type, JSON.stringify(payload)]
  );
}

// ── POST /api/likes/:targetId ─────────────────────────────────────────────
router.post('/:targetId', auth, async (req, res) => {
  try {
    const myId     = req.user.userId;
    const targetId = parseInt(req.params.targetId);
    if (myId === targetId) return res.status(400).json({ error: 'Cannot like yourself' });

    // Insert or ignore (already liked)
    await db.query(
      'INSERT IGNORE INTO LIKES (UserA, UserB) VALUES (?, ?)', [myId, targetId]
    );

    // Notify target
    await notify(targetId, 'like', { fromUserId: myId, fromUsername: req.user.username });

    // Send email notification (non-blocking)
    try {
      const [[target]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [targetId]);
      if (target) {
        mailer.sendLikeNotification(target.Email, target.Username, req.user.username).catch(() => {});
      }
    } catch {}

    // Check for mutual like → create match + run Koota
    const [[mutual]] = await db.query(
      'SELECT 1 FROM LIKES WHERE UserA = ? AND UserB = ?', [targetId, myId]
    );

    let matchData = null;
    if (mutual) {
      // Check if match already exists
      const [[existingInvolve]] = await db.query(
        `SELECT i.MatchID FROM INVOLVES i
         WHERE (i.UserA = ? AND i.UserB = ?) OR (i.UserA = ? AND i.UserB = ?)`,
        [myId, targetId, targetId, myId]
      );

      if (!existingInvolve) {
        // Create match record
        const [matchResult] = await db.query('INSERT INTO MATCH_RECORD () VALUES ()');
        const matchId = matchResult.insertId;
        await db.query('INSERT INTO INVOLVES (MatchID, UserA, UserB) VALUES (?, ?, ?)',
          [matchId, myId, targetId]);

        // Run Ashtakoota
        const boy  = await loadUserForKoota(myId);
        const girl = await loadUserForKoota(targetId);
        const { kootas, totalScore, matchQualityLabel } = calculateAshtakoota(boy, girl);

        const [evalResult] = await db.query(
          `INSERT INTO COMPATIBILITY_EVAL (TotalScore, MatchQualityLabel, EvalUser1ID, EvalUser2ID)
           VALUES (?, ?, ?, ?)`,
          [totalScore, matchQualityLabel, myId, targetId]
        );
        const evalId = evalResult.insertId;

        // Insert all 8 Koota scores
        const kootaRows = Object.entries(kootas).map(([type, k]) =>
          [evalId, type, k.max, k.score, k.explanation]
        );
        await db.query(
          'INSERT INTO KOOTA_SCORE (EvalID, KootaType, MaxScore, ScoreValue, ExplanationText) VALUES ?',
          [kootaRows]
        );

        // Notifications for both
        await notify(myId,     'match', { matchId, withUserId: targetId, score: totalScore, label: matchQualityLabel });
        await notify(targetId, 'match', { matchId, withUserId: myId,     score: totalScore, label: matchQualityLabel });

        // Emails
        try {
          const [[u1]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [myId]);
          const [[u2]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [targetId]);
          if (u1 && u2) {
            mailer.sendMatchNotification(u1.Email, u1.Username, u2.Username, totalScore).catch(() => {});
            mailer.sendMatchNotification(u2.Email, u2.Username, u1.Username, totalScore).catch(() => {});
          }
        } catch {}

        matchData = { matchId, evalId, totalScore, matchQualityLabel };
      }
    }

    return res.json({ liked: true, match: matchData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/likes/:targetId — unlike ─────────────────────────────────
router.delete('/:targetId', auth, async (req, res) => {
  await db.query('DELETE FROM LIKES WHERE UserA = ? AND UserB = ?',
    [req.user.userId, req.params.targetId]);
  return res.json({ unliked: true });
});

// ── GET /api/matches — all my matches ────────────────────────────────────
router.get('/matches/list', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mr.MatchID, mr.MatchCreatedAt,
              inv.UserA, inv.UserB,
              ce.EvalID, ce.TotalScore, ce.MatchQualityLabel, ce.EvaluatedAtTimestamp,
              u.UserID AS OtherID, u.Username AS OtherUsername,
              u.AvatarURL AS OtherAvatar,
              r.RashiName AS OtherRashi, n.NakshatraName AS OtherNakshatra
       FROM INVOLVES inv
       JOIN MATCH_RECORD mr ON inv.MatchID = mr.MatchID
       JOIN COMPATIBILITY_EVAL ce ON (ce.EvalUser1ID = inv.UserA AND ce.EvalUser2ID = inv.UserB)
                                  OR (ce.EvalUser1ID = inv.UserB AND ce.EvalUser2ID = inv.UserA)
       JOIN USER u ON u.UserID = CASE WHEN inv.UserA = ? THEN inv.UserB ELSE inv.UserA END
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       WHERE inv.UserA = ? OR inv.UserB = ?
       ORDER BY mr.MatchCreatedAt DESC`,
      [req.user.userId, req.user.userId, req.user.userId]
    );
    return res.json({ matches: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
