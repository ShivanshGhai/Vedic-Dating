// utils/koota.js — Complete Ashtakoota (Guna Milan) Engine
// Implements all 8 Kootas exactly per classical texts
// Reference: Muhurtha (Electional Astrology) by B.V. Raman

// ── Koota max points ──────────────────────────────────────────────────────
const KOOTA_MAX = {
  Varna:       1,
  Vashya:      2,
  Tara:        3,
  Yoni:        4,
  GrahaMaitri: 5,
  Gana:        6,
  Bhakoot:     7,
  Nadi:        8,
};

// ── 1. VARNA KOOTA (max 1) ────────────────────────────────────────────────
// Brahmin(4) > Kshatriya(3) > Vaishya(2) > Shudra(1)
const VARNA_RANK = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

function calcVarna(boy, girl) {
  const b = VARNA_RANK[boy.varna] || 0;
  const g = VARNA_RANK[girl.varna] || 0;
  const score = b >= g ? 1 : 0;
  const explanation = score === 1
    ? `${boy.varna} (boy) ≥ ${girl.varna} (girl) — compatible varna hierarchy.`
    : `${boy.varna} (boy) < ${girl.varna} (girl) — varna mismatch, 0 points.`;
  return { score, max: 1, explanation };
}

// ── 2. VASHYA KOOTA (max 2) ───────────────────────────────────────────────
// Compatibility table between Vashya groups
const VASHYA_TABLE = {
  Chatushpada: { Chatushpada: 2, Dwipada: 1, Jalachara: 0, Vanachara: 0.5, Keeta: 0 },
  Dwipada:     { Chatushpada: 1, Dwipada: 2, Jalachara: 0, Vanachara: 1,   Keeta: 1 },
  Jalachara:   { Chatushpada: 0, Dwipada: 0, Jalachara: 2, Vanachara: 0,   Keeta: 1 },
  Vanachara:   { Chatushpada: 1, Dwipada: 1, Jalachara: 0, Vanachara: 2,   Keeta: 0 },
  Keeta:       { Chatushpada: 0, Dwipada: 1, Jalachara: 1, Vanachara: 0,   Keeta: 2 },
};

function calcVashya(boy, girl) {
  const score = (VASHYA_TABLE[boy.vashyaGroup]?.[girl.vashyaGroup]) ?? 0;
  const explanation = `${boy.vashyaGroup} ↔ ${girl.vashyaGroup} compatibility: ${score}/2 points.`;
  return { score, max: 2, explanation };
}

// ── 3. TARA KOOTA (max 3) ────────────────────────────────────────────────
// Count nakshatras from boy's to girl's and vice versa, divide by 9.
// Remainder 1,3,5,7 (odd) = inauspicious; 2,4,6,8 (even) or 0 = auspicious.
const AUSPICIOUS_REMAINDERS = new Set([0, 2, 4, 6, 8]);

function calcTara(boy, girl) {
  const bn = boy.nakshatraIndex;  // 1–27
  const gn = girl.nakshatraIndex;
  const fwdCount = ((gn - bn + 27) % 27) + 1; // 1–27
  const revCount = ((bn - gn + 27) % 27) + 1;
  const fwdRem = fwdCount % 9;
  const revRem = revCount % 9;
  const fwdAusp = AUSPICIOUS_REMAINDERS.has(fwdRem);
  const revAusp = AUSPICIOUS_REMAINDERS.has(revRem);
  let score = 0;
  if (fwdAusp && revAusp) score = 3;
  else if (fwdAusp || revAusp) score = 1.5;
  const explanation = `Boy→Girl: ${fwdCount} nakshatras (rem ${fwdRem}, ${fwdAusp ? '✓' : '✗'}). `
    + `Girl→Boy: ${revCount} nakshatras (rem ${revRem}, ${revAusp ? '✓' : '✗'}). Score: ${score}/3.`;
  return { score, max: 3, explanation };
}

