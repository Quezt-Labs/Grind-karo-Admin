# Google Sheets Integration — Backend Guide (Phase 1: Generic Program)

> **Phase 2** (one-to-one coaching) alag file mein hoga: `GOOGLE_SHEETS_COACHING.md`

## What is the Generic Program?

Coach ne ek **template sheet** banaya hai — ek baar, fixed.  
Har client ko is template ki apni **copy** milti hai.  
Sheet mein formulas hain jo movement selection aur 1RM ke basis pe LOAD auto-compute karte hain.

**Coach sheet mein kuch update nahi karta.**  
**Client apni movement selection update karta hai — app ke through.**

---

## Architecture

```
Template Sheet  (coach ne ek baar banaya, fixed)
       │
       │  Admin creates a copy per client
       ▼
Client's Personal Sheet  (spreadsheetId stored in DB per user)
       │
       ├──  App reads  →  Program 1 / 2 / 3 / DELOAD WEEK / Bro day tabs
       │                  (exercises, sets, reps, formula-computed LOAD)
       │
       └──  App writes →  "Athlete dashboard" tab movement selection cells
                          (client picks Squat / Bench / Deadlift variation)
                                │
                                ▼
                          Sheet formulas recalculate automatically
                                │
                                ▼
                          App re-reads → shows updated LOAD values
```

### Source of Truth

| Data                                 | Source                                           |
| ------------------------------------ | ------------------------------------------------ |
| Exercises, sets, reps, goal RPE      | Google Sheet (static — coach built once)         |
| LOAD values                          | Google Sheet formula (computes from %1RM × E1RM) |
| Movement selection (which variation) | Google Sheet (client updates via app)            |
| Who has which spreadsheet            | DB — `spreadsheetId` stored per user             |

---

## Sheet Details

| Field                   | Value                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Template Spreadsheet ID | `1XsnflVWTlDEsCFyZ31RU9m2jZHWiHiaK`                                             |
| Template URL            | `https://docs.google.com/spreadsheets/d/1XsnflVWTlDEsCFyZ31RU9m2jZHWiHiaK/edit` |
| Service Account         | `grindkaroadmin@grindkaro.iam.gserviceaccount.com`                              |
| Package                 | `googleapis`                                                                    |

---

## Sheet Structure

### Tabs Overview

| Tab                            | Purpose                            | App reads? | App writes?              |
| ------------------------------ | ---------------------------------- | ---------- | ------------------------ |
| `Athlete dashboard`            | Personal info + movement selection | No         | **Yes** (movement cells) |
| `Guide`                        | Static guide for client            | No         | No                       |
| `RPE chart & calculator`       | Reference table                    | No         | No                       |
| `Warmup`                       | Static warmup                      | No         | No                       |
| `Program 1`                    | Block 1 workout                    | **Yes**    | No                       |
| `Program 2`                    | Block 2 workout                    | **Yes**    | No                       |
| `Program 3`                    | Block 3 workout                    | **Yes**    | No                       |
| `DELOAD WEEK`                  | Deload block                       | **Yes**    | No                       |
| `Bro day`                      | Accessory day                      | **Yes**    | No                       |
| `Comp attempt selection guide` | Static reference                   | No         | No                       |
| `NEXT STEP`                    | Static info                        | No         | No                       |

### Athlete Dashboard Tab — Movement Selection Cells

These are the cells the app writes to when client changes movement:

| Row | Col A                | Col C (value app writes)                  |
| --- | -------------------- | ----------------------------------------- |
| 17  | Squat — Primary      | e.g. `"Low bar Squat"`                    |
| 18  | Squat — Secondary    | e.g. `"3-0-0 tempo squat"`                |
| 21  | Bench — Primary      | e.g. `"2ct Paused Benchpress"`            |
| 22  | Bench — Secondary    | e.g. `"Med grip tng benchpress"`          |
| 23  | Bench — Tertiary     | e.g. `"4ct paused Benchpress"`            |
| 26  | Deadlift — Primary   | e.g. `"Sumo Deadlift"`                    |
| 27  | Deadlift — Secondary | e.g. `"2ct Paused conventional Deadlift"` |

> **Note:** Confirm exact row numbers by opening the template sheet. Formula references in Program tabs point to these cells.

### Program Tab Column Layout

