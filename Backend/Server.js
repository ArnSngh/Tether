const express = require("express");
const connectDB = require("./config/db.js");
const dotenv = require("dotenv");
require("colors");
const userRoutes = require("./routes/userRoutes.js");
const chatRoutes = require("./routes/chatRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");
const path = require("path");

const jwt = require("jsonwebtoken");
const Chat = require("./models/chatModel.js");
const Message = require("./models/messageModel.js");
dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const CLIENT_URLS = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());
const isPrivateDevelopmentOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(:\d+)?$/.test(
    origin
  );

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        CLIENT_URLS.includes(origin) ||
        (process.env.NODE_ENV !== "production" &&
          isPrivateDevelopmentOrigin(origin))
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;

  if (!token) return next(new Error("Not authorized"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("Not authorized"));
  }
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", () => {
    socket.join(String(socket.userId));
    socket.emit("connected");
  });

  socket.on("join chat", async (room, acknowledge) => {
    try {
      const membership = await Chat.exists({ _id: room, users: socket.userId });
      if (!membership) return acknowledge && acknowledge(false);

      socket.join(String(room));
      if (acknowledge) acknowledge(true);
    } catch (error) {
      if (acknowledge) acknowledge(false);
    }
  });

  socket.on("typing", (room) => {
    if (socket.rooms.has(String(room))) socket.to(String(room)).emit("typing");
  });
  socket.on("stop typing", (room) => {
    if (socket.rooms.has(String(room))) socket.to(String(room)).emit("stop typing");
  });

  socket.on("messages read", (chatId) => {
    if (socket.rooms.has(String(chatId))) {
      socket.to(String(chatId)).emit("messages read", {
        chatId: String(chatId),
        userId: String(socket.userId),
      });
    }
  });

  socket.on("new message", async (newMessageReceived) => {
    if (!newMessageReceived || !newMessageReceived._id) return;

    try {
      const message = await Message.findById(newMessageReceived._id)
        .populate("sender", "name pic")
        .populate({
          path: "chat",
          populate: { path: "users", select: "name pic email" },
        });

      if (!message || String(message.sender._id) !== String(socket.userId)) return;

      const chat = message.chat;
      if (!chat.users.some((user) => String(user._id) === String(socket.userId))) {
        return;
      }

      chat.users.forEach((user) => {
        if (String(user._id) !== String(socket.userId)) {
          io.to(String(user._id)).emit("message recieved", message);
        }
      });
    } catch (error) {
      console.error("Failed to broadcast chat message:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
    if (socket.userId) {
      socket.leave(socket.userId);
    }
  });
});
