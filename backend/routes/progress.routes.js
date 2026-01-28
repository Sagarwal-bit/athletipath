const express = require("express");
const db = require("../config/db");

const router = express.Router();

// get student progress
router.get("/:studentId", async (req,res)=>{
  const [rows] = await db.query(
    `SELECT l.level_name, p.status, p.performance 
     FROM sports_progress p 
     JOIN sports_levels l ON p.level_id = l.id
     WHERE p.student_id=?`,
    [req.params.studentId]
  );
  res.json(rows);
});

// update progress
router.post("/update", async (req,res)=>{
  const { student_id, level_id, performance } = req.body;

  await db.query(
    "UPDATE sports_progress SET status='completed', performance=? WHERE student_id=? AND level_id=?",
    [performance, student_id, level_id]
  );

  // unlock next level
  await db.query(
    `UPDATE sports_progress 
     SET status='active' 
     WHERE student_id=? AND level_id = ? + 1`,
    [student_id, level_id]
  );

  res.json({ message:"Progress updated" });
});

module.exports = router;