Each program tab (Program 1, 2, 3, DELOAD WEEK, Bro day) has this structure:

```
[WEEK 1]   ← section header row (red, merged)
[DAY 1]  Excercise's  Goal rpe  SET  x  REP   LOAD     %1RM  ...  Note's
         (Col B)       (Col C)  (D)  (E) (F)  (G=formula)(H)       (Q)
[lower]  ← category sub-label row, skip
SQUAT    Low bar Squat   @5      1    x   3   [formula]   0         ...
SQUAT    Low bar Squat   @5      1    x   5   [formula]   0         ...
Bench    4ct Paused BP        2    x   3              53%
Deadlift 2ct Paused Conv DL  1    x   4              65%
Acc      lunges/bss/leg press @8  3    x   10
...
[DAY 2]  Excercise's  ...   ← next day
```

| Col | Header        | App reads?           | Notes                                             |
| --- | ------------- | -------------------- | ------------------------------------------------- |
| A   | Category      | Yes (section parser) | `SQUAT / Bench / Deadlift / Acc / DAY N / WEEK N` |
| B   | Excercise's   | Yes                  | Exercise name                                     |
| C   | Goal rpe      | Yes                  | `targetRpe`                                       |
| D   | SET           | Yes                  | `sets`                                            |
| E   | x             | Skip                 | literal separator                                 |
| F   | REP           | Yes                  | `repScheme` (can be text like "TILL FAILURE")     |
| G   | LOAD          | Yes                  | Formula-computed — read as-is for display         |
| H   | %1RM          | Yes                  | `percentOneRm`                                    |
| I   | UPPER RANGE   | Yes                  | formula value                                     |
| J   | LOWER RANGE   | Yes                  | formula value                                     |
| K   | aRpe          | Skip                 | athlete fills post-workout                        |
| L   | E1rm          | Skip                 | formula                                           |
| M   | Actual Sets   | Skip                 | athlete fills                                     |
| N   | x             | Skip                 | separator                                         |
| O   | Actual Reps   | Skip                 | athlete fills                                     |
| P   | LOAD (actual) | Skip                 | athlete fills                                     |
| Q   | Note's        | Yes                  | coach notes                                       |

---

## Table of Contents

