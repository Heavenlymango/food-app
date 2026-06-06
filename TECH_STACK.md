# Technology Stack

A single reference for every technology used across the Campus Food Ordering
system, why it's there, and where it lives. Last updated **2026-06-04**.

Related docs:
- For the *reasoning* behind the big architectural choices (ML runtime,
  two-stage pipeline, Supabase, hosting): [`ARCHITECTURE.md`](ARCHITECTURE.md).
- For what changed recently (May + June 2026 sprints): [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md).
- For CI/CD: [`CI_CD_GUIDE.md`](CI_CD_GUIDE.md).
- For per-feature defense narration (messaging, reservations, promotions,
  notifications, health rules, etc.): [`FEATURE_NOTES.md`](FEATURE_NOTES.md).

---

## At a glance

| Layer | Technology |
| --- | --- |
| Web frontend | React 18 + TypeScript, Vite 6, Tailwind CSS v4 |
| Mobile app | Flutter 3 / Dart 3, on-device TFLite |
| UI components | Radix UI primitives (shadcn-style), lucide-react icons |
| Charts | recharts (web), fl_chart (Flutter) |
| Backend / DB | Supabase — Postgres + Auth + RLS + Storage |
| Server logic | Supabase Edge Functions (Deno + Hono) |
| ML inference (web) | Python + FastAPI + ONNX Runtime |
| ML inference (mobile) | tflite_flutter (on-device) |
| ML models | MobileNetV3 → YOLOv11-small (two-stage) |
| Testing | vitest (web), flutter_test (mobile) |
| CI/CD | GitHub Actions |
| Hosting | Vercel (web), Railway (inference), Supabase (DB), GitHub Releases (APK) |

---

## 1. Web frontend — `food_app/`

| Package | Version | Purpose |
| --- | --- | --- |
| `react` / `react-dom` | 18.3 | UI framework |
| TypeScript | (via Vite) | Type safety; build fails on type errors |
| `vite` | 6.3.5 | Dev server + production bundler |
| `@vitejs/plugin-react-swc` | 3.10 | Fast React transform (SWC) |
| `tailwindcss` | v4 | Utility-first styling |
| `@radix-ui/*` | various | Accessible headless UI primitives (dialog, popover, tabs, select, switch…) |
| `lucide-react` | 0.487 | Icon set |
| `recharts` | 2.15 | Seller analytics + nutrition dashboard charts |
| `sonner` | 2.0 | Toast notifications |
| `date-fns` | * | Date formatting in order views |
| `react-hook-form` | 7.55 | Form state |
| `@jsr/supabase__supabase-js` | 2.49 | Supabase client (auth + DB) |
| `onnxruntime-web` | 1.26 | (legacy/unused — WASM inference was abandoned, see ARCHITECTURE Decision 1) |
| `vitest` | 2.1 | Unit tests (`npm test`) |

**Scripts:** `npm run dev`, `npm run build`, `npm test`, `npm run test:watch`.

**Notable internal modules**
- `src/utils/healthClassification.ts` — rule-based healthy/unhealthy engine
  (8 rules, cited sources).
- `src/components/SellerAnalytics.tsx` — KPI cards + revenue/items/peak-hours charts.
- `src/components/NutritionDashboard.tsx` — student calorie/spend/healthy-split charts.
- `src/components/FAQ.tsx` — classification rules + references + AI-threshold rationale.
- `src/components/OrderTracker.tsx` — order list (sorted strictly by timestamp DESC).
- `src/utils/api.ts` — fetch wrapper that attaches the Supabase JWT,
  forces `cache: 'no-store'` on every GET, and auto-refreshes the session
  exactly once on 401 (throws `AuthExpiredError` if the refresh fails).

## 2. Mobile app — `food_app1_flutter/`

| Package | Version | Purpose |
| --- | --- | --- |
| Flutter / Dart | SDK ^3.11 | Cross-platform app framework |
| `provider` | ^6.0 | State management (auth, cart, orders, menu, notifications) |
| `supabase_flutter` | ^2.0 | Supabase client (auth + DB) |
| `http` | ^1.0 | Calls to Edge Functions + inference server |
| `tflite_flutter` | ^0.12 | On-device ML inference (no network needed) |
| `camera` | ^0.10 | Live camera for food scanning |
| `image_picker` | ^1.0 | Gallery image selection |
| `image` | ^4.0 | Decode/resize images before inference |
| `fl_chart` | ^0.68 | Seller analytics + nutrition dashboard charts |
| `url_launcher` | ^6.2 | Open FAQ source links in the browser |
| `intl` | ^0.19 | Date/number formatting |
| `cached_network_image` | ^3.0 | Menu image caching |
| `shimmer` | ^3.0 | Loading placeholders |
| `shared_preferences` | ^2.0 | Local key/value storage |
| `path_provider` | ^2.0 | File paths for temp images |
| `permission_handler` | ^11.0 | Camera/storage permissions |
| `crypto` | ^3.0 | SHA-256 (mirrors web auth hashing) |
| `flutter_test` | SDK | Unit tests (`flutter test`) |

**Notable internal modules**
- `lib/utils/health_classification.dart` — Dart mirror of the web classifier.
- `lib/services/food_recognition_service.dart` — two-stage TFLite pipeline.
- `lib/screens/dashboard/dashboard_screen.dart` — student nutrition dashboard.
- `lib/screens/seller/seller_dashboard_screen.dart` — seller dashboard incl. `_AnalyticsTab`.
- `lib/screens/faq/faq_screen.dart` — FAQ screen.

## 3. Backend & data — Supabase

