const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Attach io to app for use in routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 User connected via Socket.IO");
  socket.on("disconnect", () => console.log("🔴 User disconnected"));
});

// Middleware
app.use(cors({
  origin: "*",
}));
app.use(express.json());

const User = require("./models/User");

// API Check
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Routes
const problemRoutes = require("./routes/problemRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/problems", problemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);

// Global Error Handler (Prevents HTML leaks on crash)
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error"
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SevaLink AI Backend Running ✅", status: "ok" });
});

// Connect DB & Start
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected successfully");
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

startServer();
