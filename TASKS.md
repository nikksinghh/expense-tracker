# Implementation Tasks & Execution Plan

- [x] **Phase 0: Repository Discovery & Baseline Auditing**
  - [x] Inspect existing User model, Express server, Mongoose config, routes, middleware, and tests.
  - [x] Verify in-memory MongoDB runner and test suite stability.
  - [x] Validate frontend build pipeline (`npm run build`).

- [ ] **Phase 1: Resilience & Failure Simulation Audit Matrix**
  - [ ] Catalog all 40 system failure scenarios against the current codebase.
  - [ ] Determine risk severity, exact code paths, and safe simulation approaches.

- [ ] **Phase 2: Backend Authentication & Email Delivery (Brevo)**
  - [ ] Update `Backend/src/models/User.js`: Add `emailVerified`, `emailVerificationToken`, `emailVerificationOtp`, lockout & attempt counters, `lastResendTimestamp`, and `tokenVersion`.
  - [ ] Update `Backend/src/config/env.js`: Add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `OTP_SECRET`.
  - [ ] Update `Backend/src/services/emailService.js`: Implement official Brevo API v3 with timeout, test mocking, and HTML email templates for verification and password reset.
  - [ ] Update `Backend/src/middleware/auth.js`: Check `tokenVersion` to enforce session revocation.
  - [ ] Update `Backend/src/controllers/authController.js`:
    - Registration: create unverified user, send Brevo verification email (link + OTP), do not auto-authenticate.
    - Verify Email Link: SHA-256 verification, expiration check, mark verified.
    - Verify OTP: rate-limit, lockout check, constant-time HMAC comparison, mark verified.
    - Resend Verification: 60s cooldown, token & OTP rotation, anti-enumeration response.
    - Login: block unverified users (`EMAIL_NOT_VERIFIED`), issue secure HttpOnly cookie + token.
    - Forgot Password: anti-enumeration, send Brevo reset email.
    - Reset Password: SHA-256 validation, single-use invalidation, bump `tokenVersion`.
  - [ ] Update `Backend/src/routes/authRoutes.js`: Expose new endpoints with validators and rate limiting.
  - [ ] Update `Backend/src/server.js`: Ensure auto-seeded admin account is verified.

- [ ] **Phase 3: Frontend Implementation & UI Integration**
  - [ ] Update `Frontend/src/pages/auth/Register.jsx`: Navigate to verification page upon signup.
  - [ ] Update `Frontend/src/pages/auth/Login.jsx`: Handle unverified email error with link to verification.
  - [ ] Create `Frontend/src/pages/auth/VerifyEmail.jsx`: Dual link/OTP verification page with live 60s countdown timer and alert states.
  - [ ] Create `Frontend/src/pages/auth/ForgotPassword.jsx`: Password recovery request page.
  - [ ] Create `Frontend/src/pages/auth/ResetPassword.jsx`: Deep-link password reset page with validation.
  - [ ] Update `Frontend/src/App.jsx`: Register routes (`/verify-email`, `/forgot-password`, `/reset-password`).
  - [ ] Update `Frontend/src/contexts/AuthContext.jsx`: Ensure registration does not auto-login unverified accounts.

- [ ] **Phase 4: Automated Testing & Validation**
  - [ ] Update `Backend/tests/securityAudit.test.js` to test all new auth flows, OTP lockout, cooldown, unverified rejection, tokenVersion revocation, and Brevo service.
  - [ ] Run backend tests and verify 100% pass rate.
  - [ ] Run frontend production build (`npm run build`).

- [ ] **Phase 5: Documentation & Final Reporting**
  - [ ] Update `Backend/.env.example` and `README.md`.
  - [ ] Update `MEMORY.md`.
  - [ ] Deliver comprehensive audit matrix and completion report.