1. [Google Cloud Setup](#1-google-cloud-setup)
2. [Environment Variables](#2-environment-variables)
3. [File Structure](#3-file-structure)
4. [DB Schema Change](#4-db-schema-change--spreadsheetid-per-user)
5. [Auth Module](#5-auth-module--srclibgoogleauthts)
6. [Sheet Parser](#6-sheet-parser--srcsheetsprogramsheetparserts)
7. [Sheets Service](#7-sheets-service--srcsheetsprogramsheetsservicets)
8. [Express Routes](#8-express-routes--srcroutesprogramsheetsroutests)
9. [API Reference](#9-api-reference)
10. [Error Handling](#10-error-handling)

---

## 1. Google Cloud Setup

| Step | Action                           | Where                                                                            |
| ---- | -------------------------------- | -------------------------------------------------------------------------------- |
| 1    | Enable Google Sheets API         | APIs & Services → Library → "Google Sheets API" → Enable                         |
| 2    | **Download JSON key**            | Service Accounts → grindkaroadmin → Keys → Add Key → JSON                        |
| 3    | Share template sheet with SA     | Open sheet → Share → `grindkaroadmin@grindkaro.iam.gserviceaccount.com` → Editor |
| 4    | Each client sheet bhi share karo | Jab copy banao tab SA ko Editor access do                                        |

---

## 2. Environment Variables

```env
# Paste entire JSON key as single-line string
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"grindkaro","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"grindkaroadmin@grindkaro.iam.gserviceaccount.com",...}

# Template spreadsheet (admin copies this per client)
GOOGLE_TEMPLATE_SPREADSHEET_ID=1XsnflVWTlDEsCFyZ31RU9m2jZHWiHiaK
```

**JSON key ko single-line mein convert karo (Mac):**

```bash
cat path/to/grindkaro-key.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))" | pbcopy
```

> **Security:** `.env` gitignore mein hona chahiye. JSON key file kabhi commit mat karna.

---

## 3. File Structure

```
src/
├── lib/
│   └── googleAuth.ts                   # Sheets API client (singleton)
├── sheets/
│   ├── programSheetParser.ts           # Reads & parses program tabs
│   └── programSheetsService.ts         # read program + write movement selection
└── routes/
    └── programSheets.routes.ts         # endpoints
```

```bash
npm install googleapis
```

---

## 4. DB Schema Change — `spreadsheetId` per User

Har client ke user/subscription record mein uska personal `spreadsheetId` store karna hoga.

```sql
-- Add to users table (or program_purchases / subscriptions table)
ALTER TABLE users ADD COLUMN spreadsheet_id TEXT;
```

```typescript
// Or in your existing User type
interface User {
  id: string;
  email: string;
  // ... existing fields
  spreadsheetId: string | null; // ← add this
}
```

**Admin workflow:**

1. Client program purchase kare
2. Admin manually ya via API: template copy karo → `spreadsheetId` DB mein save karo
3. Client tab app read kare toh yeh `spreadsheetId` use hoga

---

## 5. Auth Module — `src/lib/googleAuth.ts`

```typescript
import { google, type sheets_v4 } from "googleapis";

let _sheets: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (_sheets) return _sheets;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set in .env");

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  _sheets = google.sheets({ version: "v4", auth });
  return _sheets;
}

export const TEMPLATE_SPREADSHEET_ID =
  process.env.GOOGLE_TEMPLATE_SPREADSHEET_ID!;
```

---

## 6. Sheet Parser — `src/sheets/programSheetParser.ts`

Reads a program tab (e.g. "Program 1") and parses the nested Week → Day → Exercise structure.

```typescript
import { getSheetsClient } from "../lib/googleAuth";

export interface ParsedExercise {
  weekNumber: number;
  dayNumber: number;
  dayFocus: string; // e.g. "lower", "full body"
  category: string; // SQUAT | Bench | Deadlift | Acc
  exerciseName: string;
  goalRpe: string;
  sets: number | null;
  repScheme: string;
  loadKg: string; // formula-computed value (read as string)
  percentOneRm: string;
  upperRange: string;
  lowerRange: string;
  notes: string;
  sortOrder: number;
}

// ── Verified from actual CSV data ─────────────────────────────────────────
// Col 0=Category, 1=Exercise, 2=GoalRpe, 3=Sets, 4=× (skip), 5=Reps,
// 6=LOAD(formula), 7=%1RM, 8=UpperRange, 9=LowerRange,
// 10=aRpe(skip), 11=E1rm(skip), 12=ActualSets(skip), 13=×(skip),
// 14=ActualReps(skip), 15=LOAD_actual(skip), 16=Notes

const DAY_RE = /^DAY\s+(\d+)/i;
const WEEK_RE = /^WEEK\s+(\d+)/i;

// IMPORTANT: Sheet uses inconsistent casing — "Bench" and "Deadlift" (title case)
// but also "SQUAT" and "DEADLIFT" (uppercase). Always compare with .toUpperCase().
const EXERCISE_CATEGORIES = new Set(["SQUAT", "BENCH", "DEADLIFT", "ACC"]);

const FOCUS_LABELS = new Set(["lower", "full body", "upper", "push", "pull"]);

// Rows 1-7 are a summary/header block (SQUAT/BENCH/DEADLIFT totals) — skip them.
// Real data starts from the first "WEEK N" row.
const HEADER_ROWS_TO_SKIP = 7;

export async function parseProgramTab(
  spreadsheetId: string,
  tabName: string,
): Promise<ParsedExercise[]> {
  const sheets = getSheetsClient();

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:Q`,
    valueRenderOption: "FORMATTED_VALUE", // resolve formulas → get computed LOAD values
  });

  const allRows = (data.values ?? []) as string[][];
  // Skip first 7 summary rows
  const rows = allRows.slice(HEADER_ROWS_TO_SKIP);

  const exercises: ParsedExercise[] = [];
  let currentWeek = 0;
  let currentDay = 0;
  let currentDayFocus = "";
  let sortOrder = 0;

  for (const row of rows) {
    const colA = (row[0] ?? "").trim();
    if (!colA) continue; // empty row — skip

    // ── WEEK header ──
    const weekMatch = colA.match(WEEK_RE);
    if (weekMatch) {
      currentWeek = parseInt(weekMatch[1]);
      continue;
    }

    // ── DAY header ──
    const dayMatch = colA.match(DAY_RE);
    if (dayMatch) {
      currentDay = parseInt(dayMatch[1]);
      currentDayFocus = ""; // reset for new day
      continue;
    }

    // ── Day focus sub-label ("lower", "full body", "upper") ──
    if (FOCUS_LABELS.has(colA.toLowerCase())) {
      currentDayFocus = colA;
      continue;
    }

    // ── Exercise row — case-insensitive category check ──
    if (EXERCISE_CATEGORIES.has(colA.toUpperCase())) {
      const exerciseName = (row[1] ?? "").trim();
      if (!exerciseName) continue; // blank exercise — skip

      exercises.push({
        weekNumber: currentWeek,
        dayNumber: currentDay,
        dayFocus: currentDayFocus,
        category: colA.toUpperCase(), // normalize: "Bench" → "BENCH"
        exerciseName,
        goalRpe: (row[2] ?? "").trim(),
        sets: row[3] ? parseInt(row[3]) || null : null,
        // row[4] = "×" separator — skip
        repScheme: (row[5] ?? "").trim(),
        loadKg: (row[6] ?? "").trim(), // formula-computed
        percentOneRm: (row[7] ?? "").trim(),
        upperRange: (row[8] ?? "").trim(),
        lowerRange: (row[9] ?? "").trim(),
        // row[10-15] = athlete fills / internal formulas — skip
        notes: (row[16] ?? "").trim(),
        sortOrder: sortOrder++,
      });
    }
  }

  return exercises;
}

// ── Parsed output example (from actual Week 1, Day 1 CSV data) ────────────
// Input rows:
//   WEEK 1
//   DAY 1, Excercise's, Goal rpe, ...
//   lower
//   SQUAT, Low bar Squat, @5, 1, x, 3, , , 0, 0, , #N/A, ...
//   SQUAT, Low bar Squat, @5, 1, x, 5, ...
//   Bench, 4ct paused Benchpress, , 2, x, 3, 0, 53%, ...
//   Deadlift, 2ct Paused conventional Deadlift, , 1, x, 4, 0, 65%, ...
//   Acc, lunges/bss/leg press, "ascending sets @8,9,9", 3, x, 10, ...
//
// Output:
// [
//   { week:1, day:1, focus:"lower", category:"SQUAT",     name:"Low bar Squat",                      rpe:"@5",                      sets:1, reps:"3", load:"",  pct:"" },
//   { week:1, day:1, focus:"lower", category:"SQUAT",     name:"Low bar Squat",                      rpe:"@5",                      sets:1, reps:"5", load:"",  pct:"" },
//   { week:1, day:1, focus:"lower", category:"BENCH",     name:"4ct paused Benchpress",              rpe:"",                        sets:2, reps:"3", load:"0", pct:"53%" },
//   { week:1, day:1, focus:"lower", category:"DEADLIFT",  name:"2ct Paused conventional Deadlift",   rpe:"",                        sets:1, reps:"4", load:"0", pct:"65%" },
//   { week:1, day:1, focus:"lower", category:"ACC",       name:"lunges/bss/leg press",               rpe:"ascending sets @8,9,9",   sets:3, reps:"10", load:"", pct:"" },
// ]

export const PROGRAM_TABS = [
  "Program 1",
  "Program 2",
  "Program 3",
  "DELOAD WEEK",
  "Bro day",
] as const;

export type ProgramTabName = (typeof PROGRAM_TABS)[number];

export async function parseAllProgramTabs(
  spreadsheetId: string,
): Promise<Record<ProgramTabName, ParsedExercise[]>> {
  const results = await Promise.all(
    PROGRAM_TABS.map(
      (tab) =>
        parseProgramTab(spreadsheetId, tab)
          .then((exercises) => [tab, exercises] as const)
          .catch(() => [tab, []] as const), // tab missing → empty
    ),
  );

  return Object.fromEntries(results) as Record<
    ProgramTabName,
    ParsedExercise[]
  >;
}
```

---

## 7. Sheets Service — `src/sheets/programSheetsService.ts`

### 7.1 Read — Client's Full Program

```typescript
import { parseAllProgramTabs } from "./programSheetParser";

export async function getClientProgram(spreadsheetId: string) {
  return parseAllProgramTabs(spreadsheetId);
}
```

### 7.2 Write — Update Movement Selection

```typescript
import { getSheetsClient } from "../lib/googleAuth";

export type MovementType = "squat" | "bench" | "deadlift";
export type MovementSlot = "primary" | "secondary" | "tertiary";

// Cell map — "Athlete dashboard" tab
// Confirm these row numbers against the actual template sheet
const MOVEMENT_CELLS: Record<MovementType, Record<MovementSlot, string>> = {
  squat: {
    primary: "Athlete dashboard!C17",
    secondary: "Athlete dashboard!C18",
    tertiary: "Athlete dashboard!C18", // no tertiary for squat — same as secondary
  },
  bench: {
    primary: "Athlete dashboard!C21",
    secondary: "Athlete dashboard!C22",
    tertiary: "Athlete dashboard!C23",
  },
  deadlift: {
    primary: "Athlete dashboard!C26",
    secondary: "Athlete dashboard!C27",
    tertiary: "Athlete dashboard!C27", // no tertiary for deadlift
  },
};

export async function updateMovementSelection(
  spreadsheetId: string,
  movement: MovementType,
  slot: MovementSlot,
  exerciseName: string,
): Promise<void> {
  const sheets = getSheetsClient();
  const range = MOVEMENT_CELLS[movement][slot];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[exerciseName]] },
  });
}

/** Read current movement selections for a client */
export async function getMovementSelections(spreadsheetId: string) {
  const sheets = getSheetsClient();

  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      "Athlete dashboard!C17", // squat primary
      "Athlete dashboard!C18", // squat secondary
      "Athlete dashboard!C21", // bench primary
      "Athlete dashboard!C22", // bench secondary
      "Athlete dashboard!C23", // bench tertiary
      "Athlete dashboard!C26", // deadlift primary
      "Athlete dashboard!C27", // deadlift secondary
    ],
  });

  const val = (i: number) => data.valueRanges?.[i]?.values?.[0]?.[0] ?? "";

  return {
    squat: { primary: val(0), secondary: val(1) },
    bench: { primary: val(2), secondary: val(3), tertiary: val(4) },
    deadlift: { primary: val(5), secondary: val(6) },
  };
}
```

### 7.3 Admin — Copy Template Sheet for New Client

```typescript
import { google } from "googleapis";
import { getSheetsClient } from "../lib/googleAuth";

