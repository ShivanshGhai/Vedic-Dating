-- ============================================================
-- ASHTAKOOTA - PART 3 SUBMISSION BOOTSTRAP
-- Run this file from backend/config inside the mysql client:
--   mysql -u <user> -p <database> < submission_setup.sql
-- ============================================================

SOURCE schema.sql;

-- Demo login for all seeded users:
--   password: Part3Demo!
SET @demo_password_hash = '$2b$10$ueksWU.C8Te05yoXYJl9C.swQ.XBe0n8IoFLNu3MwIIlppdqacRqy';

INSERT INTO USER (
  Username, Email, PasswordHash, DateOfBirth, TimeOfBirth, BirthLocation,
  Latitude, Longitude, RashiID, NakshatraID, Bio,
  GenderIdentity, LookingFor, RelationshipIntent, ProfilePrompt,
  AcceptedSafetyAt, EmailVerifiedAt, CreatedAt
) VALUES
('arjun_demo', 'arjun_demo@example.com', @demo_password_hash, '1997-08-13', '08:10:00', 'Mumbai, India', 19.076090, 72.877426, 5, 10, 'Steady, family-minded, and more interested in depth than dopamine.', 'man', 'woman', 'marriage', 'Clear intention, warm communication, and long-term focus.', NOW(), NOW(), '2026-04-01 09:00:00'),
('maya_demo', 'maya_demo@example.com', @demo_password_hash, '1998-03-21', '06:15:00', 'Delhi, India', 28.613939, 77.209023, 1, 1, 'Curious, expressive, and willing to ask the hard questions early.', 'woman', 'man', 'long-term', 'Open-hearted but not casual about commitment.', NOW(), NOW(), '2026-04-01 09:05:00'),
('neel_demo', 'neel_demo@example.com', @demo_password_hash, '1996-11-02', '21:30:00', 'Surrey, Canada', 49.191346, -122.849014, 2, 4, 'Quietly consistent, observant, and serious once trust is built.', 'man', 'woman', 'serious-dating', 'Looking for mutual effort and emotional steadiness.', NOW(), NOW(), '2026-04-01 09:10:00'),
('tara_demo', 'tara_demo@example.com', @demo_password_hash, '1997-10-06', '14:45:00', 'Vancouver, Canada', 49.282729, -123.120738, 7, 14, 'Direct, practical, and allergic to vague intentions.', 'woman', 'man', 'serious-dating', 'Sharp mind, grounded values, and no time for mixed signals.', NOW(), NOW(), '2026-04-01 09:15:00'),
('priya_demo', 'priya_demo@example.com', @demo_password_hash, '1995-12-18', '05:20:00', 'Burnaby, Canada', 49.248809, -122.980507, 8, 17, 'Reflective, loyal, and naturally drawn to depth and ritual.', 'woman', 'man', 'marriage', 'Traditional values, modern standards, steady execution.', NOW(), NOW(), '2026-04-01 09:20:00'),
('kabir_demo', 'kabir_demo@example.com', @demo_password_hash, '1996-07-11', '11:05:00', 'Calgary, Canada', 51.044733, -114.071883, 6, 12, 'Playful but deliberate, with a strong bias toward clarity.', 'man', 'woman', 'exploring', 'Intentional dating, zero ghosting, honest follow-through.', NOW(), NOW(), '2026-04-01 09:25:00');

INSERT INTO LIKES (UserA, UserB, CreatedAt) VALUES
(1, 2, '2026-04-02 10:00:00'),
(2, 1, '2026-04-02 10:05:00'),
(1, 3, '2026-04-02 11:00:00'),
(3, 1, '2026-04-02 11:10:00'),
(1, 4, '2026-04-02 12:00:00'),
(4, 1, '2026-04-02 12:08:00'),
(5, 6, '2026-04-03 10:00:00'),
(6, 5, '2026-04-03 10:12:00'),
(2, 6, '2026-04-03 12:00:00'),
(6, 2, '2026-04-03 12:20:00'),
(3, 5, '2026-04-03 14:00:00'),
(5, 3, '2026-04-03 14:18:00'),
(4, 5, '2026-04-04 09:30:00');

