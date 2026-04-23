const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: ["https://sevalink-ai.vercel.app", "http://localhost:3000", "http://localhost:3001"],
  credentials: true
};

// 1. CORS - MUST BE FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ["https://sevalink-ai.vercel.app", "http://localhost:3000", "http://localhost:3001"];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow non-browser requests (like mobile or postman)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// 2. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for now to avoid blocking
}));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api/", limiter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Attach io to app for use in routes
app.set("io", io);

app.use(express.json());

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

  socket.on("join-discussion", (problemId) => {
    socket.join(problemId);
    console.log(`📡 Socket ${socket.id} joined discussion: ${problemId}`);
  });

  socket.on("send-discussion-message", async (data) => {
    io.to(data.problemId).emit("new-discussion-message", data);
  });

  socket.on("typing", ({ problemId, userName }) => {
    socket.to(problemId).emit("user-typing", { userName, userId: socket.id });
  });

  socket.on("stop-typing", ({ problemId }) => {
    socket.to(problemId).emit("user-stop-typing", { userId: socket.id });
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of userSockets.entries()) {
      if (sid === socket.id) {
        userSockets.delete(uid);
        break;
      }
    }
    console.log("🔴 User disconnected");
  });
});

const User = require("./models/User");
const SOS = require("./models/SOS");
const Notification = require("./models/Notification");

const { auth, authorize } = require("./middleware/auth");

// Public user list (safe fields only — no passwords/emails exposed fully)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("name role location ngoName ngoContact skill skills latitude longitude email phone address bio");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Routes
const problemRoutes = require("./routes/problemRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/problems", problemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", statsRoutes);

// Rate limiter for SOS
const sosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 SOS requests per minute
  message: "Too many SOS requests. Please wait a moment."
});

// SOS Emergency Broadcast
app.post("/api/sos", sosLimiter, async (req, res) => {
  try {
    const { latitude, longitude, message, senderName } = req.body;
    const sos = new SOS({
      latitude,
      longitude,
      message: message || "Emergency! Immediate help needed!",
      senderName: senderName || "Anonymous",
    });
    await sos.save();
    io.emit("sos-alert", sos);
    console.log("🚨 SOS broadcast saved & emitted:", sos);

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

// Social Connect Request
app.post("/api/connect", auth, async (req, res) => {
  try {
    const { fromUser, toUser, fromName, message } = req.body;
    if (!fromUser || !toUser) {
      return res.status(400).json({ error: "Missing fromUser or toUser" });
    }

    // 1. Save to DB
    const notification = new Notification({
      userId: toUser,
      type: "connection_request",
      message: message || `${fromName || "Someone"} wants to coordinate with you.`,
      fromUser: fromUser,
      fromName: fromName || "Someone",
    });
    await notification.save();

    // 2. Emit via Socket if online
    const recipientSocketId = userSockets.get(toUser);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("new-notification", notification);
    }

    res.json({ success: true, message: "Connection request broadcasted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SevaLink AI Backend Running ✅", status: "ok" });
});

// DB Status check
app.get("/api/db-status", (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  res.json({ 
    status: states[state] || "unknown", 
    connected: state === 1,
    dbName: mongoose.connection.name
  });
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
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

startServer();
