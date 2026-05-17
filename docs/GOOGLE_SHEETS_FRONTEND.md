# Google Sheets — frontend integration

The API exposes **two separate** Google Sheets integrations. Routes and payloads are different; do not confuse them.

| Flow                     | Who                                           | Purpose                                                                                                                     |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Program catalog (v2)** | End user owns a purchased program             | Load workout trees from **one spreadsheet per shop program** (tab name = program `slug`).                                   |
| **Coach template**       | Coach / client accounts with a personal sheet | Admin copies a master template → `users.spreadsheet_id`; client reads/writes that sheet via dedicated `/sheets/...` routes. |

Both require server-side **`GOOGLE_SERVICE_ACCOUNT_JSON`** and the workbook shared with that service account (see `client_email` in the JSON).

---

## 1. Program catalog from Sheets (`content-v2`)

**Endpoint:** `GET /programs/:programId/content-v2`

- **Auth:** JWT; user must **own** the program (same gate as `GET …/content`).
- **Response shape:** Same as `GET /programs/:programId/content` — use the **same parsers / UI**.
- **Spreadsheet resolution (server):**
  1. `programs.googleSpreadsheetId` (set via admin create/patch program)
  2. Else **`GOOGLE_SPREADSHEET_ID`** env (optional legacy fallback)

**Public catalog (`GET /programs`, `GET /programs/:slug`)** intentionally **omit** `googleSpreadsheetId`. Configure it only in **admin** program authoring UIs (`googleSpreadsheetId` on create/patch).

**FE checklist**

- Prefer ** `:programId` UUID** routes for runtime (`content-v2`).
- If `googleSpreadsheetId` is unset and env fallback is not configured server-side, the API responds with failure — handle errors and optionally prompt admin to set the spreadsheet on the program.
- Sheet tab name must equal the program **`slug`**.

---

## 2. Coach template — personal program sheet (`/sheets`)

After an admin assigns a sheet (`users.spreadsheet_id`), the logged-in client can:

| Method  | Path                                    | Purpose                                                              |
| ------- | --------------------------------------- | -------------------------------------------------------------------- |
| `GET`   | `/sheets/my-program`                    | Parsed program blocks from all tabs in the template layout.          |
| `GET`   | `/sheets/my-program/movement-selection` | Squat/bench/deadlift display names from the Athlete dashboard cells. |
| `PATCH` | `/sheets/my-program/movement-selection` | Body: `{ movement, slot, exerciseName }` — writes one cell.          |

**Auth:** JWT (user). **404** when no sheet is assigned: _No program sheet assigned. Contact your coach._

---

## 3. Admin — create personal sheet (`create-client-sheet`)

**Endpoint:** `POST /sheets/admin/create-client-sheet`  
**Auth:** JWT + **Admin** role.

**Body**

```json
{
  "userId": "uuid-of-client-user",
  "clientEmail": "client@example.com",
  "clientName": "Display name used in Drive title",
  "templateSpreadsheetId": "optional; defaults to GOOGLE_TEMPLATE_SPREADSHEET_ID on server"
}
```

**Success**

```json
{
  "success": true,
  "spreadsheetId": "…",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/…/edit"
}
```

---

## 4. Backend deployment — Shared Drive folder (coach copy flow)

Creating a Drive **copy** with a **service account** fails with HTTP **403** / _storageQuotaExceeded_ if the new file would live in the service account’s **My Drive**, because Google does **not** grant personal storage quota to service accounts.

The server fixes this by creating copies inside a folder on a **[Google Workspace Shared drive](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)** via env:

| Variable                               | Required for `create-client-sheet` | Meaning                                                                                                             |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_DRIVE_CLIENT_COPIES_FOLDER_ID` | **Yes**                            | Drive **folder ID** (`/folders/<id>` from the browser URL). Folder must live on a **Shared drive**, not “My Drive”. |

Also required for the template flow:

- **`GOOGLE_TEMPLATE_SPREADSHEET_ID`** (or **`templateSpreadsheetId`** per request): file the service account can **read** (same Shared drive + membership, or shared directly with `client_email`).
- Add the **service account** to the Shared drive with a role that can **create files** (e.g. **Content manager**).
- **`GOOGLE_SERVICE_ACCOUNT_JSON`** with Drive + Sheets scopes (server already requests them for this flow).

### What the frontend should expect

If the folder env is missing or Drive still rejects quota/permissions:

- Responses may use **503** `ServiceUnavailable` with an explanatory **`message`**.
- Prefer **surfacing `message`** in admin tooling (toast / inline alert) instead of swallowing generic “copy failed”.
- Teach operators: failures here are almost always **Google Workspace Shared drive + IAM**, not FE bugs.

---

## 5. Quick reference env (operators)

Documented with comments in **`.env.example`**.

| Variable                               | Used by                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_JSON`          | All Sheets/Drive integrations                                                    |
| `GOOGLE_SPREADSHEET_ID`                | Optional fallback for `content-v2` only                                          |
| `GOOGLE_TEMPLATE_SPREADSHEET_ID`       | Admin copy default template                                                      |
| `GOOGLE_DRIVE_CLIENT_COPIES_FOLDER_ID` | **Required** destination folder for **`POST /sheets/admin/create-client-sheet`** |
