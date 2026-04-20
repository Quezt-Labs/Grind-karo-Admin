# Programs API — Admin App Reference

For the **admin app** — exercise library, program authoring (Blocks → Weeks → Days → Exercise rows + markdown resources), reviews moderation, purchase oversight. Client-facing endpoints are documented separately in [PROGRAMS_API_CLIENT.md](./PROGRAMS_API_CLIENT.md).

> All endpoints share the same base URL as the existing API. Auth is via the existing admin login flow — see the main [README.md](../README.md). Every endpoint below requires `Authorization: Bearer <accessToken>` where the JWT's `role === 'ADMIN'`. A non-admin JWT returns `403 "Admin access required"`.

---

## Conventions

| Concern             | Rule                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Money               | Integers in **INR rupees**. `1999` means ₹1,999.                                                                                        |
| Percent of 1RM      | **Basis points** in API (`5300 = 53.00%`).                                                                                              |
| Timestamps          | ISO 8601 strings.                                                                                                                       |
| IDs                 | UUIDv4.                                                                                                                                 |
| Soft vs hard delete | `?hard=true` query string toggles destructive delete. Default is soft (`isActive: false`).                                              |
| Errors              | `{ statusCode, message, error }`; `message` may be a string or array.                                                                   |
| Slug uniqueness     | Programs and exercises: globally unique. Blocks/resources: unique within their parent program. Weeks/days: number unique within parent. |

---

# 1. Exercise Library

Reusable movement library that program rows reference. Hybrid model: a program row may either link to an `exerciseId` here OR carry a free-text `exerciseNameOverride`.

| Method   | Endpoint                          | Purpose                               |
| -------- | --------------------------------- | ------------------------------------- |
| `GET`    | `/admin/exercises`                | List all (active + inactive)          |
| `GET`    | `/admin/exercises/:id`            | Get one                               |
| `POST`   | `/admin/exercises`                | Create                                |
| `PATCH`  | `/admin/exercises/:id`            | Update                                |
| `DELETE` | `/admin/exercises/:id?hard=false` | Soft-delete (default) or `?hard=true` |

### `POST /admin/exercises`

```json
{
  "slug": "high-bar-squat",
  "name": "High Bar Squat",
  "category": "SQUAT",
  "description": "Olympic-style high bar squat.",
  "videoUrl": "https://youtube.com/...",
  "isActive": true,
  "sortOrder": 0
}
```

`category` is one of `SQUAT | BENCH | DEADLIFT | ACCESSORY | OTHER`. `slug` is kebab-case and globally unique.

### Response shape

````json
{
  "id": "uuid",
  "slug": "high-bar-squat",
  "name": "High Bar Squat",
  "category": "SQUAT",
  "description": "Olympic-style high bar squat.",
  "videoUrl": "https://youtube.com/...",
  "isActive": true,
  "sortOrder": 0,
  "createdAt": "2026-04-19T10:00:00.000Z",
  "updatedAt": "2026-04-19T10:00:00.000Z"
}
```d

### Hard delete behaviour

Hard delete is safe — `program_exercises.exercise_id` is `ON DELETE SET NULL`, so historical program rows fall back to their `exerciseNameOverride` (or null) if the library row is removed.

---

# 2. Programs (top level)

| Method   | Endpoint                         | Purpose                                                               |
| -------- | -------------------------------- | --------------------------------------------------------------------- |
| `GET`    | `/admin/programs`                | List all programs (active + inactive)                                 |
| `GET`    | `/admin/programs/:id`            | Get one (top-level fields + review aggregates)                        |
| `GET`    | `/admin/programs/:id/tree`       | **Get full content tree** in one round-trip (use this for the editor) |
| `POST`   | `/admin/programs`                | Create                                                                |
| `PATCH`  | `/admin/programs/:id`            | Update                                                                |
| `DELETE` | `/admin/programs/:id?hard=false` | Soft-delete; `?hard=true` only allowed if no purchases exist          |

### `POST /admin/programs`

```json
{
  "slug": "9to5-powerbuilder",
  "name": "9to5 Powerbuilder",
  "tagline": "Designed for students and busy professionals.",
  "description": "Long-form description with markdown support.",
  "coverImageUrl": "https://cdn.../cover.jpg",
  "badge": "Gift",
  "regularPrice": 3499,
  "salePrice": 1999,
  "currency": "INR",
  "liftingFrequency": "4 days/week",
  "programLengthWeeks": 12,
  "highlights": ["Bodybuilding-specific exercises", "Built-in deload week"],
  "displayOrder": 1,
  "isActive": true
}
````

- `salePrice` is nullable. When set, FE displays it as the headline price with `regularPrice` struck through.
- `highlights` is a string array — bullet points on the catalog card and detail page.
- `slug` is kebab-case and globally unique.

