# GO 2.1 — Addendum (send after GO 2 + security patch are finished and green)

Same rules as GO 2: protect everything in GO 2 section 0, small focused changes, tests for each item, honest report. Do not rename the product (still "Hospitaly").

## A. Public sales page at `/` (Hospitaly, not Rock Apartments)
Problem: opening `hospitaly.vercel.app` (e.g. from a Google search for "Hospitaly") shows the Rock Apartments guest screen with "call reception". The root must be the product's own page; a property's guest app lives only at `/r/{token}`.

Build a single, fast, mobile-first **sales page** at `/` whose job is to get lodge/hotel/holiday-home owners to ask for a quote. No Firebase reads on page load.

**Format: one animated scrolling page (scroll-story).** Each section fades/slides in as you scroll (IntersectionObserver + CSS transforms, no heavy libraries; 60 fps on a mid-range Android; respect `prefers-reduced-motion`). The page's main call to action for visitors is **"Turn on your camera and scan to try it"**:
- **Sticky phone mock-up** on desktop that changes as you scroll: QR card → guest home → request sent → "On the way" → "Done". On mobile the mock-up sits above each step instead of sticking.
- **"Try it now" section with a big demo QR code** + text "Open your phone camera and point it here". The QR opens `/demo`. On mobile (where you can't scan your own screen) show a button **"Open the live demo"** instead.
- **`/demo`** = a fully client-side demo of the guest app for a fictional "Sunset Lodge · Lusaka" (no Firestore reads/writes, no real data): banner, Wi-Fi card, quick requests; sending a request auto-advances Sent → Confirmed (5 s) → On the way (12 s) → Done (25 s) with the same screens as the real app, plus a small banner "Demo — this is what your guests would see" and a "Get a quote" button. Reuse the real guest components with a mock data provider so the demo always matches the product.

1. **Hero:** headline "Never miss a guest request again." Sub-line: "Hospitaly gives every room a QR code. Guests ask for towels, repairs or help in seconds — your team sees it instantly and you see everything. No app to install." Primary button **"Get a quote for your property"** (scrolls to the quote form). Secondary button **"Chat on WhatsApp"** → `https://wa.me/260979850598?text=Hi%2C%20I%27d%20like%20a%20quote%20for%20Hospitaly`. A phone mock-up image of the guest screen (static screenshot/PNG of the guest home, with a placeholder property name "Your Lodge" — not Rock Apartments' real data).
2. **The problem (3 short lines):** "Guests WhatsApp the caretaker and things get forgotten." / "Owners can't see who handled what, or how long it took." / "Check-outs slip and houses aren't ready."
3. **How it works (3 steps with icons):** Scan the QR in the room → Ask for what you need → Track it live until it's done.
4. **What owners & managers get (4 cards):** Every request logged and assigned · Live check-outs and house status · Your own branding, photos and house guide · Works on any phone — no app, no hardware.
5. **Built for Zambia (short strip):** Lusaka-time, works on slow connections, WhatsApp-friendly, local support.
6. **Social proof:** placeholder block "Now piloting at a holiday-home estate in Lusaka" — do **not** name Rock Apartments unless the founder confirms in `config.ts` (`SHOW_PILOT_NAME=false` by default).
7. **Get a quote form** (id `quote`): Your name*, Property name*, Property type* (Lodge / Hotel / Holiday homes / Guest house / Other), Number of rooms or houses*, Town/City*, WhatsApp number*, Email (optional), Message (optional). Button **"Get my quote"**.
   - On submit: save to Firestore `leads/{autoId}` with `createdAt`, `source: 'landing'`, then show "Thanks {name} — we'll WhatsApp you within 24 hours." and a button "Or chat now on WhatsApp" (prefilled with their property name and room count).
   - Spam/abuse: hidden honeypot field; disable button after submit; client-side 1 submit per 60 s; field length limits.
   - **Rules:** `leads` → `create` allowed to anyone **only** with exactly these fields, string lengths ≤ 120 (message ≤ 1000), rooms an int 1–2000, `createdAt == request.time`; **no read/update/delete** for anyone except the founder.
   - **HQ:** new "Leads" tab for the founder (newest first, status New / Contacted / Won / Lost, notes, one-tap WhatsApp to the lead). Count badge on new leads.
8. **FAQ (4 items, collapsible):** Do guests need an app? (No — just the phone camera.) What do I need? (Wi-Fi or mobile data; we print the QR cards.) How long to set up? (Same day.) How much does it cost? ("Pricing depends on the number of rooms — get a quote.")
9. **Footer:** © Hospitaly · Lusaka, Zambia · WhatsApp +260 97 985 0598 · small "Staff sign in" link to `/staff`. **No link to `/hq`.**
10. Same visual language as the guest app (cream/white, serif headlines, Plus Jakarta Sans), ≥ 12 px text, no horizontal scroll at 360 px, Lighthouse mobile Perf ≥ 90 / A11y ≥ 95 / SEO ≥ 95.
11. **SEO & sharing:** `<title>Hospitaly — QR guest requests for lodges, hotels & holiday homes in Zambia</title>`, meta description, Open Graph + Twitter image (1200×630 PNG in `/public`), favicon + apple-touch-icon, `robots.txt` allowing `/` and disallowing `/staff`, `/hq`, `/r/`; `sitemap.xml` with `/` only; `noindex` on `/staff`, `/hq`, `/r/*`.
12. **Routing:** `/` = sales page; `/r/{token}` = guest app; `/staff`, `/hq` unchanged. Opening `/` never shows any property's data. Unknown paths → simple 404 with a link home.
13. Tests: form validation; successful lead appears in HQ Leads; unauthenticated read of `leads` → 403; honeypot submissions dropped.

## B. Guest inactivity (no login timeout for guests)
Guests don't log in, so no idle sign-out (it would annoy people mid-stay). Instead:
1. Guest access ends automatically at **check-out** (already in place) — verify with a test.
2. If the guest app has had **no activity for 6 hours** (no taps/opens), require a re-scan of the QR (clear the local guest session; show "Please scan the QR card in your house to continue"). This limits a forwarded link being used from outside the house.
3. Guest screens show no phone numbers of the guest and only the greeting name — nothing sensitive if a phone is left unlocked.
4. Tests: re-scan required after 6 h of inactivity (fake clock), not before; access gone after check-out; new stay doesn't see old requests.

## C. Hotfix already applied live — make it permanent in the repo
Staff accounts created from HQ are not email-verified, so the GO 2 rule `isEmailVerifiedOrPilot()` locked every real staff member out (empty staff desk). The founder changed it in the Firebase console to:
```
function isEmailVerifiedOrPilot() { return isAuthenticated(); }
```
Make the same change in `firestore.rules` (remove the hard-coded email list too), so a future deploy doesn't lock staff out again. Access stays controlled by `users/{uid}` (role, propertyId, active). Add an emulator test: an **unverified** staff account with an active `users` doc can see its property's requests and rooms; an account without a `users` doc sees nothing.

## Report
Screenshots at 390 px of the sales page (hero, how it works, quote form + thank-you state, footer), the HQ Leads tab, and the re-scan screen; Lighthouse scores; test list with pass/fail.
