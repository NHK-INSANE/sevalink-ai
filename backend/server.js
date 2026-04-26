const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const Problem = require("./models/Problem");

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

// System Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const userSockets = new Map(); // userId -> socketId
const lastOpsUpdate = new Map(); // userId -> lastTimestamp (ms)

// 📐 Distance Function (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

io.on("connection", (socket) => {
  console.log("🟢 User connected via Socket.IO:", socket.id);

  socket.on("register-user", (userId) => {
    if (userId) {
      userSockets.set(userId, socket.id);
      socket.join(userId); 
      console.log(`👤 User ${userId} registered and joined room ${userId}`);
    }
  });

  socket.on("join", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`💬 User ${userId} joined their notification room`);
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

  // 🔥 CHAT SYSTEM (Step 9)
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`💬 Joined Chat Channel: ${chatId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const Message = require("./models/Message");
      const Chat = require("./models/Chat");
      const Problem = require("./models/Problem");

      const { chatId, problemId, senderId, senderName, text, type, mediaUrl } = data;

      // 1. Handle Mission Team Chat
      if (problemId) {
        const problem = await Problem.findById(problemId);
        if (!problem) return;

        const newMessage = { senderId, senderName, text, type: type || "text", mediaUrl, createdAt: new Date() };
        problem.messages.push(newMessage);
        await problem.save();

        io.to(problemId).emit("receive_message", { ...newMessage, problemId });
        
        // AI Auto-Ack for Help/Status
        if (text?.toLowerCase().includes("help") || text?.toLowerCase().includes("status")) {
          const aiMsg = { text: "🤖 AI AUTO-ACK: Message received by Ops. Analyzing tactical priority.", senderName: "AI Dispatcher", type: "system", createdAt: new Date(), problemId };
          problem.messages.push(aiMsg);
          await problem.save();
          io.to(problemId).emit("receive_message", aiMsg);
        }
      } 
      // 2. Handle Direct Chat
      else if (chatId) {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const newMessage = await Message.create({ chatId, senderId, message: text, type: type || "text", mediaUrl });
        await newMessage.populate("senderId", "name");

        chat.lastMessage = newMessage._id;
        await chat.save();

        // Broadcast to participants
        chat.participants.forEach(pId => {
          const sid = userSockets.get(pId.toString());
          if (sid && sid !== socket.id) { // Don't notify sender via event (they have optimistic UI)
            io.to(sid).emit("receive_message", { ...newMessage.toObject(), chatId });
          } else if (sid === socket.id) {
            // Echo back for confirmation if needed, but usually frontend handles it
            socket.emit("message_sent", newMessage);
          }
        });
      }
    } catch (err) {
      console.error("Socket send_message failure:", err);
    }
  });


  // 🏥 OPS COMMAND CENTER (Step 10 Polish)
  socket.on("join_ops", () => {
    socket.join("ops_room");
    console.log(`📡 Ops Terminal Active: ${socket.id}`);
  });

  socket.on("update_location", (data) => {
    if (!data.userId) return;
    liveLocations[data.userId] = { ...data, lastUpdate: new Date() };
    io.emit("live_locations", liveLocations); // Broad broadcast for map synchronization
  });

  socket.on("new_crisis", async (data) => {
    // 1. Trigger Tactical Feed for Ops
    io.to("ops_room").emit("ops_event", {
      type: "CRISIS",
      payload: { message: `🔴 NEW CRISIS: ${data.title} reported at ${data.location?.address || "Field"}` },
      time: new Date()
    });

    // 2. Intelligence processing
    const { detectSeverity } = require("./engine/intelligence");
    const severity = detectSeverity(data.message || data.description);

    if (severity === "CRITICAL") {
      io.emit("global_alert", { message: `🚨 CRITICAL ALERT: ${data.title}`, type: "CRITICAL" });
      io.to("ops_room").emit("ops_event", { type: "AI", payload: { message: `🧠 AI: Severity analyzed as CRITICAL. Immediate escalation initiated.` }, time: new Date() });
    }
  });

  socket.on("sos_alert", (data) => {
    io.to("ops_room").emit("ops_event", {
      type: "SOS",
      payload: { message: `🆘 SOS SIGNAL: responder ${data.senderName} has triggered emergency beacon.` },
      time: new Date()
    });
  });

  socket.on("new_crisis", async (data) => {
    // 1. Immediate AI Ack to the sender
    socket.emit("ops_event", {
      type: "AI",
      payload: { 
        message: "🧠 AI DISPATCHER: We are taking action for your request. Stay calm. Help is being coordinated.",
        isAutoReply: true
      },
      time: new Date()
    });

    // 2. Trigger Global Alert if Critical (Intelligence is now modular)
    const { detectSeverity } = require("./engine/intelligence");
    const severity = detectSeverity(data.message || data.description);

    if (severity === "CRITICAL") {
      io.emit("global_alert", {
        message: `🚨 URGENT: Critical crisis detected: ${data.title}`,
        location: data.location,
        type: "CRITICAL"
      });
    }

    // 3. Autonomous Dispatch Flow
    const { autoDispatch } = require("./engine/dispatcher");
    await autoDispatch(data, io, userSockets);

    // 4. Broadcast to OPS for live visualization
    io.to("ops_room").emit("ops_event", {
      type: "DISPATCH",
      payload: { ...data, severity },
      time: new Date()
    });
  });

  socket.on("sos_alert", (data) => {
    // AI Auto-Reply for SOS
    socket.emit("ops_event", {
      type: "AI",
      payload: { 
        message: "🚨 SOS RECEIVED: Help is on the way. The nearest responders have been notified.",
        isAutoReply: true
      },
      time: new Date()
    });

    io.to("ops_room").emit("ops_event", {
      type: "SOS",
      payload: data,
      time: new Date()
    });

    // Global Alert for SOS
    io.emit("global_alert", {
      message: `🆘 SOS EMERGENCY: ${data.senderName || "Unknown"} needs help!`,
      location: data.location,
      type: "SOS"
    });
  });
  
  socket.on("broadcast_alert", (data) => {
    // Broadcast a general alert to everyone
    io.emit("global_alert", {
      message: `📢 BROADCAST: ${data.message}`,
      type: "ALERT"
    });

    io.to("ops_room").emit("ops_event", {
      type: "SYSTEM",
      payload: { message: `Global Broadcast: ${data.message}` },
      time: new Date()
    });
  });

  socket.on("run_simulation", async (config) => {
    console.log("🧪 SIMULATION: Starting autonomous test sequence...");
    
    const fakeCrisis = {
      userId: "SIM-USER-001",
      title: config.type === "FLOOD" ? "Major Flood: Sector 7" : "Building Collapse: North Bridge",
      description: config.type === "FLOOD" 
        ? "Water levels rising rapidly. 50+ households trapped. Need immediate evacuation."
        : "Commercial structure collapse. Multiple casualties reported. Structural fire detected.",
      location: config.location || { lat: 22.57, lng: 88.36 },
      category: [config.type || "general"],
      severity: "critical",
      time: new Date()
    };

    // Trigger the real Brain
    const { autoDispatch } = require("./engine/dispatcher");
    const result = await autoDispatch(fakeCrisis, io, userSockets);

    io.emit("simulation_started", { 
      crisis: fakeCrisis, 
      missionId: result?.missionChat?._id 
    });

    io.emit("global_alert", {
      message: `🧪 SIMULATION ACTIVE: ${fakeCrisis.title}`,
      type: "critical"
    });
  });

  socket.on("ai_update", (data) => {
    io.to("ops_room").emit("ops_event", {
      type: "AI",
      payload: data,
      time: new Date()
    });
  });

  socket.on("send_message", async (data) => {
    try {
      const Message = require("./models/Message");
      const Chat = require("./models/Chat");
      
      const chat = await Chat.findById(data.chatId);
      if (!chat) return;

      const newMessage = new Message({
        chatId: data.chatId,
        senderId: data.senderId,
        message: data.message,
        type: data.type || "text",
        mediaUrl: data.mediaUrl,
      });
      await newMessage.save();
      await newMessage.populate("senderId", "name");

      chat.lastMessage = newMessage._id;
      await chat.save();

      // Emit to all participants in this chat
      chat.participants.forEach(pId => {
        const sid = userSockets.get(pId.toString());
        if (sid) io.to(sid).emit("receive_message", newMessage);
      });
    } catch (err) {
      console.error("Socket send_message error:", err);
    }
  });

  socket.on("system_event", (data) => {
    io.to("ops_room").emit("ops_event", {
      type: data.type || "SYSTEM",
      payload: data.payload || data,
      time: new Date()
    });
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
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middleware/errorHandler");

app.use("/api/problems", problemRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", statsRoutes);

// Media Upload Route
app.post("/api/upload", auth, upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded");
      error.status = 400;
      throw error;
    }
    res.json({ success: true, data: { url: `${process.env.API_URL || ""}/uploads/${req.file.filename}` } });
  } catch (error) {
    next(error);
  }
});

// Rate limiter for SOS
const sosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 SOS requests per minute
  message: "Too many SOS requests. Please wait a moment."
});

// SOS Emergency Broadcast to Nearest Responders
app.post("/api/sos", sosLimiter, async (req, res, next) => {
  try {
    const { latitude, longitude, message, senderName } = req.body;
    
    if (!latitude || !longitude) {
      const error = new Error("Location coordinates missing");
      error.status = 400;
      throw error;
    }

    const sos = new SOS({
      latitude,
      longitude,
      message: message || "Emergency! Immediate help needed!",
      senderName: senderName || "Anonymous",
    });
    await sos.save();
    console.log("🚨 SOS saved:", sos);

    // 🔥 Broadcast to OPS Room
    io.to("ops_room").emit("ops_event", {
      type: "SOS",
      payload: sos,
      time: new Date()
    });

    // 🔥 Find Nearest Responders (NGOs & Volunteers)
    const responders = await User.find({
      role: { $in: ["volunteer", "Volunteer", "worker", "Worker", "ngo", "NGO"] }
    });

    const nearest = responders
      .map(r => {
        const rLat = r.location?.lat || r.latitude || 22.3;
        const rLng = r.location?.lng || r.longitude || 87.3;
        return { user: r, distance: getDistance(latitude, longitude, rLat, rLng) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // 🚀 Broadcast to them directly and save persistent notifications
    for (const r of nearest) {
      const userId = r.user._id.toString();
      
      // 1. Save to DB
      const notification = new Notification({
        userId: userId,
        type: "sos",
        message: `🚨 SOS Emergency Nearby: ${sos.message}`,
        data: { sosId: sos._id }
      });
      await notification.save();

      // 2. Emit via socket
      const socketId = userSockets.get(userId);
      if (socketId) {
        io.to(socketId).emit("new-notification", notification);
      }
    }

    // Auto-remove SOS
    setTimeout(async () => {
      try {
        await SOS.deleteOne({ _id: sos._id });
        io.emit("remove-sos", sos._id); // tell everyone to remove the marker
      } catch (err) {}
    }, 5 * 60 * 1000);

    res.json({ success: true, data: { sos, notifiedCount: nearest.length } });
  } catch (err) {
    next(err);
  }
});

// Social Connect Request
app.post("/api/connect", auth, async (req, res, next) => {
  try {
    const { fromUser, toUser, fromName, message } = req.body;
    if (!fromUser || !toUser) {
      const error = new Error("Missing fromUser or toUser");
      error.status = 400;
      throw error;
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
    next(err);
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
app.use(errorHandler);

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

          // 🔥 Broadcast to OPS Room
          io.to("ops_room").emit("ops_event", {
            type: "SYSTEM",
            payload: { message: `Escalated: ${r.title}`, problemId: r._id },
            time: new Date()
          });
        }
      } catch (err) {
        console.error("Escalation worker error:", err);
      }
    }, 60000); // Check every minute

    // 🔥 PREDICTIVE CRISIS DETECTION
    setInterval(async () => {
      try {
        const Problem = require("./models/Problem");
        const recentProblems = await Problem.find({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        const zones = {};
        recentProblems.forEach(r => {
          if (!r.location?.lat || !r.location?.lng) return;
          const key = `${Math.round(r.location.lat * 10) / 10}-${Math.round(r.location.lng * 10) / 10}`;
          if (!zones[key]) zones[key] = { count: 0, lat: r.location.lat, lng: r.location.lng };
          zones[key].count++;
        });

        Object.values(zones).forEach(zone => {
          if (zone.count >= 3) {
            io.emit("pre_alert", {
              message: `⚠️ Predictive System: High incident cluster forming near [${zone.lat.toFixed(2)}, ${zone.lng.toFixed(2)}]`,
              location: { lat: zone.lat, lng: zone.lng }
            });

            // 🔥 Broadcast to OPS Room
            io.to("ops_room").emit("ops_event", {
              type: "AI",
              payload: { message: `Cluster detected at ${zone.lat.toFixed(2)}, ${zone.lng.toFixed(2)}` },
              time: new Date()
            });
          }
        });
      } catch (err) {
        console.error("Prediction worker error:", err);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // 🔥 HEATMAP INTELLIGENCE WORKER
    setInterval(async () => {
      try {
        const Problem = require("./models/Problem");
        const crises = await Problem.find({
          status: { $ne: "Resolved" }
        });
        
        const heatMap = {};
        crises.forEach(c => {
          if (!c.location?.lat || !c.location?.lng) return;
          const key = `${Math.round(c.location.lat * 10)}_${Math.round(c.location.lng * 10)}`;
          heatMap[key] = (heatMap[key] || 0) + 1;
        });

        const heatmapData = Object.entries(heatMap).map(([key, count]) => {
          const [lat, lng] = key.split("_");
          return { lat: lat / 10, lng: lng / 10, intensity: count };
        });

        io.emit("heatmap_update", heatmapData);
      } catch (err) { console.error("Heatmap Worker Error:", err); }
    }, 2 * 60 * 1000); // Update every 2 minutes

    // 🔥 MISSION LIFECYCLE WORKER (Auto-Archive)
    setInterval(async () => {
      try {
        const Problem = require("./models/Problem");
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const result = await Problem.updateMany(
          { 
            status: "RESOLVED", 
            updatedAt: { $lte: sevenDaysAgo },
            isArchived: false 
          },
          { $set: { isArchived: true } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`🧹 Archived ${result.modifiedCount} resolved missions.`);
        }
      } catch (err) {
        console.error("Lifecycle Worker Error:", err);
      }
    }, 24 * 60 * 60 * 1000); // Run once a day

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

startServer();
