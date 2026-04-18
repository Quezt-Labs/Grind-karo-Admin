# Coaching Module — Frontend Integration Guide

Everything the frontend needs to ship the `/online-coaching` flow end to end: plan discovery, add-on selection, Razorpay checkout, subscription management, and reviews.

- **Base URL:** `{API_HOST}` (e.g. `http://localhost:3000` in dev)
- **Swagger UI:** `{API_HOST}/api/docs`
- **OpenAPI JSON:** `{API_HOST}/api/docs-json`

---

## 1. Conventions

### Money is always in **paise** (integers)

`499900` = ₹4,999.00. Format for display:

```ts
const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
```

### Timestamps are ISO 8601 strings (`2026-04-18T10:23:45.123Z`).

### Auth

- **Public** endpoints: no token required.
- **User** endpoints (`/coaching/subscriptions/*`): `Authorization: Bearer <access_token>` from the OTP flow (`/auth/otp/send` + `/auth/otp/verify`). Returned tokens carry `role: "USER"`.
- **Admin** endpoints (`/admin/coaching/*`): `Authorization: Bearer <access_token>` obtained via **`POST /auth/admin/login`** (email + password). Admin tokens carry `role: "ADMIN"` and are enforced by `AdminGuard` — a regular user token will be rejected with **403**, missing/invalid tokens with **401**.
- **Admin accounts are NOT creatable through HTTP.** They are bootstrapped server-side only:
  ```bash
  pnpm db:seed:admin <email> <password> [name]
  ```
  The command is idempotent: running it with an existing email rotates the password and promotes that user to `ADMIN`.

### Error shape

Standard NestJS:

```json
{ "statusCode": 400, "message": "<string | string[]>", "error": "Bad Request" }
```

Validation errors return an array of messages.

### Status codes you'll see

- `200` — OK
- `201` — Created (POST plan, POST addon, POST subscription, POST review)
- `400` — Bad request / validation
- `401` — Missing or invalid JWT / bad Razorpay signature
- `403` — Resource owned by another user
- `404` — Not found
- `409` — Slug clash, already linked, or plan has subscriptions

---

## 2. TypeScript types (copy into your FE)

```ts
// ---- Enums --------------------------------------------------------------
export type CoachingSubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

// ---- Plans --------------------------------------------------------------
export interface PublicAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number; // effective price (paise)
}

export interface CoachingPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number; // paise
  validityMonths: number;
  includedFeatures: string[];
  excludedFeatures: string[];
  badge: string | null; // e.g. 'BEST_VALUE'
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  availableAddons: PublicAddon[];
  totalReviews: number;
  averageRating: number; // rounded to 1 decimal
}

// ---- Add-ons ------------------------------------------------------------
export interface CoachingAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanAddonLink {
  planId: string;
  addonId: string;
  priceOverride: number | null;
  createdAt: string;
}

// ---- Subscriptions ------------------------------------------------------
export interface PlanSnapshot {
  slug: string;
  name: string;
  price: number;
  validityMonths: number;
}

export interface AddonSnapshot {
  addonId: string;
  slug: string;
  name: string;
  pricePaid: number;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  razorpayOrderId: string;
  razorpayKeyId: string; // public key, safe on client
  amount: number; // paise
  currency: "INR";
  planSnapshot: PlanSnapshot;
  addonsSnapshot: AddonSnapshot[];
}

export interface CoachingSubscription {
  id: string;
  userId: string;
  planId: string;
  status: CoachingSubscriptionStatus;
  startDate: string;
  expiresAt: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  baseAmount: number;
  addonsAmount: number;
  totalAmount: number;
  planSnapshot: PlanSnapshot;
  addonsSnapshot: AddonSnapshot[];
  createdAt: string;
  updatedAt: string;
}

// ---- Reviews ------------------------------------------------------------
export interface CoachingReview {
  id: string;
  planId: string;
  name: string;
  email: string;
  rating: number; // 1..5
  title: string;
  review: string;
  imgUrl: string | null;
  createdAt: string;
}

export interface PlanReviewsList {
  planId: string;
  planSlug: string;
  reviews: CoachingReview[];
  aggregate: {
    totalReviews: number;
    averageRating: number;
  };
}

// ---- Error --------------------------------------------------------------
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

---

## 3. Public endpoints

### `GET /coaching/plans`

List active plans, each with inline add-ons + review aggregate.

**Response 200** — `CoachingPlan[]`

```json
[
  {
    "id": "f3f...",
    "slug": "mini",
    "name": "Grind Karo — MINI (Program for 3 Months)",
    "price": 299900,
    "validityMonths": 3,
    "includedFeatures": [
      "Semi-custom plan matched to your goals and schedule",
      "..."
    ],
    "excludedFeatures": ["Nutrition guidance", "..."],
    "badge": null,
    "availableAddons": [],
    "totalReviews": 0,
    "averageRating": 0,
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2026-04-18T...",
    "updatedAt": "2026-04-18T..."
  }
]
```

### `GET /coaching/plans/:slug`

Same shape, single plan.

- 404 if slug doesn't exist or plan is inactive.

### `POST /coaching/plans/:slug/quote`

Dry-run pricing. Returns line items + total for a plan and optional add-ons. No side effects, no Razorpay call, no auth required. Use this to render the cart total as the user toggles add-on checkboxes on the pricing page.

The validation rules are identical to the real subscribe endpoint, so the returned `totalAmount` is what the user will actually be charged.

**Body**

```ts
{ addonIds?: string[] }    // UUIDs; defaults to [] if omitted
```

**Response 200** — `SubscriptionQuote`

```json
{
  "planId": "ef61...",
  "planSlug": "mega",
  "planName": "Grind Karo — MEGA (Coaching for 3 Months)",
  "validityMonths": 3,
  "lineItems": [
    {
      "kind": "plan",
      "id": "ef61...",
      "slug": "mega",
      "name": "...MEGA...",
      "amount": 499900
    },
    {
      "kind": "addon",
      "id": "aaaa...",
      "slug": "nutrition-guidance",
      "name": "Nutrition Guidance",
      "amount": 99900
    }
  ],
  "baseAmount": 499900,
  "addonsAmount": 99900,
  "totalAmount": 599800,
  "currency": "INR"
}
```

Errors:

- `400` — a supplied addon is not linked to the plan or is inactive
- `404` — plan slug doesn't exist or plan is inactive

TypeScript:

```ts
export interface QuoteLineItem {
  kind: "plan" | "addon";
  id: string;
  slug: string;
  name: string;
  amount: number;
}