### `GET /admin/programs/:id/tree`

Returns the program plus all `blocks` (with nested `weeks` → `days` → `exercises`) plus `resources`. Same shape as the owner-facing `/programs/:programId/content`, but no lifetime check. Use this as the single source of truth for the editor — re-fetch after any batch of mutations to refresh state.

### `DELETE /admin/programs/:id?hard=true` error

```json
{
  "statusCode": 409,
  "message": "Program has existing purchases and cannot be hard-deleted; use soft delete instead.",
  "error": "Conflict"
}
```

---

# 3. Content tree (Blocks → Weeks → Days → Exercise rows)

All routes are nested under `/admin/programs/:programId/...`. The path is intentional — every nested route verifies the child belongs to that program (defense against UUID-guessing). If you address a child by id only (PATCH/DELETE), the URL still includes `:programId` and the server verifies it.

## 3.1 Blocks

A "block" maps to one workbook sheet — `Program 1`, `Deload`, `Peak`, etc.

| Method   | Endpoint                                     | Purpose                                   |
| -------- | -------------------------------------------- | ----------------------------------------- |
| `GET`    | `/admin/programs/:programId/blocks`          | List blocks                               |
| `GET`    | `/admin/programs/:programId/blocks/:blockId` | Get one                                   |
| `POST`   | `/admin/programs/:programId/blocks`          | Create                                    |
| `PATCH`  | `/admin/programs/:programId/blocks/:blockId` | Update                                    |
| `DELETE` | `/admin/programs/:programId/blocks/:blockId` | Delete (cascades to weeks/days/exercises) |

### `POST .../blocks`

```json
{
  "slug": "program-1",
  "name": "Program 1",
  "blockType": "MAIN",
  "description": null,
  "displayOrder": 0
}
```

`blockType`: `MAIN | DELOAD | PEAK | CUSTOM`. Slug must be unique within the program.

## 3.2 Weeks

| Method   | Endpoint                                           | Purpose                  |
| -------- | -------------------------------------------------- | ------------------------ |
| `GET`    | `/admin/programs/:programId/blocks/:blockId/weeks` | List weeks under a block |
| `POST`   | `/admin/programs/:programId/blocks/:blockId/weeks` | Create                   |
| `PATCH`  | `/admin/programs/:programId/weeks/:weekId`         | Update                   |
| `DELETE` | `/admin/programs/:programId/weeks/:weekId`         | Delete (cascade)         |

### `POST .../blocks/:blockId/weeks`

```json
{
  "weekNumber": 1,
  "title": "WEEK 1",
  "notes": null
}
```

`weekNumber` must be unique within the block. Conflicts return `409`.

## 3.3 Days

| Method   | Endpoint                                        | Purpose                |
| -------- | ----------------------------------------------- | ---------------------- |
| `GET`    | `/admin/programs/:programId/weeks/:weekId/days` | List days under a week |
| `POST`   | `/admin/programs/:programId/weeks/:weekId/days` | Create                 |
| `PATCH`  | `/admin/programs/:programId/days/:dayId`        | Update                 |
| `DELETE` | `/admin/programs/:programId/days/:dayId`        | Delete (cascade)       |

### `POST .../weeks/:weekId/days`

```json
{
  "dayNumber": 1,
  "title": "DAY 1",
  "focus": "lower",
  "notes": null
}
```

`dayNumber` unique within the week. `focus` is free-text (`"lower"`, `"upper"`, `"full body"`, etc.).

## 3.4 Exercise rows

The leaf nodes — one row per planned exercise on a day.

| Method   | Endpoint                                           | Purpose                                           |
| -------- | -------------------------------------------------- | ------------------------------------------------- |
| `GET`    | `/admin/programs/:programId/days/:dayId/exercises` | List rows on a day (with hydrated `resolvedName`) |
| `POST`   | `/admin/programs/:programId/days/:dayId/exercises` | Add a row                                         |
| `PATCH`  | `/admin/programs/:programId/exercises/:rowId`      | Update                                            |
| `DELETE` | `/admin/programs/:programId/exercises/:rowId`      | Delete                                            |

### `POST .../days/:dayId/exercises`

```json
{
  "sortOrder": 0,
  "category": "SQUAT",
  "exerciseId": "<exercise-library-uuid-or-null>",
  "exerciseNameOverride": null,
  "sets": 3,
  "repScheme": "5",
  "targetRpe": "@7",
  "percentOneRm": 7500,
  "loadNote": null,
  "notes": null
}
```

**Validation rules:**

