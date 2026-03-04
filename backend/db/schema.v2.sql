-- AthletiPath production-oriented schema (MySQL 8+)

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','coach','admin','teacher') NOT NULL DEFAULT 'student',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_user (user_id),
  INDEX idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  distance DECIMAL(8,2) NOT NULL,
  duration INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(7,2) NULL,
  video_path VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_student_created (student_id, created_at),
  INDEX idx_activity_created (created_at),
  CONSTRAINT fk_activity_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trust_scores (
  student_id BIGINT PRIMARY KEY,
  score INT NOT NULL DEFAULT 50,
  last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trust_score (score),
  CONSTRAINT fk_trust_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trust_scores_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  score INT NOT NULL,
  reason VARCHAR(120) NULL,
  last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trust_history_student_date (student_id, last_update),
  CONSTRAINT fk_trust_history_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trust_penalties (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  penalty INT NOT NULL,
  reason VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_penalty_student_date (student_id, created_at),
  CONSTRAINT fk_penalty_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_roadmap_selection (
  student_id BIGINT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, domain, subdomain),
  INDEX idx_selection_domain (domain),
  CONSTRAINT fk_selection_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmap_progress (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  step VARCHAR(255) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_step (student_id, domain, subdomain, step),
  INDEX idx_progress_student_domain (student_id, domain, subdomain),
  CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_approvals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  step VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rating INT NULL,
  suggestion TEXT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_approval_request (student_id, domain, subdomain, step),
  INDEX idx_approval_status (status),
  CONSTRAINT fk_approval_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  domain_key VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roadmap_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  domain_key VARCHAR(120) NOT NULL,
  subdomain_key VARCHAR(120) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_template (domain_key, subdomain_key),
  INDEX idx_template_domain (domain_key)
);

CREATE TABLE IF NOT EXISTS events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  domain VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'competition',
  location VARCHAR(200) NULL,
  event_date DATE NOT NULL,
  deadline DATE NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_deadline (deadline),
  INDEX idx_event_domain (domain)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  event_id BIGINT NULL,
  related_id BIGINT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  notify_date DATETIME NOT NULL,
  status ENUM('pending','read') NOT NULL DEFAULT 'pending',
  read_at DATETIME NULL,
  INDEX idx_notification_user_date (user_id, notify_date),
  INDEX idx_notification_type (type),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_student_date (student_id, created_at),
  CONSTRAINT fk_recommendation_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_coach_map (
  student_id BIGINT NOT NULL,
  coach_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, coach_id),
  INDEX idx_scm_coach (coach_id),
  CONSTRAINT fk_scm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  badge_code VARCHAR(100) NOT NULL,
  title VARCHAR(190) NOT NULL,
  unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_badge (student_id, badge_code),
  INDEX idx_achievement_student (student_id),
  CONSTRAINT fk_achievement_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
