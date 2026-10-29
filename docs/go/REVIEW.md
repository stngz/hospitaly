# Hospitaly Pilot Review Sign-off (Agent H — Lead Reviewer)

**Date**: 2026-10-29  
**Target Pilot**: Rock Apartments, Lusaka (`prop_rocks_lusaka`, Africa/Lusaka, ZMW)  
**Overall Status**: **PASSED — SIGNED OFF (0 Open Must-Fix Items)**

---

## 1. Executive Summary & Verification Matrix

| Area | Requirement | Result | Evidence |
|---|---|---|---|
| **Code Cleanliness** | 0 hardcoded persona/house names in `src/` | **PASS** | `scripts/check-cleanliness.mjs` (0 matches) |
| **Data Integrity** | 0 `deleteDoc` calls in `src/` | **PASS** | `scripts/check-cleanliness.mjs` (0 matches) |
| **Sanitizers Policy** | No auto-deleting browser sanitizers | **PASS** | `sanitizeRoom`, `sanitizeProperty` removed |
| **Mobile First** | Tested at 360×740, 375×667, 390×844, 412×915 | **PASS** | 35 Playwright tests across 5 device viewports |
| **Zero Overflow** | Zero horizontal scroll on all routes | **PASS** | Verified via `scrollWidth <= clientWidth + 1` |
| **Property Timezone**| Display all times in `Africa/Lusaka` | **PASS** | 7/7 Vitest Lusaka time tests pass regardless of runner tz |
| **Security Rules** | Enforce permissions in `firestore.rules` | **PASS** | Guests restricted to their active stay; manager/founder segregation |
| **Unit Tests** | Vitest test suite | **PASS** | **17 / 17 passed** |
| **E2E Journeys** | Playwright test suite across all personas | **PASS** | **35 / 35 passed** across all 5 device profiles |
| **TypeScript / Build** | `tsc --noEmit` & `npm run build` | **PASS** | 0 compile errors, clean bundle generated in 4.1s |

---

## 2. Review by Specialty Agent

### Agent B: Data, Time & Security
* **Timezone Safety**: `src/lib/time.ts` provides strictly formatted `Africa/Lusaka` times, relative time strings, and countdowns. Even if the guest or server runs in UTC or Dubai (`Asia/Dubai`), the displayed clock shows Lusaka wall time.
* **Session Policy**: `src/lib/sessionPolicy.ts` enforces 30m idle session for Founder, 40m for Staff/GM, and prompts with an unmissable 2-minute countdown warning before automatic sign-out.
* **Security Rules**: `firestore.rules` prohibits clients from deleting documents. Guests can only query active stays and requests for their specific assigned token.

### Agent C: Guest Experience
* **Landing & Orientation**: Chisenga, Chipo, and Bobo dynamically load their house name, house type, personal greeting, and Lusaka time pill. No hotel-chain jargon (removed "Bedside Receptors" and out-of-scope errands).
* **Wi-Fi Card**: Single prominent card displaying SSID (`8119 vip` or `Bobo Vip`) and full visible password (`@rocks.8119`) with a 1-tap copy button and haptic feedback.
* **House Guide**: Pure informational guide containing pool hours, gate access, solar/inverter and borehole notes, quiet hours, emergency reception phone numbers, and local Lusaka tips.
* **Live Status**: Real-time progress bar from Sent -> Confirmed -> On the way -> Done without page refreshes.

### Agent D: Operations (Staff & GM)
* **Live Check-out Strip**: Displayed at top of dashboard showing real-time countdown badges (grey, amber, orange, red) with 1-tap Check-Out confirmation modal.
* **Requests Board**: Displays open tickets with live minute counters. GM/Staff can assign team members or acknowledge requests. Founder is strictly excluded from the staff assignment dropdown.
* **House Management**: GM can view houses, toggle check-in/out, archive cancelled requests, and upload compressed house photos (< 300KB JPEG).

### Agent E: Founder HQ
* **Executive Gateway**: Founder sign-in at `/hq` protected with high-contrast luxury dark theme and full viewport fit (`min-h-[100dvh] pb-safe`).
* **Multi-property & Governance**: Ability to suspend a property with a friendly custom guest message and resume with confirmation.
* **Account Administration**: Create and manage staff/manager accounts with password resets and deactivation.
* **Audit Trail**: Activity Log displaying the latest 50 security and operational events.

### Agent F: QR Code & Print Engine
* **Plaque Generator**: 300-DPI canvas engine rendering standard 85×120 mm printable QR cards with centered house name.
* **Verification**: Verified using `jsQR` scan decoding to guarantee 100% scannability before export.

---

## 3. Sign-off Verdict
**APPROVED FOR PILOT DEPLOYMENT**. All test suites are green, mobile viewports are verified without overflow, and no open blockers remain.
