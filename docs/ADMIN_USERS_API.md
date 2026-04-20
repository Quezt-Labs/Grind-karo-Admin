# Admin API — Users & Notifications

Cross-domain admin endpoints that span both **coaching subscriptions** and **program purchases**. Programs-specific authoring lives in [PROGRAMS_API_ADMIN.md](./PROGRAMS_API_ADMIN.md); this doc covers:

1. Listing every signed-up user
2. Listing only users who have purchased something
3. Per-user combined purchase history
4. Real-time admin notifications fired on every paid coaching sub OR program purchase

> All endpoints below require `Authorization: Bearer <accessToken>` where the JWT's `role === 'ADMIN'`. A non-admin JWT returns `403 "Admin access required"`.

---

## Conventions

| Concern        | Rule                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Money          | Integers in **INR rupees** (`1999` = ₹1,999).                                                                                                    |
| Timestamps     | ISO 8601 strings.                                                                                                                                |
| IDs            | UUIDv4.                                                                                                                                          |
| Pagination     | `limit` (default 50, max 500 for users / 200 for notifications), `offset` (default 0). Responses include `total` for total-rows-matching-filter. |
| Errors         | `{ statusCode, message, error }` envelope.                                                                                                       |
| `passwordHash` | Never returned by any endpoint, even for admins.                                                                                                 |

---

# 1. Users

## `GET /admin/users`

Every signed-up user. Newest first. Useful for the admin dashboard's "users" tab.

**Query params**

| Name     | Type            | Default | Description                                               |
| -------- | --------------- | ------- | --------------------------------------------------------- |
| `q`      | string          | —       | Substring match against email OR name (case-insensitive). |
| `role`   | `USER \| ADMIN` | —       | Filter to a specific role.                                |
| `limit`  | int             | 50      | Page size (max 500).                                      |
| `offset` | int             | 0       |                                                           |

**Response (200)**

```json
{
  "total": 1234,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "u1...",
      "name": "Manthan Tiwari",
      "email": "manthan@example.com",
      "role": "USER",
      "plan": null,
      "createdAt": "2026-04-19T10:00:00.000Z",
      "updatedAt": "2026-04-19T10:00:00.000Z"
    }
  ]
}
```

`plan` is the legacy global plan field (`FREE`/`PRO`/`ENTERPRISE`); usually `null` since plans now live in the coaching/programs domains.

---

## `GET /admin/users/purchasers`

Only users with at least one **paid** row in `coaching_subscriptions` (i.e. `razorpayPaymentId IS NOT NULL`) **OR** `program_purchases` (i.e. `status = 'PAID'`). One row per user, ordered by most recent purchase. Each row carries per-user counts and total spend across both domains — perfect for an "active customers" leaderboard.

**Query params**

| Name     | Type   | Default | Description                            |
| -------- | ------ | ------- | -------------------------------------- |
| `q`      | string | —       | Substring match against email OR name. |
| `limit`  | int    | 50      | Page size.                             |
| `offset` | int    | 0       |                                        |

**Response (200)**

```json
{
  "total": 42,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "u1...",
      "name": "Manthan Tiwari",
      "email": "manthan@example.com",
      "role": "USER",
      "plan": null,
      "createdAt": "2026-04-19T10:00:00.000Z",
      "updatedAt": "2026-04-19T10:00:00.000Z",
      "coachingSubscriptionsCount": 1,
      "programPurchasesCount": 2,
      "totalSpent": 9997,
      "lastPurchaseAt": "2026-04-19T17:30:00.000Z"
    }
  ]
}
```

`totalSpent` is the sum of every paid amount in INR rupees across both domains. `lastPurchaseAt` is the latest of `coaching_subscriptions.createdAt` (for paid rows) or `program_purchases.paidAt` (falling back to `createdAt`).

---

## `GET /admin/users/:id`

Single user (passwordHash scrubbed).

**Path**: `:id` is the user UUID.

**Response (200)** — same shape as one item in `GET /admin/users`.

---

## `GET /admin/users/:id/purchases`

Combined purchase timeline for a single user — every coaching subscription AND program purchase (any status), newest first. Each row is tagged with `kind` so the FE can render them in one mixed timeline.

**Response (200)**

