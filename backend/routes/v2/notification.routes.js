const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { asyncHandler } = require("../../middleware/errors");
const {
  getUserNotifications,
  markNotificationRead,
} = require("../../services/notification.service");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await getUserNotifications(Number(req.user.id));
    return res.json(rows);
  })
);

router.patch(
  "/:notificationId/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await markNotificationRead(Number(req.params.notificationId), Number(req.user.id));
    return res.json({ message: "Notification marked read" });
  })
);

module.exports = router;