INSERT INTO MATCH_RECORD (MatchCreatedAt) VALUES
('2026-04-02 10:05:00'),
('2026-04-02 11:10:00'),
('2026-04-02 12:08:00'),
('2026-04-03 10:12:00'),
('2026-04-03 12:20:00'),
('2026-04-03 14:18:00');

INSERT INTO INVOLVES (MatchID, UserA, UserB) VALUES
(1, 1, 2),
(2, 1, 3),
(3, 1, 4),
(4, 5, 6),
(5, 2, 6),
(6, 3, 5);

INSERT INTO COMPAT_REQUEST (FromUserID, ToUserID, Status, CreatedAt, ExpiresAt, RespondedAt) VALUES
(6, 4, 'pending', '2026-04-07 15:00:00', '2026-04-09 15:00:00', NULL);

INSERT INTO COMPATIBILITY_EVAL (
  TotalScore, MatchQualityLabel, EvaluatedAtTimestamp, EvalUser1ID, EvalUser2ID, RequestID
) VALUES
(7.0, 'Poor', '2026-04-02 10:06:00', 1, 2, NULL),
(10.5, 'Poor', '2026-04-02 11:11:00', 1, 3, NULL),
(24.5, 'Average', '2026-04-02 12:09:00', 1, 4, NULL),
(26.5, 'Good', '2026-04-03 10:13:00', 5, 6, NULL),
(19.5, 'Average', '2026-04-03 12:21:00', 2, 6, NULL),
(23.5, 'Average', '2026-04-03 14:19:00', 3, 5, NULL);