```json
{
  "user": {
    "id": "u1...",
    "name": "Manthan Tiwari",
    "email": "manthan@example.com",
    "role": "USER",
    "plan": null,
    "createdAt": "2026-04-19T10:00:00.000Z",
    "updatedAt": "2026-04-19T10:00:00.000Z"
  },
  "purchases": [
    {
      "kind": "program_purchase",
      "id": "p2...",
      "programId": "...",
      "programName": "9to5 Powerbuilder",
      "programSlug": "9to5-powerbuilder",
      "status": "PAID",
      "amount": 1999,
      "currency": "INR",
      "paidAt": "2026-04-19T17:30:00.000Z",
      "createdAt": "2026-04-19T17:25:00.000Z"
    },
    {
      "kind": "coaching_subscription",
      "id": "s1...",
      "planId": "...",
      "planName": "Grind Karo — MEGA (Coaching for 3 Months)",
      "planSlug": "mega",
      "status": "ACTIVE",
      "totalAmount": 4999,
      "currency": "INR",
      "startDate": "2026-04-15T00:00:00.000Z",
      "expiresAt": "2026-07-15T00:00:00.000Z",
      "createdAt": "2026-04-15T00:00:00.000Z"
    }
  ]
}
```

`status` values:

- `coaching_subscription`: `ACTIVE | EXPIRED | CANCELLED`
- `program_purchase`: `PENDING | PAID | FAILED | REFUNDED`

---

# 2. Notifications

In-app feed of admin events. Currently fed by **two sources**, both fire automatically on the PENDING → PAID transition:

| Event                      | Source                                                                                     | Notification type            |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| Coaching subscription paid | `CoachingSubscriptionsService.verifyPayment` and `handleRazorpayPaymentCaptured` (webhook) | `COACHING_SUBSCRIPTION_PAID` |
| Program purchase paid      | `ProgramPurchasesService.markPaid` (called by both `verifyPayment` and the webhook)        | `PROGRAM_PURCHASE_PAID`      |

Both writers are **fire-and-forget** — a failure to record a notification can never roll back a captured payment. If the row insert fails, it's logged at `WARN` and the payment still completes.

> **Read state is global** (one `readAt` per row, not per-admin). When admin A marks something read, admin B sees it as read too. If you need per-admin state later we can add a join table — flagged in `src/admin-notifications/admin-notifications.service.ts`.

---

## `GET /admin/notifications`

List notifications, newest first. Use this for the admin dashboard's notification panel / inbox.

**Query params**

| Name         | Type                                                  | Default | Description                              |
| ------------ | ----------------------------------------------------- | ------- | ---------------------------------------- |
| `unreadOnly` | boolean                                               | `false` | When `true`, only `readAt IS NULL` rows. |
| `type`       | `COACHING_SUBSCRIPTION_PAID \| PROGRAM_PURCHASE_PAID` | —       | Filter to one event family.              |
| `limit`      | int                                                   | 50      | Max 200.                                 |
| `offset`     | int                                                   | 0       |                                          |

**Response (200)**

```json
{
  "total": 12,
  "unreadCount": 3,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "n1...",
      "type": "PROGRAM_PURCHASE_PAID",
      "title": "New program purchase",
      "message": "manthan@example.com bought \"9to5 Powerbuilder\" for ₹1,999",
      "payload": {
        "purchaseId": "p2...",
        "userId": "u1...",
        "userEmail": "manthan@example.com",
        "userName": "Manthan Tiwari",
        "programId": "...",
        "programSlug": "9to5-powerbuilder",
        "programName": "9to5 Powerbuilder",
        "amount": 1999,
        "currency": "INR"
      },
      "readAt": null,
      "createdAt": "2026-04-19T17:30:00.123Z"
    },
    {
      "id": "n0...",
      "type": "COACHING_SUBSCRIPTION_PAID",
      "title": "New coaching subscription",
      "message": "harsh@example.com subscribed to \"Grind Karo — MEGA\" for ₹4,999",
      "payload": {
        "subscriptionId": "s1...",
        "userId": "u2...",
        "userEmail": "harsh@example.com",
        "userName": null,
        "planId": "...",
        "planSlug": "mega",
        "planName": "Grind Karo — MEGA (Coaching for 3 Months)",
        "amount": 4999,
        "currency": "INR"
      },
      "readAt": "2026-04-19T18:00:00.000Z",
      "createdAt": "2026-04-19T17:00:00.000Z"
    }
  ]
}
```

`payload` is kind-specific — fields depend on `type`. The shape above is exhaustive for the current two writers; treat it as additive (FE should ignore unknown fields).

