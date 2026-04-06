-- ============================================================
-- ASHTAKOOTA — Full Production Schema
-- Run once on Railway MySQL to initialise all tables
-- ============================================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS NOTIFICATIONS;
DROP TABLE IF EXISTS MESSAGES;
DROP TABLE IF EXISTS KOOTA_SCORE;
DROP TABLE IF EXISTS COMPATIBILITY_EVAL;
DROP TABLE IF EXISTS COMPAT_REQUEST;
DROP TABLE IF EXISTS INVOLVES;
DROP TABLE IF EXISTS LIKES;
DROP TABLE IF EXISTS MATCH_RECORD;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS NAKSHATRA;
DROP TABLE IF EXISTS RASHI;
DROP TABLE IF EXISTS PLANET;

-- ── 1. PLANET ─────────────────────────────────────────────────────────────
CREATE TABLE PLANET (
    PlanetID   INT          NOT NULL AUTO_INCREMENT,
    PlanetName VARCHAR(50)  NOT NULL UNIQUE,
    PRIMARY KEY (PlanetID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. RASHI ──────────────────────────────────────────────────────────────
CREATE TABLE RASHI (
    RashiID      INT          NOT NULL AUTO_INCREMENT,
    RashiName    VARCHAR(50)  NOT NULL UNIQUE,
    Varna        VARCHAR(20)  NOT NULL,
    VashyaGroup  VARCHAR(20)  NOT NULL,
    PlanetID     INT          NOT NULL,
    PRIMARY KEY (RashiID),
    CONSTRAINT fk_rashi_planet FOREIGN KEY (PlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. NAKSHATRA ──────────────────────────────────────────────────────────
CREATE TABLE NAKSHATRA (
    NakshatraID   INT          NOT NULL AUTO_INCREMENT,
    NakshatraName VARCHAR(60)  NOT NULL UNIQUE,
    Index1to27    INT          NOT NULL,
    Gana          VARCHAR(20)  NOT NULL,
    Nadi          VARCHAR(20)  NOT NULL,
    Yoni          VARCHAR(30)  NOT NULL,
    PRIMARY KEY (NakshatraID),
    CONSTRAINT uq_nakshatra_index UNIQUE (Index1to27)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. USER ───────────────────────────────────────────────────────────────
CREATE TABLE USER (
    UserID        INT           NOT NULL AUTO_INCREMENT,
    Username      VARCHAR(50)   NOT NULL UNIQUE,
    Email         VARCHAR(100)  NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255)  NOT NULL,
    DateOfBirth   DATE          NOT NULL,
    TimeOfBirth   TIME          NOT NULL,
    BirthLocation VARCHAR(150)  NOT NULL,
    Latitude      DECIMAL(9,6),
    Longitude     DECIMAL(9,6),
    RashiID       INT           NOT NULL,
    NakshatraID   INT           NOT NULL,
    AvatarURL     VARCHAR(500),
    Bio           VARCHAR(300),
    CreatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserID),
    CONSTRAINT fk_user_rashi     FOREIGN KEY (RashiID)     REFERENCES RASHI(RashiID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_user_nakshatra FOREIGN KEY (NakshatraID) REFERENCES NAKSHATRA(NakshatraID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. MATCH_RECORD ───────────────────────────────────────────────────────
CREATE TABLE MATCH_RECORD (
    MatchID        INT      NOT NULL AUTO_INCREMENT,
    MatchCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MatchID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. LIKES ──────────────────────────────────────────────────────────────
CREATE TABLE LIKES (
    UserA     INT      NOT NULL,
    UserB     INT      NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserA, UserB),
    CONSTRAINT fk_likes_userA FOREIGN KEY (UserA) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_likes_userB FOREIGN KEY (UserB) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. INVOLVES ───────────────────────────────────────────────────────────
CREATE TABLE INVOLVES (
    MatchID INT NOT NULL,
    UserA   INT NOT NULL,
    UserB   INT NOT NULL,
    PRIMARY KEY (MatchID, UserA, UserB),
    CONSTRAINT fk_involves_match FOREIGN KEY (MatchID) REFERENCES MATCH_RECORD(MatchID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_involves_userA FOREIGN KEY (UserA) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_involves_userB FOREIGN KEY (UserB) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 8. COMPAT_REQUEST (intentional compatibility request system) ───────────
CREATE TABLE COMPAT_REQUEST (
    RequestID   INT          NOT NULL AUTO_INCREMENT,
    FromUserID  INT          NOT NULL,
    ToUserID    INT          NOT NULL,
    Status      ENUM('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
    CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt   DATETIME     NOT NULL,
    RespondedAt DATETIME,
    PRIMARY KEY (RequestID),
    UNIQUE KEY uq_compat_pair (FromUserID, ToUserID),
    CONSTRAINT fk_creq_from FOREIGN KEY (FromUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_creq_to   FOREIGN KEY (ToUserID)   REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 9. COMPATIBILITY_EVAL ─────────────────────────────────────────────────
CREATE TABLE COMPATIBILITY_EVAL (
    EvalID               INT           NOT NULL AUTO_INCREMENT,
    TotalScore           DECIMAL(4,1)  NOT NULL,
    MatchQualityLabel    VARCHAR(30)   NOT NULL,
    EvaluatedAtTimestamp DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EvalUser1ID          INT           NOT NULL,
    EvalUser2ID          INT           NOT NULL,
    RequestID            INT,
    PRIMARY KEY (EvalID),
    CONSTRAINT fk_eval_user1   FOREIGN KEY (EvalUser1ID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_eval_user2   FOREIGN KEY (EvalUser2ID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_eval_request FOREIGN KEY (RequestID)  REFERENCES COMPAT_REQUEST(RequestID)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 10. KOOTA_SCORE (weak entity) ─────────────────────────────────────────
CREATE TABLE KOOTA_SCORE (
    EvalID          INT           NOT NULL,
    KootaType       VARCHAR(20)   NOT NULL,
    MaxScore        DECIMAL(4,1)  NOT NULL,
    ScoreValue      DECIMAL(4,1)  NOT NULL,
    ExplanationText TEXT,
    PRIMARY KEY (EvalID, KootaType),
    CONSTRAINT fk_koota_eval FOREIGN KEY (EvalID) REFERENCES COMPATIBILITY_EVAL(EvalID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 11. MESSAGES (chat between matched users) ──────────────────────────────
CREATE TABLE MESSAGES (
    MessageID   BIGINT       NOT NULL AUTO_INCREMENT,
    MatchID     INT          NOT NULL,
    SenderID    INT          NOT NULL,
    Body        TEXT         NOT NULL,
    SentAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ReadAt      DATETIME,
    PRIMARY KEY (MessageID),
    KEY idx_messages_match (MatchID, SentAt),
    CONSTRAINT fk_msg_match  FOREIGN KEY (MatchID)  REFERENCES MATCH_RECORD(MatchID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (SenderID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 12. NOTIFICATIONS ─────────────────────────────────────────────────────
CREATE TABLE NOTIFICATIONS (
    NotifID    BIGINT       NOT NULL AUTO_INCREMENT,
    UserID     INT          NOT NULL,
    Type       VARCHAR(40)  NOT NULL, -- 'like','match','compat_request','message','request_accepted'
    Payload    JSON,
    IsRead     TINYINT(1)   NOT NULL DEFAULT 0,
    CreatedAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (NotifID),
    KEY idx_notif_user (UserID, IsRead),
    CONSTRAINT fk_notif_user FOREIGN KEY (UserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TRIGGERS ──────────────────────────────────────────────────────────────
DELIMITER $$

CREATE TRIGGER trg_likes_no_self
BEFORE INSERT ON LIKES FOR EACH ROW
BEGIN
  IF NEW.UserA = NEW.UserB THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user cannot like themselves.';
  END IF;
END$$

CREATE TRIGGER trg_involves_no_self
BEFORE INSERT ON INVOLVES FOR EACH ROW
BEGIN
  IF NEW.UserA = NEW.UserB THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A match cannot involve the same user twice.';
  END IF;
END$$

CREATE TRIGGER trg_eval_no_self
BEFORE INSERT ON COMPATIBILITY_EVAL FOR EACH ROW
BEGIN
  IF NEW.EvalUser1ID = NEW.EvalUser2ID THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot evaluate a user against themselves.';
  END IF;
END$$

CREATE TRIGGER trg_creq_no_self
BEFORE INSERT ON COMPAT_REQUEST FOR EACH ROW
BEGIN
  IF NEW.FromUserID = NEW.ToUserID THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot send a compatibility request to yourself.';
  END IF;
END$$

DELIMITER ;

-- ── SEED: PLANET ──────────────────────────────────────────────────────────
INSERT INTO PLANET (PlanetName) VALUES
('Sun'),('Moon'),('Mars'),('Mercury'),('Jupiter'),('Venus'),('Saturn'),('Rahu'),('Ketu');

-- ── SEED: RASHI ───────────────────────────────────────────────────────────
INSERT INTO RASHI (RashiName, Varna, VashyaGroup, PlanetID) VALUES
('Aries',       'Kshatriya', 'Chatushpada', 3),
('Taurus',      'Vaishya',   'Chatushpada', 6),
('Gemini',      'Shudra',    'Dwipada',     4),
('Cancer',      'Brahmin',   'Jalachara',   2),
('Leo',         'Kshatriya', 'Vanachara',   1),
('Virgo',       'Vaishya',   'Dwipada',     4),
('Libra',       'Shudra',    'Dwipada',     6),
('Scorpio',     'Brahmin',   'Keeta',       3),
('Sagittarius', 'Kshatriya', 'Chatushpada', 5),
('Capricorn',   'Vaishya',   'Chatushpada', 7),
('Aquarius',    'Shudra',    'Dwipada',     7),
('Pisces',      'Brahmin',   'Jalachara',   5);

-- ── SEED: NAKSHATRA (all 27) ──────────────────────────────────────────────
INSERT INTO NAKSHATRA (NakshatraName, Index1to27, Gana, Nadi, Yoni) VALUES
('Ashwini',              1,  'Deva',     'Antya',  'Horse'),
('Bharani',              2,  'Manushya', 'Antya',  'Elephant'),
('Krittika',             3,  'Rakshasa', 'Adi',    'Sheep'),
('Rohini',               4,  'Manushya', 'Antya',  'Serpent'),
('Mrigashira',           5,  'Deva',     'Madhya', 'Serpent'),
('Ardra',                6,  'Manushya', 'Madhya', 'Dog'),
('Punarvasu',            7,  'Deva',     'Adi',    'Cat'),
('Pushya',               8,  'Deva',     'Madhya', 'Sheep'),
('Ashlesha',             9,  'Rakshasa', 'Adi',    'Cat'),
('Magha',               10,  'Rakshasa', 'Antya',  'Rat'),
('Purva Phalguni',      11,  'Manushya', 'Adi',    'Rat'),
('Uttara Phalguni',     12,  'Manushya', 'Madhya', 'Cow'),
('Hasta',               13,  'Deva',     'Antya',  'Buffalo'),
('Chitra',              14,  'Rakshasa', 'Madhya', 'Tiger'),
('Swati',               15,  'Deva',     'Adi',    'Buffalo'),
('Vishakha',            16,  'Rakshasa', 'Antya',  'Tiger'),
('Anuradha',            17,  'Deva',     'Adi',    'Deer'),
('Jyeshtha',            18,  'Rakshasa', 'Madhya', 'Deer'),
('Mula',                19,  'Rakshasa', 'Antya',  'Dog'),
('Purva Ashadha',       20,  'Manushya', 'Adi',    'Monkey'),
('Uttara Ashadha',      21,  'Manushya', 'Madhya', 'Mongoose'),
('Shravana',            22,  'Deva',     'Antya',  'Monkey'),
('Dhanishta',           23,  'Rakshasa', 'Adi',    'Lion'),
('Shatabhisha',         24,  'Rakshasa', 'Madhya', 'Horse'),
('Purva Bhadrapada',    25,  'Manushya', 'Antya',  'Lion'),
('Uttara Bhadrapada',   26,  'Manushya', 'Adi',    'Cow'),
('Revati',              27,  'Deva',     'Antya',  'Elephant');
