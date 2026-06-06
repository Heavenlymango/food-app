# Database — schema, integrity, security

Comprehensive reference for the PostgreSQL schema running on Supabase.
Aimed at backend examiners: every table, every column, every FK,
constraint, enum, index, and RLS policy is documented here. Last updated
**2026-06-04**.

Related docs:
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — *why* Supabase + RLS
- [`TECH_STACK.md`](TECH_STACK.md) — tooling around the DB
- [`FEATURE_NOTES.md`](FEATURE_NOTES.md) — feature-by-feature DB usage

---

## At a glance

- **Engine**: PostgreSQL 15 (Supabase-managed)
- **Extensions enabled**: `uuid-ossp` (UUID generation), `pg_trgm` (fuzzy
  menu search)
- **Tables**: 21 application tables in `public.` + Supabase's own
  `auth.users`
- **Normalisation**: 3NF, with one deliberate snapshot exception
  (`order_items.item_name` + `unit_price`) for historical-order
  immutability
- **Primary keys**: UUIDs everywhere except enum-key text columns
  (`shops.shop_code`)
- **Timestamps**: every table has `created_at`; mutable tables also have
  `updated_at` (maintained by trigger)
- **Soft delete**: not used. Hard delete with `ON DELETE CASCADE` /
  `SET NULL` declared per relationship
- **Migrations**: timestamped SQL files in `supabase/migrations/`,
  applied via `supabase db push`

---

## Quick navigation

| Domain | Tables |
| --- | --- |
| **Identity** | `users`, `auth.users` (Supabase-managed), `telegram_otp` |
| **Shops & menu** | `shops`, `menu_categories`, `menu_items`, `menu_item_addons`, `item_daily_stock`, `item_discount_schedules`, `shop_operating_hours`, `shop_closures`, `shop_announcements` |
| **Orders** | `orders`, `order_items`, `order_status_history` |
| **Communication** | `messages`, `notifications` |
| **Reviews & prefs** | `reviews`, `user_preferences` |
| **Analytics** | `shop_statistics` |
| **AI / nutrition** | `scan_reports`, `food_nutrition_reference` |
| **Reservations** | `class_break_schedules` |

---

## 1. Identity

### `users`

Mirrors Supabase's `auth.users` with app-specific columns. The row is
created on signup by trigger; deletion cascades through every owner
relationship.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | UUID | **PK**, default `uuid_generate_v4()` | Matches `auth.users.id` |
| `email` | VARCHAR(255) | UNIQUE, nullable | Optional — students can register with `student_id` only |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt-hashed by Supabase Auth |
| `role` | VARCHAR(20) | NOT NULL, CHECK `('student','seller','admin')` | Read in RLS policies |
| `name` | VARCHAR(255) | NOT NULL | |
| `student_id` | VARCHAR(50) | UNIQUE | E.g. `'333333'` |
| `phone`, `avatar_url`, `is_active`, `created_at`, `updated_at` | … | | |

### `telegram_otp`

