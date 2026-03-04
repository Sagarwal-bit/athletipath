const crypto = require("crypto");
const db = require("../config/db");
const sendMail = require("../utils/mailer");
const inMemoryChallenges = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

async function createMfaChallenge({ userId, email, purpose = "login" }) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const challengeToken = crypto.randomBytes(24).toString("hex");

  try {
    await db.query(
      `INSERT INTO mfa_challenges (user_id, challenge_token, otp_hash, purpose, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())`,
      [userId, challengeToken, otpHash, purpose]
    );
  } catch (err) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) {
      inMemoryChallenges.set(challengeToken, {
        userId,
        otpHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        used: false,
      });
    } else {
      throw err;
    }
  }

  let emailDelivered = false;
  try {
    await sendMail(email, "AthletiPath Security OTP", `Your OTP is ${otp}. Expires in 10 minutes.`);
    emailDelivered = true;
  } catch (_err) {
    // fallback for non-configured email in local environments
    // eslint-disable-next-line no-console
    console.log(`OTP for ${email}: ${otp}`);
  }

  const isProd = process.env.NODE_ENV === "production";
  return {
    challengeToken,
    emailDelivered,
    debugOtp: !isProd && !emailDelivered ? otp : undefined,
  };
}

async function verifyMfaChallenge({ challengeToken, otp }) {
  let row;
  try {
    [[row]] = await db.query(
      `SELECT id, user_id, otp_hash, expires_at, used_at
       FROM mfa_challenges
       WHERE challenge_token=?
       ORDER BY created_at DESC
       LIMIT 1`,
      [challengeToken]
    );
  } catch (err) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
    const cached = inMemoryChallenges.get(challengeToken);
    row = cached
      ? {
          id: null,
          user_id: cached.userId,
          otp_hash: cached.otpHash,
          expires_at: new Date(cached.expiresAt),
          used_at: cached.used ? new Date() : null,
        }
      : null;
  }

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    const err = new Error("MFA challenge invalid or expired");
    err.status = 401;
    err.expose = true;
    throw err;
  }

  if (hashOtp(otp) !== row.otp_hash) {
    const err = new Error("Invalid OTP");
    err.status = 401;
    err.expose = true;
    throw err;
  }

  if (row.id) {
    await db.query("UPDATE mfa_challenges SET used_at=NOW() WHERE id=?", [row.id]);
  } else if (inMemoryChallenges.has(challengeToken)) {
    const cached = inMemoryChallenges.get(challengeToken);
    cached.used = true;
    inMemoryChallenges.set(challengeToken, cached);
  }
  return { userId: row.user_id };
}

module.exports = {
  createMfaChallenge,
  verifyMfaChallenge,
};
