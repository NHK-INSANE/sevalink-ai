const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// 1. CORS - PRODUCTION READY (Simplified for reliability)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: false
}));

const multer = require("multer");
const path = require("path");
const upload = multer({ dest: "uploads/" });

// 2. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for now to avoid blocking
}));

// 3. Rate Limiting (Increased for dashboard stability)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 500,
  message: "Too many requests. Please slow down."
});
app.use("/api/", limiter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ["websocket", "polling"]
});

// Attach io to app for use in routes
app.set("io", io);
global.io = io; // Make accessible globally for notification emitters

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
    try {
      const Message = require("./models/Message");
      const newMessage = new Message({
        problemId: data.problemId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        type: data.type || "text",
        mediaUrl: data.mediaUrl,
      });
      await newMessage.save();
      io.to(data.problemId).emit("new-discussion-message", newMessage);
    } catch (err) {
      console.error("Failed to save socket message:", err);
    }
  });

  socket.on("typing", ({ problemId, userName }) => {
    socket.to(problemId).emit("user-typing", { userName, userId: socket.id });
  });

  socket.on("stop-typing", ({ problemId }) => {
    socket.to(problemId).emit("user-stop-typing", { userId: socket.id });
  });

  // 🔥 NEW CHAT LOGIC
  socket.on("join_problem", (id) => {
    socket.join(id);
    console.log(`💬 Joined problem room: ${id}`);
  });

  socket.on("send_message", ({ problemId, text, senderName }) => {
    io.to(problemId).emit("receive_message", { text, senderName, time: new Date() });
  });

  // 🔥 LIVE RESPONDER TRACKING
  socket.on("update_location", (data) => {
    // data = { id, lat, lng }
    io.emit("responder_moved", data);
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

// Routes
const problemRoutes = require("./routes/problemRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const teamRoutes = require("./routes/teamRoutes");
const messageRoutes = require("./routes/messageRoutes");
const requestRoutes = require("./routes/requestRoutes");

app.use("/api/problems", problemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api", statsRoutes);

// Media Upload Route
app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `${process.env.API_URL || ""}/uploads/${req.file.filename}` });
});

// Rate limiter for SOS
const sosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 SOS requests per minute
  message: "Too many SOS requests. Please wait a moment."
});

// SOS Emergency Broadcast to Nearest Responders
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
    console.log("🚨 SOS saved:", sos);

    // 🔥 Find Nearest Responders (NGOs & Volunteers)
    const responders = await User.find({
      role: { $in: ["volunteer", "Volunteer", "worker", "Worker", "ngo", "NGO"] }
    });

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const nearest = responders
      .map(r => {
        const rLat = r.location?.lat || r.latitude || 22.3;
        const rLng = r.location?.lng || r.longitude || 87.3;
        return { user: r, distance: getDistance(latitude, longitude, rLat, rLng) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // 🚀 Broadcast to them directly
    nearest.forEach(r => {
      const socketId = userSockets.get(r.user._id.toString());
      if (socketId) {
        io.to(socketId).emit("sos-alert", sos);
      }
    });

    // Auto-remove SOS
    setTimeout(async () => {
      try {
        await SOS.deleteOne({ _id: sos._id });
        io.emit("remove-sos", sos._id); // tell everyone to remove the marker
      } catch (err) {}
    }, 5 * 60 * 1000);

    res.json({ success: true, sos, notifiedCount: nearest.length });
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

    // Real-Time Crisis Escalation Background Worker
    setInterval(async () => {
      try {
        const Problem = require("./models/Problem");
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // Find problems that are old, unresolved, and not yet Critical
        const problems = await Problem.find({
          createdAt: { $lte: thirtyMinsAgo },
          status: { $in: ["Open", "open", "In Progress", "in-progress"] },
          urgency: { $ne: "Critical" }
        });

        for (let r of problems) {
          r.urgency = "Critical";
          r.timeline.push({ text: "⚠️ System Auto-Escalation: Unresolved for > 30 mins" });
          await r.save();
          
          io.emit("escalation", r);
          io.emit("problem-updated", r);
        }
      } catch (err) {
        console.error("Escalation worker error:", err);
      }
    }, 60000); // Check every minute

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

startServer();
