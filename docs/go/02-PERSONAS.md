# Personas — every one must succeed before the build is "ready"

The QA agent writes one Playwright test per journey (mobile viewport noted). The Reviewer agent also walks each journey by hand from the persona's point of view and notes anything confusing, slow, ugly or untrustworthy. The director (Claude) will repeat these reviews on the live preview.

---

## Guests

### G1 — Mwila, 34, Lusaka business traveller · Android (Pixel 7), patchy 3G
- Arrives late, tired. Scans the QR on the bedside card.
- **Journey:** scan → sees "Hello, Mr Mwila Banda / Welcome to *Chisenga*" → copies Wi-Fi password in one tap → taps "Fresh towels" → adds "2 bath towels" → Send → sees "Request received" → 10 min later sees "On the way" without refreshing.
- **Must be true:** first screen loads < 3 s on Fast 3G; no login; password fully visible; he never needs to type his name; times are Lusaka time.

### G2 — The Okafor family, international tourists · iPhone 13, roaming data
- Mother handles requests; English is fine but not first language.
- **Journey:** scan → House guide → finds pool hours and quiet hours → back → "Something else?" → Maintenance → "Something broken" → "Shower is cold" → Urgent → Send → watches status.
- **Must be true:** no jargon; icons + words on nav; one obvious way to do each thing; Back always works; urgent request shows on staff board at the top.

### G3 — Mrs Phiri, 67 · older iPhone SE (375×667), large text setting
- **Journey:** scan → reads everything without zooming → requests extra pillows → cancels it 1 min later ("changed my mind").
- **Must be true:** nothing under 12 px; buttons ≥ 44 px; works with iOS text size at 130 %; cancel is easy and clear.

### G4 — Tasha & Leo, 26, couple on a weekend stay · iPhone 15 Pro
- **Journey:** scan → screenshot the banner for an Instagram story.
- **Must be true:** banner looks premium: real photo, their name, house name, live time; nothing cluttered or broken on the screenshot.

### G5 — Next guest in the same house (privacy check)
- After G1 checks out, a new stay starts in Chisenga.
- **Must be true:** the new guest sees **none** of G1's requests or name; G1's old link shows "Thanks for staying with us" and can't send requests.

### G6 — Guest when the property is paused
- **Must be true:** sees the calm "not taking requests through the app right now — contact reception" card, Wi-Fi and House guide still work, no error look, no word "suspended".

---

## Staff

### S1 — Bwalya, housekeeping · Android with cracked screen, low storage, uses the app as an installed PWA
- **Journey:** signs in once → keeps the board open → hears chime when a request arrives → sees it's assigned to her → taps Start → delivers → taps Done.
- **Must be true:** she only sees what's hers + unassigned; big clear buttons; can't archive, can't see Team admin or HQ; signed out after 40 min idle with a warning first.

### S2 — Chanda, maintenance, shares a phone with the night guard
- **Must be true:** after 40 min idle the next person can't use his session; sign-out is one tap from the ⋯ menu.

---

## Hotel management

### M1 — The General Manager · iPhone, runs the estate day to day
- **Morning journey:** opens /staff → sees "Check-outs today: Chisenga 11:00 (in 2 h), Bobo overdue 15 min (red)" → checks out Bobo → checks in a new guest to Chipo (Mr / name / phone / out in 2 days) → uploads a new photo of Chipo's pool → opens Chipo's QR card → downloads PNG.
- **During the day:** gets new request → Confirm → assigns to Bwalya → later archives two cancelled tickets → finds them under "Archived".
- **Must be true:** everything live (no refresh); confirm doesn't assign himself; can't see other properties; can't create accounts; can't touch HQ.

### M2 — The owner (Joe) — looks over the GM's shoulder
- **Must be true:** can understand the board in 10 seconds: what's waiting, what's late, which houses are due out. Nothing looks like a developer tool.

---

## Founder / CEO

### F1 — The founder (HQ) · on his phone in Dubai
- **Journey:** signs in at /hq → sees Rock Apartments card with live requests and GM → suspends the property with the default message → opens the guest link on another phone → sees the calm paused screen → staff desk shows read-only banner → resumes → everything works again → deactivates `founder.test@example.com` → reviews activity log.
- **Must be true:** all times shown in Lusaka time even though he's in Dubai; HQ fits a phone with no sideways scroll; signed out after 30 min idle.

### F2 — CEO-level product review
- **Asks:** Is it obvious what this product does within 5 seconds on each screen? Is anything embarrassing in front of a client (test data, "Lorem", hotel jargon, broken images, wrong house names)? Does it feel like one product (same fonts, colours, words)?

---

## Investors

### I1 — Angel investor doing a 10-minute demo on her own phone
- Scans Chisenga's QR from a printed card, sends a request, watches the founder's phone (staff desk) receive and complete it.
- **Must be true:** works first time on a real camera scan; round trip guest → staff → guest under 3 seconds on Wi-Fi; nothing crashes; looks trustworthy.

### I2 — Technical investor / due diligence
- **Asks:** Are permissions enforced server-side (Firestore rules tests)? Is guest data isolated per stay? Are there secrets in the repo? Is there an automated test suite and does it pass? Can it scale from 3 houses to 300 without code changes (no hard-coded names, property-scoped queries)?
- **Must be true:** rules tests in CI, e2e suite green, no secrets, `REPORT.md` explains architecture in one page.
