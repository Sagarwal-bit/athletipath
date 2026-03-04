const ROLES = {
  STUDENT: "student",
  COACH: "coach",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  // Backward compatibility with old data
  TEACHER: "teacher",
};

const COACH_EQUIVALENT_ROLES = [ROLES.COACH, ROLES.TEACHER];

module.exports = {
  ROLES,
  COACH_EQUIVALENT_ROLES,
};
