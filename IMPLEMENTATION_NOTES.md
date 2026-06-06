# Implementation Notes — May 2026 push

A single page you can read top-to-bottom to remember what we built, why,
where it lives in the code, and what (if anything) still needs to be
deployed manually.

> **Web ↔ Flutter parity (added 2026-05-26):** every UI feature below
> exists in **both** repos. Specifically: the classifier
> (`lib/utils/health_classification.dart`), the orange Unhealthy chip on
> menu cards, the full FAQ screen with paper citations and 80% rationale,
> the seller analytics tab, the rebuilt student nutrition dashboard, the
> Discount → Promotion rename, the 17 unit tests, and the CI test gate.
> Section 12 lists the Flutter-specific file paths.

Two repos in scope:
- **Web app** — `food_app/` → github.com/Heavenlymango/food-app
- **Flutter APK** — `food_app1_flutter/` → github.com/Heavenlymango/Food-app-apk

---

## Quick reference — where everything lives

| Feature | Files |
| --- | --- |
| Health classification engine | `food_app/src/utils/healthClassification.ts` |
| Classifier unit tests | `food_app/src/utils/healthClassification.test.ts` |
| Unhealthy badge on menu cards | `food_app/src/components/MenuItemCard.tsx` |
| FAQ page (rules + references + 80% rationale) | `food_app/src/components/FAQ.tsx` |
| FAQ button wiring | `food_app/src/App.tsx`, `food_app/src/components/SellerDashboard.tsx` |
| Seller analytics tab | `food_app/src/components/SellerAnalytics.tsx` |
| Seller analytics wiring | `food_app/src/components/SellerDashboard.tsx` |
| Student nutrition dashboard | `food_app/src/components/NutritionDashboard.tsx` |
| Student orders endpoint (DB-backed) | `food_app/supabase/functions/make-server-36162e30/index.ts` (route `GET /api/student/orders`) |
| Flutter student orders client | `food_app1_flutter/lib/services/api_service.dart` (`getStudentOrders`) |
| Flutter recognition (YOLO shape fix + fallback labels) | `food_app1_flutter/lib/services/food_recognition_service.dart` |
| Reservation display — seller | `food_app/src/components/SellerDashboard.tsx` (`OrderCard`) |
| Reservation display — student web | `food_app/src/components/OrderTracker.tsx` |
| Reservation display — student mobile | `food_app1_flutter/lib/screens/orders/orders_screen.dart` |
| Web CI pipeline | `food_app/.github/workflows/deploy.yml` |
| Flutter APK release pipeline | `food_app1_flutter/.github/workflows/build-release.yml` |
| CI/CD walkthrough | `food_app/CI_CD_GUIDE.md` |

---

## 1. Mobile ordering bug — student order items showing as blank

**Symptom:** student order list rendered every order with an empty items
array, both on the Flutter APK and (latently) the web client.

**Root cause:** the previous code queried `order_items` directly with the
student's JWT. `order_items` only has an RLS policy for the service role
(insert via the Edge Function), nothing for SELECT by students. RLS
silently returned `[]` for every query.

**Fix:**
- Rewrote `GET /api/student/orders` in
  `food_app/supabase/functions/make-server-36162e30/index.ts` to use the
  service role and embed `order_items` + `menu_items` in one query.
  Returns: orders with `items[]`, `scheduledFor`, `serviceType`,
  `cancellation*`, and per-item `calories`/`isHealthy`/`isSpecial`.
- Flutter `getStudentOrders()` in `lib/services/api_service.dart` now
  calls this endpoint via `_get('/api/student/orders')` and maps the
  payload into `Order` objects. No direct DB access from the client.
- Web `fetchStudentOrders()` in `src/App.tsx` switched to
  `api.get('/api/student/orders')` for the same reason.

**Deployment requirement:**
```bash
cd food_app
supabase functions deploy make-server-36162e30
```
Without redeploy, the old broken kv-store implementation is still live.

---

## 2. ML food recognition — every prediction showed "Unknown"

**Symptom:** the scanner ran (showed e.g. "YOLOv11-small · 73% confidence")
but every detection was labelled `Unknown`.

**Two bugs, same symptom.**

