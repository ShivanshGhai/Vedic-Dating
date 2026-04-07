// routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { getBirthChart } = require('../utils/astrology');
const mailer  = require('../utils/mailer');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const {
  ageFromDate,
  authCookieOptions,
  cityRegion,
  normalizeAvatar,
  normalizeEmail,
  normalizePlainText,
  normalizeUsername,
  parseCoords,
  stripHtml,
  validateBirthLocation,
  validateEmail,
  validateUsername,
} = require('../utils/security');
const { rateLimit } = require('../middleware/rateLimit');
const allowedProfileEnums = {
  genderIdentity: new Set(['man', 'woman', 'non-binary', 'prefer-not-to-say']),
  lookingFor: new Set(['man', 'woman', 'everyone']),
  relationshipIntent: new Set(['marriage', 'long-term', 'serious-dating', 'exploring']),
};

// ── Avatar upload config ─────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});
const MAX_PROFILE_PHOTOS = 6;
const MIN_PROFILE_PHOTOS = 4;

function cleanupUploadedFiles(files = []) {
  for (const file of files) {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {}
  }
}

function makeToken(user) {
  return jwt.sign(
    { userId: user.UserID, username: user.Username, email: user.Email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function setAuthCookie(res, token) {
  const options = authCookieOptions();
  const cookie = [
    `ashta_token=${encodeURIComponent(token)}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
    'HttpOnly',
  ];
  if (options.secure) cookie.push('Secure');
  res.append('Set-Cookie', cookie.join('; '));
}

function clearAuthCookie(res) {
  const options = authCookieOptions();
  const cookie = [
    'ashta_token=',
    'Max-Age=0',
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
    'HttpOnly',
  ];
  if (options.secure) cookie.push('Secure');
  res.append('Set-Cookie', cookie.join('; '));
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function fireAndForget(label, work) {
  Promise.resolve()
    .then(work)
    .catch(err => console.warn(`${label} failed:`, err.message));
}

async function getUserPhotos(userId) {
  const [rows] = await db.query(
    `SELECT PhotoURL, SortOrder, IsPrimaryPhoto
     FROM USER_PHOTO
     WHERE UserID = ?
     ORDER BY IsPrimaryPhoto DESC, SortOrder ASC, PhotoID ASC`,
    [userId]
  );
  return rows.map(row => ({
    url: row.PhotoURL,
    sortOrder: row.SortOrder,
    isPrimary: !!row.IsPrimaryPhoto,
  }));
}

async function withPhotos(user, options = {}) {
  const base = sanitizeUser(user, options);
  const photos = await getUserPhotos(user.UserID);
  return {
    ...base,
    photos,
    photoCount: photos.length,
  };
}

async function issueVerificationForUser(userId, email, username) {
  const token = randomToken();
  const tokenHash = hashToken(token);
  await db.query(
    `UPDATE USER
     SET EmailVerifyTokenHash = ?, EmailVerifyExpiresAt = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE UserID = ?`,
    [tokenHash, userId]
  );
  await mailer.sendVerificationEmail(
    email,
    username,
    `${frontendUrl()}/?verify=${encodeURIComponent(token)}`
  );
}

async function issuePasswordResetForUser(userId, email, username) {
  const token = randomToken();
  const tokenHash = hashToken(token);
  await db.query(
    `UPDATE USER
     SET PasswordResetTokenHash = ?, PasswordResetExpiresAt = DATE_ADD(NOW(), INTERVAL 1 HOUR)
     WHERE UserID = ?`,
    [tokenHash, userId]
  );
  await mailer.sendPasswordResetEmail(
    email,
    username,
    `${frontendUrl()}/?reset=${encodeURIComponent(token)}`
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  scope: 'register',
  message: 'Too many registration attempts. Please try again later.',
}), upload.array('photos', MAX_PROFILE_PHOTOS), async (req, res) => {
  try {
    const { password, dateOfBirth, timeOfBirth } = req.body;
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const birthLocation = normalizePlainText(stripHtml(req.body.birthLocation || ''), 150);
    const bio = normalizePlainText(stripHtml(req.body.bio || ''), 300);
    const profilePrompt = normalizePlainText(stripHtml(req.body.profilePrompt || ''), 160);
    const genderIdentity = normalizePlainText(req.body.genderIdentity || '', 30).toLowerCase();
    const lookingFor = normalizePlainText(req.body.lookingFor || '', 30).toLowerCase();
    const relationshipIntent = normalizePlainText(req.body.relationshipIntent || '', 30).toLowerCase();
    const safetyConsent = String(req.body.safetyConsent || '').toLowerCase() === 'true';
    const uploadedPhotos = Array.isArray(req.files) ? req.files : [];

    // Basic validation
    if (!username || !email || !password || !dateOfBirth || !timeOfBirth || !birthLocation || !genderIdentity || !lookingFor || !relationshipIntent) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Username, email, password, birth details, gender identity, who you want to meet, and relationship intent are required' });
    }
    if (password.length < 8) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!validateUsername(username)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Username must be 2-30 chars and use only letters, numbers, spaces, dots, underscores, or hyphens' });
    }
    if (!validateEmail(email)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!validateBirthLocation(birthLocation)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Birth location is required' });
    }
    if (!allowedProfileEnums.genderIdentity.has(genderIdentity)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Select a valid gender identity' });
    }
    if (!allowedProfileEnums.lookingFor.has(lookingFor)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Select who you want to meet' });
    }
    if (!allowedProfileEnums.relationshipIntent.has(relationshipIntent)) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Select your relationship intent' });
    }
    if (!safetyConsent) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'You must confirm you are 20+ and agree to respectful conduct' });
    }
    if (uploadedPhotos.length < MIN_PROFILE_PHOTOS) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: `Add at least ${MIN_PROFILE_PHOTOS} profile photos` });
    }

    const age = ageFromDate(dateOfBirth);
    if (!age || age < 20) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'You must be at least 20 years old to join' });
    }

    const coords = parseCoords(req.body.latitude, req.body.longitude);
    if (!coords) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(400).json({ error: 'Please select a valid birth city from the dropdown results' });
    }

    // Check uniqueness
    const [existing] = await db.query(
      'SELECT UserID FROM USER WHERE Username = ? OR Email = ?', [username, email]
    );
    if (existing.length) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    // Derive Moon Rashi + Nakshatra from birth details
    const chart = await getBirthChart(dateOfBirth, timeOfBirth, coords.latitude, coords.longitude);

    // Look up RashiID and NakshatraID
    const [[rashi]]     = await db.query('SELECT RashiID FROM RASHI WHERE RashiName = ?',     [chart.rashiName]);
    const [[nakshatra]] = await db.query('SELECT NakshatraID FROM NAKSHATRA WHERE NakshatraName = ?', [chart.nakshatraName]);

    if (!rashi || !nakshatra) {
      cleanupUploadedFiles(uploadedPhotos);
      return res.status(500).json({ error: `Could not map birth chart: Rashi=${chart.rashiName}, Nakshatra=${chart.nakshatraName}` });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let avatarURL = null;
    const photoRows = [];
    for (let i = 0; i < uploadedPhotos.length; i += 1) {
      const file = uploadedPhotos[i];
      const normalized = await normalizeAvatar(file.path);
      const finalName = `${path.basename(file.filename, path.extname(file.filename))}${normalized.extension}`;
      const finalPath = path.join(uploadDir, finalName);
      fs.renameSync(normalized.outputPath, finalPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const photoURL = `/uploads/${finalName}`;
      if (!avatarURL) avatarURL = photoURL;
      photoRows.push([photoURL, i, i === 0 ? 1 : 0]);
    }

    const [result] = await db.query(
      `INSERT INTO USER (Username, Email, PasswordHash, DateOfBirth, TimeOfBirth,
        BirthLocation, Latitude, Longitude, RashiID, NakshatraID, AvatarURL, Bio,
        GenderIdentity, LookingFor, RelationshipIntent, ProfilePrompt, AcceptedSafetyAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [username, email, passwordHash, dateOfBirth, timeOfBirth,
       birthLocation, coords.latitude, coords.longitude, rashi.RashiID, nakshatra.NakshatraID, avatarURL, bio || null,
       genderIdentity, lookingFor, relationshipIntent, profilePrompt || null]
    );

    if (photoRows.length) {
      await db.query(
        `INSERT INTO USER_PHOTO (UserID, PhotoURL, SortOrder, IsPrimaryPhoto)
         VALUES ${photoRows.map(() => '(?, ?, ?, ?)').join(', ')}`,
        photoRows.flatMap(([photoURL, sortOrder, isPrimary]) => [result.insertId, photoURL, sortOrder, isPrimary])
      );
    }

    const [[user]] = await db.query(
      `SELECT u.*, r.RashiName, n.NakshatraName, n.Gana, n.Nadi, n.Yoni,
              r.Varna, r.VashyaGroup, p.PlanetName AS RashiRuler
       FROM USER u
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       JOIN PLANET p ON r.PlanetID = p.PlanetID
       WHERE u.UserID = ?`, [result.insertId]
    );

    let verificationEmailSent = true;
    try {
      await issueVerificationForUser(user.UserID, user.Email, user.Username);
    } catch (err) {
      verificationEmailSent = false;
      console.warn('verification email failed:', err.message);
    }

    const token = makeToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({
      token,
      user: await withPhotos(user),
      chart: { ...chart, rashiName: user.RashiName, nakshatraName: user.NakshatraName },
      verificationEmailSent,
    });
  } catch (err) {
    cleanupUploadedFiles(req.files);
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  scope: 'login',
  message: 'Too many login attempts. Please try again later.',
}), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [[user]] = await db.query(
      `SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
              n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler,
              r.RashiID AS RashiIndex
       FROM USER u
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       JOIN PLANET p ON r.PlanetID = p.PlanetID
       WHERE u.Email = ?`, [email]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = makeToken(user);
    setAuthCookie(res, token);
    return res.json({ token, user: await withPhotos(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.post('/resend-verification', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  scope: 'resend-verification',
  message: 'Too many verification email requests. Please try again later.',
}), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Email required' });
    const [[user]] = await db.query('SELECT UserID, Email, Username, EmailVerifiedAt FROM USER WHERE Email = ?', [email]);
    if (!user) return res.json({ ok: true });
    if (!user.EmailVerifiedAt) {
      await issueVerificationForUser(user.UserID, user.Email, user.Username);
      return res.json({ ok: true, sent: true });
    }
    return res.json({ ok: true, sent: false, alreadyVerified: true });
  } catch (err) {
    return res.status(502).json({ error: `Verification email could not be sent: ${err.message}` });
  }
});

router.post('/verify-email', async (req, res) => {
  const token = String(req.body.token || '');
  if (!token) return res.status(400).json({ error: 'Verification token required' });
  const tokenHash = hashToken(token);
  const [[user]] = await db.query(
    `SELECT UserID FROM USER
     WHERE EmailVerifyTokenHash = ? AND EmailVerifyExpiresAt > NOW()`,
    [tokenHash]
  );
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
  await db.query(
    `UPDATE USER
     SET EmailVerifiedAt = NOW(), EmailVerifyTokenHash = NULL, EmailVerifyExpiresAt = NULL
     WHERE UserID = ?`,
    [user.UserID]
  );
  return res.json({ verified: true });
});

router.post('/forgot-password', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  scope: 'forgot-password',
  message: 'Too many password reset requests. Please try again later.',
}), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'Email required' });
  const [[user]] = await db.query('SELECT UserID, Email, Username FROM USER WHERE Email = ?', [email]);
  if (user) {
    fireAndForget('password reset email', () => issuePasswordResetForUser(user.UserID, user.Email, user.Username));
  }
  return res.json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const tokenHash = hashToken(token);
  const [[user]] = await db.query(
    `SELECT UserID FROM USER
     WHERE PasswordResetTokenHash = ? AND PasswordResetExpiresAt > NOW()`,
    [tokenHash]
  );
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `UPDATE USER
     SET PasswordHash = ?, PasswordResetTokenHash = NULL, PasswordResetExpiresAt = NULL
     WHERE UserID = ?`,
    [passwordHash, user.UserID]
  );
  return res.json({ reset: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
const requireAuth = require('../middleware/auth');
router.get('/me', requireAuth, async (req, res) => {
  const [[user]] = await db.query(
    `SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
            n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler
     FROM USER u
     JOIN RASHI r ON u.RashiID = r.RashiID
     JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
     JOIN PLANET p ON r.PlanetID = p.PlanetID
     WHERE u.UserID = ?`, [req.user.userId]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: await withPhotos(user) });
});

function sanitizeUser(u, options = {}) {
  const includePrivate = options.includePrivate !== false;
  const age = ageFromDate(u.DateOfBirth);
  const adminEmails = new Set(
    String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  );
  const base = {
    id:            u.UserID,
    username:      u.Username,
    rashi:         u.RashiName,
    nakshatra:     u.NakshatraName,
    gana:          u.Gana,
    nadi:          u.Nadi,
    yoni:          u.Yoni,
    varna:         u.Varna,
    vashyaGroup:   u.VashyaGroup,
    rashiRuler:    u.RashiRuler,
    nakshatraIndex: u.Index1to27,
    rashiIndex:    u.RashiID - 1,  // 0-indexed for Koota engine
    avatarURL:     u.AvatarURL,
    bio:           u.Bio,
    profilePrompt: u.ProfilePrompt,
    genderIdentity: u.GenderIdentity,
    lookingFor: u.LookingFor,
    relationshipIntent: u.RelationshipIntent,
    emailVerified: !!u.EmailVerifiedAt,
    isAdmin: adminEmails.has(String(u.Email || '').toLowerCase()),
    createdAt:     u.CreatedAt,
    age,
    cityRegion:    cityRegion(u.BirthLocation),
  };

  if (includePrivate) {
    return {
      ...base,
      email:         u.Email,
      dateOfBirth:   u.DateOfBirth,
      timeOfBirth:   u.TimeOfBirth,
      birthLocation: u.BirthLocation,
      latitude:      u.Latitude,
      longitude:     u.Longitude,
    };
  }

  return {
    ...base,
    birthLocation: cityRegion(u.BirthLocation),
  };
}

module.exports = router;
module.exports.sanitizeUser = sanitizeUser;
module.exports.getUserPhotos = getUserPhotos;
module.exports.withPhotos = withPhotos;
