const express = require("express");

const authRoutes = require("./auth.routes");
const studentRoutes = require("./student.routes");
const coachRoutes = require("./coach.routes");
const teacherRoutes = require("./teacher.routes");
const adminRoutes = require("./admin.routes");
const analyticsRoutes = require("./analytics.routes");
const notificationRoutes = require("./notification.routes");
const recommendationRoutes = require("./recommendation.routes");
const mediaRoutes = require("./media.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/student", studentRoutes);
router.use("/coach", coachRoutes);
router.use("/teacher", teacherRoutes);
router.use("/admin", adminRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/media", mediaRoutes);

module.exports = router;
