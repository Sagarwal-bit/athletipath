const express = require("express");
const db = require("../../config/db");
const { requireAuth } = require("../../middleware/auth");
const { authorizeRoles } = require("../../middleware/rbac");
const { asyncHandler } = require("../../middleware/errors");

const router = express.Router();

router.use(requireAuth, authorizeRoles("coach", "admin"));

function cleanText(value, maxLen = 255) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLen);
}

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const teacherId = Number(req.user.id);
    const [[profile]] = await db.query(
      `SELECT tp.user_id, tp.employee_id, tp.department, tp.institution, tp.belongs_to,
              tp.city, tp.state, tp.country, tp.qualification, tp.phone, tp.address
       FROM teacher_profiles tp
       WHERE tp.user_id=?`,
      [teacherId]
    );

    if (!profile) {
      return res.json({
        user_id: teacherId,
        employee_id: null,
        department: null,
        institution: null,
        belongs_to: null,
        city: null,
        state: null,
        country: null,
        qualification: null,
        phone: null,
        address: null,
      });
    }

    return res.json(profile);
  })
);

router.post(
  "/profile",
  asyncHandler(async (req, res) => {
    const teacherId = Number(req.user.id);
    const { employeeId, department, institution, belongsTo, city, state, country, qualification, phone, address } = req.body;

    await db.query(
      `INSERT INTO teacher_profiles
      (user_id, employee_id, department, institution, belongs_to, city, state, country, qualification, phone, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      employee_id=VALUES(employee_id),
      department=VALUES(department),
      institution=VALUES(institution),
      belongs_to=VALUES(belongs_to),
      city=VALUES(city),
      state=VALUES(state),
      country=VALUES(country),
      qualification=VALUES(qualification),
      phone=VALUES(phone),
      address=VALUES(address),
      updated_at=NOW()`,
      [
        teacherId,
        cleanText(employeeId, 80),
        cleanText(department, 120),
        cleanText(institution, 190),
        cleanText(belongsTo, 190),
        cleanText(city, 120),
        cleanText(state, 120),
        cleanText(country, 120),
        cleanText(qualification, 190),
        cleanText(phone, 30),
        cleanText(address, 1000),
      ]
    );

    return res.json({ message: "Teacher profile saved" });
  })
);

router.get(
  "/students",
  asyncHandler(async (req, res) => {
    const teacherId = Number(req.user.id);
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, sp.class_name, sp.section, sp.institution, sp.belongs_to
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.assigned_teacher_id=?
       ORDER BY u.name`,
      [teacherId]
    );
    return res.json(rows);
  })
);

router.post(
  "/students/:studentId/assign",
  asyncHandler(async (req, res) => {
    const teacherId = Number(req.user.id);
    const studentId = Number(req.params.studentId);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: "Invalid studentId" });
    }

    const [[student]] = await db.query(
      "SELECT id, role FROM users WHERE id=?",
      [studentId]
    );
    if (!student || String(student.role).toLowerCase() !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    await db.query(
      `INSERT INTO student_profiles (user_id, assigned_teacher_id, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE assigned_teacher_id=VALUES(assigned_teacher_id), updated_at=NOW()`,
      [studentId, teacherId]
    );

    await db.query(
      `INSERT IGNORE INTO student_coach_map (student_id, coach_id, created_at)
       VALUES (?, ?, NOW())`,
      [studentId, teacherId]
    );

    return res.json({ message: "Student assigned to teacher" });
  })
);

module.exports = router;