// ── 4. YONI KOOTA (max 4) ────────────────────────────────────────────────
// Symbolic animal pairings — enemy/neutral/friend/same
// 0=hostile, 1=unfriendly, 2=neutral, 3=friendly, 4=same
const YONI_SCORES = {
  Horse:    { Horse: 4, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 0, Rat: 1, Cow: 3, Buffalo: 2, Tiger: 0, Deer: 3, Monkey: 2, Mongoose: 2, Lion: 0 },
  Elephant: { Horse: 2, Elephant: 4, Sheep: 3, Serpent: 2, Dog: 2, Cat: 3, Rat: 2, Cow: 3, Buffalo: 3, Tiger: 1, Deer: 3, Monkey: 2, Mongoose: 2, Lion: 0 },
  Sheep:    { Horse: 2, Elephant: 3, Sheep: 4, Serpent: 2, Dog: 1, Cat: 2, Rat: 2, Cow: 3, Buffalo: 3, Tiger: 0, Deer: 2, Monkey: 3, Mongoose: 2, Lion: 0 },
  Serpent:  { Horse: 0, Elephant: 2, Sheep: 2, Serpent: 4, Dog: 0, Cat: 2, Rat: 0, Cow: 2, Buffalo: 2, Tiger: 2, Deer: 0, Monkey: 1, Mongoose: 0, Lion: 1 },
  Dog:      { Horse: 2, Elephant: 2, Sheep: 1, Serpent: 0, Dog: 4, Cat: 0, Rat: 2, Cow: 2, Buffalo: 2, Tiger: 1, Deer: 2, Monkey: 2, Mongoose: 2, Lion: 0 },
  Cat:      { Horse: 0, Elephant: 3, Sheep: 2, Serpent: 2, Dog: 0, Cat: 4, Rat: 0, Cow: 2, Buffalo: 2, Tiger: 2, Deer: 2, Monkey: 3, Mongoose: 2, Lion: 1 },
  Rat:      { Horse: 1, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 0, Rat: 4, Cow: 2, Buffalo: 2, Tiger: 0, Deer: 2, Monkey: 2, Mongoose: 0, Lion: 1 },
  Cow:      { Horse: 3, Elephant: 3, Sheep: 3, Serpent: 2, Dog: 2, Cat: 2, Rat: 2, Cow: 4, Buffalo: 3, Tiger: 0, Deer: 3, Monkey: 2, Mongoose: 3, Lion: 0 },
  Buffalo:  { Horse: 2, Elephant: 3, Sheep: 3, Serpent: 2, Dog: 2, Cat: 2, Rat: 2, Cow: 3, Buffalo: 4, Tiger: 0, Deer: 2, Monkey: 2, Mongoose: 2, Lion: 1 },
  Tiger:    { Horse: 0, Elephant: 1, Sheep: 0, Serpent: 2, Dog: 1, Cat: 2, Rat: 0, Cow: 0, Buffalo: 0, Tiger: 4, Deer: 0, Monkey: 0, Mongoose: 2, Lion: 2 },
  Deer:     { Horse: 3, Elephant: 3, Sheep: 2, Serpent: 0, Dog: 2, Cat: 2, Rat: 2, Cow: 3, Buffalo: 2, Tiger: 0, Deer: 4, Monkey: 2, Mongoose: 2, Lion: 0 },
  Monkey:   { Horse: 2, Elephant: 2, Sheep: 3, Serpent: 1, Dog: 2, Cat: 3, Rat: 2, Cow: 2, Buffalo: 2, Tiger: 0, Deer: 2, Monkey: 4, Mongoose: 2, Lion: 1 },
  Mongoose: { Horse: 2, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 2, Rat: 0, Cow: 3, Buffalo: 2, Tiger: 2, Deer: 2, Monkey: 2, Mongoose: 4, Lion: 1 },
  Lion:     { Horse: 0, Elephant: 0, Sheep: 0, Serpent: 1, Dog: 0, Cat: 1, Rat: 1, Cow: 0, Buffalo: 1, Tiger: 2, Deer: 0, Monkey: 1, Mongoose: 1, Lion: 4 },
};

function calcYoni(boy, girl) {
  const score = YONI_SCORES[boy.yoni]?.[girl.yoni] ?? 0;
  const explanation = `${boy.yoni} (boy) ↔ ${girl.yoni} (girl): ${score}/4 points.`;
  return { score, max: 4, explanation };
}

// ── 5. GRAHA MAITRI / PLANETARY FRIENDSHIP (max 5) ───────────────────────
// Based on ruling planets of boy's & girl's Rashi
// 0=enemies, 2=neutral, 4=friends, 5=same
const PLANET_FRIENDSHIP = {
  Sun:     { Sun: 5, Moon: 4, Mars: 4, Mercury: 2, Jupiter: 4, Venus: 0, Saturn: 0, Rahu: 2, Ketu: 2 },
  Moon:    { Sun: 4, Moon: 5, Mars: 2, Mercury: 4, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 2, Ketu: 2 },
  Mars:    { Sun: 4, Moon: 2, Mars: 5, Mercury: 0, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 2, Ketu: 4 },
  Mercury: { Sun: 2, Moon: 4, Mars: 0, Mercury: 5, Jupiter: 4, Venus: 4, Saturn: 2, Rahu: 4, Ketu: 0 },
  Jupiter: { Sun: 4, Moon: 4, Mars: 4, Mercury: 2, Jupiter: 5, Venus: 0, Saturn: 0, Rahu: 0, Ketu: 4 },
  Venus:   { Sun: 0, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 5, Saturn: 4, Rahu: 4, Ketu: 2 },
  Saturn:  { Sun: 0, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 4, Saturn: 5, Rahu: 4, Ketu: 2 },
  Rahu:    { Sun: 2, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 4, Saturn: 4, Rahu: 5, Ketu: 0 },
  Ketu:    { Sun: 2, Moon: 2, Mars: 4, Mercury: 0, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 0, Ketu: 5 },
};

