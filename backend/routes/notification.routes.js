const express = require("express");
const db = require("../config/db");
const sendMail = require("../utils/mailer");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");
const router = express.Router();

// generate notifications for all users
router.post("/generate", requireAuth, async (req, res) => {
  try {
    if (!["admin", "teacher"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only admin/teacher can generate notifications" });
    }

    const [events] = await db.query("SELECT id, title, deadline FROM events");
    const [users] = await db.query(
      "SELECT id, email FROM users WHERE role='student' AND email IS NOT NULL AND email <> ''"
    );

    for (const e of events) {
      for (const u of users) {
        await db.query(
          "INSERT INTO notifications (user_id,event_id,notify_date) VALUES (?,?,?)",
          [u.id, e.id, e.deadline]
        );

        await sendMail(
          u.email,
          "New Event Notification",
          `You have a new event: ${e.title}\nDeadline: ${e.deadline}`
        );
      }
    }

    res.json({ message: "Notifications generated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate notifications" });
  }
});

// get user notifications
router.get("/:userId", requireAuth, ensureSelfOrAdmin("userId"), async (req, res) => {
  const [rows] = await db.query(
    `SELECT e.title, e.deadline, n.status
     FROM notifications n
     JOIN events e ON n.event_id = e.id
     WHERE n.user_id=?`,
    [req.params.userId]
  );
  res.json(rows);
});

module.exports = router;
