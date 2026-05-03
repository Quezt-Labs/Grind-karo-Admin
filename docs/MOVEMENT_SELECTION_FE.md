# Movement Selection — Frontend Implementation Guide

End-to-end guide for integrating the **Movement Selection** feature into both
the **admin console** (program builder) and the **user-facing app** (athlete
workout view).

---

## Concepts

| Term                    | Meaning                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Movement Slot**       | A swappable position in a program (e.g. "Primary Squat"). Has a `slotKey` (unique per program), a human-readable `label`, and a `category` (SQUAT / BENCH / DEADLIFT / ACCESSORY).                                                        |
| **Movement Option**     | One exercise choice within a slot (e.g. "High Bar Squat", "Low Bar Squat"). Links to an exercise from the exercise library (`exerciseId`) and carries a display name (`exerciseName`). Exactly one option per slot is marked `isDefault`. |
| **Override**            | Per-option, per-exercise-row parameter tweaks. When athlete picks option X, the override for a given program-exercise row can change sets, rep scheme, RPE, load computation, etc. `sets: 0` means "hide this row entirely."              |
| **Movement Selections** | A `{ slotId: optionId }` map stored on the athlete's profile. Determines which option is active for each slot. Must be all-or-nothing (every slot filled).                                                                                |
| **Load Computation**    | The strategy used to calculate a working weight: `RPE_CHART`, `PERCENT_1RM`, `PERCENT_OF_ROW`, or `NONE`.                                                                                                                                 |
| **Plate Rounding**      | When `hasPlateCheck` is true on an exercise row, the computed load is rounded to the nearest plate increment: 2.5 kg if the athlete has 1.25 kg plates, 5 kg otherwise.                                                                   |

---

## Data Flow Summary

```
Admin builds program
  └─ Creates movement slots + options + overrides
  └─ Links program-exercise rows to slots
  └─ Sets loadComputation / loadRefFactor / etc on rows

Athlete opens program
  └─ GET /programs/:id/content  → includes movementSlots[]
  └─ PUT /programs/:id/profile  → saves movementSelections + has125kgPlates
  └─ GET /programs/:id/days/:dayId/computed → server resolves slots → returns final rows
```

---

# Part 1 — Admin Console

## 1.1 Movement Slots CRUD

All admin endpoints are under `/admin/...` and require `AdminGuard` (admin JWT).

### List all slots for a program

```
GET /admin/programs/:programId/movement-slots
Authorization: Bearer <adminJwt>
```

**Response `200`** — `MovementSlotResponseDto[]`

```json
[
  {
    "id": "slot-uuid",
    "slotKey": "squat_primary",
    "label": "Primary Squat Movement",
    "category": "SQUAT",
    "sortOrder": 0,
    "options": [
      {
        "id": "option-uuid",
        "exerciseId": "exercise-uuid-or-null",
        "exerciseName": "High Bar Squat",
        "isDefault": true,
        "sortOrder": 0,
        "overrides": [
          {
            "programExerciseId": "row-uuid",
            "sets": 5,
            "repScheme": "5",
            "targetRpe": "8",
            "percentOneRm": null,
            "loadComputation": "RPE_CHART",
            "loadRefFactor": null,
            "loadRefExerciseId": null,
            "loadNote": null,
            "notes": null
          }
        ]
      }
    ]
  }
]
```

### Create a slot

```
POST /admin/programs/:programId/movement-slots
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "slotKey": "squat_primary",
  "label": "Primary Squat Movement",
  "category": "SQUAT",
  "sortOrder": 0
}
```

- `slotKey` must be unique within the program. Returns `409` if duplicate.
- `category` is one of: `SQUAT`, `BENCH`, `DEADLIFT`, `ACCESSORY`.

**Response `201`** — the created `MovementSlotResponseDto` (with empty `options`).

### Update a slot

```
PATCH /admin/movement-slots/:slotId
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "label": "New Label"
}
```

All fields are optional (partial update).

### Delete a slot

```
DELETE /admin/movement-slots/:slotId
Authorization: Bearer <adminJwt>
```