| Piece | Tech | Notes |
| --- | --- | --- |
| Database | PostgreSQL (hosted) | Relational menu/order data |
| Auth | Supabase Auth (JWT) | Email + Telegram OTP flows |
| Access control | Row Level Security (RLS) | Students read only their own orders, etc. |
| Storage | Supabase Storage | Menu/item images |
| Server logic | Edge Functions (Deno runtime) | Framework: **Hono** |

**Main Edge Function:** `supabase/functions/make-server-36162e30/index.ts`
(routes for orders, seller/student order fetches, menu/promotions, auth OTP,
messaging, payment methods). Uses the **service-role key** server-side to
bypass RLS where needed (e.g. `/api/student/orders`).

**Key tables:** `menu_items`, `orders`, `order_items`, `shops`,
`item_discount_schedules`, `class_breaks`, `notifications`, `scan_reports`,
`food_nutrition_reference`, `order_status_history`.

**Schema migrations:** SQL files in `supabase/migrations/`, applied via
`supabase db push`. Each file is timestamped, idempotent
(`ADD COLUMN IF NOT EXISTS`), and tracked in
`supabase_migrations.schema_migrations` so they never re-run.

**Recent migrations:**
- `20260519_telegram_otp.sql` — Telegram OTP table for 2FA
- `20260523_order_items_rls.sql` — RLS policy on `order_items`
- `20260531_menu_badge_overrides.sql` — `hide_healthy_badge` +
  `hide_unhealthy_badge` columns on `menu_items`

## 4. Machine learning

| Piece | Tech |
| --- | --- |
| Server inference | Python 3.12, **FastAPI**, **uvicorn**, **ONNX Runtime** |
| On-device inference | **tflite_flutter** (Flutter) |
| Image handling | Pillow + NumPy (server), `image` package (Flutter) |
| Models | **MobileNetV3** (fast, 224×224) → **YOLOv11-small** (accurate, 640×640) |
| Training | PyTorch / Ultralytics |
| Format conversion | PyTorch → ONNX → TFLite (`onnx2tf`) |

**Pipeline:** MobileNet runs first; if top-1 confidence < **80%**, fall back to
YOLO. The 80% threshold rationale is documented in the in-app FAQ.

**Server file:** `inference_server.py` — `POST /recognize` (full pipeline),
`POST /yolo` (YOLO-only, used by the Flutter cloud fallback), `GET /health`.

## 5. Health classification (custom)

A rule engine (no library) that grades each menu item and cites published
nutrition sources. Lives in `src/utils/healthClassification.ts` (web) and
`lib/utils/health_classification.dart` (Flutter), kept in sync.

**Sources cited:** WHO Healthy Diet, UK FSA Traffic Light Labelling,
Nutri-Score (2024), NOVA classification (Monteiro et al. 2016), USDA Dietary
Guidelines 2020–2025, Harvard Healthy Eating Plate.

## 6. Testing

| Surface | Tool | Command | Coverage |
| --- | --- | --- | --- |
| Web | vitest | `npm test` | **21 tests** — health classifier rules, precedence, badges, source sanity |
| Mobile | flutter_test | `flutter test` | **22 tests** — same 21 mirrored in Dart + 1 widget smoke test |

**Total: 43 unit tests** gating both pipelines. Suite runs in ~2 seconds
on every push.

## 7. CI/CD — GitHub Actions

| Repo | Workflow | Trigger | Does |
| --- | --- | --- | --- |
| `food-app` (web) | `.github/workflows/deploy.yml` | push/PR to main | `npm ci` → `npm test` → `npm run build` → deploy Edge Functions / Vercel (main only) |
| `Food-app-apk` (Flutter) | `.github/workflows/ci.yml` | push/PR to main | `flutter analyze` → `flutter test` |
| `Food-app-apk` (Flutter) | `.github/workflows/build-release.yml` | tag `v*` | build APK → upload to GitHub Release |

Tests **gate** the build in both pipelines (a failing test blocks deploy/APK).

**Single source of truth (June 2026 fix):** the web workflow used to copy
a legacy `.tsx` server file over the live `.ts` deployable before each
deploy, silently regressing the function on every push. That step was
removed; the deployable file at
`supabase/functions/make-server-36162e30/index.ts` is now the only path
CI deploys from. See [`CI_CD_GUIDE.md`](CI_CD_GUIDE.md) §1.5 for the
full story.

## 8. Hosting / deployment

| Component | Platform | Why |
| --- | --- | --- |
| Web app | **Vercel** | Native Vite support, env vars, PR previews |
| Inference server | **Railway** | Persistent container (no cold-start sleep) |
| Database/Auth/Storage | **Supabase** | Managed Postgres + RLS |
| Android APK | **GitHub Releases** | Tag-triggered CI build & publish |

> For day-to-day mobile work the APK pipeline isn't needed — run
> `flutter run` against an emulator/VM (debug mode, hot reload).

## 9. Repositories

| Repo | Contents |
| --- | --- |
| `github.com/Heavenlymango/food-app` | Web app, Edge Functions, inference server, docs |
| `github.com/Heavenlymango/Food-app-apk` | Flutter mobile app |

---

## Languages summary

- **TypeScript / TSX** — web app
- **Dart** — Flutter app
- **Python** — ML training + inference server
- **SQL** — Supabase schema & migrations
- **TypeScript (Deno)** — Edge Functions
- **YAML** — CI/CD workflows

## What is NOT used (and why)

- **Streamlit** — analytics are embedded in the apps (recharts/fl_chart), not a
  separate Python dashboard. Streamlit would only suit a future *internal*
  admin/research tool, not the customer-facing dashboards.
- **onnxruntime-web (WASM)** — abandoned due to `SharedArrayBuffer` browser
  restrictions; replaced by the FastAPI server (see ARCHITECTURE Decision 1).
- **Roboflow** — removed; the model is trained locally, not hosted there.
- **Firebase** — Supabase chosen for relational (SQL) menu/order data.
