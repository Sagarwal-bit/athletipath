const express = require("express");
const db = require("../config/db");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");
const {
  listDomains,
  listSpecializations,
  getRoadmap,
  getTrustGate,
  getLevelFromPercent,
  getNextTargetPercent,
  estimateDaysToTarget,
} = require("../utils/roadmap");

const router = express.Router();

function getSafeRoadmapSelection(domain, subdomain) {
  if (domain && subdomain && getRoadmap(domain, subdomain)) {
    return { domain, subdomain };
  }

  return { domain: "sports", subdomain: "sprint" };
}

router.get("/catalog", requireAuth, (req, res) => {
  const domains = listDomains().map((d) => ({
    ...d,
    specializations: listSpecializations(d.key),
  }));

  res.json({
    domains,
    defaultSelection: { domain: "sports", subdomain: "sprint" },
  });
});

router.get("/status/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;
    const selected = getSafeRoadmapSelection(req.query.domain, req.query.subdomain);
    const roadmap = getRoadmap(selected.domain, selected.subdomain);

    const [progressRows] = await db.query(
      `SELECT step, completed
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [studentId, selected.domain, selected.subdomain]
    );

    const completedSet = new Set(
      progressRows.filter((r) => r.completed).map((r) => r.step)
    );

    const milestones = roadmap.milestones.map((m) => ({
      ...m,
      completed: completedSet.has(m.title),
    }));

    const completedCount = milestones.filter((m) => m.completed).length;
    const total = milestones.length;
    const completionPercent = total === 0 ? 0 : (completedCount / total) * 100;

    const nextMilestone =
      milestones.find((m) => !m.completed) || null;

    const [[trustRow]] = await db.query(
      "SELECT score FROM trust_scores WHERE student_id = ?",
      [studentId]
    );
    const trustScore = trustRow?.score ?? 50;
    const gate = getTrustGate(trustScore);
    const nextTargetPercent = getNextTargetPercent(completionPercent);
    const estimatedDaysToNextLevel = estimateDaysToTarget({
      totalMilestones: total,
      completedMilestones: completedCount,
      nextTargetPercent,
      sessionsPerWeek: roadmap.sessionsPerWeek,
      trustGateStatus: gate.status,
    });

    const [recentActivityRows] = await db.query(
      `SELECT distance, duration, speed, created_at
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)`,
      [studentId]
    );
    const activityFrequencyPerWeek = Number(
      ((recentActivityRows.length / 14) * 7).toFixed(2)
    );

    const anomalyFlags = recentActivityRows
      .filter((a) => {
        const calculatedSpeed =
          Number(a.speed) > 0
            ? Number(a.speed)
            : a.duration > 0
              ? (Number(a.distance) / Number(a.duration)) * 3600
              : 0;
        return calculatedSpeed > 45 || Number(a.distance) > 20;
      })
      .length;

    const recommendedTrainingFrequency =
      trustScore < 40
        ? "3 verified sessions/week (focus on consistency)"
        : trustScore <= 70
          ? "4 verified sessions/week (sequential milestone mode)"
          : `${roadmap.sessionsPerWeek}+ verified sessions/week`;

    const tips = [];
    if (trustScore < 40) tips.push("Upload clear activity video proofs for each session.");
    if (activityFrequencyPerWeek < 3) tips.push("Increase training frequency to at least 3 sessions/week.");
    if (anomalyFlags > 0) tips.push("Some activities look unrealistic; keep pace and distance within normal range.");
    if (nextMilestone) tips.push(`Prioritize next milestone: ${nextMilestone.title}.`);

    let upcomingEvents = [];
    try {
      const [events] = await db.query(
        `SELECT id, title, deadline, location
         FROM events
         WHERE LOWER(domain)=? AND deadline >= CURDATE()
         ORDER BY deadline
         LIMIT 3`,
        [selected.domain]
      );
      upcomingEvents = events;
    } catch (eventsErr) {
      // ignore optional event lookup failure
      console.error(eventsErr);
    }

    res.json({
      selection: selected,
      roadmap: {
        domainLabel: roadmap.domainLabel,
        subdomainLabel: roadmap.subdomainLabel,
        milestones,
      },
      trust: {
        score: trustScore,
        ...gate,
      },
      progress: {
        completedCount,
        totalMilestones: total,
        completionPercent: Number(completionPercent.toFixed(2)),
        level: getLevelFromPercent(completionPercent),
        nextTargetPercent,
        nextMilestone,
        estimatedDaysToNextLevel,
      },
      recommendations: {
        trainingFrequency: recommendedTrainingFrequency,
        activityFrequencyPerWeek,
        tips,
      },
      anomalyDetection: {
        flaggedActivities: anomalyFlags,
      },
      notifications: {
        upcomingEvents,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load roadmap status" });
  }
});

// get completed steps for all domains/subdomains or a selected roadmap
router.get("/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { domain, subdomain } = req.query;

    if (domain && subdomain) {
      const [rows] = await db.query(
        `SELECT * FROM roadmap_progress
         WHERE student_id=? AND domain=? AND subdomain=?
         ORDER BY id DESC`,
        [studentId, domain, subdomain]
      );
      return res.json(rows);
    }

    const [rows] = await db.query(
      "SELECT * FROM roadmap_progress WHERE student_id=? ORDER BY id DESC",
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load roadmap progress rows" });
  }
});

// mark step complete
router.post("/complete", requireAuth, async (req, res) => {
  try {
    const { domain, subdomain, step } = req.body;
    const student_id = Number(req.user.id);
    if (!domain || !subdomain || !step) {
      return res.status(400).json({ error: "domain, subdomain, and step are required" });
    }

    const roadmap = getRoadmap(domain, subdomain);
    if (!roadmap) {
      return res.status(400).json({ error: "Invalid domain/subdomain selection" });
    }

    const validSteps = roadmap.milestones.map((m) => m.title);
    if (!validSteps.includes(step)) {
      return res.status(400).json({ error: "Step does not belong to selected roadmap" });
    }

    const [[trustRow]] = await db.query(
      "SELECT score FROM trust_scores WHERE student_id = ?",
      [student_id]
    );
    const trustScore = trustRow?.score ?? 50;
    const gate = getTrustGate(trustScore);

    if (gate.status === "locked") {
      return res.status(403).json({
        error: "Roadmap locked due to low trust score",
        trustScore,
      });
    }

    const [progressRows] = await db.query(
      `SELECT step, completed
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [student_id, domain, subdomain]
    );
    const completedSet = new Set(
      progressRows.filter((r) => r.completed).map((r) => r.step)
    );
    const nextMilestone = roadmap.milestones.find((m) => !completedSet.has(m.title));

    if (gate.status === "limited" && nextMilestone && step !== nextMilestone.title) {
      return res.status(403).json({
        error: "Limited progression mode allows only the next milestone",
        allowedStep: nextMilestone.title,
        trustScore,
      });
    }

    await db.query(
      `INSERT INTO roadmap_progress
       (student_id, domain, subdomain, step, completed)
       VALUES (?, ?, ?, ?, true)
       ON DUPLICATE KEY UPDATE completed=true`,
      [student_id, domain, subdomain, step]
    );

    res.json({
      message: "Step marked completed",
      trustScore,
      gateStatus: gate.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark step complete" });
  }
});

module.exports = router;
