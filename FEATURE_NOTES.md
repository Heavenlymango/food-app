# Feature Notes for Defense

Compact reference for explaining each feature: what it does, how it's
implemented, tech-stack involved, and what to say if asked. Optimised for
slide narration (each section ~30 seconds spoken).

---

## 1. In-order messaging — student ↔ vendor chat

### What it does
Once an order is placed, both the student and the vendor can open a chat
attached to that specific order. Used for short coordination — "no chilli
please", "five more minutes", "are you nearby?". One thread per order.

### How it works end-to-end

```
Student taps "Messages" on the order
       │
       ▼
OrderChatDialog opens → polls /api/messages/:orderId every 3 s
       │
       ▼
Student types a line → POST /api/messages/send
   body: { orderId, senderId, senderType: 'student', message }
       │
       ▼
Edge Function appends to a kv list:
   kv.set(`order-messages:${orderId}`, [...prev, newMessage])
       │
       ▼
Adds the orderId to the OTHER side's "unread" kv key
   kv.set(`shop-unread-messages:${shopId}`, [...orderIds])
       │
       ▼
Vendor side's MessageNotificationMonitor (polls every 5 s) sees a
new unread count → red dot appears on the order card
       │
       ▼
Vendor opens chat → POST /api/messages/mark-read clears the unread flag
```

### Tech stack