Stores in-flight OTP verification tokens for the Telegram-based 2FA
flow.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users(id)` ON DELETE CASCADE | |
| `verify_token` | TEXT UNIQUE | Random one-time use |
| `telegram_chat_id` | BIGINT | Telegram-side identifier |
| `otp_code` | TEXT | Six-digit code |
| `expires_at` | TIMESTAMPTZ | Server-rejects after this |
| `verified` | BOOLEAN default false | |

**RLS:** Users read their own rows only. Edge Functions write via service
role.

---

## 2. Shops & menu

### `shops`

Vendor records. One row per stall.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | UUID | **PK** | |
| `shop_code` | VARCHAR(50) | UNIQUE, NOT NULL | Short code — `A1`, `IFL-NC`. Used as login |
| `name`, `description`, `location` | text | | |
| `campus` | VARCHAR(50) | CHECK `('RUPP','IFL')` | |
| `category` | VARCHAR(50) | | `'Khmer'`, `'Drinks'`, … |
| `owner_id` | UUID FK → `users(id)` ON DELETE SET NULL | | |
| `is_active` / `is_open` | BOOLEAN | | Soft toggles |
| `accepts_preorders`, `min_order_amount`, `estimated_prep_time` | … | | |
| `rating` | DECIMAL(3,2) | CHECK `BETWEEN 0 AND 5` | Maintained by review trigger |
| `discount_percent` | INT | | Shop-wide flat discount (overlay above promo schemes) |
| `total_orders`, `total_reviews` | INTEGER | | Maintained by triggers |

### `menu_categories`

Seller-defined groupings within a shop.

| Column | Type | Notes |
| --- | --- | --- |
| `shop_id` | FK → `shops` ON DELETE CASCADE | |
| `name`, `description`, `sort_order`, `is_active` | … | |
| Unique key | `(shop_id, name)` | |

### `menu_items`

The catalogue. **17 columns** now after the June badge-override migration.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | UUID PK | | |
| `shop_id` | FK → `shops` ON DELETE CASCADE | NOT NULL | |
| `category_id` | FK → `menu_categories` ON DELETE SET NULL | | |
| `name` | VARCHAR(255) | NOT NULL | |
| `name_khmer` | VARCHAR(255) | | Localised name |
| `description` | TEXT | | |
| `price` | DECIMAL(10,2) | CHECK `>= 0` | |
| `discount_percent` | DECIMAL(5,2) | CHECK `BETWEEN 0 AND 100`, default 0 | Per-item flat discount |
| `calories` | INTEGER | | kcal per serving |
| `health_tags` | TEXT[] | default `'{}'` | `['vegetarian','halal','gluten-free']` |
| `is_healthy` | BOOLEAN | default false | Seller-controlled flag |
| `is_special` | BOOLEAN | default false | "Today's special" badge |
| `is_available` | BOOLEAN | default true | Soft sold-out toggle |
| `daily_stock_limit` | INTEGER | nullable | NULL = unlimited |
| `image_url` | TEXT | | |
| `preparation_time` | INTEGER | default 15 | Minutes |
| `hide_healthy_badge` ⭐ | BOOLEAN | NOT NULL default false | Seller override (June 2026) |
| `hide_unhealthy_badge` ⭐ | BOOLEAN | NOT NULL default false | Seller override (June 2026) |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

⭐ = added by `20260531_menu_badge_overrides.sql`

### `menu_item_addons`

Size / spice / toppings options per item.

| Column | Type | Notes |
| --- | --- | --- |
| `menu_item_id` | FK → `menu_items` ON DELETE CASCADE | |
| `group_name` | e.g. `'Size'`, `'Spice Level'` | |
| `option_name` | e.g. `'Large'`, `'Extra Hot'` | |
| `extra_price` | DECIMAL(10,2) CHECK `>= 0` | |
| `is_default` / `is_available` / `sort_order` | … | |
| Unique | `(menu_item_id, group_name, option_name)` | |

### `item_daily_stock`

Per-date portion tracking. Allows "we have 30 of these today" semantics.

| Column | Type | Notes |
| --- | --- | --- |
| `menu_item_id` | FK → `menu_items` ON DELETE CASCADE | |
| `date` | DATE default `CURRENT_DATE` | |
| `stock_limit`, `sold_count` (CHECK `>= 0`) | INT | |
| Unique | `(menu_item_id, date)` | |

### `item_discount_schedules`

Promotion Schemes — time-windowed discounts. **Display label** is
"Promotion Scheme"; the table keeps the original name to preserve
existing data.

| Column | Type | Notes |
| --- | --- | --- |
| `menu_item_id` | FK → `menu_items` ON DELETE CASCADE | |
| `label` | TEXT | E.g. `'Lunch Special'` |
| `days_of_week` | INT[] | `[1,2,3,4,5]` for Mon–Fri |
| `start_time`, `end_time` | TIME | Daily window |
| `discount_percent` | DECIMAL CHECK `(0, 100]` | |
| `is_active` | BOOLEAN | Manual on/off |

### `shop_operating_hours`, `shop_closures`, `shop_announcements`

Standard auxiliary tables, all FK-cascaded from `shops`.

---

## 3. Orders (the heart of the app)

### `orders`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | UUID PK | | |
| `order_number` | VARCHAR(50) UNIQUE | NOT NULL | Human-readable: `ORD-20260418-0001`, generated by trigger |
| `queue_number` | SMALLINT | | Per-shop daily counter for pickup |
| `student_id` | FK → `users(id)` ON DELETE CASCADE | NOT NULL | |
| `shop_id` | FK → `shops(id)` ON DELETE CASCADE | NOT NULL | |
| `total_amount` | DECIMAL(10,2) | CHECK `>= 0` | |
| `service_type` | VARCHAR(20) | CHECK `('pickup','dine-in')` | |
| `status` | VARCHAR(20) | CHECK `('pending','preparing','ready','completed','cancelled')`, default `'pending'` | **The state machine** |
| `ordered_at` | TIMESTAMPTZ default NOW() | | |
| `accepted_at`, `ready_at`, `completed_at`, `cancelled_at` | TIMESTAMPTZ | | Set by status-change trigger |
| `estimated_ready_time` | TIMESTAMPTZ | | Computed at place time |
| `scheduled_for` ⭐ | TIMESTAMPTZ | nullable | NULL = immediate; otherwise reservation |
| `cancelled_by` | VARCHAR(20) | CHECK `('student','seller','admin')` | |
| `cancellation_reason` | TEXT | | |
| `special_instructions` | TEXT | | |
| `is_late` | BOOLEAN default false | | Flag set by background job (not yet wired) |

⭐ = added by an earlier reservation migration (file `11_time_discounts_reservations.sql`).

### `order_items`

The line items per order. **Snapshots** `item_name` and `unit_price` so
historical orders survive menu edits / item deletes.

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | FK → `orders` ON DELETE CASCADE | |
| `menu_item_id` | FK → `menu_items` ON DELETE **SET NULL** | Snapshot survives the link being broken |
| `quantity` | INTEGER CHECK `> 0` | |
| `unit_price` | DECIMAL(10,2) NOT NULL | Snapshot of `menu_items.price` at order time |
| `item_name` | VARCHAR(255) NOT NULL | Snapshot of `menu_items.name` |
| `addons_snapshot` | JSONB default `'[]'` | `[{group,option,extra_price}]` snapshot of selected addons |

### `order_status_history`

Immutable audit trail. Every status change writes one row.

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | FK → `orders` ON DELETE CASCADE | |
| `previous_status`, `new_status` | VARCHAR(20) | |
| `changed_by` | FK → `users(id)` ON DELETE SET NULL | |
| `notes` | TEXT | Reason if cancelled |
| `changed_at` | TIMESTAMPTZ default NOW() | |

---

## 4. Communication

### `messages` (order chat)

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | FK → `orders` ON DELETE CASCADE | Thread is per-order |
| `sender_id` | FK → `users(id)` | |
| `recipient_id` | FK → `users(id)` | |
| `message` | TEXT NOT NULL | |
| `is_read` | BOOLEAN default false | |
| `read_at`, `sent_at` | TIMESTAMPTZ | |

> **Implementation note**: the current production messaging path actually
> uses the Edge Function's **Deno kv-store** (`order-messages:<id>` keys)
> rather than this Postgres table. This SQL table is reserved for the
> migration to a Postgres-backed implementation in a future iteration —
> the schema is ready, the wiring isn't done. See `FEATURE_NOTES.md` §1.

### `notifications`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `user_id` | FK → `users(id)` ON DELETE CASCADE | NOT NULL | |
| `type` | VARCHAR(50) | CHECK `('order_update','message','system','promotion')` | |
| `title`, `message` | text | NOT NULL | |
| `related_order_id` | FK → `orders` ON DELETE SET NULL | | Optional link |
| `is_read` | BOOLEAN default false | | |
| `read_at` | TIMESTAMPTZ | | |
| `priority` | VARCHAR(20) | CHECK `('low','normal','high','urgent')`, default `'normal'` | |

---

## 5. Reviews, preferences

### `reviews`

One review per order (enforced by `UNIQUE (order_id)`). Rating
1–5. Updates `shops.rating` via trigger.

### `user_preferences`

Per-user settings.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | PK + FK → `users(id)` ON DELETE CASCADE | |
| `notification_enabled` / `email_notifications` | BOOLEAN | |
| `favorite_shops` | UUID[] default `'{}'` | |
| `dietary_preferences` | TEXT[] | |
| `language` | VARCHAR(10) CHECK `('en','km')` default `'en'` | |

---

## 6. Analytics

### `shop_statistics`

Daily aggregate per shop. Maintained by a trigger that fires when an
order transitions to `completed` or `cancelled`.

| Column | Type | Notes |
| --- | --- | --- |
| `shop_id` | FK → `shops` ON DELETE CASCADE | |
| `date` | DATE | |
| `total_orders`, `completed_orders`, `cancelled_orders` | INT | |
| `total_revenue` | DECIMAL(10,2) | |
| `average_preparation_time` | INT (minutes) | |
| Unique key | `(shop_id, date)` | |

---

## 7. AI / nutrition

### `scan_reports`

Wrong-label feedback from the AI scanner. Used for retraining.

| Column | Type | Notes |
| --- | --- | --- |
| `student_id` | FK → `users(id)` nullable | |
| `detected_label` | text | The model's top pick |
| `detected_confidence` | DECIMAL | 0–1 |
| `model_used` | text | `'mobilenet'` or `'yolo_small'` |
| `all_predictions` | JSONB | Top-5 + scores |
| `is_correct` | BOOLEAN | Did the user mark it right? |
| `actual_label` | text | What it actually was (if wrong) |
| `notes` | text | |

### `food_nutrition_reference`

Curated nutrition data, one row per food class.

| Column | Type | Notes |
| --- | --- | --- |
| `food_class` | TEXT PK | Same labels as the model |
| `display_name` | text | Human-readable |
| `serving_size_g` | INT | |
| `calories_per_serving` | INT | |
| `protein_g`, `carbs_g`, `fat_g` | DECIMAL | |

---

## 8. Reservations

### `class_break_schedules`

Class-break windows. The reservation feature pulls these to populate the
cart's "Schedule for later" chips.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `campus` | VARCHAR | CHECK `('RUPP','IFL')` |
| `day_of_week` | INT | 0=Sunday, 6=Saturday |
| `break_start`, `break_end` | TIME | |
| `label` | text | E.g. `'Morning Break'` |
| `is_active` | BOOLEAN | |

---

## 9. Foreign keys & cascade behaviour

| Parent | Child | FK column | ON DELETE |
| --- | --- | --- | --- |
| `users` | `orders` | `student_id` | CASCADE |
| `users` | `scan_reports` | `student_id` | SET NULL |
| `users` | `notifications` | `user_id` | CASCADE |
| `users` | `messages` | `sender_id`, `recipient_id` | CASCADE |
| `users` | `reviews` | `student_id` | CASCADE |
| `users` | `user_preferences` | `user_id` (also PK) | CASCADE |
| `users` | `shops` | `owner_id` | SET NULL (shop survives owner deletion) |
| `users` | `order_status_history` | `changed_by` | SET NULL |
| `shops` | `menu_items` | `shop_id` | CASCADE |
| `shops` | `menu_categories` | `shop_id` | CASCADE |
| `shops` | `orders` | `shop_id` | CASCADE |
| `shops` | `shop_operating_hours` | `shop_id` | CASCADE |
| `shops` | `shop_closures` | `shop_id` | CASCADE |
| `shops` | `shop_announcements` | `shop_id` | CASCADE |
| `shops` | `shop_statistics` | `shop_id` | CASCADE |
| `shops` | `reviews` | `shop_id` | CASCADE |
| `menu_items` | `order_items` | `menu_item_id` | **SET NULL** ← snapshot survives |
| `menu_items` | `menu_item_addons` | `menu_item_id` | CASCADE |
| `menu_items` | `item_daily_stock` | `menu_item_id` | CASCADE |
| `menu_items` | `item_discount_schedules` | `menu_item_id` | CASCADE |
| `menu_categories` | `menu_items` | `category_id` | SET NULL |
| `orders` | `order_items` | `order_id` | CASCADE |
| `orders` | `order_status_history` | `order_id` | CASCADE |
| `orders` | `messages` | `order_id` | CASCADE |
| `orders` | `reviews` | `order_id` | CASCADE |
| `orders` | `notifications` | `related_order_id` | SET NULL |
| `auth.users` | `telegram_otp` | `user_id` | CASCADE |

**Rule of thumb**: CASCADE for ownership (a shop owns its menu items),
SET NULL for soft links (a menu item is referenced by historical
order_items but those orders survive the item being deleted).

---

## 10. Indexes

Declared in `src/database/02_indexes.sql`. Each one backs a hot query path:

| Index | Table | Why |
| --- | --- | --- |
| B-tree on `student_id` | `orders` | `/api/student/orders` polls every 5 s |
| B-tree on `shop_id` | `orders` | `/api/seller/orders` polls every 10 s |
| B-tree on `status` | `orders` | Filter "active orders" panel |
| B-tree on `order_id` | `order_items` | Join when fetching orders |
| B-tree on `menu_item_id` | `order_items` | "Top selling items" analytics |
| B-tree on `shop_id` | `menu_items` | Public menu fetch |
| B-tree on `is_available` | `menu_items` | Public menu filter |
| GIN on `days_of_week` | `item_discount_schedules` | Array contains operator `@>` |
| B-tree on `user_id` + `is_read` | `notifications` | Unread-count count |
| Trigram on `menu_items.name` | `menu_items` | Fuzzy menu search via `pg_trgm` |

---

## 11. Enums via CHECK constraints

We use CHECK constraints rather than Postgres `CREATE TYPE … AS ENUM`
for one reason: adding a new value to a CHECK constraint is a single
ALTER TABLE statement; adding to a true enum requires `ALTER TYPE …
ADD VALUE` which doesn't run inside a transaction. CHECK gives us the
same correctness without the operational gotcha.

| Column | Allowed values |
| --- | --- |
| `users.role` | `'student'`, `'seller'`, `'admin'` |
| `shops.campus` | `'RUPP'`, `'IFL'` |
| `orders.status` | `'pending'`, `'preparing'`, `'ready'`, `'completed'`, `'cancelled'` |
| `orders.service_type` | `'pickup'`, `'dine-in'` |
| `orders.cancelled_by` | `'student'`, `'seller'`, `'admin'` |
| `notifications.type` | `'order_update'`, `'message'`, `'system'`, `'promotion'` |
| `notifications.priority` | `'low'`, `'normal'`, `'high'`, `'urgent'` |
| `shop_closures.closure_type` | `'holiday'`, `'maintenance'`, `'special_event'`, `'emergency'` |
| `user_preferences.language` | `'en'`, `'km'` |
| `class_break_schedules.campus` | `'RUPP'`, `'IFL'` |

---

## 12. Row-Level Security (RLS) policies

Every table that contains user-scoped data has RLS **enabled** with a
default-deny policy and explicit allow rules for the three roles.

### `orders`
```sql
-- Students read only their own orders
CREATE POLICY "students_read_own_orders" ON orders FOR SELECT
  USING (student_id = auth.uid());

