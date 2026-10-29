<USER_REQUEST>
you did good agy constructor but for final /goal
Roles
Founder: the human. Ask him only for items in "Needs from founder".
Project manager: Claude. Wrote this brief and will re-test the live site afterwards as every persona.
You — chief constructor (lead agent): split the work into the sub-agents below, run them, integrate, and only report done when every check passes. Tasks are small and specific on purpose. Do exactly what is written; if something is unclear or conflicts with working behaviour, stop and list the question in REPORT.md instead of guessing.
0. Protect what already works (read first)

The founder tested these and is happy. They must still work identically after this round. Before changing anything, the lead writes Playwright "golden" tests for each (against the emulator) and keeps them green after every merge:

Must keep working	Notes
Guest scans QR → banner with real photo, "Hello, {title} {name}", "Welcome to {house}", Lusaka time	Layout and look stay the same (only the top row text changes, see Q1)
Wi-Fi card with full password + Copy	
Guest request → appears on staff board instantly → GM assigns → guest sees "Housekeeping team is on it" (department only)	The core loop. Never break it
Staff board mobile layout, tabs, chips, check-out strip with countdown/overdue, Check out flow	
Houses tab: house cards, Edit house (name, house type, Wi-Fi, photo upload), QR card + PNG/ZIP	
Founder suspend → staff go read-only instantly, guest sees calm notice; Resume	Founder loved how fast this updates
Founder creates staff account in HQ → appears in Firebase Auth + users; reset password; delete	
HQ look	Founder likes it — don't restyle
No text under 12 px, no monospace on guest side, no horizontal scroll at 360 px	

Rules: no UI redesigns, no renaming files/collections unless a task says so, no automatic data deletion/rewrites in the browser, all times via src/lib/time.ts in Africa/Lusaka.

