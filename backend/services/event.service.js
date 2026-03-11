const db = require("../config/db");
const { getAutomatedEventFeed } = require("../data/eventCatalog");

const VALID_DOMAINS = new Set(["sports", "education", "art", "auditions", "technology", "other"]);

function normalizeText(value, { maxLen = 255, fallback = null } = {}) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.slice(0, maxLen);
}

function normalizeDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.status = 400;
    err.expose = true;
    throw err;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeEventInput(payload, { strict = false } = {}) {
  const title = normalizeText(payload.title, { maxLen: 220 });
  const domain = normalizeText(payload.domain, { maxLen: 80 })?.toLowerCase();
  const subdomain = normalizeText(payload.subdomain, { maxLen: 120, fallback: "general" })?.toLowerCase();
  const location = normalizeText(payload.location, { maxLen: 220, fallback: "Online" });
  const country = normalizeText(payload.country, { maxLen: 120, fallback: "India" });
  const startDate = normalizeDate(payload.startDate || payload.start_date || payload.event_date, "startDate");
  const registrationDeadline = normalizeDate(
    payload.registrationDeadline || payload.registration_deadline || payload.deadline,
    "registrationDeadline"
  );
  const eventType = normalizeText(payload.eventType || payload.event_type || payload.category, { maxLen: 80, fallback: "competition" })?.toLowerCase();
  const source = normalizeText(payload.source, { maxLen: 190, fallback: "curated_admin" });
  const description = normalizeText(payload.description, { maxLen: 2000, fallback: "" });
  const registrationUrl = normalizeText(payload.registrationUrl || payload.registration_url || payload.source, { maxLen: 350 });

  if (!title) {
    const err = new Error("title is required");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  if (!domain) {
    const err = new Error("domain is required");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  if (!startDate || !registrationDeadline) {
    const err = new Error("startDate and registrationDeadline are required");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  if (strict && !VALID_DOMAINS.has(domain)) {
    const err = new Error(`Invalid domain '${domain}'`);
    err.status = 400;
    err.expose = true;
    throw err;
  }

  if (registrationDeadline > startDate) {
    const err = new Error("registrationDeadline cannot be after startDate");
    err.status = 400;
    err.expose = true;
    throw err;
  }

  return {
    title,
    domain,
    subdomain,
    location,
    country,
    startDate,
    registrationDeadline,
    eventType,
    source,
    description,
    registrationUrl,
  };
}

function escapeLike(input) {
  return String(input).replace(/[%_]/g, "\\$&");
}

async function upsertEvent(payload) {
  const event = normalizeEventInput(payload, { strict: true });
  await db.query(
    `INSERT INTO events
    (title, domain, subdomain, location, country, start_date, registration_deadline, event_type, source, registration_url, description, event_date, deadline, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
    location=VALUES(location),
    country=VALUES(country),
    start_date=VALUES(start_date),
    registration_deadline=VALUES(registration_deadline),
    event_type=VALUES(event_type),
    source=VALUES(source),
    registration_url=VALUES(registration_url),
    description=VALUES(description),
    event_date=VALUES(event_date),
    deadline=VALUES(deadline),
    category=VALUES(category),
    updated_at=NOW()`,
    [
      event.title,
      event.domain,
      event.subdomain,
      event.location,
      event.country,
      event.startDate,
      event.registrationDeadline,
      event.eventType,
      event.source,
      event.registrationUrl,
      event.description,
      event.startDate,
      event.registrationDeadline,
      event.eventType,
    ]
  );

  return event;
}

async function upsertAutomatedEvents() {
  const events = getAutomatedEventFeed();
  for (const event of events) {
    await upsertEvent(event);
  }
  return events.length;
}

async function listUpcomingEvents({ domain, country, subdomain, days = 120, limit = 100 }) {
  const safeDays = Math.min(365, Math.max(1, Number(days || 120)));
  const safeLimit = Math.min(200, Math.max(1, Number(limit || 100)));
  const args = [safeDays];

  const where = [
    "COALESCE(start_date, event_date) >= CURDATE()",
    `COALESCE(start_date, event_date) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
  ];

  if (domain) {
    where.push("LOWER(domain)=?");
    args.push(String(domain).toLowerCase());
  }
  if (subdomain) {
    where.push("LOWER(subdomain)=?");
    args.push(String(subdomain).toLowerCase());
  }
  if (country) {
    where.push("LOWER(country)=?");
    args.push(String(country).toLowerCase());
  }

  args.push(safeLimit);

  const [rows] = await db.query(
    `SELECT id, title, domain, subdomain, location, country,
            COALESCE(start_date, event_date) AS start_date,
            COALESCE(registration_deadline, deadline) AS registration_deadline,
            COALESCE(event_type, category, 'competition') AS event_type, source, registration_url, description, created_at
     FROM events
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(start_date, event_date) ASC
     LIMIT ?`,
    args
  );

  return rows;
}

async function getUserRoadmapPreference(userId) {
  try {
    const [[selection]] = await db.query(
      `SELECT domain, subdomain
       FROM student_roadmap_selection
       WHERE student_id=?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (selection?.domain) return selection;
  } catch (err) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
  }

  try {
    const [[progress]] = await db.query(
      `SELECT domain, subdomain, COUNT(*) AS score
       FROM roadmap_progress
       WHERE student_id=?
       GROUP BY domain, subdomain
       ORDER BY score DESC
       LIMIT 1`,
      [userId]
    );
    if (progress?.domain) return { domain: progress.domain, subdomain: progress.subdomain };
  } catch (err) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
  }

  return { domain: "sports", subdomain: "sprint" };
}

async function getUserLocationPreference(userId) {
  try {
    const [[studentProfile]] = await db.query(
      `SELECT country, state, city
       FROM student_profiles
       WHERE user_id=?`,
      [userId]
    );
    if (studentProfile) {
      return {
        country: studentProfile.country || "India",
        state: studentProfile.state || null,
        city: studentProfile.city || null,
      };
    }
  } catch (err) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
  }

  try {
    const [[teacherProfile]] = await db.query(
      `SELECT country, state, city
       FROM teacher_profiles
       WHERE user_id=?`,
      [userId]
    );
    if (teacherProfile) {
      return {
        country: teacherProfile.country || "India",
        state: teacherProfile.state || null,
        city: teacherProfile.city || null,
      };
    }
  } catch (err) {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code)) throw err;
  }

  return { country: "India", state: null, city: null };
}

