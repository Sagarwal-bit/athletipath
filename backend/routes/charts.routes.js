const express = require("express");
const db = require("../config/db");
const { getRoadmap } = require("../utils/roadmap");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");

const router = express.Router();

// activity chart
router.get("/activity/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE(created_at) as day,
              SUM(distance) as distance,
              AVG(COALESCE(speed, 0)) as avg_speed
       FROM activity_logs
       WHERE student_id=?
       GROUP BY day
       ORDER BY day`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load activity chart data" });
  }
});

// trust score
router.get("/trust/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT score, last_update FROM trust_scores WHERE student_id=?",
      [req.params.studentId]
    );
    res.json(rows[0] || { score: 50, last_update: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load trust score chart data" });
  }
});

router.get("/summary/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";
    const roadmap = getRoadmap(domain, subdomain);
    if (!roadmap) {
      return res.status(400).json({ error: "Invalid domain/subdomain selection" });
    }

    const [[distanceRow]] = await db.query(
      `SELECT COUNT(*) as activityCount,
              IFNULL(SUM(distance), 0) as totalDistance,
              IFNULL(AVG(CASE
                           WHEN speed IS NOT NULL AND speed > 0 THEN speed
                           WHEN duration > 0 THEN (distance / duration) * 3600
                           ELSE NULL
                         END), 0) as averageSpeed
       FROM activity_logs
       WHERE student_id=?`,
      [studentId]
    );

    const [[weeklyRow]] = await db.query(
      `SELECT COUNT(*) as weeklyActivities
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [studentId]
    );

    const [[trustRow]] = await db.query(
      "SELECT score, last_update FROM trust_scores WHERE student_id=?",
      [studentId]
    );

    const [progressRows] = await db.query(
      `SELECT step
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=? AND completed=true`,
      [studentId, domain, subdomain]
    );

    const completedSet = new Set(progressRows.map((row) => row.step));
    const progressPercent = roadmap.milestones.length
      ? (roadmap.milestones.filter((m) => completedSet.has(m.title)).length / roadmap.milestones.length) * 100
      : 0;

    const [anomalyRows] = await db.query(
      `SELECT distance, duration, speed
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [studentId]
    );
    const anomalyCount = anomalyRows.filter((a) => {
      const derivedSpeed =
        Number(a.speed) > 0
          ? Number(a.speed)
          : Number(a.duration) > 0
            ? (Number(a.distance) / Number(a.duration)) * 3600
            : 0;
      return derivedSpeed > 45 || Number(a.distance) > 20;
    }).length;

    res.json({
      totalDistance: Number(distanceRow.totalDistance || 0),
      averageSpeed: Number(distanceRow.averageSpeed || 0),
      activityFrequency: Number(weeklyRow.weeklyActivities || 0),
      trustScore: trustRow?.score ?? 50,
      trustTrend: [
        {
          label: trustRow?.last_update
            ? new Date(trustRow.last_update).toISOString().slice(0, 10)
            : "current",
          score: trustRow?.score ?? 50,
        },
      ],
      progressCompletionPercent: Number(progressPercent.toFixed(2)),
      activityCount: Number(distanceRow.activityCount || 0),
      anomalyCount,
      tips: [
        anomalyCount > 0
          ? "Reduce unrealistic speed spikes to maintain trust integrity."
          : "Performance pattern looks consistent.",
        Number(weeklyRow.weeklyActivities || 0) < 3
          ? "Increase weekly sessions for faster progression."
          : "Weekly activity frequency is on track.",
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load analytics summary" });
  }
});

module.exports = router;
