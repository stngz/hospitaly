# GO 3.1: Guests can get in, brand finish, cleaner sales page

> **Goal prompt for Antigravity. Use sub-agents. This replaces any earlier GO3.1 file.**
>
> **Ground rules**
> 1. These already work and must keep working:
>    - HQ ↔ Property Desk switching (dataSession)
>    - Founder, GM and staff data loading
>    - The Firestore list rules (every private collection returns 403 to outsiders)
>    - The quote form
>    - The /demo flow
> 2. Work in this order, **one commit per part**: **A → B → C → D**. Deploy and check live after each part before starting the next.
> 3. Honest report only. Mark each item ✅ or ❌ with one line saying *how you checked it live*. "Tests pass" is not proof for Part A. Proof means a real guest flow in a **fresh browser profile with nobody signed in**, on the live URL.
> 4. Never rename Firebase IDs, collections, env vars, the repo or API routes.

---

## Part A: Guest access, ALREADY FIXED (hotfix `fix(guest): anonymous guest sessions…`)

**Do not change any of these. They were fixed and checked in the guest-access hotfix:**
- the guest sign-in in `ensureGuestAccess` (`store.ts`)
- the anonymous skip in `AuthContext.tsx`
- the guest flow in `TenantContext.tsx`
- the `/scan` reading logic in `ScanPage.tsx`
- the Firestore rules for `guestSessions`, `rooms`, `stays` and `requests`
- the "no local database copy" rule (`USE_LOCAL_TEST_CACHE`)

If your work in B, C or D touches one of these files, change **only styling or text**, never the logic. Re-run `tests/rules/guest-access.rules.test.mjs`; all must PASS.

## Part B: Requests lifecycle and staff desk bugs

- **B1. Old guests leave the page after 1 day.** 24 hours after a stay is checked out, every request of that stay moves to **Archived** automatically, whatever its status. This is **not** deleting: it stays searchable under Archived, as decided earlier. Open requests of that stay are closed at check-out with the reason "Guest checked out". Run it on desk load and on a daily schedule if one exists. Add a one-off pass now for the existing old requests. Today Princess, Dr John and K. Musonda's requests still sit in the queue after they checked out.
- **B2. "To verify" shows 0** while 6 cards say "Done (To verify)". The filter, its count and the card label must use one shared function: done and not yet verified. Its active pill uses the same style as the other active pills.
- **B3. "Waiting 2112 min".** Show `12 min` / `3 h 20 min` / `1 d 11 h`. Over 30 min shows in red.
- **B4. Duplicates.** The same stay sending the same request type while an earlier one is still open gets "Already on its way", not a new ticket.
- **B5. Mobile staff desk (390 px).**
  - The search box is squeezed by the department select: stack them full width under 480 px.
  - The property name is cut to "Rock A…": let the "Viewing as founder" badge wrap below it.
  - Add a right-edge fade on the scrolling filter pills.
- **B6. Activity log.**
  - "By Manager" must show the person's name.
  - Remove the duplicated "email (email)".
  - Never show raw IDs like `prop_rocks_lusaka`; show the property name.

---

## Part C: The Shekin logo and brand are still not used

**What the audit found:**
- `src/components/common/Logo.tsx` is a **letter in a box**, not the door mark, and **nothing imports it**. Every header writes its own "S" or "H" box.
- `public/icons/icon.svg` (favicon and PWA icon) is a serif **"H"** on black (Hospitaly).
- `apple-touch-icon` points at `app-icon-backdrop.png`, a **blank navy square with no logo**.
- `manifest.webmanifest`: `theme_color` and `background_color` are `#0c0a09` (black).
- Colours are Tailwind amber/orange (`oklch(0.769 0.188 70)`) and stone-black throughout. There's no navy or gold.

