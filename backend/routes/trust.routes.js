const express = require("express");
const db = require("../config/db");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");
const { computeTrustScore } = require("../utils/trust");

const router = express.Router();

/**
 * GET trust score
 */
router.get("/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;

    const [rows] = await db.query(
      "SELECT score FROM trust_scores WHERE student_id = ?",
      [studentId]
    );

    res.json({ score: rows[0]?.score ?? 50 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trust score" });
  }
});

/**
 * Increment trust score (manual/system-based)
 */
router.post("/increment", requireAuth, async (req, res) => {
  try {
    if (!["admin", "teacher"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only admin/teacher can increment trust" });
    }

    const { student_id, change } = req.body;

    if (!student_id || typeof change !== "number") {
      return res.status(400).json({ error: "Invalid input" });
    }

    await db.query(
      `INSERT INTO trust_scores (student_id, score, last_update)
       VALUES (?, LEAST(100, 50 + ?), CURDATE())
       ON DUPLICATE KEY UPDATE
         score = LEAST(100, score + ?),
         last_update = CURDATE()`,
      [student_id, change, change]
    );

    res.json({ message: "Trust score incremented" });
  } catch (err) {
    res.status(500).json({ error: "Trust score update failed" });
  }
});

/**
 * Recalculate trust score from activity logs (NEW LOGIC)
 */
router.post("/recalculate/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const { studentId } = req.params;

    const [activities] = await db.query(
      "SELECT distance, duration, speed, video_path FROM activity_logs WHERE student_id = ?",
      [studentId]
    );

    const score = computeTrustScore(activities);

    await db.query(
      `INSERT INTO trust_scores (student_id, score, last_update)
       VALUES (?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE
         score = VALUES(score),
         last_update = CURDATE()`,
      [studentId, score]
    );

    res.json({ score });
  } catch (err) {
    res.status(500).json({ error: "Trust score recalculation failed" });
  }
});

module.exports = router;
