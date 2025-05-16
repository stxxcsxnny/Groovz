// Import the mongoose and jwt libraries
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import { getSockets } from './helper.js';

// Function to connect to the MongoDB database
const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: 'Groove' })
    .then((data) =>
      console.log(`✅ MongoDB connected with server: ${data.connection.host}`)
    )
    .catch((err) => {
      throw err;
    });
};

// ✅ Fixed sendToken function
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res
    .status(code)
    .cookie('Groove-token', token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true, // ✅ false for localhost
      httpOnly: true,
    })
    .json({
      success: true,
      user,
      message,
    });
};

// Function to emit an event to the client (placeholder)
const emitEvent = (req, event, users, data) => {
  let io = req.app.get('io');
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data);
  console.log('📢 Emitting event:', event);
};
const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: uuid(),
        },
        (err, result) => {
          if (err) return reject(err);
          console.log('📤 Cloudinary Upload Result:', result);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    return results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url, // ✅ This must exist
    }));
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error);
    throw new Error('Error while uploading files to Cloudinary');
  }
};

// Empty cloudinary delete placeholder
const deletFilesFromCloudinary = async (public_ids) => {
  // TODO: implement deletion
};

// Exports
export {
  deletFilesFromCloudinary,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
};
export default connectDB;
