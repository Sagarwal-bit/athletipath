const express = require("express");
const db = require("../../config/db");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");
const { getAdminDashboard } = require("../../services/analytics.service");
const { calculateUserRiskScore } = require("../../services/security.service");
const sendMail = require("../../utils/mailer");

const router = express.Router();

router.use(requireAuth, authorizeRoles("admin", "super_admin"));

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json(rows);
  })
);

router.patch(
  "/users/:userId/role",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const role = String(req.body.role || "").toLowerCase();
    const allowed = new Set(["student", "coach", "admin", "super_admin"]);

    if (!allowed.has(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admin can grant super admin role" });
    }

    await db.query("UPDATE users SET role=? WHERE id=?", [role, userId]);
    return res.json({ message: "User role updated" });
  })
);

router.post(
  "/domains",
  asyncHandler(async (req, res) => {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: "key and label are required" });

    await db.query(
      `INSERT INTO domains (domain_key, label, created_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE label=VALUES(label), updated_at=NOW()`,
      [key, label]
    );

    return res.json({ message: "Domain upserted" });
  })
);

router.get(
  "/domains",
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT id, domain_key, label FROM domains ORDER BY label");
    return res.json(rows);
  })
);

router.post(
  "/roadmap-templates",
  asyncHandler(async (req, res) => {
    const { domainKey, subdomainKey, payload } = req.body;
    if (!domainKey || !subdomainKey || !payload) {
      return res.status(400).json({ error: "domainKey, subdomainKey and payload are required" });
    }

    await db.query(
      `INSERT INTO roadmap_templates (domain_key, subdomain_key, payload, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE payload=VALUES(payload), updated_at=NOW()`,
      [domainKey, subdomainKey, JSON.stringify(payload)]
    );

    return res.json({ message: "Roadmap template upserted" });
  })
);

router.get(
  "/roadmap-templates",
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      "SELECT id, domain_key, subdomain_key, payload, updated_at FROM roadmap_templates ORDER BY updated_at DESC"
    );
    return res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
  })
);

router.post(
  "/competitions",
  asyncHandler(async (req, res) => {
    const { title, domain, category, eventDate, deadline, location, description } = req.body;

    if (!title || !domain || !eventDate || !deadline) {
      return res.status(400).json({ error: "title, domain, eventDate and deadline are required" });
    }

    await db.query(
      `INSERT INTO events (title, domain, location, event_date, deadline, description, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, domain, location || null, eventDate, deadline, description || null, category || "competition"]
    );

    return res.json({ message: "Competition/exam created" });
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const dashboard = await getAdminDashboard();
    return res.json(dashboard);
  })
);

router.get(
  "/security-dashboard",
  asyncHandler(async (_req, res) => {
    const [failedLogins] = await db.query(
      `SELECT DATE(attempted_at) day, COUNT(*) count
       FROM login_attempts
       WHERE status='failed' AND attempted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(attempted_at)
       ORDER BY day`
    );

    const [anomalyEvents] = await db.query(
      `SELECT event_type, COUNT(*) count
       FROM security_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY event_type
       ORDER BY count DESC`
    );

    const [lockedAccounts] = await db.query(
      `SELECT id, name, email, account_locked_until
       FROM users
       WHERE account_locked_until IS NOT NULL AND account_locked_until > NOW()`
    );

    const [users] = await db.query("SELECT id, name, email, role FROM users");
    const userRisk = [];
    for (const user of users) {
      const risk = await calculateUserRiskScore(user.id);
      userRisk.push({ ...user, ...risk });
    }

    return res.json({
      failedLogins,
      suspiciousActivity: anomalyEvents,
      lockedAccounts,
      riskByUser: userRisk.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20),
    });
  })
);

router.get(
  "/smtp-status",
  asyncHandler(async (_req, res) => {
    const smtp = await sendMail.verifySmtp();
    return res.json(smtp);
  })
);

router.post(
  "/smtp-test",
  asyncHandler(async (req, res) => {
    const to = String(req.body?.to || "").trim();
    if (!to || !/.+@.+\..+/.test(to)) {
      return res.status(400).json({ error: "Valid recipient email is required" });
    }

    await sendMail(
      to,
      "AthletiPath SMTP Test",
      "SMTP test successful. OTP emails should now be deliverable."
    );
    return res.json({ message: `Test email sent to ${to}` });
  })
);

module.exports = router;
