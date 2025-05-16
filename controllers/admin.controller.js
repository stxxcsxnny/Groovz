import jwt from 'jsonwebtoken';
import chat from '../models/chat.js';
import message from '../models/message.js';
import { User } from '../models/user.js';
import { ErrorHandler } from '../utils/utility.js';

const adminlogin = async (req, res, next) => {
  try {
    const { secretKey } = req.body;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;

    if (secretKey !== adminSecretKey) {
      return next(new ErrorHandler('Invalid Admin Secret Key', 401));
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res
      .status(200)
      .cookie('grooves-admin-token', token, {
        maxAge: 1000 * 60 * 15,
        sameSite: 'none',
        secure: true, // ✅ false for localhost
        httpOnly: true,
      })
      .json({
        success: true,
        message: 'Admin Logged In Successfully',
        admin: { role: 'admin' },
      });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

const adminlogout = async (req, res, next) => {
  try {
    return res.status(200).clearCookie('grooves-admin-token').json({
      success: true,
      message: 'Admin Logged Out Successfully',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

const allusers = async (req, res) => {
  try {
    const users = await User.find({});

    const transformedUsers = await Promise.all(
      users.map(async ({ name, username, email, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          chat.countDocuments({ groupChat: true, members: _id }),
          chat.countDocuments({ groupChat: false, members: _id }),
        ]);
        return {
          name,
          username,
          email,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );

    res.status(200).json({
      success: true,
      users: transformedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const allChats = async (req, res) => {
  try {
    const chatDoc = await chat
      .find()
      .populate('members', 'name avatar')
      .populate('creator', 'name avatar');

    const transformedChats = await Promise.all(
      chatDoc.map(async ({ members, creator, _id, groupChat, name }) => {
        const totalMessages = await message.countDocuments({ chat: _id });
        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || 'None',
            avatar: creator?.avatar.url || '',
          },
          totalmembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(200).json({
      success: true,
      chats: transformedChats, // Corrected this line
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const allMessages = async (req, res) => {
  try {
    const messages = await message
      .find({})
      .populate('sender', 'name avatar')
      .populate('chat', 'groupChat');

    const transformedMessages = messages.map(
      ({ content, attachments, sender, chat, _id, createdAt }) => ({
        _id,
        content,
        attachments,
        sender: sender
          ? {
              _id: sender._id || 'None',
              name: sender.name || 'None',
              avatar: sender.avatar?.url || '',
            }
          : {
              _id: 'None',
              name: 'None',
              avatar: '',
            },
        chat: chat ? chat._id : 'None',
        groupChat: chat ? chat.groupChat : false,
      })
    );

    return res.status(200).json({
      success: true,
      messages: transformedMessages, // Corrected this line
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getDashboardsStats = async (req, res) => {
  try {
    const [groupCount, userCount, messageCount, totalChatsCount] =
      await Promise.all([
        chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        message.countDocuments(),
        chat.countDocuments(),
      ]);

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await message
      .find({
        createdAt: { $gte: last7Days, $lte: today },
      })
      .select('content createdAt');

    const messages = new Array(7).fill(0);

    last7DaysMessages.forEach((message) => {
      const indexApprox =
        (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const index = Math.floor(indexApprox);
      messages[6 - index]++;
    });

    const stats = {
      groupCount,
      userCount,
      messageCount,
      totalChatsCount,
      messageChart: messages,
    };

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getAdminData = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: { role: 'admin' },
    });
    // Should have admin data after passing through middleware
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export {
  adminlogin,
  adminlogout,
  allChats,
  allMessages,
  allusers,
  getAdminData,
  getDashboardsStats,
};
