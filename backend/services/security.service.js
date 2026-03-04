const db = require("../config/db");

const MAX_FAILED_LOGINS = Number(process.env.MAX_FAILED_LOGINS || 5);
const ACCOUNT_LOCK_MINUTES = Number(process.env.ACCOUNT_LOCK_MINUTES || 30);

function isSchemaError(err) {
  return ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code);
}

async function safeQuery(sql, params = []) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    if (isSchemaError(err)) return [[], []];
    throw err;
  }
}

async function logSecurityEvent({ userId = null, eventType, severity = "low", ipAddress = null, details = null }) {
  await safeQuery(
    `INSERT INTO security_events (user_id, event_type, severity, ip_address, details, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [userId, eventType, severity, ipAddress, details ? JSON.stringify(details) : null]
  );
}

async function getUserByEmail(email) {
  const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);
  return rows[0] || null;
}

async function registerFailedLogin({ email, ipAddress, reason }) {
  const user = await getUserByEmail(email);
  const userId = user?.id || null;

  await safeQuery(
    `INSERT INTO login_attempts (user_id, email, ip_address, status, reason, attempted_at)
     VALUES (?, ?, ?, 'failed', ?, NOW())`,
    [userId, email, ipAddress, reason]
  );

  await logSecurityEvent({
    userId,
    eventType: "failed_login",
    severity: "medium",
    ipAddress,
    details: { email, reason },
  });

  if (!userId) return;

  const [[countRow]] = await safeQuery(
    `SELECT COUNT(*) AS failedCount
     FROM login_attempts
     WHERE user_id=? AND status='failed' AND attempted_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [userId]
  );

  if (Number(countRow?.failedCount || 0) >= MAX_FAILED_LOGINS) {
    await safeQuery(
      `UPDATE users
       SET account_locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id=?`,
      [ACCOUNT_LOCK_MINUTES, userId]
    );

    await logSecurityEvent({
      userId,
      eventType: "account_locked",
      severity: "high",
      ipAddress,
      details: { failedCount: countRow.failedCount },
    });
  }
}

async function registerSuccessfulLogin({ userId, email, ipAddress }) {
  await safeQuery(
    `INSERT INTO login_attempts (user_id, email, ip_address, status, reason, attempted_at)
     VALUES (?, ?, ?, 'success', 'authenticated', NOW())`,
    [userId, email, ipAddress]
  );

  await safeQuery(
    `DELETE FROM login_attempts
     WHERE user_id=? AND status='failed' AND attempted_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [userId]
  );
}

async function assertAccountNotLocked(userId) {
  const [[row]] = await safeQuery(
    "SELECT account_locked_until FROM users WHERE id=?",
    [userId]
  );
  if (!row?.account_locked_until) return;
  if (new Date(row.account_locked_until) > new Date()) {
    const err = new Error("Account temporarily locked due to suspicious login attempts");
    err.status = 423;
    err.expose = true;
    throw err;
  }
}

async function calculateUserRiskScore(userId) {
  const [[anomalyRow]] = await safeQuery(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE user_id=?
       AND event_type IN ('activity_anomaly','token_tampering','account_locked')
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [userId]
  );

  const [[failedLoginRow]] = await safeQuery(
    `SELECT COUNT(*) AS count
     FROM login_attempts
     WHERE user_id=? AND status='failed' AND attempted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [userId]
  );

  const [[trustRow]] = await safeQuery("SELECT score FROM trust_scores WHERE student_id=?", [userId]);
  const trust = Number(trustRow?.score ?? 50);
  const trustDeviation = Math.max(0, 50 - trust);

  const riskScore = Number(anomalyRow.count || 0) * 8 + Number(failedLoginRow.count || 0) * 5 + trustDeviation * 0.7;

  const category =
    riskScore >= 70 ? "high" : riskScore >= 35 ? "medium" : "low";

  await safeQuery(
    `INSERT INTO risk_scores (user_id, risk_score, category, details, calculated_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [userId, Number(riskScore.toFixed(2)), category, JSON.stringify({ anomalies: anomalyRow.count, failedLogins: failedLoginRow.count, trustDeviation })]
  );

  return { riskScore: Number(riskScore.toFixed(2)), category };
}

async function logTokenTampering({ ipAddress, tokenSnippet = null }) {
  await logSecurityEvent({
    userId: null,
    eventType: "token_tampering",
    severity: "high",
    ipAddress,
    details: { tokenSnippet },
  });
}

module.exports = {
  logSecurityEvent,
  registerFailedLogin,
  registerSuccessfulLogin,
  assertAccountNotLocked,
  calculateUserRiskScore,
  logTokenTampering,
};
