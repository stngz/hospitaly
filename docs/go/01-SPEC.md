# Product spec — Hospitaly pilot (Rock Apartments)

Source of truth for behaviour. Visual reference: `05-design-reference-demo.html` (open in a browser; the banner, Wi-Fi card, spacing and tone are the target look — keep the app's current minimal cream/white style, just cleaner).

---

## 1. Data model (Firestore)

| Collection | Key fields | Notes |
|---|---|---|
| `properties/{id}` | name ("Rock Apartments"), city, timezone `Africa/Lusaka`, contactPhone, whatsappPhone, coverImageId, checkInTime "14:00", checkOutTime "11:00", status `active\|suspended`, suspendedAt, suspendedBy, suspendMessage | One property in pilot |
| `rooms/{id}` (= houses) | propertyId, name ("Chisenga"), houseType (free text, e.g. "Garden Studio Apartment"), imageId, wifiName, wifiPassword, amenities[], houseRules, status `available\|occupied\|maintenance`, activeStayId, archived (bool), qrToken | Only Chipo, Chisenga, Bobo active; others `archived: true` |
| `stays/{id}` | propertyId, roomId, guestTitle (Mr/Mrs/Ms/Dr/none), guestName, guestPhone, checkInAt, checkOutAt (ISO, Lusaka time), status `active\|checked_out`, checkedOutAt, createdBy | Created at check-in with a **new random id** (`stay_${ulid}`) every time. Never reuse. |
| `requests/{id}` | propertyId, roomId, stayId, guestSessionId, category, title, description, priority, deliveryPreference, status `pending\|acknowledged\|in_progress\|completed\|cancelled`, assignedTo {uid, name, department}, archived (bool), archivedAt, archivedBy, createdAt, updatedAt, history[] | `stayId` required on create |
| `users/{uid}` | name, email, phone, role `staff\|manager\|founder`, department, propertyId, active, photoId | Role only from here |
| `media/{id}` | ownerType `house\|property\|user`, ownerId, dataUrl (JPEG, ≤ 300 KB after client-side compression, max 1600 px wide), width, height, uploadedBy, createdAt | Firestore-stored images because Firebase Storage needs Blaze. One doc per image. |
| `qrCodes/{token}` | propertyId, roomId, status `active\|revoked` | Token = doc id |

### Remove
- `sanitizeRoom`, `sanitizeProperty`, `isObsoleteOrTestRequest` and any code that edits/deletes/hides documents on load. In particular `nextRoom.activeStayId = stay_${room.id}` (creates a permanent shared stay id → next guest sees previous guest's requests) and stripping `/images/rocks-suite-enhanced.jpg` (that is the real room photo — keep it).
- All demo rooms except Chipo, Chisenga, Bobo → `archived: true` via `scripts/archive-demo-houses.ts`.

---

## 2. Guest app (QR → `/r/{token}`)

### Access
- Valid token + house occupied with an active stay → full guest app scoped to that stay.
- Valid token + house not occupied → calm screen: house photo, "Welcome to {house}", "This house isn't checked in yet. Please contact reception: {phone}". No request buttons.
- Invalid/revoked token → "This QR code is no longer active. Please contact reception."
- Property suspended → calm screen (see §5). No request buttons.
- Guest session stored per stay; when the stay ends the guest sees "Thanks for staying with us" and can't send requests.
- Back / refresh never loses the house (token stays in the URL).

### Home (top → bottom, nothing else)
1. **Banner** (430 px tall on phones): house photo (`house.imageId` → property cover → `/images/rocks-suite-enhanced.jpg` → illustration fallback from the demo file), soft dark gradient at the bottom.
   - Top row: `ROCK APARTMENTS · LUSAKA` left, frosted pill with live Lusaka time right (`18:42 Lusaka`, updates every 30 s).
   - Bottom: `Hello, {title} {full name}` (15 px), then large serif `Welcome to *{house}*` (house name italic), then `{houseType}` (exactly as entered).
   - **No check-out information on the banner or anywhere on Home.**
   - No dark-mode toggle, no avatar, no "Staff Portal".
2. **Wi-Fi card:** label `Wi-Fi` + network name on its own line (wrap, never truncate), password on its own line (18 px semibold, always fully visible), `Copy` → `Copied` button.
3. **Your request** card (only if a request is open): title (max 2 lines) + real status text + chevron.
4. **Quick requests:** 2 columns, max 6 tiles (Fresh towels, Pool towels, Extra pillows, Cleaning, Gas & kitchen help, Something broken). Each: icon, label 15 px, "About 15 min" 13 px. Tapping opens a short confirm sheet (note + delivery preference + Send).
5. **"Something else?"** button → full request form.
6. **House info** (compact): reception phone + WhatsApp button, check-in/check-out times as plain info inside House Guide only.

### Request form (Services tab)
- Steps: Type (Housekeeping, Maintenance, Pool & garden, Transport) → common requests list for that type → "Anything else?" note → urgency (Normal/Urgent) → delivery preference (Knock / Ring / Leave at door) → `Send request`.
- **No name/phone fields** — show "Sending as {title} {name}" (from the stay).
- Remove all hotel-style items (hot tub, luxury toiletries, dining).

### My requests
- Only requests where `stayId == current stay`. Title "Your requests". Card: status pill, title, "Housekeeping · 23:38" (Lusaka time).
- Guest can cancel while `pending`.

### Status screen
- Header "Your request" + "Chisenga · Ref 9HFTH".
- One progress component: Sent → Confirmed → On the way → Done (12 px+ labels).
- Team card: **department only** — "Housekeeping team is on it". Never a person's name.
- Delivery preference editable while not completed; one source of truth with the request.
- Plain copy: pending "Request received — we've told reception", acknowledged "Confirmed by reception", in_progress "On the way", completed "Done — enjoy!", cancelled "Cancelled".
- No pop-up banner covering the screen right after sending.

### House guide
- Editable by the GM: check-in/out times, Wi-Fi, pool hours & rules, quiet hours, gate & security, power cuts, gas, emergency numbers, nearby places in km.
- Only amenities that house actually has (pool yes; no hot tubs at Rock Apartments).

### Bottom nav
- Home · Requests (new) · House guide · My requests — icons (lucide Home, ConciergeBell, BookOpen, ClipboardList) + labels, badge on My requests, `padding-bottom: env(safe-area-inset-bottom)`, hidden while typing.

### Typography & style
- Instrument Serif (or Cormorant Garamond) for the welcome line only; Plus Jakarta Sans for everything else. No monospace on the guest side. Body 15 px, meta 13 px, labels 12 px minimum. Contrast WCAG AA. Tap targets ≥ 44 px.

---

## 3. Staff & GM app (`/staff`)

### Access & sessions
- Email + password (Firebase Auth). Role from `users/{uid}`. Deactivated → signed out immediately.
- Idle timeout: **staff 40 min, manager 40 min, founder 30 min**; max session 12 h (founder 8 h). Warning sheet 2 min before idle sign-out with "Stay signed in". Checked every 60 s and on tab focus.

### Layout (mobile)
- Sticky 56 px header: property name, alerts bell, ⋯ menu (chime test, HQ for founder, sign out). Founder sees a small "Viewing as founder" pill.
- Tabs in one row: **Requests · Houses · Team**.
- One-line "Add to home screen" hint, dismissible forever.

### Requests board
- Status chips row (Pending · Confirmed · In progress · Done · Cancelled) with counts; department dropdown; search.
- New requests appear instantly with chime + vibration + tab title count `(2) Hospitaly Staff`. Unassigned > 5 min shows an amber "Waiting 6 min" timer (live).
- Card: house chip, department, live "x min ago", title, guest note, guest name · phone (staff only), assignee, actions.
- Actions:
  - **Confirm** (= acknowledged) — does **not** auto-assign anyone.
  - **Assign** dropdown (staff + GM of this property only; never founder) → assignment logged in history.
  - **Start** (in_progress), **Done** (completed), **Cancel** (with optional reason).
  - **WhatsApp** — plain-text message (no emoji): House / Guest / Request / Details / Ref.
- **Archive:** GM can archive any cancelled or completed request ("Remove from board"). Archived requests are hidden from the board, kept in Firestore, visible under an "Archived" filter for the GM and founder. Staff cannot archive. No hard delete from the app.
- Staff (role `staff`) see requests assigned to them + unassigned; GM sees everything for the property.

### Live check-out (staff/GM only — never shown to the guest)
- **"Check-outs today"** strip at the top of Requests and Houses tabs, sorted by time, live countdown updated every 30 s:
  - more than 2 h → grey "Due out 11:00"
  - within 2 h → amber "Due out in 1 h 20 min"
  - within 15 min → orange "Due out in 12 min"
  - past check-out and still occupied → red "Overdue 25 min" + chime once when it turns overdue.
- Each item: house, guest, time, **Check out** button (opens confirm sheet → ends stay, revokes guest session, sets house `available`).
- Tomorrow's check-outs listed collapsed under "Tomorrow".
- Optional in-app reminder at 09:00 Lusaka: "2 houses due out today".

### Houses tab
- Header row: "Houses 3 · Occupied 2 · Available 1"; second row buttons "Download all QR (ZIP)" + "Add house" (GM only).
- House card: photo thumbnail, name, house type, status pill, guest (title + name), check-out "Fri 30 Oct, 11:00", phone (staff only), buttons: Check in / Check out, Edit guest, Edit house, QR card.
- **Check in** sheet (full height on mobile, sticky footer, works with keyboard open): Title (Mr/Mrs/Ms/Dr/none), Full name, Phone (`type=tel`), Check-out date + time (presets: tomorrow 11:00, +2 days, +3 days). Creates a new stay with a fresh random id.
- **Edit house** (GM): name, house type (free text), Wi-Fi name/password, amenities, house rules, **photo upload** (camera or gallery → client-side compress to JPEG ≤ 300 KB, max 1600 px → `media` doc → `house.imageId`). Preview before save. Remove photo.

### Team tab
- Mobile cards: name, role/department, email, phone on one line (no wrapping), active status. GM can't create accounts (founder does); GM can request one via a button that opens WhatsApp to the founder.

### Suspended property
- Staff app becomes **read-only**: a calm banner "Hospitaly is paused for Rock Apartments. You can view past requests. Contact Hospitaly to resume: {founder WhatsApp}". All action buttons disabled. Enforced in Firestore rules (no writes to requests/rooms/stays while property suspended, except founder).

---

## 4. Founder HQ (`/hq`)
- Mobile header 56 px with ⋯ menu (Create account, Onboard property, Property desk, Sign out). Not sticky on mobile.
- Property card: photo, name, city, status, houses count, live requests, GM name, buttons: **Open property desk**, **Suspend / Resume**.
- **Suspend flow:** confirm sheet with an editable message (default: "We're not taking requests through the app right now. Please contact reception: {phone}"), records `suspendedAt/By`. Resume is one tap with confirm.
- Accounts: mobile cards; one clear role label; "Show deactivated" toggle; actions: reset password email, deactivate/reactivate, change property/role. Remove duplicates. Flag and deactivate `founder.test@example.com`.
- Property settings: name, phones, timezone, check-in/out times, cover photo upload (same `media` flow).
- Activity log (last 50): check-ins, check-outs, suspends, account changes.

---

## 5. Suspended — what each person sees
- **Guest:** house photo + "Welcome to {house}" + a soft card: "We're not taking requests through the app right now. Please contact reception: {phone} / WhatsApp". Wi-Fi card and House guide still visible (they don't depend on us). No request buttons. No word "suspended", no error styling.
- **Staff / GM:** read-only + banner (above).
- **Founder:** full access, property shows "Paused" pill.

---

## 6. QR cards
- Generated locally (`qrcode`, error correction H), house name label in the centre (≤ 18 % size), verified with `jsQR` before showing/downloading; auto-fallback to smaller/no label if verification fails.
- Card 85 × 120 mm: `ROCK APARTMENTS` (from property name), QR, house name (serif), "Scan for Wi-Fi, house guide & requests", "No app needed · Works on any phone camera". No token text, no room type subtitle.
- Mobile preview fits the screen (`max-width: 100%`); 300-dpi canvas only for PNG download. Download PNG, Download all (ZIP), Print (only the card). Regenerate requires confirmation (old card stops working).

---

## 7. Alerts (no Blaze yet)
- In-app only: chime + vibration + tab title count + red dot on Requests tab, works while the staff app is open (including installed PWA in foreground).
- Keep FCM/Cloud Functions code behind `PUSH_ENABLED=false`; document how to switch on in REPORT.md.
- Screen wake lock option on the staff board ("Keep screen on at front desk").

---

## 8. Copy & formatting
- Dates: "Fri 30 Oct, 11:00" in Lusaka time. Distances in km. Currency "K".
- Display names from the database only — no hard-coded house or person names anywhere in `src/`.
- `APP_NAME` constant for the product name.