INSERT INTO KOOTA_SCORE (EvalID, KootaType, MaxScore, ScoreValue, ExplanationText) VALUES
(1, 'Varna', 1, 1, 'Varna rank Kshatriya (3) is greater than or equal to Kshatriya (3), so the pair receives 1/1.'),
(1, 'Vashya', 2, 1, 'Vashya Vanachara vs Vashya Chatushpada: 1/2.'),
(1, 'Tara', 3, 0, 'User 1 remainder 1 (inauspicious) and User 2 remainder 1 (inauspicious) -> 0/3. Neither tara direction is auspicious.'),
(1, 'Yoni', 4, 1, 'Yoni Rat vs Yoni Horse: 1/4.'),
(1, 'GrahaMaitri', 5, 4, 'Sun -> Mars is friend; Mars -> Sun is friend. Score: 4/5.'),
(1, 'Gana', 6, 0, 'Gana Rakshasa vs Gana Deva: 0/6.'),
(1, 'Bhakoot', 7, 0, 'Forward distance 9, reverse distance 5 -> 0/7. 5/9 Bhakoot pairing is inauspicious.'),
(1, 'Nadi', 8, 0, 'Both users have Antya Nadi, so the pair receives 0/8.'),
(2, 'Varna', 1, 1, 'Varna rank Kshatriya (3) is greater than or equal to Vaishya (2), so the pair receives 1/1.'),
(2, 'Vashya', 2, 1, 'Vashya Vanachara vs Vashya Chatushpada: 1/2.'),
(2, 'Tara', 3, 1.5, 'User 1 remainder 4 (auspicious) and User 2 remainder 7 (inauspicious) -> 1.5/3. One tara direction is auspicious.'),
(2, 'Yoni', 4, 0, 'Yoni Rat vs Yoni Serpent: 0/4.'),
(2, 'GrahaMaitri', 5, 0, 'Sun -> Venus is enemy; Venus -> Sun is enemy. Score: 0/5.'),
(2, 'Gana', 6, 0, 'Gana Rakshasa vs Gana Manushya: 0/6.'),
(2, 'Bhakoot', 7, 7, 'Forward distance 10, reverse distance 4 -> 7/7. Forward distance 10 is auspicious.'),
(2, 'Nadi', 8, 0, 'Both users have Antya Nadi, so the pair receives 0/8.'),
(3, 'Varna', 1, 1, 'Varna rank Kshatriya (3) is greater than or equal to Shudra (1), so the pair receives 1/1.'),
(3, 'Vashya', 2, 1, 'Vashya Vanachara vs Vashya Dwipada: 1/2.'),
(3, 'Tara', 3, 1.5, 'User 1 remainder 5 (inauspicious) and User 2 remainder 6 (auspicious) -> 1.5/3. One tara direction is auspicious.'),
(3, 'Yoni', 4, 0, 'Yoni Rat vs Yoni Tiger: 0/4.'),
(3, 'GrahaMaitri', 5, 0, 'Sun -> Venus is enemy; Venus -> Sun is enemy. Score: 0/5.'),
(3, 'Gana', 6, 6, 'Gana Rakshasa vs Gana Rakshasa: 6/6.'),
(3, 'Bhakoot', 7, 7, 'Forward distance 3, reverse distance 11 -> 7/7. Forward distance 3 is auspicious.'),
(3, 'Nadi', 8, 8, 'Nadi values Antya and Madhya differ, so the pair receives 8/8.'),
(4, 'Varna', 1, 1, 'Varna rank Brahmin (4) is greater than or equal to Vaishya (2), so the pair receives 1/1.'),
(4, 'Vashya', 2, 1, 'Vashya Keeta vs Vashya Dwipada: 1/2.'),
(4, 'Tara', 3, 1.5, 'User 1 remainder 5 (inauspicious) and User 2 remainder 6 (auspicious) -> 1.5/3. One tara direction is auspicious.'),
(4, 'Yoni', 4, 3, 'Yoni Deer vs Yoni Cow: 3/4.'),
(4, 'GrahaMaitri', 5, 0, 'Mars -> Mercury is enemy; Mercury -> Mars is enemy. Score: 0/5.'),
(4, 'Gana', 6, 5, 'Gana Deva vs Gana Manushya: 5/6.'),
(4, 'Bhakoot', 7, 7, 'Forward distance 11, reverse distance 3 -> 7/7. Forward distance 11 is auspicious.'),
(4, 'Nadi', 8, 8, 'Nadi values Adi and Madhya differ, so the pair receives 8/8.'),
(5, 'Varna', 1, 1, 'Varna rank Kshatriya (3) is greater than or equal to Vaishya (2), so the pair receives 1/1.'),
(5, 'Vashya', 2, 1, 'Vashya Chatushpada vs Vashya Dwipada: 1/2.'),
(5, 'Tara', 3, 1.5, 'User 1 remainder 3 (inauspicious) and User 2 remainder 8 (auspicious) -> 1.5/3. One tara direction is auspicious.'),
(5, 'Yoni', 4, 3, 'Yoni Horse vs Yoni Cow: 3/4.'),
(5, 'GrahaMaitri', 5, 0, 'Mars -> Mercury is enemy; Mercury -> Mars is enemy. Score: 0/5.'),
(5, 'Gana', 6, 5, 'Gana Deva vs Gana Manushya: 5/6.'),
(5, 'Bhakoot', 7, 0, 'Forward distance 6, reverse distance 8 -> 0/7. 6/8 Bhakoot pairing is inauspicious.'),
(5, 'Nadi', 8, 8, 'Nadi values Antya and Madhya differ, so the pair receives 8/8.'),
(6, 'Varna', 1, 0, 'Varna rank Vaishya (2) is lower than Brahmin (4), so the pair receives 0/1.'),
(6, 'Vashya', 2, 0, 'Vashya Chatushpada vs Vashya Keeta: 0/2.'),
(6, 'Tara', 3, 1.5, 'User 1 remainder 5 (inauspicious) and User 2 remainder 6 (auspicious) -> 1.5/3. One tara direction is auspicious.'),
(6, 'Yoni', 4, 0, 'Yoni Serpent vs Yoni Deer: 0/4.'),
(6, 'GrahaMaitri', 5, 2, 'Venus -> Mars is neutral; Mars -> Venus is neutral. Score: 2/5.'),
(6, 'Gana', 6, 5, 'Gana Manushya vs Gana Deva: 5/6.'),
(6, 'Bhakoot', 7, 7, 'Forward distance 7, reverse distance 7 -> 7/7. Forward distance 7 is auspicious.'),
(6, 'Nadi', 8, 8, 'Nadi values Antya and Adi differ, so the pair receives 8/8.');

