import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import mongoose from "mongoose";
import { NEW_REQUEST } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import Chat from "../models/chat.js";
import Request from "../models/request.js";
import { User } from "../models/user.js";
import {
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

// New User controller function
const newUser = async (req, res, next) => {
  try {
    const { name, username, password, email } = req.body;
    const file = req.file;

    console.log("📥 req.body:", req.body);
    console.log("📎 req.file:", file);

    if (!file) {
      return next(new ErrorHandler("Please upload a file", 400));
    }

    const result = await uploadFilesToCloudinary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url, // ✅ secure_url is now just 'url'
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      email,
      avatar,
    });

    sendToken(res, user, 201, "User created successfully");
  } catch (error) {
    console.error("❌ newUser error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Login user controller function
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("📥 Login attempt:", { username, password }); // Log input

    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      console.log("❌ User not found in DB.");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("🔐 Stored password hash:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("✅ Password match result:", isMatch);

    if (!isMatch) {
      console.log("❌ Incorrect password");
      return res.status(400).json({ message: "Invalid password" });
    }

    console.log("🎉 Login successful, sending token...");
    sendToken(res, user, 200, `Welcome back, ${user.name}`);
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get user profile
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Error getting profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Logout user
const logout = async (req, res) => {
  return res
    .status(200)
    .cookie("Groove-token", "", {
      maxAge: 0,
      sameSite: "none",
      secure: true,
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged out successfully",
    });
};

// Search users
const searchUser = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: name, $options: "i" } },
        { email: { $regex: name, $options: "i" } },
      ],
    });

    const finalUsers = users.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar?.url || "",
    }));

    return res.status(200).json({ success: true, users: finalUsers });
  } catch (error) {
    console.error("❌ Search User Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    if (userId === req.user) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }

    const requestDoc = await Request.findOne({
      $or: [
        { sender: req.user, receiver: userId },
        { sender: userId, receiver: req.user },
      ],
    });

    if (requestDoc) {
      return res.status(400).json({ message: "Request already sent" });
    }

    await Request.create({
      sender: req.user,
      receiver: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId]);
    console.log(emitEvent);

    console.log("🔔 Emitting event:", NEW_REQUEST, [userId]);

    return res.status(200).json({ message: "Request sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId, accept } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const requestDoc = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    if (!requestDoc) {
      return res.status(400).json({ message: "Request not found" });
    }

    if (requestDoc.receiver._id.toString() !== req.user.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    if (!accept) {
      await requestDoc.deleteOne();
      return res.status(200).json({ message: "Request rejected" });
    }

    const members = [requestDoc.sender._id, requestDoc.receiver._id];

    const existingChat = await Chat.findOne({
      members: { $all: members, $size: 2 },
      groupChat: false,
    });

    if (existingChat) {
      await requestDoc.deleteOne();
      return res.status(200).json({
        message: "Request accepted (chat already existed)",
        senderId: requestDoc.sender._id,
        chatId: existingChat._id,
      });
    }

    const newChat = await Chat.create({
      members,
      name: `${requestDoc.sender.name} - ${requestDoc.receiver.name}`,
      groupChat: false,
      creator: requestDoc.receiver._id,
    });

    await requestDoc.deleteOne();
    return res.status(200).json({
      message: "Request accepted",
      senderId: requestDoc.sender._id,
      chatId: newChat._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all notifications
const getAllNotification = async (req, res) => {
  try {
    const requestDoc = await Request.find({ receiver: req.user }).populate(
      "sender",
      "name avatar"
    );

    const allRequests = requestDoc.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));

    return res.status(200).json({ allRequests });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get my friends
const getMyFriends = async (req, res) => {
  try {
    const chatId = req.query.chatId;

    const chatDoc = await Chat.find({
      members: req.user,
      groupChat: false,
    }).populate("members", "name avatar");

    const friendMap = new Map();

    chatDoc.forEach(({ members }) => {
      const otherMember = getOtherMember(members, req.user);
      if (!friendMap.has(otherMember._id.toString())) {
        friendMap.set(otherMember._id.toString(), {
          _id: otherMember._id,
          name: otherMember.name,
          avatar: otherMember.avatar.url,
        });
      }
    });

    const friends = Array.from(friendMap.values());

    if (chatId) {
      const selectedChatDoc = await Chat.findById(chatId);
      const availableFriends = friends.filter(
        (friend) => !selectedChatDoc.members.includes(friend._id)
      );
      return res.status(200).json({ friends: availableFriends });
    }

    return res.status(200).json({ friends });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  acceptFriendRequest,
  getAllNotification,
  getMyFriends,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
};
