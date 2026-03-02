const express = require("express");
const db = require("../config/db");

const router = express.Router();

// get completed steps
router.get("/:studentId", async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM roadmap_progress WHERE student_id=?",
    [req.params.studentId]
  );
  res.json(rows);
});

// mark step complete
router.post("/complete", async (req, res) => {
  const { student_id, domain, subdomain, step } = req.body;

  await db.query(
    `INSERT INTO roadmap_progress
     (student_id, domain, subdomain, step, completed)
     VALUES (?, ?, ?, ?, true)
     ON DUPLICATE KEY UPDATE completed=true`,
    [student_id, domain, subdomain, step]
  );

  res.json({ message: "Step marked completed" });
});

module.exports = router;
