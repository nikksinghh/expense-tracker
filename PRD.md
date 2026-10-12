# Product Requirements Document (PRD)

## 1. Project Overview
**Product Name:** RoomMates Expense Tracker  
**Module:** Production-Grade Email Authentication & Failure Resilience System  
**Email Provider:** Brevo Transactional Email API (`POST https://api.brevo.com/v3/smtp/email`)  
**Core Purpose:** Provide secure, verifiable, and tamper-proof user onboarding and session management for shared expense tracking without exposing credentials, allowing unverified access, or leaking account enumeration details.

---

## 2. Goals & Objectives
1. **Zero Unverified Access:** Strictly enforce that accounts cannot log in or interact with rooms/expenses until email ownership is verified.
2. **Dual Verification Channels:** Send transactional emails via Brevo containing both a 1-click single-use verification link (valid 10 minutes) and a 6-digit cryptographic OTP (valid 10 minutes).
3. **Defense-in-Depth Cryptography:**
   - Link tokens stored only as SHA-256 hashes in MongoDB.
   - 6-digit OTPs generated with `crypto.randomInt` and stored only as HMAC-SHA-256 hashes using a server secret.
   - Constant-time verification comparisons (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
4. **Brute-Force & Denial-of-Service Mitigation:**
   - Account-level failed OTP attempt limits (maximum 5 attempts) with 15-minute temporary lockout.
   - Endpoint rate limiting (express-rate-limit).
   - Resend verification cooldown (60 seconds) with token and OTP rotation.
5. **Anti-Enumeration Protection:**
   - Forgot-password and resend-verification endpoints return generic success messages to avoid revealing whether an email is registered.
6. **Session Revocation & Single-Use Password Resets:**
   - Password reset via random single-use tokens hashed with SHA-256, expiring in 15 minutes.
   - Invalidate existing active JWT sessions upon password change via `tokenVersion` counter.
7. **HttpOnly Cookie Authentication:**
   - JWT tokens stored in HttpOnly, secure, SameSite cookies with fallback Bearer token support for cross-origin setups.
8. **Consistent Modern Design:**
   - Modern RoomMates visual aesthetics: pale blue/white background, subtle contour curves, rounded white cards, soft shadows, blue accents (`#1d72fe`), navy text (`#0f2057`), green success indicators, and responsive Bootstrap 5 layout.

---

## 3. User Flows
### 3.1 User Registration
1. User enters name, email, password, phone, and upiId on `/register`.
2. Backend validates inputs, ensures password is at least 6 characters, normalizes email.
3. Backend creates User document with `emailVerified: false`.
4. Backend generates 32-byte hex verification token and 6-digit OTP.
5. Tokens are hashed at rest (`emailVerificationToken`: SHA-256, `emailVerificationOtp`: HMAC-SHA-256).
6. Dispatches branded HTML email via Brevo containing both the verification link and the OTP.
7. Frontend navigates to `/verify-email?email=...`.

### 3.2 Email Verification (Dual Option)
- **Option A (Link):** User clicks link `https://app/verify-email?token=<raw_token>`. Frontend calls `POST /api/auth/verify-email`.
- **Option B (OTP):** User enters 6-digit OTP on the verification page. Frontend calls `POST /api/auth/verify-otp`.
- In either case: backend performs constant-time comparison, marks `emailVerified: true`, clears verification tokens/OTPs, resets attempt counters, and displays confirmed status.

### 3.3 User Login
1. User inputs email and password on `/login`.
2. Backend checks credentials via bcrypt.
3. If `emailVerified === false`, backend rejects with `403 Forbidden` (`code: EMAIL_NOT_VERIFIED`).
4. Frontend shows an alert with a direct action button: "Verify Email Now".
5. If verified, sets HttpOnly cookie and returns user profile.

### 3.4 Password Reset & Revocation
1. User requests reset on `/forgot-password`.
2. Backend creates single-use token (valid 15 minutes), sends email via Brevo.
3. User visits `/reset-password?token=<token>`, submits new password.
4. Backend updates password, deletes token, increments `tokenVersion` (invalidates all existing sessions).
