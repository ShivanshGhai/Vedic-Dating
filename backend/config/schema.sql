-- ============================================================
-- ASHTAKOOTA - PART 3 SUBMISSION SCHEMA
-- Run once on MySQL to initialise all tables and reference data
-- ============================================================

DROP TABLE IF EXISTS NOTIFICATIONS;
DROP TABLE IF EXISTS USER_REPORT_ACTION;
DROP TABLE IF EXISTS USER_REPORT;
DROP TABLE IF EXISTS USER_BLOCK;
DROP TABLE IF EXISTS USER_PHOTO;
DROP TABLE IF EXISTS MESSAGES;
DROP TABLE IF EXISTS KOOTA_SCORE;
DROP TABLE IF EXISTS COMPATIBILITY_EVAL;
DROP TABLE IF EXISTS COMPAT_REQUEST;
DROP TABLE IF EXISTS INVOLVES;
DROP TABLE IF EXISTS LIKES;
DROP TABLE IF EXISTS MATCH_RECORD;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS TARA_SCORE;
DROP TABLE IF EXISTS NADI_SCORE;
DROP TABLE IF EXISTS BHAKOOT_SCORE;
DROP TABLE IF EXISTS GANA_SCORE;
DROP TABLE IF EXISTS GRAHA_MAITRI_SCORE;
DROP TABLE IF EXISTS PLANET_RELATION;
DROP TABLE IF EXISTS YONI_SCORE;
DROP TABLE IF EXISTS VASHYA_SCORE;
DROP TABLE IF EXISTS VARNA_RANK;
DROP TABLE IF EXISTS MATCH_QUALITY_LABEL;
DROP TABLE IF EXISTS NAKSHATRA;
DROP TABLE IF EXISTS RASHI;
DROP TABLE IF EXISTS PLANET;

