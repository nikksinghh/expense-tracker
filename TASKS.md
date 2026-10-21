# Implementation Tasks & Execution Plan

- [x] **Phase 0: Repository Discovery & Baseline Auditing**
  - [x] Inspect existing User model, Express server, Mongoose config, routes, middleware, and tests.
  - [x] Verify in-memory MongoDB runner and test suite stability.
  - [x] Validate frontend build pipeline (`npm run build`).

- [x] **Phase 1: Resilience & Failure Simulation Audit Matrix**
  - [x] Catalog all 40 system failure scenarios against the current codebase.
  - [x] Determine risk severity, exact code paths, and safe simulation approaches.

- [x] **Phase 2: Backend Authentication & Email Delivery (Brevo)**
  - [x] Update `Backend/src/models/User.js`: Add `emailVerified`, `emailVerificationToken`, `emailVerificationOtp`, lockout & attempt counters, `lastResendTimestamp`, and `tokenVersion`.
  - [x] Update `Backend/src/config/env.js`: Add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `OTP_SECRET`.
  - [x] Update `Backend/src/services/emailService.js`: Implement official Brevo API v3 with timeout, test mocking, and HTML email templates for verification and password reset.
  - [x] Update `Backend/src/middleware/auth.js`: Check `tokenVersion` to enforce session revocation.
  - [x] Update `Backend/src/controllers/authController.js`:
    - Registration: create unverified user, send Brevo verification email (link + OTP), do not auto-authenticate.
    - Verify Email Link: SHA-256 verification, expiration check, mark verified.
    - Verify OTP: rate-limit, lockout check, constant-time HMAC comparison, mark verified.
    - Resend Verification: 60s cooldown, token & OTP rotation, anti-enumeration response.
    - Login: block unverified users (`EMAIL_NOT_VERIFIED`), issue secure HttpOnly cookie + token.
    - Forgot Password: anti-enumeration, send Brevo reset email.
    - Reset Password: SHA-256 validation, single-use invalidation, bump `tokenVersion`.
  - [x] Update `Backend/src/routes/authRoutes.js`: Expose new endpoints with validators and rate limiting.
  - [x] Update `Backend/src/server.js`: Ensure auto-seeded admin account is verified.

- [x] **Phase 3: Frontend Implementation & UI Integration**
  - [x] Update `Frontend/src/pages/auth/Register.jsx`: Navigate to verification page upon signup with inline ErrorAlert.
  - [x] Update `Frontend/src/pages/auth/Login.jsx`: Handle unverified email error with direct action button to verification, inline ErrorAlert, and forgot-password link.
  - [x] Create `Frontend/src/pages/auth/VerifyEmail.jsx`: Dual link/OTP verification page with auto magic link handler, 6-digit PIN input, live 60s countdown timer, lockout alerts, and confetti.
  - [x] Create `Frontend/src/pages/auth/ForgotPassword.jsx`: Password recovery request page with anti-enumeration UX and resend cooldown.
  - [x] Create `Frontend/src/pages/auth/ResetPassword.jsx`: Deep-link password reset page with validation, live strength meter, and session revocation.
  - [x] Create `Frontend/src/components/Common/ErrorAlert.jsx`: Reusable, actionable inline error resolution component.
  - [x] Create `Frontend/src/components/Common/ErrorBoundary.jsx`: Top-level graceful crash recovery boundary.
  - [x] Update `Frontend/src/App.jsx`: Register routes (`/verify-email`, `/forgot-password`, `/reset-password`, `/reset-password/:token`).
  - [x] Update `Frontend/src/contexts/AuthContext.jsx`: Ensure registration does not auto-login unverified accounts.

- [x] **Phase 4: Automated Testing & Validation**
  - [x] Update `Backend/tests/securityAudit.test.js` to test all new auth flows, OTP lockout, cooldown, unverified rejection, tokenVersion revocation, and Brevo service (22/22 passed).
  - [x] Fix Jest in-memory MongoDB runner on Windows with `family: 4` and clean connection pooling (5/5 suites, 27/27 passed).
  - [x] Run frontend production build (`npm run build` - 0 errors, built in 630ms).

- [x] **Phase 5: Documentation & Final Reporting**
  - [x] Update `Backend/.env.example` and `README.md`.
  - [x] Update `MEMORY.md`.
  - [x] Complete git commits and push to GitHub.