INSERT INTO MESSAGES (MatchID, SenderID, Body, SentAt, ReadAt) VALUES
(1, 1, 'You stood out because you sound grounded and serious in a way that feels rare here.', '2026-04-02 10:30:00', '2026-04-02 10:41:00'),
(1, 2, 'That is probably the nicest first message I have seen on a dating app in a while.', '2026-04-02 10:41:00', '2026-04-02 10:45:00'),
(1, 1, 'I would rather ask one honest question well than spend a week pretending to be casual.', '2026-04-02 10:45:00', NULL),
(3, 1, 'Your profile reads like someone who values clarity, which I respect immediately.', '2026-04-02 12:25:00', '2026-04-02 12:50:00'),
(3, 4, 'That already puts you ahead of most people here.', '2026-04-02 12:50:00', NULL),
(4, 5, 'The score is good, but your prompt matters more than the number to me.', '2026-04-03 10:22:00', NULL);

INSERT INTO NOTIFICATIONS (UserID, Type, Payload, IsRead, CreatedAt) VALUES
(1, 'match', JSON_OBJECT('matchId', 1, 'evalId', 1, 'withUserId', 2, 'score', 7, 'label', 'Poor'), 0, '2026-04-02 10:06:00'),
(2, 'match', JSON_OBJECT('matchId', 1, 'evalId', 1, 'withUserId', 1, 'score', 7, 'label', 'Poor'), 1, '2026-04-02 10:06:00'),
(1, 'message', JSON_OBJECT('matchId', 1, 'fromUserId', 2, 'fromUsername', 'maya_demo'), 0, '2026-04-02 10:41:00'),
(2, 'message', JSON_OBJECT('matchId', 1, 'fromUserId', 1, 'fromUsername', 'arjun_demo'), 1, '2026-04-02 10:45:00'),
(1, 'match', JSON_OBJECT('matchId', 2, 'evalId', 2, 'withUserId', 3, 'score', 10.5, 'label', 'Poor'), 0, '2026-04-02 11:11:00'),
(1, 'match', JSON_OBJECT('matchId', 3, 'evalId', 3, 'withUserId', 4, 'score', 24.5, 'label', 'Average'), 0, '2026-04-02 12:09:00'),
(4, 'message', JSON_OBJECT('matchId', 3, 'fromUserId', 1, 'fromUsername', 'arjun_demo'), 0, '2026-04-02 12:25:00'),
(4, 'compat_request', JSON_OBJECT('fromUserId', 6, 'fromUsername', 'kabir_demo'), 0, '2026-04-07 15:00:00'),
(5, 'match', JSON_OBJECT('matchId', 4, 'evalId', 4, 'withUserId', 6, 'score', 26.5, 'label', 'Good'), 1, '2026-04-03 10:13:00'),
(6, 'match', JSON_OBJECT('matchId', 4, 'evalId', 4, 'withUserId', 5, 'score', 26.5, 'label', 'Good'), 0, '2026-04-03 10:13:00'),
(6, 'match', JSON_OBJECT('matchId', 5, 'evalId', 5, 'withUserId', 2, 'score', 19.5, 'label', 'Average'), 0, '2026-04-03 12:21:00'),
(3, 'match', JSON_OBJECT('matchId', 6, 'evalId', 6, 'withUserId', 5, 'score', 23.5, 'label', 'Average'), 0, '2026-04-03 14:19:00');
