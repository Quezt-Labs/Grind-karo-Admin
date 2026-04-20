# Landing Page API

Configuration for the marketing landing page — hero banner (web + mobile), hero video, title, subtitle, optional CTA, and a sortable image carousel (web + mobile per slide).

Two audiences:

- **Client app** (public, no auth) — one read endpoint that always returns the currently-active configuration.
- **Admin app** (admin JWT) — full CRUD over configurations + carousel items, plus a publish (activate) action.

> The DB allows multiple configurations to exist (drafts), but exactly **one** row is `isActive` at a time. Activation is enforced in code: setting `isActive: true` on row X atomically clears it on every other row.

---

## Conventions

| Concern            | Rule                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Image / video URLs | Full HTTPS URLs. Upload via the existing `/upload` infrastructure, then paste the resulting CDN URL into the relevant field.               |
| Web vs Mobile      | Each visual asset has separate `*WebUrl` and `*MobileUrl` fields. The FE picks based on viewport — the server does not inspect User-Agent. |
| Timestamps         | ISO 8601 strings.                                                                                                                          |
| IDs                | UUIDv4.                                                                                                                                    |
| Errors             | `{ statusCode, message, error }` envelope.                                                                                                 |

---

# 1. Client (Public)

### `GET /landing-page`

Returns the currently active landing page configuration with all carousel items (sorted by `sortOrder` ascending). Returns **`null`** (not `404`) if nothing is published yet — the FE should render its own default landing state in that case.

**Response (200) — published**

```json
{
  "id": "lp1...",
  "name": "Diwali 2026 sale",
  "heroBannerWebUrl": "https://cdn.grindkaro.in/landing/diwali-hero-web.jpg",
  "heroBannerMobileUrl": "https://cdn.grindkaro.in/landing/diwali-hero-mobile.jpg",
  "heroBannerAlt": "Diwali strength sale — up to 50% off",
  "heroBannerLinkUrl": "https://www.grindkaro.in/shop",
  "heroVideoUrl": "https://cdn.grindkaro.in/landing/intro.mp4",
  "heroVideoPosterUrl": "https://cdn.grindkaro.in/landing/intro-poster.jpg",
  "title": "The grind starts with a plan",
  "subtitle": "Pick yours. Built by powerlifters, for powerlifters.",
  "ctaLabel": "Shop programs",
  "ctaUrl": "https://www.grindkaro.in/shop",
  "isActive": true,
  "createdAt": "2026-04-19T10:00:00.000Z",
  "updatedAt": "2026-04-19T10:00:00.000Z",
  "carouselItems": [
    {
      "id": "ci1...",
      "configurationId": "lp1...",
      "imageWebUrl": "https://cdn.grindkaro.in/landing/slide-1-web.jpg",
      "imageMobileUrl": "https://cdn.grindkaro.in/landing/slide-1-mobile.jpg",
      "alt": "Gorilla Strength program",
      "title": "Gorilla Strength 2.0",
      "subtitle": "Raw strength + muscle in 10 weeks",
      "linkUrl": "https://www.grindkaro.in/shop/gorilla-strength",
      "sortOrder": 0,
      "createdAt": "2026-04-19T10:00:00.000Z",
      "updatedAt": "2026-04-19T10:00:00.000Z"
    },
    {
      "id": "ci2...",
      "configurationId": "lp1...",
      "imageWebUrl": "https://cdn.grindkaro.in/landing/slide-2-web.jpg",
      "imageMobileUrl": "https://cdn.grindkaro.in/landing/slide-2-mobile.jpg",
      "alt": "9to5 Powerbuilder program",
      "title": "9to5 Powerbuilder",
      "subtitle": "Designed for busy professionals",
      "linkUrl": "https://www.grindkaro.in/shop/9to5-powerbuilder",
      "sortOrder": 1,
      "createdAt": "2026-04-19T10:00:00.000Z",
      "updatedAt": "2026-04-19T10:00:00.000Z"
    }
  ]
}
```

**Response (200) — nothing published yet**

```json
null
```

**Rendering tips for the FE:**