export async function copyTemplateSheetForClient(
  clientEmail: string,
  clientName: string,
): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const drive = google.drive({ version: "v3", auth });
  const templateId = process.env.GOOGLE_TEMPLATE_SPREADSHEET_ID!;

  // Copy the template
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: `GrindKaro Program — ${clientName}`,
    },
  });

  const newSpreadsheetId = copy.data.id!;

  // Share with client (view only) and SA (editor)
  await drive.permissions.create({
    fileId: newSpreadsheetId,
    requestBody: { role: "reader", type: "user", emailAddress: clientEmail },
  });

  return newSpreadsheetId;
  // Caller saves this to DB: user.spreadsheetId = newSpreadsheetId
}
```

> **Note:** `drive` scope is only needed for copy operation. Add `https://www.googleapis.com/auth/drive` to the `GoogleAuth` scopes for this function only. Regular read/write uses `spreadsheets` scope only.

---

## 8. Express Routes — `src/routes/programSheets.routes.ts`

```typescript
import { Router, Request, Response, NextFunction } from "express";
import {
  getClientProgram,
  getMovementSelections,
  updateMovementSelection,
  copyTemplateSheetForClient,
  type MovementType,
  type MovementSlot,
} from "../sheets/programSheetsService";
import { userService } from "../services/userService"; // your existing service

const router = Router();

/**
 * GET /api/sheets/my-program
 * Client gets their full program data from their personal sheet.
 * Auth: Client JWT
 */
router.get(
  "/my-program",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id; // from auth middleware
      const user = await userService.getById(userId);

      if (!user.spreadsheetId) {
        return res.status(404).json({
          success: false,
          message: "No program sheet assigned. Contact your coach.",
        });
      }

      const program = await getClientProgram(user.spreadsheetId);
      res.json({ success: true, data: program });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/sheets/my-program/movement-selection
 * Client reads their current movement selections.
 */
router.get(
  "/my-program/movement-selection",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.user.id);
      if (!user.spreadsheetId) return res.status(404).json({ success: false });

      const selections = await getMovementSelections(user.spreadsheetId);
      res.json({ success: true, data: selections });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/sheets/my-program/movement-selection
 * Client updates a movement selection. Sheet formulas auto-recalculate.
 *
 * Body: { movement: "squat"|"bench"|"deadlift", slot: "primary"|"secondary"|"tertiary", exerciseName: string }
 */
router.patch(
  "/my-program/movement-selection",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { movement, slot, exerciseName } = req.body as {
        movement: MovementType;
        slot: MovementSlot;
        exerciseName: string;
      };

      if (!movement || !slot || !exerciseName) {
        return res.status(400).json({
          success: false,
          message: "movement, slot, and exerciseName are required",
        });
      }

      const user = await userService.getById(req.user.id);
      if (!user.spreadsheetId) return res.status(404).json({ success: false });

      await updateMovementSelection(
        user.spreadsheetId,
        movement,
        slot,
        exerciseName,
      );

      res.json({ success: true, message: "Movement selection updated" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/sheets/admin/create-client-sheet
 * Admin creates a copy of the template sheet for a new client.
 * Auth: Admin JWT
 *
 * Body: { userId: string, clientEmail: string, clientName: string }
 */
router.post(
  "/admin/create-client-sheet",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, clientEmail, clientName } = req.body as {
        userId: string;
        clientEmail: string;
        clientName: string;
      };

      const spreadsheetId = await copyTemplateSheetForClient(
        clientEmail,
        clientName,
      );

      // Save spreadsheetId to user record in DB
      await userService.update(userId, { spreadsheetId });

      res.json({
        success: true,
        spreadsheetId,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
```

