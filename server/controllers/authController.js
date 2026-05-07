import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validateEmail, validatePassword, getPasswordStrengthMessage, validateName, validateCollege, sanitizeInput } from '../utils/validators.js';
import { ApiError, asyncHandler } from '../utils/errorHandler.js';

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, college, referralCode } = req.body;

  // Validate input
  if (!name || !email || !password || !college) {
    throw new ApiError('All fields are required', 400, 'MISSING_FIELDS');
  }

  // Validate email format
  if (!validateEmail(email)) {
    throw new ApiError('Invalid email format', 400, 'INVALID_EMAIL');
  }

  // Validate password strength
  if (!validatePassword(password)) {
    throw new ApiError(
      `Password must be at least 8 characters with uppercase, lowercase, number, and special character. ${getPasswordStrengthMessage(password)}`,
      400,
      'WEAK_PASSWORD'
    );
  }

  // Validate name
  if (!validateName(name)) {
    throw new ApiError('Name must be between 2-100 characters', 400, 'INVALID_NAME');
  }

  // Validate college
  if (!validateCollege(college)) {
    throw new ApiError('College name must be between 2-200 characters', 400, 'INVALID_COLLEGE');
  }

  // Sanitize inputs
  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = email.toLowerCase().trim();
  const sanitizedCollege = sanitizeInput(college);

  // Check if user exists
  const existingUser = await User.findOne({ email: sanitizedEmail });
  if (existingUser) {
    throw new ApiError('Email already registered', 400, 'EMAIL_EXISTS');
  }

  // Handle referral
  let referredBy = null;
  if (referralCode) {
    referredBy = await User.findById(referralCode);
  }

  // Create user
  const user = new User({
    name: sanitizedName,
    email: sanitizedEmail,
    password,
    college: sanitizedCollege,
    referredBy: referredBy?._id
  });

  await user.save();

  // Generate token
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({
    message: 'User created successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      college: user.college,
      readinessScore: user.readinessScore
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError('Email and password are required', 400, 'MISSING_FIELDS');
  }

  // Validate email format
  if (!validateEmail(email)) {
    throw new ApiError('Invalid email format', 400, 'INVALID_EMAIL');
  }

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Generate token
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      college: user.college,
      profile: user.profile,
      readinessScore: user.readinessScore
    }
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  
  if (!user) {
    throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  res.json({ user });
});

export const logout = asyncHandler(async (req, res) => {
  // Could implement token blacklist here if needed
  // For now, just confirm logout
  res.json({ message: 'Logged out successfully' });
});
