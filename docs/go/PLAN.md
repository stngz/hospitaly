# Execution Plan — Hospitaly Pilot (Rock Apartments, Lusaka)

## 1. Mission & Architecture Overview
**Goal:** A guest scans the QR card in their house and, without thinking, can get Wi-Fi, read the house guide, and send a request; the General Manager sees it instantly, assigns it, and the guest watches it move to "Done" — all on a phone (`360×740` and `390×844` first), all live, nothing confusing, nothing leaking between guests, nothing that only works on a laptop.

### Pilot Scope
- **Property:** Rock Apartments, Lusaka (`Africa/Lusaka`, `ZMW` / `K`).
- **Active Houses:** `Chipo`, `Chisenga`, `Bobo` only (all other demo rooms archived via `archived: true`).
- **Real Wi-Fi Credentials (from Founder):**
  - Default / Chisenga & Chipo Wi-Fi Name: `8119 vip`, Password: `@rocks.8119`
  - Bobo Wi-Fi Name: `Bobo Vip`, Password: `@rocks.8119`
- **Roles:** Guest (QR token scoped to active `stayId`) · Staff · Manager (GM) · Founder (HQ).
- **Out of Scope:** Errands, dining/menu, payments, Firebase Blaze-only features (Cloud Functions push & Cloud Storage; kept behind `PUSH_ENABLED = false`).

---

## 2. Wave & Agent Ownership