- Either `exerciseId` (FK to library) **OR** `exerciseNameOverride` (free-text) must be set. If neither is provided → `400 "Either exerciseId or exerciseNameOverride must be provided"`.
- Slash-entries like `"lunges/bss/leg press"` typically use `exerciseNameOverride` because they don't map to a single library row.
- `category`: `SQUAT | BENCH | DEADLIFT | ACCESSORY | OTHER`.
- `percentOneRm` is in **basis points** (`5300 = 53.00%`). Pass `null` for RPE-only or accessory rows.
- `sets` is nullable for rows where the scheme says "TILL FAILURE" or similar.
- `repScheme`, `targetRpe`, `loadNote`, `notes` are all free-text (preserve workbook flexibility like `"5-8"`, `"AMRAP"`, `"ascending sets @8,9,9"`).

### Reordering

Update `sortOrder` via `PATCH .../exercises/:rowId`. The list endpoint orders by `sortOrder` ascending. There is **no batch reorder** endpoint — issue one PATCH per row that moves.

---

# 4. Resources (markdown reference pages)

Replaces the workbook tabs (Warmup, Movement selection guide, Bro day, Next step, etc.). Body is markdown, rendered client-side.

| Method   | Endpoint                                           | Purpose |
| -------- | -------------------------------------------------- | ------- |
| `GET`    | `/admin/programs/:programId/resources`             | List    |
| `GET`    | `/admin/programs/:programId/resources/:resourceId` | Get one |
| `POST`   | `/admin/programs/:programId/resources`             | Create  |
| `PATCH`  | `/admin/programs/:programId/resources/:resourceId` | Update  |
| `DELETE` | `/admin/programs/:programId/resources/:resourceId` | Delete  |

### `POST .../resources`

```json
{
  "slug": "warmup",
  "title": "Warmup",
  "body": "# Warmup\n\nUse the built-in calculator...",
  "sortOrder": 0
}
```

`slug` is kebab-case and unique within the program.

---

# 5. Reviews moderation

| Method   | Endpoint                                                  | Purpose                           |
| -------- | --------------------------------------------------------- | --------------------------------- |
| `GET`    | `/admin/program-reviews?programId=...&limit=100&offset=0` | List with optional program filter |
| `DELETE` | `/admin/program-reviews/:id`                              | Hard-delete a review              |

> Mounted at `/admin/program-reviews` (not `/admin/programs/reviews`) to avoid colliding with `/admin/programs/:id` route resolution.

### `GET /admin/program-reviews` query params

- `programId` (uuid, optional) — filter to one program.
- `limit` (int, default `100`).
- `offset` (int, default `0`).

Each row in the response includes a `program` relation (program name + slug for display).

---

# 6. Purchase oversight