Cascades: deletes all child options and overrides. Also unlinks any
program-exercise rows that referenced this slot (`movementSlotId` → `null`).

**Response `200`** — `{ "id": "...", "deleted": true }`

---

## 1.2 Movement Options CRUD

### Add an option to a slot

```
POST /admin/movement-slots/:slotId/options
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "exerciseId": "exercise-library-uuid-or-null",
  "exerciseName": "Low Bar Squat",
  "isDefault": false,
  "sortOrder": 1
}
```

- `exerciseId` is optional; it links to the exercises library for future
  reference. The `exerciseName` is always stored directly.
- Only one option per slot should have `isDefault: true`. If you set a new
  default, toggle the old one off first (or the backend will allow multiple
  defaults — enforce this client-side).

### Update an option

```
PATCH /admin/movement-options/:optionId
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "exerciseName": "Safety Bar Squat",
  "isDefault": true
}
```

### Delete an option

```
DELETE /admin/movement-options/:optionId
Authorization: Bearer <adminJwt>
```

Cascades: deletes all overrides for this option.

**Response `200`** — `{ "id": "...", "deleted": true }`

---

## 1.3 Per-Option Overrides (Bulk Upsert)

When the admin wants "if the athlete picks Low Bar Squat, row X should have
4×6 @RPE 7 instead of 5×5 @RPE 8":

```
PUT /admin/movement-options/:optionId/overrides
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "overrides": [
    {
      "programExerciseId": "row-uuid",
      "sets": 4,
      "repScheme": "6",
      "targetRpe": "7",
      "percentOneRm": null,
      "loadComputation": "RPE_CHART",
      "loadRefFactor": null,
      "loadRefExerciseId": null,
      "loadNote": "Work up to top set",
      "notes": "Pause on chest"
    },
    {
      "programExerciseId": "another-row-uuid",
      "sets": 0
    }
  ]
}
```

- This is an **upsert** — existing overrides for the given
  `(optionId, programExerciseId)` pairs are replaced; new ones are inserted.
- `sets: 0` means **hide this row** when this option is selected.
- Any field set to `null` means "use the base value from the program-exercise
  row" at runtime. Only non-null override values replace the base.

### Override fields reference

| Field               | Type             | Description                                                |
| ------------------- | ---------------- | ---------------------------------------------------------- |
| `programExerciseId` | `uuid`           | **Required.** Which exercise row this override applies to. |
| `sets`              | `int \| null`    | Override set count. `0` = hide the row.                    |
| `repScheme`         | `string \| null` | e.g. `"5"`, `"3-5"`, `"8,8,6"`                             |
| `targetRpe`         | `string \| null` | e.g. `"8"`, `"8.5"`                                        |
| `percentOneRm`      | `int \| null`    | Basis points. `5300` = 53.00%                              |
| `loadComputation`   | `string \| null` | `RPE_CHART`, `PERCENT_1RM`, `PERCENT_OF_ROW`, `NONE`       |
| `loadRefFactor`     | `number \| null` | For `PERCENT_OF_ROW`: factor like `0.90`                   |
| `loadRefExerciseId` | `uuid \| null`   | For `PERCENT_OF_ROW`: reference row ID                     |
| `loadNote`          | `string \| null` | Free text (e.g. "Work up to top set")                      |
| `notes`             | `string \| null` | Free text (e.g. "Pause on chest")                          |

---

## 1.4 Linking Exercise Rows to Slots

Once slots exist, the admin links program-exercise rows to slots. This marks
a row as "swappable" — its exercise, sets, rep scheme, etc. can change based
on the athlete's selection.

```
PUT /admin/program-exercises/:exerciseId/slot
Authorization: Bearer <adminJwt>
Content-Type: application/json

{
  "movementSlotId": "slot-uuid"
}
```

- Send `{ "movementSlotId": null }` to **unlink**.

### Setting load computation on exercise rows

The existing exercise row create/update endpoints now accept these additional
fields:

| Field               | Type             | Default       | Description                                          |
| ------------------- | ---------------- | ------------- | ---------------------------------------------------- |
| `movementSlotId`    | `uuid \| null`   | `null`        | Slot this row belongs to                             |
| `loadComputation`   | `string`         | `"RPE_CHART"` | `RPE_CHART`, `PERCENT_1RM`, `PERCENT_OF_ROW`, `NONE` |
| `loadRefFactor`     | `number \| null` | `null`        | For `PERCENT_OF_ROW`                                 |
| `loadRefExerciseId` | `uuid \| null`   | `null`        | For `PERCENT_OF_ROW`                                 |
| `hasPlateCheck`     | `boolean`        | `false`       | Round to nearest plate increment                     |

These are part of the standard `POST /admin/programs/:programId/days/:dayId/exercises`
and `PATCH /admin/programs/:programId/exercises/:id` endpoints.

---

## 1.5 Admin UI Recommendations

### Slot management panel

Add a "Movement Slots" tab or section within the program editor. For each
slot, show:

```
┌─────────────────────────────────────────────────┐
│ 🔀 Primary Squat Movement          [SQUAT]      │
│    Key: squat_primary                            │
│                                                  │
│  Options:                                        │
│  ┌──────────────────────────────────────────┐    │
│  │ ★ High Bar Squat (default)  [Edit] [Del] │    │
│  │   Low Bar Squat             [Edit] [Del] │    │
│  │   Safety Bar Squat          [Edit] [Del] │    │
│  │                          [+ Add Option]  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Linked exercise rows: 12                        │
│                                          [Edit]  │
└─────────────────────────────────────────────────┘
```

### Override editor

When editing an option's overrides, show a table of all exercise rows linked
to this slot. For each row, let the admin set override values or leave them
blank (inherit from base):

```
┌─────────────────────────────────────────────────────────────────┐
│ Overrides for: Low Bar Squat                                    │
│                                                                 │
│ Row            │ Sets │ Reps │ RPE  │ Load Strategy │ Notes     │
│ ───────────────┼──────┼──────┼──────┼───────────────┼────────── │
│ W1D1 Squat     │ 4    │ 6    │ 7    │ RPE_CHART     │ Pause     │
│ W1D1 Backoff   │ 0    │ —    │ —    │ —             │ (hidden)  │
│ W1D3 Squat     │ —    │ —    │ —    │ —             │           │
│                                                      [Save All] │
└─────────────────────────────────────────────────────────────────┘
```

"—" means inherit from the base program-exercise row. `sets: 0` = hidden.

### Exercise row indicator

In the program day editor, show a slot badge on rows linked to a movement
slot:

```
  1. 🔀 [squat_primary] Squat — 5×5 @RPE 8 — RPE_CHART
  2. Bench Press — 4×8 @RPE 7 — PERCENT_1RM (53%)
  3. 🔀 [squat_primary] Pause Squat — 3×3 @RPE 8.5 — PERCENT_OF_ROW (×0.90 of row 1)
```

---

# Part 2 — Athlete / User App

## 2.1 Program Content (includes slots)

The existing content endpoint now returns `movementSlots` in the program tree:

```
GET /programs/:programId/content
Authorization: Bearer <userJwt>
```

**Response** — `ProgramTreeResponseDto` (truncated to new fields):

```json
{
  "id": "program-uuid",
  "title": "Powerlifting 12-Week",
  "movementSlots": [
    {
      "id": "slot-uuid",
      "slotKey": "squat_primary",
      "label": "Primary Squat Movement",
      "category": "SQUAT",
      "sortOrder": 0,
      "options": [
        {
          "id": "option-a-uuid",
          "exerciseId": "exercise-uuid",
          "exerciseName": "High Bar Squat",
          "isDefault": true,
          "sortOrder": 0,
          "overrides": [ ... ]
        },
        {
          "id": "option-b-uuid",
          "exerciseId": "exercise-uuid-2",
          "exerciseName": "Low Bar Squat",
          "isDefault": false,
          "sortOrder": 1,
          "overrides": [ ... ]
        }
      ]
    }
  ],
  "blocks": [ ... ]
}
```

Each exercise row in `blocks[].weeks[].days[].exercises[]` now includes:

| Field               | Type             | Description                                          |
| ------------------- | ---------------- | ---------------------------------------------------- |
| `movementSlotId`    | `uuid \| null`   | If set, this row is swappable                        |
| `loadComputation`   | `string`         | `RPE_CHART`, `PERCENT_1RM`, `PERCENT_OF_ROW`, `NONE` |
| `loadRefFactor`     | `number \| null` | For `PERCENT_OF_ROW`                                 |
| `loadRefExerciseId` | `uuid \| null`   | For `PERCENT_OF_ROW`                                 |
| `hasPlateCheck`     | `boolean`        | Whether plate rounding applies                       |

---

## 2.2 Profile — Movement Selections + Plate Preference

### Read profile

```
GET /programs/:programId/profile
Authorization: Bearer <userJwt>
```

**Response `200`** — `ProgramProfileResponseDto`

```json
{
  "id": "profile-uuid",
  "userId": "user-uuid",
  "programId": "program-uuid",
  "squatOneRm": 180,
  "benchOneRm": 120,
  "deadliftOneRm": 220,
  "activeBlockId": "block-uuid",
  "movementSelections": {
    "slot-uuid-1": "option-uuid-a",
    "slot-uuid-2": "option-uuid-x"
  },
  "has125kgPlates": true,
  "startedAt": "2025-01-15T00:00:00.000Z",
  "notes": null
}
```

### Save profile (with selections)

```
PUT /programs/:programId/profile
Authorization: Bearer <userJwt>
Content-Type: application/json

{
  "squatOneRm": 180,
  "benchOneRm": 120,
  "deadliftOneRm": 220,
  "movementSelections": {
    "slot-uuid-1": "option-uuid-a",
    "slot-uuid-2": "option-uuid-x"
  },
  "has125kgPlates": true
}
```

### Validation rules

| Rule                                                       | Error                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| All slots must be filled — partial map is rejected         | `400` — "All movement slots must be filled"                                                          |
| Every slotId must belong to this program                   | `400` — "One or more slot IDs do not belong to this program"                                         |
| Every optionId must belong to its corresponding slotId     | `400` — "Option X does not belong to slot Y"                                                         |
| **Selections cannot be changed after logging any workout** | `409` — "Movement selections cannot be changed after logging workouts. Contact your coach to reset." |

### UX implications

- Show the movement selection step **before** the athlete starts logging
  workouts. Once they log, selections are locked.
- If `movementSlots` is empty (no slots in the program), skip the selection
  step entirely.
- The `has125kgPlates` toggle should be on the same profile screen as 1RM
  inputs.

---

## 2.3 Computed Day (Workout View)

This is the primary endpoint the athlete sees when opening a training day.
The server resolves movement selections and computes all loads.

```
GET /programs/:programId/days/:dayId/computed
Authorization: Bearer <userJwt>
```

**Response `200`** — `ComputedDayResponseDto`

```json
{
  "dayId": "day-uuid",
  "squatOneRm": 180,
  "benchOneRm": 120,
  "deadliftOneRm": 220,
  "has125kgPlates": true,
  "exercises": [
    {
      "id": "row-uuid",
      "dayId": "day-uuid",
      "sortOrder": 0,
      "category": "SQUAT",
      "exerciseId": "exercise-uuid",
      "exerciseNameOverride": null,
      "resolvedName": "High Bar Squat",
      "sets": 5,
      "repScheme": "5",
      "targetRpe": "8",
      "percentOneRm": null,
      "loadNote": null,
      "notes": null,
      "movementSlotId": "slot-uuid",
      "selectedOptionId": "option-uuid",
      "loadComputation": "RPE_CHART",
      "computedLoad": 140,
      "computedLoadUpper": 147.5,
      "computedLoadLower": 132.5,
      "basisOneRm": 180
    }
  ]
}
```

### How load computation works

The server computes `computedLoad` using four strategies:

| Strategy         | Formula                                      | Required Fields                        |
| ---------------- | -------------------------------------------- | -------------------------------------- |
| `RPE_CHART`      | `1RM × RPE_CHART_PERCENT(rpe, reps) / 10000` | `targetRpe`, `repScheme`, category 1RM |
| `PERCENT_1RM`    | `percentOneRm × 1RM / 10000`                 | `percentOneRm`, category 1RM           |
| `PERCENT_OF_ROW` | `computedLoad(refRow) × loadRefFactor`       | `loadRefExerciseId`, `loadRefFactor`   |
| `NONE`           | `null` (no load)                             | —                                      |

