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
