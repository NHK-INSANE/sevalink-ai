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
const SOS = require("./models/SOS");

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
app.post("/api/sos", async (req, res) => {
  try {
    const { latitude, longitude, message, senderName } = req.body;
    
    const sos = new SOS({
      latitude,
      longitude,
      message: message || "Emergency! Immediate help needed!",
      senderName: senderName || "Anonymous",
    });

    await sos.save();

    io.emit("sos-alert", sos); // 🔥 broadcast to ALL connected clients
    console.log("🚨 SOS broadcast saved & emitted:", sos);

    // Auto-remove after 5 minutes for live clients
    setTimeout(async () => {
      try {
        await SOS.deleteOne({ _id: sos._id });
        io.emit("remove-sos", sos._id);
        console.log(`🗑️ SOS ${sos._id} auto-removed`);
      } catch (err) {
        console.error("SOS removal error:", err);
      }
    }, 5 * 60 * 1000);

    res.json({ success: true, sos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SevaLink AI Backend Running ✅", status: "ok" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({
    error: err.message || "Internal Server Error"
  });
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
