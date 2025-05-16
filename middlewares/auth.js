import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import { ErrorHandler } from '../utils/utility.js';

const isAuthenticated = (req, res, next) => {
  const token = req.cookies['Groove-token'];

  if (!token) {
    return next(new ErrorHandler('Please login first', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded._id;
    next();
  } catch (error) {
    return next(new ErrorHandler('Invalid token prblmn', 401));
  }
};

const isAuthenticatedAdmin = (req, res, next) => {
  const token = req.cookies['grooves-admin-token'];
  if (!token)
    return res.status(401).json({ success: false, message: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Unauthorized');

    req.admin = decoded;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    // If there's a previous error, pass it to next()
    if (err) {
      return next(new ErrorHandler('Please login first', 401, err));
    }

    // Extract the token from cookies
    const authToken = socket.request.cookies['Groove-token'];

    // If there's no token, send a 401 response
    if (!authToken) {
      return next(new ErrorHandler('Please login first', 401));
    }

    // Verify the token using JWT
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    // Find the user based on the decoded token
    const user = await User.findById(decoded._id);

    // If no user is found, return an error
    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Attach the user object to the socket for later use
    socket.user = user;
    console.log(`✅ User connected: ${socket.id}, User ID: ${user._id}`);
    // Proceed with the next middleware
    return next();
  } catch (error) {
    // Handle JWT verification errors, expired tokens, or other errors
    console.error('Authentication error:', error);

    // Send a 401 unauthorized response if any error occurs
    return next(new ErrorHandler('Please login to access this route', 401));
  }
};

export { isAuthenticated, isAuthenticatedAdmin, socketAuthenticator };