- Pick `heroBannerWebUrl` vs `heroBannerMobileUrl` based on viewport (e.g. CSS `picture` element with media queries, or JS at hydration).
- `heroVideoUrl` is single-source. Pair with `heroVideoPosterUrl` for the poster attribute on `<video>`.
- All "link" URLs (`heroBannerLinkUrl`, `ctaUrl`, carousel item `linkUrl`) are optional — only render the click target when present.
- Carousel items already arrive in display order; do not re-sort on the FE.

---

# 2. Admin (Admin JWT)

All endpoints require `Authorization: Bearer <accessToken>` where `role === 'ADMIN'`.

## Configurations

### `GET /admin/landing-page`

List every configuration (active + drafts), oldest first.

**Response (200)**: array of configurations (top-level fields only — no carousel items).

### `GET /admin/landing-page/:id`

Get a single configuration with carousel items hydrated. Same shape as the public `GET /landing-page` response.

### `POST /admin/landing-page`

Create a new configuration. By default it's a draft (`isActive: false`). Pass `isActive: true` in the body to publish immediately — every other configuration is deactivated atomically.

**Request**

```json
{
  "name": "Diwali 2026 sale",
  "heroBannerWebUrl": "https://cdn.grindkaro.in/landing/diwali-hero-web.jpg",
  "heroBannerMobileUrl": "https://cdn.grindkaro.in/landing/diwali-hero-mobile.jpg",
  "heroBannerAlt": "Diwali strength sale — up to 50% off",
  "heroBannerLinkUrl": "https://www.grindkaro.in/shop",
  "heroVideoUrl": "https://cdn.grindkaro.in/landing/intro.mp4",
  "heroVideoPosterUrl": "https://cdn.grindkaro.in/landing/intro-poster.jpg",
  "title": "The grind starts with a plan",
  "subtitle": "Pick yours.",
  "ctaLabel": "Shop programs",
  "ctaUrl": "https://www.grindkaro.in/shop",
  "isActive": false
}
```

