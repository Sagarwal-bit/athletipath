const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");
const {
  getStudentAnalytics,
  getCoachDashboard,
  getAdminDashboard,
} = require("../../services/analytics.service");

const router = express.Router();

router.get(
  "/student",
  requireAuth,
  authorizeRoles("student"),
  asyncHandler(async (req, res) => {
    const analytics = await getStudentAnalytics(Number(req.user.id), {
      domain: req.query.domain || "sports",
      subdomain: req.query.subdomain || "sprint",
    });
    return res.json(analytics);
  })
);

router.get(
  "/coach",
  requireAuth,
  authorizeRoles("coach", "admin"),
  asyncHandler(async (req, res) => {
    const dashboard = await getCoachDashboard(Number(req.user.id));
    return res.json(dashboard);
  })
);

router.get(
  "/admin",
  requireAuth,
  authorizeRoles("admin", "super_admin"),
  asyncHandler(async (_req, res) => {
    const dashboard = await getAdminDashboard();
    return res.json(dashboard);
  })
);

module.exports = router;
