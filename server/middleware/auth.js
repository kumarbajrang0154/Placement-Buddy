import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/errorHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new ApiError('Authentication required', 401, 'NO_TOKEN');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Update days active (atomic operation to prevent race conditions)
  const today = new Date().setHours(0, 0, 0, 0);
  const lastActive = new Date(user.lastActiveDate).setHours(0, 0, 0, 0);
  
  if (today > lastActive) {
    // Use atomic update to prevent race condition
    await User.updateOne(
      { 
        _id: user._id, 
        lastActiveDate: { $lt: new Date(today) } 
      },
      { 
        $inc: { daysActive: 1 }, 
        $set: { lastActiveDate: new Date() } 
      }
    );
    // Update local user object
    user.daysActive += 1;
    user.lastActiveDate = new Date();
  }

  req.user = user;
  req.userId = user._id;
  next();
});
