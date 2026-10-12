const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const {
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
  NODE_ENV
} = require('../config/env');

/**
 * Send Transactional Email using official Brevo REST API v3
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * 
 * Bounded with 10-second AbortSignal timeout and isolated error handling.
 */
const sendViaBrevo = async ({ to, name, subject, html, text }) => {
  const apiKey = (process.env.BREVO_API_KEY || BREVO_API_KEY || '').trim();
  if (!apiKey) return null;

  // In test environment, mock actual transmission
  if (NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    return { success: true, provider: 'brevo', messageId: 'mock-brevo-' + Date.now() };
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || BREVO_SENDER_EMAIL || 'support@roommates.app').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || BREVO_SENDER_NAME || 'RoomMates').trim();

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: to,
        name: name || 'RoomMate'
      }
    ],
    subject,
    htmlContent: html,
    textContent: text
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = data?.message || response.statusText || `Brevo HTTP Error ${response.status}`;
      console.error('❌ [Brevo API Error]:', errMsg);
      return { success: false, provider: 'brevo', error: errMsg, statusCode: response.status };
    }

    if (NODE_ENV !== 'test') {
      console.log('✅ [Brevo API] Email delivered successfully to:', to, 'MessageId:', data?.messageId);
    }

    return { success: true, provider: 'brevo', messageId: data?.messageId };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const errMsg = isTimeout ? 'Brevo API request timed out (10s limit)' : err.message;
    console.error('❌ [Brevo Exception]:', errMsg);
    return { success: false, provider: 'brevo', error: errMsg, isTimeout };
  }
};

/**
 * Send email using Resend HTTP API (Secondary fallback if configured)
 */
const sendViaResend = async ({ to, subject, html, text }) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  if (NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    return { success: true, provider: 'resend', id: 'mock-resend-id' };
  }

  try {
    const resend = new Resend(apiKey);
    const from = (process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.EMAIL_FROM || 'RoomMates <onboarding@resend.dev>').trim();

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    });

    if (error) {
      console.error('❌ [Resend API Error]:', error.message || error);
      return { success: false, provider: 'resend', error: error.message || String(error) };
    }

    return { success: true, provider: 'resend', id: data?.id };
  } catch (err) {
    console.error('❌ [Resend Exception]:', err.message);
    return { success: false, provider: 'resend', error: err.message };
  }
};

/**
 * Create reusable Nodemailer transporter for SMTP (Tertiary fallback)
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 10000
    });
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 10000
    });
  }

  return null;
};

/**
 * Send email using Nodemailer SMTP
 */
const sendViaSmtp = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  if (!transporter) return null;

  if (NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    return { success: true, provider: 'smtp', id: 'mock-smtp-id' };
  }

  const from = (process.env.SMTP_FROM || process.env.GMAIL_USER || 'RoomMates Support <no-reply@roommates.app>').trim();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text
    });

    return { success: true, provider: 'smtp', id: info.messageId };
  } catch (error) {
    console.error('❌ [SMTP Error]:', error.message);
    return { success: false, provider: 'smtp', error: error.message };
  }
};

/**
 * Master dispatcher: Prioritizes Brevo API, falls back to Resend / SMTP if configured.
 */
const dispatchEmail = async ({ to, name, subject, html, text }) => {
  // 1. Try Brevo Transactional API (Primary)
  const brevoResult = await sendViaBrevo({ to, name, subject, html, text });
  if (brevoResult && brevoResult.success) {
    return brevoResult;
  }

  // 2. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend({ to, subject, html, text });
    if (resendResult && resendResult.success) {
      return resendResult;
    }
  }

  // 3. Try SMTP if configured
  const smtpResult = await sendViaSmtp({ to, subject, html, text });
  if (smtpResult && smtpResult.success) {
    return smtpResult;
  }

  if (NODE_ENV !== 'test') {
    console.warn('⚠️ [EMAIL NOTICE] No active email provider configured (BREVO_API_KEY or SMTP credentials missing). Email delivery skipped.');
  }

  return {
    success: false,
    message: 'No email service provider configured on server.'
  };
};

/**
 * Send Email Verification with both 1-Click Link and 6-Digit OTP
 * 
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} verifyUrl - Complete 1-click verification link
 * @param {string} otpCode - 6-digit cryptographic OTP code
 */