async function getRecommendedEventsForUser(userId, { limit = 20 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit || 20)));
  const { domain, subdomain } = await getUserRoadmapPreference(userId);
  const { country, state, city } = await getUserLocationPreference(userId);
  const lowerDomain = String(domain || "sports").toLowerCase();
  const lowerSubdomain = String(subdomain || "general").toLowerCase();
  const lowerCountry = String(country || "india").toLowerCase();
  const cityLike = city ? `%${escapeLike(city)}%` : null;
  const stateLike = state ? `%${escapeLike(state)}%` : null;

  const [rows] = await db.query(
    `SELECT id, title, domain, subdomain, location, country,
            COALESCE(start_date, event_date) AS start_date,
            COALESCE(registration_deadline, deadline) AS registration_deadline,
            COALESCE(event_type, category, 'competition') AS event_type, source, registration_url, description,
            CASE
              WHEN LOWER(domain)=? AND LOWER(subdomain)=? AND LOWER(country)=? THEN 100
              WHEN LOWER(domain)=? AND LOWER(country)=? THEN 80
              WHEN LOWER(domain)=? THEN 60
              ELSE 30
            END
            + (CASE WHEN ? IS NOT NULL AND location LIKE ? ESCAPE '\\\\' THEN 20 ELSE 0 END)
            + (CASE WHEN ? IS NOT NULL AND location LIKE ? ESCAPE '\\\\' THEN 10 ELSE 0 END)
            + (CASE
                WHEN COALESCE(registration_deadline, deadline) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 15
                WHEN COALESCE(registration_deadline, deadline) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 21 DAY) THEN 8
                ELSE 0
              END) AS relevance_score
     FROM events
     WHERE COALESCE(start_date, event_date) >= CURDATE()
     ORDER BY relevance_score DESC, COALESCE(start_date, event_date) ASC
     LIMIT ?`,
    [
      lowerDomain,
      lowerSubdomain,
      lowerCountry,
      lowerDomain,
      lowerCountry,
      lowerDomain,
      cityLike,
      cityLike,
      stateLike,
      stateLike,
      safeLimit,
    ]
  );

  return {
    preferences: { domain, subdomain, country, state, city },
    events: rows,
  };
}

async function cleanupExpiredEvents({ graceDays = 30 } = {}) {
  const safeDays = Math.min(365, Math.max(0, Number(graceDays || 30)));
  const [result] = await db.query(
    `DELETE FROM events
     WHERE COALESCE(start_date, event_date) < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [safeDays]
  );
  return result.affectedRows || 0;
}

module.exports = {
  normalizeEventInput,
  upsertEvent,
  upsertAutomatedEvents,
  listUpcomingEvents,
  getRecommendedEventsForUser,
  cleanupExpiredEvents,
};