After computing, if `hasPlateCheck` is true:

- `computedLoad` is rounded to the nearest plate increment
- `computedLoadUpper` = target × 1.05, rounded
- `computedLoadLower` = target × 0.95, rounded
- Increment: **2.5 kg** if `has125kgPlates`, otherwise **5 kg**

### How movement slots are resolved

1. If `movementSlotId` is set on a row, the server looks up the athlete's
   selection for that slot.
2. If no selection exists, falls back to the `isDefault` option, then the
   first option by `sortOrder`.
3. The selected option's `exerciseId` and `exerciseName` replace the row's
   values in `exerciseId` and `resolvedName`.
4. If the option has an override for this row (`programExerciseId` match):
   - Non-null override fields replace the base row values.
   - If override `sets === 0`, the row is **removed entirely** from the
     response.

### Rows hidden by overrides

Rows with `sets: 0` in the active option's override are **not returned** in
the `exercises[]` array. The FE does not need to filter them — they're already
gone.

---

## 2.4 Athlete UI Recommendations

### Movement selection screen

Show this screen after the athlete enters their 1RMs and before they start
training. Skip if `movementSlots` is empty.

```
┌─────────────────────────────────────────────┐
│ Choose Your Movements                        │
│                                              │
│ Primary Squat Movement                       │
│ ┌─────────────────────────────────────────┐  │
│ │ ● High Bar Squat (recommended)         │  │
│ │ ○ Low Bar Squat                        │  │
│ │ ○ Safety Bar Squat                     │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ Bench Variation                              │
│ ┌─────────────────────────────────────────┐  │
│ │ ○ Flat Bench Press                     │  │
│ │ ● Close Grip Bench (recommended)       │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ ⚙ I have 1.25kg plates  [✓]                 │
│                                              │
│                              [Save & Start]  │
└─────────────────────────────────────────────┘
```

- Pre-select the `isDefault` option for each slot.
- Mark defaults as "(recommended)".
- Group slots by `category` if desired, or display in `sortOrder`.
- All slots must have a selection before saving.

### Workout day view

Use the `computed` endpoint response directly. Key display logic:

```
┌─────────────────────────────────────────────────────┐
│ Week 1 — Day 1: Squat Day                            │
│                                                      │
│ 1. High Bar Squat                                    │
│    5 × 5  @RPE 8                                     │
│    Target: 140 kg  (132.5 – 147.5 kg)                │
│    ℹ Based on 180 kg squat 1RM                       │
│                                                      │
│ 2. Pause Squat                                       │
│    3 × 3  @RPE 8.5                                   │
│    Target: 126 kg  (120 – 132.5 kg)                  │
│    ℹ 90% of row 1                                    │
│                                                      │
│ 3. Leg Press                                         │
│    4 × 12  @RPE 7                                    │
│    No computed load                                  │
│                                                      │
│                                            [Log]     │
└─────────────────────────────────────────────────────┘
```

- Show `computedLoad` as the primary target.
- Show `computedLoadLower` – `computedLoadUpper` as the acceptable range.
- Show `basisOneRm` as a reference note (e.g. "Based on 180 kg squat 1RM").
- If `computedLoad` is `null`, show "No computed load" or just the RPE / rep
  scheme without a kg target.
- If `loadNote` is set, show it as extra guidance text.

### Locked selections notice

After the athlete logs their first workout, `movementSelections` become
immutable. If they try to change selections:

```
⚠ Movement selections are locked
Your exercise choices were locked when you logged your first workout.
Contact your coach to reset them.
```

---

# Part 3 — TypeScript Types (Client Reference)

These types mirror the server DTOs. Use them in your frontend codebase.

