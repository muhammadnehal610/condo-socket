// server.js (Updated to support feedback and feedback replies)
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Replace with specific domain in production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// Map user_id to connected socket IDs
const userSockets = new Map();

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("register", (user_id) => {
    if (!userSockets.has(user_id)) {
      userSockets.set(user_id, new Set());
    }
    userSockets.get(user_id).add(socket.id);
    console.log(`User ${user_id} registered to socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
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

app.get("/", (req, res) => {
  res.send("WebSocket Server is running in Node js");
});

// Emit general notification
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
    console.log(`Notification sent to user ${user_id}`);
  } else {
    console.log(`No active sockets for user ${user_id}`);
  }

  res.json({ success: true });
});

// Emit new feedback
app.post("/emit-feedback", (req, res) => {
  const { user_id, feedback } = req.body;

  if (!user_id || !feedback) {
    return res.status(400).json({ error: "Missing user_id or feedback" });
  }

  const sockets = userSockets.get(String(user_id));
  if (sockets && sockets.size > 0) {
    sockets.forEach(socketId => {
      io.to(socketId).emit("new_feedback", feedback);
    });
    console.log(`Feedback emitted to user ${user_id}`);
  }

  res.json({ success: true });
});

// Emit feedback reply
app.post("/emit-reply", (req, res) => {
  const { user_id, reply } = req.body;

  if (!user_id || !reply) {
    return res.status(400).json({ error: "Missing user_id or reply" });
  }

  const sockets = userSockets.get(String(user_id));
  if (sockets && sockets.size > 0) {
    sockets.forEach(socketId => {
      io.to(socketId).emit("new_reply", reply);
    });
    console.log(`Reply emitted to user ${user_id}`);
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
