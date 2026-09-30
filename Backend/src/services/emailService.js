const nodemailer = require('nodemailer');

/**
 * Create and configure reusable Nodemailer transporter
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
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000
    });
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000
    });
  }

  return null;
};

/**
 * Send Password Reset Email with Token & Direct Link
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} resetUrl - Complete password reset link URL
 */
const sendPasswordResetEmail = async (to, name, resetUrl) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn('⚠️ [SMTP NOTICE] SMTP credentials not configured in .env. Email sending skipped. Reset URL generated:', resetUrl);
    return {
      success: false,
      message: 'SMTP credentials not configured on server.',
      resetUrl
    };
  }

  const from = process.env.SMTP_FROM || process.env.GMAIL_USER || 'RoomMates Support <no-reply@roommates.app>';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fc; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1d72fe, #845ec2); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .body { padding: 32px 28px; }
        .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #475569; }
        .button-wrapper { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #1d72fe; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 14px rgba(29,114,254,0.35); }
        .url-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #64748b; font-family: monospace; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ RoomMates Password Reset</h1>
        </div>
        <div class="body">
          <p>Hello <strong>${name || 'RoomMate'}</strong>,</p>
          <p>We received a request to reset your password for your RoomMates expense tracker account.</p>
          <p>Click the button below to choose a new password. This secure link is valid for <strong>15 minutes</strong>.</p>
          <div class="button-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: '🔐 RoomMates - Reset Your Password',
      html,
      text: `Hello ${name || 'RoomMate'},\n\nReset your password here: ${resetUrl}\n\nThis link expires in 15 minutes.`
    });

    console.log('✅ Password reset email dispatched to:', to, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Nodemailer Error sending password reset email:', error.message);
    return { success: false, error: error.message, resetUrl };
  }
};

module.exports = {
  sendPasswordResetEmail,
  createTransporter
};
