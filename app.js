import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

import { errorMIddleware } from "./middlewares/error.js";
import connectDB from "./utils/features.js";
import { getSockets } from "./utils/helper.js";

import adminRoute from "./routes/admin.routes.js";
import chatRoute from "./routes/chat.routes.js";
import userRoute from "./routes/user.routes.js";

import { corsOptions } from "./constants/config.js";
import {
  ANSWER,
  CHAT_EXITED,
  CHAT_JOINED,
  ICE_CANDIDATE,
  INCOMING_RING,
  JOIN_CALL,
  NEW_MESSAGE,
  NEW_MESSAGE_IN_SOCKET,
  OFFER,
  ONLINE_USERS,
  OTHER_USER,
  RING_CALL,
  START_TYPING,
  STOP_TYPING,
  USER_JOINED_CALL,
} from "./constants/event.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import message from "./models/message.js";

// Load environment variables
dotenv.config({ path: "./.env" });

const app = express();
const server = createServer(app);

// ✅ Setup CORS
app.use(cors(corsOptions));

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Connect to MongoDB
connectDB(process.env.MONGO_URI);

// ✅ Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// A Map to store user IDs and their associated socket IDs (supports multiple sockets per user)
const userSocketIDS = new Map();
const onlineUsers = new Set();

// ✅ Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello World from Express and Socket.IO!");
});

// ✅ WebSocket
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Middleware for authenticating the socket connection
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, (err) => {
    socketAuthenticator(err, socket, next);
  });
});
const callRooms = new Map();
// Handling socket connections
// Handling socket connections
io.on("connection", (socket) => {
  const user = socket.user; // Get the authenticated user from the socket
  console.log("User connected:", user);

  // Store the socket ID in the Map, allowing multiple socket connections per user
  if (userSocketIDS.has(user._id.toString())) {
    userSocketIDS.get(user._id.toString()).push(socket.id);
  } else {
    userSocketIDS.set(user._id.toString(), [socket.id]);
  }

  // Listen for new messages from the user
  socket.on(NEW_MESSAGE_IN_SOCKET, async ({ chatId, members, messageStore }) => {
    const messageForRealTime = {
      content: messageStore,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageDB = {
      content: messageStore,
      sender: user._id,
      chat: chatId,
    };

    // Get all socket IDs of the members in the chat
    const memberSocket = getSockets(members);

    console.log("Sending message to socket IDs:", memberSocket);
    if (memberSocket.length > 0) {
      io.to(memberSocket).emit(NEW_MESSAGE_IN_SOCKET, {
        chatId,
        message: messageForRealTime,
      });

      io.to(memberSocket).emit(NEW_MESSAGE, {
        chatId,
        senderId: user._id.toString(),
      });
      
    } else {
      console.log("No members connected to send message to.");
    }

    await message.create(messageDB); // Save the message to the database
  });

  // Typing Event: Start
  socket.on(START_TYPING, ({ chatId, members, typingUserId }) => {
    const memberSockets = getSockets(members);

    memberSockets.forEach((id) => {
      io.to(id).emit(START_TYPING, {
        chatId,
        typingUserId, // ✅ Send typing user ID
      });
    });
  });

  // Typing Event: Stop
  socket.on(STOP_TYPING, ({ chatId, members, typingUserId }) => {
    const memberSockets = getSockets(members);

    memberSockets.forEach((id) => {
      io.to(id).emit(STOP_TYPING, {
        chatId,
        typingUserId, // ✅ Send typing user ID
      });
    });
  });

  // Handle chat join
  socket.on(CHAT_JOINED, (userId, members) => {
    onlineUsers.add(userId.toString());
    const memberSockets = getSockets(members);
    io.to(memberSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // Handle chat exit
  socket.on(CHAT_EXITED, (userId, members) => {
    onlineUsers.delete(userId.toString());
    const memberSockets = getSockets(members);
    io.to(memberSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

 

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    // Clean up user socket connection
    if (user && user._id) {
      const userSockets = userSocketIDS.get(user._id.toString()) || [];
      const updatedSockets = userSockets.filter((id) => id !== socket.id);
      if (updatedSockets.length > 0) {
        userSocketIDS.set(user._id.toString(), updatedSockets);
      } else {
        userSocketIDS.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
      }
    }
  });
});



// ✅ Error middleware
app.use(errorMIddleware);

// ✅ Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

export { userSocketIDS };