const sendVerificationEmail = async (to, name, verifyUrl, otpCode) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f5ff; margin: 0; padding: 0; color: #0f2057; }
        .wrapper { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(29,114,254,0.08); border: 1px solid #d8e8ff; }
        .header { background: linear-gradient(135deg, #1d72fe, #0f2057); padding: 36px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; color: #e8f0ff; }
        .content { padding: 36px 30px; }
        .content p { font-size: 15px; line-height: 1.6; margin: 0 0 18px; color: #4a5568; }
        .otp-card { background: #eef3ff; border: 1.5px dashed #1d72fe; border-radius: 14px; padding: 22px; text-align: center; margin: 26px 0; }
        .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #1d72fe; margin-bottom: 8px; }
        .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f2057; margin: 6px 0; }
        .otp-expiry { font-size: 12px; color: #718096; margin-top: 6px; }
        .button-wrapper { text-align: center; margin: 26px 0; }
        .btn-link { display: inline-block; background: #1d72fe; color: #ffffff !important; padding: 14px 34px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 14px rgba(29,114,254,0.3); }
        .divider { border-top: 1px solid #e8edf8; margin: 28px 0; position: relative; text-align: center; }
        .divider span { background: #ffffff; padding: 0 14px; position: relative; top: -10px; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; letter-spacing: 0.5px; }
        .url-box { background: #f8faff; border: 1px solid #d8e8ff; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #718096; font-family: monospace; }
        .footer { background: #f8faff; padding: 20px 30px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #e8edf8; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>⚡ RoomMates Expense Tracker</h1>
          <p>Verify your email address to activate your account</p>
        </div>
        <div class="content">
          <p>Hello <strong>${name || 'RoomMate'}</strong>,</p>
          <p>Welcome to RoomMates! To start splitting and tracking shared expenses with roommates, please verify your email address using either method below:</p>
          
          <div class="otp-card">
            <div class="otp-label">Your 6-Digit Verification Code</div>
            <div class="otp-digits">${otpCode}</div>
            <div class="otp-expiry">⏱️ Valid for 10 minutes (single-use)</div>
          </div>

          <div class="divider">
            <span>OR VERIFY WITH ONE CLICK</span>
          </div>

          <div class="button-wrapper">
            <a href="${verifyUrl}" class="btn-link" target="_blank">Verify Email Instantly</a>
          </div>

          <p style="font-size: 13px; color: #718096; margin-top: 24px;">
            If you did not create a RoomMates account, please ignore this email. No account will be activated without this verification.
          </p>

          <div class="url-box">
            If the button doesn't open, copy and paste this direct verification URL into your browser:<br/>
            ${verifyUrl}
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RoomMates Expense Tracker. Secured with cryptographic HMAC-SHA-256 tokens.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name || 'RoomMate'},\n\nWelcome to RoomMates! Please verify your email.\n\nYour 6-Digit OTP: ${otpCode}\n(Valid for 10 minutes)\n\nOr click here to verify instantly:\n${verifyUrl}\n\nIf you did not sign up, please ignore this message.`;
  const subject = '🔐 Verify Your RoomMates Account (Code: ' + otpCode + ')';

  return await dispatchEmail({ to, name, subject, html, text });
};

/**
 * Send Password Reset Email with Token & Direct Link
 * 
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} resetUrl - Complete password reset link URL
 */
const sendPasswordResetEmail = async (to, name, resetUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f5ff; margin: 0; padding: 0; color: #0f2057; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(29,114,254,0.08); border: 1px solid #d8e8ff; }
        .header { background: linear-gradient(135deg, #1d72fe, #0f2057); padding: 36px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .body { padding: 36px 30px; }
        .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #4a5568; }
        .button-wrapper { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #1d72fe; color: #ffffff !important; padding: 14px 34px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 14px rgba(29,114,254,0.3); }
        .url-box { background: #f8faff; border: 1px solid #d8e8ff; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #718096; font-family: monospace; margin-top: 20px; }
        .footer { background: #f8faff; padding: 20px 30px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #e8edf8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 RoomMates Password Reset</h1>
        </div>
        <div class="body">
          <p>Hello <strong>${name || 'RoomMate'}</strong>,</p>
          <p>We received a request to reset the password for your RoomMates expense tracker account.</p>
          <p>Click the button below to choose a new password. This single-use link is valid for <strong>15 minutes</strong>.</p>
          <div class="button-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #718096;">If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.</p>
          <div class="url-box">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            ${resetUrl}
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RoomMates Expense Tracker. Secured with 256-bit encryption.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name || 'RoomMate'},\n\nReset your password here: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`;
  const subject = '🔐 RoomMates - Reset Your Password';

  return await dispatchEmail({ to, name, subject, html, text });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendViaBrevo,
  sendViaResend,
  sendViaSmtp,
  createTransporter
};
