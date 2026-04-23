const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
require("dotenv").config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api/", limiter);

const corsOptions = {
  origin: function (origin, callback) {
    // Reflect the request origin, or allow if no origin (e.g. Postman)
    callback(null, origin || true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Attach io to app for use in routes
app.set("io", io);

// Middleware
app.use(cors(corsOptions));
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

const { auth, authorize } = require("./middleware/auth");

// API Check - Admin Only
app.get("/api/users", auth, authorize("admin"), async (req, res) => {
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
app.post("/api/connect", auth, (req, res) => {
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
