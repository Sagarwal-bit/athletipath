const express = require("express");
const db = require("../config/db");

const router = express.Router();

// activity chart
router.get("/activity/:studentId", async (req, res) => {
  const [rows] = await db.query(
    `SELECT DATE(created_at) as day, SUM(distance) as distance
     FROM activity_logs
     WHERE student_id=?
     GROUP BY day
     ORDER BY day`,
    [req.params.studentId]
  );
  res.json(rows);
});

// trust score
router.get("/trust/:studentId", async (req, res) => {
  const [rows] = await db.query(
    "SELECT score FROM trust_scores WHERE student_id=?",
    [req.params.studentId]
  );
  res.json(rows[0] || { score: 50 });
});

module.exports = router;
