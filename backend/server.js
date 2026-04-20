const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));
app.use(express.json());

// Routes
const problemRoutes = require("./routes/problemRoutes");
const aiRoutes = require("./routes/aiRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/problems", problemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SevaLink AI Backend Running ✅", status: "ok" });
});

// Connect DB & Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
