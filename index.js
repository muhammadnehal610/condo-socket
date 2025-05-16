// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your frontend domain for production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// Map of user_id to socket id(s)
const userSockets = new Map();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  // Register user to a socket
  socket.on("register", (user_id) => {
    if (!userSockets.has(user_id)) {
      userSockets.set(user_id, new Set());
    }
    userSockets.get(user_id).add(socket.id);
    console.log(`🔗 User ${user_id} registered to socket ${socket.id}`);
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    for (const [user_id, sockets] of userSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user_id);
        }
        break;
      }
    }
  });
});

app.get("/" , (req , res) => {
    res.send("hello")
})
// REST endpoint to receive notification from WordPress
app.post("/emit", (req, res) => {
  const { user_id, title, message } = req.body;

  if (!user_id || !title || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const sockets = userSockets.get(String(user_id));
  if (sockets && sockets.size > 0) {
    sockets.forEach(socketId => {
      io.to(socketId).emit("new_notification", { title, message });
    });
    console.log(`📨 Notification sent to user ${user_id}`);
  } else {
    console.log(`⚠️ No active sockets for user ${user_id}`);
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