-- Sellers read only orders for their shop
CREATE POLICY "sellers_read_shop_orders" ON orders FOR SELECT
  USING (shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  ));

-- Admins read everything (role from JWT claim)
CREATE POLICY "admins_read_all" ON orders FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');
```

### `order_items`
Inherits visibility from the parent order via `EXISTS (SELECT 1 FROM
orders WHERE orders.id = order_items.order_id AND <orders-policy>)`.

### `notifications`
```sql
USING (user_id = auth.uid())
```
Each user reads only their own.

### `scan_reports`
```sql
-- Students insert their own
INSERT POLICY: WITH CHECK (student_id = auth.uid())
-- Admins read all
SELECT POLICY: USING ((auth.jwt() ->> 'role') = 'admin')
```

### `menu_items`, `shops`, `food_nutrition_reference`, `class_break_schedules`
**Public read** (anyone with the anon key can SELECT). Sellers write only
their own shop's rows. Admins can write anywhere.

### Why this design?
- The anon key shipped in the client has **zero permissions** on its
  own. Every read/write is gated by the JWT's `auth.uid()` and `role`
  claim.
- The app code never writes `WHERE student_id = ...` — Postgres adds it
  automatically. So a developer who forgets the filter doesn't leak
  other users' data.
- The service-role key (used only by the Edge Function for endpoints
  that genuinely need cross-row visibility) bypasses RLS entirely. It
  never ships to the client.

---

## 13. Triggers & functions

Defined in `src/database/03_functions_triggers.sql`. The important ones:

| Trigger | Fires on | Does |
| --- | --- | --- |
| `set_updated_at` | UPDATE on any table with `updated_at` | Refreshes the column to NOW() |
| `generate_order_number` | INSERT on `orders` | Generates `ORD-YYYYMMDD-NNNN` from a daily sequence |
| `record_order_status_change` | UPDATE on `orders` when status changes | Writes a row to `order_status_history` |
| `set_order_timestamps` | UPDATE on `orders` | Sets `accepted_at` / `ready_at` / etc. when status moves through the chain |
| `update_shop_statistics` | After UPDATE on `orders` to `completed` or `cancelled` | Updates daily aggregate row in `shop_statistics` |
| `update_shop_rating` | After INSERT on `reviews` | Refreshes `shops.rating` and `shops.total_reviews` |
| `create_user_preferences` | After INSERT on `users` | Auto-creates a default `user_preferences` row |

---

## 14. Migrations

| File | Date | What it adds |
| --- | --- | --- |
| `01_schema.sql` (and 02–05) | Initial | Base schema, indexes, RLS, seed data |
| `20260519_telegram_otp.sql` | 2026-05-19 | `telegram_otp` table + RLS for the 2FA flow |
| `20260523_order_items_rls.sql` | 2026-05-23 | RLS policy on `order_items` so students read their own; service-role bypass |
| `20260531_menu_badge_overrides.sql` | 2026-05-31 | `menu_items.hide_healthy_badge` + `hide_unhealthy_badge` columns (default false) |

**Migration strategy**: each file is idempotent (`ADD COLUMN IF NOT
EXISTS`, `CREATE POLICY IF NOT EXISTS`), date-prefixed for ordering, and
applied via `supabase db push` from the `food_app/` directory. Postgres
tracks applied versions in `supabase_migrations.schema_migrations`, so a
re-run is a no-op.

---

## 15. Backend Q&A — ready answers

| Q | A |
| --- | --- |
| **"Walk me through normalisation."** | 3NF: every non-key column depends on the key, the whole key, nothing but the key. One deliberate denorm: `order_items.item_name` and `unit_price` snapshot the menu item at order time so historical orders stay readable if the seller renames or reprices it later. |
| **"How do you handle referential integrity?"** | Every FK is declared in SQL with explicit `ON DELETE` behaviour — CASCADE for ownership (shop → menu items), SET NULL for soft links (menu item → order_items). Postgres rejects orphan inserts at the DB level. |
| **"Why CHECK instead of true enums?"** | Adding a value to a CHECK constraint is a single `ALTER TABLE` that runs in a transaction. Adding to `CREATE TYPE … AS ENUM` requires `ALTER TYPE … ADD VALUE` which can't run inside a transaction. Same correctness, friendlier ops. |
| **"Indexes?"** | B-tree on `orders.student_id`, `orders.shop_id`, `order_items.order_id`, `menu_items.shop_id`. GIN on `item_discount_schedules.days_of_week` (int array). Trigram on `menu_items.name` for fuzzy search. All chosen because they back a polled endpoint or a public read. |
| **"Is order placement atomic?"** | Honest: not fully. The order INSERT and the order_items INSERT are sequential statements, not one transaction. We surface a 500 with the error string when items insert fails, so the client knows. Tightening into a single transaction (via `supabase.rpc()` calling a Postgres function) is a known follow-up. |
| **"Race condition on the last portion?"** | We don't enforce hard inventory — `is_available` is a soft seller toggle. Two students can order the last unit; the seller cancels one with a reason. The rigorous fix is `SELECT … FOR UPDATE` inside the place-order transaction — Postgres supports it, we haven't shipped it. |
| **"N+1 queries?"** | Avoided. PostgREST embeds joins in one round-trip: `.select('*, order_items(*, menu_items(*))')` produces a single nested SQL query, not N follow-ups. The seller queue's full order list is one round-trip including line items and menu metadata. |
| **"How does login work?"** | Standard `supabase.auth.signInWithPassword` over HTTPS. Supabase issues a JWT (1-hour access + ~30-day refresh) and the SDK persists it in localStorage. Every API call sends the access token as `Authorization: Bearer …`; the SDK auto-refreshes near expiry. |
| **"Anon key in the client — leak?"** | Anon key has zero permissions on its own. RLS policies plus the user's JWT decide every read/write. The anon key is a guest pass that the database still vets — the surface that matters is policy correctness, not the key itself. |
| **"SQL injection?"** | Not possible via the Supabase SDK — every parameter is bound by PostgREST, not concatenated. Raw SQL exists only in migration files, which we author and only we run. |
| **"Service-role key — where?"** | Only inside the Edge Function, set as a Supabase environment secret. Never shipped to the client. Used for endpoints that legitimately need to read across rows the user doesn't own (analytics, order placement with cross-shop joins). |
| **"Caching strategy?"** | Read-side: **no** browser cache on polled endpoints — every fetch sets `cache: 'no-store'`. We learned the hard way that browser HTTP cache silently breaks polling. Write-side: PostgREST connection pool sits in front of Postgres, so connection setup is amortised. |
| **"Backups?"** | Supabase free tier: daily automated snapshots, 7-day retention. Paid tier adds point-in-time recovery. We rely on the platform's defaults. |
| **"Migration strategy?"** | Date-prefixed SQL files in `supabase/migrations/`, applied via `supabase db push`. Idempotent (`IF NOT EXISTS` everywhere). Same migrations run in dev and prod — no drift. |
| **"How many tables and rows can this handle?"** | Sized for ~200 orders/min at campus peak — well below Postgres's comfortable limits. Free tier: 500 MB DB, 60 concurrent connections; paid tier scales. No formal load test — honest limitation. |
| **"What's the worst thing in your schema?"** | The kv-store-based `messages` instead of using the existing `messages` table. The table is defined but unused in production. Migrating to the Postgres-backed path means populating the FK relationship and re-pointing the Edge Function's chat endpoints — not done. |

---

## 16. Honest limitations (be upfront if asked)

1. **No hard inventory enforcement.** `is_available` is a soft toggle.
   Two students can race for the last unit; the seller cancels one.
2. **Order placement isn't a single transaction.** The order INSERT and
   the order_items INSERT are sequential. Failure between them can leave
   an itemless order; we surface 500 with the error to the client. Could
   be tightened by moving the whole place-order flow into a Postgres
   function.
3. **No formal load testing.** Performance numbers come from individual
   benchmarks, not concurrent load.
4. **Messages table is unused.** Production uses Deno kv-store keyed by
   order ID. Migrating to the Postgres table is a planned follow-up.
5. **`scan_reports.actual_label` is free text.** No validation against
   the 32-class label set. A user could type anything. Cleanup happens
   manually in the admin dashboard.
6. **No auto-vacuum tuning.** We rely on Postgres defaults.

---

## 17. The defense narration

If a backend examiner says "walk me through your database", this is the
30-second pitch:

> "Postgres on Supabase. 21 application tables in 3NF, with one
> deliberate snapshot exception on `order_items` so historical orders
> stay readable even if the seller renames or deletes the menu item
> later. Foreign keys are declared in SQL with explicit ON DELETE
> behaviour — CASCADE for ownership, SET NULL for soft links. Status
> machines and roles are CHECK constraints, not true enums, because
> adding a value to a CHECK runs inside a transaction. Indexes back
> every polled endpoint — B-tree on `orders.student_id`, `orders.shop_id`,
> `order_items.order_id`; GIN on the discount-schedule array column.
> Row-Level Security policies in Postgres are the auth layer — the anon
> key shipped in the client has zero permissions on its own; the JWT's
> `auth.uid()` and `role` claim decide every row. Migrations are
> date-prefixed SQL files, idempotent, applied via `supabase db push`.
> One known gap: order placement is two sequential inserts, not one
> transaction; surfacing the error to the client is the current
> mitigation while we tighten it into a Postgres function."
