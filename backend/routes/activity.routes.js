const express = require("express");
const db = require("../config/db");
const upload = require("../middleware/upload");
const { requireAuth, ensureSelfOrAdmin } = require("../middleware/auth");
const { computeTrustScore } = require("../utils/trust");

const router = express.Router();

router.get("/:studentId", requireAuth, ensureSelfOrAdmin("studentId"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, student_id, distance, duration, latitude, longitude, speed, video_path, created_at
       FROM activity_logs
       WHERE student_id=?
       ORDER BY created_at DESC`,
      [req.params.studentId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load activity history" });
  }
});

router.post(
  "/log",
  requireAuth,
  upload.single("video"),
  async (req, res) => {
    try {
      const { distance, duration, latitude, longitude, speed } = req.body;
      const studentId = Number(req.user.id);

      const videoPath = req.file ? req.file.path : null;

      await db.query(
        `INSERT INTO activity_logs
        (student_id, distance, duration, latitude, longitude, speed, video_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          distance,
          duration,
          latitude,
          longitude,
          speed,
          videoPath,
        ]
      );

      const [activities] = await db.query(
        "SELECT distance, duration, speed, video_path FROM activity_logs WHERE student_id=?",
        [studentId]
      );
      const recalculatedTrustScore = computeTrustScore(activities);
      await db.query(
        `INSERT INTO trust_scores (student_id, score, last_update)
         VALUES (?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE
           score = VALUES(score),
           last_update = CURDATE()`,
        [studentId, recalculatedTrustScore]
      );

      res.json({
        message: "Activity logged with distance & speed",
        trustScore: recalculatedTrustScore,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to log activity" });
    }
  }
);

module.exports = router;
