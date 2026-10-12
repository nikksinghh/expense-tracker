require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'roommates_secure_jwt_token_secret_key_2025_safe',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  APP_URL: process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  BREVO_API_KEY: (process.env.BREVO_API_KEY || '').trim(),
  BREVO_SENDER_EMAIL: (process.env.BREVO_SENDER_EMAIL || 'support@roommates.app').trim(),
  BREVO_SENDER_NAME: (process.env.BREVO_SENDER_NAME || 'RoomMates').trim(),
  OTP_SECRET: process.env.OTP_SECRET || process.env.JWT_SECRET || 'roommates_secure_otp_secret_key_2025_safe'
};