Required: `name`, `title`. Everything else is optional (FE renders only what's present).

**Response (201)**: the created configuration (without carousel items — that array is always empty on a new row).

### `PATCH /admin/landing-page/:id`

Update any subset of fields. Setting `isActive: true` here also deactivates every other configuration. Setting `isActive: false` only deactivates this one.

**Response (200)**: the updated configuration.

### `POST /admin/landing-page/:id/activate`

The "Publish" button. Idempotent — flips `isActive` to true on this row and false on every other row.

**Response (200)**: the activated configuration.

### `POST /admin/landing-page/:id/deactivate`

Take this configuration offline. After this call, `GET /landing-page` returns `null` until another configuration is activated.

**Response (200)**: the updated (deactivated) configuration.

### `DELETE /admin/landing-page/:id`

Hard delete (cascades to all of this configuration's carousel items).

**Response (200)**

```json
{ "id": "lp1...", "deleted": true }
```

## Carousel items

All nested under `/admin/landing-page/:id/carousel-items` so the service can verify the item belongs to that configuration.

### `GET /admin/landing-page/:id/carousel-items`

List items for a configuration, ordered by `sortOrder` ascending.

### `POST /admin/landing-page/:id/carousel-items`

Add a new item.

**Request**

```json
{
  "imageWebUrl": "https://cdn.grindkaro.in/landing/slide-3-web.jpg",
  "imageMobileUrl": "https://cdn.grindkaro.in/landing/slide-3-mobile.jpg",
  "alt": "Cobra Power program",
  "title": "Cobra Power 2.0",
  "subtitle": "Continuation of Gorilla — singles + peaking",
  "linkUrl": "https://www.grindkaro.in/shop/cobra-strength",
  "sortOrder": 2
}
```

Required: `imageWebUrl`, `imageMobileUrl`. Everything else is optional.

**Response (201)**: the created carousel item.

### `PATCH /admin/landing-page/:id/carousel-items/:itemId`

Update any subset of fields. Use this for **reordering** — change `sortOrder` and the item moves on the next render.

**Response (200)**: the updated item.

### `DELETE /admin/landing-page/:id/carousel-items/:itemId`

Hard delete.

**Response (200)**

```json
{ "id": "ci3...", "deleted": true }
```

---

# 3. End-to-end admin flow

### Building a fresh landing page from scratch

1. Upload all artwork via the existing `/upload` endpoints — note the resulting CDN URLs.
2. `POST /admin/landing-page` with the hero banner URLs, hero video URL (optional), title, subtitle, CTA. Leave `isActive: false` to keep it a draft.
3. For each slide:
   `POST /admin/landing-page/:id/carousel-items` with `imageWebUrl`, `imageMobileUrl`, optional `linkUrl`, etc. Use ascending `sortOrder` (0, 1, 2…) to control display order.
4. Preview in the admin app via `GET /admin/landing-page/:id` (returns the same shape the public endpoint will eventually serve).
5. When ready: `POST /admin/landing-page/:id/activate`. The previously-active configuration is automatically deactivated.

### Iterating on a live page

1. Start from the active config: `GET /admin/landing-page` → find the row with `isActive: true`.
2. Edit fields with `PATCH /admin/landing-page/:id` — changes go live immediately.
3. Reorder carousel slides by PATCHing each item's `sortOrder`.

### A/B-style swap

1. Build a second config in parallel with `POST /admin/landing-page` (draft).
2. Iterate. Preview via `GET /admin/landing-page/:id`.
3. Switch over with `POST /admin/landing-page/:newId/activate`. The old config is deactivated atomically — no period where two configs are both active.
4. Roll back instantly by activating the old one again.

---

# 4. Quick curl recipes

```bash
# Client — fetch the live landing page (no auth)
curl http://localhost:3000/landing-page

# Admin — list every configuration
curl -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/landing-page

# Admin — create a draft
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H 'Content-Type: application/json' \
  http://localhost:3000/admin/landing-page \
  -d '{
    "name": "Diwali 2026 sale",
    "title": "The grind starts with a plan",
    "subtitle": "Pick yours.",
    "heroBannerWebUrl": "https://cdn.grindkaro.in/landing/hero-web.jpg",
    "heroBannerMobileUrl": "https://cdn.grindkaro.in/landing/hero-mobile.jpg",
    "ctaLabel": "Shop programs",
    "ctaUrl": "https://www.grindkaro.in/shop"
  }'

# Admin — add a carousel slide
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H 'Content-Type: application/json' \
  http://localhost:3000/admin/landing-page/<CONFIG_ID>/carousel-items \
  -d '{
    "imageWebUrl": "https://cdn.grindkaro.in/landing/slide-1-web.jpg",
    "imageMobileUrl": "https://cdn.grindkaro.in/landing/slide-1-mobile.jpg",
    "alt": "Gorilla Strength program",
    "title": "Gorilla Strength 2.0",
    "linkUrl": "https://www.grindkaro.in/shop/gorilla-strength",
    "sortOrder": 0
  }'

# Admin — publish the draft
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/admin/landing-page/<CONFIG_ID>/activate

# Admin — reorder slide 3 to front
curl -X PATCH -H "Authorization: Bearer $ADMIN_JWT" \
  -H 'Content-Type: application/json' \
  http://localhost:3000/admin/landing-page/<CONFIG_ID>/carousel-items/<ITEM_ID> \
  -d '{ "sortOrder": 0 }'
```

---

# 5. Quick-reference endpoint index

```
PUBLIC
  GET    /landing-page                                            # active config + items, or null

ADMIN
  GET    /admin/landing-page                                      # list all (active + drafts)
  GET    /admin/landing-page/:id                                  # one config + items
  POST   /admin/landing-page                                      # create
  PATCH  /admin/landing-page/:id                                  # update
  POST   /admin/landing-page/:id/activate                         # publish (deactivates others)
  POST   /admin/landing-page/:id/deactivate                       # take offline
  DELETE /admin/landing-page/:id                                  # hard delete (cascade)

  GET    /admin/landing-page/:id/carousel-items                   # list items
  POST   /admin/landing-page/:id/carousel-items                   # add item
  PATCH  /admin/landing-page/:id/carousel-items/:itemId           # update / reorder via sortOrder
  DELETE /admin/landing-page/:id/carousel-items/:itemId           # delete
```
