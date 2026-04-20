# Contact API

Contact-form inbox. Anyone can POST a message; admins list, read, and delete via admin-only endpoints.

Two audiences:

- **Client app** (public, no auth) — one POST endpoint.
- **Admin app** (admin JWT) — list / detail / mark-read / delete.

---

## Conventions

| Concern             | Rule                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auth                | Public `POST /contact`. All `/admin/contact-submissions/*` require `Authorization: Bearer <accessToken>` with `role === 'ADMIN'`. |
| Rate limiting       | Public endpoint inherits the global limiter (`100 req / 60s` per IP) — same config as every other public route.                   |
| Email normalisation | Email is stored **lowercased and trimmed** so admin search is case-insensitive.                                                   |
| Timestamps          | ISO 8601 strings.                                                                                                                 |
| IDs                 | UUIDv4.                                                                                                                           |
| Errors              | `{ statusCode, message, error }` envelope.                                                                                        |

---

# 1. Client (Public)

### `POST /contact`

Submit a contact-form message.

**Request**

```json
{
  "name": "Manthan Tiwari",
  "email": "manthan@example.com",
  "subject": "Question about Gorilla Strength",
  "message": "Hi! I wanted to ask about the deload week structure..."
}
```

**Validation**

| Field     | Rule                               |
| --------- | ---------------------------------- |
| `name`    | required, 1–120 chars              |
| `email`   | required, valid email, ≤ 240 chars |
| `subject` | required, 1–240 chars              |
| `message` | required, 1–5000 chars             |

**Response (201)**

```json
{
  "id": "c1...",
  "name": "Manthan Tiwari",
  "email": "manthan@example.com",
  "subject": "Question about Gorilla Strength",
  "message": "Hi! I wanted to ask about the deload week structure...",
  "readAt": null,
  "createdAt": "2026-04-19T17:30:00.000Z"
}
```

**Errors**

- `400` — validation failure; `message` is an array of field-level errors.

---

# 2. Admin (Admin JWT)

All endpoints require admin JWT.

### `GET /admin/contact-submissions`

List submissions, newest first.

**Query params**

| Name         | Type    | Default | Description                                               |
| ------------ | ------- | ------- | --------------------------------------------------------- |
| `q`          | string  | —       | Substring match against name, email, subject, or message. |
| `unreadOnly` | boolean | `false` | When `true`, only `readAt IS NULL` rows.                  |
| `limit`      | int     | 50      | Max 500.                                                  |
| `offset`     | int     | 0       |                                                           |

**Response (200)**

```json
{
  "total": 42,
  "unreadCount": 7,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "c1...",
      "name": "Manthan Tiwari",
      "email": "manthan@example.com",
      "subject": "Question about Gorilla Strength",
      "message": "Hi! I wanted to ask about the deload week structure...",
      "readAt": null,
      "createdAt": "2026-04-19T17:30:00.000Z"
    }
  ]
}
```

`unreadCount` always reflects the **global** unread total (not just the current page/filter), so the bell badge in the admin UI updates from any list call.

### `GET /admin/contact-submissions/:id`

Fetch a single submission.

**Response (200)** — same shape as an item in the list response.

**Errors**

- `404 "Contact submission not found"`.

### `POST /admin/contact-submissions/:id/read`

Mark a submission as read. Idempotent — calling on an already-read row returns it unchanged.

**Response (200)** — the updated submission (with `readAt` set).

### `DELETE /admin/contact-submissions/:id`

Hard-delete a submission (spam cleanup).

**Response (200)**

```json
{ "id": "c1...", "deleted": true }
```

---

# 3. Quick curl recipes

```bash
# Client — submit a contact form
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:3000/contact \
  -d '{
    "name": "Manthan Tiwari",
    "email": "manthan@example.com",
    "subject": "Question about Gorilla Strength",
    "message": "Hi! I wanted to ask about the deload week structure..."
  }'

# Admin — list unread
curl -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/contact-submissions?unreadOnly=true'

# Admin — search by keyword
curl -H "Authorization: Bearer $ADMIN_JWT" \
  'http://localhost:3000/admin/contact-submissions?q=deload'

# Admin — mark a single submission as read
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/contact-submissions/<SUBMISSION_ID>/read

# Admin — delete a spam submission
curl -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/contact-submissions/<SUBMISSION_ID>
```

---

# 4. Quick-reference endpoint index

```
PUBLIC
  POST   /contact                                    # submit a contact-form message

ADMIN
  GET    /admin/contact-submissions                  # list (q, unreadOnly, limit, offset)
  GET    /admin/contact-submissions/:id              # one submission
  POST   /admin/contact-submissions/:id/read         # mark read (idempotent)
  DELETE /admin/contact-submissions/:id              # hard delete
```
