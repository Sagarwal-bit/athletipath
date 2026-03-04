require("dotenv").config();
const eventRoutes = require("./routes/event.routes");
const express = require("express");
const cors = require("cors");
const v2Routes = require("./routes/v2");
const progressRoutes = require("./routes/progress.routes");
const notificationRoutes = require("./routes/notification.routes");
const trustRoutes = require("./routes/trust.routes");
const authRoutes = require("./routes/auth.routes");
const sportsRoutes = require("./routes/sports.routes");
const biometricRoutes = require("./routes/biometric.routes");
const { startScheduler } = require("./jobs/scheduler");
const { notFound, errorHandler } = require("./middleware/errors");
const { securityHeaders, rateLimit } = require("./middleware/security");
const app = express();   // ✅ app first
const activityRoutes = require("./routes/activity.routes");
const chartsRoutes = require("./routes/charts.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const roadmapRoutes = require("./routes/roadmap.routes");

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS blocked by security policy"));
  },
}));
app.use(securityHeaders);
app.use(rateLimit({ windowMs: 60 * 1000, max: 180 }));
app.use(express.json());


// ✅ routes after app created
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/trust", trustRoutes);
app.use("/api/biometric", biometricRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/charts", chartsRoutes);
app.use("/api/sports", sportsRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/v2", v2Routes);
app.get("/", (req, res) => {
  res.json({ message: "AthletiPath backend running", apiVersion: "v1 + v2" });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
  startScheduler();
});
