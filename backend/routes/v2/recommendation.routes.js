const express = require("express");
const db = require("../../config/db");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");

const router = express.Router();

router.get(
  "/latest",
  requireAuth,
  authorizeRoles("student"),
  asyncHandler(async (req, res) => {
    const [[row]] = await db.query(
      `SELECT payload, created_at
       FROM recommendation_logs
       WHERE student_id=?
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (!row) {
      return res.json({ recommendations: [], generatedAt: null });
    }

    return res.json({
      recommendations: JSON.parse(row.payload),
      generatedAt: row.created_at,
    });
  })
);

module.exports = router;
