import express from "express";
import { acceptFriendRequest, getAllNotification, getMyFriends, getMyProfile, login, logout, newUser, searchUser, sendFriendRequest } from "../controllers/user.controller.js";
import { multerUpload } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { loginvalidator, registervalidator, validateHandle } from "../lib/validator.js";

const router = express.Router();  // Changed router to router for clarity
//
// Create a new user
router.post('/new',multerUpload.single("avatar"), registervalidator(), validateHandle ,newUser);
// Login a user
router.post('/login',loginvalidator(), validateHandle,  login);


// after here user must be logged in to access these routes
router.use(isAuthenticated);
// Get the user's profile
router.get('/profile', getMyProfile);
// Logout the user
router.get('/logout', logout);
// Search for a user
router.get("/search", searchUser);

router.put("/sendrequest", sendFriendRequest)

router.put("/acceptrequest", acceptFriendRequest)

router.get("/notification", getAllNotification)

// Get all friends

router.get("/friends", getMyFriends)


// Export the router
export default router;