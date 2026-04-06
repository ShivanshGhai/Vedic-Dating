// utils/astrology.js
// Derives Moon Rashi + Nakshatra from birth date/time/location
// Uses Prokerala API (free tier: https://api.prokerala.com)
// Falls back to pure-math ephemeris if API is unavailable

const axios = require('axios');

// ── Prokerala OAuth token cache ───────────────────────────────────────────
let _token = null;
let _tokenExpiry = 0;

async function getProkeralaToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const resp = await axios.post('https://api.prokerala.com/token', new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     process.env.PROKERALA_CLIENT_ID,
    client_secret: process.env.PROKERALA_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  _token = resp.data.access_token;
  _tokenExpiry = Date.now() + (resp.data.expires_in - 60) * 1000;
  return _token;
}

// ── Nakshatra name → DB name mapping ─────────────────────────────────────
const NAKSHATRA_NAMES = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta',
  'Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati',
];

const RASHI_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// ── Pure-math fallback (Swiss Ephemeris approximation) ───────────────────
// Good to ~1° accuracy for dates 1900–2100
function moonLongitudeFallback(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  // Julian Day Number
  const A = Math.floor((14 - m) / 12);
  const Y = y + 4800 - A;
  const M = m + 12 * A - 3;
  const JDN = d + Math.floor((153 * M + 2) / 5) + 365 * Y +
    Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045;
  const JD = JDN + (h - 12) / 24 + mi / 1440;
  // Moon's mean longitude (degrees)
  const T = (JD - 2451545.0) / 36525;
  let L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  // Mean anomaly of the moon
  const M_ = 134.9633964 + 477198.8675055 * T;
  // Mean anomaly of the sun
  const Ms = 357.5291092 + 35999.0502909 * T;
  // Moon's argument of latitude
  const F = 93.2720950 + 483202.0175233 * T;
  // Moon's mean elongation
  const D = 297.8501921 + 445267.1114034 * T;
  // Main corrections (simplified – largest terms only)
  const toRad = Math.PI / 180;
  L += 6.288774 * Math.sin(M_ * toRad)
    + 1.274027 * Math.sin((2 * D - M_) * toRad)
    + 0.658314 * Math.sin(2 * D * toRad)
    + 0.213618 * Math.sin(2 * M_ * toRad)
    - 0.185116 * Math.sin(Ms * toRad)
    - 0.114332 * Math.sin(2 * F * toRad);
  // Reduce to 0–360
  L = ((L % 360) + 360) % 360;
  // Subtract ayanamsha (Lahiri, approx 23.85° in J2000)
  const ayanamsha = 23.85 + (T * 0.013611);
  let siderealL = ((L - ayanamsha) % 360 + 360) % 360;
  return siderealL;
}

// ── Main export ───────────────────────────────────────────────────────────
async function getBirthChart(dateStr, timeStr, lat, lng) {
  // Try Prokerala first if credentials exist
  if (process.env.PROKERALA_CLIENT_ID && process.env.PROKERALA_CLIENT_SECRET
      && process.env.PROKERALA_CLIENT_ID !== 'your_client_id') {
    try {
      const token = await getProkeralaToken();
      const datetime = `${dateStr}T${timeStr}:00+05:30`; // IST default; use real tz in prod
      const resp = await axios.get('https://api.prokerala.com/v2/astrology/kundli', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          ayanamsa:   1, // Lahiri
          coordinates: `${lat},${lng}`,
          datetime,
          la: 'en',
        },
      });
      const chart = resp.data.data;
      // Prokerala returns planet positions — extract Moon
      const moon = chart.planet_position.find(p => p.name === 'Moon');
      const rashiIdx  = moon.rasi.id - 1;    // 1-indexed → 0-indexed
      const nakshatraIdx = moon.nakshatra.id - 1;
      return {
        rashiName:     RASHI_NAMES[rashiIdx],
        nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
        source: 'prokerala',
      };
    } catch (err) {
      console.warn('Prokerala API failed, falling back to local calc:', err.message);
    }
  }

  // Fallback: pure-math ephemeris
  const siderealL = moonLongitudeFallback(dateStr, timeStr);
  const rashiIdx      = Math.floor(siderealL / 30);        // 0–11
  const nakshatraIdx  = Math.floor(siderealL / (360 / 27)); // 0–26
  return {
    rashiName:     RASHI_NAMES[rashiIdx],
    nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
    source: 'local_ephemeris',
  };
}

module.exports = { getBirthChart };
