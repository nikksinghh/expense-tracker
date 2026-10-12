# Project Memory & Status

## Current Context
- **Workspace:** `EXPEND MONITERING` (RoomMates Expense Tracker)
- **State:** Implementing production-grade Brevo email authentication, resilience audit, and failure simulations.
- **Node Version:** Node v24.13.0 on Windows.
- **Backend Stack:** Node.js, Express 5, Mongoose 9, bcryptjs, jsonwebtoken, cookie-parser, helmet, express-rate-limit.
- **Frontend Stack:** React 19, Vite 8, Bootstrap 5, react-icons, Axios, React Router 7.
- **Email Delivery:** Official Brevo Transactional Email API v3 (`POST https://api.brevo.com/v3/smtp/email`).

## Key Decisions & Verified Constraints
1. **Module System:** Backend is CommonJS (`require`), Frontend is ESM (`import`). Both are strictly kept intact.
2. **MongoDB In-Memory:** In test and development without remote credentials, `mongodb-memory-server` runs seamlessly.
3. **Cryptographic Standards:**
   - Link Token: 32 bytes hex, stored as SHA-256.
   - OTP: 6 digits via `crypto.randomInt`, stored as HMAC-SHA-256 using `OTP_SECRET`.
   - Comparison: `crypto.timingSafeEqual`.
   - Lockout: 5 failed attempts locks account for 15 minutes.
   - Resend Cooldown: 60 seconds enforced server-side and reflected via client countdown timer.
   - Session Revocation: `tokenVersion` field on User model, embedded in JWT and checked in auth middleware.