| Layer | Tech |
| --- | --- |
| Storage | Supabase Edge Function's kv-store (Deno KV) — `order-messages:<id>` for thread, `student-unread-messages:<uid>` / `shop-unread-messages:<shop>` for unread tracking |
| Server | Hono on Deno (same Edge Function file as the orders API) |
| Web client | `OrderChatDialog.tsx` + `MessageNotificationMonitor.tsx` — pollers + a Radix Dialog for the chat UI |
| Mobile client | Reuses the same endpoints over HTTPS; messages render inline on the order card |
| Auth | Same Supabase JWT used for the rest of the app; the Edge Function reads `senderId` from the request body, gated by RLS-protected order access elsewhere |

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/messages/send` | Append a new message to an order's thread |
| `GET` | `/api/messages/:orderId` | Fetch all messages for one order |
| `POST` | `/api/messages/mark-read` | Clear unread flag for a student on one order |
| `GET` | `/api/messages/unread-count` | Student-side: how many orders have unread messages |
| `GET` | `/api/messages/unread-count-shop` | Vendor-side: same, scoped to a shop |

### Message shape

```ts
{
  id: 'msg-<timestamp>-<random>',
  senderId: '<uuid or shop_code>',
  senderType: 'student' | 'shop',
  message: '<text>',
  timestamp: '<ISO 8601>',
}
```

### Likely questions

| Q | A |
| --- | --- |
| **"Why not Supabase Realtime channels?"** | Polling is simpler and predictable on campus Wi-Fi. Realtime is on the future-work slide. A 3 s poll on a low-traffic per-order thread costs effectively nothing. |
| **"Why kv-store instead of a `messages` Postgres table?"** | Per-order threads are append-only key→list of objects — kv is a great fit and means no extra table/migration. Trade-off: no SQL aggregation across all chats (we don't need any). |
| **"What about message-history privacy?"** | Threads are keyed by `orderId` (UUID). The student only sees orders they own (RLS on `orders`), the vendor only sees orders for their shop. So nobody can read someone else's thread without first knowing the order UUID, which they wouldn't. |
| **"Is the chat real-time?"** | Soft real-time. New messages appear within one poll cycle (~3 s) on the side that's looking, and within 5 s on the notification badge. |

---

## 2. Notifications — order status alerts

### What it does
Whenever a vendor changes an order's status (accept, ready, cancel) or
the system needs to nudge the student, a notification row is written to
`notifications`. A bell icon in the header shows the unread count; tapping
opens a scrollable sheet.

### Tech stack
- Postgres table `notifications (id, user_id, message, is_read, created_at)`
- RLS: a user only reads their own rows (`user_id = auth.uid()`)
- Writes happen inside the order-update Edge Function endpoint
- Client polls `/api/student/notifications` every 10 s and marks-as-read on open

### Why a separate table (not piggyback on `orders`)?
Different lifecycle. An order has a single state machine; notifications
are append-only events. Keeping them separate means the order table stays
the canonical source of truth and the notification feed can be cleared
without touching order history.

---

## 3. Class-break reservations

### What it does
Students can pre-order food to be ready exactly when their class break
starts. The cart's "Schedule for later" toggle reveals chips for today's
breaks (drawn from `class_break_schedules`) plus a Custom time picker.

### Tech stack
- Postgres table `class_break_schedules (campus, day_of_week, break_start,
  break_end, label, is_active)`
- Filter at fetch time: `WHERE campus = ? AND day_of_week = today_dow AND
  is_active`
- The chosen reservation time is sent as `scheduledFor` on `/api/orders/place`
  and stored on `orders.scheduled_for` (timestamptz)
- Vendor side shows a reservation badge + the scheduled time on the order
  card

### Why pre-load break schedules vs free-form time?
Reduces typing on mobile and produces clean batched preparation for
vendors (5 students all picking the 10:00 AM break → vendor prepares
them as one batch).

---

## 4. Scan reports — model retraining feedback

### What it does
After the AI scanner returns a result, the student can tap "Was the
detection wrong?" to log the misclassification. The row captures the
detected label, the actual label they typed in, the model used (MobileNet
or YOLO), and the full prediction array.

### Tech stack
- Postgres table `scan_reports (detected_label, detected_confidence,
  model_used, all_predictions, is_correct, actual_label, student_id, notes)`
- Direct insert from the client with `supabase.from('scan_reports').insert(...)`
- RLS: students insert their own, admins read all

### Why store the full prediction array?
For retraining, we want both right and wrong predictions. A wrong top-1
where the right answer was top-3 tells us the model "almost had it" — that
photo becomes a high-value training example.

---

## 5. Promotion schemes (time-windowed discounts)

### What it does
Sellers create discount rules per menu item: "20% off Tom Yum, Mon–Fri
11:00–13:00". The student menu surfaces the discounted price automatically
when the rule is active and reverts when the window closes.

### Tech stack
- Postgres table `item_discount_schedules (menu_item_id, days_of_week[],
  start_time, end_time, discount_percent, is_active)`
- Menu fetch query checks `days_of_week @> ARRAY[today_dow]` AND
  `start_time <= now() <= end_time` AND `is_active`
- Best active scheme per item wins (max `discount_percent`); shop-wide
  discount is the floor

### Why server-evaluated, not stored as a flag?
Time windows mean "active" is a function of the current clock, not a
boolean. Caching a `discountedPrice` column would go stale the moment
the window closes.

---

## 6. Health classification with paper-cited rules

### What it does
Every menu item gets graded Healthy / Caution / Unhealthy / neutral. Click
the orange badge → popover showing which rule fired, the rationale, and
direct links to WHO / FSA / USDA / NOVA / Nutri-Score / Harvard.

### Tech stack
- Pure function `classifyItem(item) → { status, reasons[] }` in
  `src/utils/healthClassification.ts` (web) and
  `lib/utils/health_classification.dart` (Flutter) — kept in sync
- 8 rules in priority order (high-calorie, fried, sugary-drink,
  sweetened-drink, sweet-dessert, ultra-processed, seller-healthy, salad)
- 21 vitest unit tests + 22 flutter_test tests gate CI

### Why client-side?
The rules are fast, deterministic, and depend on data the client already
has (item name, category, calories, is_healthy flag). Pushing this to the
server would add a network round-trip per menu item.

### Seller override
Sellers can per-item check **Hide Healthy badge** / **Hide Unhealthy
badge** in their menu form. Adds two booleans on `menu_items`; UI respects
them when rendering.

---

## 7. AI food scanner (two-stage cascade)

### What it does
Camera or photo → predict the dish → link to matching menu items and
nutrition data. Works offline on mobile.

### Tech stack

| Stage | Model | Where | Threshold |
| --- | --- | --- | --- |
| 1 | MobileNetV3-Large (8.5 MB TFLite) | On-device (Flutter) or ONNX on server (web) | accept if top-1 ≥ 0.80 |
| 2 (fallback) | YOLOv11-small classification head (38 MB TFLite) | Same | runs only when stage 1 < 0.80 |

The threshold lives in `lib/config/app_config.dart`
(`confidenceThreshold = 0.80`). Both models trained on 32 dishes (10
distinctly Khmer), ~8,200 images total, 80/10/10 split.

### Result accuracy (120 real-canteen photos)
- Top-1 combined: **85.0%**
- Top-3 combined: **96.7%**

---

## 8. Multi-campus filter

### What it does
RUPP and IFL share one app but different vendor stalls. A campus
selector chip restricts the menu (and reservation break list) to the
user's campus.

### Tech stack
- `users.campus` enum (RUPP | IFL) set at signup
- Menu query joins `shops!inner` and filters `WHERE shops.campus = ?`
- Class breaks filtered the same way

---

## 9. Estimated ready time

### What it does
The cart shows "Estimated ready in ~11 min" before checkout, breaking down
the components: base processing + slowest item's prep + peak-hour buffer
+ large-order buffer.

### Algorithm (in code)

```
ready = BASE_PROCESSING (3 min)
      + max(item.preparation_time for item in cart)
      + (4 if qty > 6 else 2 if qty > 3 else 0)
      + (5 if peak hour else 0)
      + (3 if cart spans >2 distinct categories else 0)