```typescript
// ---- Movement Slots ----

interface MovementSlot {
  id: string; // uuid
  slotKey: string; // unique per program
  label: string; // human-readable
  category: "SQUAT" | "BENCH" | "DEADLIFT" | "ACCESSORY";
  sortOrder: number;
  options: MovementOption[];
}

interface MovementOption {
  id: string; // uuid
  exerciseId: string | null;
  exerciseName: string;
  isDefault: boolean;
  sortOrder: number;
  overrides: MovementOptionOverride[];
}

interface MovementOptionOverride {
  programExerciseId: string; // uuid
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null; // basis points
  loadComputation: string | null;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  loadNote: string | null;
  notes: string | null;
}

// ---- Profile ----

interface ProgramProfile {
  id: string;
  userId: string;
  programId: string;
  squatOneRm: number | null;
  benchOneRm: number | null;
  deadliftOneRm: number | null;
  activeBlockId: string | null;
  movementSelections: Record<string, string> | null;
  has125kgPlates: boolean;
  startedAt: string;
  notes: string | null;
}

interface UpsertProfilePayload {
  squatOneRm?: number | null;
  benchOneRm?: number | null;
  deadliftOneRm?: number | null;
  activeBlockId?: string | null;
  movementSelections?: Record<string, string> | null;
  has125kgPlates?: boolean;
  notes?: string | null;
}

// ---- Computed Day ----

interface ComputedExerciseRow {
  id: string;
  dayId: string;
  sortOrder: number;
  category: "SQUAT" | "BENCH" | "DEADLIFT" | "ACCESSORY";
  exerciseId: string | null;
  exerciseNameOverride: string | null;
  resolvedName: string | null;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null;
  loadNote: string | null;
  notes: string | null;
  movementSlotId: string | null;
  selectedOptionId: string | null;
  loadComputation: string | null;
  computedLoad: number | null;
  computedLoadUpper: number | null;
  computedLoadLower: number | null;
  basisOneRm: number | null;
}

interface ComputedDayResponse {
  dayId: string;
  squatOneRm: number | null;
  benchOneRm: number | null;
  deadliftOneRm: number | null;
  has125kgPlates: boolean;
  exercises: ComputedExerciseRow[];
}
```

---

# Part 4 — Integration Checklist

## Admin Console

- [ ] **Slot manager** — List / create / update / delete movement slots
- [ ] **Option manager** — Add / edit / remove options per slot
- [ ] **Default toggle** — Mark one option as default per slot
- [ ] **Override editor** — Bulk upsert overrides per option (table UI)
- [ ] **Link rows to slots** — Slot dropdown on exercise row editor
- [ ] **Load computation fields** — `loadComputation`, `loadRefFactor`, `loadRefExerciseId`, `hasPlateCheck` on exercise create/edit forms
- [ ] **Visual indicators** — Badge on slotted rows, category labels on slots

## User App

- [ ] **Movement selection screen** — Radio group per slot, pre-select defaults
- [ ] **All-or-nothing validation** — Require all slots filled before save
- [ ] **has125kgPlates toggle** — On profile / 1RM entry screen
- [ ] **Computed day rendering** — Display `computedLoad`, range, `basisOneRm`
- [ ] **Load strategy display** — Show "RPE chart", "% of 1RM", "% of Row X" context
- [ ] **Locked selections** — Show message when 409 is returned on profile update
- [ ] **Empty state** — Skip selection screen if `movementSlots` is empty

---

# Part 5 — Error Handling Reference

| HTTP  | When                               | Message                                                        | FE Action                          |
| ----- | ---------------------------------- | -------------------------------------------------------------- | ---------------------------------- |
| `400` | Partial movement selections        | "All movement slots must be filled"                            | Highlight unfilled slots           |
| `400` | Invalid slotId in selections       | "One or more slot IDs do not belong to this program"           | Re-fetch slots, reset form         |
| `400` | Invalid optionId for slot          | "Option X does not belong to slot Y"                           | Re-fetch slots, reset form         |
| `404` | Slot / option / exercise not found | "...not found"                                                 | Standard 404 handling              |
| `409` | Duplicate slot key (admin)         | "Duplicate slot key"                                           | Show inline error on slotKey field |
| `409` | Selections locked (user)           | "Movement selections cannot be changed after logging workouts" | Show locked notice, disable form   |
