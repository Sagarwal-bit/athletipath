const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// save public key
router.post("/register", requireAuth, async (req,res)=>{
  const { public_key } = req.body;
  const user_id = req.user.id;

  await db.query(
    `INSERT INTO biometric_keys (user_id, public_key)
     VALUES (?,?)
     ON DUPLICATE KEY UPDATE public_key=VALUES(public_key)`,
    [user_id, public_key]
  );

  res.json({ message:"Biometric registered" });
});

// verify login (basic demo)
router.post("/verify", requireAuth, async (req,res)=>{
  res.json({ success:true });
});

module.exports = router;
