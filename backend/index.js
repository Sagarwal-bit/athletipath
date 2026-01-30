require("dotenv").config();
const eventRoutes = require("./routes/event.routes");
const express = require("express");
const cors = require("cors");
const progressRoutes = require("./routes/progress.routes");
const notificationRoutes = require("./routes/notification.routes");
const trustRoutes = require("./routes/trust.routes");
const authRoutes = require("./routes/auth.routes");
const sportsRoutes = require("./routes/sports.routes");

const app = express();   // ✅ app first

app.use(cors());
app.use(express.json());


// ✅ routes after app created
app.use("/api/auth", authRoutes);
app.use("/api/trust", trustRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/sports", sportsRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);
app.get("/", (req, res) => {
  res.json({ message: "AthletiPath backend running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
