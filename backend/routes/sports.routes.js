const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/roadmap/:domainId", async (req, res) => {
  const [levels] = await db.query(
    "SELECT * FROM sports_levels WHERE domain_id=? ORDER BY id",
    [req.params.domainId]
  );

  res.json(levels);
});

module.exports = router;
