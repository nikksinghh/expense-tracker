# Design System & Visual Guidelines

## 1. Visual Language
- **Theme:** Clean, modern, icy-blue/white aesthetic tailored for the RoomMates Expense Tracker.
- **Backgrounds:** Pale icy-blue (`#f0f5ff` / `var(--bg-page)`) with subtle topological contour curves rendered via SVG overlay.
- **Card Surfaces:** High-contrast crisp white (`#ffffff` / `var(--bg-card)`), with rounded borders (`16px` border-radius), subtle perimeter borders (`rgba(29, 114, 254, 0.12)`), and elevation drop shadows (`0 2px 16px rgba(29, 114, 254, 0.08)`).

## 2. Color Palette
- **Primary Brand:** `#1d72fe` (`--rm-blue`)
- **Brand Navy:** `#0f2057` (`--rm-navy` / `--text-primary`)
- **Accent Light Blue:** `#4d93ff` (`--rm-blue-light`)
- **Pale Blue Background:** `#e8f0ff` (`--rm-blue-pale`)
- **Success / Verified:** `#22c55e` (`--rm-green`) / `#dcfce7` (`--rm-green-light`)
- **Warning / Locked:** `#f97316` (`--rm-orange`) / `#fff3e4` (`--rm-orange-light`)
- **Error / Danger:** `#ef4444` (`--rm-red`) / `#ffe4e4` (`--rm-red-light`)

## 3. Component Specifications
- **Auth Cards:** Centered layout with max-width `460px` to `480px`. Consistent header with circular app icon (`.logo-circle`), bold heading, and muted subtitle.
- **OTP Input:** 6-digit spaced input or dedicated numeric boxes with prominent monospaced font, active blue focus ring, and automatic uppercase/number filtering.
- **Resend Countdown:** Visual countdown indicator displaying remaining seconds before re-enabling the "Resend Code" button.
- **Buttons:** `.btn-rm-primary` with hover elevation, smooth transitions, and embedded loading spinners.
- **Feedback Alerts:** Styled notification boxes for success, lockout notices, and invalid attempts with appropriate icons from `react-icons/bs`.