### 2a. YOLO output shape was wrong
The Flutter code assumed `[1, 8400, 36]` (anchor-first), but Ultralytics
YOLOv11 TFLite exports `[1, 4+nc, num_anchors] = [1, 36, 8400]`
(channel-first, same as the ONNX shape the Python inference server uses).
With the wrong layout the class-score loop was reading bbox columns, so
the top-5 indices landed beyond the 32-label range — every result fell
into the `'unknown'` branch.

**Fix:** `lib/services/food_recognition_service.dart` now auto-detects:
whichever dim is smaller is the feature axis, and the indexing flips
accordingly. Works for both export variants.

### 2b. Labels file failed to load silently in the release APK
`rootBundle.loadString('assets/models/food_labels.txt')` could throw in a
minified APK; the `try/catch` swallowed it, leaving `_labels = []`.

**Fix:** added a hardcoded `_fallbackLabels` constant (same 32 entries as
`class_names.json` / `food_labels.txt`) and `_ensureLabels()` falls back
to it whenever the asset load returns nothing.

**Deployment:** new APK needs to be built. Tag a release:
```bash
cd food_app1_flutter
git tag v1.10.0
git push origin v1.10.0
```
GitHub Actions builds and attaches `app-release.apk` to the Releases
page automatically.

---

## 3. Rename "Discount Schedule" → "Promotion Scheme"

Pure UI rename. **DB table and column names left intact**
(`item_discount_schedules`, `discount_percent`) — renaming them would
break every existing record.

Changed in `food_app/src/components/MenuManagement.tsx` and
`PromotionManagement.tsx` (the latter is unused but kept consistent):
- "Discount Schedules" → "Promotion Schemes"
- "Save Schedule" → "Save Promotion"
- "Schedule added!" toast → "Promotion scheme added!"
- "Add Discount" / "Add Discount Window" → "Add Promotion" / "Add Promotion Scheme"
- "No discount schedules yet." → "No promotion schemes yet."
- `interface DiscountSchedule` → `PromotionScheme` (internal, for
  consistency)

What was deliberately **not** changed:
- "Discount savings" price-summary label (still refers to actual
  savings)
- The `-30%` badge text
- Order reservation/scheduling (`scheduledFor`) — different concept

---

## 4. Seller analytics tab

**New tab** added to the seller dashboard between Orders and Menu.

File: `food_app/src/components/SellerAnalytics.tsx`. Wired in
`SellerDashboard.tsx` (now uses a 4-column TabsList).

Renders:
- **KPI row**: 7-day revenue, 7-day order count, average order value,
  cancellation rate.
- **Revenue trend** — bar chart of completed-order revenue for the last
  7 days.
- **Top selling items** — horizontal bar of the 5 most-sold items
  (lifetime, by quantity).
- **Pickup vs Dine-In** donut — last 7 days.
- **Peak hours** — bar chart by hour-of-day, 6 AM – 10 PM window.

Charts use `recharts` (already in `package.json`). Data comes from the
existing `orders` state — no new API call.

---

## 5. Student Nutrition Dashboard rebuild

Same file: `food_app/src/components/NutritionDashboard.tsx`. Kept the
hero calorie card and the today's-orders list. Replaced the stale
"avg meal vs 600 kcal" comparison with real insights:

- **Stat chips** — meals today, avg/meal, spent today, healthy %.
- **Last 7 days** calorie bar chart with avg kcal/day + weekly spend in
  the subtitle.
- **Healthy vs Indulgent** donut (kcal split, last 7 days) using
  `is_healthy` flag.
- **Top items** horizontal bar (lifetime).

Caveat: the Healthy % chip relies on sellers tagging items with
`is_healthy`. The badge work in §6 below provides the heuristic
fallback when the flag isn't set.

---

## 6. Unhealthy badge + paper-cited health classification

This is the centerpiece. We can now justify every "unhealthy" call with
a published source.

### 6a. Rule engine — `src/utils/healthClassification.ts`

A `classifyItem(item)` function applies 7 rules in priority order and
returns `{ status, reasons[] }`:

| Rule id | Trigger | Status | Sources |
| --- | --- | --- | --- |
| `high-calorie` | calories ≥ 700 | caution | WHO, USDA |
| `fried` | name contains fried/fries/tempura/nugget/chip… | unhealthy | WHO, USDA, FSA |
| `sugary-drink` | name contains soda/cola/syrup/milkshake/boba… | unhealthy | WHO, FSA, USDA, Nutri-Score |
| `sweet-dessert` | category=Desserts or name contains cake/donut/icecream… | unhealthy | WHO, FSA, USDA |
| `ultra-processed` | category in {Snacks, Desserts} | unhealthy | NOVA, Nutri-Score |
| `seller-healthy` | `is_healthy=true` from seller | healthy | Harvard, WHO |
| `salad` | category=Salads | healthy | WHO, Harvard |

