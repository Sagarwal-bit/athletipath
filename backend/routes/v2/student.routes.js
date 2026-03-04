const express = require("express");
const db = require("../../config/db");
const upload = require("../../middleware/upload");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");
const { signMediaToken } = require("../../middleware/security");
const {
  validateActivityFields,
  detectGpsJump,
  detectDuplicateVideo,
} = require("../../services/validation.service");
const {
  recalculateTrustScore,
  applyTrustPenalty,
  getTrustScore,
} = require("../../services/trust.service");
const {
  evaluateMilestoneEligibility,
  createMilestoneApprovalRequest,
  completeMilestone,
} = require("../../services/roadmap.service");
const {
  generateRecommendations,
  slope,
  getConsistencyScore,
} = require("../../services/recommendation.service");
const { createNotification, notifyUsersByRole } = require("../../services/notification.service");
const { getStudentAnalytics } = require("../../services/analytics.service");
const { logSecurityEvent, calculateUserRiskScore } = require("../../services/security.service");
const { encryptText } = require("../../services/encryption.service");
const { getRoadmap } = require("../../utils/roadmap");

const router = express.Router();

router.use(requireAuth, authorizeRoles("student"));

router.post(
  "/activity/log",
  upload.single("video"),
  asyncHandler(async (req, res) => {
    const studentId = Number(req.user.id);
    const { errors, normalized } = validateActivityFields(req.body);
    if (errors.length) {
      return res.status(400).json({ error: "Invalid activity input", details: errors });
    }

    const gpsCheck = await detectGpsJump(studentId, normalized.latitude, normalized.longitude);
    const duplicateVideo = await detectDuplicateVideo(studentId, req.file);
    const [[lastActivity]] = await db.query(
      `SELECT distance, duration, speed, created_at
       FROM activity_logs
       WHERE student_id=?
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId]
    );

    let trustPenalty = 0;
    const validationFlags = [];

    if (gpsCheck.jumpDetected) {
      trustPenalty += 8;
      validationFlags.push("abnormal_gps_jump");
    }
    if (duplicateVideo.duplicate) {
      trustPenalty += 10;
      validationFlags.push(duplicateVideo.reason);
    }
    if (normalized.speed > 45) {
      trustPenalty += 6;
      validationFlags.push("unrealistic_speed");
    }
    if (
      lastActivity &&
      Number(lastActivity.distance) === Number(normalized.distance) &&
      Number(lastActivity.duration) === Number(normalized.duration) &&
      Math.abs(Number(lastActivity.speed || 0) - Number(normalized.speed || 0)) < 0.1
    ) {
      trustPenalty += 7;
      validationFlags.push("repeated_identical_activity_pattern");
    }
    if (req.file?.originalname && /\d{4}[-_]\d{2}[-_]\d{2}/.test(req.file.originalname)) {
      const fileDate = req.file.originalname.match(/\d{4}[-_]\d{2}[-_]\d{2}/)?.[0]?.replace(/_/g, "-");
      const today = new Date().toISOString().slice(0, 10);
      if (fileDate && fileDate !== today) {
        trustPenalty += 4;
        validationFlags.push("video_timestamp_mismatch");
      }
    }

    try {
      await db.query(
        `INSERT INTO activity_logs
        (student_id, distance, duration, latitude, longitude, speed, video_path, encrypted_latitude, encrypted_longitude, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          studentId,
          normalized.distance,
          normalized.duration,
          normalized.latitude,
          normalized.longitude,
          normalized.speed,
          req.file ? req.file.path : null,
          encryptText(normalized.latitude),
          encryptText(normalized.longitude),
        ]
      );
    } catch (err) {
      if (!["ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
      await db.query(
        `INSERT INTO activity_logs
        (student_id, distance, duration, latitude, longitude, speed, video_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          studentId,
          normalized.distance,
          normalized.duration,
          normalized.latitude,
          normalized.longitude,
          normalized.speed,
          req.file ? req.file.path : null,
        ]
      );
    }

    let trustScore = await recalculateTrustScore(studentId);

    if (trustPenalty > 0) {
      trustScore = await applyTrustPenalty(studentId, trustPenalty, validationFlags.join(","));
    }

    if (trustScore < 40) {
      await createNotification({
        userId: studentId,
        type: "trust_warning",
        title: "Low trust warning",
        message: `Trust dropped to ${trustScore}. Progression is locked until you recover above 40.`,
      });
    }

    if (validationFlags.length) {
      await logSecurityEvent({
        userId: studentId,
        eventType: "activity_anomaly",
        severity: "medium",
        ipAddress: req.ip,
        details: { validationFlags },
      });
      await notifyUsersByRole({
        role: "admin",
        type: "anomaly_alert",
        title: "Student activity anomaly detected",
        message: `Student ${studentId} flagged: ${validationFlags.join(", ")}`,
      });
    }

    const risk = await calculateUserRiskScore(studentId);

    return res.json({
      message: "Activity logged",
      trustScore,
      validationFlags,
      risk,
    });
  })
);

router.get(
  "/activity",
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT id, student_id, distance, duration, latitude, longitude, speed, video_path, created_at
       FROM activity_logs
       WHERE student_id=?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json(rows.map((row) => ({
      ...row,
      videoAccessUrl: row.video_path
        ? `/api/v2/media/stream?token=${encodeURIComponent(signMediaToken({ path: row.video_path, userId: req.user.id }))}`
        : null,
    })));
  })
);

router.get(
  "/roadmap/status",
  asyncHandler(async (req, res) => {
    const studentId = Number(req.user.id);
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";

    const roadmap = getRoadmap(domain, subdomain);
    if (!roadmap) {
      return res.status(400).json({ error: "Invalid domain/subdomain selection" });
    }

    const [progressRows] = await db.query(
      `SELECT step, completed, completed_at
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [studentId, domain, subdomain]
    );

    const completedSet = new Set(progressRows.filter((r) => r.completed).map((r) => r.step));
    const milestones = roadmap.milestones.map((m) => ({ ...m, completed: completedSet.has(m.title) }));
    const completed = milestones.filter((m) => m.completed).length;
    const completionPercent = milestones.length ? (completed / milestones.length) * 100 : 0;

    return res.json({
      domain,
      subdomain,
      milestones,
      completed,
      total: milestones.length,
      completionPercent: Number(completionPercent.toFixed(2)),
      trustScore: await getTrustScore(studentId),
    });
  })
);

router.post(
  "/roadmap/complete",
  asyncHandler(async (req, res) => {
    const studentId = Number(req.user.id);
    const { domain, subdomain, step } = req.body;

    if (!domain || !subdomain || !step) {
      return res.status(400).json({ error: "domain, subdomain and step are required" });
    }

    const eligibility = await evaluateMilestoneEligibility({ studentId, domain, subdomain, step });

    if (eligibility.reason === "coach_approval_required") {
      await createMilestoneApprovalRequest({ studentId, domain, subdomain, step });
      await notifyUsersByRole({
        role: "coach",
        type: "coach_review",
        title: "Milestone approval required",
        message: `Student ${studentId} requested approval for ${step}`,
      });

      return res.status(202).json({
        message: "Milestone submitted for coach approval",
        eligibility,
      });
    }

    if (!eligibility.eligible) {
      return res.status(403).json({
        error: "Milestone eligibility failed",
        eligibility,
      });
    }

    await completeMilestone({ studentId, domain, subdomain, step });

    await createNotification({
      userId: studentId,
      type: "milestone_unlocked",
      title: "Milestone completed",
      message: `${step} completed successfully.`,
    });

    return res.json({ message: "Milestone completed", eligibility });
  })
);

router.get(
  "/recommendations",
  asyncHandler(async (req, res) => {
    const studentId = Number(req.user.id);
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";

    const [[trustRow]] = await db.query(
      "SELECT score FROM trust_scores WHERE student_id=?",
      [studentId]
    );
    const trustScore = Number(trustRow?.score ?? 50);

    const [[freqRow]] = await db.query(
      `SELECT COUNT(*) / 4.0 AS weeklyFrequency
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)`,
      [studentId]
    );

    const [speedRows] = await db.query(
      `SELECT DATE(created_at) day,
          AVG(CASE WHEN speed > 0 THEN speed ELSE (distance / NULLIF(duration,0)) * 3600 END) avgSpeed
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [studentId]
    );

    const [consistencyRows] = await db.query(
      `SELECT DATE(created_at) day, COUNT(*) as count
       FROM activity_logs
       WHERE student_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [studentId]
    );

    const [[progressRow]] = await db.query(
      `SELECT
        SUM(CASE WHEN completed=true THEN 1 ELSE 0 END) AS done,
        COUNT(*) AS total
       FROM roadmap_progress
       WHERE student_id=? AND domain=? AND subdomain=?`,
      [studentId, domain, subdomain]
    );

    const [[approvalRow]] = await db.query(
      `SELECT COUNT(*) as pending
       FROM milestone_approvals
       WHERE student_id=? AND status='pending'`,
      [studentId]
    );

    const recommendations = generateRecommendations({
      trustScore,
      weeklyFrequency: Number(freqRow?.weeklyFrequency || 0),
      speedTrend: slope(speedRows.map((r) => Number(r.avgSpeed || 0))),
      consistencyScore: getConsistencyScore(consistencyRows),
      completionPercent:
        Number(progressRow?.total || 0) > 0
          ? (Number(progressRow?.done || 0) / Number(progressRow?.total || 1)) * 100
          : 0,
      pendingCoachApprovals: Number(approvalRow?.pending || 0),
    });

    await db.query(
      `INSERT INTO recommendation_logs (student_id, payload, created_at)
       VALUES (?, ?, NOW())`,
      [studentId, JSON.stringify(recommendations)]
    );

    return res.json({ recommendations });
  })
);

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const studentId = Number(req.user.id);
    const domain = req.query.domain || "sports";
    const subdomain = req.query.subdomain || "sprint";
    const analytics = await getStudentAnalytics(studentId, { domain, subdomain });
    return res.json(analytics);
  })
);

module.exports = router;
