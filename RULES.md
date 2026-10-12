# Development Rules & Coding Standards

## 1. Security & Privacy Rules
1. **Never Log Sensitive Data:** Passwords, OTPs, raw reset tokens, JWT tokens, cookies, Brevo API keys, and MongoDB connection strings must NEVER appear in server logs or client consoles.
2. **Never Expose Secrets in Client Bundles:** All environment variables for Brevo (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`) belong exclusively on the backend. Frontend `VITE_` variables must only contain public URLs and public client IDs.
3. **Defense-in-Depth Storage:** Always use `select: false` on Mongoose fields containing password hashes, token hashes, and OTP hashes so they are never returned in default queries.
4. **Anti-Enumeration Responses:** Endpoints such as forgot password and resend verification must return identical generic success responses regardless of whether the target user exists.
5. **No Automatic Authentication on Signup:** Users must not receive a session cookie or authorization token upon registration before their email has been verified.
6. **Constant-Time Cryptographic Comparison:** When verifying OTP hashes, always use `crypto.timingSafeEqual` over standard string equality (`===`) to thwart timing attacks.

## 2. Codebase Conventions
1. **Module System Consistency:** Backend uses CommonJS (`require` / `module.exports`). Frontend uses ES Modules (`import` / `export`). Do not mix module formats within the respective subprojects.
2. **Preserve Existing Architecture:** Do not overwrite existing models or business logic (rooms, expenses, settlements, budgets, notifications, reports). Only extend existing schemas cleanly.
3. **Resilience & Graceful Degradation:** Wrap external network calls (such as Brevo email requests) with bounded timeouts (`AbortSignal.timeout(10000)`). If an external email provider fails, return a controlled error and do not corrupt user database state.
4. **No Placeholders or Mock Authentication in Production Code:** Build fully functional forms, live countdown timers, and actual API calls. Use test doubles only within the automated test suites (`tests/`).
