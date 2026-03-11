const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");
const {
  listUpcomingEvents,
  getRecommendedEventsForUser,
  upsertEvent,
} = require("../services/event.service");

const router = express.Router();

function requireAdminEventPublisher(req, res, next) {
  if (!["admin", "teacher", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin/teacher can add events" });
  }
  return next();
}

router.post(
  "/add",
  requireAuth,
  requireAdminEventPublisher,
  asyncHandler(async (req, res) => {
    await upsertEvent({ ...req.body, source: req.body.source || "curated_admin" });
    res.json({ message: "Event saved" });
  })
);

router.post(
  "/",
  requireAuth,
  requireAdminEventPublisher,
  asyncHandler(async (req, res) => {
    await upsertEvent({ ...req.body, source: req.body.source || "curated_admin" });
    res.json({ message: "Event saved" });
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await listUpcomingEvents({
      domain: req.query.domain,
      country: req.query.country,
      subdomain: req.query.subdomain,
      days: req.query.days || 180,
      limit: req.query.limit || 200,
    });
    res.json(rows);
  })
);

router.get(
  "/upcoming",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await listUpcomingEvents({
      domain: req.query.domain,
      country: req.query.country,
      subdomain: req.query.subdomain,
      days: req.query.days || 90,
      limit: req.query.limit || 100,
    });
    res.json(rows);
  })
);

router.get(
  "/domain/:domain",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await listUpcomingEvents({
      domain: req.params.domain,
      country: req.query.country,
      subdomain: req.query.subdomain,
      days: req.query.days || 180,
      limit: req.query.limit || 120,
    });
    res.json(rows);
  })
);

router.get(
  "/recommended/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const requesterId = Number(req.user.id);
    const role = String(req.user.role || "").toLowerCase();
    if (!(requesterId === userId || ["admin", "super_admin", "coach", "teacher"].includes(role))) {
      return res.status(403).json({ error: "Forbidden: access denied" });
    }
    const result = await getRecommendedEventsForUser(userId, {
      limit: req.query.limit || 20,
    });
    res.json(result);
  })
);

router.get(
  "/legacy/all",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query("SELECT * FROM events ORDER BY COALESCE(start_date, event_date)");
    res.json(rows);
  })
);

module.exports = router;
