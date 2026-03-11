const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../../config/db");
const { requireAuth } = require("../../middleware/auth");
const { asyncHandler } = require("../../middleware/errors");
const { rateLimit, validateJson } = require("../../middleware/security");
const {
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} = require("../../services/auth.service");
const { createMfaChallenge, verifyMfaChallenge } = require("../../services/mfa.service");
const {
  registerFailedLogin,
  registerSuccessfulLogin,
  assertAccountNotLocked,
  logSecurityEvent,
} = require("../../services/security.service");
const { normalizeRole } = require("../../middleware/rbac");

const router = express.Router();

const authRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keySelector: (req) => `auth:${req.ip}` });

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
  };
}

router.post(
  "/register",
  authRateLimit,
  validateJson({
    required: ["name", "email", "password"],
    validators: {
      email: (v) => /.+@.+\..+/.test(String(v)) || "email format is invalid",
      password: (v) => String(v).length >= 8 || "password must be at least 8 characters",
    },
  }),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const allowedRoles = new Set(["student", "coach", "teacher"]);
    const safeRole = allowedRoles.has(role) ? role : "student";

    const hash = await bcrypt.hash(password, 10);
    try {
      await db.query(
        `INSERT INTO users (name, email, password, role, created_at, mfa_enabled, mfa_method)
         VALUES (?, ?, ?, ?, NOW(), 1, 'email_otp')`,
        [name, email, hash, safeRole]
      );
    } catch (err) {
      if (!["ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
      await db.query(
        "INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())",
        [name, email, hash, safeRole]
      );
    }

    return res.json({ message: "User registered with MFA enabled" });
  })
);

router.post(
  "/login/initiate",
  authRateLimit,
  validateJson({ required: ["email", "password"] }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);

    if (!rows.length) {
      await registerFailedLogin({ email, ipAddress: req.ip, reason: "user_not_found" });
      return res.status(401).json({ error: "User not found" });
    }

    const user = rows[0];
    await assertAccountNotLocked(user.id);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await registerFailedLogin({ email, ipAddress: req.ip, reason: "wrong_password" });
      return res.status(401).json({ error: "Wrong password" });
    }

    if (Number(user.mfa_enabled) === 0) {
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);
      await persistRefreshToken(user.id, refreshToken);
      await registerSuccessfulLogin({ userId: user.id, email: user.email, ipAddress: req.ip });

      return res.json({
        mfaRequired: false,
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user),
      });
    }

    const challenge = await createMfaChallenge({ userId: user.id, email: user.email, purpose: "login" });
    await logSecurityEvent({
      userId: user.id,
      eventType: "mfa_challenge_issued",
      severity: "low",
      ipAddress: req.ip,
      details: { method: user.mfa_method || "email_otp" },
    });

    return res.json({
      mfaRequired: true,
      challengeToken: challenge.challengeToken,
      mfaMethod: user.mfa_method || "email_otp",
      emailDelivered: challenge.emailDelivered,
      ...(challenge.debugOtp ? { debugOtp: challenge.debugOtp } : {}),
    });
  })
);

router.post(
  "/login/verify",
  authRateLimit,
  validateJson({ required: ["challengeToken", "otp"] }),
  asyncHandler(async (req, res) => {
    const { challengeToken, otp, faceVerification } = req.body;
    const { userId } = await verifyMfaChallenge({ challengeToken, otp });

    const [rows] = await db.query("SELECT * FROM users WHERE id=?", [userId]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    if ((user.mfa_method || "email_otp") === "email_otp_face" && !faceVerification) {
      return res.status(401).json({ error: "Face verification required" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await persistRefreshToken(user.id, refreshToken);
    await registerSuccessfulLogin({ userId: user.id, email: user.email, ipAddress: req.ip });

    return res.json({
      token: accessToken,
      refreshToken,
      user: sanitizeUser(user),
    });
  })
);

router.post(
  "/refresh",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    const payload = await validateRefreshToken(refreshToken);
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id=?",
      [payload.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    const token = signAccessToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    return res.json({ message: "Logged out" });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id=?",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    return res.json({ user: sanitizeUser(rows[0]) });
  })
);

module.exports = router;
