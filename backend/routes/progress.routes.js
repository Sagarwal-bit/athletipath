const express = require("express");
const db = require("../config/db");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");
const {
  getRoadmap,
  getTrustGate,
  getLevelFromPercent,
  getNextTargetPercent,
  estimateDaysToTarget,
} = require("../utils/roadmap");

const router = express.Router();

router.get("/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";
    const roadmap = getRoadmap(domain, subdomain);

    if (!roadmap) {
      return res.status(400).json({ error: "Invalid domain/subdomain selection" });
    }

    const [progressRows] = await db.query(
      `SELECT step, completed
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [studentId, domain, subdomain]
    );

    const [recentActivityRows] = await db.query(
      `SELECT distance, duration, speed, created_at
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)`,
      [studentId]
    );

    const [[trustRow]] = await db.query(
      "SELECT score FROM trust_scores WHERE student_id = ?",
      [studentId]
    );

    const completedSet = new Set(
      progressRows.filter((row) => row.completed).map((row) => row.step)
    );
    const completedCount = roadmap.milestones.filter((m) => completedSet.has(m.title)).length;
    const total = roadmap.milestones.length;
    const completionPercent = total ? (completedCount / total) * 100 : 0;
    const level = getLevelFromPercent(completionPercent);
    const nextTargetPercent = getNextTargetPercent(completionPercent);
    const trustScore = trustRow?.score ?? 50;
    const trustGate = getTrustGate(trustScore);

    const estimatedDaysToNextLevel = estimateDaysToTarget({
      totalMilestones: total,
      completedMilestones: completedCount,
      nextTargetPercent,
      sessionsPerWeek: roadmap.sessionsPerWeek,
      trustGateStatus: trustGate.status,
    });

    const activityFrequencyPerWeek = Number(
      ((recentActivityRows.length / 14) * 7).toFixed(2)
    );

    const anomalyCount = recentActivityRows.filter((a) => {
      const derivedSpeed =
        Number(a.speed) > 0
          ? Number(a.speed)
          : Number(a.duration) > 0
            ? (Number(a.distance) / Number(a.duration)) * 3600
            : 0;
      return derivedSpeed > 45 || Number(a.distance) > 20;
    }).length;

    const riskFlags = [];
    if (activityFrequencyPerWeek < 2) riskFlags.push("inactivity_risk");
    if (anomalyCount > 0) riskFlags.push("unrealistic_performance_pattern");
    if (activityFrequencyPerWeek > 10) riskFlags.push("overtraining_risk");

    const tips = [];
    if (trustScore < 40) tips.push("Roadmap is locked. Upload verified videos and consistent GPS activity.");
    else if (trustScore <= 70) tips.push("Complete only the immediate next milestone to build trust.");
    else tips.push("You have full progression access. Target higher milestone completion per week.");

    if (activityFrequencyPerWeek < 3) tips.push("Recommended training frequency: 3-5 verified sessions/week.");
    if (anomalyCount > 0) tips.push("Avoid unrealistic speed/distance spikes to protect trust score.");

    const nextMilestone = roadmap.milestones.find((m) => !completedSet.has(m.title)) || null;
    if (nextMilestone) {
      tips.push(`Next milestone focus: ${nextMilestone.title}`);
    }

    const trainingFrequencyRecommendation =
      trustScore < 40
        ? "3 sessions/week (validation recovery mode)"
        : trustScore <= 70
          ? "4 sessions/week (limited progression mode)"
          : `${roadmap.sessionsPerWeek}+ sessions/week`;

    res.json({
      domain,
      subdomain,
      totalSteps: total,
      completedSteps: completedCount,
      completionPercent: Number(completionPercent.toFixed(2)),
      level,
      nextTargetPercent,
      estimatedDaysToNextLevel,
      trainingFrequencyRecommendation,
      trustScore,
      roadmapAccess: trustGate.status,
      roadmapMessage: trustGate.message,
      activityFrequencyPerWeek,
      riskFlags,
      tips,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate progress" });
  }
});

router.post("/recalculate/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";
    const roadmap = getRoadmap(domain, subdomain);
    if (!roadmap) {
      return res.status(400).json({ error: "Invalid domain/subdomain selection" });
    }

    const [progressRows] = await db.query(
      `SELECT step, completed
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [studentId, domain, subdomain]
    );
    const completedSet = new Set(
      progressRows.filter((row) => row.completed).map((row) => row.step)
    );
    const completedCount = roadmap.milestones.filter((m) => completedSet.has(m.title)).length;
    const percent = roadmap.milestones.length
      ? (completedCount / roadmap.milestones.length) * 100
      : 0;

    res.json({
      level: getLevelFromPercent(percent),
      completionPercent: Number(percent.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Recalculation failed" });
  }
});

module.exports = router;
