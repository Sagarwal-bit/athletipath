const express = require("express");
const db = require("../config/db");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/:studentId", async (req, res) => {
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
  upload.single("video"),
  async (req, res) => {
    try {
      const {
        student_id,
        distance,
        duration,
        latitude,
        longitude,
        speed,
      } = req.body;

      const videoPath = req.file ? req.file.path : null;

      await db.query(
        `INSERT INTO activity_logs
        (student_id, distance, duration, latitude, longitude, speed, video_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          student_id,
          distance,
          duration,
          latitude,
          longitude,
          speed,
          videoPath,
        ]
      );

      res.json({ message: "Activity logged with distance & speed" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to log activity" });
    }
  }
);

module.exports = router;