Order of work
Wave 0 — Lead: golden tests above + reproduce every bug below on the emulator (seed with a legacy request copied from production's "Gas & kitchen help" shape).
Wave 1 — Agent SEC (blocking, merge first): everything in docs/go/SECURITY-PATCH.md.
Wave 2 — four quick-task agents in parallel (after SEC merges): Q1 Guest, Q2 Operations, Q3 Sessions & alerts, Q4 HQ & contacts.
Wave 3 — QA agent + Reviewer agent: full test plan + golden tests + security probes on the deployed preview; Reviewer walks every persona at 360/390 px. Fix loop until green.
Report honestly: list each test by name with pass/fail. Count tests, not test × devices. Anything not tested → say "not tested".
Wave 2 tasks
Q1 — Guest app (agent: Guest)
Friendly loading screen with animation right after scanning the QR (founder priority). From the first paint until the token/stay is resolved, never show "Scan your house QR" or "Call reception". Show a full-screen, on-brand loading screen: the property name ("Rock Apartments"), "Welcome to {house}" as soon as the house name is known, the line "Preparing your stay…", and a smooth looping animation (CSS/SVG only, lightweight — e.g. a key turning in a door, a door gently opening, or a house outline drawing itself; respect prefers-reduced-motion). Fade into the guest home when ready. Minimum display ~600 ms so it doesn't flicker; maximum wait before showing a friendly retry message: 10 s. Only after loading finishes decide between: full app / not checked in / checked out / invalid / paused.
Banner top row — city shown once only: left ROCK APARTMENTS · LUSAKA (property name · city from data), right time only (19:28). The word "Lusaka" must appear exactly once on the banner. Make sure the left text never collides with the time pill (truncate the property name first, never the time).
Check-out date shown quietly on the line under the title: {houseType} · until Fri 30 Oct. No countdown, no "check out soon", no reminders, no colour change.
Quick-request example text per item (placeholder in the note field):
Fresh towels → "e.g. 2 bath towels please"
Pool towels → "e.g. 4 pool towels"
Extra pillows → "e.g. 2 extra pillows"
Cleaning → "e.g. please clean the kitchen and bathroom"
Gas & kitchen help → "e.g. the gas stove won't light"
Something broken → "e.g. the shower is cold / AC not working"
Something else → "Tell us what you need"
Delivery options depend on the request — no "Ring" anywhere (remove the option, the enum value and the label; keep existing data readable):
Items (towels, pool towels, pillows): Leave at door (default) or Knock.
Service in the house (cleaning, gas & kitchen help, something broken): Knock only (no choice shown).
Custom "Something else": Knock (default) or Leave at door.
Staff card shows plain words: "Knock" / "Leave at door" (never leave_at_door / at_door).
Checked-out or inactive stay: if the guest's stay has ended, show "Thanks for staying with us at {house}" + reception contact; never let a request fail silently. If a send fails for any reason, show a clear message: "We couldn't send that. Please try again or call reception: {phone}".
Guest note stays clean: don't append "(Estimated time: …)" or any system text into the guest's description. Keep ETA as a separate field.
House type text = exactly what the founder/GM typed (houseType). Never show enum codes like 2bhk/Studio unless that is what was typed.
One reception number everywhere on the guest side (home, house guide, paused notice, errors): property.contactPhone; WhatsApp buttons use property.whatsappPhone (falls back to contactPhone). House guide emergency number defaults to property.contactPhone unless the GM set a different one.
Q2 — Operations (agent: Ops)
Stuck legacy requests (bug). Some older requests (e.g. "Gas & kitchen help" on Chisenga) can't be assigned, confirmed, started or cancelled — the dropdown snaps back and buttons do nothing. Reproduce, capture the exact Firestore error in the console, fix the cause (likely missing/old fields such as stayId, roomId, id, undefined values, or a rule mismatch), and:
make every action show a visible error toast if a write fails (never silent);
add scripts/migrate-legacy-requests.ts (Admin SDK, --dry-run default) that fills missing fields so old requests work; document it in REPORT.
Done → GM verification:
Staff press Done → status completed, guest sees "Done — enjoy!" immediately.
Request also gets verification: 'pending' and appears in a GM-only "To verify" filter/chip on the board (with count).
GM taps Verified (sets verification: 'verified', verifiedBy, verifiedAt) or Reopen (status back to in_progress, guest sees "On the way" again, note required).
Staff cannot set verification (enforce in rules). Archive allowed only after verified or cancelled.
Check-out visibility by department: guest check-out dates/times, the check-out strip and "Check out" actions are visible to housekeeping, reception, manager, founder only. Maintenance (and any other department) sees house name + occupied/available only. Enforce in UI and, where data comes from stays, in rules.
Houses: founder only can add houses.
Hide "Add house" for managers/staff; rules: rooms create = founder only.
Fix: the founder currently can't add a house from the property desk — make "Add house" work for the founder (name, house type, Wi-Fi, photo), generate QR token, appear immediately.
GM can still edit house details, photos, Wi-Fi, house guide.
Founder in the property desk: replace "Request new account" with "Create account" for the founder (same form/logic as HQ, pre-filled with this property). Managers keep "Request new account", which opens WhatsApp to the founder number (see Q4).
Founder not listed in a property's Team list (keep in HQ accounts only). Also never in assign dropdowns.
Check-in sheet title default = none (empty), options Mr/Mrs/Ms/Dr.
Staff desk load time: currently 6–10 s on "Verifying staff portal session…". Target < 2 s on 4G: render the shell as soon as Firebase Auth restores the user, load profile + listeners in parallel, show skeleton cards instead of the full-screen spinner. Measure before/after in REPORT.
Q3 — Sessions & alerts (agent: Sessions)
Timeouts don't fire for the founder: the founder's user doc has role: 'admin', but SESSION_POLICIES only has founder | manager | staff → evaluateSessionState returns "never expire". Normalise roles in one place (admin → founder) for policy, UI labels and rules; add unit tests for admin. Then verify all three roles expire with Playwright fake clock (idle 30/40/40 min, max 8/12/12 h, warning at T-2 min, sign-out on returning to a backgrounded tab). Also confirm activity in one tab doesn't keep other devices alive (it shouldn't — storage is per device).
Sound + vibration alerts on staff phones (no Blaze yet):
Restore a clear "Turn on sound alerts" button in the staff header/bell for staff + GM. One tap: unlocks audio (play a short silent buffer inside the tap — browsers block sound until the user taps), asks notification permission, and enables screen wake lock if supported. Store the choice per device; show bell as on/off.
On every new request for this property (and for staff: assigned to them): play chime (loud, ~1.5 s, repeat once after 10 s if still unconfirmed), vibrate (navigator.vibrate([300,100,300])), update tab title count, show an in-app banner, and if permission granted and the page is in the background, show a local Notification via the service worker registration.
Be honest in REPORT: without Firebase Blaze + FCM, alerts only work while the staff app is open (foreground or recently backgrounded). Locked-phone push needs Blaze — keep that code behind PUSH_ENABLED=false and write the exact steps to switch it on.
Add a "Test alert" button in the ⋯ menu.
Q4 — HQ & contacts (agent: HQ)
Hospitaly/founder contact number = +260 97 985 0598 (WhatsApp 260979850598). Put it in src/lib/config.ts as FOUNDER_CONTACT_PHONE and use it for: staff paused/suspended notice ("Contact Hospitaly"), "Request new account" WhatsApp link, any "contact Hospitaly" text. Remove every other hard-coded/fake number from src/.
Property reception vs WhatsApp: keep both fields in property settings; guest "Call" uses contactPhone, guest "WhatsApp" uses whatsappPhone (fallback contactPhone). Show both clearly labelled in settings.
Product name: do NOT rename anything in this round. "Hospitaly" stays as it is everywhere (HQ title included). The rename will be a separate, final push once the founder picks the name. Just don't add new places that spell the name differently ("Hospitally" vs "Hospitaly") — use the existing spelling "Hospitaly".
Account creation must not depend on public sign-up. api/admin/users.ts currently creates accounts by calling the public identitytoolkit accounts:signUp endpoint with the web API key — so the founder can't disable public sign-up without breaking "Create account". Switch the endpoint to the Firebase Admin SDK (firebase-admin, getAuth().createUser, generatePasswordResetLink), initialised from a service-account JSON in the Vercel env var FIREBASE_SERVICE_ACCOUNT (never committed). Verify the caller with getAuth().verifyIdToken + users/{uid}.role == 'founder'. Document in REPORT exactly how the founder creates the service-account key and pastes it into Vercel. After this ships, the founder can turn off public sign-up safely.
Definition of done
All golden tests (section 0) green on iPhone 13, Pixel 7, 360×740 Android, iPhone SE, Desktop.
Every Q-task has at least one automated test named after it (e.g. Q2.2 done-then-verify).
Security probes in SECURITY-PATCH.md pass against the deployed preview.
REPORT.md: what changed, per-test pass/fail list, before/after load time, honest limitations, questions, and "Needs from founder".
Needs from founder (put in REPORT, add anything else you discover)
 Product name: no action this round — the rename is a separate final push.
 Firebase console: enable Anonymous sign-in (needed by the security patch). Create the service-account key and add FIREBASE_SERVICE_ACCOUNT in Vercel (Q4.4). Only after Q4.4 is live: disable public email sign-up.
 Delete only unknown/fake founder-level test logins (e.g. founder.test@example.com); keep one test manager + one test staff account with strong passwords for testing.
 Deploy rules (firebase deploy --only firestore:rules) if not done by CI.
 Run scripts/migrate-legacy-requests.ts and the archive/cleanup scripts (dry-run first) — or confirm the agent ran them.
 Reprint all QR cards after the token regeneration.
 Real reception + WhatsApp numbers for Rock Apartments; real house types, Wi-Fi and house-guide facts (remove anything unconfirmed, e.g. "tap water is safe").
 Decide on Firebase Blaze for locked-phone push alerts.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-29T21:58:52+04:00.
</ADDITIONAL_METADATA>