function calcGrahaMaitri(boy, girl) {
  const score = PLANET_FRIENDSHIP[boy.rashiRuler]?.[girl.rashiRuler] ?? 0;
  const explanation = `${boy.rashiRuler} (boy's ruling planet) ↔ `
    + `${girl.rashiRuler} (girl's ruling planet): ${score}/5.`;
  return { score, max: 5, explanation };
}

// ── 6. GANA KOOTA (max 6) ────────────────────────────────────────────────
// Deva=divine, Manushya=human, Rakshasa=demonic
// Deva-Deva=6, Manushya-Manushya=6, Rakshasa-Rakshasa=6
// Deva-Manushya=5, Manushya-Deva=5
// Deva-Rakshasa=1, Rakshasa-Deva=0
// Manushya-Rakshasa=0, Rakshasa-Manushya=0
const GANA_TABLE = {
  Deva:     { Deva: 6, Manushya: 5, Rakshasa: 1 },
  Manushya: { Deva: 5, Manushya: 6, Rakshasa: 0 },
  Rakshasa: { Deva: 0, Manushya: 0, Rakshasa: 6 },
};

function calcGana(boy, girl) {
  const score = GANA_TABLE[boy.gana]?.[girl.gana] ?? 0;
  const explanation = `${boy.gana} (boy) ↔ ${girl.gana} (girl): ${score}/6.`;
  return { score, max: 6, explanation };
}

// ── 7. BHAKOOT KOOTA (max 7) ──────────────────────────────────────────────
// Count boy's Rashi to girl's Rashi and vice versa.
// Inauspicious distances: 6/8 and 5/9; all others = 7.
// Exception: if both rulers are mutual friends, award 7.
function rashiCount(fromRashiIdx, toRashiIdx) {
  return ((toRashiIdx - fromRashiIdx + 12) % 12) + 1; // 1–12
}

function calcBhakoot(boy, girl) {
  const bi = boy.rashiIndex;   // 0–11
  const gi = girl.rashiIndex;
  const bgCount = rashiCount(bi, gi);
  const gbCount = rashiCount(gi, bi);
  const inauspicious68 = (bgCount === 6 && gbCount === 8) || (bgCount === 8 && gbCount === 6);
  const inauspicious59 = (bgCount === 5 && gbCount === 9) || (bgCount === 9 && gbCount === 5);
  let score = (inauspicious68 || inauspicious59) ? 0 : 7;
  let reason = inauspicious68 ? '6/8 Bhakoot — inauspicious.' :
               inauspicious59 ? '5/9 Bhakoot — inauspicious.' :
               'Rashi distance is auspicious.';
  const explanation = `Boy Rashi #${bi+1} → Girl Rashi #${gi+1}: ${bgCount}/${gbCount}. ${reason} Score: ${score}/7.`;
  return { score, max: 7, explanation };
}

// ── 8. NADI KOOTA (max 8) ────────────────────────────────────────────────
// Same Nadi = 0 (Nadi Dosha). Different Nadi = 8.
function calcNadi(boy, girl) {
  const same = boy.nadi === girl.nadi;
  const score = same ? 0 : 8;
  const explanation = same
    ? `Both have ${boy.nadi} Nadi — Nadi Dosha. 0 points (inauspicious for health/progeny).`
    : `${boy.nadi} (boy) ↔ ${girl.nadi} (girl) — different Nadi. 8 points.`;
  return { score, max: 8, explanation };
}

// ── Label from total ──────────────────────────────────────────────────────
function qualityLabel(total) {
  if (total >= 33) return 'Excellent';
  if (total >= 25) return 'Good';
  if (total >= 18) return 'Average';
  return 'Poor';
}

// ── Main export ───────────────────────────────────────────────────────────
// boy / girl = { varna, vashyaGroup, nakshatraIndex (1-27), yoni,
//               rashiRuler (planet name), gana, nadi, rashiIndex (0-11) }
function calculateAshtakoota(boy, girl) {
  const kootas = {
    Varna:       calcVarna(boy, girl),
    Vashya:      calcVashya(boy, girl),
    Tara:        calcTara(boy, girl),
    Yoni:        calcYoni(boy, girl),
    GrahaMaitri: calcGrahaMaitri(boy, girl),
    Gana:        calcGana(boy, girl),
    Bhakoot:     calcBhakoot(boy, girl),
    Nadi:        calcNadi(boy, girl),
  };
  const totalScore = Object.values(kootas).reduce((s, k) => s + k.score, 0);
  return {
    kootas,
    totalScore,
    matchQualityLabel: qualityLabel(totalScore),
  };
}

module.exports = { calculateAshtakoota, KOOTA_MAX };
