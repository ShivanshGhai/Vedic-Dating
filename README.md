# Ashtakoota — Vedic Dating App

Full-stack dating platform powered by Vedic astrology (Ashtakoota / Guna Milan).

## Architecture

```
ashtakoota/
├── backend/          → Node.js + Express + MySQL (deploy to Railway)
│   ├── server.js         Main entry point + Socket.io
│   ├── config/
│   │   ├── db.js         MySQL2 connection pool
│   │   └── schema.sql    Full DB schema (run once on Railway MySQL)
│   ├── routes/
│   │   ├── auth.js       Register / Login / /me
│   │   ├── users.js      Browse profiles, best matches
│   │   ├── social.js     Likes, match creation, Koota auto-calc
│   │   ├── compatRequests.js  Intentional reading request system
│   │   ├── compatibility.js  Eval detail, score history, PDF cert
│   │   ├── chat.js       REST + WebSocket real-time chat
│   │   └── notifications.js  In-app notification feed
│   ├── utils/
│   │   ├── koota.js      Complete 8-Koota engine (pure math)
│   │   ├── astrology.js  Prokerala API + local ephemeris fallback
│   │   ├── pdfCert.js    Guna Milan PDF certificate generator
│   │   └── mailer.js     Email notifications (Nodemailer)
│   └── middleware/
│       └── auth.js       JWT verification
└── frontend/
    └── index.html        Single-file SPA (deploy to Railway Static)
```

## Features

| Feature | Implementation |
|---|---|
| Auth | JWT (7-day tokens), bcrypt passwords |
| Birth chart | Prokerala API → local ephemeris fallback |
| 8 Kootas | Pure-math engine (Varna/Vashya/Tara/Yoni/GrahaMaitri/Gana/Bhakoot/Nadi) |
| Likes + Matches | Mutual-like detection → auto Koota calc |
| Compat requests | Intentional 48h-expiry request system |
| Score history | All past readings per user |
| Best matches | Top 3 by total Guna score |
| PDF certificate | Guna Milan cert via PDFKit |
| Real-time chat | Socket.io WebSocket + REST fallback |
| Notifications | In-app feed + email via Nodemailer |
| Avatars | Multer file upload, served statically |

---

## Step 1: Set up Railway

1. Go to [railway.app](https://railway.app) and create a free account
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

---

## Step 2: Deploy the Backend

```bash
cd ashtakoota/backend
npm install

# Create a new Railway project
railway init

# Add a MySQL database
railway add mysql
```

Railway will give you a `DATABASE_URL`. Get individual credentials:
```bash
railway variables
```

Set all environment variables:
```bash
railway variables set DB_HOST=<mysql_host_from_railway>
railway variables set DB_PORT=3306
railway variables set DB_USER=root
railway variables set DB_PASSWORD=<mysql_password>
railway variables set DB_NAME=railway
railway variables set JWT_SECRET=<generate_64_char_random_string>
railway variables set JWT_EXPIRES_IN=7d
railway variables set PORT=4000

# Optional: Prokerala API (sign up free at https://api.prokerala.com)
railway variables set PROKERALA_CLIENT_ID=<your_id>
railway variables set PROKERALA_CLIENT_SECRET=<your_secret>

# Optional: Gmail email notifications
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=<your_gmail>
railway variables set SMTP_PASS=<gmail_app_password>
railway variables set EMAIL_FROM="Ashtakoota <your_gmail>"

# Frontend URL (set after deploying frontend)
railway variables set FRONTEND_URL=https://your-frontend.up.railway.app
```

Deploy:
```bash
railway up
```

Note your backend URL: `https://your-backend.up.railway.app`

---

## Step 3: Initialise the Database

Connect to Railway MySQL and run the schema:
```bash
# Get connection string
railway connect mysql

# Or use TablePlus / DBeaver with Railway MySQL credentials
# Then run: backend/config/schema.sql
```

This creates all tables and seeds Planet, Rashi, Nakshatra data.

---

## Step 4: Deploy the Frontend

Edit `frontend/index.html` — find this line near the top of the `<script>` block:
```js
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : 'https://your-backend.up.railway.app'; // ← UPDATE THIS
```
Replace with your actual backend Railway URL.

Deploy frontend as a Railway static site:
```bash
cd ashtakoota/frontend
railway init  # new project for frontend
railway up
```

Or simply host on **Netlify** (drag-and-drop `frontend/` folder) — it's free and instant.

---

## Step 5: Update CORS

Once both are deployed, update the backend's FRONTEND_URL:
```bash
railway variables set FRONTEND_URL=https://your-frontend.up.railway.app
```

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env
# Fill in .env with your local MySQL / Railway credentials
npm install
npm run dev    # nodemon, runs on http://localhost:4000

# Frontend — just open index.html in browser
# Or: npx serve frontend/
```

---

## Prokerala API Setup (for accurate birth charts)

1. Go to [api.prokerala.com](https://api.prokerala.com) → Sign up free
2. Create an application → get Client ID + Client Secret
3. Set as Railway env vars (see Step 2)
4. Without these, the app uses a built-in lunar ephemeris (±1° accuracy)

---

## Gmail App Password (for email notifications)

1. Go to your Google Account → Security → 2-Step Verification → App Passwords
2. Create one for "Mail"
3. Use that 16-char password as `SMTP_PASS`

---

## Scoring Reference

| Score | Label |
|---|---|
| 33–36 | Excellent |
| 25–32 | Good |
| 18–24 | Average |
| 0–17  | Poor |

### The 8 Kootas

| Koota | Max | Tests |
|---|---|---|
| Varna | 1 | Spiritual compatibility |
| Vashya | 2 | Mutual attraction |
| Tara | 3 | Destiny / health |
| Yoni | 4 | Physical compatibility |
| Graha Maitri | 5 | Planetary friendship |
| Gana | 6 | Temperament |
| Bhakoot | 7 | Emotional harmony |
| Nadi | 8 | Life energy / progeny |

---

## API Reference

```
POST   /api/auth/register          Register (multipart/form-data with avatar)
POST   /api/auth/login             Login → JWT
GET    /api/auth/me                Current user

GET    /api/users                  Browse users (search/rashi/gana/minScore filters)
GET    /api/users/best-matches     Top 3 by Guna score
GET    /api/users/:id              Single profile + eval + liked status
PATCH  /api/users/me               Update bio / avatar

POST   /api/likes/:targetId        Like a user (auto-matches if mutual)
DELETE /api/likes/:targetId        Unlike
GET    /api/matches/list           My matches with scores

POST   /api/compat-requests/:id    Send reading request (48h expiry)
GET    /api/compat-requests        Incoming pending requests
GET    /api/compat-requests/sent   Sent requests
PATCH  /api/compat-requests/:id    Accept / decline

GET    /api/compatibility/:evalId           Full Koota breakdown
GET    /api/compatibility/:evalId/history   Score history for user
GET    /api/compatibility/:evalId/certificate  PDF download

GET    /api/chat/:matchId/messages  Message history
POST   /api/chat/:matchId/messages  Send (REST fallback)

GET    /api/notifications           Notification feed
PATCH  /api/notifications/read-all  Mark all read

WS     /chat (Socket.io namespace)
  emit: join_match { matchId }
  emit: send_message { matchId, body }
  on:   new_message { ...msg, senderUsername }
```
