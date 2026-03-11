DROP PROCEDURE IF EXISTS add_col_if_missing;
DELIMITER $$
CREATE PROCEDURE add_col_if_missing(
  IN p_table VARCHAR(128),
  IN p_column VARCHAR(128),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL add_col_if_missing('events', 'subdomain', "VARCHAR(120) NOT NULL DEFAULT 'general'");
CALL add_col_if_missing('events', 'event_type', "VARCHAR(80) NOT NULL DEFAULT 'competition'");
CALL add_col_if_missing('events', 'country', "VARCHAR(120) NOT NULL DEFAULT 'India'");
CALL add_col_if_missing('events', 'start_date', 'DATE NULL');
CALL add_col_if_missing('events', 'registration_deadline', 'DATE NULL');
CALL add_col_if_missing('events', 'source', "VARCHAR(190) NOT NULL DEFAULT 'curated_admin'");
CALL add_col_if_missing('events', 'registration_url', 'VARCHAR(350) NULL');
CALL add_col_if_missing('events', 'updated_at', 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP');

UPDATE events
SET start_date = COALESCE(start_date, event_date),
    registration_deadline = COALESCE(registration_deadline, deadline),
    event_type = COALESCE(NULLIF(event_type, ''), category, 'competition'),
    country = COALESCE(NULLIF(country, ''), 'India');

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

CALL add_col_if_missing('student_profiles', 'city', 'VARCHAR(120) NULL');
CALL add_col_if_missing('student_profiles', 'state', 'VARCHAR(120) NULL');
CALL add_col_if_missing('student_profiles', 'country', 'VARCHAR(120) NULL');
CALL add_col_if_missing('teacher_profiles', 'city', 'VARCHAR(120) NULL');
CALL add_col_if_missing('teacher_profiles', 'state', 'VARCHAR(120) NULL');
CALL add_col_if_missing('teacher_profiles', 'country', 'VARCHAR(120) NULL');

DROP PROCEDURE IF EXISTS add_col_if_missing;
