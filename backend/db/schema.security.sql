-- Security upgrade schema (apply after base schema)

ALTER TABLE users
  MODIFY role ENUM('student','coach','admin','super_admin','teacher') DEFAULT 'student';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_enabled TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(40) NOT NULL DEFAULT 'email_otp',
  ADD COLUMN IF NOT EXISTS account_locked_until DATETIME NULL;

ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS encrypted_score TEXT NULL;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS encrypted_latitude TEXT NULL,
  ADD COLUMN IF NOT EXISTS encrypted_longitude TEXT NULL;

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  challenge_token VARCHAR(128) NOT NULL UNIQUE,
  otp_hash CHAR(64) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mfa_user_created (user_id, created_at),
  CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  email VARCHAR(190) NULL,
  ip_address VARCHAR(64) NULL,
  status ENUM('success','failed') NOT NULL,
  reason VARCHAR(100) NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempt_user_time (user_id, attempted_at),
  INDEX idx_login_attempt_ip_time (ip_address, attempted_at),
  CONSTRAINT fk_login_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS security_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  event_type VARCHAR(80) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  ip_address VARCHAR(64) NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_event_user_time (user_id, created_at),
  INDEX idx_security_event_type_time (event_type, created_at),
  CONSTRAINT fk_security_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  risk_score DECIMAL(8,2) NOT NULL,
  category ENUM('low','medium','high') NOT NULL,
  details JSON NULL,
  calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_risk_user_time (user_id, calculated_at),
  CONSTRAINT fk_risk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
