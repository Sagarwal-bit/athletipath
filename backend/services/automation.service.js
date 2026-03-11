const db = require("../config/db");
const { getTrustScore } = require("./trust.service");
const { createNotification } = require("./notification.service");
const {
  upsertAutomatedEvents,
  getRecommendedEventsForUser,
  cleanupExpiredEvents,
} = require("./event.service");

async function processUpcomingEventsNotifications() {
  const [events] = await db.query(
    `SELECT id, title, domain, subdomain,
            COALESCE(start_date, event_date) AS start_date,
            COALESCE(registration_deadline, deadline) AS registration_deadline,
            location, country
     FROM events
     WHERE COALESCE(registration_deadline, deadline) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        OR COALESCE(start_date, event_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`
  );

  for (const event of events) {
    const [students] = await db.query("SELECT id FROM users WHERE role='student'");
    const eventDate = new Date(event.start_date).toISOString().slice(0, 10);
    const deadline = new Date(event.registration_deadline).toISOString().slice(0, 10);

    for (const student of students) {
      await createNotification({
        userId: student.id,
        eventId: event.id,
        type: "upcoming_event_7d",
        title: `📅 Upcoming: ${event.title}`,
        message: `Event on ${eventDate} in ${event.location}, ${event.country}. Registration deadline: ${deadline}.`,
        relatedId: event.id,
      });
    }
  }
}

async function processEventDeadlineReminders() {
  const [events] = await db.query(
    `SELECT id, title, location, country, domain,
            COALESCE(start_date, event_date) AS start_date,
            COALESCE(registration_deadline, deadline) AS registration_deadline
     FROM events
     WHERE COALESCE(registration_deadline, deadline) IN (
         DATE_ADD(CURDATE(), INTERVAL 7 DAY),
         DATE_ADD(CURDATE(), INTERVAL 1 DAY)
     )`
  );

  for (const event of events) {
    const daysLeft = Math.max(
      0,
      Math.round((new Date(event.registration_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const reminderType = daysLeft <= 1 ? "event_deadline_1d" : "event_deadline_7d";
    const [students] = await db.query("SELECT id FROM users WHERE role='student'");
    for (const student of students) {
      await createNotification({
        userId: student.id,
        eventId: event.id,
        type: reminderType,
        title: `⏳ Registration reminder: ${event.title}`,
        message: `${event.domain.toUpperCase()} event in ${event.location}, ${event.country}. Registration closes in ${daysLeft} day(s).`,
        relatedId: event.id,
        notifyDate: event.registration_deadline,
      });
    }
  }
}

async function processRecommendedEventAlerts() {
  const [students] = await db.query("SELECT id FROM users WHERE role='student'");
  for (const student of students) {
    const { events } = await getRecommendedEventsForUser(student.id, { limit: 3 });
    for (const event of events) {
      if (Number(event.relevance_score || 0) < 90) continue;
      await createNotification({
        userId: student.id,
        eventId: event.id,
        type: "event_match",
        title: `✨ New match: ${event.title}`,
        message: `New ${event.subdomain} event announced${event.country ? ` in ${event.country}` : ""}.`,
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
  await upsertAutomatedEvents();
  await processUpcomingEventsNotifications();
  await processEventDeadlineReminders();
  await processRecommendedEventAlerts();
  await cleanupExpiredEvents({ graceDays: 30 });
  await processInactivityAlerts(Number(process.env.INACTIVITY_DAYS || 7));
  await enforceTrustLocks();
}

module.exports = {
  runAutomationCycle,
  processEventDeadlineReminders,
  processRecommendedEventAlerts,
  processUpcomingEventsNotifications,
  processInactivityAlerts,
  enforceTrustLocks,
};