**Fix:**
- **C1. One logo component.** Rewrite `src/components/brand/Logo.tsx` (move it from `common/`) as the real mark:
  - Arch `M28 90 L28 46 A22 22 0 0 1 72 46 L72 90`, navy stroke 9, `stroke-linejoin: round`.
  - Gold door `M50 26 L66 34 L66 88 L50 90 Z`, filled `#C9A55C`, viewBox `0 0 100 100`.
  - Props: `variant: 'mark' | 'full'`, `size`, `tone: 'onLight' | 'onDark'`. On dark, the arch is cream `#FAF7F0`.
  - The wordmark "Shekin" is Cormorant Garamond 700.
- **C2. Use it everywhere.** Do not leave one letter-box:
  - sales page header and footer, `/scan`, `/demo` bar, staff sign-in, HQ header, Property Desk menu
  - a small **"Powered by Shekin"** line (mark + word, 12 px, muted) at the bottom of guest home and the guest error screens
  - the property's own logo stays the main brand on guest screens
- **C3. Icons.**
  - Generate `public/icons/icon.svg`, `icon-192.png`, `icon-512.png` (maskable, 20% safe padding), `apple-touch-icon.png` 180×180 and `favicon-32.png`. All are the door mark on navy `#13233A`, with `app-icon-backdrop.png` as the texture behind it.
  - Set `theme_color` and `background_color` to `#13233A`.
  - Add a `scripts/make-icons` script so the icons can be rebuilt.
- **C4. Colours.** Shekin's own surfaces become brand tokens: the sales page, `/scan`, `/demo` chrome, sign-in, HQ and the desk chrome.
  - navy `#13233A` (primary button, cream text)
  - gold `#C9A55C` (accents, icons, focus ring)
  - cream `#FAF7F0` (background)
  - status green `#1F4D3A`
  - HQ dark mode uses navy shades `#0E1A2B` / `#13233A` / `#1C2F4A`, not black.
  - Remove every `amber-*`, `orange-*` and `stone-950` from these surfaces. Guest screens stay property-coloured.
- **C5. Numbers.** Add `font-variant-numeric: lining-nums tabular-nums` globally. Cormorant's old-style "1" looks like "ɪ" in the stat tiles.
- **C6. Loader.** The guest loader currently loads two photos of about 690 KB each before it shows anything, which is slow on 3G. Make the loader the **CSS/SVG door from the logo**: the gold door swings open with `perspective(400px) rotateY(-70deg)` over about 900 ms. It respects reduced motion and weighs 0 KB of images. The door photos stay for the sales page only.
- **C7. Demo.** Replace the emoji icons (🛁 💧 📶 🧹) with the same lucide icons the real guest app uses. Remove the staff name "Grace Phiri"; guests never see staff names. Use "A team member is on the way".
- **C8.** CI grep `Hospitaly|Hospitally` across user-facing strings, titles, manifest, meta and alt text, then fix every hit. The technical IDs listed in GO3 P4 are allowed.

---

## Part D: Sales page redesign (the founder picked the "Nova Estates" reference)

**Main reference:** https://dribbble.com/shots/27847801-Real-Estate-Website. Its full mockups:
- https://cdn.dribbble.com/userupload/49463192/file/d7e9b14afece170e7cb252143315ac2d.png
- https://cdn.dribbble.com/userupload/49463193/file/2378ee6e2f667da6f05277d5e3b5edf7.png

**Secondary (take only 3 details):** https://dribbble.com/shots/27554557-Luvora-Hotel-Booking-Landing-Page
- the pill buttons with a round arrow badge
- the split FAQ
- the giant wordmark in the footer

**Open the references in your browser before you design.** Keep the *structure and calm* of Nova Estates, in Shekin's brand: Cormorant Garamond headlines, Plus Jakarta Sans body, navy/gold/cream. **Don't** switch to their grotesk font or Luvora's all-caps.

**Use only our existing images** in `public/brand/`: `hero-loop.mp4` + `hero-poster.jpg`, `hero.jpg`, `demo-house.jpg`, `step-scan.jpg`, `step-request.jpg`, `step-done.jpg`, `door-open.png`, `door-closed.png`, `og-image.jpg`.

