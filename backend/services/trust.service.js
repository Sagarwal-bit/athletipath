const db = require("../config/db");
const { computeTrustScore } = require("../utils/trust");
const { encryptText } = require("./encryption.service");

const TRUST_DEFAULT = 50;

async function getTrustScore(studentId) {
  const [[row]] = await db.query(
    "SELECT score FROM trust_scores WHERE student_id=?",
    [studentId]
  );
  return Number(row?.score ?? TRUST_DEFAULT);
}

async function recalculateTrustScore(studentId) {
  const [activities] = await db.query(
    "SELECT distance, duration, speed, video_path FROM activity_logs WHERE student_id=?",
    [studentId]
  );
  const score = computeTrustScore(activities);
  await upsertTrustScore(studentId, score);
  return score;
}

async function upsertTrustScore(studentId, score) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  try {
    await db.query(
      `INSERT INTO trust_scores (student_id, score, encrypted_score, last_update)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         score = VALUES(score),
         encrypted_score = VALUES(encrypted_score),
         last_update = NOW()`,
      [studentId, normalizedScore, encryptText(normalizedScore)]
    );
  } catch (err) {
    if (!["ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
    await db.query(
      `INSERT INTO trust_scores (student_id, score, last_update)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         score = VALUES(score),
         last_update = NOW()`,
      [studentId, normalizedScore]
    );
  }

  await db.query(
    `INSERT INTO trust_scores_history (student_id, score, reason, last_update)
     VALUES (?, ?, 'recalculated', NOW())`,
    [studentId, normalizedScore]
  );
}

async function applyTrustPenalty(studentId, penalty, reason) {
  const current = await getTrustScore(studentId);
  const next = Math.max(0, current - Math.abs(Number(penalty || 0)));

  await db.query(
    `INSERT INTO trust_penalties (student_id, penalty, reason, created_at)
     VALUES (?, ?, ?, NOW())`,
    [studentId, Math.abs(Number(penalty || 0)), reason || "system_penalty"]
  );

  await upsertTrustScore(studentId, next);
  return next;
}

module.exports = {
  TRUST_DEFAULT,
  getTrustScore,
  recalculateTrustScore,
  upsertTrustScore,
  applyTrustPenalty,
};
