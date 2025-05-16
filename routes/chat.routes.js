import express from "express";
import { multerUpload } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  getMyChats,
  getMyGroups,
  newGroupChat,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatdetails,
  renameGroup,
  deleteChat,
  getMessages
} from "../controllers/chat.controller.js";

const router = express.Router();

// ✅ All routes below require authentication
router.use(isAuthenticated);

// 📁 Create a new group chat
router.post("/new", newGroupChat);

// 📥 Get all user chats
router.get("/mychats", getMyChats);

// 👥 Get only group chats
router.get("/mychats/groups", getMyGroups);

// ➕ Add members to a group
router.put("/addmembers", addMembers);

// ➖ Remove a member from a group
router.put("/removemember", removeMembers);

// 🚪 Leave a group
router.delete("/leavegroup/:id", leaveGroup);

// 📎 Send messages with optional file attachments
router.post("/message", multerUpload.array("files", 10), sendAttachments);

// 📨 Get messages from a chat
router.get("/message/:id", getMessages);

// 🧾 Chat details (get, update group name, or delete chat)
router
  .route("/:id")
  .get(getChatdetails)
  .put(renameGroup)
  .delete(deleteChat);

export default router;
