# Movement Selection — Backend Integration Guide

> **Last updated:** 4 May 2026  
> **Audience:** Backend developers building / maintaining the GrindKaro API  
> **Purpose:** Full spec for implementing Movement Selection and a step-by-step
> playbook for setting up any future program that uses swappable movements.

---

## Table of Contents

1. [What Is Movement Selection?](#1-what-is-movement-selection)
2. [How It Works — End-to-End](#2-how-it-works--end-to-end)
3. [Database Schema](#3-database-schema)
4. [API Contracts](#4-api-contracts)
5. [Computed Day Resolution Logic](#5-computed-day-resolution-logic)
6. [Load Computation Strategies](#6-load-computation-strategies)
7. [Locking Rules](#7-locking-rules)
8. [Setting Up a New Program with Movement Slots (Playbook)](#8-setting-up-a-new-program-with-movement-slots-playbook)
9. [DTOs Reference](#9-dtos-reference)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Admin Endpoints](#11-admin-endpoints)

---

## 1. What Is Movement Selection?

Currently every `program_exercise` row has a fixed `exercise_id`. Every
athlete gets the exact same exercise (e.g., "High Bar Squat"). In practice a
coach wants to offer **2–3 variations** of a movement — the athlete picks one
**once** at program start and that choice applies to **every occurrence** of
that movement slot across all days, weeks, and blocks.

**Key constraint:** Selections are **locked** once the athlete logs their first
workout. They cannot be changed without coach intervention.

---

## 2. How It Works — End-to-End

```
COACH (Admin Panel)
  1. Creates program → blocks → weeks → days → exercises (as usual)
  2. Creates a "Movement Slot" for each swappable position
       e.g., slot "squat_primary" → options: [High Bar, Low Bar, SSB]
  3. Links relevant exercise rows to the slot   (sets movementSlotId on the row)
  4. Optionally adds per-option overrides       (different sets/reps/RPE per variation)
  5. Marks one option as default

ATHLETE (Mobile App)
  1. Buys the program → opens it for the first time
  2. Frontend checks:  movementSlots.length > 0  AND  profile.movementSelections == null
       → If true: redirects to /client/movements/:programId  (MovementSelection screen)
  3. Athlete sees every slot as a dropdown, picks their preferred variation
  4. Also sets "I have 1.25 kg plates" toggle (affects load rounding)
  5. Taps "Save & Start Training"
       → PUT /programs/:id/profile  { movementSelections, has125kgPlates }
  6. From now on every computed day resolves exercises through their selection

COMPUTED DAY ENDPOINT
  GET /programs/:programId/days/:dayId/computed
  1. Reads profile.movementSelections
  2. For each exercise row that has a movementSlotId:
       - Looks up the selected option
       - Applies per-row overrides (sets/reps/RPE/load) from that option
       - Overrides exercise identity (exerciseId, resolvedName)
  3. Hides rows where override.sets == 0
  4. Computes load using loadComputation strategy
  5. Returns final list (athlete sees their personalised day)
```

---

## 3. Database Schema

### 3.1 `movement_slot` _(new table)_

| Column       | Type                                            | Constraints            | Notes                                       |
| ------------ | ----------------------------------------------- | ---------------------- | ------------------------------------------- |
| `id`         | UUID                                            | PK                     |                                             |
| `program_id` | UUID                                            | FK → program, NOT NULL |                                             |
| `slot_key`   | VARCHAR(50)                                     | NOT NULL               | e.g. `"squat_primary"`, `"bench_accessory"` |
| `label`      | VARCHAR(100)                                    | NOT NULL               | Shown to athlete, e.g. `"Primary Squat"`    |
| `category`   | ENUM `SQUAT\|BENCH\|DEADLIFT\|ACCESSORY\|OTHER` | NOT NULL               |                                             |
| `sort_order` | INT                                             | NOT NULL, DEFAULT 0    | Display order in selection screen           |
| `created_at` | TIMESTAMP                                       | NOT NULL               |                                             |
| `updated_at` | TIMESTAMP                                       | NOT NULL               |                                             |

**Unique constraint:** `(program_id, slot_key)`

---

### 3.2 `movement_option` _(new table)_

| Column          | Type         | Constraints                 | Notes                         |
| --------------- | ------------ | --------------------------- | ----------------------------- |
| `id`            | UUID         | PK                          |                               |
| `slot_id`       | UUID         | FK → movement_slot, CASCADE |                               |
| `exercise_id`   | UUID         | FK → exercise, NULLABLE     | Link to exercise library      |
| `exercise_name` | VARCHAR(100) | NOT NULL                    | Display name, stored directly |
| `is_default`    | BOOLEAN      | NOT NULL, DEFAULT false     | Exactly one true per slot     |
| `sort_order`    | INT          | NOT NULL, DEFAULT 0         |                               |
| `created_at`    | TIMESTAMP    | NOT NULL                    |                               |

**Constraint:** enforce exactly one `is_default = true` per `slot_id` at the application layer.

---

### 3.3 `movement_option_override` _(new table)_

Per-row parameter overrides. When athlete picks Option X, these values
**replace** the base `program_exercise` row values for that specific row.

| Column                 | Type         | Constraints                     | Notes                                        |
| ---------------------- | ------------ | ------------------------------- | -------------------------------------------- |
| `id`                   | UUID         | PK                              |                                              |
| `option_id`            | UUID         | FK → movement_option, CASCADE   |                                              |
| `program_exercise_id`  | UUID         | FK → program_exercise, NOT NULL | The specific exercise row being overridden   |
| `sets`                 | INT          | NULLABLE                        | **0 = hide this row entirely**               |
| `rep_scheme`           | VARCHAR(50)  | NULLABLE                        | `"5"`, `"amrap"`, `""` (empty string = hide) |
| `target_rpe`           | VARCHAR(20)  | NULLABLE                        | `"@7"`, `"@8-9"`                             |
| `percent_one_rm`       | INT          | NULLABLE                        | Basis points: 5300 = 53.00%                  |
| `load_computation`     | VARCHAR(20)  | NULLABLE                        | Override load strategy (see §6)              |
| `load_ref_factor`      | DECIMAL(4,2) | NULLABLE                        | For `PERCENT_OF_ROW`: e.g. 0.90              |
| `load_ref_exercise_id` | UUID         | FK → program_exercise, NULLABLE | For `PERCENT_OF_ROW`: which row to reference |
| `load_note`            | VARCHAR(200) | NULLABLE                        |                                              |
| `notes`                | TEXT         | NULLABLE                        | Coach notes override                         |

**Unique constraint:** `(option_id, program_exercise_id)`

**Null semantics:** A null value means "keep the base `program_exercise` row value". Only non-null fields override.

---

### 3.4 `program_exercise` — new columns

| Column                 | Change                                               | Notes                             |
| ---------------------- | ---------------------------------------------------- | --------------------------------- |
| `movement_slot_id`     | ADD UUID, FK → movement_slot, NULLABLE, DEFAULT NULL | NULL = fixed exercise (no change) |
| `load_computation`     | ADD VARCHAR(20), DEFAULT `'RPE_CHART'`               | See §6                            |
| `load_ref_factor`      | ADD DECIMAL(4,2), NULLABLE                           | For back-off sets                 |
| `load_ref_exercise_id` | ADD UUID, FK → program_exercise, NULLABLE            | For back-off sets                 |
| `has_plate_check`      | ADD BOOLEAN, DEFAULT false                           | Enables plate-aware rounding      |

---

### 3.5 `program_profile` — new columns

| Column                 | Change                                | Notes                               |
| ---------------------- | ------------------------------------- | ----------------------------------- |
| `movement_selections`  | ADD JSONB, NULLABLE, DEFAULT NULL     | `{ "<slotId>": "<optionId>", ... }` |
| `has_125kg_plates`     | ADD BOOLEAN, NOT NULL, DEFAULT true   | Affects load rounding (2.5 vs 5 kg) |
| `selections_locked_at` | ADD TIMESTAMP, NULLABLE, DEFAULT NULL | Set on first workout log            |

---

## 4. API Contracts

### 4.1 `GET /programs/:programId/content`

Used by frontend on every program open. Add `movementSlots` to the response.

```jsonc
{
  "programId": "...",
  "blocks": [
    /* unchanged */
  ],
  "resources": [
    /* unchanged */
  ],

  // NEW ↓
  "movementSlots": [
    {
      "id": "slot-uuid-1",
      "slotKey": "squat_primary",
      "label": "Primary Squat Movement",
      "category": "SQUAT",
      "sortOrder": 0,
      "options": [
        {
          "id": "opt-uuid-hb",
          "exerciseId": "ex-uuid-highbar", // null if no library link
          "exerciseName": "High Bar Squat",
          "isDefault": false,
          "sortOrder": 0,
          "overrides": [
            {
              "programExerciseId": "pe-uuid-d1r1",
              "sets": 1,
              "repScheme": "7",
              "targetRpe": "@6",
              "percentOneRm": 5300,
              "loadComputation": null, // null = use base row value
              "loadRefFactor": null,
              "loadRefExerciseId": null,
              "loadNote": null,
              "notes": null,
            },
          ],
        },
        {
          "id": "opt-uuid-lb",
          "exerciseName": "Low Bar Squat",
          "isDefault": true,
          "sortOrder": 1,
          "overrides": [
            /* ... */
          ],
        },
      ],
    },
    // ...more slots
  ],
}
```

Also add `movementSlotId` to each `ProgramExerciseResponseDto`:

```jsonc
{
  "id": "pe-uuid-d1r1",
  // ...existing fields...
  "movementSlotId": "slot-uuid-1", // null if fixed exercise
}
```

---

### 4.2 `GET /programs/:programId/profile`

Add new fields to response:

```jsonc
{
  // ...existing fields...
  "movementSelections": {
    "slot-uuid-1": "opt-uuid-lb",
    "slot-uuid-2": "opt-uuid-conv",
  },
  "has125kgPlates": true,
  "selectionsLockedAt": "2026-05-04T10:30:00Z", // null if not yet locked
}
```

---

### 4.3 `PUT /programs/:programId/profile`

Accept new fields:

```jsonc
{
  // ...existing fields (squatOneRm, benchOneRm, deadliftOneRm, activeBlockId)...
  "movementSelections": {
    "slot-uuid-1": "opt-uuid-lb",
    "slot-uuid-2": "opt-uuid-conv",
  },
  "has125kgPlates": true,
}
```

**Validation (server-side):**

| Check                                                              | Failure response        |
| ------------------------------------------------------------------ | ----------------------- |
| Every key is a valid `movement_slot.id` belonging to this program  | `400 Bad Request`       |
| Every value is a valid `movement_option.id` belonging to that slot | `400 Bad Request`       |
| All slots present (no partial saves)                               | `400 Bad Request`       |
| Athlete has ≥ 1 workout log for this program                       | `409 Conflict` (see §7) |

---

### 4.4 `GET /programs/:programId/days/:dayId/computed`

This endpoint already computes loads from 1RM. Add movement resolution as a
pre-pass before load computation.

New fields on each `ComputedExerciseRowDto`:

```jsonc
{
  // ...existing fields (resolvedName, sets, repScheme, computedLoad, etc.)...
  "movementSlotId": "slot-uuid-1", // null if fixed
  "selectedOptionId": "opt-uuid-lb", // which option was resolved
  "computedLoadUpper": 155, // computedLoad × 1.05, plate-rounded
  "computedLoadLower": 140, // computedLoad × 0.95, plate-rounded
}
```

Rows with `override.sets == 0` must be **excluded** from the response entirely
(athlete does not see them).

---

### 4.5 `POST /programs/:programId/profile/reset-selections`

Coach-only endpoint to unlock an athlete's selections.

```
POST /programs/:programId/profile/reset-selections
Authorization: Bearer <coachToken>
Body: { "userId": "athlete-uuid" }
```

Sets `movement_selections = NULL` and `selections_locked_at = NULL` on the
athlete's profile.

**Response `200`:**

```json
{ "message": "Movement selections reset successfully." }
```

---

## 5. Computed Day Resolution Logic

Run this logic for every exercise row **before** load computation:

```
function resolveMovementSelection(exercise, profile, slots):

  if exercise.movementSlotId == null:
    return exercise                          // fixed exercise, no change

  slotId = exercise.movementSlotId
  selectedOptionId = profile.movementSelections?[slotId]

  // 1. Resolve option (selection or default)
  if selectedOptionId != null:
    option = findOption(slots, slotId, selectedOptionId)
  else:
    option = findDefaultOption(slots, slotId)

  if option == null:
    return exercise                          // graceful degrade

  // 2. Override exercise identity (always)
  exercise.exerciseId   = option.exerciseId
  exercise.resolvedName = option.exerciseName
  exercise.selectedOptionId = option.id

  // 3. Apply per-row overrides (only non-null fields win)
  override = option.overrides.find(o => o.programExerciseId == exercise.id)

  if override != null:
    if override.sets == 0:
      exercise.hidden = true                 // caller must exclude this row
      return exercise

    if override.sets          != null:  exercise.sets          = override.sets
    if override.repScheme     != null:  exercise.repScheme     = override.repScheme
    if override.targetRpe     != null:  exercise.targetRpe     = override.targetRpe
    if override.percentOneRm  != null:  exercise.percentOneRm  = override.percentOneRm
    if override.loadComputation:        exercise.loadComputation = override.loadComputation
    if override.loadRefFactor  != null: exercise.loadRefFactor  = override.loadRefFactor
    if override.loadRefExerciseId:      exercise.loadRefExerciseId = override.loadRefExerciseId
    if override.loadNote      != null:  exercise.loadNote      = override.loadNote
    if override.notes         != null:  exercise.notes         = override.notes

  return exercise
```

---

## 6. Load Computation Strategies

After movement resolution, compute load using `exercise.loadComputation`:

| Strategy         | Formula                                                   | Used For                            |
| ---------------- | --------------------------------------------------------- | ----------------------------------- |
| `RPE_CHART`      | `MROUND(e1RM / rpeTable[rpe][reps], plateRound)`          | Main lifts (Squat, Bench, Deadlift) |
| `PERCENT_1RM`    | `MROUND(category1RM × percentOneRm, plateRound)`          | Accessories                         |
| `PERCENT_OF_ROW` | `MROUND(refRow.computedLoad × loadRefFactor, plateRound)` | Back-off sets                       |
| `NONE`           | `null`                                                    | Bodyweight / no target load         |

**Plate rounding:**

- `has_125kg_plates = true` → round to nearest **2.5 kg**
- `has_125kg_plates = false` → round to nearest **5 kg**

Only apply plate rounding when `has_plate_check = true` on the exercise row.
If `has_plate_check = false`, always round to 2.5 kg.

**Load range (always compute both):**

```
computedLoadUpper = MROUND(computedLoad × 1.05, plateRound)
computedLoadLower = MROUND(computedLoad × 0.95, plateRound)
```

**E1RM formula (Brzycki):**

```
e1RM = weight / (1.0278 − 0.0278 × reps)
```

---

## 7. Locking Rules

Movement selections are **locked** once the athlete logs their first workout
for the program.

| Trigger                                                                                   | Action                                               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `POST /programs/:id/days/:dayId/log` succeeds                                             | Set `selections_locked_at = NOW()` if currently null |
| `PUT /programs/:id/profile` with `movementSelections` when `selections_locked_at != null` | Return `409 Conflict`                                |

**409 response body:**

```json
{
  "statusCode": 409,
  "message": "Movement selections cannot be changed after logging workouts. Contact your coach to reset.",
  "error": "Conflict"
}
```

Coaches can reset via `POST /programs/:id/profile/reset-selections`.

---

## 8. Setting Up a New Program with Movement Slots (Playbook)

This section is the **step-by-step guide for configuring a new program**
so that the Movement Selection screen works correctly.

### Step 1 — Build the program as usual

Create blocks → weeks → days → exercises in the admin panel.
For any exercise that will be swappable, leave it pointing to the **default
variation** for now (e.g., "High Bar Squat"). We will link it to a slot in
Step 3.

### Step 2 — Create Movement Slots

For each swappable position in the program call:

```
POST /admin/programs/:programId/movement-slots
{
  "slotKey": "squat_primary",          // unique identifier, snake_case
  "label": "Primary Squat Movement",   // shown to athlete
  "category": "SQUAT",                 // SQUAT | BENCH | DEADLIFT | ACCESSORY | OTHER
  "sortOrder": 0                       // order on selection screen (0 = first)
}
```

Typical slots for a powerlifting program:

| slotKey            | label                     | category  | sortOrder |
| ------------------ | ------------------------- | --------- | --------- |
| `squat_primary`    | Primary Squat Movement    | SQUAT     | 0         |
| `bench_primary`    | Primary Bench Movement    | BENCH     | 1         |
| `deadlift_primary` | Primary Deadlift Movement | DEADLIFT  | 2         |
| `squat_accessory`  | Squat Accessory           | ACCESSORY | 3         |
| `bench_accessory`  | Bench Accessory           | ACCESSORY | 4         |

### Step 3 — Add Options to Each Slot

```
POST /admin/movement-slots/:slotId/options
{
  "exerciseId": "ex-uuid-highbar",     // optional, link to exercise library
  "exerciseName": "High Bar Squat",
  "isDefault": true,                   // exactly one per slot must be true
  "sortOrder": 0
}
```

Example for `squat_primary`:

| exerciseName     | isDefault | sortOrder |
| ---------------- | --------- | --------- |
| High Bar Squat   | **true**  | 0         |
| Low Bar Squat    | false     | 1         |
| Safety Bar Squat | false     | 2         |

> **Rule:** Exactly one option per slot must have `isDefault: true`. This is
> what athletes get if they somehow skip the selection screen, and it is the
> fallback used by `GET /computed`.

### Step 4 — Link Exercise Rows to Slots

For every `program_exercise` row that should be swappable, set its
`movementSlotId`:

```
PUT /admin/program-exercises/:exerciseId/slot
{
  "movementSlotId": "slot-uuid-squat-primary"   // or null to unlink
}
```

**Important:** Link **every** occurrence across all days/weeks to the same
slot. For example, if "Squat" appears on Day 1 of all 12 weeks, all 12 rows
should point to `slot_squat_primary`. The selection screen maps one choice to
all of them simultaneously.

### Step 5 — Add Per-Option Overrides (if needed)

If the different variations have different parameters (sets/reps/RPE/load),
add overrides via bulk upsert:

```
PUT /admin/movement-options/:optionId/overrides
{
  "overrides": [
    {
      "programExerciseId": "pe-uuid-day1-row1",
      "sets": 1,
      "repScheme": "5",
      "targetRpe": "@7",
      "percentOneRm": 5800,
      "loadComputation": "RPE_CHART",
      "loadRefFactor": null,
      "loadRefExerciseId": null,
      "loadNote": null,
      "notes": null
    },
    {
      "programExerciseId": "pe-uuid-day1-row2",
      "sets": 0              // sets=0 hides this back-off row for this variation
    }
  ]
}
```

**When to skip this step:** If all variations use the same sets/reps/RPE as
the base `program_exercise` row, no overrides are needed. The base values are
always used as fallback.

### Step 6 — Verify

Call `GET /programs/:programId/content` and check:

- `movementSlots` array has all your slots
- Each slot has the correct options
- Each option has its overrides listed
- Every program exercise row that should be swappable has `movementSlotId` set

Call `GET /programs/:programId/days/:dayId/computed` with a test profile that
has `movementSelections` set and verify:

- `resolvedName` matches the selected option's `exerciseName`
- Overridden sets/reps/RPE appear correctly
- Rows with `sets=0` override are absent from the response
- `computedLoad`, `computedLoadUpper`, `computedLoadLower` are correct

---

## 9. DTOs Reference

```typescript
// ─── Response DTOs ─────────────────────────────────────────

interface MovementSlotResponseDto {
  id: string;
  slotKey: string;
  label: string;
  category: "SQUAT" | "BENCH" | "DEADLIFT" | "ACCESSORY" | "OTHER";
  sortOrder: number;
  options: MovementOptionResponseDto[];
}

interface MovementOptionResponseDto {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  isDefault: boolean;
  sortOrder: number;
  overrides: MovementOptionOverrideDto[];
}

interface MovementOptionOverrideDto {
  programExerciseId: string;
  sets: number | null; // 0 = hide row
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null; // basis points: 5300 = 53.00%
  loadComputation:
    | "RPE_CHART"
    | "PERCENT_1RM"
    | "PERCENT_OF_ROW"
    | "NONE"
    | null;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  loadNote: string | null;
  notes: string | null;
}

// ─── Updated existing DTOs ─────────────────────────────────

// ProgramContentResponseDto — ADD:
//   movementSlots: MovementSlotResponseDto[]

// ProgramExerciseResponseDto — ADD:
//   movementSlotId: string | null
//   loadComputation: "RPE_CHART" | "PERCENT_1RM" | "PERCENT_OF_ROW" | "NONE"
//   loadRefFactor: number | null
//   loadRefExerciseId: string | null
//   hasPlateCheck: boolean

// ProgramProfileResponseDto — ADD:
//   movementSelections: Record<string, string> | null   // { slotId: optionId }
//   has125kgPlates: boolean
//   selectionsLockedAt: string | null

// UpsertProgramProfileDto — ADD:
//   movementSelections?: Record<string, string>
//   has125kgPlates?: boolean

// ComputedExerciseRowDto — ADD:
//   movementSlotId: string | null
//   selectedOptionId: string | null
//   computedLoadUpper: number | null
//   computedLoadLower: number | null
```

---

## 10. Edge Cases & Error Handling

| Scenario                                                                 | Expected Behaviour                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `movementSlots` is empty for a program                                   | Feature is invisible. No selection screen shown. All exercises computed as before.                                          |
| Athlete hasn't made selections yet                                       | Computed day uses `isDefault` option for each slot.                                                                         |
| Coach deletes a slot after athlete selected                              | Exercise row `movementSlotId` becomes orphaned. Treat as fixed (no swap). Use last saved `resolvedName` as display name.    |
| Coach deletes the athlete's selected option                              | Fall back to `isDefault` option for that slot.                                                                              |
| Slot has only 1 option                                                   | Frontend still shows the selection screen (athlete confirms). Auto-selecting is an option but keeping it explicit is safer. |
| Override exists for some rows but not all                                | Rows without an override use base `program_exercise` values — never fail.                                                   |
| Override has partial nulls                                               | Only non-null fields override. Keep base values for nulls.                                                                  |
| `loadComputation = PERCENT_OF_ROW` and `loadRefExerciseId` row is hidden | `computedLoad = null`. Do not throw.                                                                                        |
| Athlete sends partial `movementSelections` (missing some slots)          | Return `400 Bad Request`. All slots must be filled in one save.                                                             |
| `has125kgPlates` not sent in PUT                                         | Keep existing value (do not reset to default).                                                                              |

---

## 11. Admin Endpoints

All admin endpoints require `AdminGuard` (admin JWT).

| Method | Endpoint                                      | Description                                                        |
| ------ | --------------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/admin/programs/:id/movement-slots`          | List all slots with options & overrides                            |
| POST   | `/admin/programs/:id/movement-slots`          | Create a slot                                                      |
| PATCH  | `/admin/movement-slots/:slotId`               | Update slot (label / category / sortOrder)                         |
| DELETE | `/admin/movement-slots/:slotId`               | Delete slot → cascades options + overrides + unlinks exercise rows |
| POST   | `/admin/movement-slots/:slotId/options`       | Add option to slot                                                 |
| PATCH  | `/admin/movement-options/:optionId`           | Update option                                                      |
| DELETE | `/admin/movement-options/:optionId`           | Delete option → cascades overrides                                 |
| PUT    | `/admin/movement-options/:optionId/overrides` | Bulk upsert per-row overrides                                      |
| PUT    | `/admin/program-exercises/:exerciseId/slot`   | Link / unlink exercise row to a slot                               |
| GET    | `/admin/programs/:id/athlete-selections`      | View which athletes selected which variations                      |

---

## Appendix A — Real Movement Slots (Current Program Reference)

These are the **9 actual movement slots** extracted from the coach's spreadsheet
for the current powerlifting program. Use this as a concrete reference for
seeding / testing / building the admin panel.

---

### Slot 1: Primary Squat

| Field       | Value                        |
| ----------- | ---------------------------- |
| `slotKey`   | `squat_primary`              |
| `label`     | `Primary Squat Movement`     |
| `category`  | `SQUAT`                      |
| Load method | **E1RM-based** (`RPE_CHART`) |

| Option             | Default |
| ------------------ | ------- |
| **Low Bar Squat**  | ✓       |
| **High Bar Squat** |         |

**Week-by-week override progression (per day that has a squat):**

| Week | Row        | Low Bar reps/@RPE | High Bar reps/@RPE |
| ---- | ---------- | ----------------- | ------------------ |
| 1    | Top set    | 3 @5              | 5 @5               |
| 1    | Back-off 1 | 5 @5              | 7 @5               |
| 1    | Back-off 2 | 5 @6              | 7 @6               |
| 2    | Top set    | 3 @6              | 5 @6               |
| 2    | Back-off 1 | 5 @5.5            | 7 @6               |
| 2    | Back-off 2 | 5 @6.5            | 7 @7               |
| 3    | Top set    | 3 @7              | 5 @7               |
| 3    | Back-off 1 | 5 @6              | 7 @6               |
| 3    | Back-off 2 | 5 @7              | 7 @7               |
| 4    | Top set    | 3 @8              | 5 @8               |
| 4    | Back-off 1 | 5 @7              | 7 @7               |
| 4    | Back-off 2 | 5 @8              | 7 @8               |

> Each row is a separate `program_exercise` row. The base row stores Low Bar
> values. High Bar values are stored as `movement_option_override` records on
> the High Bar option.

---

### Slot 2: Competition Bench Press

| Field       | Value                        |
| ----------- | ---------------------------- |
| `slotKey`   | `bench_competition`          |
| `label`     | `Competition Bench Movement` |
| `category`  | `BENCH`                      |
| Load method | **E1RM-based** (`RPE_CHART`) |

| Option                  | Default |
| ----------------------- | ------- |
| 2ct Paused Bench Press  | ✓       |
| 2ct Paused Larsen Press |         |

**Week-by-week (5 rows per day):**

| Week | Row   | Paused BP reps/@RPE | Larsen BP reps/@RPE |
| ---- | ----- | ------------------- | ------------------- |
| 1    | Row 1 | 1 @6                | 3 @7                |
| 1    | Row 2 | 3 @6                | 5 @6                |
| 1    | Row 3 | 3 @7                | 5 @7                |
| 1    | Row 4 | 5 @5                | 7 @5                |
| 1    | Row 5 | 5 @6                | 7 @6                |
| 2    | Row 1 | 1 @7                | 3 @8                |
| 2    | Row 2 | 3 @6                | 5 @6                |
| 2    | Row 3 | 3 @7                | 5 @7                |
| 2    | Row 4 | 5 @5                | 7 @5                |
| 2    | Row 5 | 5 @6                | 7 @6                |
| 3    | Row 1 | 1 @8                | 3 @8                |
| 3    | Row 2 | 3 @6.5              | 5 @6                |
| 3    | Row 3 | 3 @7.5              | 5 @8                |
| 3    | Row 4 | 5 @6                | 7 @6                |
| 3    | Row 5 | 5 @7                | 7 @7                |
| 4    | Row 1 | 1 @8.5              | 3 @9                |
| 4    | Row 2 | 3 @7                | 5 @7.5              |
| 4    | Row 3 | 3 @8                | 5 @8.5              |
| 4    | Row 4 | 5 @6                | 7 @6                |
| 4    | Row 5 | 5 @7                | 7 @7                |

---

### Slot 3: Primary Deadlift

| Field       | Value                        |
| ----------- | ---------------------------- |
| `slotKey`   | `deadlift_primary`           |
| `label`     | `Primary Deadlift Movement`  |
| `category`  | `DEADLIFT`                   |
| Load method | **E1RM-based** (`RPE_CHART`) |

| Option                | Default |
| --------------------- | ------- |
| Conventional Deadlift | ✓       |
| Sumo Deadlift         |         |

| Week | Row        | Conventional reps/@RPE | Sumo reps/@RPE |
| ---- | ---------- | ---------------------- | -------------- |
| 1    | Top set    | 1 @7                   | 3 @6           |
| 1    | Back-off 1 | 3 @5                   | 5 @5           |
| 1    | Back-off 2 | 3 @6                   | 5 @6           |
| 2    | Top set    | 1 @7                   | 3 @7           |
| 2    | Back-off 1 | 3 @5.5                 | 5 @6           |
| 2    | Back-off 2 | 3 @6.5                 | 5 @7           |
| 3    | Top set    | 1 @8                   | 3 @6           |
| 3    | Back-off 1 | 3 @5                   | 5 @7           |
| 3    | Back-off 2 | 3 @6                   | 5 @8           |
| 4    | Top set    | 1 @8                   | 3 @8           |
| 4    | Back-off 1 | 3 @6                   | 5 @7           |
| 4    | Back-off 2 | 3 @7                   | 5 @8.5         |

---

### Slot 4: Bench Accessory Variation

| Field       | Value                          |
| ----------- | ------------------------------ |
| `slotKey`   | `bench_accessory_variation`    |
| `label`     | `Bench Press Variation`        |
| `category`  | `BENCH`                        |
| Load method | **%1RM-based** (`PERCENT_1RM`) |

| Option                  | Sets | Reps | %1RM W1→W2→W3→W4      |
| ----------------------- | ---- | ---- | --------------------- |
| Spoto Press             | 2    | 7    | 58% → 61% → 64% → 67% |
| 3-1-0 Tempo Bench Press | 2    | 5    | 65% → 67% → 69% → 71% |
| 4ct Paused Bench Press  | 2    | 3    | 53% → 56% → 59% → 62% |

> Sets and reps stay fixed; only `percentOneRm` increases each week via the
> override on each week's `program_exercise` row.

---

### Slot 5: Deadlift Accessory Variation

| Field       | Value                          |
| ----------- | ------------------------------ |
| `slotKey`   | `deadlift_accessory_variation` |
| `label`     | `Deadlift Variation`           |
| `category`  | `DEADLIFT`                     |
| Load method | **%1RM-based** (`PERCENT_1RM`) |

| Option                     | Sets | Reps | %1RM W1→W2→W3→W4      |
| -------------------------- | ---- | ---- | --------------------- |
| 2ct Paused Conventional DL | 1    | 4    | 65% → 67% → 69% → 71% |
| Romanian Deadlift          | 3    | 8    | 51% → 54% → 57% → 60% |
| 2ct Paused Sumo DL         | 2    | 6    | 67% → 69% → 71% → 73% |

---

### Slot 6: TNG Bench Grip Width

| Field       | Value                          |
| ----------- | ------------------------------ |
| `slotKey`   | `bench_tng_grip`               |
| `label`     | `TNG Bench Grip Width`         |
| `category`  | `BENCH`                        |
| Load method | **%1RM-based** (`PERCENT_1RM`) |

| Option                   | Sets | Reps | %1RM W1→W2→W3→W4      |
| ------------------------ | ---- | ---- | --------------------- |
| Shoulder Width TNG Bench | 2    | 5    | 51% → 55% → 59% → 63% |
| Med Grip TNG Bench       | 2    | 7    | 58% → 61% → 64% → 67% |
| Wide Grip TNG Bench      | 2    | 10   | 53% → 56% → 59% → 62% |

---

### Slot 7: Squat Accessory Variation

| Field       | Value                          |
| ----------- | ------------------------------ |
| `slotKey`   | `squat_accessory_variation`    |
| `label`     | `Squat Variation`              |
| `category`  | `SQUAT`                        |
| Load method | **%1RM-based** (`PERCENT_1RM`) |

| Option                            | Sets | Reps | %1RM W1→W2→W3→W4      |
| --------------------------------- | ---- | ---- | --------------------- |
| 2ct Low Bar Paused Squat          | 2    | 4    | 60% → 63% → 66% → 69% |
| 2ct High Bar Paused Squat         | 2    | 6    | 65% → 67% → 69% → 71% |
| 3-0-0 Tempo Squat (any variation) | 2    | 5    | 67% → 69% → 71% → 73% |

---

### Slot 8: Dips Variation _(demonstrates variable row visibility)_

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| `slotKey`   | `dips_variation`                                                               |
| `label`     | `Dips Movement`                                                                |
| `category`  | `BENCH`                                                                        |
| Load method | **Mixed** — `RPE_CHART` top set → `PERCENT_OF_ROW` back-offs, or `NONE` for BW |

The base exercise has **3 rows per day**. BW options hide rows 2 and 3 via
`sets=0` overrides.

| Option                     | Row 1 (Top set) | Row 2 (Back-off)   | Row 3 (AMRAP)             |
| -------------------------- | --------------- | ------------------ | ------------------------- |
| Weighted Parallel Bar Dips | 1×8 @6          | 2×6 (90% of Row 1) | 1×AMRAP @8 (80% of Row 2) |
| BW Parallel Bar Dips       | 2×AMRAP @7      | ❌ sets=0 (hidden) | ❌ sets=0 (hidden)        |
| 2ct Paused Weighted Dips   | 1×3 @6          | 3×5 (90% of Row 1) | 1×AMRAP @8 (80% of Row 2) |
| 2ct Paused BW Dips         | 1×AMRAP @7      | ❌ sets=0 (hidden) | ❌ sets=0 (hidden)        |
| Assisted Parallel Bar Dips | 3×AMRAP @7      | ❌ sets=0 (hidden) | ❌ sets=0 (hidden)        |

**RPE progression for Weighted option:**

| Week | Row 1 RPE | Row 2 load        | Row 3 RPE |
| ---- | --------- | ----------------- | --------- |
| 1    | @6        | 90% of Row 1 load | @8        |
| 2    | @7        | 90% of Row 1 load | @8        |
| 3    | @8        | 90% of Row 1 load | @8        |
| 4    | @8        | 90% of Row 1 load | @8        |

---

### Slot 9: Pullups Variation _(same pattern as Dips)_

| Field       | Value                    |
| ----------- | ------------------------ |
| `slotKey`   | `pullups_variation`      |
| `label`     | `Pullups Movement`       |
| `category`  | `ACCESSORY`              |
| Load method | **Mixed** — same as Dips |

| Option                        | Row 1 (Top set) | Row 2 (Back-off)    | Row 3 (AMRAP)             |
| ----------------------------- | --------------- | ------------------- | ------------------------- |
| Weighted Pullups              | 1×7 @6          | 2×7 (90% of Row 1)  | 1×AMRAP @8 (80% of Row 2) |
| Weighted Chinups              | 1×10 @6         | 2×10 (90% of Row 1) | 1×AMRAP @8 (80% of Row 2) |
| Weighted Neutral Grip Pullups | 1×5 @6          | 2×10 (90% of Row 1) | 1×AMRAP @8 (80% of Row 2) |
| Assisted Pullups (any grip)   | 4×AMRAP @7      | ❌ sets=0 (hidden)  | ❌ sets=0 (hidden)        |
| Paused Pullups (any grip)     | 2×AMRAP @7      | ❌ sets=0 (hidden)  | ❌ sets=0 (hidden)        |

---

## Appendix B — Key Implementation Patterns

### B.1 Two Rep/RPE Change Patterns

**Main lifts (`RPE_CHART`):** Reps are **FIXED per variation**, RPE increases each week.

- Low Bar Squat always does 3-rep top sets, 5-rep back-offs
- High Bar Squat always does 5-rep top sets, 7-rep back-offs
- RPE climbs: @5 → @6 → @7 → @8 across weeks

**Accessories (`PERCENT_1RM`):** Sets and reps are **FIXED per variation**, `percentOneRm` increases each week.

- Spoto Press is always 2×7 — load goes 58% → 61% → 64% → 67%
- 4ct Paused BP is always 2×3 — load goes 53% → 56% → 59% → 62%

### B.2 How Overrides Map to Exercise Rows

Each "set" in the coach's spreadsheet = one `program_exercise` row. Example
for Primary Squat on Day 1 Week 1:

```
program_exercise rows for Day 1 Week 1:
  Row A: movementSlotId="squat_primary", sets=1, repScheme="3", targetRpe="@5"  ← base (Low Bar default)
  Row B: movementSlotId="squat_primary", sets=1, repScheme="5", targetRpe="@5"  ← base
  Row C: movementSlotId="squat_primary", sets=1, repScheme="5", targetRpe="@6"  ← base

High Bar option overrides for this day:
  Row A override: repScheme="5", targetRpe="@5"   (3→5 reps)
  Row B override: repScheme="7", targetRpe="@5"   (5→7 reps)
  Row C override: repScheme="7", targetRpe="@6"   (5→7 reps)
```

The base row stores the **default (Low Bar)** values. The alternate option
stores only the **differences** as overrides.

### B.3 PERCENT_OF_ROW Processing Order

`PERCENT_OF_ROW` rows reference another row's `computedLoad`. The resolver
**must process rows in `sort_order` ascending** so the referenced row is
always computed before the dependent row.

```
Sort rows by sort_order before computing.
For each row:
  1. resolveMovementSelection(row)   // may change loadComputation
  2. computeLoad(row, computed_so_far)  // PERCENT_OF_ROW looks up computed_so_far
  3. store in computed_so_far[row.id] = row.computedLoad
```

### B.4 AMRAP Handling

`repScheme = "amrap"` is a special value:

- Do **not** try to compute load from RPE chart (no reps to plug in)
- Use `PERCENT_OF_ROW` or `NONE` for load computation
- Frontend shows "AMRAP" instead of a rep count

### B.5 Plate Rounding Decision

```
increment = (exercise.hasPlateCheck && !profile.has125kgPlates) ? 5 : 2.5
computedLoad      = MROUND(rawLoad,        increment)
computedLoadUpper = MROUND(rawLoad × 1.05, increment)
computedLoadLower = MROUND(rawLoad × 0.95, increment)
```

If `hasPlateCheck = false` on the row → always use 2.5 kg increment.

### B.6 Hidden Row Convention

- Override `sets=0` → row is hidden for that option
- Backend: skip load computation, **exclude from response**
- Frontend never receives these rows — no filtering needed client-side

### B.7 Athlete Dashboard Fields Referenced (from Spreadsheet)

The spreadsheet pulls these from the "Athlete Dashboard" tab — backend equivalents:

| Spreadsheet cell | Backend field                  |
| ---------------- | ------------------------------ |
| D7               | `profile.squatOneRm` (E1RM)    |
| D17              | `profile.benchOneRm` (E1RM)    |
| D26/D27          | `profile.deadliftOneRm` (E1RM) |
| D18–D23          | `profile.movementSelections`   |
| D36              | `profile.has125kgPlates`       |

---

## Appendix C — Formula Engine Architecture

### C.1 Core Principle: Generic Engine, Per-Program Data

The load computation system is **not** per-program custom code. It is a single
reusable formula engine. The coach picks the formula type per row and fills
in the parameters. No program-specific code branching anywhere.

```
┌─────────────────────────────────────────────────────────────┐
│                 FORMULA ENGINE (shared code)                 │
│                                                             │
│  RPE_CHART      →  e1rm / rpeTable[rpe][reps]              │
│  PERCENT_1RM    →  category1RM × percentOneRm              │
│  PERCENT_OF_ROW →  refRow.computedLoad × loadRefFactor     │
│  NONE           →  null                                     │
│                                                             │
│  + plateRounding(load, has125kgPlates, hasPlateCheck)       │
│  + loadRange(load × 0.95, load × 1.05)                     │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
  Program A data      Program B data       Program C data
  (different          (different           (different
   rpe/% values)       rpe/% values)        rpe/% values)
```

### C.2 What Changes Per Program (Data, Not Code)

Each `program_exercise` row stores its own formula inputs. Different programs
just have different values in the same columns:

| Row | `load_computation` | `target_rpe` | `percent_one_rm` | `load_ref_factor` | `rep_scheme` |
| --- | ------------------ | ------------ | ---------------- | ----------------- | ------------ |
| 1   | `RPE_CHART`        | @7           | —                | —                 | 3            |
| 2   | `RPE_CHART`        | @5           | —                | —                 | 5            |
| 3   | `PERCENT_1RM`      | —            | 5800             | —                 | 7            |
| 4   | `PERCENT_OF_ROW`   | —            | —                | 0.90              | 6            |

A different program would have different numbers in the same columns. Same
4 formula types. No new code needed.

### C.3 When Would We Need a New Formula Type?

Only if a future program has a genuinely **new calculation method** that cannot
be expressed with `RPE_CHART`, `PERCENT_1RM`, `PERCENT_OF_ROW`, or `NONE`.
This should be extremely rare. When in doubt, check whether the existing types
cover it with different parameter values first.

---

## Appendix D — Frontend Behaviour Summary

The frontend (`MovementSelection.tsx`) does the following so the backend knows
what to expect:

1. **Reads** `GET /programs/:id/content` → `movementSlots[]` to build the UI
2. **Reads** `GET /programs/:id/profile` → `movementSelections` to pre-fill
   saved choices and determine if selections are locked
3. **Fills defaults** client-side: if a slot has no saved selection, the
   option with `isDefault: true` is pre-selected in the UI (not saved yet)
4. **Saves** via `PUT /programs/:id/profile` → sends **every slot filled**
   (no partial saves)
5. **Locks** — once `profile.movementSelections` is non-null with all slots
   filled, the screen becomes read-only (dropdowns disabled, no save button)
6. **Redirects** on save → `/client/workout/:programId`

The `has125kgPlates` toggle is saved alongside `movementSelections` in the
same PUT call.
