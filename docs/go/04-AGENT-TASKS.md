# Agent assignments

Each agent: works on its own branch `go/<agent>`, writes/updates tests for its area, keeps `npm run build` green, and hands a short summary + screenshots (390 px) to the Lead. The Reviewer must approve before merge.

---

## Lead agent (integrator)
- Read all docs + code. Write `docs/go/PLAN.md` (tasks, owners, order, risks).
- Set up Firebase Emulator Suite, `scripts/seed-emulator.ts`, Playwright config (5 device projects), Vitest, GitHub Actions CI (build, tsc, vitest, rules tests, playwright, CI greps).
- Add `src/lib/time.ts` (`formatPropertyTime`, `formatPropertyDate`, `useNow(intervalMs)`) and `src/lib/config.ts` (`APP_NAME`, `PUSH_ENABLED`) for all agents to use.
- Merge order, conflict resolution, final `docs/go/REPORT.md`.

## Agent B — Data & Security (Wave 1, must merge first)
1. Implement the data model in spec §1 (stays collection, media collection, archived flags, qrCodes by token).
2. **Delete** `sanitizeRoom`, `sanitizeProperty`, `isObsoleteOrTestRequest` and any auto delete/rewrite on load. Remove `activeStayId = stay_${room.id}` fallback.
3. Check-in creates a fresh random `stayId`; check-out closes stay and revokes guest session.
4. `firestore.rules` for every permission in the spec, including suspended-property write blocks and archive permissions. Rules unit tests (test plan §A).
5. Scripts (`scripts/`, Admin SDK, `--dry-run` default): `archive-demo-houses.ts` (keep Chipo, Chisenga, Bobo), `cleanup-test-data.ts` (test requests, duplicate users, `founder.test@example.com`), `migrate-stays.ts` (create stays for currently occupied houses).
6. Session policy: founder idle 30 min / max 8 h; manager & staff idle 40 min / max 12 h; warning sheet at T-2 min; check on interval + visibility change; deactivated → instant sign-out.
7. Guest stay/session handling in `TenantContext` (spec §2 Access).

## Agent C — Guest experience (Wave 2)
1. Banner exactly per spec §2 and the demo file: real photo chain (house media → property cover → `/images/rocks-suite-enhanced.jpg` → illustration), 430 px, greeting with title + full name, house type as typed, Lusaka clock. **No check-out info.**
2. Wi-Fi card (never truncated), Your request card, 6 quick tiles (2 columns), "Something else?".
3. Request form without name/phone; delivery preference; plain copy.
4. My requests (stay-scoped), status screen (department only, one progress component, live), cancel.
5. House guide from GM-editable content; no hot tub.
6. States: unoccupied, invalid token, checked out ("Thanks for staying"), suspended (calm card).
7. Bottom nav with icons, safe-area, hide on input focus.
8. Typography/contrast pass; no monospace; ≥ 12 px; ≥ 44 px targets. Lighthouse targets.

## Agent D — Operations: Staff & GM (Wave 2)
1. Mobile layout per spec §3 (56 px header, tabs row, chips, filters).
2. Requests board: live timers, Confirm (no auto-assign), Assign (no founder), Start, Done, Cancel with reason, plain-text WhatsApp, **Archive** (GM only) + Archived filter, staff visibility rules.
3. **Live check-out strip** with countdown states (grey/amber/orange/red), overdue chime, Check out confirm flow, Tomorrow list.
4. Houses tab: cards, Check-in sheet (title, name, phone, date/time presets, keyboard-safe), Edit house incl. **photo upload** (compress ≤ 300 KB → `media`), formatted dates.
5. Team tab mobile cards; "Request new account" → WhatsApp founder.
6. Suspended read-only mode.
7. In-app alerts: chime, vibration, tab title count, red dot, optional screen wake lock. Push code behind `PUSH_ENABLED=false`.

## Agent E — Founder HQ (Wave 2)
1. Mobile header + ⋯ menu; no sideways scroll; accounts as cards on mobile.
2. Suspend/Resume with editable message + confirm; status pill; `suspendedAt/By`.
3. Accounts: dedupe, show-deactivated toggle, single role label, reset/deactivate/reactivate/change role & property.
4. Property settings incl. cover photo upload (same media flow) and phones.
5. Activity log (last 50 events) — write events from B/D actions to `activity/{id}`.

## Agent F — QR & Print (Wave 2)
1. Card per spec §6, property name from data, no token text.
2. Mobile-fitting preview; 300-dpi PNG; ZIP of active houses only; print only the card.
3. jsQR verification + fallback; automated decode test for each house.
4. Regenerate with confirmation; revoke old token.

## Agent G — QA (Wave 3, and continuously)
1. Implement every checkbox in `03-TEST-PLAN.md` as automated tests where possible.
2. One e2e test per persona journey in `02-PERSONAS.md` (two-page tests for guest + staff live sync).
3. Run on all 5 device projects; attach Playwright HTML report and screenshots at 390 px to REPORT.
4. File failures back to the owning agent with screenshot + steps.

## Agent H — Reviewer (Wave 3, gate for every merge)
1. Code review: readability, no dead code, no hard-coded names, no auto-deletes, no secrets, consistent use of `time.ts`/`config.ts`.
2. Security review against spec + rules tests.
3. UX review: walk each persona at 360 px and 390 px; flag jargon, clutter, tiny text, confusing flows, anything that "feels like a dev tool".
4. Writes `docs/go/REVIEW.md` with must-fix / should-fix / nice-to-have. Nothing merges with open must-fix items.
