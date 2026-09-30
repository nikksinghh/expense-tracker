const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = async () => {
  // If real SMTP settings are in .env, use them
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Automatic Ethereal fallback for local development & testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch {
    // Basic stream transporter if network is offline
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }
};

/**
 * Send 6-Digit Password Reset OTP Email
 */
const sendPasswordResetEmail = async (toEmail, userName, otpCode) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"RoomMates Security" <noreply@roommates.app>',
      to: toEmail,
      subject: `🔐 Your RoomMates Password Reset Code: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { font-size: 28px; font-weight: 800; color: #1d72fe; }
            .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 12px 0 6px; }
            .desc { font-size: 14px; color: #64748b; line-height: 1.5; }
            .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }
            .warning { font-size: 12px; color: #ef4444; margin-top: 10px; font-weight: 600; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚡ RoomMates</div>
              <div class="title">Password Reset Verification</div>
              <p class="desc">Hello <strong>${userName || 'User'}</strong>, we received a request to reset your password. Use the verification code below:</p>
            </div>

            <div class="otp-box">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Your 6-Digit OTP</div>
              <div class="otp-code">${otpCode}</div>
              <div class="warning">⚠️ This code expires in 10 minutes. Do not share it with anyone.</div>
            </div>

            <p class="desc" style="font-size: 13px;">If you did not request this password reset, please ignore this email. Your account remains secure.</p>

            <div class="footer">
              © ${new Date().getFullYear()} RoomMates Inc. 256-Bit Encrypted Security System.
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Password Reset OTP Email sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    // If ethereal test account, log preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Failed to send reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
};
