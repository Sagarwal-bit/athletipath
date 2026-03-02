const express = require("express");
const db = require("../config/db");

const router = express.Router();

/**
 * GET student progress
 * Roadmap is the single source of truth
 */
router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const [[total]] = await db.query(
      "SELECT COUNT(*) as count FROM roadmap_progress WHERE student_id=?",
      [studentId]
    );

    const [[completed]] = await db.query(
      "SELECT COUNT(*) as count FROM roadmap_progress WHERE student_id=? AND completed=true",
      [studentId]
    );

    const percent =
      total.count === 0
        ? 0
        : completed.count / total.count;

    let level =
      percent >= 0.75 ? 3 :
      percent >= 0.5 ? 2 : 1;

    res.json({
      totalSteps: total.count,
      completedSteps: completed.count,
      completionPercent: percent,
      level
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate progress" });
  }
});


/**
 * Manual recalculation (optional trigger)
 */
router.post("/recalculate/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const [[total]] = await db.query(
      "SELECT COUNT(*) as count FROM roadmap_progress WHERE student_id=?",
      [studentId]
    );

    const [[completed]] = await db.query(
      "SELECT COUNT(*) as count FROM roadmap_progress WHERE student_id=? AND completed=true",
      [studentId]
    );

    const percent =
      total.count === 0
        ? 0
        : completed.count / total.count;

    let level =
      percent >= 0.75 ? 3 :
      percent >= 0.5 ? 2 : 1;

    res.json({ level });

  } catch (err) {
    res.status(500).json({ error: "Recalculation failed" });
  }
});

module.exports = router;
