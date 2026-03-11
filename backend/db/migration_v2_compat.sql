ALTER TABLE users
  MODIFY role ENUM('student','coach','admin','teacher') DEFAULT 'student';

ALTER TABLE trust_scores
  MODIFY last_update DATETIME NULL;

ALTER TABLE roadmap_progress
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP;

DELETE rp1 FROM roadmap_progress rp1
JOIN roadmap_progress rp2
  ON rp1.student_id <=> rp2.student_id
 AND rp1.domain <=> rp2.domain
 AND rp1.subdomain <=> rp2.subdomain
 AND rp1.step <=> rp2.step
 AND rp1.id > rp2.id;

ALTER TABLE roadmap_progress
  ADD UNIQUE KEY uq_student_step (student_id, domain, subdomain, step),
  ADD INDEX idx_progress_student_domain (student_id, domain, subdomain);

ALTER TABLE notifications
  MODIFY status ENUM('pending','sent','read') DEFAULT 'pending',
  MODIFY notify_date DATETIME NULL,
  ADD COLUMN IF NOT EXISTS type VARCHAR(80) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS title VARCHAR(190) NULL,
  ADD COLUMN IF NOT EXISTS message TEXT NULL,
  ADD COLUMN IF NOT EXISTS related_id INT NULL,
  ADD COLUMN IF NOT EXISTS read_at DATETIME NULL;

UPDATE notifications n
LEFT JOIN events e ON e.id = n.event_id
SET n.title = COALESCE(n.title, e.title, 'Notification'),
    n.message = COALESCE(n.message, CONCAT('Event update: ', COALESCE(e.title, 'N/A'))),
    n.type = COALESCE(NULLIF(n.type, ''), 'event_notification'),
    n.notify_date = COALESCE(n.notify_date, NOW());

ALTER TABLE notifications
  MODIFY title VARCHAR(190) NOT NULL,
  MODIFY message TEXT NOT NULL,
  MODIFY notify_date DATETIME NOT NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'competition',
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(120) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(80) NOT NULL DEFAULT 'competition',
  ADD COLUMN IF NOT EXISTS country VARCHAR(120) NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS registration_deadline DATE NULL,
  ADD COLUMN IF NOT EXISTS source VARCHAR(190) NOT NULL DEFAULT 'curated_admin',
  ADD COLUMN IF NOT EXISTS registration_url VARCHAR(350) NULL,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE events
SET start_date = COALESCE(start_date, event_date),
    registration_deadline = COALESCE(registration_deadline, deadline),
    event_type = COALESCE(NULLIF(event_type, ''), category, 'competition'),
    country = COALESCE(NULLIF(country, ''), 'India');

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_user (user_id),
  INDEX idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trust_scores_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  score INT NOT NULL,
  reason VARCHAR(120) NULL,
  last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trust_history_student_date (student_id, last_update),
  CONSTRAINT fk_trust_history_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trust_penalties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  penalty INT NOT NULL,
  reason VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_penalty_student_date (student_id, created_at),
  CONSTRAINT fk_penalty_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_roadmap_selection (
  student_id INT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, domain, subdomain),
  INDEX idx_selection_domain (domain),
  CONSTRAINT fk_selection_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestone_approvals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  step VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rating INT NULL,
  suggestion TEXT NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_approval_request (student_id, domain, subdomain, step),
  INDEX idx_approval_status (status),
  CONSTRAINT fk_approval_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id INT PRIMARY KEY AUTO_INCREMENT,
  domain_key VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roadmap_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  domain_key VARCHAR(120) NOT NULL,
  subdomain_key VARCHAR(120) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_template (domain_key, subdomain_key),
  INDEX idx_template_domain (domain_key)
);

CREATE TABLE IF NOT EXISTS recommendation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_student_date (student_id, created_at),
  CONSTRAINT fk_recommendation_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_coach_map (
  student_id INT NOT NULL,
  coach_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, coach_id),
  INDEX idx_scm_coach (coach_id),
  CONSTRAINT fk_scm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT NOT NULL PRIMARY KEY,
  admission_no VARCHAR(80) NULL,
  class_name VARCHAR(120) NULL,
  section VARCHAR(40) NULL,
  institution VARCHAR(190) NULL,
  belongs_to VARCHAR(190) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  guardian_name VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  assigned_teacher_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_profile_teacher (assigned_teacher_id),
  CONSTRAINT fk_student_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_profile_teacher FOREIGN KEY (assigned_teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id INT NOT NULL PRIMARY KEY,
  employee_id VARCHAR(80) NULL,
  department VARCHAR(120) NULL,
  institution VARCHAR(190) NULL,
  belongs_to VARCHAR(190) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  qualification VARCHAR(190) NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  badge_code VARCHAR(100) NOT NULL,
  title VARCHAR(190) NOT NULL,
  unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_badge (student_id, badge_code),
  INDEX idx_achievement_student (student_id),
  CONSTRAINT fk_achievement_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE activity_logs
  ADD INDEX idx_activity_student_created (student_id, created_at),
  ADD INDEX idx_activity_created (created_at);

ALTER TABLE trust_scores
  ADD INDEX idx_trust_score (score);

ALTER TABLE users
  ADD INDEX idx_users_role (role),
  ADD INDEX idx_users_created_at (created_at);

ALTER TABLE events
  ADD UNIQUE KEY uq_event_identity (title, domain, subdomain, location, country, event_date),
  ADD INDEX idx_event_country (country),
  ADD INDEX idx_event_start_date (start_date),
  ADD INDEX idx_event_registration_deadline (registration_deadline);
