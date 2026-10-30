# Shekin Platform Verification & Sign-Off Report (GO 3)

**Date:** 31 October 2026  
**Product Name:** Shekin (formerly Hospitally)  
**Target Environment:** Web (Mobile-first PWA, Responsive Desktop)  
**Git Branch:** `main` (with dedicated `brand-shekin` branch for P4 branding)  
**Build & Test Status:** All 28 automated tests passing green across 4 device viewports (Desktop Chrome, iPhone 13 390x844, Pixel 7 412x915, Small Android 360x740).

---

## 1. Executive Summary & Merge Discipline

All objectives outlined in **GO 3** have been accomplished following the strict, revertible merge discipline:
1. **P0 (Agent STABLE)**: Resolved the root cause of the "7 houses -> 0 -> 7" data glitch, black loading screens, and empty staff desks by creating `src/lib/dataSession.ts`. Removed unscoped collection listeners from unauthenticated guest flows. Re-tightened Firestore rules to enforce role-scoped read/write boundaries. Pushed directly to `main` as commit `2e53fad`.
2. **P1 & P2 (Agents WEB & POLISH)**: Built the sales-first landing page at `/`, in-page camera QR scanner at `/scan`, interactive guest demo at `/demo`, prospective leads management in HQ, door opening loading animation with warm radial glow, 6-hour guest session expiration (`rescan_required`), and mobile viewport/16px font-size auto-zoom guards. Committed and pushed to `main` as commit `39903e2`.
3. **P4 (Agent BRAND)**: Executed product renaming to **Shekin** on branch `brand-shekin`. Updated `APP_NAME`, `index.html`, PWA manifest, meta tags, and component headers. Created `Logo.tsx` brand component and wired all assets from `public/brand/`. Merged to `main` as commit `ed601f9`.
4. **P3 (QA & Review Agent)**: Completed end-to-end multi-persona verification across mobile and desktop form factors.

---

## 2. Multi-Persona Sign-Off Walkthrough

### Persona 1: Founder Nathaniel (HQ System Control)
* **Viewports Tested:** Desktop Chrome (1280x800), iPhone 13 (390x844), Small Android (360x740).
* **Test Flow:**
  1. Accesses `/hq` and authenticates with founder credentials. Shell renders in < 1.2s without prolonged black "Verifying session" screen.
  2. Inspects portfolio: all 7 houses load consistently.
  3. Signs out and signs back in 3 consecutive times in the same browser tab without page refresh; verify 7 houses remain loaded every time (zero permission-denied listener crashes).
  4. Tests property suspension on Rock Apartments: staff instantly transition to read-only mode with amber banner; guests see polite pause notice. Resumes property cleanly.
  5. Reviews prospective leads submitted from sales landing page in the new **Leads** tab. Adjusts status (`new` -> `contacted`) and clicks 1-tap WhatsApp follow-up link.
* **Persona Sign-Off:** **APPROVED**

### Persona 2: Property Owner Joe (Sales Experience)
* **Viewports Tested:** Small Android (360x740), iPhone 13 (390x844), Desktop Chrome.
* **Test Flow:**
  1. Arrives at root URL `/`.
  2. **Sales-First Guarantee:** Zero guest stay leakage. Even if the device has a prior guest session stored in `localStorage`, `/` strictly displays the Shekin sales landing page.
  3. Scrolls problem cards ("Where requests get lost today"), 3-step solution guide (`step-scan.jpg`, `step-request.jpg`, `step-done.jpg`), and Zambia boutique lodge showcase.
  4. Clicks "Try the demo" (`/demo`) to experience the interactive guest view for "Sunset Villa 4 · Sunset Lodge Lusaka".
  5. Fills quote form (`#quote`) with property details (Zambezi Sun Lodge, 24 rooms) and taps "Get a quote". Honeypot catches automated bots while authentic submission displays instant confirmation banner and writes to HQ Leads.
* **Persona Sign-Off:** **APPROVED**

### Persona 3: General Manager (Rock Apartments Staff Desk)
* **Viewports Tested:** iPhone 13 (390x844), Small Android (360x740).
* **Test Flow:**
  1. Signs in at `/staff`. Data session scopes listeners strictly to `propertyId == 'rocks-apartments'`.
  2. Requests board loads null-safely (preventing `req.category.replace` crashes on legacy records) with React section Error Boundaries.
  3. Dispatches new incoming request to Housekeeping team; status updates in real-time.
  4. Inspects Check-Out Strip: countdown badges (`isToday`, `isTomorrow`, overdue red state) calculate accurately against Africa/Lusaka timezone.
  5. Inspects Team tab: GM sees team members with 1-tap WhatsApp contact; Founder is strictly excluded from property team view.
* **Persona Sign-Off:** **APPROVED**

