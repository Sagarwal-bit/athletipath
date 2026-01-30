const express = require("express");
const db = require("../config/db");

const router = express.Router();

// get trust score
router.get("/:studentId", async (req,res)=>{
  const [rows] = await db.query(
    "SELECT score FROM trust_scores WHERE student_id=?",
    [req.params.studentId]
  );
  res.json(rows[0] || { score:50 });
});

// update trust score
router.post("/update", async (req,res)=>{
  const { student_id, change } = req.body;

  await db.query(
    `INSERT INTO trust_scores (student_id,score,last_update)
     VALUES (?,50 + ?,CURDATE())
     ON DUPLICATE KEY UPDATE score = score + ?, last_update=CURDATE()`,
    [student_id, change, change]
  );

  res.json({ message:"Trust score updated" });
});

module.exports = router;
