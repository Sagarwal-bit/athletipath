const db = require("../config/db");
const { getRoadmap } = require("../utils/roadmap");
const { getTrustScore } = require("./trust.service");

function getMilestoneRules(milestoneNumber) {
  if (milestoneNumber >= 7) {
    return {
      trustThreshold: 70,
      minSpeed: 10,
      requiresCoachApproval: true,
    };
  }

  if (milestoneNumber >= 4) {
    return {
      trustThreshold: 50,
      minSpeed: 7,
      requiresCoachApproval: false,
    };
  }

  return {
    trustThreshold: 40,
    minSpeed: 4,
    requiresCoachApproval: false,
  };
}

async function getCompletedStepSet(studentId, domain, subdomain) {
  const [rows] = await db.query(
    `SELECT step FROM roadmap_progress
     WHERE student_id=? AND domain=? AND subdomain=? AND completed=true`,
    [studentId, domain, subdomain]
  );
  return new Set(rows.map((r) => r.step));
}

async function getPerformanceSnapshot(studentId) {
  const [[row]] = await db.query(
    `SELECT IFNULL(AVG(CASE
        WHEN speed IS NOT NULL AND speed > 0 THEN speed
        WHEN duration > 0 THEN (distance / duration) * 3600
        ELSE NULL
      END), 0) AS avgSpeed,
      COUNT(*) AS activityCount
     FROM activity_logs
     WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [studentId]
  );

  return {
    avgSpeed: Number(row?.avgSpeed || 0),
    activityCount: Number(row?.activityCount || 0),
  };
}

async function evaluateMilestoneEligibility({ studentId, domain, subdomain, step }) {
  const roadmap = getRoadmap(domain, subdomain);
  if (!roadmap) {
    return { eligible: false, reason: "invalid_roadmap" };
  }

  const milestone = roadmap.milestones.find((m) => m.title === step);
  if (!milestone) {
    return { eligible: false, reason: "step_not_in_roadmap" };
  }

  const rules = getMilestoneRules(milestone.number);
  const trustScore = await getTrustScore(studentId);
  if (trustScore < rules.trustThreshold) {
    return {
      eligible: false,
      reason: "trust_below_threshold",
      trustScore,
      requiredTrust: rules.trustThreshold,
      rules,
    };
  }

  const { avgSpeed } = await getPerformanceSnapshot(studentId);
  if (avgSpeed < rules.minSpeed) {
    return {
      eligible: false,
      reason: "performance_below_threshold",
      avgSpeed,
      requiredSpeed: rules.minSpeed,
      rules,
    };
  }

  if (rules.requiresCoachApproval) {
    return {
      eligible: false,
      reason: "coach_approval_required",
      rules,
      requiresCoachApproval: true,
    };
  }

  return {
    eligible: true,
    rules,
    trustScore,
    avgSpeed,
  };
}

async function createMilestoneApprovalRequest({ studentId, domain, subdomain, step }) {
  await db.query(
    `INSERT INTO milestone_approvals (student_id, domain, subdomain, step, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', NOW())
     ON DUPLICATE KEY UPDATE status='pending', updated_at=NOW()`,
    [studentId, domain, subdomain, step]
  );
}

async function completeMilestone({ studentId, domain, subdomain, step }) {
  await db.query(
    `INSERT INTO roadmap_progress (student_id, domain, subdomain, step, completed, completed_at)
     VALUES (?, ?, ?, ?, true, NOW())
     ON DUPLICATE KEY UPDATE completed=true, completed_at=NOW()`,
    [studentId, domain, subdomain, step]
  );
}

module.exports = {
  getMilestoneRules,
  getCompletedStepSet,
  getPerformanceSnapshot,
  evaluateMilestoneEligibility,
  createMilestoneApprovalRequest,
  completeMilestone,
};
