import express from 'express';
import {
  adminlogin,
  adminlogout,
  allChats,
  allMessages,
  allusers,
  getAdminData,
  getDashboardsStats,
} from '../controllers/admin.controller.js';
import { adminLOGINvalidator, validateHandle } from '../lib/validator.js';
import { isAuthenticatedAdmin } from '../middlewares/auth.js';

const router = express.Router();
router.post('/verify', adminLOGINvalidator(), validateHandle, adminlogin);
router.get('/logout', adminlogout);

router.use(isAuthenticatedAdmin);

router.get('/me', getAdminData);

router.get('/users', allusers);
router.get('/chats', allChats);
router.get('/messages', allMessages);
router.get('/stats', getDashboardsStats);

export default router;