| Wave | Agent | Branch | Scope & Deliverables |
| :--- | :--- | :--- | :--- |
| **Wave 0** | **Lead Agent (Integrator)** | `main` | `docs/go/PLAN.md`, `src/lib/time.ts` (`formatPropertyTime`, `formatPropertyDate`, `useNow`), `src/lib/config.ts` (`APP_NAME`, `PUSH_ENABLED`), `.env.example`, `firebase.json` (Auth + Firestore Emulators), Vitest + `@firebase/rules-unit-testing` setup, Playwright 5-device config + `@axe-core/playwright`, GitHub Actions CI (`.github/workflows/ci.yml`), `scripts/seed-emulator.ts`. |
| **Wave 1** | **Agent B — Data & Security** | `go/agent-b` | Data model (`stays`, `media`, `activity`, `rooms` with `archived`/`imageId`/`houseRules`, `requests` with `stayId`/`archived`/`history`, `qrCodes` keyed by token); delete `sanitizeRoom`, `sanitizeProperty`, `isObsoleteOrTestRequest` & auto-delete/rewrite on load; fresh random `stay_${id}` on check-in; `firestore.rules` (via `firestore-rules-author`) + emulator rules unit tests (§A); `scripts/archive-demo-houses.ts`, `scripts/cleanup-test-data.ts`, `scripts/migrate-stays.ts` (`--dry-run` default); session policy (`staff`/`manager` 40m idle / 12h max, `founder` 30m idle / 8h max, warning modal at T-2m, instant deactivated sign-out); `TenantContext` stay/session scoping. |
| **Wave 2** | **Agent C — Guest Experience** | `go/agent-c` | 430px Hero Banner (photo chain: `house.imageId` → `property.coverImageId` → `/images/rocks-suite-enhanced.jpg` → SVG illustration; `ROCK APARTMENTS · LUSAKA` + live Lusaka clock pill; `Hello, {title} {full name}`; `Welcome to *{house}*`; `{houseType}`; **zero check-out info on guest Home**); Wi-Fi card (full wrap, 18px semibold password, Copy → Copied); "Your request" active card; 2-col 6 Quick Request tiles (`Fresh towels`, `Pool towels`, `Extra pillows`, `Cleaning`, `Gas & kitchen help`, `Something broken`) with confirm sheet (note + delivery preference + Send); "Something else?" full request form (no name/phone fields, shows `Sending as {title} {name}`); "Your requests" stay-scoped list with cancel while pending; Status screen (`Sent → Confirmed → On the way → Done`, department-only team card, editable delivery preference); GM-editable House Guide; calm states for unoccupied, invalid token, checked out ("Thanks for staying with us"), and paused property; bottom nav hidden on input focus; typography/contrast/44px tap targets. |
| **Wave 2** | **Agent D — Operations (Staff & GM)** | `go/agent-d` | 56px mobile header, 1-row tabs (`Requests · Houses · Team`), 1-line dismissible PWA hint; Requests board with live waiting timers (`Waiting 6 min` > 5m amber), `Confirm` (no auto-assign), `Assign` (property staff + GM only, excludes founder, logs history), `Start`, `Done`, `Cancel` (with optional reason), plain-text WhatsApp (no emoji), GM-only `Archive` ("Remove from board") + `Archived` filter; **Live Check-outs Today strip** (grey >2h, amber ≤2h, orange ≤15m, red overdue + chime once, Check-out confirm sheet, Tomorrow collapsed list); Houses tab with full-height keyboard-safe Check-in sheet, Edit house with client-side photo compression (`≤ 300 KB`, max `1600px` JPEG → `media` collection → `house.imageId`); Team mobile cards + "Request new account" WhatsApp button; Suspended read-only mode; Wake Lock toggle; `PUSH_ENABLED=false` guard. |
| **Wave 2** | **Agent E — Founder HQ** | `go/agent-e` | Non-sticky 56px mobile header with `⋯` menu; Property card with `Open property desk` and `Suspend / Resume` confirm sheet with editable message; Stacked mobile account cards, single role label, "Show deactivated" toggle, deduplication, `founder.test@example.com` flagged & deactivated; Property settings modal (name, phones, timezone, check-in/out times, cover photo upload via `media`); Activity log (last 50 events in `activity/{id}`). |
| **Wave 2** | **Agent F — QR & Print** | `go/agent-f` | 85 × 120 mm card with dynamic property name, center house label (`≤ 18%`), `jsQR` scan verification + fallback, serif house name, no token text or room type subtitle; mobile-fitting preview (`max-width: 100%` at `360px`); 300-DPI PNG export; ZIP of active houses only (`Chipo`, `Chisenga`, `Bobo`); single-page `@media print`; Regenerate confirmation + old token revocation; automated `jsQR` decode test for all 3 active houses. |
| **Wave 3** | **Agent G (QA) & Agent H (Reviewer)** | `go/qa-review` | Vitest rules tests (§A), Playwright e2e suite across 5 device projects (§B–§F + all personas `G1–G6`, `S1–S2`, `M1–M2`, `F1–F2`, `I1–I2`), axe-core a11y checks, CI static greps (no hard-coded names in `src/`, no auto-delete in `src/`), `docs/go/REVIEW.md`, and final `docs/go/REPORT.md` with 390px screenshots. |

---

## 3. Key Risks & Mitigations
1. **Cross-Stay Data Leakage:** Mitigated by generating a unique `stay_${random}` document in `stays/{stayId}` on every check-in, storing `activeStayId` on the room, requiring `stayId` on every request creation, and enforcing `stayId` isolation in both `TenantContext` and `firestore.rules`.
2. **Hard-Coded Names in `src/`:** Mitigated by moving all seed data to `scripts/` (`scripts/seed-emulator.ts`, `scripts/archive-demo-houses.ts`, `scripts/migrate-stays.ts`) and keeping `src/` 100% data-driven, verified by an automated CI grep test.
3. **Browser Timezone Drift (e.g. Founder in Dubai `Asia/Dubai`):** Mitigated by centralizing all date/time formatting in `src/lib/time.ts` with explicit `timeZone: property.timezone || 'Africa/Lusaka'` and a `useNow(30_000)` hook.
4. **Firestore Storage Without Blaze Plan:** Mitigated by compressing uploaded house/property photos client-side via `<canvas>` (`max 1600px`, JPEG quality stepped down until `≤ 300 KB`) and storing the data URL in `media/{mediaId}`.