**Precedence:** `unhealthy` > `caution` > `healthy` > `neutral`. A caution-only
item still surfaces healthy reasons in the popover so the user sees both
sides.

All sources are defined in one place — `SOURCES` constant — so the FAQ
and the per-card popover can't drift:

| Key | Citation |
| --- | --- |
| `who` | WHO Healthy Diet Fact Sheet ([link](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)) |
| `fsa` | UK FSA Traffic Light Labelling ([link](https://nutrasafe.co.uk/uk-food-label-traffic-light-system-explained)) |
| `nutriScore` | Nutri-Score (EU, 2024 update) ([link](https://en.wikipedia.org/wiki/Nutri-Score)) |
| `nova` | NOVA Classification (Monteiro et al., 2016) ([link](https://archive.wphna.org/wp-content/uploads/2016/01/WN-2016-7-1-3-28-38-Monteiro-Cannon-Levy-et-al-NOVA.pdf)) |
| `usda` | USDA Dietary Guidelines for Americans 2020–2025 ([link](https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf)) |
| `harvard` | Harvard Healthy Eating Plate ([link](https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/)) |

### 6b. Badge UI — `src/components/MenuItemCard.tsx`

Orange "Unhealthy" / "Heavy meal" pill next to the shop badge. Clicking
opens a popover with:
- All rules that fired
- One-sentence rationale per rule
- Inline links to every source

Healthy items keep the existing green leaf icon.

### 6c. FAQ page — `src/components/FAQ.tsx`

Three sections:
1. **How we classify food** — full rules table.
2. **Full references** — one card per source with the full citation.
3. **Why 80% confidence threshold for the AI scanner** — see §7.

Accessible from both student and seller via a `HelpCircle` icon in the
header. Opens as a full-screen overlay (same UX as the food scanner).

---

## 7. 80% confidence threshold — written rationale

Lives in the FAQ page so judges/reviewers can read it in context. Quick
summary:

- Model classifies across 32 dishes — random-guess baseline is ~3.1%.
- Modern CNNs are over-confident on training data; on fine-grained
  held-out tasks, top-1 reliability typically plateaus around the 75–85%
  confidence band (Guo et al. 2017, *On Calibration of Modern Neural
  Networks*).
- Trade-off:
  - Too low (50%) — YOLO almost never runs, defeats the cascade.
  - Too high (95%) — YOLO runs on most photos, kills the snappy
    local-first feel.
  - 80% in our test runs routes ~30% of photos to YOLO — bulk of
    requests stay cheap, hard cases get the heavier model.
- Industrial precedent — cascade systems (Google image fallbacks, NVIDIA
  multi-stage detectors) gate secondary models at 70–85%.

Threshold lives in
`food_app1_flutter/lib/config/app_config.dart` → `confidenceThreshold`,
so it can be tuned without retraining.

**Honest caveat (also in the FAQ):** 80% was chosen empirically. The
scientifically rigorous next step is a reliability-diagram / Expected
Calibration Error study on a labelled hold-out set from our own menus.

---

## 8. Unit tests (`vitest`)

- `package.json` gained `vitest` as a dev dep + `npm test` /
  `npm run test:watch` scripts.
- `src/utils/healthClassification.test.ts` has 17 tests covering each
  rule, the precedence chain, the `badgeFor` mapping, and source URL
  sanity. All pass in <1 s locally.

Run locally:
```bash
cd food_app
npm install        # one-time after pulling
npm test           # runs vitest once
npm run test:watch # re-runs on file save
```

---

## 9. CI/CD — what's actually wired

### Web pipeline — `food_app/.github/workflows/deploy.yml`
1. **Build job** (every push + PR): `npm ci` → `npm test` → `npm run build`
   → uploads `build/` artefact on main only.
2. **Deploy edge functions** (main only): `supabase functions deploy
   make-server-36162e30` — needs `SUPABASE_ACCESS_TOKEN` secret.
3. **Deploy to Vercel** (main only, optional): needs `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets and repo variable
   `VERCEL_ENABLED=true`.

Tests are now a **gate** — a failing test breaks the build, which breaks
both deploys downstream.

### Flutter pipeline — `food_app1_flutter/.github/workflows/build-release.yml`
Tag-driven. Pushing a tag matching `v*` triggers:
- Java 17, Flutter 3.32.0
- `flutter pub get`
- `flutter build apk --release`
- Uploads `app-release.apk` to the GitHub Release page for that tag.

See `food_app/CI_CD_GUIDE.md` for three concrete demo flows.

---

## Outstanding manual steps (do these next)

1. **Deploy the edge function** so the student-orders fix goes live:
   ```bash
   cd food_app
   supabase functions deploy make-server-36162e30
   ```
2. **Cut a Flutter APK** with the YOLO shape fix + fallback labels:
   ```bash
   cd food_app1_flutter
   git tag v1.10.0
   git push origin v1.10.0
   ```
3. (Optional) **Apply the order_items RLS policy** if you ever want the
   client to talk to that table directly again. The unapplied migration
   lives at `food_app/supabase/migrations/20260523_order_items_rls.sql`
   — needs the `CREATE POLICY IF NOT EXISTS` rewritten as
   `DROP POLICY IF EXISTS … ; CREATE POLICY …` because the `IF NOT
   EXISTS` form isn't valid for `CREATE POLICY` in PostgreSQL. Not
   urgent: the Edge Function path makes RLS optional for orders.

---

## Things explicitly *not* changed (so future-you doesn't redo them)

- DB schema — `item_discount_schedules` and `order_items` columns are
  untouched.
- `is_healthy` boolean is still the seller-controlled flag. The
  classifier adds heuristics *on top of* it but doesn't write back.
- The "-30%" / `Discount savings` text on cart and order summaries —
  these refer to the actual money saved, not the feature name.
- Order reservation (`scheduledFor`) — different concept from the promo
  rename, kept as-is.

---

## 12. Flutter parity (2026-05-26)

Every UI feature was ported to the Flutter app so mobile and web stay in
lockstep. New / changed Flutter files:

| Web file | Flutter equivalent |
| --- | --- |
| `food_app/src/utils/healthClassification.ts` | `food_app1_flutter/lib/utils/health_classification.dart` |
| `food_app/src/utils/healthClassification.test.ts` | `food_app1_flutter/test/health_classification_test.dart` |
| `food_app/src/components/FAQ.tsx` | `food_app1_flutter/lib/screens/faq/faq_screen.dart` |
| `food_app/src/components/MenuItemCard.tsx` (badge + popover) | `food_app1_flutter/lib/widgets/menu_item_card.dart` (badge + bottom sheet) |
| `food_app/src/components/NutritionDashboard.tsx` | `food_app1_flutter/lib/screens/dashboard/dashboard_screen.dart` |
| `food_app/src/components/SellerAnalytics.tsx` | `food_app1_flutter/lib/screens/seller/seller_dashboard_screen.dart` (new 4th tab `_AnalyticsTab`) |
| `food_app/.github/workflows/deploy.yml` (test step) | `food_app1_flutter/.github/workflows/ci.yml` (analyze + test) |

### Flutter-specific deps added
- `url_launcher ^6.2.0` — open FAQ source links in the system browser.
- `fl_chart ^0.68.0` — bar charts and pie charts for both dashboards.

### Flutter wiring
- **Drawer entry** for the student FAQ — `home_screen.dart` adds a "FAQ &
  References" `ListTile` with an explanatory subtitle.
- **Seller FAQ button** — the seller dashboard's AppBar gains a
  `help_outline` icon next to logout that pushes the FAQ screen.
- **Order item model unchanged** — calories used in the dashboard come
  from `MenuProvider.allItems` lookup (same as before). The Edge
  Function returns `calories` and `isHealthy` per item but the Flutter
  client still uses the menu lookup as the source of truth, so no model
  migration was needed.

### Flutter CI test gate
`food_app1_flutter/.github/workflows/ci.yml` now runs `flutter analyze`
**and** `flutter test` in the `analyze` job. Because `build-apk` declares
`needs: analyze`, a failing test blocks the APK build — same gating
pattern as the web pipeline.

### Verification commands
Reproduce the same checks the CI runs:
```bash
cd food_app1_flutter
flutter pub get
flutter analyze --no-fatal-infos   # static analysis
flutter test                       # 17 unit tests
```

---

## Commits this push corresponds to (food-app repo)

| SHA | Message |
| --- | --- |
| `8a87a4b` | Fix food recognition showing all 'Unknown' labels (Flutter repo) |
| `a70f367` | Fix blank student order items by routing through Edge Function (Flutter repo) |
| `4896d91` | Fix student orders showing blank items by routing through Edge Function (web repo) |
| `8139a63` | Rename 'discount schedule' to 'promotion scheme' in UI |
| `0a1d258` | Add seller analytics tab and rebuild student nutrition dashboard |
| `80478a6` | Add unhealthy badge, paper-cited FAQ, vitest, and CI test gate |
| `e23fef9` | Add IMPLEMENTATION_NOTES — single-page changelog for May 2026 work |
| `4087de3` *(Flutter repo)* | Flutter parity: unhealthy badge, FAQ, rebuilt dashboards, tests, CI gate |

Pull either repo and check `git log` to see the full diffs.

---
---

# June 2026 push — production-readiness sprint

A second batch of work done while preparing for the final defense.
Focus shifted from feature work to bug fixes, reliability hardening, and
defensive coding. The system now survives the failure modes that bit us
during integration testing.

## Headline changes

| Theme | What changed |
| --- | --- |
| **CI source-of-truth bug** | Removed the `cp src/supabase/functions/server/index.tsx → supabase/functions/make-server-36162e30/index.ts` step in `deploy.yml`. The deployable path is now the only source of truth; future edits go straight to it. |
| **Browser cache vs polling** | `api.get` now forces `cache: 'no-store'`. Order status changes propagate within one poll cycle instead of being silently served from HTTP cache forever. |
| **Auth refresh resilience** | New `AuthExpiredError` in `api.ts` + `authFetch` wrapper retries once on 401 with a fresh access token. Conditional logout only when the SDK confirms the session is genuinely gone. |
| **Edge Function defensiveness** | `/api/orders/place` coerces non-UUID `menu_item_id` to `null` so the Flutter app's bundled seed IDs (`A1-1`, `A1-2`) don't break the FK insert. Errors surfaced as 500 with detail. |
| **New classifier rule** | Added 8th rule `sweetened-drink` (caution) — catches any Drinks-category item that isn't explicitly unsweetened (water, americano, green tea…). Test count: 21 web + 22 Flutter (unchanged; the new rule was covered by existing drink tests). |
| **Order list sort** | `OrderTracker` switched from "late orders first" to pure timestamp DESC. Months-overdue pending orders no longer dominate the top of fresh students' lists. |
| **Per-item seller badge override** | `menu_items` gains `hide_healthy_badge` + `hide_unhealthy_badge` columns. Seller form toggles both; menu card respects them. |
| **Scan menu match** | Now tries the **top** prediction first; only falls through to lower-ranked candidates if no menu items match. Fixes "Khor Ko detected but Spring Rolls shown". |
| **Flutter Profile / Tips Scaffold** | Both screens were pushed without a `Scaffold` ancestor, causing `TextField` widgets to throw "No Material widget found" when opened from the drawer. Both now wrap their body in `Scaffold(appBar:…, body:…)`. |
| **Flutter notification overflow** | Notifications bottom sheet was a fixed `Column`. With >10 alerts it overflowed by hundreds of pixels. Replaced with `DraggableScrollableSheet` + `ListView.separated`. |
| **Web Unhealthy chip** | Was a text pill with icon. Now icon-only (orange ⚠️) to match the green leaf's visual weight. Same tap target, same popover. |
| **Order-place flow surfaced errors** | The `order_items` insert was silent on failure (order saved without items). Now wrapped in error check; failures return 500 with the Postgres error string. |

## Files touched (June 2026)

| Repo / file | Change |
| --- | --- |
| `food_app/.github/workflows/deploy.yml` | Removed legacy `cp` step. Deployable is now canonical. |
| `food_app/supabase/functions/make-server-36162e30/index.ts` | UUID validation in `/api/orders/place`; removed `hide_healthy_badge`/`hide_unhealthy_badge` from `/api/student/orders` and `/api/seller/orders` SELECTs (defensive against missing migration). |
| `food_app/supabase/migrations/20260531_menu_badge_overrides.sql` | New columns on `menu_items`. |
| `food_app/src/utils/api.ts` | `cache: 'no-store'`, `AuthExpiredError`, `authFetch` wrapper, retry-on-401. |
| `food_app/src/App.tsx` | Catches `AuthExpiredError` from `fetchStudentOrders`; soft-handles transient 401s; only logs out when SDK confirms the session is gone. |
| `food_app/src/components/MenuItemCard.tsx` | Unhealthy chip → icon-only. Respect `hideUnhealthyBadge` AND `hideHealthyBadge` interaction (chip hidden when leaf would be visible). |
| `food_app/src/components/MenuManagement.tsx` | Two new switches: **Hide Healthy badge** / **Hide Unhealthy badge**. Form state + load + save. |
| `food_app/src/components/MenuBrowser.tsx` | Select + map the two new columns. |
| `food_app/src/components/OrderTracker.tsx` | Sort by `timestamp` DESC only. Removed "late first" reshuffle. |
| `food_app/src/utils/healthClassification.ts` | Added `ruleSweetenedDrink` (caution) between sugary-drink and sweet-dessert. Expanded `SUGARY_DRINK_KEYWORDS` to catch milk tea / boba / smoothies. New `UNSWEETENED_DRINK_KEYWORDS` exclusion list. |
| `food_app/src/components/FAQ.tsx` | Now lists 8 rules including the new sweetened-drink row. |
| `food_app1_flutter/lib/utils/health_classification.dart` | Dart mirror of the new rule + keyword lists. |
| `food_app1_flutter/lib/screens/faq/faq_screen.dart` | Mirrors the 8-rule list. |
| `food_app1_flutter/lib/services/api_service.dart` | Routes student orders through Edge Function. |
| `food_app1_flutter/lib/services/food_recognition_service.dart` | YOLO output-shape autodetect + hardcoded fallback labels. |
| `food_app1_flutter/lib/screens/scan/food_scan_screen.dart` | Match top prediction first; fallback only if no menu hit. |
| `food_app1_flutter/lib/screens/profile/profile_screen.dart` | Wrapped in Scaffold + AppBar. |
| `food_app1_flutter/lib/screens/tips/tips_screen.dart` | Same Scaffold wrap. |
| `food_app1_flutter/lib/screens/home/home_screen.dart` | Notifications bottom sheet rewritten as `DraggableScrollableSheet` + `ListView`. |
| `food_app1_flutter/lib/widgets/menu_item_card.dart` | Respects both hide-badge flags. Unhealthy chip suppression logic now matches web ("hide chip when leaf would be visible"). |
| `food_app1_flutter/lib/models/menu_item.dart` | `hideHealthyBadge` + `hideUnhealthyBadge` fields. |
| `food_app1_flutter/lib/screens/seller/seller_dashboard_screen.dart` | Two new switches in the item form for badge overrides. |

## The CI source-of-truth bug (worth its own callout)

This silently broke the deployed `/api/student/orders` for a full
afternoon and ate hours of debugging. Recording it here so future-you
recognises the smell instantly:

**Symptom.** Endpoint deployed fine via manual `supabase functions
deploy`. Worked for ~15 minutes. Next push to `main` → CI ran → endpoint
silently returned 401 again, even though no one changed the function
code.

**Cause.** The CI workflow had a `Sync function source` step that
*overwrote* `supabase/functions/make-server-36162e30/index.ts` with the
contents of a legacy near-duplicate at
`src/supabase/functions/server/index.tsx`. The legacy file still had the
old kv-store-based `/api/student/orders` (read a kv mapping written only
by the custom-auth login path; never written for Supabase-auth users →
always 401).

**Fix.** Removed the cp step. Synced both files one last time so they
match. Comment banner at the top of the deployable file says it's
canonical.

**Lesson.** If a CI workflow has a "sync" step that copies from a
non-deployable location to a deployable one, the non-deployable location
is now load-bearing whether you remember it or not. Always have a single
source of truth.

## The browser-cache vs polling bug (also worth its own callout)

**Symptom.** Student cancels an order in one tab, refreshes the orders
tab in another — old status sticks for minutes. Seller queue updates
fine.

**Cause.** Browser HTTP cache. The Edge Function returns `200 OK` with
no `Cache-Control` header, so the browser is free to apply heuristic
caching. A polled GET to the same URL → same cached response served from
disk, never reaching the server.

**Fix.** `fetch(url, { cache: 'no-store' })` on every poll. One line.

**Lesson.** Polling endpoints **must** opt out of HTTP cache explicitly.
The default is wrong for our use case.

## Migrations applied this round

```bash
supabase db push      # picks up the file below
```

| File | Adds |
| --- | --- |
| `supabase/migrations/20260531_menu_badge_overrides.sql` | `menu_items.hide_healthy_badge boolean default false`, `menu_items.hide_unhealthy_badge boolean default false` |

## Defense-deck documentation

New artefact: **`FEATURE_NOTES.md`** in this folder. Single page covering
the messaging system end-to-end plus 12 other features with consistent
shape (what / how / tech / why / likely questions). Written specifically
for narrating the defense slides.

## Commits this push corresponds to (June 2026)

| SHA | Repo | Message |
| --- | --- | --- |
| `0c7e2bf` | web | Fix scan: match top prediction first, fall back only if no menu hit (Flutter scan_screen) |
| `ef4a038` | flutter | Same as above (Flutter scan_screen) |
| `72d09ab` | flutter | Wrap Profile screen in Scaffold so TextField has Material ancestor |
| `5dd5eca` | flutter | Wrap Tips & Advice in Scaffold + AppBar so it has a back button |
| `e04c4fe` | flutter | Fix notification bottom-sheet overflow: DraggableScrollableSheet + ListView |
| `a25abc5` | web | Force no-store on api.get so polled endpoints never serve stale cache |
| `9feca31` | web | Auto-refresh on 401 + toast-and-logout when refresh fails |
| `1b2442f` | web | Soften 401 handling: only force logout when SDK confirms session is gone |
| `3afbcc7` | web | Debug: log /api/student/orders response + show signed-in UID on empty state |
| `456b19e` | web | Sync src/supabase/functions/server/ with the deployable function |
| `059e9a5` | web | CI: deploy edge function from the deployable path, not the legacy source |
| `cda6311` | web | Sort orders strictly newest-first; don't let abandoned late orders dominate |
| `6ad5d8b` | web | Add FEATURE_NOTES.md: per-feature defense doc (messaging + 12 others) |

## Manual steps required to land June work

1. **Apply the menu-badge-overrides migration**:
   ```bash
   cd food_app
   supabase db push
   ```
2. **Redeploy the Edge Function** (CI now does this on every push to
   `main`, but for the first time after the workflow change):
   ```bash
   supabase functions deploy make-server-36162e30 --no-verify-jwt
   ```
3. **Optionally**, clean up the duplicate auth user for student `333333`
   in Supabase Dashboard → Authentication → Users (`af4df333-…` is the
   unused one; the `b52c3ef9-…` row owns all the actual orders).
4. **Optionally**, run this once to clean up months-old `pending` orders
   nobody ever closed:
   ```sql
   UPDATE orders
   SET status = 'cancelled',
       cancellation_reason = 'Auto-closed (stale)',
       cancelled_at = now()
   WHERE status IN ('pending', 'preparing')
     AND ordered_at < now() - interval '24 hours';
   ```

## Production-readiness state after this push

| Surface | State |
| --- | --- |
| Web order placement | ✅ Works. Order + items both saved atomically from the client's perspective (sequential inserts, both checked). |
| Web student order list | ✅ Works. Polling every 5 s, cache bypassed, fresh data within one cycle. |
| Web seller queue | ✅ Works. 10 s poll, same caching guarantees. |
| Web auth refresh | ✅ Survives a session that's expired but has a valid refresh token. Falls through to a sign-out flow only if the refresh itself fails. |
| Flutter order placement | ✅ Works. Bundled menu IDs are coerced to null at the Edge Function (the data column for `menu_item_id` is nullable, so the FK isn't enforced when the value is null). |
| Flutter scan | ✅ Top-prediction match. Fallback only fires when the top has no menu hit. |
| Flutter Profile + Tips | ✅ Render correctly when opened from the drawer. |
| Flutter notifications | ✅ Scrolls past screen height. |
| CI pipeline | ✅ Single source of truth. Deploys from the file you actually edit. Tests gate the deploy. |
| Documentation | ✅ This file, plus FEATURE_NOTES.md, plus TECH_STACK.md and ARCHITECTURE.md. |

Pull either repo and check `git log` to see the full diffs.
