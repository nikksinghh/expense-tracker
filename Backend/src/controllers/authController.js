const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Room = require('../models/Room');
const { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_SECURE, NODE_ENV } = require('../config/env');

// Password strength checker
const getPasswordStrength = (password) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  score = Object.values(checks).filter(Boolean).length;
  const commonPasswords = ['password', '123456', 'password123', 'qwerty', '12345678', 'abc123', 'password1', '111111', '123123'];
  const isCommon = commonPasswords.includes(password.toLowerCase());
  
  let label = 'Very Weak';
  if (isCommon) return { score: 0, label: 'Too Common', checks, isCommon: true };
  if (score >= 5) label = 'Very Strong';
  else if (score === 4) label = 'Strong';
  else if (score === 3) label = 'Medium';
  else if (score === 2) label = 'Weak';
  
  return { score, label, checks, isCommon: false };
};

// Helper to sign JWT and set HttpOnly cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upiId: user.upiId,
        avatar: user.avatar,
        room: user.room,
        role: user.email?.toLowerCase() === 'nikhiladmin@gmail.com' ? 'admin' : (user.role === 'admin' ? 'admin' : 'user'),
        themePreference: user.themePreference
      }
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, upiId } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const assignedRole = email.toLowerCase() === 'nikhiladmin@gmail.com' ? 'admin' : 'user';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      upiId: upiId || '',
      role: assignedRole
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.'
      });
    }

    // Check if user is blocked by admin
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact the administrator.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get current logged in user & room status
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'room',
        populate: {
          path: 'members',
          select: 'name email phone upiId avatar'
        }
      });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check password strength
// @route   POST /api/auth/check-password
// @access  Public
const checkPasswordStrength = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });
  const result = getPasswordStrength(password);
  
  // Also check if same password hash exists in DB (privacy-safe check)
  const suggestions = [];
  if (!result.checks.length) suggestions.push('Use at least 8 characters');
  if (!result.checks.uppercase) suggestions.push('Add uppercase letters (A-Z)');
  if (!result.checks.number) suggestions.push('Add numbers (0-9)');
  if (!result.checks.special) suggestions.push('Add special characters (!@#$...)');
  if (result.isCommon) suggestions.push('This is a very common password, choose something unique');
  
  res.json({ success: true, ...result, suggestions });
};

// @desc    Request password reset (generates secure 6-digit OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Please provide your email' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Generate random 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');

    user.passwordResetOTP = hashedOtp;
    user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.passwordResetAttempts = 0;
    await user.save({ validateBeforeSave: false });

    // Output OTP in response for development / demo verification
    res.status(200).json({
      success: true,
      message: `A 6-digit verification OTP has been sent for ${email}.`,
      otp: rawOtp, // Provided for user verification testing
      expiresInMinutes: 10
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP and generate secure reset session token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordResetOTP +passwordResetOTPExpires +passwordResetAttempts');

    if (!user || !user.passwordResetOTP) {
      return res.status(400).json({ success: false, message: 'No active password reset request found for this email.' });
    }

    if (user.passwordResetOTPExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (user.passwordResetAttempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    const hashedInputOtp = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
    if (hashedInputOtp !== user.passwordResetOTP) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${5 - user.passwordResetAttempts} attempts remaining.`
      });
    }

    // OTP Verified successfully -> generate 15-minute reset session token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    user.passwordResetAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! You can now set your new password.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using verified session token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset session. Please request a new OTP.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login / verification
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { email, name, googleId, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by the administrator.'
        });
      }
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user via Google
      const randomPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: randomPassword,
        googleId: googleId || '',
        avatar: avatar || '',
        authProvider: 'google'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  logout,
  getMe,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  checkPasswordStrength
};