`unreadCount` in the response always reflects the global unread total (not just within this page or filter), so the bell badge in the UI can be updated from any list response.

---

## `GET /admin/notifications/unread-count`

Cheap count-only endpoint — single `COUNT(*)` query. Use this for the bell badge polling loop. Polling every 30s is fine.

**Response (200)**

```json
{ "unreadCount": 3 }
```

---

## `POST /admin/notifications/:id/read`

Mark one notification as read. Idempotent — calling on an already-read row returns it unchanged.

**Path**: `:id` is the notification UUID.

**Response (200)** — the updated notification (with `readAt` set).

```json
{
  "id": "n1...",
  "type": "PROGRAM_PURCHASE_PAID",
  "title": "New program purchase",
  "message": "...",
  "payload": { "...": "..." },
  "readAt": "2026-04-19T18:30:00.000Z",
  "createdAt": "2026-04-19T17:30:00.123Z"
}
```

**Errors**

- `404 "Notification not found"`.

---

## `POST /admin/notifications/read-all`

Bulk mark every unread notification as read.

**Response (200)**

```json
{ "markedRead": 7 }
```

---

## Quick curl recipes

```bash
# 1. List unread (so you can grab an id to mark)
curl -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/notifications?unreadOnly=true'

# 2. Mark one notification as read
curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/notifications/<NOTIFICATION_ID>/read

# 3. Mark every unread notification as read
curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/notifications/read-all

# 4. Cheap badge-poll (single COUNT query)
curl -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/notifications/unread-count

# 5. One-liner: grab the first unread id and mark it (handy for testing)
ID=$(curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/notifications?unreadOnly=true&limit=1' \
  | jq -r '.items[0].id')

curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  "http://localhost:3000/admin/notifications/$ID/read"
```

---

# 3. End-to-end admin app flows

### Notification bell (always-on)

1. On admin app load → `GET /admin/notifications/unread-count` → render the badge.
2. Poll `/admin/notifications/unread-count` every 30s; update the badge.
3. When the user clicks the bell → `GET /admin/notifications?unreadOnly=true&limit=20` → show the dropdown with newest unread.
4. On click of an item → `POST /admin/notifications/:id/read`. Optimistically remove from the unread list; refresh badge from the response's `unreadCount`.
5. "Mark all read" button → `POST /admin/notifications/read-all`.

Each notification's `payload.userId` / `payload.programId` / `payload.subscriptionId` lets you deep-link straight to the related row in the admin app (e.g. open the user's purchase history or the program's purchase list).

### Active customers leaderboard

1. `GET /admin/users/purchasers?limit=20` → top 20 most recent paying customers.
2. Click a row → `GET /admin/users/:id/purchases` to see what they bought across both domains in one mixed timeline.

### Searching for a specific signup

1. `GET /admin/users?q=harsh@gmail.com` → match by email.
2. Tap the row → `GET /admin/users/:id/purchases` for the full picture.

---

# 4. Data sources at a glance

```
┌─────────────────────────────────────┐
│         admin_notifications         │  ← read by GET /admin/notifications
└─────────────────────────────────────┘
                 ▲
                 │ inserted (fire-and-forget) on PAID transition
                 │
   ┌─────────────┴─────────────┐
   │                           │
┌──┴──────────────────┐  ┌─────┴────────────────┐
│ coaching_subscriptions │  │ program_purchases  │
└────────────────────────┘  └────────────────────┘
   │                           │
   │           ┌───────────────┘
   │           │
   ▼           ▼
┌─────────────────────┐  → GET /admin/users (every signup)
│       users         │  → GET /admin/users/purchasers (only buyers)
└─────────────────────┘  → GET /admin/users/:id/purchases (combined)
```

---

# 5. Quick-reference endpoint index

```
ADMIN — Users
  GET    /admin/users                  # all signups (q, role, limit, offset)
  GET    /admin/users/purchasers       # only users with ≥1 paid row (q, limit, offset)
  GET    /admin/users/:id              # one user (passwordHash scrubbed)
  GET    /admin/users/:id/purchases    # combined coaching + program timeline

ADMIN — Notifications
  GET    /admin/notifications              # list (unreadOnly, type, limit, offset)
  GET    /admin/notifications/unread-count # cheap badge poll
  POST   /admin/notifications/:id/read     # mark one read (idempotent)
  POST   /admin/notifications/read-all     # bulk mark read
```
