const express = require("express");
const db = require("../config/db");

const router = express.Router();

// add event
router.post("/add", async (req,res)=>{
  const { title, domain, location, event_date, deadline, description } = req.body;

  await db.query(
    "INSERT INTO events (title,domain,location,event_date,deadline,description) VALUES (?,?,?,?,?,?)",
    [title, domain, location, event_date, deadline, description]
  );

  res.json({ message:"Event added" });
});

// get events
router.get("/", async (req,res)=>{
  const [rows] = await db.query("SELECT * FROM events ORDER BY event_date");
  res.json(rows);
});

module.exports = router;
