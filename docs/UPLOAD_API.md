# Upload API

Two upload paths, both writing to the same S3 bucket → same CloudFront URL.
Pick by size.

| Use case                                             | Endpoint                                     | Path                                        | Auth                                             |
| ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Small files (≤ a few MB — images, CSVs, short PDFs). | `POST /upload`                               | Server-buffered. Bytes flow API → S3.       | None (current state). Admin-only is recommended. |
| **Anything bigger — especially videos.**             | `POST /upload/presign` → browser PUTs to S3. | Direct-to-S3. **API never sees the bytes.** | Admin JWT.                                       |

If you're hitting `413 Request Entity Too Large`, you're on the wrong
endpoint — switch to `/upload/presign`. Reverse-proxy body caps (nginx
`client_max_body_size`, Cloudflare's 100 MB free-tier cap, API Gateway's
10 MB hard cap) don't apply when the browser talks straight to S3.

Size caps per category are identical on both paths:

| Category                                                         | Max        |
| ---------------------------------------------------------------- | ---------- |
| Video (`video/mp4`, `video/webm`, `video/mpeg`)                  | **150 MB** |
| PDF (`application/pdf`)                                          | 50 MB      |
| CSV (`text/csv`, `application/csv`)                              | 10 MB      |
| Image (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`) | 2 MB       |

---

## 1. Server-buffered — `POST /upload`

```
POST /upload
Content-Type: multipart/form-data
Body: file=<blob>
```

Response (200):

```json
{
  "key": "images/21042026/a1b2c3...",
  "baseUrl": "https://d109f0isvw4b71.cloudfront.net/",
  "url": "https://d109f0isvw4b71.cloudfront.net/images/21042026/a1b2c3..."
}
```

Use for anything small. Over the cap → `400` with a human-readable
message.

---

## 2. Presigned POST — `POST /upload/presign` _(use for videos)_

### 2.1 How the flow works

```
 FE                      API                    S3
 │ POST /upload/presign   │                      │
 │ { filename,            │                      │
 │   contentType,         │                      │
 │   sizeBytes? }         │                      │
 │ ─────────────────────▶ │                      │
 │                        │                      │
 │ 201 { url, fields,     │                      │
 │       key,             │                      │
 │       cloudfrontUrl,   │                      │
 │       maxSizeBytes,    │                      │
 │       expiresInSeconds:600 }                  │
 │ ◀───────────────────── │                      │
 │                                               │
 │ POST <url>  multipart/form-data               │
 │   <every `fields` entry as hidden form field>│
 │   file=<blob>                                 │
 │ ─────────────────────────────────────────────▶│
 │                                               │
 │ 204 (no body) on success                      │
 │ ◀─────────────────────────────────────────────│
 │                                               │
 │ use `cloudfrontUrl` from the presign response │
```

- The API signs a policy with four locked conditions: **bucket, exact key,
  exact Content-Type, `content-length-range`**. S3 enforces all four.
- The client can't override the key, MIME, or size — tamper attempts get
  rejected by S3 with 403.
- No `Authorization` header on the S3 upload — the policy in `fields` is
  what authorises it.

### 2.2 Request

```
POST /upload/presign
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "filename":    "diwali-hero.mp4",
  "contentType": "video/mp4",
  "sizeBytes":   24870000            // optional
}
```

| Field         | Rules                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filename`    | Only used to preserve the extension in the generated S3 key. The actual key is randomised server-side.                                                                                                   |
| `contentType` | Must be one of the allowed MIME types above. `400` otherwise.                                                                                                                                            |
| `sizeBytes`   | _Optional._ Integer bytes. Server rejects `400` here if it already exceeds the category cap — nicer UX than letting the user watch a long upload fail. Omitting is safe; S3 enforces the cap regardless. |

### 2.3 Response (201)

```json
{
  "key": "video/21042026/91e1f8a3...mp4",
  "url": "https://grindkaro-media.s3.ap-south-1.amazonaws.com/",
  "fields": {
    "Content-Type": "video/mp4",
    "key": "video/21042026/91e1f8a3...mp4",
    "bucket": "grindkaro-media",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "AKIA.../20260421/ap-south-1/s3/aws4_request",
    "X-Amz-Date": "20260421T000000Z",
    "Policy": "eyJleHBpcmF0aW9uIjoiMjAy...",
    "X-Amz-Signature": "b1c9..."
  },
  "cloudfrontUrl": "https://d109f0isvw4b71.cloudfront.net/video/21042026/91e1f8a3...mp4",
  "expiresInSeconds": 600,
  "maxSizeBytes": 157286400
}
```

Persist `cloudfrontUrl` on your entity after the S3 upload completes
(step 2.4). It's live the moment S3 has the object.

### 2.4 FE upload code (browser)

