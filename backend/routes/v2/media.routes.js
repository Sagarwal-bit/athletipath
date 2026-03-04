const express = require("express");
const fs = require("fs");
const path = require("path");
const { verifyMediaToken } = require("../../middleware/security");

const router = express.Router();

router.get("/stream", (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "token is required" });
    const payload = verifyMediaToken(String(token));

    const safeBase = path.join(process.cwd(), "secure_uploads");
    const targetPath = path.resolve(payload.path);

    if (!targetPath.startsWith(safeBase)) {
      return res.status(403).json({ error: "Invalid media path" });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "Media not found" });
    }

    res.setHeader("Content-Type", "video/mp4");
    return fs.createReadStream(targetPath).pipe(res);
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired signed URL" });
  }
});

module.exports = router;
