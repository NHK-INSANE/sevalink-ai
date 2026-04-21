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

// Real-time Socket Mapping
const userSockets = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("🟢 User connected via Socket.IO:", socket.id);

  socket.on("register-user", (userId) => {
    if (userId) {
      userSockets.set(userId, socket.id);
      console.log(`👤 User ${userId} registered to socket ${socket.id}`);
    }
  });

  // 📝 Problem Coordination Rooms
  socket.on("join-discussion", (problemId) => {
    socket.join(problemId);
    console.log(`📡 Socket ${socket.id} joined discussion: ${problemId}`);
  });

  socket.on("send-discussion-message", async (data) => {
    // Broadcast to all in the problem room
    io.to(data.problemId).emit("new-discussion-message", data);
  });

  socket.on("disconnect", () => {
    // Remove from map on disconnect
    for (const [uid, sid] of userSockets.entries()) {
      if (sid === socket.id) {
        userSockets.delete(uid);
        break;
      }
    }
    console.log("🔴 User disconnected");
  });
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

// 🚨 SOS Emergency Broadcast
app.post("/api/sos", (req, res) => {
  const { latitude, longitude, message, senderName } = req.body;
  const sos = {
    latitude,
    longitude,
    message: message || "Emergency! Immediate help needed!",
    senderName: senderName || "Anonymous",
    type: "SOS",
    urgency: "critical",
    time: new Date().toISOString(),
  };
  io.emit("sos-alert", sos); // 🔥 broadcast to ALL connected clients
  console.log("🚨 SOS broadcast:", sos);
  res.json({ success: true, sos });
});

// 🤝 Social Connect Request
app.post("/api/connect", (req, res) => {
  const { fromUser, toUser, fromName } = req.body;
  if (!fromUser || !toUser) {
    return res.status(400).json({ error: "Missing fromUser or toUser" });
  }

  const recipientSocketId = userSockets.get(toUser);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("connect-request", {
      fromId: fromUser,
      fromName: fromName || "Someone",
      time: new Date().toISOString()
    });
    return res.json({ success: true, message: "Request sent!" });
  }

  res.json({ success: false, message: "User is currently offline, but they will see this later." });
});

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
