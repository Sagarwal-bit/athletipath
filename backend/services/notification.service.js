const db = require("../config/db");
const sendMail = require("../utils/mailer");

async function createNotification({ userId, type, title, message, relatedId = null }) {
  const [[existing]] = await db.query(
    `SELECT id
     FROM notifications
     WHERE user_id=? AND type=? AND title=? AND DATE(notify_date)=CURDATE()
     LIMIT 1`,
    [userId, type, title]
  );
  if (existing) return;

  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, related_id, notify_date, status)
     VALUES (?, ?, ?, ?, ?, NOW(), 'pending')`,
    [userId, type, title, message, relatedId]
  );
}

async function notifyUsersByRole({ role, type, title, message, relatedId = null, emailSubject = null }) {
  const [users] = await db.query(
    "SELECT id, email FROM users WHERE role=?",
    [role]
  );

  for (const user of users) {
    await createNotification({ userId: user.id, type, title, message, relatedId });
    if (user.email) {
      // best-effort email notification
      await sendMail(user.email, emailSubject || title, message);
    }
  }
}

async function getUserNotifications(userId) {
  const [rows] = await db.query(
    `SELECT id, type, title, message, status, notify_date
     FROM notifications
     WHERE user_id=?
     ORDER BY notify_date DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

async function markNotificationRead(notificationId, userId) {
  await db.query(
    `UPDATE notifications
     SET status='read', read_at=NOW()
     WHERE id=? AND user_id=?`,
    [notificationId, userId]
  );
}

module.exports = {
  createNotification,
  notifyUsersByRole,
  getUserNotifications,
  markNotificationRead,
};