```ts
async function uploadLargeFile(file: File): Promise<string> {
  // 1. Ask the API for a presigned policy.
  const presign = await fetch(`${API}/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminJwt}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type, // must match the MIME the server signed
      sizeBytes: file.size, // optional but nicer for error UX
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`presign failed: ${r.status}`);
    return r.json();
  });

  // 2. Build a multipart body. ORDER MATTERS: all policy fields first,
  //    `file` MUST be the LAST form field.
  const form = new FormData();
  for (const [k, v] of Object.entries(presign.fields)) {
    form.append(k, v as string);
  }
  form.append("file", file);

  // 3. Upload straight to S3. No Authorization header — the signed Policy
  //    inside `form` is what authorises it.
  const s3Res = await fetch(presign.url, {
    method: "POST",
    body: form,
    // DO NOT set Content-Type manually — the browser must pick its own
    // multipart/form-data; boundary=... header.
  });
  if (!s3Res.ok) {
    const text = await s3Res.text(); // S3 error XML
    throw new Error(`S3 upload failed: ${s3Res.status} ${text}`);
  }

  // 4. cloudfrontUrl is live the moment the S3 POST returns 204.
  return presign.cloudfrontUrl;
}
```

Upload progress (for a progress bar) works the same way as any other
`fetch`/`XHR`/`axios` — use `XMLHttpRequest` with `upload.onprogress` if
you need it; `fetch` doesn't expose upload progress yet.

### 2.5 Common errors

| Status                | Source      | Meaning                                                                                                                           | Fix                                                                |
| --------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `400`                 | API         | `contentType` not in the allowed list, or `sizeBytes > maxSizeBytes`.                                                             | Use an allowed MIME, or split / compress the file.                 |
| `401`                 | API         | Missing/invalid admin JWT on the presign call.                                                                                    | Re-auth.                                                           |
| `403`                 | **S3**      | Policy mismatch — client Content-Type ≠ what was signed, or file bytes exceed `content-length-range`, or the URL is > 10 min old. | Re-request presign with the right MIME/size; don't cache presigns. |
| Network timeout at S3 | S3 / client | Presigned URL expired mid-upload.                                                                                                 | Re-request presign; 10-minute window is lenient but not infinite.  |

### 2.6 S3 bucket CORS (one-time infra setup)

Direct browser → S3 requires the bucket to allow CORS. If the upload
succeeds via `curl` but fails in the browser with a CORS error, this is
the cause. Add a bucket CORS rule roughly like:

```json
[
  {
    "AllowedOrigins": [
      "https://grindkaro.in",
      "https://admin.grindkaro.in",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Tighten `AllowedOrigins` to the exact origins your FE runs on.

### 2.7 Why this path fixes the 413

`413 Request Entity Too Large` on the server-buffered `/upload` comes
from whatever reverse proxy sits in front of `api.grindkaro.in` — nginx
default is 1 MB, Cloudflare Free is 100 MB, API Gateway is 10 MB hard.

The presigned path **never hits that proxy** for the bytes — the browser
opens a direct connection to S3, which accepts multipart uploads up to
5 GB (and effectively unlimited via multi-part). The only thing the API
proxies is a ~1 KB JSON policy.

---

## 3. Delete — `DELETE /upload/:key`

Deletes from S3 and invalidates the CloudFront cache for that path.
Unchanged by this refactor.

```
DELETE /upload/video%2F21042026%2F91e1f8a3...mp4
```

Note the URL-encoded slashes in the key — `:key` is one path parameter,
not three.

---

## 4. Quick curl

```bash
# 1. Ask for a presigned policy
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H 'Content-Type: application/json' \
  https://api.grindkaro.in/upload/presign \
  -d '{
    "filename":    "demo.mp4",
    "contentType": "video/mp4",
    "sizeBytes":   24870000
  }'
# → save `url`, `fields`, `cloudfrontUrl`

# 2. POST the file straight to S3 (reconstruct form fields from `fields` in the response)
curl -v -X POST "$S3_URL" \
  -F "Content-Type=video/mp4" \
  -F "key=<KEY_FROM_FIELDS>" \
  -F "bucket=<BUCKET_FROM_FIELDS>" \
  -F "X-Amz-Algorithm=<...>" \
  -F "X-Amz-Credential=<...>" \
  -F "X-Amz-Date=<...>" \
  -F "Policy=<...>" \
  -F "X-Amz-Signature=<...>" \
  -F "file=@./demo.mp4"
# → 204 on success. `cloudfrontUrl` is now live.
```

---

## 5. Endpoint index

```
PUBLIC (today — recommend moving to admin-only)
  POST   /upload                           # multipart/form-data, file <= category cap
  DELETE /upload/:key                      # URL-encoded key

ADMIN (JWT, role = ADMIN)
  POST   /upload/presign                   # { filename, contentType, sizeBytes? } → presigned POST
```