```

### Why server-stored, not just client-computed?
Two reasons: (1) we save it on `orders.estimated_ready_time` at placement
so historical orders show what was promised; (2) the seller dashboard
uses it to flag late orders.

---

## 10. Auth — student / seller / admin

### What it does
One sign-in field accepts a student ID, a seller shop code, or an email.
The app routes to the right dashboard by role.

### Tech stack
- `supabase.auth.signInWithPassword` directly from the client
- Synthetic emails for non-email signups: `333333@student.local`,
  `A1@seller.local`
- Role + campus + student_id stored on `auth.users.user_metadata` and
  also surfaced as a JWT claim for RLS policies to read
- Telegram OTP path also exists for second-factor enrollment

---

## 11. Cart calorie preview

### What it does
Before checkout, the cart shows total kcal vs a 600 kcal "average meal"
reference, with a coloured guidance message ("Light meal", "Heavy meal",
etc.).

### Tech stack
Pure client-side: sums `menuItem.calories × quantity` and compares to
constants. No DB call.

### Why it's tied to ordering (not just the dashboard)?
Captures the moment of intent. Students see the calorie load *before*
they commit, when they can still swap an item. The dashboard shows
post-hoc totals.

---

## 12. CI/CD pipeline (defense-relevant detail)

### Pipelines
- Web: GitHub Actions on every push/PR to `main` → `npm test`
  (21 vitest tests) → `npm run build` → deploy Edge Functions to
  Supabase + Vercel publish
- Mobile: same workflow runs `flutter analyze` + `flutter test` (22 tests)
  + builds release APK on `v*` tag → attached to a GitHub Release

### Why tests are the gate
A failed test blocks the deploy. The `health-classification` engine has
the most rules with subtle precedence, so it earned the full test suite —
removing it would let a wrong refactor silently mislabel every dish.

---

## 13. Row-Level Security (the security story)

Every non-public table has RLS on:

- `orders`, `order_items` — students read only their own; sellers read
  only their shop's; admins read all
- `notifications` — `WHERE user_id = auth.uid()`
- `scan_reports` — student inserts their own; admins read all
- `menu_items`, `shops` — public read; seller writes only their shop

The anon key shipped in the client can do *nothing* on its own — every
operation is gated by the JWT's user_id and role claim.

---

## What to say on the slide for messaging (60-second pitch)

> "Each order has its own chat thread between the student and the vendor.
> Implementation-wise it's an Edge Function endpoint on Hono/Deno backed
> by the Supabase kv-store, with the thread keyed by order ID. Both sides
> poll every few seconds — soft real-time, simple to reason about,
> friendly to the campus Wi-Fi. Unread tracking is two extra kv keys, one
> per side. We deliberately avoided WebSockets here because a polling
> loop on a per-order thread costs essentially nothing and is one less
> moving part to demo."

---

*This doc was generated to mirror what's actually in the code. If you
change a feature later, update the relevant section so future-you has the
right narration.*
