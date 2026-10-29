# Test plan — all must pass

Tools: Firebase Emulator Suite (Auth + Firestore), `@firebase/rules-unit-testing` + Vitest for rules, Playwright for e2e (projects: iPhone 13, Pixel 7, 360×740 Android, iPhone SE 375×667, Desktop Chrome), `@axe-core/playwright`, Lighthouse CI on guest home. Fake clock (`page.clock`) for check-out countdown and idle timeout tests. Timezone of the browser set to `Asia/Dubai` in tests to prove Lusaka-time display.

Seed: Rock Apartments (active), houses Chipo (available), Chisenga (occupied, Ms Princess Mazaba, out tomorrow 11:00), Bobo (occupied, Mr Chipo Mazaba, out today 11:00), 2 archived demo rooms, users: founder, GM, 2 staff (housekeeping, maintenance), 1 deactivated staff.

---

## A. Security & data (rules tests)
- [ ] Unauthenticated user cannot list `users`, `stays`, `rooms`, `requests`.
- [ ] Guest (anonymous) can create a request only for the room/stay of their token and only while the property is active.
- [ ] Guest can read only requests with their `stayId`; cannot read another stay's requests.
- [ ] Staff of property A cannot read or write property B.
- [ ] Staff cannot archive, cannot change roles, cannot create users.
- [ ] Manager can archive cancelled/completed requests; cannot create users; cannot edit other properties.
- [ ] Founder can do everything.
- [ ] While property suspended: guest create denied; staff/manager writes denied; founder allowed.
- [ ] Deactivated user denied everything.
- [ ] No client code deletes documents automatically (grep check in CI: no `deleteDoc` outside explicit user actions and `scripts/`).

## B. Guest app
- [ ] Valid QR (occupied) → banner shows real photo, "Hello, Ms Princess Mazaba", "Welcome to Chisenga", "Garden Studio Apartment", live Lusaka time (browser in Dubai).
- [ ] No check-out text anywhere on guest screens.
- [ ] Wi-Fi password fully visible at 360 px; Copy → "Copied".
- [ ] Quick request → status screen → staff Confirm → guest sees "Confirmed by reception" within 3 s without reload.
- [ ] Status team card shows department only, never a name.
- [ ] Request form has no name/phone inputs; shows "Sending as …".
- [ ] Guest cancels pending request → staff board updates live.
- [ ] Back button and refresh keep the house.
- [ ] Unoccupied house QR → "not checked in yet" screen, no request buttons.
- [ ] Revoked/invalid token → "no longer active" screen.
- [ ] Check out Chisenga, check in new guest → old guest link shows "Thanks for staying"; new guest sees zero old requests (persona G5).
- [ ] Property suspended → calm paused card, Wi-Fi + House guide visible, no request buttons, no word "suspended".
- [ ] Bottom nav has 4 icons + labels; hidden while an input is focused; not covered by iOS home indicator.
- [ ] axe: 0 serious/critical issues on every guest screen. No element with font-size < 12 px. No horizontal scroll at 360 px.
- [ ] Lighthouse mobile: Perf ≥ 85, A11y ≥ 95, BP ≥ 95.

## C. Staff & GM
- [ ] New guest request appears on the board within 3 s with chime + tab title count.
- [ ] Unassigned waiting timer counts up live (fake clock +6 min → "Waiting 6 min").
- [ ] Confirm does not assign the clicker. Assign dropdown excludes founder.
- [ ] Staff role sees only assigned + unassigned; cannot see Archive button.
- [ ] GM archives a cancelled ticket → disappears from board → visible under "Archived".
- [ ] Check-outs today strip: Bobo shows countdown; fake clock past 11:00 → turns red "Overdue", chime once.
- [ ] Check out flow ends the stay, revokes guest access, sets house available.
- [ ] Check in sheet usable with keyboard open on iPhone 13 and 360×740 (Confirm button visible).
- [ ] House photo upload: 5 MB photo → compressed ≤ 300 KB → shows on guest banner immediately.
- [ ] Dates display "Fri 30 Oct, 11:00" (no ISO strings anywhere).
- [ ] Idle 40 min (fake clock) → warning at 38 min → signed out at 40; back button doesn't reveal the board.
- [ ] Suspended → read-only banner, all action buttons disabled, rules deny writes.
- [ ] Team tab: no wrapped phone numbers, no sideways scroll.

## D. Founder HQ
- [ ] HQ fits 360 px with no sideways scroll; header ≤ 56 px on mobile.
- [ ] Suspend with message → guest and staff views change live; Resume → back to normal.
- [ ] Accounts: no duplicates, deactivated hidden by default, `founder.test@example.com` deactivated.
- [ ] Founder idle 30 min → signed out.
- [ ] Activity log records check-in, check-out, suspend, resume, account changes.

## E. QR cards
- [ ] Preview fits a 360 px screen.
- [ ] PNG for each house decodes with jsQR to the exact URL (automated).
- [ ] ZIP contains Chipo, Chisenga, Bobo only.
- [ ] Print outputs one page with only the card.
- [ ] Regenerate asks for confirmation; old token stops working.
- [ ] Manual: print at 100 %, scan with iPhone and Android camera at 30 cm and 1 m (screenshot in REPORT).

## F. Regression & quality
- [ ] `npm run build`, `npm run lint` (tsc), Vitest, Playwright all green in CI (GitHub Actions workflow added).
- [ ] No console errors on any screen in e2e runs.
- [ ] No hard-coded "Bobo", "Chisenga", "Chipo", "Princess", "Joe", "Nathaniel" strings in `src/` (CI grep).
- [ ] Every persona journey in `02-PERSONAS.md` has a passing e2e test.
