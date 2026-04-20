# Coupons API

Cross-product discount-code engine. Redeemable against **programs** (one-time
purchases) and **coaching plans** (monthly subscriptions). A single coupon can
target one product line, both, or a specific whitelist — admins decide per
coupon.

Two audiences:

- **Client app** — one public preview endpoint; the real enforcement is the
  `couponCode` field on the existing purchase/subscribe calls.
- **Admin app** (admin JWT) — CRUD + whitelist management + redemption log.

---

## Conventions

| Concern    | Rule                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /coupons/validate` is public. `Authorization: Bearer <accessToken>` is optional here but lets the server enforce the per-user cap during preview. All `/admin/coupons/*` routes require admin JWT (`role === 'ADMIN'`). |
| Codes      | Case-insensitive. Stored **uppercase**. Allowed charset `[A-Za-z0-9_-]`, length 3–32.                                                                                                                                         |
| Currency   | All monetary fields are **INR rupees as integers**. Never paise.                                                                                                                                                              |
| Timestamps | ISO 8601 strings.                                                                                                                                                                                                             |
| IDs        | UUIDv4.                                                                                                                                                                                                                       |
| Errors     | `{ statusCode, message, error }` envelope.                                                                                                                                                                                    |

### Discount types

| `discountType` | `discountValue` semantics                                               | `maxDiscount`                                                             | Example                                                                     |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `PERCENT`      | 1–100 (percent off the applicable amount).                              | Optional cap in INR rupees. Null = uncapped.                              | `{ type: PERCENT, value: 25, maxDiscount: 500 }` → 25% off, capped at ₹500. |
| `FLAT`         | INR rupees off. Clamped to the applicable amount (never goes negative). | **Must be null** — rejected as bad request on PERCENT semantics mismatch. | `{ type: FLAT, value: 300 }` → ₹300 off.                                    |

### Scope

| `scope`          | Matches                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `ALL`            | Any program OR any coaching plan.                                                                               |
| `PROGRAMS`       | Any program. Rejects coaching-plan orders.                                                                      |
| `COACHING_PLANS` | Any coaching plan. Rejects program orders.                                                                      |
| `SPECIFIC`       | Only programs in `coupon_programs` OR plans in `coupon_coaching_plans`. One coupon can whitelist a mix of both. |

### Applicable amount

The number the discount is actually computed against.

- **Programs** → the final sticker price (`salePrice ?? regularPrice`).
- **Coaching** → `baseAmount + (applyToAddons ? addonsAmount : 0)`.
  - `applyToAddons` defaults to `true`. Flip it off on the coupon when you want
    the discount to only touch the plan price and not the add-on bundle.

### Guardrails (all optional)

| Field                   | Behaviour                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `minOrderAmount`        | Coupon is rejected if applicable amount is below this.                                |
| `maxRedemptions`        | Hard cap on total redemptions across all users.                                       |
| `maxRedemptionsPerUser` | Default `1`. `null` = unlimited. Single-use-per-user is the common marketing default. |
| `startsAt`              | Coupon is not valid before this timestamp.                                            |
| `expiresAt`             | Coupon is not valid at/after this timestamp.                                          |
| `isActive`              | Soft-off switch. Default `true`.                                                      |

### Redemption counting

Redemptions are written on the **`PENDING → PAID` transition**, not at order
create. That means:

- An abandoned checkout does **not** burn a slot in `maxRedemptions` /
  `maxRedemptionsPerUser`.
- A `payment.captured` webhook and the client-side `/verify` can race; the
  coupon redemption insert is idempotent (unique per purchase / subscription),
  so no double-count.
- Admin reporting for "how many times did DIWALI25 get used" is always the
  `GET /admin/coupons/:id/redemptions` count — authoritative.

---

# 1. Client (Public + User)

## 1.1 `POST /coupons/validate`

Dry-run evaluation of a coupon against a specific product. Mirrors the
validation the real checkout will run, so if this returns a discount, the
subsequent `purchase` / `subscribe` call will apply the same number.

Anonymous callers get **scope / window / min-order / total-cap** checks. If a
bearer token is present the **per-user cap** is enforced as well, so a user who
already redeemed the maximum times sees the same rejection here as at checkout.

**Request — program**

```json
{
  "code": "DIWALI25",
  "kind": "PROGRAM",
  "programId": "11111111-1111-1111-1111-111111111111"
}
```

**Request — coaching plan (with add-ons in cart)**

```json
{
  "code": "DIWALI25",
  "kind": "COACHING_PLAN",
  "planId": "22222222-2222-2222-2222-222222222222",
  "addonIds": [
    "33333333-3333-3333-3333-333333333333",
    "44444444-4444-4444-4444-444444444444"
  ]
}
```

**Response (200)**

```json
{
  "valid": true,
  "coupon": {
    "id": "cc...",
    "code": "DIWALI25",
    "description": "Diwali 2026 launch",
    "discountType": "PERCENT",
    "discountValue": 25,
    "maxDiscount": 500,
    "minOrderAmount": 999,
    "scope": "ALL",
    "applyToAddons": true,
    "maxRedemptions": 1000,
    "maxRedemptionsPerUser": 1,
    "startsAt": null,
    "expiresAt": "2026-11-15T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2026-04-21T00:00:00.000Z",
    "updatedAt": "2026-04-21T00:00:00.000Z"
  },
  "applicableAmount": 4999,
  "discountAmount": 500,
  "totalAfterDiscount": 4499
}
```

> For coaching, `applicableAmount` only includes add-ons when the coupon has
> `applyToAddons: true`. The add-on subtotal is not reflected in
> `totalAfterDiscount` when `applyToAddons: false`. The real `POST /coaching/subscriptions`
> response carries the full cart breakdown.

**Errors**

- `400` — coupon inactive / not yet active / expired / scope mismatch / min-order not met / coupon cap reached / per-user cap reached / coupon does not produce a discount for this order.
- `404` — coupon / program / plan not found.

## 1.2 Applying a coupon at checkout

The existing purchase and subscribe DTOs accept an optional `couponCode`.
Invalid codes **reject the entire checkout call** with a `400` — no Razorpay
order is created. Safe to retry without a code.

### Programs — `POST /programs/purchases`

```json
{
  "programId": "11111111-1111-1111-1111-111111111111",
  "couponCode": "DIWALI25"
}
```

**Response (201)** — the Razorpay order amount already reflects the discount.
Multiply `amount` by 100 when opening checkout (paise conversion).

```json
{
  "purchaseId": "pp...",
  "razorpayOrderId": "order_NxYz123AbC",
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxx",
  "amount": 4499,
  "currency": "INR",
  "programSnapshot": {
    "slug": "gorilla-strength",
    "name": "Gorilla Strength",
    "regularPrice": 5999,
    "salePrice": 4999,
    "pricePaid": 4499
  }
}
```

The persisted `program_purchase` row carries the coupon trail:

```json
{
  "id": "pp...",
  "amount": 4499,
  "discountAmount": 500,
  "couponId": "cc...",
  "couponCode": "DIWALI25",
  "status": "PENDING",
  "...": "..."
}
```

### Coaching — `POST /coaching/subscriptions`

```json
{
  "planId": "22222222-2222-2222-2222-222222222222",
  "addonIds": ["33333333-3333-3333-3333-333333333333"],
  "couponCode": "DIWALI25"
}
```

**Response (201)** — `amount` is the final charge:

```json
{
  "subscriptionId": "cs...",
  "razorpayOrderId": "order_NxYz123AbC",
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxx",
  "amount": 5498,
  "currency": "INR",
  "planSnapshot": {
    "slug": "mega",
    "name": "MEGA",
    "price": 4999,
    "validityMonths": 3
  },
  "addonsSnapshot": [
    {
      "addonId": "33...",
      "slug": "nutrition",
      "name": "Nutrition",
      "pricePaid": 999
    }
  ]
}
```

Subscription row has (with `DIWALI25` = 25% PERCENT capped at ₹500):

```
baseAmount      = 4999
addonsAmount    = 999
                           // 25% of (4999 + 999) = 1499 → capped at maxDiscount = 500
discountAmount  = 500
couponId        = cc...
couponCode      = DIWALI25
totalAmount     = 5498     // base + addons − discount
```

### Previewing a coaching total with a coupon

`POST /coaching/plans/:slug/quote` now accepts `couponCode` so the pricing page
can render a discounted total without creating anything:

**Request**

```json
{
  "addonIds": ["33333333-3333-3333-3333-333333333333"],
  "couponCode": "DIWALI25"
}
```

**Response (200)**

```json
{
  "planId": "22...",
  "planSlug": "mega",
  "planName": "MEGA",
  "validityMonths": 3,
  "lineItems": [
    {
      "kind": "plan",
      "id": "22...",
      "slug": "mega",
      "name": "MEGA",
      "amount": 4999
    },
    {
      "kind": "addon",
      "id": "33...",
      "slug": "nutrition",
      "name": "Nutrition",
      "amount": 999
    }
  ],
  "baseAmount": 4999,
  "addonsAmount": 999,
  "discountAmount": 500,
  "couponCode": "DIWALI25",
  "totalAmount": 5498,
  "currency": "INR"
}
```

> There is intentionally no program-side quote endpoint — the program's public
> response already carries the sticker price (`salePrice ?? regularPrice`).
> Call `POST /coupons/validate` with `kind=PROGRAM` for a discounted preview.

## 1.3 Suggested client UX

1. User types a coupon code on a pricing page.
2. FE debounces, then calls `POST /coupons/validate` with the product id (and
   add-ons for coaching). Shows `totalAfterDiscount` on success, the
   `message` on failure.
3. On "Pay", FE calls `POST /programs/purchases` or `POST /coaching/subscriptions`
   with the same `couponCode`. The returned `amount` is what goes into
   Razorpay checkout (multiplied by 100 for paise).
4. On Razorpay success, FE calls the corresponding `/verify` endpoint — the
   redemption is recorded server-side at that point. Nothing the FE has to do.

---

# 2. Admin (Admin JWT)

All endpoints require `Authorization: Bearer <ADMIN_JWT>`.

## 2.1 `GET /admin/coupons`

List coupons, newest first. Each row is **enriched** with its SPECIFIC-scope
whitelists and a running redemption count, so the edit screen renders from
one round-trip.

**Query params**

| Name       | Type                                               | Default | Description                                   |
| ---------- | -------------------------------------------------- | ------- | --------------------------------------------- |
| `q`        | string                                             | —       | Substring match on `code` (case-insensitive). |
| `isActive` | `true` / `false`                                   | —       | Filter by active flag.                        |
| `scope`    | `ALL` / `PROGRAMS` / `COACHING_PLANS` / `SPECIFIC` | —       | Scope filter.                                 |

**Response (200)**

```json
[
  {
    "id": "cc...",
    "code": "DIWALI25",
    "description": "Diwali 2026 launch",
    "discountType": "PERCENT",
    "discountValue": 25,
    "maxDiscount": 500,
    "minOrderAmount": 999,
    "scope": "ALL",
    "applyToAddons": true,
    "maxRedemptions": 1000,
    "maxRedemptionsPerUser": 1,
    "startsAt": null,
    "expiresAt": "2026-11-15T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2026-04-21T00:00:00.000Z",
    "updatedAt": "2026-04-21T00:00:00.000Z",
    "programIds": [],
    "coachingPlanIds": [],
    "totalRedemptions": 42
  }
]
```

## 2.2 `POST /admin/coupons`

Create a coupon.

**Request**

```json
{
  "code": "diwali25",
  "description": "Diwali 2026 launch",
  "discountType": "PERCENT",
  "discountValue": 25,
  "maxDiscount": 500,
  "minOrderAmount": 999,
  "scope": "ALL",
  "applyToAddons": true,
  "maxRedemptions": 1000,
  "maxRedemptionsPerUser": 1,
  "startsAt": null,
  "expiresAt": "2026-11-15T23:59:59.000Z",
  "isActive": true,
  "programIds": [],
  "coachingPlanIds": []
}
```

- `code` is normalised to uppercase. Server rejects duplicates with `409`.
- `discountType: PERCENT` with `discountValue > 100` → `400`.
- `discountType: FLAT` with a `maxDiscount` → `400` (cap is PERCENT-only).
- `programIds` / `coachingPlanIds` seed the SPECIFIC whitelist. You can also
  leave them empty and add them later via the link endpoints (§ 2.6).
- Non-SPECIFIC scopes **accept** whitelists (safe to pre-populate for a future
  scope flip) but the validator only reads them when `scope === 'SPECIFIC'`.

**Response (201)** — the created coupon shape from § 2.1, with
`totalRedemptions: 0`.

## 2.3 `PATCH /admin/coupons/:id`

Update a coupon. `code` is **immutable** — if you need a new code, create a
new coupon and deactivate the old one. This keeps `coupon_code` snapshots on
historical purchase rows unambiguous.

Passing `programIds` or `coachingPlanIds` **replaces** the existing whitelist
wholesale. To add/remove individual items incrementally, use the link
endpoints in § 2.6.

**Response (200)** — the updated coupon (enriched shape).

## 2.4 `DELETE /admin/coupons/:id`

Soft-delete by default (flips `isActive` off). Historical redemptions remain
intact.

**Query params**

| Name   | Default | Behaviour                                             |
| ------ | ------- | ----------------------------------------------------- |
| `hard` | `false` | `true` → hard delete. `409` if any redemptions exist. |

**Response (200)**

```json
// soft
{ "id": "cc...", "isActive": false }

// hard
{ "id": "cc...", "deleted": true }
```

## 2.5 `GET /admin/coupons/:id/redemptions`

Full redemption log for one coupon. Newest first. Use this for the "Usage"
tab in the admin coupon detail screen.

**Response (200)**

```json
[
  {
    "id": "cr...",
    "couponId": "cc...",
    "userId": "u...",
    "programPurchaseId": "pp...",
    "coachingSubscriptionId": null,
    "discountAmount": 500,
    "createdAt": "2026-04-21T03:12:00.000Z"
  }
]
```

Exactly one of `programPurchaseId` / `coachingSubscriptionId` is non-null per
row.

## 2.6 SPECIFIC-scope whitelist management

| Method   | Path                                        | Purpose                                                                         |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST`   | `/admin/coupons/:id/programs`               | Add a program to the whitelist. Body: `{ programId }`. `409` if already linked. |
| `DELETE` | `/admin/coupons/:id/programs/:programId`    | Remove a program from the whitelist. `404` if not linked.                       |
| `POST`   | `/admin/coupons/:id/coaching-plans`         | Add a coaching plan. Body: `{ planId }`. `409` if already linked.               |
| `DELETE` | `/admin/coupons/:id/coaching-plans/:planId` | Remove a coaching plan. `404` if not linked.                                    |

**Response (success)**

```json
{ "couponId": "cc...", "programId": "11...", "linked": true }
{ "couponId": "cc...", "planId": "22...",   "linked": true }
```

> These endpoints are **additive/targeted** — safe to call independently of
> a PATCH. Prefer them over `PATCH { programIds: [...] }` when the admin UI
> edits a single chip at a time.

## 2.7 Suggested admin UX

1. **List page** — `GET /admin/coupons` with `q` / `isActive` / `scope`
   filters. Render `totalRedemptions` / `maxRedemptions` as a usage ratio.
2. **Create / Edit drawer** — full form over the create DTO. For SPECIFIC
   scope, render two multi-selects (programs, plans) and either:
   - Submit the full arrays as `programIds` / `coachingPlanIds` on POST/PATCH
     (replace-all semantics).
   - Or use the link endpoints per chip add/remove for finer control.
3. **Detail page** — `GET /admin/coupons/:id` for the coupon + whitelists,
   `GET /admin/coupons/:id/redemptions` for the usage tab.
4. **Soft delete** via `DELETE` (default). Only offer "Hard delete" in a
   confirm dialog; backend still refuses if any redemptions exist.

---

# 3. Applying the migration

The schema change ships as Drizzle migration **`0009_coupons.sql`**. Apply it
the same way as every other migration in this repo:

```bash
pnpm db:migrate
```

This will:

- Create the `coupon_discount_type` and `coupon_scope` Postgres enums.
- Create the `coupons`, `coupon_programs`, `coupon_coaching_plans`, and
  `coupon_redemptions` tables with FKs + indexes.
- Add `discount_amount` (default `0`, `NOT NULL`), `coupon_id` (nullable),
  and `coupon_code` (nullable) columns to both `program_purchases` and
  `coaching_subscriptions`.
- Backfill-safe: all adds are `IF NOT EXISTS` with safe defaults. Existing
  purchase / subscription rows get `discount_amount = 0` and NULL coupon
  columns — no data migration needed.

No application downtime is required. Deploy the service after the migration;
old clients that don't send `couponCode` continue to work unchanged.

## Neon HTTP driver caveat

> The Neon HTTP driver (`drizzle-orm/neon-http`) **does not support
> transactions**. As a result, `POST /admin/coupons` and `PATCH /admin/coupons/:id`
> on a coupon with a SPECIFIC whitelist do existence checks up-front, then
> insert the coupon row, then insert the whitelist rows **sequentially**.
>
> If a whitelist insert fails after the coupon row is already persisted, an
> admin can retry the specific link via `POST /admin/coupons/:id/programs`
> (or `/coaching-plans`) **without having to re-create the coupon**. The
> coupon row is fine; just the missing links need adding.
>
> The rest of the service — validate (`POST /coupons/validate`), checkout
> application (program purchase / coaching subscribe), and redemption
> recording — requires no transactional guarantees. Each redemption insert is
> idempotent by design (unique per purchase / subscription), so a client-verify
>
> - webhook race still produces exactly one redemption row.

---

# 4. Quick curl recipes

```bash
# ---- Client ----------------------------------------------------------------

# Preview a coupon against a program (anonymous)
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:3000/coupons/validate \
  -d '{
    "code": "DIWALI25",
    "kind": "PROGRAM",
    "programId": "11111111-1111-1111-1111-111111111111"
  }'

# Preview against a coaching plan with add-ons (logged-in, enforces per-user cap)
curl -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $USER_JWT" \
  http://localhost:3000/coupons/validate \
  -d '{
    "code": "DIWALI25",
    "kind": "COACHING_PLAN",
    "planId": "22222222-2222-2222-2222-222222222222",
    "addonIds": ["33333333-3333-3333-3333-333333333333"]
  }'

# Quote a coaching plan with coupon applied
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:3000/coaching/plans/mega/quote \
  -d '{
    "addonIds": ["33333333-3333-3333-3333-333333333333"],
    "couponCode": "DIWALI25"
  }'

# Buy a program with a coupon
curl -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $USER_JWT" \
  http://localhost:3000/programs/purchases \
  -d '{
    "programId": "11111111-1111-1111-1111-111111111111",
    "couponCode": "DIWALI25"
  }'

# Subscribe to a coaching plan with a coupon
curl -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $USER_JWT" \
  http://localhost:3000/coaching/subscriptions \
  -d '{
    "planId": "22222222-2222-2222-2222-222222222222",
    "addonIds": ["33333333-3333-3333-3333-333333333333"],
    "couponCode": "DIWALI25"
  }'

# ---- Admin -----------------------------------------------------------------

# Create a 25% coupon, capped at ₹500, good until Nov 15 2026
curl -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/coupons \
  -d '{
    "code": "DIWALI25",
    "description": "Diwali 2026 launch",
    "discountType": "PERCENT",
    "discountValue": 25,
    "maxDiscount": 500,
    "minOrderAmount": 999,
    "scope": "ALL",
    "applyToAddons": true,
    "maxRedemptions": 1000,
    "maxRedemptionsPerUser": 1,
    "expiresAt": "2026-11-15T23:59:59.000Z"
  }'

# List active coupons
curl -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/coupons?isActive=true'

# Search by code fragment
curl -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/coupons?q=DIWA'

# Whitelist a program on a SPECIFIC-scope coupon
curl -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/coupons/<COUPON_ID>/programs \
  -d '{ "programId": "11111111-1111-1111-1111-111111111111" }'

# Remove a plan from the whitelist
curl -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/coupons/<COUPON_ID>/coaching-plans/<PLAN_ID>

# See every time DIWALI25 was used
curl -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/coupons/<COUPON_ID>/redemptions

# Soft-delete (deactivate)
curl -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/coupons/<COUPON_ID>

# Hard delete (only if no redemptions — otherwise 409)
curl -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/coupons/<COUPON_ID>?hard=true'
```

---

# 5. Quick-reference endpoint index

```
PUBLIC
  POST   /coupons/validate                                   # preview discount (JWT optional)

USER (JWT)
  POST   /programs/purchases           { ..., couponCode? }  # apply at program checkout
  POST   /coaching/subscriptions       { ..., couponCode? }  # apply at coaching checkout
  POST   /coaching/plans/:slug/quote   { ..., couponCode? }  # preview coaching total

ADMIN (Admin JWT)
  GET    /admin/coupons                                      # list (q, isActive, scope)
  POST   /admin/coupons                                      # create
  GET    /admin/coupons/:id                                  # detail (incl. whitelists + usage)
  PATCH  /admin/coupons/:id                                  # update (code is immutable)
  DELETE /admin/coupons/:id[?hard=true]                      # soft delete (default) / hard delete
  GET    /admin/coupons/:id/redemptions                      # usage log

  # SPECIFIC-scope whitelist management
  POST   /admin/coupons/:id/programs                         # link a program
  DELETE /admin/coupons/:id/programs/:programId              # unlink a program
  POST   /admin/coupons/:id/coaching-plans                   # link a coaching plan
  DELETE /admin/coupons/:id/coaching-plans/:planId           # unlink a coaching plan
```
