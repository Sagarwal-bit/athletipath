const express = require("express");
const db = require("../config/db");

const router = express.Router();

// generate notifications for all users
router.post("/generate", async (req,res)=>{
  const [events] = await db.query("SELECT * FROM events");

  const [users] = await db.query("SELECT id FROM users WHERE role='student'");

  for (let e of events) {
    for (let u of users) {
      await db.query(
        "INSERT INTO notifications (user_id,event_id,notify_date) VALUES (?,?,?)",
        [u.id, e.id, e.deadline]
      );
    }
  }

  res.json({ message:"Notifications generated" });
});

// get user notifications
router.get("/:userId", async (req,res)=>{
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