**Copy.** Keep all current claims (the founder confirmed they're offered). Shorter is better. **Never invent numbers, reviews or client logos.**

### Page, top to bottom (Nova section → Shekin version)

**1. Hero (Nova: framed photo, headline bottom-left, property card + CTA bottom-right)**
- The page has a 16 px cream margin. Inside it, one rounded (24 px) frame, ~92 vh desktop / 78 vh mobile, playing `hero-loop.mp4` (poster `hero-poster.jpg`). There's a soft navy gradient on the lower 40%.
- **Nav sits inside the top of the frame:**
  - left: the Logo (C1, cream variant)
  - centre: "How it works · Demo · Pricing · FAQ"
  - right: a cream pill button "Get a quote" with a navy arrow circle
  - after scrolling past the hero it becomes a fixed cream bar with a navy logo
- **Bottom-left:** the headline "Never miss a guest request again." in cream Cormorant, 64–76 px desktop / 40 px mobile, max 2 lines.
- **Under it**, a small glass card (Nova's "The Aurelia Residence" card):
  - a 56 px thumbnail of `demo-house.jpg`
  - "Sunset Lodge · Lusaka"
  - a live line that cycles every 3 s: "Fresh towels — Sent", then "On the way", then "Done ✓"
  - tiny ↑/↓ buttons that switch between three sample requests (Fresh towels, Something broken, Gas & kitchen)
- **Bottom-right:** one line, "Guests scan. Your team delivers. You see everything.", plus a cream pill "Try the demo ↗".
- **Mobile:** the headline, the glass card and one full-width pill stack at the bottom.

**2. "/About Shekin" (Nova: "More than property" + stat tiles)**
- **Left column:** the label "/ About Shekin", then the headline "More than a QR code. We run the requests behind it.", 2 short lines, and a navy pill "See how it works ↗".
- **Right column:** a 2×2 grid of **true** product facts:
  - "0 — apps to install"
  - "2 taps — to ask for anything"
  - "Live — every request, every house"
  - "Same day — cards printed & team live"
- One tile is highlighted in navy with cream text (Nova highlights 96%). Numbers count up when in view.

**3. "/How it works" (Nova: numbered "Featured properties" list with one expanded row)**
- The headline "Three steps. No app." with a short paragraph on the right.
- A numbered list with dividers. **One row is open at a time**: the open row shows a large rounded image on the left and the text on the right; the others are single lines with an arrow button.
  - **01 Scan the card in the room** (`step-scan.jpg`)
  - **02 Ask for what you need** (`step-request.jpg`)
  - **03 Track it until it's done** (`step-done.jpg`)
  - **04 Owners see every request, live** (`hero.jpg`)
- On desktop, rows open as you scroll (sticky section) or on click. On mobile, tap to open, and the image goes full width on top.

**4. "/Why Shekin" (Nova: "A better way to find a place to belong" list + tall image)**
- **Left:** the headline "A calmer way to run your stay." Below it, 4 rows with thin dividers, each a title + one line:
  - "Messages stop getting lost"
  - "Owners see who did what"
  - "Check-outs never slip"
  - "Your own branding on every screen"
- **Right:** a tall rounded image, `door-open.png`, with a slow parallax.
- **Mobile:** the image goes on top, about 60 vh.

**5. Demo band (Luvora: "Tell us where you want to go" over a photo)**
- Full-bleed rounded frame with `demo-house.jpg` and a navy overlay.
- Centred: "See what your guests see", one line, and two pills: "Open the live demo ↗" (cream) and "Scan a room QR" (outline).

**6. Quote (Nova: "Your next chapter starts here" card over a dark photo)**
- A large rounded frame with `hero.jpg`. A white card sits on top, left-aligned on desktop: "Get a quote for your property", one line, and the **existing form** (every field, the honeypot, 16 px inputs, same Firestore write).
- On mobile the image is a 220 px banner on top, then the form full width.

**7. FAQ (Luvora split)**
- Left: "Questions?" in large Cormorant.
- Right: the existing 4 questions as an accordion with + / − icons and thin dividers.

**8. Footer (both refs: dark footer + giant wordmark)**
- Navy `#13233A`. Three columns:
  - **Product:** How it works, Demo, Pricing
  - **Guests:** "Staying at a property? Scan your room QR"
  - **Contact:** WhatsApp +260 97 985 0598, Lusaka, "Staff sign in"
- Below that, a giant "Shekin" wordmark in Cormorant, cream at 10% opacity, edge to edge and cropped at the bottom, with the gold door mark beside it.
- A bottom line: © year · Privacy.

### Style rules
- **Background** cream `#FAF7F0`. **Cards** white with a 1 px `#E7E1D4` border, radius 20 px. **Text** navy. **Muted text** `#5B6575`. **Accent** gold, used only on numbers, labels, icons and the door.
- **Section labels** in Nova's style: "/ How it works", 13 px, gold.
- **Buttons** are all pills, 48 px high, with a 32 px arrow circle on the right (Luvora). Primary = navy with a cream circle; on photos = cream with a navy circle. No orange anywhere.
- **Spacing:** section padding 128 px desktop / 80 px mobile. Max width 1200 px. Body text 17 px, line height 1.6. Headlines 44–56 px desktop / 32–36 px mobile.

### Motion (the existing `motion` package only, no new libraries)
- **Hero:** on load, the headline rises word by word (40 ms stagger) and the glass card slides up after 300 ms. On scroll, the hero frame's corners and margin grow slightly (scale 1 → 0.96) and the video moves at 0.9× the scroll (parallax).
- **Sections:** fade up 24 px over 700 ms, ease `[0.22,1,0.36,1]`, children staggered 90 ms, once at 20% in view.
- **Images:** reveal with `clip-path: inset(8% round 24px)` → `inset(0 round 24px)` plus a scale from 1.08 to 1.
- **How it works:** the open row's image crossfades and the height animates smoothly.
- **Stats:** count up over 1.2 s.
- **Footer:** the giant wordmark slides up 40 px as it enters.
- **Buttons:** on hover, the arrow circle rotates −45° and grows to 1.1.
- Everything turns off under `prefers-reduced-motion`.

### Performance
- The video uses `preload="metadata"`, `playsinline muted loop`, and the poster is the LCP image.
- Images use `loading="lazy"` below the fold, with width and height set.
- LCP < 2.5 s on simulated 4G. Lighthouse mobile performance ≥ 85 and accessibility ≥ 95.
- Test at 390, 768 and 1440 px. No horizontal scroll.

**SEO/social (same commit):**
- Real `public/robots.txt` and `public/sitemap.xml`. Today both return the app HTML. Exclude them from the SPA rewrite in `vercel.json`. robots.txt disallows `/staff`, `/hq`, `/r/`.
- `og:image` and `twitter:image` must be **absolute** URLs, built from a `SITE_URL` constant (`https://hospitaly.vercel.app` now, `https://shekin.app` later). Add `og:url` and `og:site_name`.

**/scan fallback:** if the camera is blocked or missing, don't show a black box. Show:
- "Camera blocked. Allow camera access, or open your phone's camera app and point it at the card."
- A "Try again" button and a "Back" button.

---

## Done means
- A guest can still scan, see their house and send a request on the live site, in a fresh browser with nobody signed in (re-check after your changes).
- B, C and D are deployed, each item ✅/❌ with how it was checked.
- Screenshots at 390 px **and** 1440 px of every sales section (hero, about + stats, how it works with a row open, why Shekin, demo band, quote, FAQ, footer wordmark), each next to the matching part of the Nova reference. Also at 390 px: `/scan` with the camera denied, the staff desk, HQ stats, the favicon/home-screen icon, and the guest home showing "Powered by Shekin".
- Nothing in the ground-rules list got worse. Unauthenticated reads of every private collection are still 403.
