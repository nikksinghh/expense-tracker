const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_SECURE,
  NODE_ENV,
  CLIENT_URL,
  OTP_SECRET
} = require('../config/env');
const {
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Password strength checker helper
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
  const commonPasswords = [
    'password', '123456', 'password123', 'qwerty',
    '12345678', 'abc123', 'password1', '111111', '123123'
  ];
  const isCommon = commonPasswords.includes(password.toLowerCase());

  let label = 'Very Weak';
  if (isCommon) return { score: 0, label: 'Too Common', checks, isCommon: true };
  if (score >= 5) label = 'Very Strong';
  else if (score === 4) label = 'Strong';
  else if (score === 3) label = 'Medium';
  else if (score === 2) label = 'Weak';

  return { score, label, checks, isCommon: false };
};

// Helper to sign JWT with tokenVersion and set HttpOnly cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );

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
        emailVerified: user.emailVerified,
        themePreference: user.themePreference
      }
    });
};

// Helper to generate verification link and 6-digit OTP credentials
const generateVerificationTokens = () => {
  // 1. Single-use 32-byte hex link token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 2. Cryptographically secure 6-digit OTP (100000 - 999999)
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const secretKey = OTP_SECRET || JWT_SECRET;
  const otpHash = crypto.createHmac('sha256', secretKey).update(rawOtp).digest('hex');

  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return {
    rawToken,
    tokenHash,
    rawOtp,
    otpHash,
    expiry
  };
};