export interface SubscriptionQuote {
  planId: string;
  planSlug: string;
  planName: string;
  validityMonths: number;
  lineItems: QuoteLineItem[];
  baseAmount: number;
  addonsAmount: number;
  totalAmount: number;
  currency: "INR";
}
```

### `GET /coaching/plans/:slug/reviews?limit=50&offset=0`

List reviews for a plan + aggregate in one call.

**Response 200** — `PlanReviewsList`

### `POST /coaching/plans/:slug/reviews`

Submit a review. No auth. No dedupe on server side — recommend client-side rate limiting.

**Body**

```json
{
  "name": "Manthan Tiwari",
  "email": "manthan@example.com",
  "rating": 5,
  "title": "Real Powerbuilding Program",
  "review": "...",
  "imgUrl": "https://..." // optional
}
```

Validation:

- `rating` must be integer 1–5
- `email` must be a valid email
- `imgUrl` must be a URL if present
- `title` ≤ 200 chars, `review` ≤ 4000 chars

**Response 201** — `CoachingReview`

---

## 4. Subscription flow (user)

All endpoints require `Authorization: Bearer <jwt>`.

### Step-by-step (happy path)

```
┌──────────────┐   GET /coaching/plans
│ 1. Discover  │ ─────────────────────────────►  show 3 plan cards
│    plans     │                                 + addon checkboxes
└──────────────┘

┌──────────────┐   POST /coaching/subscriptions
│ 2. Create    │   { planId, addonIds: [...] }
│    order     │ ─────────────────────────────►  returns { subscriptionId,
└──────────────┘                                            razorpayOrderId,
                                                            razorpayKeyId,
                                                            amount }

┌──────────────┐   (runs in browser)
│ 3. Razorpay  │   new Razorpay({...}).open()
│    checkout  │ ─────────────────────────────►  user pays
└──────────────┘

