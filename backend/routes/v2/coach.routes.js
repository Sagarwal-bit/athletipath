const express = require("express");
const db = require("../../config/db");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");
const { applyTrustPenalty, getTrustScore, upsertTrustScore } = require("../../services/trust.service");
const { completeMilestone } = require("../../services/roadmap.service");
const { getCoachDashboard } = require("../../services/analytics.service");
const { createNotification } = require("../../services/notification.service");

const router = express.Router();

router.use(requireAuth, authorizeRoles("coach", "admin"));

router.get(
  "/milestone-approvals",
  asyncHandler(async (req, res) => {
    const status = req.query.status || "pending";

    const [rows] = await db.query(
      `SELECT ma.id, ma.student_id, u.name AS student_name, ma.domain, ma.subdomain, ma.step, ma.status, ma.created_at
       FROM milestone_approvals ma
       JOIN users u ON u.id = ma.student_id
       WHERE ma.status=?
       ORDER BY ma.created_at ASC`,
      [status]
    );

    return res.json(rows);
  })
);

router.post(
  "/milestone-approvals/:approvalId/review",
  asyncHandler(async (req, res) => {
    const approvalId = Number(req.params.approvalId);
    const { status, rating, suggestion, trustAdjustment = 0 } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }

    const [[approval]] = await db.query(
      `SELECT id, student_id, domain, subdomain, step
       FROM milestone_approvals
       WHERE id=?`,
      [approvalId]
    );

    if (!approval) {
      return res.status(404).json({ error: "Approval request not found" });
    }

    await db.query(
      `UPDATE milestone_approvals
       SET status=?, reviewed_by=?, reviewed_at=NOW(), rating=?, suggestion=?, updated_at=NOW()
       WHERE id=?`,
      [status, req.user.id, rating || null, suggestion || null, approvalId]
    );

    if (status === "approved") {
      await completeMilestone({
        studentId: approval.student_id,
        domain: approval.domain,
        subdomain: approval.subdomain,
        step: approval.step,
      });
    }

    if (Number(trustAdjustment) < 0) {
      await applyTrustPenalty(approval.student_id, Math.abs(Number(trustAdjustment)), "coach_review_penalty");
    } else if (Number(trustAdjustment) > 0) {
      const current = await getTrustScore(approval.student_id);
      await upsertTrustScore(approval.student_id, current + Number(trustAdjustment));
    }

    await createNotification({
      userId: approval.student_id,
      type: "coach_review_result",
      title: `Milestone ${status}`,
      message: suggestion || `Coach marked your milestone as ${status}.`,
      relatedId: approvalId,
    });

    return res.json({ message: "Review submitted" });
  })
);

router.post(
  "/students/:studentId/trust",
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.studentId);
    const change = Number(req.body.change || 0);

    const current = await getTrustScore(studentId);
    if (change < 0) {
      const next = await applyTrustPenalty(studentId, Math.abs(change), "coach_manual_adjustment");
      return res.json({ score: next, previous: current });
    }

    const next = Math.min(100, current + change);
    await upsertTrustScore(studentId, next);
    return res.json({ score: next, previous: current });
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const dashboard = await getCoachDashboard(Number(req.user.id));
    return res.json(dashboard);
  })
);

module.exports = router;