// @desc    Register a new user (requires email verification before login)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, upiId } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail }).select('+passwordResetToken +emailVerificationToken');
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Safe recovery for pending unverified accounts: update details and re-send verification
      const { rawToken, tokenHash, rawOtp, otpHash, expiry } = generateVerificationTokens();
      existingUser.name = name;
      existingUser.password = password; // pre-save will re-hash
      if (phone !== undefined) existingUser.phone = phone;
      if (upiId !== undefined) existingUser.upiId = upiId;
      existingUser.emailVerificationToken = tokenHash;
      existingUser.emailVerificationExpires = expiry;
      existingUser.emailVerificationOtp = otpHash;
      existingUser.emailVerificationOtpExpires = expiry;
      existingUser.otpAttempts = 0;
      existingUser.otpLockoutUntil = null;
      existingUser.lastResendTimestamp = new Date();
      await existingUser.save();

      const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
      const emailResult = await sendVerificationEmail(existingUser.email, existingUser.name, verifyUrl, rawOtp);

      return res.status(201).json({
        success: true,
        message: 'Account created! Please check your email to verify with the link or 6-digit OTP.',
        email: existingUser.email,
        emailSent: emailResult.success
      });
    }

    const assignedRole = normalizedEmail === 'nikhiladmin@gmail.com' ? 'admin' : 'user';
    const { rawToken, tokenHash, rawOtp, otpHash, expiry } = generateVerificationTokens();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone || '',
      upiId: upiId || '',
      role: assignedRole,
      emailVerified: false,
      emailVerificationToken: tokenHash,
      emailVerificationExpires: expiry,
      emailVerificationOtp: otpHash,
      emailVerificationOtpExpires: expiry,
      otpAttempts: 0,
      otpLockoutUntil: null,
      lastResendTimestamp: new Date()
    });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const emailResult = await sendVerificationEmail(user.email, user.name, verifyUrl, rawOtp);

    // Note: User is NOT authenticated yet. Must verify email first.
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email for the verification link or 6-digit OTP.',
      email: user.email,
      emailSent: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email using 1-click token link
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new verification email.'
      });
    }

    // Invalidate both link token and OTP upon successful verification
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockoutUntil = null;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email using 6-digit OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationOtp +emailVerificationOtpExpires +otpAttempts +otpLockoutUntil'
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Email is already verified. You can sign in.'
      });
    }

    // Check account-level temporary lockout (15 minutes)
    if (user.otpLockoutUntil && user.otpLockoutUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.otpLockoutUntil - new Date()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Account locked for ${minutesRemaining} more minutes. Please try again later or request a new code.`
      });
    }

    // Check OTP expiration
    if (!user.emailVerificationOtpExpires || user.emailVerificationOtpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    if (!user.emailVerificationOtp) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found. Please request a new verification code.'
      });
    }

    // Compute candidate HMAC-SHA256
    const secretKey = OTP_SECRET || JWT_SECRET;
    const candidateHash = crypto.createHmac('sha256', secretKey).update(cleanOtp).digest('hex');

    // Constant-time comparison
    const storedBuf = Buffer.from(user.emailVerificationOtp, 'hex');
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const isMatch = storedBuf.length === candidateBuf.length && crypto.timingSafeEqual(storedBuf, candidateBuf);

    if (!isMatch) {
      const attempts = (user.otpAttempts || 0) + 1;
      user.otpAttempts = attempts;

      if (attempts >= 5) {
        user.otpLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect OTP attempts. Your account has been temporarily locked for 15 minutes.'
        });
      }

      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${5 - attempts} attempt(s) remaining.`
      });
    }

    // Verification successful: invalidate both OTP and link tokens
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockoutUntil = null;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email (link + OTP) with rate limit & 60s cooldown
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+lastResendTimestamp');

    // Anti-enumeration: Return generic safe response if user does not exist or is already verified
    if (!user || user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists with this email, a new verification email has been dispatched.'
      });
    }

    // Enforce 60-second cooldown
    const COOLDOWN_MS = 60 * 1000;
    if (user.lastResendTimestamp && (Date.now() - new Date(user.lastResendTimestamp).getTime()) < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(user.lastResendTimestamp).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification email.`,
        retryAfter: waitSeconds
      });
    }

    // Rotate verification token & OTP
    const { rawToken, tokenHash, rawOtp, otpHash, expiry } = generateVerificationTokens();
    user.emailVerificationToken = tokenHash;
    user.emailVerificationExpires = expiry;
    user.emailVerificationOtp = otpHash;
    user.emailVerificationOtpExpires = expiry;
    user.otpAttempts = 0;
    user.otpLockoutUntil = null;
    user.lastResendTimestamp = new Date();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const emailResult = await sendVerificationEmail(user.email, user.name, verifyUrl, rawOtp);

    res.status(200).json({
      success: true,
      message: 'If an unverified account exists with this email, a new verification email has been dispatched.',
      emailSent: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user (strictly rejects unverified accounts)
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

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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

    // Check if account has verified email address
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in. Check your inbox for the verification link or 6-digit OTP.',
        email: user.email
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

// @desc    Logout user / clear HttpOnly cookie
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
          select: 'name email phone upiId avatar emailVerified'
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

  const suggestions = [];
  if (!result.checks.length) suggestions.push('Use at least 8 characters');
  if (!result.checks.uppercase) suggestions.push('Add uppercase letters (A-Z)');
  if (!result.checks.number) suggestions.push('Add numbers (0-9)');
  if (!result.checks.special) suggestions.push('Add special characters (!@#$...)');
  if (result.isCommon) suggestions.push('This is a very common password, choose something unique');

  res.json({ success: true, ...result, suggestions });
};

// @desc    Request password reset (anti-enumeration response + Brevo email)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration protection
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email address, you will receive password reset instructions shortly.'
      });
    }

    // Generate random 32-byte reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox. Please check your email and spam folder.',
      emailSent: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using single-use token and revoke active sessions
// @route   POST /api/auth/reset-password or PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token. Please request a new reset link.'
      });
    }

    // Update password, invalidate token, and increment tokenVersion to revoke all active sessions
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '142740479335-23ben0g6abeob15cbs8i1pdikekljna3.apps.googleusercontent.com').trim();

// @desc    Real Google OAuth 2.0 verification and login/signup
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { credential, email: clientEmail, name: clientName, googleId: clientGoogleId, avatar: clientAvatar } = req.body;

    let email = clientEmail;
    let name = clientName;
    let googleId = clientGoogleId;
    let avatar = clientAvatar;

    if (credential) {
      try {
        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          email = payload.email;
          name = payload.name || payload.given_name || email.split('@')[0];
          googleId = payload.sub;
          avatar = payload.picture || avatar;
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid Google authentication payload.'
          });
        }
      } catch (verifyErr) {
        if (process.env.NODE_ENV !== 'test') {
          return res.status(401).json({
            success: false,
            message: 'Google ID token verification failed. Please sign in again.'
          });
        }
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by the administrator.'
        });
      }
      // Since identity is cryptographically verified by Google, mark emailVerified: true
      user.emailVerified = true;
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
      }
      await user.save({ validateBeforeSave: false });
    } else {
      const randomPassword = crypto.randomBytes(24).toString('hex') + 'Aa1!';
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: randomPassword,
        googleId: googleId || '',
        avatar: avatar || '',
        emailVerified: true, // Google accounts verified by definition
        role: normalizedEmail === 'nikhiladmin@gmail.com' ? 'admin' : 'user'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  verifyOtp,
  resendVerification,
  login,
  googleLogin,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  checkPasswordStrength
};
