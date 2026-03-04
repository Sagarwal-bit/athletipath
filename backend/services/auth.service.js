const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, tokenType: "refresh" },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function persistRefreshToken(userId, refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
    [userId, tokenHash]
  );
}

async function validateRefreshToken(refreshToken) {
  const payload = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  );
  if (payload.tokenType !== "refresh") {
    const err = new Error("Invalid token type");
    err.status = 401;
    err.expose = true;
    throw err;
  }

  const tokenHash = hashToken(refreshToken);
  const [[row]] = await db.query(
    `SELECT id, user_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash=?
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash]
  );

  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
    const err = new Error("Refresh token expired or revoked");
    err.status = 401;
    err.expose = true;
    throw err;
  }

  return payload;
}

async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await db.query(
    "UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=?",
    [tokenHash]
  );
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
};
