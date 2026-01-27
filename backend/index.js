const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const sportsRoutes = require("./routes/sports.routes");

const app = express();   // ✅ app first

app.use(cors());
app.use(express.json());

// ✅ routes after app created
app.use("/api/auth", authRoutes);
app.use("/api/sports", sportsRoutes);

app.get("/", (req, res) => {
  res.json({ message: "AthletiPath backend running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
