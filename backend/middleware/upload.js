const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(process.cwd(), "secure_uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "video.bin")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-100);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueName}-${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Unsupported file type. Only video uploads are allowed."));
    }
    const suspicious = [".exe", ".sh", ".bat", ".dll", ".js"];
    const lowerName = String(file.originalname || "").toLowerCase();
    if (suspicious.some((ext) => lowerName.endsWith(ext))) {
      return cb(new Error("Virus scan simulation failed for uploaded file."));
    }
    return cb(null, true);
  },
});

module.exports = upload;
