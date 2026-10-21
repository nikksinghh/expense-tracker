# Project Memory & Status

## Current Context
- **Workspace:** `EXPEND MONITERING` (RoomMates Expense Tracker)
- **State:** Completed production-grade Brevo email authentication, resilience audit, frontend dual verification & password recovery workflows, and actionable error resolution.
- **Node Version:** Node v24.13.0 on Windows.
- **Backend Stack:** Node.js, Express 5, Mongoose 9, bcryptjs, jsonwebtoken, cookie-parser, helmet, express-rate-limit.
- **Frontend Stack:** React 19, Vite 8, Bootstrap 5, react-icons, Axios, React Router 7.
- **Email Delivery:** Official Brevo Transactional Email API v3 (`POST https://api.brevo.com/v3/smtp/email`).

## Key Decisions & Verified Constraints
1. **Module System:** Backend is CommonJS (`require`), Frontend is ESM (`import`). Both are strictly kept intact.
2. **MongoDB In-Memory:** In test and development without remote credentials, `mongodb-memory-server` runs seamlessly with `family: 4` and isolated connection pooling.
3. **Cryptographic Standards:**
   - Link Token: 32 bytes hex, stored as SHA-256.
   - OTP: 6 digits via `crypto.randomInt`, stored as HMAC-SHA-256 using `OTP_SECRET`.
   - Comparison: `crypto.timingSafeEqual` to prevent timing attacks.
   - Lockout: 5 failed attempts locks account for 15 minutes.
   - Resend Cooldown: 60 seconds enforced server-side and reflected via client countdown timer.
   - Session Revocation: `tokenVersion` field on User model, embedded in JWT and checked in auth middleware.
4. **Actionable Error Sections & Resilience:**
   - `ErrorAlert`: Inline, immediate error feedback with one-click resolution buttons (e.g., "Verify Email Now", "Request New Link", "Sign In Instead").
   - `ErrorBoundary`: Catches React rendering errors with zero white-screen crashes.
   - Room size: Strictly enforced max 2 roommates per room limit in `Room.js` and `roomController.js`.
5. **Testing & Production Build:**
   - Backend Security Audit (`npm test`): 22/22 tests passing.
   - Backend Unit Test Suite (`npm run test:unit`): 5/5 suites, 27/27 tests passing.
   - Frontend Production Build (`npm run build`): 0 errors, 119 modules compiled.
