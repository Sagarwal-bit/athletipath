const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/summary/:studentId", async (req, res) => {
  const studentId = req.params.studentId;

  const [[activity]] = await db.query(
    "SELECT COUNT(*) as count, IFNULL(SUM(distance),0) as distance FROM activity_logs WHERE student_id=?",
    [studentId]
  );

  const [[trust]] = await db.query(
    "SELECT score FROM trust_scores WHERE student_id=?",
    [studentId]
  );

  const [[events]] = await db.query(
    "SELECT COUNT(*) as count FROM events"
  );

  res.json({
    activities: activity.count,
    distance: activity.distance,
    trust: trust?.score || 50,
    events: events.count
  });
});

module.exports = router;