┌──────────────┐   POST /coaching/subscriptions/verify
│ 4. Verify    │   { subscriptionId, razorpayOrderId,
│              │     razorpayPaymentId, razorpaySignature }
│              │ ─────────────────────────────►  200 → confirmed sub
└──────────────┘
```

### `POST /coaching/subscriptions` — create order

**Body**

```ts
{
  planId: string;              // UUID
  addonIds?: string[];         // optional UUIDs, must be linked to the plan
}
```

Server computes the total as `plan.price + sum(addon prices)`. Any addon not linked or inactive → `400`.

**Response 201** — `CreateSubscriptionResponse`

### Razorpay checkout (browser)

Load the script once:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Then:

```ts
async function startCheckout(planId: string, addonIds: string[]) {
  const res = await api.post<CreateSubscriptionResponse>(
    "/coaching/subscriptions",
    { planId, addonIds },
  );

  return new Promise<void>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: res.razorpayKeyId,
      order_id: res.razorpayOrderId,
      amount: res.amount,
      currency: res.currency,
      name: "Grind Karo",
      description: res.planSnapshot.name,
      handler: async (payload: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await api.post("/coaching/subscriptions/verify", {
            subscriptionId: res.subscriptionId,
            razorpayOrderId: payload.razorpay_order_id,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpaySignature: payload.razorpay_signature,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("checkout_dismissed")),
      },
    });
    rzp.on("payment.failed", (e: any) => reject(e));
    rzp.open();
  });
}
```

### `POST /coaching/subscriptions/verify`

Idempotent — safe to retry on flaky networks. If the sub is already paid, returns it unchanged.

**Body**

```ts
{
  subscriptionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
```

- `400` if order id doesn't match the stored sub
- `401` if signature check fails → treat as payment failure, **do not show success**
- `403` if sub isn't owned by the current user

### `GET /coaching/subscriptions/me`

Active + paid subs. Lazily expires stale rows on access — don't cache aggressively.

### `GET /coaching/subscriptions/me/history`

All subs (ACTIVE, EXPIRED, CANCELLED, including unpaid).

### `POST /coaching/subscriptions/:id/cancel`

Flips to `CANCELLED`. No refund issued server-side — handle that out of band.

---

## 5. Admin endpoints

Every admin endpoint is under `/admin/coaching/*` and is protected by `AdminGuard`, which requires a JWT with `role: "ADMIN"`. Use `POST /auth/admin/login` (below) to obtain it.

### Admin login

```
POST /auth/admin/login
Content-Type: application/json

{ "email": "admin@grindkaro.in", "password": "..." }
```

**200 OK:**

```ts
{
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN";
  }
  accessToken: string; // carries role=ADMIN
  refreshToken: string; // use POST /auth/token/refresh to rotate
}
```

- `401 Unauthorized` — bad credentials, unknown account, non-admin account, or account without a password set. The error message is intentionally generic (`"Invalid credentials"`) and the response time is constant, so the UI should not try to distinguish causes.
- Refresh and logout use the existing `POST /auth/token/refresh` and `POST /auth/logout` endpoints — same flow as user tokens; the new tokens retain the admin role.

### Plans

| Method   | Path                                  | Body / Query                              |
| -------- | ------------------------------------- | ----------------------------------------- |
| `GET`    | `/admin/coaching/plans`               | —                                         |
| `GET`    | `/admin/coaching/plans/:id`           | —                                         |
| `POST`   | `/admin/coaching/plans`               | `CreateCoachingPlanDto`                   |
| `PATCH`  | `/admin/coaching/plans/:id`           | `UpdateCoachingPlanDto` (partial)         |
| `DELETE` | `/admin/coaching/plans/:id?hard=true` | soft by default; hard fails if subs exist |

### Plan ↔ Add-on links

| Method   | Path                                            | Body                          |
| -------- | ----------------------------------------------- | ----------------------------- |
| `POST`   | `/admin/coaching/plans/:planId/addons`          | `{ addonId, priceOverride? }` |
| `PATCH`  | `/admin/coaching/plans/:planId/addons/:addonId` | `{ priceOverride? }`          |
| `DELETE` | `/admin/coaching/plans/:planId/addons/:addonId` | —                             |

### Add-ons

| Method   | Path                                   | Body                     |
| -------- | -------------------------------------- | ------------------------ |
| `GET`    | `/admin/coaching/addons`               | —                        |
| `GET`    | `/admin/coaching/addons/:id`           | —                        |
| `POST`   | `/admin/coaching/addons`               | `CreateCoachingAddonDto` |
| `PATCH`  | `/admin/coaching/addons/:id`           | `UpdateCoachingAddonDto` |
| `DELETE` | `/admin/coaching/addons/:id?hard=true` | soft by default          |

### Subscriptions

| Method | Path                                       | Query                                           |
| ------ | ------------------------------------------ | ----------------------------------------------- |
| `GET`  | `/admin/coaching/subscriptions`            | `?status=ACTIVE&userId=&planId=` (all optional) |
| `GET`  | `/admin/coaching/subscriptions/:id`        | —                                               |
| `POST` | `/admin/coaching/subscriptions/:id/cancel` | —                                               |

### Reviews

| Method   | Path                          | Query                         |
| -------- | ----------------------------- | ----------------------------- |
| `GET`    | `/admin/coaching/reviews`     | `?planId=&limit=100&offset=0` |
| `DELETE` | `/admin/coaching/reviews/:id` | hard delete                   |

### Create-Plan body

```ts
{
  slug: string;                 // kebab-case, must be unique
  name: string;
  tagline?: string | null;
  description?: string | null;
  price: number;                // paise
  validityMonths: number;       // >= 1
  includedFeatures: string[];
  excludedFeatures?: string[];
  badge?: string | null;
  displayOrder?: number;        // default 0
  isActive?: boolean;           // default true
}
```

Update is the same, all fields optional.

### Create-Addon body

```ts
{
  slug: string;          // kebab-case, unique
  name: string;
  description?: string | null;
  price: number;         // paise
  isActive?: boolean;
  sortOrder?: number;
}
```

---

## 6. Recommended UI composition

### Pricing page (`/online-coaching`)

```
GET /coaching/plans        (once on mount)
  → render 3 plan cards sorted by displayOrder
  → for each card:
      ₹{price/100} badge={badge} features={includedFeatures}
      stars: averageRating, ({totalReviews} reviews)
      checkboxes: availableAddons with price column

POST /coaching/plans/:slug/quote   (debounced on every addon toggle)
  → authoritative total for the "You pay" strip above the Subscribe button

POST /coaching/subscriptions       (on Subscribe click, sends same body)
  → startCheckout(plan.id, selectedAddonIds)

GET /coaching/plans/:slug/reviews?limit=10   (on "See all reviews" click)
  → list reviews, paginate on offset increments
```

### My coaching page (`/me/coaching`)

```
GET /coaching/subscriptions/me          (primary view: active plan card)
GET /coaching/subscriptions/me/history  (expandable "Past subscriptions")

Cancel button → POST /coaching/subscriptions/:id/cancel
  (confirm modal: "no refund issued; email us to request refund")
```

### Admin dashboard

Build a table per resource. Use `refetch` after every mutation — responses are authoritative (aggregates update on the plan endpoints automatically).

---

## 7. Suggested client code layout

```
src/
  lib/api.ts              // fetch wrapper, attaches Bearer, throws ApiError
  features/coaching/
    hooks/
      useCoachingPlans.ts
      useCreateSubscription.ts
      useVerifySubscription.ts
      useMyCoaching.ts
    components/
      PricingCard.tsx
      AddonPicker.tsx
      RazorpayButton.tsx
      ReviewList.tsx
      WriteReviewModal.tsx
    types.ts              // copy the interfaces from §2
```

### Thin fetch helper

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: any,
  ) {
    super(typeof body?.message === "string" ? body.message : "Request failed");
  }
}

export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const r = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await r.json() : null;
  if (!r.ok) throw new ApiError(r.status, payload);
  return payload as T;
}
```

---

## 8. Known server-side gaps (behaviors the UI should be aware of)

1. **No background expiry sweeper** — `ACTIVE → EXPIRED` happens lazily on `/me` reads. The admin list may still show stale `ACTIVE` rows until someone touches them.
2. **No review dedupe or rate limiting** — the same `email` can submit multiple reviews. Add throttling at the edge (CDN / WAF) or a captcha on the write form.
3. **Razorpay webhook is not wired** — only the frontend-initiated `verify` flow is supported. If the user closes the tab after paying but before verify completes, the sub will sit as `razorpayPaymentId: null` (treated as unpaid). Mitigation: retry `verify` on app load if you see such a row in history.
4. **Cancellation does not refund** — ops responsibility.
5. **Admin password reset** — there is no self-serve password reset or "forgot password" flow for admins. To rotate, run `pnpm db:seed:admin <email> <new-password>` again (the seed is idempotent and will overwrite the hash).

---

## 9. Quick cURL reference

```bash
# Admin login
curl -s -X POST $API_HOST/auth/admin/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@grindkaro.in","password":"..."}' | jq

# Admin: list plans (use accessToken from admin login)
curl -s $API_HOST/admin/coaching/plans \
  -H "authorization: Bearer $ADMIN_TOKEN" | jq

# Public: list plans
curl -s $API_HOST/coaching/plans | jq

# Public: quote (dry-run pricing)
curl -s -X POST $API_HOST/coaching/plans/mega/quote \
  -H 'content-type: application/json' \
  -d '{"addonIds":[]}' | jq

# Public: submit review
curl -s -X POST $API_HOST/coaching/plans/mega/reviews \
  -H 'content-type: application/json' \
  -d '{"name":"X","email":"x@y.com","rating":5,"title":"t","review":"r"}'

# User: create subscription (dry-run without paying)
curl -s -X POST $API_HOST/coaching/subscriptions \
  -H "authorization: Bearer $JWT" \
  -H 'content-type: application/json' \
  -d '{"planId":"<uuid>","addonIds":[]}'

# Admin: create addon
curl -s -X POST $API_HOST/admin/coaching/addons \
  -H "authorization: Bearer $JWT" \
  -H 'content-type: application/json' \
  -d '{"slug":"nutrition-guidance","name":"Nutrition Guidance","price":99900}'

# Admin: link addon to plan
curl -s -X POST $API_HOST/admin/coaching/plans/<planId>/addons \
  -H "authorization: Bearer $JWT" \
  -H 'content-type: application/json' \
  -d '{"addonId":"<uuid>","priceOverride":null}'
```