**Register in `app.ts`:**

```typescript
import programSheetsRouter from "./routes/programSheets.routes";

app.use("/api/sheets", authMiddleware, programSheetsRouter);
```

---

## 9. API Reference

| Method  | Endpoint                                    | Auth       | Description                            |
| ------- | ------------------------------------------- | ---------- | -------------------------------------- |
| `GET`   | `/api/sheets/my-program`                    | Client JWT | Client ki full program data (all tabs) |
| `GET`   | `/api/sheets/my-program/movement-selection` | Client JWT | Current movement selections padhna     |
| `PATCH` | `/api/sheets/my-program/movement-selection` | Client JWT | Movement selection update karna        |
| `POST`  | `/api/sheets/admin/create-client-sheet`     | Admin JWT  | Template copy karna new client ke liye |

### PATCH `/api/sheets/my-program/movement-selection`

```json
// Request body
{
  "movement": "squat",
  "slot": "primary",
  "exerciseName": "High Bar Squat"
}

// Response 200
{
  "success": true,
  "message": "Movement selection updated"
}
```

### GET `/api/sheets/my-program`

```json
// Response 200
{
  "success": true,
  "data": {
    "Program 1": [
      {
        "weekNumber": 1,
        "dayNumber": 1,
        "dayFocus": "lower",
        "category": "SQUAT",
        "exerciseName": "Low bar Squat",
        "goalRpe": "@5",
        "sets": 1,
        "repScheme": "3",
        "loadKg": "85",
        "percentOneRm": "53%",
        "upperRange": "",
        "lowerRange": "0",
        "notes": ""
      }
    ],
    "Program 2": [...],
    "Program 3": [...],
    "DELOAD WEEK": [...],
    "Bro day": [...]
  }
}
```

---

## 10. Error Handling

| Scenario                                     | Behavior                                           |
| -------------------------------------------- | -------------------------------------------------- |
| `user.spreadsheetId` null                    | `404 "No program sheet assigned"`                  |
| Sheet tab missing (e.g. "Program 1" deleted) | Returns empty array for that tab, others continue  |
| Cell update fails (wrong range)              | `500` — check `MOVEMENT_CELLS` map                 |
| Google API rate limit                        | Retry after 1–2 sec (googleapis auto-retries once) |
| Drive copy fails                             | `500` — check drive scope is added to auth         |

**GaxiosError handler:**

```typescript
import { GaxiosError } from "gaxios";

if (err instanceof GaxiosError) {
  const status = err.response?.status ?? 500;
  const message = err.response?.data?.error?.message ?? "Google API error";
  return res.status(status).json({ success: false, message });
}
```

---

_Related docs: [GOOGLE_SHEETS_FRONTEND.md](./GOOGLE_SHEETS_FRONTEND.md)_
