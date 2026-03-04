#!/usr/bin/env bash
set -euo pipefail

HOST=localhost
USER=athleti
PASS=athleti123
DB=athletipath
MYSQL=(mysql -h "$HOST" -u "$USER" "-p$PASS" "$DB" -N -B)

exists_col() {
  local table=$1 col=$2
  "${MYSQL[@]}" -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$DB' AND table_name='$table' AND column_name='$col';"
}

exists_idx() {
  local table=$1 idx=$2
  "${MYSQL[@]}" -e "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='$DB' AND table_name='$table' AND index_name='$idx';"
}

run() {
  "${MYSQL[@]}" -e "$1"
}

# users role enum
run "ALTER TABLE users MODIFY role ENUM('student','coach','admin','teacher') DEFAULT 'student';"

# trust_scores updates
run "ALTER TABLE trust_scores MODIFY last_update DATETIME NULL;"

# roadmap_progress columns
if [[ "$(exists_col roadmap_progress completed_at)" == "0" ]]; then run "ALTER TABLE roadmap_progress ADD COLUMN completed_at DATETIME NULL"; fi
if [[ "$(exists_col roadmap_progress created_at)" == "0" ]]; then run "ALTER TABLE roadmap_progress ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"; fi
if [[ "$(exists_col roadmap_progress updated_at)" == "0" ]]; then run "ALTER TABLE roadmap_progress ADD COLUMN updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP"; fi

run "DELETE rp1 FROM roadmap_progress rp1 JOIN roadmap_progress rp2 ON rp1.student_id <=> rp2.student_id AND rp1.domain <=> rp2.domain AND rp1.subdomain <=> rp2.subdomain AND rp1.step <=> rp2.step AND rp1.id > rp2.id;"

if [[ "$(exists_idx roadmap_progress uq_student_step)" == "0" ]]; then run "ALTER TABLE roadmap_progress ADD UNIQUE KEY uq_student_step (student_id, domain, subdomain, step)"; fi
if [[ "$(exists_idx roadmap_progress idx_progress_student_domain)" == "0" ]]; then run "ALTER TABLE roadmap_progress ADD INDEX idx_progress_student_domain (student_id, domain, subdomain)"; fi

# notifications
run "ALTER TABLE notifications MODIFY status ENUM('pending','sent','read') DEFAULT 'pending';"
run "ALTER TABLE notifications MODIFY notify_date DATETIME NULL;"
if [[ "$(exists_col notifications type)" == "0" ]]; then run "ALTER TABLE notifications ADD COLUMN type VARCHAR(80) NOT NULL DEFAULT 'general'"; fi
if [[ "$(exists_col notifications title)" == "0" ]]; then run "ALTER TABLE notifications ADD COLUMN title VARCHAR(190) NULL"; fi
if [[ "$(exists_col notifications message)" == "0" ]]; then run "ALTER TABLE notifications ADD COLUMN message TEXT NULL"; fi
if [[ "$(exists_col notifications related_id)" == "0" ]]; then run "ALTER TABLE notifications ADD COLUMN related_id INT NULL"; fi
if [[ "$(exists_col notifications read_at)" == "0" ]]; then run "ALTER TABLE notifications ADD COLUMN read_at DATETIME NULL"; fi
run "UPDATE notifications n LEFT JOIN events e ON e.id = n.event_id SET n.title = COALESCE(n.title, e.title, 'Notification'), n.message = COALESCE(n.message, CONCAT('Event update: ', COALESCE(e.title, 'N/A'))), n.type = COALESCE(NULLIF(n.type, ''), 'event_notification'), n.notify_date = COALESCE(n.notify_date, NOW());"
run "ALTER TABLE notifications MODIFY title VARCHAR(190) NOT NULL, MODIFY message TEXT NOT NULL, MODIFY notify_date DATETIME NOT NULL;"

# events
if [[ "$(exists_col events category)" == "0" ]]; then run "ALTER TABLE events ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'competition'"; fi
if [[ "$(exists_col events created_at)" == "0" ]]; then run "ALTER TABLE events ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"; fi

# create tables
run "CREATE TABLE IF NOT EXISTS refresh_tokens (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL, revoked_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_refresh_user (user_id), INDEX idx_refresh_expires (expires_at), CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS trust_scores_history (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, score INT NOT NULL, reason VARCHAR(120) NULL, last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_trust_history_student_date (student_id, last_update), CONSTRAINT fk_trust_history_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS trust_penalties (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, penalty INT NOT NULL, reason VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_penalty_student_date (student_id, created_at), CONSTRAINT fk_penalty_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS student_roadmap_selection (student_id INT NOT NULL, domain VARCHAR(100) NOT NULL, subdomain VARCHAR(100) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (student_id, domain, subdomain), INDEX idx_selection_domain (domain), CONSTRAINT fk_selection_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS milestone_approvals (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, domain VARCHAR(100) NOT NULL, subdomain VARCHAR(100) NOT NULL, step VARCHAR(255) NOT NULL, status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending', rating INT NULL, suggestion TEXT NULL, reviewed_by INT NULL, reviewed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_approval_request (student_id, domain, subdomain, step), INDEX idx_approval_status (status), CONSTRAINT fk_approval_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT fk_approval_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS domains (id INT PRIMARY KEY AUTO_INCREMENT, domain_key VARCHAR(120) NOT NULL UNIQUE, label VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS roadmap_templates (id INT PRIMARY KEY AUTO_INCREMENT, domain_key VARCHAR(120) NOT NULL, subdomain_key VARCHAR(120) NOT NULL, payload JSON NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_template (domain_key, subdomain_key), INDEX idx_template_domain (domain_key)) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS recommendation_logs (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, payload JSON NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_recommendation_student_date (student_id, created_at), CONSTRAINT fk_recommendation_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS student_coach_map (student_id INT NOT NULL, coach_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (student_id, coach_id), INDEX idx_scm_coach (coach_id), CONSTRAINT fk_scm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT fk_scm_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"
run "CREATE TABLE IF NOT EXISTS achievements (id INT PRIMARY KEY AUTO_INCREMENT, student_id INT NOT NULL, badge_code VARCHAR(100) NOT NULL, title VARCHAR(190) NOT NULL, unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_student_badge (student_id, badge_code), INDEX idx_achievement_student (student_id), CONSTRAINT fk_achievement_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;"

# indexes
if [[ "$(exists_idx activity_logs idx_activity_student_created)" == "0" ]]; then run "ALTER TABLE activity_logs ADD INDEX idx_activity_student_created (student_id, created_at)"; fi
if [[ "$(exists_idx activity_logs idx_activity_created)" == "0" ]]; then run "ALTER TABLE activity_logs ADD INDEX idx_activity_created (created_at)"; fi
if [[ "$(exists_idx trust_scores idx_trust_score)" == "0" ]]; then run "ALTER TABLE trust_scores ADD INDEX idx_trust_score (score)"; fi
if [[ "$(exists_idx users idx_users_role)" == "0" ]]; then run "ALTER TABLE users ADD INDEX idx_users_role (role)"; fi
if [[ "$(exists_idx users idx_users_created_at)" == "0" ]]; then run "ALTER TABLE users ADD INDEX idx_users_created_at (created_at)"; fi

echo "Migration completed"