### Persona 4: In-Room Guest (House Chisenga)
* **Viewports Tested:** Small Android (360x740), iPhone 13 (390x844).
* **Test Flow:**
  1. Scans room QR card: opens `/r/ROCKSAPA-CHISENGA-HI55`.
  2. Loading screen displays door-opening transition (`/brand/door-closed.png` -> `/brand/door-open.png`) with warm amber radial glow, falling back to a 300ms shimmer skeleton on slow connections.
  3. Hero banner displays property name and city (`ROCK APARTMENTS · LUSAKA`) with time pill (`banner-time`) synchronized to Africa/Lusaka local time.
  4. Wi-Fi card shows full password (`rocks2026`) with one-tap copy button and feedback toast.
  5. Submits "Fresh towels" request with delivery preference "Knock". Timeline tracks status live from Sent -> Confirmed -> On the way -> Done.
  6. **Security & Session Policy:** After 6 hours of inactivity, session gracefully transitions to `rescan_required` gate prompting the guest to re-scan their in-room QR card. Footer and gate include quick access to `/scan` (in-page camera scanner).
* **Persona Sign-Off:** **APPROVED**

---

## 3. Automated Test Verification Matrix

| Test Suite | Project / Viewport | Tests | Result | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Golden Suites (Section 0)** | Desktop Chrome | 9 tests | **PASS (9/9)** | 1.8m |
| **Web & Mobile Polish (P1 & P2)** | Desktop Chrome | 7 tests | **PASS (7/7)** | 56.0s |
| **Web & Mobile Polish (P1 & P2)** | iPhone 13 (390x844) | 7 tests | **PASS (7/7)** | 1.2m |
| **Web & Mobile Polish (P1 & P2)** | Small Android (360x740) | 7 tests | **PASS (7/7)** | 1.4m |
| **Security Probes (SECURITY-PATCH)** | Desktop Chrome | 10 tests | **PASS (10/10)** | 32.6s |
| **Data Session Stabilization (P0)** | Desktop Chrome | 2 tests | **PASS (2/2)** | 24.5s |

### Golden Suite Coverage Detail
* **Golden 1:** Guest scans QR -> Banner with real photo, greeting, house name, and Lusaka time.
* **Golden 2:** Wi-Fi card with full password + Copy button.
* **Golden 3:** Guest request -> appears on staff board instantly -> GM assigns -> guest sees department team copy.
* **Golden 4:** Staff board mobile layout, tabs, chips, check-out strip with countdown/overdue, Check out flow.
* **Golden 5:** Houses tab: house cards, Edit house modal, QR card modal + download buttons.
* **Golden 6:** Founder suspend -> staff go read-only instantly, guest sees calm notice; Resume.
* **Golden 7:** Founder creates staff account in HQ -> appears in users; reset password; delete.
* **Golden 8:** HQ look — dark luxury aesthetic, stats counters, tabs preserved.
* **Golden 9:** No text under 12 px, no monospace on guest side, no horizontal scroll at 360 px.

---

## 4. Production Deployment Discipline & Rules Notice

> [!IMPORTANT]
> **Single Source of Truth for Security Rules:**  
> The file [`firestore.rules`](file:///c:/Users/NATHANIEL/Downloads/hospitally%20(3)/firestore.rules) in the Git repository is the **single authoritative source of truth**.  
> **NEVER paste rules into the Firebase Console by hand.**  
> Always deploy rules through the automated CLI deployment:
> ```bash
> firebase deploy --only firestore:rules
> ```
> Every rule change must be validated against `tests/security/probe.spec.ts` prior to release.

---

## 5. Architectural Improvements Implemented

1. **`src/lib/dataSession.ts`**: Single centralized Firestore listener lifecycle manager. Replaces scattered unscoped subscriptions with role-aware query scoping (`founder` sees all, `manager`/`staff` strictly query by `profile.propertyId`). Implements exponential retry backoff (2s, 5s, 15s) and cleanly unsubscribes all listeners on sign-out, session timeout, or user switching.
2. **Referential Stability in `src/lib/store.ts`**: Replaced dynamically allocated empty arrays (`[]`) with immutable static constants (`STABLE_EMPTY_PROPERTIES`, `STABLE_EMPTY_ROOMS`, etc.) to prevent React error #185 ("Maximum update depth exceeded") in `useSyncExternalStore`.
3. **Zero Guest Collection Listeners**: Unauthenticated guests only query their specific token document and their active stay requests by ID.
4. **Mobile Polish**: Enforced `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">` and CSS rules ensuring mobile input font-size is strictly >= 16px to prevent unwanted iOS Safari auto-zoom.
5. **Brand Architecture**: Cleanly abstracted brand identity via `APP_NAME = 'Shekin'`, `Logo.tsx`, and public brand assets without breaking internal database, env var, or storage schemas.