CREATE TABLE PLANET (
    PlanetID INT NOT NULL AUTO_INCREMENT,
    PlanetName VARCHAR(50) NOT NULL UNIQUE,
    PRIMARY KEY (PlanetID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE RASHI (
    RashiID INT NOT NULL AUTO_INCREMENT,
    RashiName VARCHAR(50) NOT NULL UNIQUE,
    Varna VARCHAR(20) NOT NULL,
    VashyaGroup VARCHAR(20) NOT NULL,
    PlanetID INT NOT NULL,
    PRIMARY KEY (RashiID),
    CONSTRAINT fk_rashi_planet FOREIGN KEY (PlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NAKSHATRA (
    NakshatraID INT NOT NULL AUTO_INCREMENT,
    NakshatraName VARCHAR(60) NOT NULL UNIQUE,
    Index1to27 INT NOT NULL,
    Gana VARCHAR(20) NOT NULL,
    Nadi VARCHAR(20) NOT NULL,
    Yoni VARCHAR(30) NOT NULL,
    PRIMARY KEY (NakshatraID),
    CONSTRAINT uq_nakshatra_index UNIQUE (Index1to27)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MATCH_QUALITY_LABEL (
    Label VARCHAR(30) NOT NULL,
    MinScore DECIMAL(4,1) NOT NULL,
    MaxScore DECIMAL(4,1) NOT NULL,
    Description VARCHAR(255) NOT NULL,
    PRIMARY KEY (Label),
    CONSTRAINT chk_match_quality_bounds CHECK (MinScore <= MaxScore)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE VARNA_RANK (
    Varna VARCHAR(20) NOT NULL,
    RankValue INT NOT NULL,
    PRIMARY KEY (Varna),
    CONSTRAINT uq_varna_rank UNIQUE (RankValue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE VASHYA_SCORE (
    SubjectGroup VARCHAR(20) NOT NULL,
    ObjectGroup VARCHAR(20) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    PRIMARY KEY (SubjectGroup, ObjectGroup)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE YONI_SCORE (
    SubjectYoni VARCHAR(30) NOT NULL,
    ObjectYoni VARCHAR(30) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    PRIMARY KEY (SubjectYoni, ObjectYoni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PLANET_RELATION (
    FromPlanetID INT NOT NULL,
    ToPlanetID INT NOT NULL,
    RelationType ENUM('same','friend','neutral','enemy') NOT NULL,
    PRIMARY KEY (FromPlanetID, ToPlanetID),
    CONSTRAINT fk_planet_relation_from FOREIGN KEY (FromPlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_planet_relation_to FOREIGN KEY (ToPlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE GRAHA_MAITRI_SCORE (
    FromPlanetID INT NOT NULL,
    ToPlanetID INT NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    PRIMARY KEY (FromPlanetID, ToPlanetID),
    CONSTRAINT fk_graha_score_from FOREIGN KEY (FromPlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_graha_score_to FOREIGN KEY (ToPlanetID) REFERENCES PLANET(PlanetID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE GANA_SCORE (
    SubjectGana VARCHAR(20) NOT NULL,
    ObjectGana VARCHAR(20) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    PRIMARY KEY (SubjectGana, ObjectGana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE BHAKOOT_SCORE (
    ForwardCount INT NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    ReasonText VARCHAR(255) NOT NULL,
    PRIMARY KEY (ForwardCount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NADI_SCORE (
    SubjectNadi VARCHAR(20) NOT NULL,
    ObjectNadi VARCHAR(20) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    PRIMARY KEY (SubjectNadi, ObjectNadi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE TARA_SCORE (
    SubjectAuspicious TINYINT(1) NOT NULL,
    ObjectAuspicious TINYINT(1) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    ReasonText VARCHAR(255) NOT NULL,
    PRIMARY KEY (SubjectAuspicious, ObjectAuspicious)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USER (
    UserID INT NOT NULL AUTO_INCREMENT,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    DateOfBirth DATE NOT NULL,
    TimeOfBirth TIME NOT NULL,
    BirthLocation VARCHAR(150) NOT NULL,
    Latitude DECIMAL(9,6),
    Longitude DECIMAL(9,6),
    RashiID INT NOT NULL,
    NakshatraID INT NOT NULL,
    AvatarURL VARCHAR(500),
    Bio VARCHAR(300),
    GenderIdentity VARCHAR(30),
    LookingFor VARCHAR(30),
    RelationshipIntent VARCHAR(30),
    ProfilePrompt VARCHAR(160),
    AcceptedSafetyAt DATETIME,
    EmailVerifiedAt DATETIME,
    EmailVerifyTokenHash VARCHAR(128),
    EmailVerifyExpiresAt DATETIME,
    PasswordResetTokenHash VARCHAR(128),
    PasswordResetExpiresAt DATETIME,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserID),
    CONSTRAINT fk_user_rashi FOREIGN KEY (RashiID) REFERENCES RASHI(RashiID)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_user_nakshatra FOREIGN KEY (NakshatraID) REFERENCES NAKSHATRA(NakshatraID)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USER_PHOTO (
    PhotoID BIGINT NOT NULL AUTO_INCREMENT,
    UserID INT NOT NULL,
    PhotoURL VARCHAR(500) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    IsPrimaryPhoto TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (PhotoID),
    KEY idx_user_photo_user (UserID, SortOrder),
    CONSTRAINT fk_user_photo_user FOREIGN KEY (UserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USER_BLOCK (
    BlockerUserID INT NOT NULL,
    BlockedUserID INT NOT NULL,
    Reason VARCHAR(200),
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (BlockerUserID, BlockedUserID),
    CONSTRAINT fk_block_blocker FOREIGN KEY (BlockerUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_block_blocked FOREIGN KEY (BlockedUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USER_REPORT (
    ReportID BIGINT NOT NULL AUTO_INCREMENT,
    ReporterUserID INT NOT NULL,
    ReportedUserID INT NOT NULL,
    Category VARCHAR(40) NOT NULL,
    Details VARCHAR(500),
    Status ENUM('open','reviewed','resolved') NOT NULL DEFAULT 'open',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ReportID),
    KEY idx_report_target (ReportedUserID, Status),
    CONSTRAINT fk_report_reporter FOREIGN KEY (ReporterUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_report_reported FOREIGN KEY (ReportedUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USER_REPORT_ACTION (
    ActionID BIGINT NOT NULL AUTO_INCREMENT,
    ReportID BIGINT NOT NULL,
    AdminUserID INT NOT NULL,
    ActionType VARCHAR(40) NOT NULL,
    Note VARCHAR(500),
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ActionID),
    KEY idx_report_action_report (ReportID, CreatedAt),
    CONSTRAINT fk_report_action_report FOREIGN KEY (ReportID) REFERENCES USER_REPORT(ReportID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_report_action_admin FOREIGN KEY (AdminUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MATCH_RECORD (
    MatchID INT NOT NULL AUTO_INCREMENT,
    MatchCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MatchID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE LIKES (
    UserA INT NOT NULL,
    UserB INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserA, UserB),
    CONSTRAINT fk_likes_user_a FOREIGN KEY (UserA) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_likes_user_b FOREIGN KEY (UserB) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE INVOLVES (
    MatchID INT NOT NULL,
    UserA INT NOT NULL,
    UserB INT NOT NULL,
    UserLowID INT NOT NULL,
    UserHighID INT NOT NULL,
    PRIMARY KEY (MatchID),
    UNIQUE KEY uq_involves_pair (UserLowID, UserHighID),
    CONSTRAINT fk_involves_match FOREIGN KEY (MatchID) REFERENCES MATCH_RECORD(MatchID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_involves_user_a FOREIGN KEY (UserA) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_involves_user_b FOREIGN KEY (UserB) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE COMPAT_REQUEST (
    RequestID INT NOT NULL AUTO_INCREMENT,
    FromUserID INT NOT NULL,
    ToUserID INT NOT NULL,
    Status ENUM('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt DATETIME NOT NULL,
    RespondedAt DATETIME,
    PRIMARY KEY (RequestID),
    UNIQUE KEY uq_compat_pair (FromUserID, ToUserID),
    CONSTRAINT fk_creq_from FOREIGN KEY (FromUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_creq_to FOREIGN KEY (ToUserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE COMPATIBILITY_EVAL (
    EvalID INT NOT NULL AUTO_INCREMENT,
    TotalScore DECIMAL(4,1) NOT NULL,
    MatchQualityLabel VARCHAR(30) NOT NULL,
    EvaluatedAtTimestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EvalUser1ID INT NOT NULL,
    EvalUser2ID INT NOT NULL,
    EvalUserLowID INT NOT NULL,
    EvalUserHighID INT NOT NULL,
    RequestID INT,
    PRIMARY KEY (EvalID),
    UNIQUE KEY uq_eval_pair (EvalUserLowID, EvalUserHighID),
    KEY idx_eval_pair_lookup (EvalUserLowID, EvalUserHighID),
    CONSTRAINT fk_eval_user_1 FOREIGN KEY (EvalUser1ID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_eval_user_2 FOREIGN KEY (EvalUser2ID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_eval_request FOREIGN KEY (RequestID) REFERENCES COMPAT_REQUEST(RequestID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_eval_quality FOREIGN KEY (MatchQualityLabel) REFERENCES MATCH_QUALITY_LABEL(Label)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE KOOTA_SCORE (
    EvalID INT NOT NULL,
    KootaType VARCHAR(20) NOT NULL,
    MaxScore DECIMAL(4,1) NOT NULL,
    ScoreValue DECIMAL(4,1) NOT NULL,
    ExplanationText TEXT,
    PRIMARY KEY (EvalID, KootaType),
    CONSTRAINT fk_koota_eval FOREIGN KEY (EvalID) REFERENCES COMPATIBILITY_EVAL(EvalID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MESSAGES (
    MessageID BIGINT NOT NULL AUTO_INCREMENT,
    MatchID INT NOT NULL,
    SenderID INT NOT NULL,
    Body TEXT NOT NULL,
    SentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ReadAt DATETIME,
    PRIMARY KEY (MessageID),
    KEY idx_messages_match (MatchID, SentAt),
    CONSTRAINT fk_msg_match FOREIGN KEY (MatchID) REFERENCES MATCH_RECORD(MatchID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (SenderID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE NOTIFICATIONS (
    NotifID BIGINT NOT NULL AUTO_INCREMENT,
    UserID INT NOT NULL,
    Type VARCHAR(40) NOT NULL,
    Payload JSON,
    IsRead TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (NotifID),
    KEY idx_notif_user (UserID, IsRead),
    CONSTRAINT fk_notif_user FOREIGN KEY (UserID) REFERENCES USER(UserID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TRIGGER trg_involves_canonical_pair
BEFORE INSERT ON INVOLVES FOR EACH ROW
BEGIN
  DECLARE tmp_user_id INT;
  IF NEW.UserA > NEW.UserB THEN
    SET tmp_user_id = NEW.UserA;
    SET NEW.UserA = NEW.UserB;
    SET NEW.UserB = tmp_user_id;
  END IF;
  SET NEW.UserLowID = NEW.UserA;
  SET NEW.UserHighID = NEW.UserB;
END$$

CREATE TRIGGER trg_eval_no_self
BEFORE INSERT ON COMPATIBILITY_EVAL FOR EACH ROW
BEGIN
  IF NEW.EvalUser1ID = NEW.EvalUser2ID THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot evaluate a user against themselves.';
  END IF;
END$$

CREATE TRIGGER trg_eval_canonical_pair
BEFORE INSERT ON COMPATIBILITY_EVAL FOR EACH ROW
BEGIN
  DECLARE tmp_eval_user INT;
  IF NEW.EvalUser1ID > NEW.EvalUser2ID THEN
    SET tmp_eval_user = NEW.EvalUser1ID;
    SET NEW.EvalUser1ID = NEW.EvalUser2ID;
    SET NEW.EvalUser2ID = tmp_eval_user;
  END IF;
  SET NEW.EvalUserLowID = NEW.EvalUser1ID;
  SET NEW.EvalUserHighID = NEW.EvalUser2ID;
END$$

CREATE TRIGGER trg_creq_no_self
BEFORE INSERT ON COMPAT_REQUEST FOR EACH ROW
BEGIN
  IF NEW.FromUserID = NEW.ToUserID THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot send a compatibility request to yourself.';
  END IF;
END$$

DELIMITER ;

INSERT INTO PLANET (PlanetName) VALUES
('Sun'),
('Moon'),
('Mars'),
('Mercury'),
('Jupiter'),
('Venus'),
('Saturn'),
('Rahu'),
('Ketu');

INSERT INTO RASHI (RashiName, Varna, VashyaGroup, PlanetID) VALUES
('Aries', 'Kshatriya', 'Chatushpada', 3),
('Taurus', 'Vaishya', 'Chatushpada', 6),
('Gemini', 'Shudra', 'Dwipada', 4),
('Cancer', 'Brahmin', 'Jalachara', 2),
('Leo', 'Kshatriya', 'Vanachara', 1),
('Virgo', 'Vaishya', 'Dwipada', 4),
('Libra', 'Shudra', 'Dwipada', 6),
('Scorpio', 'Brahmin', 'Keeta', 3),
('Sagittarius', 'Kshatriya', 'Chatushpada', 5),
('Capricorn', 'Vaishya', 'Chatushpada', 7),
('Aquarius', 'Shudra', 'Dwipada', 7),
('Pisces', 'Brahmin', 'Jalachara', 5);

INSERT INTO NAKSHATRA (NakshatraName, Index1to27, Gana, Nadi, Yoni) VALUES
('Ashwini', 1, 'Deva', 'Antya', 'Horse'),
('Bharani', 2, 'Manushya', 'Antya', 'Elephant'),
('Krittika', 3, 'Rakshasa', 'Adi', 'Sheep'),
('Rohini', 4, 'Manushya', 'Antya', 'Serpent'),
('Mrigashira', 5, 'Deva', 'Madhya', 'Serpent'),
('Ardra', 6, 'Manushya', 'Madhya', 'Dog'),
('Punarvasu', 7, 'Deva', 'Adi', 'Cat'),
('Pushya', 8, 'Deva', 'Madhya', 'Sheep'),
('Ashlesha', 9, 'Rakshasa', 'Adi', 'Cat'),
('Magha', 10, 'Rakshasa', 'Antya', 'Rat'),
('Purva Phalguni', 11, 'Manushya', 'Adi', 'Rat'),
('Uttara Phalguni', 12, 'Manushya', 'Madhya', 'Cow'),
('Hasta', 13, 'Deva', 'Antya', 'Buffalo'),
('Chitra', 14, 'Rakshasa', 'Madhya', 'Tiger'),
('Swati', 15, 'Deva', 'Adi', 'Buffalo'),
('Vishakha', 16, 'Rakshasa', 'Antya', 'Tiger'),
('Anuradha', 17, 'Deva', 'Adi', 'Deer'),
('Jyeshtha', 18, 'Rakshasa', 'Madhya', 'Deer'),
('Mula', 19, 'Rakshasa', 'Antya', 'Dog'),
('Purva Ashadha', 20, 'Manushya', 'Adi', 'Monkey'),
('Uttara Ashadha', 21, 'Manushya', 'Madhya', 'Mongoose'),
('Shravana', 22, 'Deva', 'Antya', 'Monkey'),
('Dhanishta', 23, 'Rakshasa', 'Adi', 'Lion'),
('Shatabhisha', 24, 'Rakshasa', 'Madhya', 'Horse'),
('Purva Bhadrapada', 25, 'Manushya', 'Antya', 'Lion'),
('Uttara Bhadrapada', 26, 'Manushya', 'Adi', 'Cow'),
('Revati', 27, 'Deva', 'Antya', 'Elephant');

INSERT INTO MATCH_QUALITY_LABEL (Label, MinScore, MaxScore, Description) VALUES
('Excellent', 33.0, 36.0, 'Outstanding compatibility across the Ashtakoota framework.'),
('Good', 25.0, 32.9, 'Strong compatibility with only minor weak areas.'),
('Average', 18.0, 24.9, 'Mixed compatibility that needs more human judgement.'),
('Poor', 0.0, 17.9, 'Low compatibility according to the scoring framework.');

INSERT INTO VARNA_RANK (Varna, RankValue) VALUES
('Brahmin', 4),
('Kshatriya', 3),
('Vaishya', 2),
('Shudra', 1);

INSERT INTO VASHYA_SCORE (SubjectGroup, ObjectGroup, ScoreValue) VALUES
('Chatushpada', 'Chatushpada', 2.0),
('Chatushpada', 'Dwipada', 1.0),
('Chatushpada', 'Jalachara', 0.0),
('Chatushpada', 'Vanachara', 0.5),
('Chatushpada', 'Keeta', 0.0),
('Dwipada', 'Chatushpada', 1.0),
('Dwipada', 'Dwipada', 2.0),
('Dwipada', 'Jalachara', 0.0),
('Dwipada', 'Vanachara', 1.0),
('Dwipada', 'Keeta', 1.0),
('Jalachara', 'Chatushpada', 0.0),
('Jalachara', 'Dwipada', 0.0),
('Jalachara', 'Jalachara', 2.0),
('Jalachara', 'Vanachara', 0.0),
('Jalachara', 'Keeta', 1.0),
('Vanachara', 'Chatushpada', 1.0),
('Vanachara', 'Dwipada', 1.0),
('Vanachara', 'Jalachara', 0.0),
('Vanachara', 'Vanachara', 2.0),
('Vanachara', 'Keeta', 0.0),
('Keeta', 'Chatushpada', 0.0),
('Keeta', 'Dwipada', 1.0),
('Keeta', 'Jalachara', 1.0),
('Keeta', 'Vanachara', 0.0),
('Keeta', 'Keeta', 2.0);

INSERT INTO YONI_SCORE (SubjectYoni, ObjectYoni, ScoreValue) VALUES
('Horse','Horse',4.0),('Horse','Elephant',2.0),('Horse','Sheep',2.0),('Horse','Serpent',0.0),('Horse','Dog',2.0),('Horse','Cat',0.0),('Horse','Rat',1.0),('Horse','Cow',3.0),('Horse','Buffalo',2.0),('Horse','Tiger',0.0),('Horse','Deer',3.0),('Horse','Monkey',2.0),('Horse','Mongoose',2.0),('Horse','Lion',0.0),
('Elephant','Horse',2.0),('Elephant','Elephant',4.0),('Elephant','Sheep',3.0),('Elephant','Serpent',2.0),('Elephant','Dog',2.0),('Elephant','Cat',3.0),('Elephant','Rat',2.0),('Elephant','Cow',3.0),('Elephant','Buffalo',3.0),('Elephant','Tiger',1.0),('Elephant','Deer',3.0),('Elephant','Monkey',2.0),('Elephant','Mongoose',2.0),('Elephant','Lion',0.0),
('Sheep','Horse',2.0),('Sheep','Elephant',3.0),('Sheep','Sheep',4.0),('Sheep','Serpent',2.0),('Sheep','Dog',1.0),('Sheep','Cat',2.0),('Sheep','Rat',2.0),('Sheep','Cow',3.0),('Sheep','Buffalo',3.0),('Sheep','Tiger',0.0),('Sheep','Deer',2.0),('Sheep','Monkey',3.0),('Sheep','Mongoose',2.0),('Sheep','Lion',0.0),
('Serpent','Horse',0.0),('Serpent','Elephant',2.0),('Serpent','Sheep',2.0),('Serpent','Serpent',4.0),('Serpent','Dog',0.0),('Serpent','Cat',2.0),('Serpent','Rat',0.0),('Serpent','Cow',2.0),('Serpent','Buffalo',2.0),('Serpent','Tiger',2.0),('Serpent','Deer',0.0),('Serpent','Monkey',1.0),('Serpent','Mongoose',0.0),('Serpent','Lion',1.0),
('Dog','Horse',2.0),('Dog','Elephant',2.0),('Dog','Sheep',1.0),('Dog','Serpent',0.0),('Dog','Dog',4.0),('Dog','Cat',0.0),('Dog','Rat',2.0),('Dog','Cow',2.0),('Dog','Buffalo',2.0),('Dog','Tiger',1.0),('Dog','Deer',2.0),('Dog','Monkey',2.0),('Dog','Mongoose',2.0),('Dog','Lion',0.0),
('Cat','Horse',0.0),('Cat','Elephant',3.0),('Cat','Sheep',2.0),('Cat','Serpent',2.0),('Cat','Dog',0.0),('Cat','Cat',4.0),('Cat','Rat',0.0),('Cat','Cow',2.0),('Cat','Buffalo',2.0),('Cat','Tiger',2.0),('Cat','Deer',2.0),('Cat','Monkey',3.0),('Cat','Mongoose',2.0),('Cat','Lion',1.0),
('Rat','Horse',1.0),('Rat','Elephant',2.0),('Rat','Sheep',2.0),('Rat','Serpent',0.0),('Rat','Dog',2.0),('Rat','Cat',0.0),('Rat','Rat',4.0),('Rat','Cow',2.0),('Rat','Buffalo',2.0),('Rat','Tiger',0.0),('Rat','Deer',2.0),('Rat','Monkey',2.0),('Rat','Mongoose',0.0),('Rat','Lion',1.0),
('Cow','Horse',3.0),('Cow','Elephant',3.0),('Cow','Sheep',3.0),('Cow','Serpent',2.0),('Cow','Dog',2.0),('Cow','Cat',2.0),('Cow','Rat',2.0),('Cow','Cow',4.0),('Cow','Buffalo',3.0),('Cow','Tiger',0.0),('Cow','Deer',3.0),('Cow','Monkey',2.0),('Cow','Mongoose',3.0),('Cow','Lion',0.0),
('Buffalo','Horse',2.0),('Buffalo','Elephant',3.0),('Buffalo','Sheep',3.0),('Buffalo','Serpent',2.0),('Buffalo','Dog',2.0),('Buffalo','Cat',2.0),('Buffalo','Rat',2.0),('Buffalo','Cow',3.0),('Buffalo','Buffalo',4.0),('Buffalo','Tiger',0.0),('Buffalo','Deer',2.0),('Buffalo','Monkey',2.0),('Buffalo','Mongoose',2.0),('Buffalo','Lion',1.0),
('Tiger','Horse',0.0),('Tiger','Elephant',1.0),('Tiger','Sheep',0.0),('Tiger','Serpent',2.0),('Tiger','Dog',1.0),('Tiger','Cat',2.0),('Tiger','Rat',0.0),('Tiger','Cow',0.0),('Tiger','Buffalo',0.0),('Tiger','Tiger',4.0),('Tiger','Deer',0.0),('Tiger','Monkey',0.0),('Tiger','Mongoose',2.0),('Tiger','Lion',2.0),
('Deer','Horse',3.0),('Deer','Elephant',3.0),('Deer','Sheep',2.0),('Deer','Serpent',0.0),('Deer','Dog',2.0),('Deer','Cat',2.0),('Deer','Rat',2.0),('Deer','Cow',3.0),('Deer','Buffalo',2.0),('Deer','Tiger',0.0),('Deer','Deer',4.0),('Deer','Monkey',2.0),('Deer','Mongoose',2.0),('Deer','Lion',0.0),
('Monkey','Horse',2.0),('Monkey','Elephant',2.0),('Monkey','Sheep',3.0),('Monkey','Serpent',1.0),('Monkey','Dog',2.0),('Monkey','Cat',3.0),('Monkey','Rat',2.0),('Monkey','Cow',2.0),('Monkey','Buffalo',2.0),('Monkey','Tiger',0.0),('Monkey','Deer',2.0),('Monkey','Monkey',4.0),('Monkey','Mongoose',2.0),('Monkey','Lion',1.0),
('Mongoose','Horse',2.0),('Mongoose','Elephant',2.0),('Mongoose','Sheep',2.0),('Mongoose','Serpent',0.0),('Mongoose','Dog',2.0),('Mongoose','Cat',2.0),('Mongoose','Rat',0.0),('Mongoose','Cow',3.0),('Mongoose','Buffalo',2.0),('Mongoose','Tiger',2.0),('Mongoose','Deer',2.0),('Mongoose','Monkey',2.0),('Mongoose','Mongoose',4.0),('Mongoose','Lion',1.0),
('Lion','Horse',0.0),('Lion','Elephant',0.0),('Lion','Sheep',0.0),('Lion','Serpent',1.0),('Lion','Dog',0.0),('Lion','Cat',1.0),('Lion','Rat',1.0),('Lion','Cow',0.0),('Lion','Buffalo',1.0),('Lion','Tiger',2.0),('Lion','Deer',0.0),('Lion','Monkey',1.0),('Lion','Mongoose',1.0),('Lion','Lion',4.0);

INSERT INTO PLANET_RELATION (FromPlanetID, ToPlanetID, RelationType) VALUES
(1,1,'same'),(1,2,'friend'),(1,3,'friend'),(1,4,'neutral'),(1,5,'friend'),(1,6,'enemy'),(1,7,'enemy'),(1,8,'neutral'),(1,9,'neutral'),
(2,1,'friend'),(2,2,'same'),(2,3,'neutral'),(2,4,'friend'),(2,5,'friend'),(2,6,'neutral'),(2,7,'neutral'),(2,8,'neutral'),(2,9,'neutral'),
(3,1,'friend'),(3,2,'neutral'),(3,3,'same'),(3,4,'enemy'),(3,5,'friend'),(3,6,'neutral'),(3,7,'neutral'),(3,8,'neutral'),(3,9,'friend'),
(4,1,'neutral'),(4,2,'friend'),(4,3,'enemy'),(4,4,'same'),(4,5,'friend'),(4,6,'friend'),(4,7,'neutral'),(4,8,'friend'),(4,9,'enemy'),
(5,1,'friend'),(5,2,'friend'),(5,3,'friend'),(5,4,'neutral'),(5,5,'same'),(5,6,'enemy'),(5,7,'enemy'),(5,8,'enemy'),(5,9,'friend'),
(6,1,'enemy'),(6,2,'neutral'),(6,3,'neutral'),(6,4,'friend'),(6,5,'enemy'),(6,6,'same'),(6,7,'friend'),(6,8,'friend'),(6,9,'neutral'),
(7,1,'enemy'),(7,2,'neutral'),(7,3,'neutral'),(7,4,'friend'),(7,5,'enemy'),(7,6,'friend'),(7,7,'same'),(7,8,'friend'),(7,9,'neutral'),
(8,1,'neutral'),(8,2,'neutral'),(8,3,'neutral'),(8,4,'friend'),(8,5,'enemy'),(8,6,'friend'),(8,7,'friend'),(8,8,'same'),(8,9,'enemy'),
(9,1,'neutral'),(9,2,'neutral'),(9,3,'friend'),(9,4,'enemy'),(9,5,'friend'),(9,6,'neutral'),(9,7,'neutral'),(9,8,'enemy'),(9,9,'same');

INSERT INTO GRAHA_MAITRI_SCORE (FromPlanetID, ToPlanetID, ScoreValue) VALUES
(1,1,5.0),(1,2,4.0),(1,3,4.0),(1,4,2.0),(1,5,4.0),(1,6,0.0),(1,7,0.0),(1,8,2.0),(1,9,2.0),
(2,1,4.0),(2,2,5.0),(2,3,2.0),(2,4,4.0),(2,5,4.0),(2,6,2.0),(2,7,2.0),(2,8,2.0),(2,9,2.0),
(3,1,4.0),(3,2,2.0),(3,3,5.0),(3,4,0.0),(3,5,4.0),(3,6,2.0),(3,7,2.0),(3,8,2.0),(3,9,4.0),
(4,1,2.0),(4,2,4.0),(4,3,0.0),(4,4,5.0),(4,5,4.0),(4,6,4.0),(4,7,2.0),(4,8,4.0),(4,9,0.0),
(5,1,4.0),(5,2,4.0),(5,3,4.0),(5,4,2.0),(5,5,5.0),(5,6,0.0),(5,7,0.0),(5,8,0.0),(5,9,4.0),
(6,1,0.0),(6,2,2.0),(6,3,2.0),(6,4,4.0),(6,5,0.0),(6,6,5.0),(6,7,4.0),(6,8,4.0),(6,9,2.0),
(7,1,0.0),(7,2,2.0),(7,3,2.0),(7,4,4.0),(7,5,0.0),(7,6,4.0),(7,7,5.0),(7,8,4.0),(7,9,2.0),
(8,1,2.0),(8,2,2.0),(8,3,2.0),(8,4,4.0),(8,5,0.0),(8,6,4.0),(8,7,4.0),(8,8,5.0),(8,9,0.0),
(9,1,2.0),(9,2,2.0),(9,3,4.0),(9,4,0.0),(9,5,4.0),(9,6,2.0),(9,7,2.0),(9,8,0.0),(9,9,5.0);

INSERT INTO GANA_SCORE (SubjectGana, ObjectGana, ScoreValue) VALUES
('Deva', 'Deva', 6.0),
('Deva', 'Manushya', 5.0),
('Deva', 'Rakshasa', 1.0),
('Manushya', 'Deva', 5.0),
('Manushya', 'Manushya', 6.0),
('Manushya', 'Rakshasa', 0.0),
('Rakshasa', 'Deva', 0.0),
('Rakshasa', 'Manushya', 0.0),
('Rakshasa', 'Rakshasa', 6.0);

INSERT INTO BHAKOOT_SCORE (ForwardCount, ScoreValue, ReasonText) VALUES
(1, 7.0, 'Same-sign pairing is treated as acceptable in this project schema.'),
(2, 7.0, 'Forward distance 2 is auspicious.'),
(3, 7.0, 'Forward distance 3 is auspicious.'),
(4, 7.0, 'Forward distance 4 is auspicious.'),
(5, 0.0, '5/9 Bhakoot pairing is inauspicious.'),
(6, 0.0, '6/8 Bhakoot pairing is inauspicious.'),
(7, 7.0, 'Forward distance 7 is auspicious.'),
(8, 0.0, '6/8 Bhakoot pairing is inauspicious.'),
(9, 0.0, '5/9 Bhakoot pairing is inauspicious.'),
(10, 7.0, 'Forward distance 10 is auspicious.'),
(11, 7.0, 'Forward distance 11 is auspicious.'),
(12, 7.0, 'Forward distance 12 is auspicious.');

INSERT INTO NADI_SCORE (SubjectNadi, ObjectNadi, ScoreValue) VALUES
('Adi', 'Adi', 0.0),
('Adi', 'Madhya', 8.0),
('Adi', 'Antya', 8.0),
('Madhya', 'Adi', 8.0),
('Madhya', 'Madhya', 0.0),
('Madhya', 'Antya', 8.0),
('Antya', 'Adi', 8.0),
('Antya', 'Madhya', 8.0),
('Antya', 'Antya', 0.0);

INSERT INTO TARA_SCORE (SubjectAuspicious, ObjectAuspicious, ScoreValue, ReasonText) VALUES
(0, 0, 0.0, 'Neither tara direction is auspicious.'),
(0, 1, 1.5, 'One tara direction is auspicious.'),
(1, 0, 1.5, 'One tara direction is auspicious.'),
(1, 1, 3.0, 'Both tara directions are auspicious.');
