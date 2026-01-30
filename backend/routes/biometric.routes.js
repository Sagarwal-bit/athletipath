const express = require("express");
const db = require("../config/db");

const router = express.Router();

// save public key
router.post("/register", async (req,res)=>{
  const { user_id, public_key } = req.body;

  await db.query(
    "INSERT INTO biometric_keys (user_id, public_key) VALUES (?,?)",
    [user_id, public_key]
  );

  res.json({ message:"Biometric registered" });
});

// verify login (basic demo)
router.post("/verify", async (req,res)=>{
  res.json({ success:true });
});

module.exports = router;
