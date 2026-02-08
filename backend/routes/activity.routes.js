const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.post("/log", async (req,res)=>{
  const { student_id, distance, duration, latitude, longitude, video_path } = req.body;

  await db.query(
    `INSERT INTO activity_logs 
     (student_id,distance,duration,latitude,longitude,video_path)
     VALUES (?,?,?,?,?,?)`,
    [student_id,distance,duration,latitude,longitude,video_path]
  );

  res.json({ message:"Activity logged" });
});

router.get("/:studentId", async (req,res)=>{
  const [rows] = await db.query(
    "SELECT * FROM activity_logs WHERE student_id=? ORDER BY created_at DESC",
    [req.params.studentId]
  );
  res.json(rows);
});

module.exports = router;
