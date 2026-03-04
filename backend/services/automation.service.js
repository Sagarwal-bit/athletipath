const db = require("../config/db");
const { getTrustScore } = require("./trust.service");
const { createNotification } = require("./notification.service");

async function processUpcomingEventsNotifications() {
  const [events] = await db.query(
    `SELECT id, title, deadline
     FROM events
     WHERE deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`
  );

  for (const event of events) {
    const [students] = await db.query("SELECT id FROM users WHERE role='student'");
    for (const student of students) {
      await createNotification({
        userId: student.id,
        type: "upcoming_event",
        title: "Upcoming competition or exam",
        message: `${event.title} deadline on ${new Date(event.deadline).toISOString().slice(0, 10)}`,
        relatedId: event.id,
      });
    }
  }
}

async function processInactivityAlerts(inactiveDays = 7) {
  const [students] = await db.query(
    `SELECT u.id
     FROM users u
     LEFT JOIN (
       SELECT student_id, MAX(created_at) AS last_activity
       FROM activity_logs
       GROUP BY student_id
     ) la ON la.student_id = u.id
     WHERE u.role='student'
     AND (la.last_activity IS NULL OR la.last_activity < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [inactiveDays]
  );

  for (const student of students) {
    await createNotification({
      userId: student.id,
      type: "inactivity",
      title: "Inactivity reminder",
      message: `No activity was detected in the last ${inactiveDays} days. Log a verified session to maintain progression.`,
    });
  }
}

async function enforceTrustLocks() {
  const [students] = await db.query("SELECT id FROM users WHERE role='student'");

  for (const student of students) {
    const trust = await getTrustScore(student.id);
    if (trust < 40) {
      await createNotification({
        userId: student.id,
        type: "trust_warning",
        title: "Progression locked due to low trust",
        message: `Current trust score ${trust}. Reach at least 40 to unlock progression.`,
      });
    }
  }
}

async function runAutomationCycle() {
  await processUpcomingEventsNotifications();
  await processInactivityAlerts(Number(process.env.INACTIVITY_DAYS || 7));
  await enforceTrustLocks();
}

module.exports = {
  runAutomationCycle,
  processUpcomingEventsNotifications,
  processInactivityAlerts,
  enforceTrustLocks,
};
