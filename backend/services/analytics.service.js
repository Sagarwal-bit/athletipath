const db = require("../config/db");
const { getRoadmap } = require("../utils/roadmap");
const { getConsistencyScore, slope } = require("./recommendation.service");

async function getStudentAnalytics(studentId, { domain = "sports", subdomain = "sprint" } = {}) {
  const roadmap = getRoadmap(domain, subdomain);
  if (!roadmap) {
    const err = new Error("Invalid domain/subdomain selection");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  const [monthlyDistance] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, ROUND(SUM(distance), 2) AS totalDistance
     FROM activity_logs
     WHERE student_id=?
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY month`,
    [studentId]
  );

  const [speedPoints] = await db.query(
    `SELECT DATE(created_at) AS day,
        ROUND(AVG(CASE
          WHEN speed IS NOT NULL AND speed > 0 THEN speed
          WHEN duration > 0 THEN (distance / duration) * 3600
          ELSE 0
        END), 2) AS avgSpeed
      FROM activity_logs
      WHERE student_id=?
      GROUP BY DATE(created_at)
      ORDER BY day`,
    [studentId]
  );

  const [trustTrend] = await db.query(
    `SELECT DATE(last_update) AS day, score
     FROM trust_scores_history
     WHERE student_id=?
     ORDER BY day`,
    [studentId]
  );

  const [milestoneTimeline] = await db.query(
    `SELECT step, DATE(completed_at) AS completedOn
     FROM roadmap_progress
     WHERE student_id=? AND domain=? AND subdomain=? AND completed=true
     ORDER BY completed_at`,
    [studentId, domain, subdomain]
  );

  const [recentDaily] = await db.query(
    `SELECT DATE(created_at) as day, COUNT(*) as count
     FROM activity_logs
     WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day`,
    [studentId]
  );

  const speedTrend = slope(speedPoints.map((s) => Number(s.avgSpeed || 0)));
  const consistencyScore = getConsistencyScore(recentDaily);

  return {
    monthlyDistance,
    speedImprovement: speedPoints,
    trustTrend,
    milestoneTimeline,
    insights: {
      speedTrend: Number(speedTrend.toFixed(2)),
      consistencyScore,
    },
  };
}

async function getCoachDashboard(coachId) {
  const [students] = await db.query(
    `SELECT s.id, s.name, s.email,
      IFNULL(t.score, 50) AS trustScore,
      IFNULL(a.activityCount, 0) AS monthlyActivities,
      IFNULL(a.avgSpeed, 0) AS avgSpeed,
      IFNULL(a.lastActiveAt, NULL) AS lastActiveAt
     FROM users s
     LEFT JOIN trust_scores t ON t.student_id = s.id
     LEFT JOIN (
       SELECT student_id,
         COUNT(*) AS activityCount,
         ROUND(AVG(CASE
           WHEN speed IS NOT NULL AND speed > 0 THEN speed
           WHEN duration > 0 THEN (distance / duration) * 3600
           ELSE 0
         END), 2) AS avgSpeed,
         MAX(created_at) AS lastActiveAt
       FROM activity_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY student_id
     ) a ON a.student_id = s.id
     LEFT JOIN student_coach_map scm ON scm.student_id = s.id
     WHERE s.role='student' AND (scm.coach_id=? OR ? IN (SELECT id FROM users WHERE role='admin'))
     ORDER BY trustScore DESC, monthlyActivities DESC`,
    [coachId, coachId]
  );

  const now = Date.now();
  const inactiveStudents = students.filter((s) => {
    if (!s.lastActiveAt) return true;
    const days = (now - new Date(s.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 7;
  });

  return {
    studentPerformance: students,
    riskAlerts: students
      .filter((s) => Number(s.trustScore) < 40 || Number(s.monthlyActivities) < 3)
      .map((s) => ({
        studentId: s.id,
        name: s.name,
        trustScore: Number(s.trustScore),
        monthlyActivities: Number(s.monthlyActivities),
        type: Number(s.trustScore) < 40 ? "low_trust" : "low_activity",
      })),
    topPerformers: students.slice(0, 5),
    inactiveStudents,
  };
}

async function getAdminDashboard() {
  const [[totals]] = await db.query(
    `SELECT
      COUNT(*) AS totalUsers,
      SUM(CASE WHEN role='student' THEN 1 ELSE 0 END) AS totalStudents,
      SUM(CASE WHEN role='coach' OR role='teacher' THEN 1 ELSE 0 END) AS totalCoaches,
      SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END) AS totalAdmins
      ,SUM(CASE WHEN role='super_admin' THEN 1 ELSE 0 END) AS totalSuperAdmins
     FROM users`
  );

  const [domainDistribution] = await db.query(
    `SELECT domain, COUNT(*) AS users
     FROM student_roadmap_selection
     GROUP BY domain
     ORDER BY users DESC`
  );

  const [[trustRow]] = await db.query(
    "SELECT ROUND(AVG(score), 2) AS avgTrust FROM trust_scores"
  );

  const [growth] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS newUsers
     FROM users
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY month`
  );

  return {
    totals,
    domainDistribution,
    avgTrust: Number(trustRow?.avgTrust || 0),
    platformGrowth: growth,
  };
}

module.exports = {
  getStudentAnalytics,
  getCoachDashboard,
  getAdminDashboard,
};
