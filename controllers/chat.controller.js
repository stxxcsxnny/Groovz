import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_IN_SOCKET,
  REFETCH_CHATS,
} from "../constants/event.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import { User } from "../models/user.js";
import {
  deletFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { getOtherMembers } from "../utils/helper.js";
const newGroupChat = async (req, res) => {
  try {
    const { name, members } = req.body;

    console.log("Received data in backend: ", req.body);
    console.log("Group Name:", name);
    console.log("Group Members:", members);

    if (!name || !members) {
      return res.status(400).json({ message: "Name and members are required" });
    }

    if (members.length < 2) {
      return res
        .status(400)
        .json({ message: "At least 2 members are required" });
    }

    const allMembers = [...members, req.user];

    const newChat = await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
    });

    console.log("New chat created: ", newChat);

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group chat`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({ message: "Group chat created successfully" });
  } catch (error) {
    console.error("Error creating group chat: ", error);
    return res.status(500).json({ message: error.message });
  }
};

// Get All Chats (Private and Group)
const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user })
      .populate("creator", "name")
      .populate("members", "name avatar");

    const transformedChats = chats.map(({ _id, name, groupChat, members, lastMessage }) => {
      const otherMember = getOtherMembers(members, req.user)[0];

      return {
        _id,
        name: groupChat ? name : otherMember?.name || "No Name",
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar?.url || avatar || "No Avatar")
          : [otherMember?.avatar?.url || otherMember?.avatar || "No Avatar"],
        lastMessage: lastMessage || "No messages yet",
        members: members
        .filter((m) => m._id.toString() !== req.user.toString())
        .map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar?.url || avatar || "No Avatar",
        })),
      
      };
    });

    return res.status(200).json({ success: true, chats: transformedChats });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: error.message });
  }
};


// Get My Group Chats (Created by Me)
const getMyGroups = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      groupChat: true,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ _id, name, members, groupChat }) => ({
      _id,
      name,
      groupChat,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Add Members to Group
const addMembers = async (req, res) => {
  try {
    const { chatId, members } = req.body;
    const chatDoc = await Chat.findById(chatId);

    if (!members || members.length < 1) {
      return res
        .status(400)
        .json({ message: "Please add at least one member" });
    }

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chatDoc.groupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    if (chatDoc.creator.toString() !== req.user.toString()) {
      return res.status(401).json({ message: "Not authorized to add members" });
    }

    const allNewMembers = await Promise.all(
      members.map((i) => User.findById(i, "name"))
    );

    const uniqueMembers = allNewMembers.filter(
      (i) => !chatDoc.members.includes(i._id.toString())
    );

    chatDoc.members.push(...uniqueMembers.map((i) => i._id));

    if (chatDoc.members.length > 100) {
      return res
        .status(400)
        .json({ message: "Group chat can only have 100 members" });
    }

    await chatDoc.save();

    const allUserName = allNewMembers.map((i) => i.name).join(", ");

    emitEvent(
      req,
      ALERT,
      chatDoc.members,
      `${req.user.name} added ${allUserName} to the group`
    );
    emitEvent(req, REFETCH_CHATS, chatDoc.members);

    return res.status(200).json({
      success: true,
      message: "Members added successfully",
      allUserName,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Remove Member
const removeMembers = async (req, res) => {
  try {
    const { userId, chatId } = req.body;
    const [chatDoc, userToRemove] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId),
    ]);

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chatDoc.groupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    if (chatDoc.creator.toString() !== req.user.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to remove members" });
    }

    const AllChatMembers = chatDoc.members.map((i) => i.toString());

    chatDoc.members = chatDoc.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chatDoc.save();

    emitEvent(
      req,
      ALERT,
      chatDoc.members,
      `${req.user.name} removed ${userToRemove.name}`
    );
    emitEvent(req, REFETCH_CHATS, AllChatMembers);

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Leave Group
const leaveGroup = async (req, res) => {
  try {
    const chatId = req.params.id.trim();
    const chatDoc = await Chat.findById(chatId);

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const remainingMembers = chatDoc.members.filter(
      (member) => member.toString() !== req.user.toString()
    );

    if (
      chatDoc.creator.toString() === req.user.toString() &&
      remainingMembers.length > 0
    ) {
      const newCreator =
        remainingMembers[Math.floor(Math.random() * remainingMembers.length)];
      chatDoc.creator = newCreator;
    }

    if (remainingMembers.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      return res.status(200).json({
        success: true,
        message:
          "You left the group, and it was deleted as no members were left.",
      });
    }

    chatDoc.members = remainingMembers;
    await chatDoc.save();

    emitEvent(req, ALERT, chatDoc.members, `${req.user.name} left the group`);
    emitEvent(req, REFETCH_CHATS, chatDoc.members);

    return res.status(200).json({
      success: true,
      message: "You left the group successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Send Attachments
const sendAttachments = async (req, res) => {
  try {
    const { chatId } = req.body;
    const chatDoc = await Chat.findById(chatId);
    const me = await User.findById(req.user, "name avatar");

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "Please provide files" });
    }

    const attachments = await uploadFilesToCloudinary(files);

    const messageDoc = await Message.create({
      content: "",
      sender: me._id,
      attachments,
      chat: chatId,
    });

    emitEvent(req, NEW_MESSAGE_IN_SOCKET, chatDoc.members, {
      message: {
        _id: messageDoc._id,
        content: "",
        sender: me,
        attachments,
        chat: chatId,
      },
      chatId,
    });

    emitEvent(req, NEW_MESSAGE, chatDoc.members, { chatId });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get Chat Details
const getChatdetails = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id).populate("members", "name avatar _id");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    return res.status(200).json({ chat });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

const renameGroup = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;

    // Check if name is provided
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Group name is required" });
    }

    const chatDoc = await Chat.findById(chatId);

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chatDoc.groupChat) {
      return res
        .status(400)
        .json({ message: "You can only rename group chats" });
    }

    if (chatDoc.creator.toString() !== req.user.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to rename this group" });
    }

    chatDoc.name = name;
    await chatDoc.save();

    emitEvent(req, REFETCH_CHATS, chatDoc.members);

    return res.status(200).json({
      success: true,
      message: "Group renamed successfully",
      chat: chatDoc, // Optional: return updated chat for frontend
    });
  } catch (error) {
    console.error("Rename group error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete Chat
const deleteChat = async (req, res) => {
  try {
    const chatId = req.params.id;
    const chatDoc = await Chat.findById(chatId);

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }

   

    const messages = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];
    messages.forEach(({ attachments }) => {
      attachments.forEach(({ public_id }) => public_ids.push(public_id));
    });

    await Promise.all([
      deletFilesFromCloudinary(public_ids),
      chatDoc.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, chatDoc.members);

    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get Messages with Pagination
const getMessages = async (req, res) => {
  try {
    const chatId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chatDoc = await Chat.findById(chatId);

    if (!chatDoc) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (!chatDoc.members.includes(req.user.toString())) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this chat" });
    }

    const [messages, total] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name avatar")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      messages,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching messages",
      error: error.message,
    });
  }
};

export {
  addMembers,
  deleteChat,
  getChatdetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttachments,
};