| Method | Endpoint                                                        | Purpose                                                             |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET`  | `/admin/program-purchases?status=PAID&userId=...&programId=...` | List with filters                                                   |
| `GET`  | `/admin/program-purchases/:id`                                  | Get one (with `program` + `user` hydrated; `passwordHash` scrubbed) |
| `POST` | `/admin/program-purchases/:id/refund`                           | Mark `REFUNDED` (revokes runtime access)                            |

### `GET /admin/program-purchases` query params

- `status` (optional): `PENDING | PAID | FAILED | REFUNDED`.
- `userId` (uuid, optional).
- `programId` (uuid, optional).

Sorted newest first. `program` and `user` are hydrated; `user.passwordHash` is never included.

### `POST /admin/program-purchases/:id/refund`

**Important: this endpoint is bookkeeping only — it does NOT call Razorpay.**

Workflow:

1. Issue the actual refund manually from the Razorpay dashboard.
2. Call this endpoint to flip the row to `REFUNDED`.
3. The user immediately loses runtime access (`assertUserOwnsProgram` only matches `PAID`, not `REFUNDED`).

**Response (200)** — the updated `ProgramPurchase` row.

**Errors**

- `400 "Cannot refund a purchase in status PENDING"` (or `FAILED`/`REFUNDED`) — only `PAID` rows can transition to `REFUNDED`.
- `404 "Purchase not found"`.

---

# 7. Razorpay webhook (machine-only)

`POST /webhooks/razorpay`

You don't normally call this from the admin app — Razorpay configures it once in their dashboard and it fires server-to-server. Documented here for ops awareness.

- Excluded from Swagger.
- Signed with `X-Razorpay-Signature` header (HMAC-SHA256 over the raw body using `RAZORPAY_WEBHOOK_SECRET`).
- Multi-domain dispatcher: routes to `program_purchase` or `coaching_subscription` based on `payment.notes.kind`, falling through to the other handler if the order id is unknown to the first.
- Idempotent — safe to receive duplicates.
- Always returns `200` on valid signatures (failures surface through logs/alerting, not retries).

---

# 8. End-to-end admin app flow

### Authoring a new program from scratch

1. `POST /admin/programs` with the catalog metadata (slug, name, prices, highlights). Save the returned `id`.
2. `POST /admin/programs/:programId/blocks` once per training block (`Program 1`, `Deload`, `Peak`, ...).
3. For each block: `POST /admin/programs/:programId/blocks/:blockId/weeks` for week 1..N.
4. For each week: `POST /admin/programs/:programId/weeks/:weekId/days` for day 1..N.
5. For each day: `POST /admin/programs/:programId/days/:dayId/exercises` per row. Reference the library via `exerciseId` when possible; fall back to `exerciseNameOverride` for slash-entries.
6. Add markdown resources via `POST /admin/programs/:programId/resources` (Warmup, Movement guide, Next step).
7. `GET /admin/programs/:programId/tree` to verify the full shape end-to-end.
8. Set `isActive: true` (already the default) — the program is now live in the shop.

### Editing an existing program

1. `GET /admin/programs/:id/tree` to load editor state.
2. Mutate via the relevant nested endpoints. Reorder rows by PATCHing `sortOrder`.
3. After each batch, re-fetch `/tree` to refresh.

### Building the exercise library

1. `GET /admin/exercises` to see what already exists.
2. `POST /admin/exercises` to add new movements (with `videoUrl` for instructional clips).
3. Inactive exercises stay in the DB but disappear from `GET /exercises` (the public endpoint). Useful for seasonal removals.

### Soft-launching / hiding a program

`PATCH /admin/programs/:id` with `{ "isActive": false }` — disappears from the public catalog and `POST /programs/purchases` rejects new orders, but existing owners keep runtime access (uses the looser `findById` lookup, not `assertActiveProgram`).

### Refunding a purchase

1. Process the refund in the Razorpay dashboard.
2. `POST /admin/program-purchases/:id/refund`.
3. The user loses runtime access immediately.

---

# 9. Common error responses

| Status | Meaning                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `400`  | Validation failure or business-rule violation (e.g. `"Either exerciseId or exerciseNameOverride must be provided"`). |
| `401`  | Missing/invalid JWT.                                                                                                 |
| `403`  | JWT valid but `role !== 'ADMIN'`.                                                                                    |
| `404`  | Resource not found, or nested resource doesn't belong to the parent in the URL.                                      |
| `409`  | Slug clash, week-number clash, day-number clash, or hard-delete with dependents.                                     |

Standard envelope:

```json
{
  "statusCode": 409,
  "message": "Block with slug \"program-1\" already exists in this program",
  "error": "Conflict"
}
```

---

# 10. Quick-reference endpoint index

```
ADMIN — Exercise library
  GET    /admin/exercises
  GET    /admin/exercises/:id
  POST   /admin/exercises
  PATCH  /admin/exercises/:id
  DELETE /admin/exercises/:id?hard=false

ADMIN — Programs (top-level)
  GET    /admin/programs
  GET    /admin/programs/:id
  GET    /admin/programs/:id/tree
  POST   /admin/programs
  PATCH  /admin/programs/:id
  DELETE /admin/programs/:id?hard=false

ADMIN — Content tree (nested under :programId)
  GET    /admin/programs/:programId/blocks
  GET    /admin/programs/:programId/blocks/:blockId
  POST   /admin/programs/:programId/blocks
  PATCH  /admin/programs/:programId/blocks/:blockId
  DELETE /admin/programs/:programId/blocks/:blockId

  GET    /admin/programs/:programId/blocks/:blockId/weeks
  POST   /admin/programs/:programId/blocks/:blockId/weeks
  PATCH  /admin/programs/:programId/weeks/:weekId
  DELETE /admin/programs/:programId/weeks/:weekId

  GET    /admin/programs/:programId/weeks/:weekId/days
  POST   /admin/programs/:programId/weeks/:weekId/days
  PATCH  /admin/programs/:programId/days/:dayId
  DELETE /admin/programs/:programId/days/:dayId

  GET    /admin/programs/:programId/days/:dayId/exercises
  POST   /admin/programs/:programId/days/:dayId/exercises
  PATCH  /admin/programs/:programId/exercises/:rowId
  DELETE /admin/programs/:programId/exercises/:rowId

  GET    /admin/programs/:programId/resources
  GET    /admin/programs/:programId/resources/:resourceId
  POST   /admin/programs/:programId/resources
  PATCH  /admin/programs/:programId/resources/:resourceId
  DELETE /admin/programs/:programId/resources/:resourceId

ADMIN — Reviews moderation
  GET    /admin/program-reviews
  DELETE /admin/program-reviews/:id

ADMIN — Purchase oversight
  GET    /admin/program-purchases
  GET    /admin/program-purchases/:id
  POST   /admin/program-purchases/:id/refund

WEBHOOK (machine, signed)
  POST   /webhooks/razorpay
```
