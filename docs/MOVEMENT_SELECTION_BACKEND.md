# Movement Selection Feature — Backend Implementation Doc

> **Date:** 4 May 2026  
> **Author:** Frontend Team (GrindKaro App)  
> **Priority:** High — blocks athlete onboarding UX

---

## 1. Problem Statement

Currently, when a coach creates a program, exercises are **fixed** — every athlete gets the same exercise (e.g., "High Bar Squat"). In reality, coaches give athletes a **choice of movement variations** (e.g., High Bar / Low Bar / SSB Squat). The athlete picks once at program start, and that choice applies to **every occurrence** of that movement across all days/weeks/blocks.

**Current behavior:** `ProgramExercise.exerciseId` is hardcoded → no way for athlete to swap.

**Desired behavior:** Coach defines "movement slots" with multiple options. Athlete selects their preferred variation once. All exercises linked to that slot resolve to the selected variation.

---

## 2. User Flow

```
Coach (Admin Panel):
  1. Creates program as usual (blocks → weeks → days → exercises)
  2. For certain exercises, creates a "Movement Slot" with 2-3 variations
     e.g., Slot: "Primary Squat" → [High Bar Squat, Low Bar Squat, SSB Squat]
  3. Links exercises across multiple days to this slot
  4. Marks one variation as default

Athlete (Mobile App):
  1. Purchases program → opens it for the first time
  2. Sees "Select Your Movements" screen (one-time setup)
     - Primary Squat: [High Bar ○] [Low Bar ●] [SSB ○]
     - Primary Deadlift: [Conventional ○] [Sumo ●]
  3. Saves selections → stored in their ProgramProfile
  4. From now on, every "Squat" exercise across all days shows their chosen variation
  5. Computed Day API resolves the correct exercise name + loads based on selection
```

---

## 3. Database Schema Changes

### 3.1 New Table: `movement_slot`

| Column       | Type                   | Constraints               | Description                                         |
| ------------ | ---------------------- | ------------------------- | --------------------------------------------------- |
| `id`         | UUID                   | PK                        |                                                     |
| `program_id` | UUID                   | FK → program.id, NOT NULL | Which program this slot belongs to                  |
| `slot_key`   | VARCHAR(50)            | NOT NULL                  | Identifier, e.g., `"squat_main"`, `"deadlift_main"` |
| `label`      | VARCHAR(100)           | NOT NULL                  | Display label, e.g., `"Primary Squat Movement"`     |
| `category`   | ENUM(ExerciseCategory) | NOT NULL                  | `SQUAT`, `BENCH`, `DEADLIFT`, `ACCESSORY`, `OTHER`  |
| `sort_order` | INT                    | NOT NULL, DEFAULT 0       | Display ordering                                    |
| `created_at` | TIMESTAMP              | NOT NULL                  |                                                     |
| `updated_at` | TIMESTAMP              | NOT NULL                  |                                                     |

**Unique constraint:** `(program_id, slot_key)`

### 3.2 New Table: `movement_option`

Each option represents a **full exercise variation** — not just a name, but also its own sets/reps/RPE/load parameters.

| Column          | Type         | Constraints                              | Description                            |
| --------------- | ------------ | ---------------------------------------- | -------------------------------------- |
| `id`            | UUID         | PK                                       |                                        |
| `slot_id`       | UUID         | FK → movement_slot.id, NOT NULL, CASCADE |                                        |
| `exercise_id`   | UUID         | FK → exercise.id, NULLABLE               | Link to exercise library (if exists)   |
| `exercise_name` | VARCHAR(100) | NOT NULL                                 | Display name, e.g., `"High Bar Squat"` |
| `is_default`    | BOOLEAN      | NOT NULL, DEFAULT false                  | Coach marks one as default             |
| `sort_order`    | INT          | NOT NULL, DEFAULT 0                      |                                        |
| `created_at`    | TIMESTAMP    | NOT NULL                                 |                                        |

**Constraint:** Exactly one `is_default = true` per `slot_id`.

### 3.3 New Table: `movement_option_override`

Per-exercise-row overrides for each option. When athlete selects an option, these values **replace** the base `program_exercise` row's fields.

> **Why per-row, not per-day?** A single day can have 3 `program_exercise` rows for the same slot (e.g., Dips top set + back-off 1 + back-off 2). Each row needs its own override.

| Column                 | Type         | Constraints                                | Description                                                                      |
| ---------------------- | ------------ | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `id`                   | UUID         | PK                                         |                                                                                  |
| `option_id`            | UUID         | FK → movement_option.id, NOT NULL, CASCADE |                                                                                  |
| `program_exercise_id`  | UUID         | FK → program_exercise.id, NOT NULL         | Which specific exercise row this override targets                                |
| `sets`                 | INT          | NULLABLE                                   | Override sets (null = use base, **0 = hide row**)                                |
| `rep_scheme`           | VARCHAR(50)  | NULLABLE                                   | Override rep scheme, e.g., `"5"`, `"amrap"`, `""` (empty=hide)                   |
| `target_rpe`           | VARCHAR(20)  | NULLABLE                                   | Override RPE, e.g., `"@7"`, `"@8-9"`, `""` (empty=hide)                          |
| `percent_one_rm`       | INT          | NULLABLE                                   | Override %1RM in basis points (5300 = 53.00%)                                    |
| `load_computation`     | VARCHAR(20)  | NULLABLE                                   | Override load type: `"RPE_CHART"`, `"PERCENT_1RM"`, `"PERCENT_OF_ROW"`, `"NONE"` |
| `load_ref_factor`      | DECIMAL(4,2) | NULLABLE                                   | For `PERCENT_OF_ROW`: factor (0.90 = 90%, 0.80 = 80%)                            |
| `load_ref_exercise_id` | UUID         | FK → program_exercise.id, NULLABLE         | For `PERCENT_OF_ROW`: which row's load to reference                              |
| `load_note`            | VARCHAR(200) | NULLABLE                                   | Override load note                                                               |
| `notes`                | TEXT         | NULLABLE                                   | Override coach notes                                                             |

**Unique constraint:** `(option_id, program_exercise_id)` — one override per option per exercise row.

**Hidden row pattern:** When an option doesn't use a row (e.g., BW dips has no back-off sets), set `sets=0` and `rep_scheme=""`. Frontend treats this as a hidden row and doesn't render it.

**How it works:**

- Coach creates a slot with 5 options (e.g., Dips variations)
- Day 2 has 3 `program_exercise` rows for this slot: top set (Row A), back-off (Row B), AMRAP (Row C)
- For "Weighted dips": Row A override = 1×8 @6, Row B = 2×6 (load=90% of Row A), Row C = 1×AMRAP @8 (load=80% of Row B)
- For "BW dips": Row A override = 2×AMRAP @7, Row B = sets=0 (hidden), Row C = sets=0 (hidden)
- For "Assisted dips": Row A override = 3×AMRAP @7, Row B = sets=0 (hidden), Row C = sets=0 (hidden)
- If no override exists for a row+option → use the base `program_exercise` row values (fallback)

### 3.4 Alter Table: `program_exercise`

| Column                 | Change                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `movement_slot_id`     | **ADD** UUID, FK → movement_slot.id, NULLABLE, DEFAULT NULL |
| `load_computation`     | **ADD** VARCHAR(20), DEFAULT `'RPE_CHART'`                  |
| `load_ref_factor`      | **ADD** DECIMAL(4,2), NULLABLE                              |
| `load_ref_exercise_id` | **ADD** UUID, FK → program_exercise.id, NULLABLE            |
| `has_plate_check`      | **ADD** BOOLEAN, DEFAULT false                              |

**`load_computation` values:**

- `"RPE_CHART"` — load from RPE×Reps lookup table using athlete's E1RM (main lifts)
- `"PERCENT_1RM"` — load = category1RM × percentOneRm (accessories)
- `"PERCENT_OF_ROW"` — load = another row's computedLoad × `load_ref_factor` (back-off sets)
- `"NONE"` — no load computation (bodyweight exercises, accessories without load)

**`has_plate_check`:** If true, this row uses the athlete's `has_125kg_plates` preference for rounding (2.5 vs 5). If false, always round to 2.5.

- When `movement_slot_id` is NULL → exercise is fixed (current behavior, no change).
- When `movement_slot_id` is set → exercise is swappable. The fields on this row become the **base/fallback values**. These get overridden by the matching `movement_option_override` for the selected option + this exercise row.

### 3.5 Alter Table: `program_profile`

| Column                | Change                                  |
| --------------------- | --------------------------------------- |
| `movement_selections` | **ADD** JSONB, NULLABLE, DEFAULT NULL   |
| `has_125kg_plates`    | **ADD** BOOLEAN, NOT NULL, DEFAULT true |

**Format:**

```json
{
  "<slot_id>": "<option_id>",
  "<slot_id>": "<option_id>"
}
```

Example:

```json
{
  "550e8400-e29b-41d4-a716-446655440001": "660e8400-e29b-41d4-a716-446655440010",
  "550e8400-e29b-41d4-a716-446655440002": "660e8400-e29b-41d4-a716-446655440020"
}
```

---

## 4. API Changes

### 4.1 `GET /programs/{programId}/content` — Program Tree

**Add to response:**

```jsonc
{
  // ... existing fields ...
  "blocks": [...],
  "resources": [...],

  // NEW: movement slots for this program
  "movementSlots": [
    {
      "id": "slot-uuid-1",
      "slotKey": "squat_main",
      "label": "Primary Squat Movement",
      "category": "SQUAT",
      "sortOrder": 0,
      "options": [
        {
          "id": "opt-uuid-1",
          "exerciseId": "ex-uuid-highbar",
          "exerciseName": "High Bar Squat",
          "isDefault": false,
          "sortOrder": 0,
          "overrides": [
            { "programExerciseId": "pe-uuid-d1r1", "sets": 1, "repScheme": "7", "targetRpe": "@6", "percentOneRm": 5300 },
            { "programExerciseId": "pe-uuid-d1r2", "sets": 1, "repScheme": "5", "targetRpe": "@7", "percentOneRm": 6000 }
          ]
        },
        {
          "id": "opt-uuid-2",
          "exerciseId": "ex-uuid-lowbar",
          "exerciseName": "Low Bar Squat",
          "isDefault": true,
          "sortOrder": 1,
          "overrides": [
            { "programExerciseId": "pe-uuid-d1r1", "sets": 1, "repScheme": "5", "targetRpe": "@7", "percentOneRm": 5800 },
            { "programExerciseId": "pe-uuid-d1r2", "sets": 1, "repScheme": "3", "targetRpe": "@8", "percentOneRm": 6500 }
          ]
        },
        {
          "id": "opt-uuid-3",
          "exerciseId": null,
          "exerciseName": "SSB Squat",
          "isDefault": false,
          "sortOrder": 2,
          "overrides": [
            { "programExerciseId": "pe-uuid-d1r1", "sets": 2, "repScheme": "6", "targetRpe": "@6", "percentOneRm": 4500, "loadNote": "Use SSB bar" }
          ]
        }
      ]
    }
  ]
}
```

**Add to `ProgramExerciseResponseDto`:**

```jsonc
{
  // ... existing fields ...
  "movementSlotId": "slot-uuid-1", // NEW — null if fixed exercise
}
```

### 4.2 `GET /programs/{programId}/profile` — Program Profile

**Add to response:**

```jsonc
{
  // ... existing fields ...
  "movementSelections": {
    "slot-uuid-1": "opt-uuid-2",
    "slot-uuid-2": "opt-uuid-5",
  },
  "selectionsLockedAt": "2026-05-04T10:30:00Z", // null if not locked
}
```

### 4.3 `PUT /programs/{programId}/profile` — Upsert Profile

**Accept new field in request body:**

```jsonc
{
  // ... existing fields (squatOneRm, benchOneRm, etc.) ...
  "movementSelections": {
    "slot-uuid-1": "opt-uuid-2",
    "slot-uuid-2": "opt-uuid-5",
  },
}
```

**Validation rules:**

1. Each key must be a valid `movement_slot.id` belonging to this program
2. Each value must be a valid `movement_option.id` belonging to that slot
3. All slots must be filled — partial selections not allowed
4. **Locking rule:** If athlete already has workout logs for this program (`workout_log` count > 0), reject the update with `409 Conflict`:
   ```json
   {
     "statusCode": 409,
     "message": "Movement selections cannot be changed after logging workouts. Contact your coach to reset."
   }
   ```
5. If no logs exist → allow unlimited updates (athlete is still in setup phase)

### 4.4 `GET /programs/{programId}/days/{dayId}/computed` — Computed Day

**Existing behavior:** Returns exercises with `computedLoad` based on 1RM.

**New behavior (additional resolution step):**

For each exercise in the day:

1. If `movement_slot_id` is NULL → no change (fixed exercise)
2. If `movement_slot_id` is set:
   a. Look up `program_profile.movement_selections[slot_id]`
   b. If found → resolve to that option's `exercise_id` and `exercise_name`
   c. If not found → resolve to the `is_default` option
   d. Override `exerciseId`, `resolvedName` in the response

**Response change — add fields:**

```jsonc
{
  "exercises": [
    {
      // ... existing fields ...
      "movementSlotId": "slot-uuid-1", // NEW
      "selectedOptionId": "opt-uuid-2", // NEW — which option was resolved
      "computedLoadUpper": 150, // NEW — load × 1.05, rounded
      "computedLoadLower": 135, // NEW — load × 0.95, rounded
    },
  ],
}
```

### 4.5 (Optional) `POST /programs/{programId}/profile/reset-selections`

**Purpose:** Allow coach to reset an athlete's selections (admin-only endpoint).

```
POST /programs/{programId}/profile/reset-selections
Authorization: Bearer <coach-token>
Body: { "userId": "athlete-uuid" }
Response: 200 OK
```

Sets `movement_selections` to NULL and `selections_locked_at` to NULL.

---

## 5. New DTOs (TypeScript reference)

```typescript
// ─── Movement Slots ───────────────────────────────────────

interface MovementSlotResponseDto {
  id: string;
  slotKey: string;
  label: string;
  category: ExerciseCategory;
  sortOrder: number;
  options: MovementOptionResponseDto[];
}

interface MovementOptionResponseDto {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  isDefault: boolean;
  sortOrder: number;
  overrides: MovementOptionOverrideDto[]; // per-exercise-row overrides
}

interface MovementOptionOverrideDto {
  programExerciseId: string;
  sets: number | null; // 0 = hide row
  repScheme: string | null; // "amrap" | "5" | "" (empty=hide)
  targetRpe: string | null;
  percentOneRm: number | null; // basis points (5300 = 53.00%)
  loadComputation: string | null; // "RPE_CHART" | "PERCENT_1RM" | "PERCENT_OF_ROW" | "NONE"
  loadRefFactor: number | null; // for PERCENT_OF_ROW: 0.90, 0.80
  loadRefExerciseId: string | null; // for PERCENT_OF_ROW: which row to reference
  loadNote: string | null;
  notes: string | null;
}

// ─── Updated DTOs ─────────────────────────────────────────

// ProgramTreeResponseDto — ADD:
//   movementSlots: MovementSlotResponseDto[]

// ProgramExerciseResponseDto — ADD:
//   movementSlotId: string | null

// ProgramProfileResponseDto — ADD:
//   movementSelections: Record<string, string> | null
//   selectionsLockedAt: string | null
//   has125kgPlates: boolean

// UpsertProgramProfileDto — ADD:
//   movementSelections?: Record<string, string>
//   has125kgPlates?: boolean

// ComputedExerciseRowDto — ADD:
//   movementSlotId: string | null
//   selectedOptionId: string | null
//   computedLoadUpper: number | null    // target × 1.05, rounded to plate increment
//   computedLoadLower: number | null    // target × 0.95, rounded to plate increment
```

---

## 6. Computed Day Resolution Logic (Pseudocode)

```
function computeDay(programId, dayId, userId):
    profile = getProfile(programId, userId)
    day = getDay(dayId) with exercises
    slots = getMovementSlots(programId)  // cache this

    for exercise in day.exercises:
        // Existing: compute load from 1RM
        exercise.computedLoad = computeLoad(exercise, profile)

        // NEW: resolve movement selection
        if exercise.movementSlotId != null:
            slotId = exercise.movementSlotId
            selectedOptionId = profile.movementSelections?[slotId]

            if selectedOptionId:
                option = findOption(slotId, selectedOptionId)
            else:
                option = findDefaultOption(slotId)

            // 1. Always override exercise identity
            exercise.exerciseId = option.exerciseId
            exercise.resolvedName = option.exerciseName
            exercise.selectedOptionId = option.id

            // 2. Look for per-row override
            override = option.overrides.find(o => o.programExerciseId == exercise.id)
            if override:
                if override.sets == 0:      exercise.hidden = true; continue  // skip
                if override.sets != null:         exercise.sets = override.sets
                if override.repScheme != null:    exercise.repScheme = override.repScheme
                if override.targetRpe != null:    exercise.targetRpe = override.targetRpe
                if override.percentOneRm != null: exercise.percentOneRm = override.percentOneRm
                if override.loadComputation:      exercise.loadComputation = override.loadComputation
                if override.loadRefFactor:        exercise.loadRefFactor = override.loadRefFactor
                if override.loadRefExerciseId:    exercise.loadRefExerciseId = override.loadRefExerciseId
                if override.loadNote != null:     exercise.loadNote = override.loadNote
                if override.notes != null:        exercise.notes = override.notes

        // 3. Compute load based on strategy
        switch exercise.loadComputation:
            case "RPE_CHART":
                exercise.computedLoad = ROUND(e1rm / rpeChart[rpe][reps], plateRound)
            case "PERCENT_1RM":
                exercise.computedLoad = ROUND(cat1rm * percentOneRm, plateRound)
            case "PERCENT_OF_ROW":
                refRow = computedExercises[exercise.loadRefExerciseId]
                exercise.computedLoad = ROUND(refRow.computedLoad * exercise.loadRefFactor, plateRound)
            case "NONE":
                exercise.computedLoad = null

        if exercise.computedLoad != null:
            exercise.computedLoadUpper = ROUND(exercise.computedLoad * 1.05, plateRound)
            exercise.computedLoadLower = ROUND(exercise.computedLoad * 0.95, plateRound)

    return day (excluding hidden exercises)
```

---

## 7. Migration Strategy

1. **Non-breaking:** All new fields are nullable/optional. Existing programs without movement slots work exactly as before.
2. **No data migration needed:** Only new programs created with slots will use this feature.
3. **Backward compatible:** Frontend checks `movementSlots.length > 0` to decide whether to show the selection screen.

---

## 8. Admin Panel (Coach Side) — Required

Coach needs ability to:

1. Create/edit movement slots for a program
2. Add/remove options per slot
3. Mark default option
4. Link exercises to slots (set `movement_slot_id` on `program_exercise`)
5. View which athletes have selected which variations

**Suggested admin endpoints:**

| Method | Endpoint                                       | Description                              |
| ------ | ---------------------------------------------- | ---------------------------------------- |
| GET    | `/admin/programs/{id}/movement-slots`          | List all slots with options & overrides  |
| POST   | `/admin/programs/{id}/movement-slots`          | Create a slot                            |
| PUT    | `/admin/movement-slots/{slotId}`               | Update slot                              |
| DELETE | `/admin/movement-slots/{slotId}`               | Delete slot (cascade options+overrides)  |
| POST   | `/admin/movement-slots/{slotId}/options`       | Add option                               |
| PUT    | `/admin/movement-options/{optionId}`           | Update option                            |
| DELETE | `/admin/movement-options/{optionId}`           | Delete option (cascade overrides)        |
| PUT    | `/admin/movement-options/{optionId}/overrides` | Bulk upsert per-day overrides for option |
| PUT    | `/admin/program-exercises/{exerciseId}/slot`   | Link/unlink exercise to slot             |

---

## 9. Edge Cases to Handle

| Case                                                   | Behavior                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| Athlete hasn't selected yet                            | Use `isDefault` option for each slot                                  |
| Coach deletes a slot after athlete selected            | Gracefully degrade — treat exercises as fixed, use last resolved name |
| Coach deletes the selected option                      | Fall back to `isDefault` option                                       |
| Athlete tries to change after logging                  | Return `409 Conflict`                                                 |
| Program has 0 slots                                    | No change in behavior — feature is invisible                          |
| Slot has only 1 option                                 | Still show it (athlete confirms), or auto-select                      |
| Override missing for a day+option                      | Use base `program_exercise` row values (sets/reps/RPE) as fallback    |
| Override has partial nulls (e.g., sets=null, rpe="@8") | Only override non-null fields, keep base values for nulls             |

---

## 10. Frontend Implementation (Our Side)

Once backend ships the above, we will build:

1. **Movement Selection Screen** — shown after first program open if `movementSlots.length > 0 && profile.movementSelections == null`
2. **"Edit Movements" option** in program settings — enabled only if no logs exist
3. **Badge on exercise cards** showing the selected variation name
4. No other workout UI changes needed — Computed Day API handles the resolution

---

## Questions for Backend Team

1. **1RM per variation?** If athlete switches from High Bar to SSB Squat, their 1RM is different. Options:
   - **Option A (simple):** Keep current 3-field approach (`squatOneRm`, `benchOneRm`, `deadliftOneRm`). Coach uses `percentOneRm` in overrides to account for variation strength differences (e.g., SSB at 45% vs High Bar at 53%).
   - **Option B (advanced):** Add a `variant_one_rms` JSONB field to `program_profile` → `{ "opt-uuid-ssb": 120, "opt-uuid-highbar": 140 }`. Computed Day uses the variation-specific 1RM.
   - **Recommendation:** Start with Option A. Coach can already adjust via different `percentOneRm` per override.
2. **Timeline?** Frontend is ready to integrate as soon as the API ships.
3. **Admin panel for overrides?** Coach needs a UI to set per-day overrides for each option. This is the most complex admin panel feature — consider a spreadsheet-like grid (days × options).

---

## Appendix A: Load Computation Details (from Coach Spreadsheet)

### A.1 Two Types of Load Calculation

The spreadsheet uses **two distinct methods** depending on exercise type:

#### Method 1: E1RM-Based (Main/Competition Lifts)

Used for: Primary Squat, Competition Bench, Primary Deadlift

```
Load = MROUND(e1RM / VLOOKUP(rpe, e1rmSheet, repsColumn), 2.5)
```

Where E1RM is computed from athlete's previous best set:

```
e1RM = weight / (1.0278 - (0.0278 × reps))    ← Brzycki formula
```

The load is looked up from an **RPE × Reps chart** (like the Tuchscherer RPE table). Backend already has the RPE calculator endpoint — this should be the same lookup.

**Load range:** The sheet always computes ±5% of the target load:

```
upperBound = MROUND(load × 1.05, 2.5)
lowerBound = MROUND(load × 0.95, 2.5)
```

#### Method 2: %1RM-Based (Accessory Lifts)

Used for: Bench Accessory, Deadlift Accessory, TNG Bench, Squat Accessory

```
Load = MROUND(category1RM × percentOneRm, roundingFactor)
```

Where:

- `category1RM` = athlete's Squat/Bench/Deadlift 1RM from profile
- `percentOneRm` = varies per variation (this is what changes per option!)
- `roundingFactor` = **2.5** if athlete has 1.25kg plates, **5** if not

#### Method 3: Back-Off % of Another Row (Cascading Loads)

Used for: Dips back-off sets, Pullups back-off sets, any multi-set exercise where subsequent sets are lighter.

```
Load = MROUND(referencedRow.computedLoad × loadRefFactor, roundingFactor)
```

Examples from spreadsheet:

- Dips Row 2: `= topSetLoad × 0.90` (90% of top set)
- Dips Row 3: `= row2Load × 0.80` (80% of back-off)
- Pullups Row 2: `= topSetLoad × 0.90`
- Pullups Row 3: `= row2Load × 0.80`

**Implementation:** `program_exercise.load_ref_exercise_id` points to the row whose `computedLoad` is the reference. Computed Day resolver must process rows in `sort_order` so referenced rows are computed first.

#### Load Computation Decision Table

| `load_computation` | Inputs needed                                | Formula                        |
| ------------------ | -------------------------------------------- | ------------------------------ |
| `RPE_CHART`        | athlete E1RM, targetRpe, reps                | `E1RM / rpeChart[rpe][reps]`   |
| `PERCENT_1RM`      | category 1RM, percentOneRm                   | `category1RM × percentOneRm`   |
| `PERCENT_OF_ROW`   | referenced row's computedLoad, loadRefFactor | `refLoad × factor`             |
| `NONE`             | —                                            | null (bodyweight / AMRAP only) |

### A.2 Plate Rounding Feature

**New field needed on `ProgramProfile`:**

```
has_125kg_plates: BOOLEAN, DEFAULT true
```

The athlete dashboard has a "Do you have 1.25kg plates?" toggle. This affects ALL load calculations:

- If YES → round to nearest **2.5 kg**
- If NO → round to nearest **5 kg**

Backend Computed Day should use this when computing `computedLoad`.

### A.3 Load Range Feature

**New fields on `ComputedExerciseRowDto`:**

```typescript
computedLoad: number | null; // existing — target load
computedLoadUpper: number | null; // NEW — target × 1.05, rounded
computedLoadLower: number | null; // NEW — target × 0.95, rounded
```

Frontend will display: `"135–150 kg"` instead of just `"142.5 kg"`.

---

## Appendix B: Real Movement Slots (Extracted from Coach Spreadsheet)

These are the **actual 7 movement slots** used in the current program. This serves as a concrete reference for backend seeding/testing.

### Slot 1: Primary Squat

| Field       | Value                             |
| ----------- | --------------------------------- |
| `slotKey`   | `squat_primary`                   |
| `label`     | `Primary Squat Movement`          |
| `category`  | `SQUAT`                           |
| Load method | **E1RM-based** (RPE chart lookup) |

| Option             | Reps pattern         | Notes                                |
| ------------------ | -------------------- | ------------------------------------ |
| **LOW BAR SQUAT**  | Fewer reps (1, 3, 5) | Lower rep ranges, slightly lower RPE |
| **HIGH BAR SQUAT** | More reps (3, 5, 7)  | Higher rep ranges                    |

**Week-by-week progression (per day that has squat):**

| Week | Set        | LOW BAR (reps/RPE) | HIGH BAR (reps/RPE) |
| ---- | ---------- | ------------------ | ------------------- |
| 1    | Top single | 3 @5               | 5 @5                |
| 1    | Back-off 1 | 5 @5               | 7 @5                |
| 1    | Back-off 2 | 5 @6               | 7 @6                |
| 2    | Top single | 3 @6               | 5 @6                |
| 2    | Back-off 1 | 5 @5.5             | 7 @6                |
| 2    | Back-off 2 | 5 @6.5             | 7 @7                |
| 3    | Top single | 3 @7               | 5 @7                |
| 3    | Back-off 1 | 5 @6               | 7 @6                |
| 3    | Back-off 2 | 5 @7               | 7 @7                |
| 4    | Top single | 3 @8               | 5 @8                |
| 4    | Back-off 1 | 5 @7               | 7 @7                |
| 4    | Back-off 2 | 5 @8               | 7 @8                |

### Slot 2: Competition Bench Press

| Field       | Value                             |
| ----------- | --------------------------------- |
| `slotKey`   | `bench_competition`               |
| `label`     | `Competition Bench Movement`      |
| `category`  | `BENCH`                           |
| Load method | **E1RM-based** (RPE chart lookup) |

| Option                           | Reps pattern         |
| -------------------------------- | -------------------- |
| **2ct paused benchpress**        | Fewer reps (1, 3, 5) |
| **2ct paused larsen benchpress** | More reps (3, 5, 7)  |

**Week-by-week (5 working sets per day):**

| Week | Set        | Paused BP (reps/RPE) | Larsen BP (reps/RPE) |
| ---- | ---------- | -------------------- | -------------------- |
| 1    | Top single | 1 @6                 | 3 @7                 |
| 1    | Set 2      | 3 @6                 | 5 @6                 |
| 1    | Set 3      | 3 @7                 | 5 @7                 |
| 1    | Set 4      | 5 @5                 | 7 @5                 |
| 1    | Set 5      | 5 @6                 | 7 @6                 |
| 2    | Top single | 1 @7                 | 3 @8                 |
| 2    | Set 2      | 3 @6                 | 5 @6                 |
| 2    | Set 3      | 3 @7                 | 5 @7                 |
| 2    | Set 4      | 5 @5                 | 7 @5                 |
| 2    | Set 5      | 5 @6                 | 7 @6                 |
| 3    | Top single | 1 @8                 | 3 @8                 |
| 3    | Set 2      | 3 @6.5               | 5 @6                 |
| 3    | Set 3      | 3 @7.5               | 5 @8                 |
| 3    | Set 4      | 5 @6                 | 7 @6                 |
| 3    | Set 5      | 5 @7                 | 7 @7                 |
| 4    | Top single | 1 @8.5               | 3 @9                 |
| 4    | Set 2      | 3 @7                 | 5 @7.5               |
| 4    | Set 3      | 3 @8                 | 5 @8.5               |
| 4    | Set 4      | 5 @6                 | 7 @6                 |
| 4    | Set 5      | 5 @7                 | 7 @7                 |

### Slot 3: Primary Deadlift

| Field       | Value                             |
| ----------- | --------------------------------- |
| `slotKey`   | `deadlift_primary`                |
| `label`     | `Primary Deadlift Movement`       |
| `category`  | `DEADLIFT`                        |
| Load method | **E1RM-based** (RPE chart lookup) |

| Option                    | Reps pattern      |
| ------------------------- | ----------------- |
| **conventional deadlift** | Fewer reps (1, 3) |
| **sumo deadlift**         | More reps (3, 5)  |

| Week | Set        | Conventional (reps/RPE) | Sumo (reps/RPE) |
| ---- | ---------- | ----------------------- | --------------- |
| 1    | Top single | 1 @7                    | 3 @6            |
| 1    | Back-off 1 | 3 @5                    | 5 @5            |
| 1    | Back-off 2 | 3 @6                    | 5 @6            |
| 2    | Top single | 1 @7                    | 3 @7            |
| 2    | Back-off 1 | 3 @5.5                  | 5 @6            |
| 2    | Back-off 2 | 3 @6.5                  | 5 @7            |
| 3    | Top single | 1 @8                    | 3 @6            |
| 3    | Back-off 1 | 3 @5                    | 5 @7            |
| 3    | Back-off 2 | 3 @6                    | 5 @8            |
| 4    | Top single | 1 @8                    | 3 @8            |
| 4    | Back-off 1 | 3 @6                    | 5 @7            |
| 4    | Back-off 2 | 3 @7                    | 5 @8.5          |

### Slot 4: Bench Accessory (Variation)

| Field       | Value                       |
| ----------- | --------------------------- |
| `slotKey`   | `bench_accessory_variation` |
| `label`     | `Bench Press Variation`     |
| `category`  | `BENCH`                     |
| Load method | **%1RM-based**              |

| Option                     | Sets | Reps | %1RM progression (W1→W2→W3→W4) |
| -------------------------- | ---- | ---- | ------------------------------ |
| **Spoto press**            | 2    | 7    | 58% → 61% → 64% → 67%          |
| **3-1-0 tempo benchpress** | 2    | 5    | 65% → 67% → 69% → 71%          |
| **4ct paused benchpress**  | 2    | 3    | 53% → 56% → 59% → 62%          |

> Note: Sets and reps stay the same each week — only %1RM increases (progressive overload).

### Slot 5: Deadlift Accessory (Variation)

| Field       | Value                          |
| ----------- | ------------------------------ |
| `slotKey`   | `deadlift_accessory_variation` |
| `label`     | `Deadlift Variation`           |
| `category`  | `DEADLIFT`                     |
| Load method | **%1RM-based**                 |

| Option                         | Sets | Reps | %1RM progression (W1→W2→W3→W4) |
| ------------------------------ | ---- | ---- | ------------------------------ |
| **2ct paused conventional DL** | 1    | 4    | 65% → 67% → 69% → 71%          |
| **Romanian deadlift**          | 3    | 8    | 51% → 54% → 57% → 60%          |
| **2ct paused sumo DL**         | 2    | 6    | 67% → 69% → 71% → 73%          |

### Slot 6: TNG Bench (Grip Width)

| Field       | Value                  |
| ----------- | ---------------------- |
| `slotKey`   | `bench_tng_grip`       |
| `label`     | `TNG Bench Grip Width` |
| `category`  | `BENCH`                |
| Load method | **%1RM-based**         |

| Option                            | Sets | Reps | %1RM progression (W1→W2→W3→W4) |
| --------------------------------- | ---- | ---- | ------------------------------ |
| **shoulder width TNG benchpress** | 2    | 5    | 51% → 55% → 59% → 63%          |
| **med grip TNG benchpress**       | 2    | 7    | 58% → 61% → 64% → 67%          |
| **wide grip TNG benchpress**      | 2    | 10   | 53% → 56% → 59% → 62%          |

### Slot 7: Squat Accessory (Variation)

| Field       | Value                       |
| ----------- | --------------------------- |
| `slotKey`   | `squat_accessory_variation` |
| `label`     | `Squat Variation`           |
| `category`  | `SQUAT`                     |
| Load method | **%1RM-based**              |

| Option                                | Sets | Reps | %1RM progression (W1→W2→W3→W4) |
| ------------------------------------- | ---- | ---- | ------------------------------ |
| **2ct low bar paused squat**          | 2    | 4    | 60% → 63% → 66% → 69%          |
| **2ct high bar paused squat**         | 2    | 6    | 65% → 67% → 69% → 71%          |
| **3-0-0 tempo squat (any variation)** | 2    | 5    | 67% → 69% → 71% → 73%          |

> Note: Sets and reps for each option stay the same each week — only %1RM increases (progressive overload).

### Slot 8: Dips (Push Accessory)

| Field       | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| `slotKey`   | `dips_variation`                                                            |
| `label`     | `Dips Movement`                                                             |
| `category`  | `BENCH`                                                                     |
| Load method | **Mixed** (E1RM for top set → PERCENT_OF_ROW for back-offs, or NONE for BW) |

**This slot demonstrates variable row visibility.** The base exercise has 3 rows per day. Depending on the option, some rows become hidden.

| Option                         | Row 1 (Top set) | Row 2 (Back-off) | Row 3 (AMRAP)            |
| ------------------------------ | --------------- | ---------------- | ------------------------ |
| **Weighted parallel bar dips** | 1×8 @6          | 2×6 (90% of top) | 1×AMRAP @8 (80% of Row2) |
| **BW parallel bar dips**       | 2×AMRAP @7      | ❌ hidden        | ❌ hidden                |
| **2ct paused weighted dips**   | 1×3 @6          | 3×5 (90% of top) | 1×AMRAP @8 (80% of Row2) |
| **2ct paused BW dips**         | 1×AMRAP @7      | ❌ hidden        | ❌ hidden                |
| **Assisted parallel bar dips** | 3×AMRAP @7      | ❌ hidden        | ❌ hidden                |

**Week-by-week RPE progression (for Weighted option):**

| Week | Row 1 RPE | Row 2       | Row 3 RPE |
| ---- | --------- | ----------- | --------- |
| 1    | @6        | 90% of Row1 | @8        |
| 2    | @7        | 90% of Row1 | @8        |
| 3    | @8        | 90% of Row1 | @8        |
| 4    | @8        | 90% of Row1 | @8        |

**Key takeaway:** BW and Assisted options only have 1 row. Rows 2 and 3 get overrides with `sets=0` to hide them.

### Slot 9: Pullups (Pull Accessory)

| Field       | Value                    |
| ----------- | ------------------------ |
| `slotKey`   | `pullups_variation`      |
| `label`     | `Pullups Movement`       |
| `category`  | `ACCESSORY`              |
| Load method | **Mixed** (same as Dips) |

| Option                               | Row 1 (Top set) | Row 2 (Back-off)  | Row 3 (AMRAP)            |
| ------------------------------------ | --------------- | ----------------- | ------------------------ |
| **Weighted pullups**                 | 1×7 @6          | 2×7 (90% of top)  | 1×AMRAP @8 (80% of Row2) |
| **Weighted chinups**                 | 1×10 @6         | 2×10 (90% of top) | 1×AMRAP @8 (80% of Row2) |
| **Weighted neutral grip pullups**    | 1×5 @6          | 2×10 (90% of top) | 1×AMRAP @8 (80% of Row2) |
| **Assisted pullups (any variation)** | 4×AMRAP @7      | ❌ hidden         | ❌ hidden                |
| **Paused pullups (any variation)**   | 2×AMRAP @7      | ❌ hidden         | ❌ hidden                |

**Week-by-week RPE progression (for Weighted option):**

| Week | Row 1 RPE | Row 2       | Row 3 RPE |
| ---- | --------- | ----------- | --------- |
| 1    | @6        | 90% of Row1 | @8        |
| 2    | @7        | 90% of Row1 | @8        |
| 3    | @8        | 90% of Row1 | @8        |
| 4    | @8        | 90% of Row1 | @8        |

---

## Appendix C: Key Patterns for Backend Implementation

### C.1 Three Load Computation Strategies

The backend Computed Day resolver needs to handle all three:

```
Strategy 1 — E1RM-based (main lifts):
  athleteE1rm = stored from previous session (or profile 1RM)
  load = ROUND(athleteE1rm / rpeChart[rpe][reps], plateRounding)
  loadUpper = ROUND(load × 1.05, plateRounding)
  loadLower = ROUND(load × 0.95, plateRounding)

Strategy 2 — %1RM-based (accessories):
  category1rm = profile.squat1rm OR bench1rm OR deadlift1rm (based on exercise category)
  load = ROUND(category1rm × percentOneRm, plateRounding)
  loadUpper = ROUND(load × 1.05, plateRounding)
  loadLower = ROUND(load × 0.95, plateRounding)

Strategy 3 — % of another row (back-off sets):
  refLoad = already-computed load of referenced program_exercise row
  load = ROUND(refLoad × loadRefFactor, plateRounding)
  // No upper/lower range for back-off sets — just the single value
```

Where `plateRounding = exercise.hasPlateCheck && !profile.has125kgPlates ? 5 : 2.5`

**IMPORTANT:** Strategy 3 requires processing rows in `sort_order` so the referenced row is computed before the dependent row.

### C.2 Rep/RPE Change Pattern

From the real data, two patterns emerge:

**Main lifts (e1RM-based):** Reps are FIXED per variation, RPE increases each week:

- Low Bar Squat always does 3-rep top singles, 5-rep back-offs
- High Bar Squat always does 5-rep top singles, 7-rep back-offs
- RPE climbs: @5 → @6 → @7 → @8 across weeks

**Accessories (%1RM-based):** Sets AND reps are FIXED per variation, %1RM increases each week:

- Spoto Press is always 2×7, but load goes 58% → 61% → 64% → 67%
- 4ct Paused BP is always 2×3, but load goes 53% → 56% → 59% → 62%

### C.3 How Overrides Map to Program Exercises

Each "set" in the spreadsheet = one `program_exercise` row. Example for Primary Squat on Day 1 Week 1:

```
program_exercise rows for Day 1:
  Row 1: movementSlotId="squat_primary", sets=1, repScheme="3", targetRpe="@5"  ← base (Low Bar default)
  Row 2: movementSlotId="squat_primary", sets=1, repScheme="5", targetRpe="@5"  ← base
  Row 3: movementSlotId="squat_primary", sets=1, repScheme="5", targetRpe="@6"  ← base

If athlete selects HIGH BAR → overrides for this day:
  Row 1 override: repScheme="5", targetRpe="@5"     (3→5 reps)
  Row 2 override: repScheme="7", targetRpe="@5"     (5→7 reps)
  Row 3 override: repScheme="7", targetRpe="@6"     (5→7 reps)
```

### C.4 Profile Field Additions Summary

```sql
ALTER TABLE program_profile ADD COLUMN has_125kg_plates BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE program_profile ADD COLUMN movement_selections JSONB DEFAULT NULL;
```

### C.5 Athlete Dashboard Fields Referenced

The spreadsheet pulls these from "Athlete Dashboard" sheet:

- `D7` = Squat E1RM (computed from best set)
- `D17` = Bench E1RM (computed from best set)
- `D26` / `D27` = Deadlift E1RM
- `D18`, `D21`, `D22`, `D23` = Various exercise slot selections
- `D36` = Has 1.25kg plates? (YES/NO)

### C.6 Hidden Row Pattern

Some variation options make certain `program_exercise` rows disappear. Example: BW Dips only uses 1 row but the base exercise has 3 rows.

**Override convention:** Set `sets=0` and `rep_scheme=""` to mark a row as hidden.

**Frontend behavior:** When `computedDay` returns an exercise row with `sets=0` or `sets=null AND repScheme=null AND category != "OTHER"`, frontend hides it.

**Backend behavior:** Skip load computation for hidden rows. Set `computedLoad=null`.

### C.7 Per-Row Plate Rounding

The spreadsheet checks `has_125kg_plates` at the **row level** (each formula references a specific Athlete Dashboard cell). Some rows check for plates, others don't.

`program_exercise.has_plate_check = true` → use athlete's plate preference for rounding.
`program_exercise.has_plate_check = false` → always round to 2.5 kg (default behavior, same as current).

Overrides inherit the base row's `has_plate_check` setting.

### C.8 AMRAP Handling

`repScheme = "amrap"` is a special value. Backend should:

- NOT compute a rep-based load (no reps to plug into RPE chart)
- Use `PERCENT_OF_ROW` or `NONE` for load computation
- Frontend shows "AMRAP" instead of a rep count

---

## Appendix D: Formula Engine Architecture — How It Scales Across Programs

### D.1 Core Principle: Generic Engine, Per-Program Data

The load computation system is **not** per-program custom code. It's a single, reusable formula engine that takes different input parameters per program.

Think of it like a calculator — the calculator doesn't change, only the numbers you punch in.

```
┌─────────────────────────────────────────────────────────────┐
│                   FORMULA ENGINE (shared)                    │
│                                                             │
│  RPE_CHART      →  e1rm / rpeChart[rpe][reps]              │
│  PERCENT_1RM    →  category1RM × percentOneRm              │
│  PERCENT_OF_ROW →  refRow.computedLoad × loadRefFactor     │
│  NONE           →  null                                     │
│                                                             │
│  + plateRounding(load, has125kgPlates)                      │
│  + loadRange(load × 0.95, load × 1.05)                     │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
  ┌──────┴──────┐   ┌────────┴────────┐   ┌──────┴──────┐
  │  GORILLA    │   │     COBRA       │   │  FUTURE     │
  │  PROGRAM    │   │    PROGRAM      │   │  PROGRAM    │
  │  (data)     │   │    (data)       │   │  (data)     │
  └─────────────┘   └─────────────────┘   └─────────────┘
```

### D.2 What Changes Per Program (Data, Not Code)

Each `program_exercise` row stores its own formula parameters. Different programs just have different values:

**Gorilla Program — Day 1 Squat:**

| Row | `load_computation` | `target_rpe` | `percent_one_rm` | `load_ref_factor` | `rep_scheme` |
| --- | ------------------ | ------------ | ---------------- | ----------------- | ------------ |
| 1   | `RPE_CHART`        | @7           | —                | —                 | 3            |
| 2   | `RPE_CHART`        | @5           | —                | —                 | 5            |
| 3   | `PERCENT_1RM`      | —            | 5800             | —                 | 7            |
| 4   | `PERCENT_OF_ROW`   | —            | —                | 0.90              | 6            |

**Cobra Program — Day 1 Squat (hypothetical):**

| Row | `load_computation` | `target_rpe` | `percent_one_rm` | `load_ref_factor` | `rep_scheme` |
| --- | ------------------ | ------------ | ---------------- | ----------------- | ------------ |
| 1   | `RPE_CHART`        | @8           | —                | —                 | 5            |
| 2   | `PERCENT_1RM`      | —            | 6500             | —                 | 8            |
| 3   | `PERCENT_OF_ROW`   | —            | —                | 0.85              | 8            |

**Same 4 formula types. Different numbers. No new code needed.**

### D.3 What the Backend Compute Engine Actually Does

```python
# This function is program-agnostic — works for ANY program
def compute_load(exercise_row, profile, computed_rows_so_far):

    match exercise_row.load_computation:

        case "RPE_CHART":
            e1rm = get_athlete_e1rm(exercise_row.category, profile)
            rpe = exercise_row.target_rpe
            reps = exercise_row.rep_scheme
            raw_load = e1rm / rpe_chart_lookup(rpe, reps)

        case "PERCENT_1RM":
            cat_1rm = get_category_1rm(exercise_row.category, profile)
            raw_load = cat_1rm * (exercise_row.percent_one_rm / 10000)

        case "PERCENT_OF_ROW":
            ref_row = computed_rows_so_far[exercise_row.load_ref_exercise_id]
            raw_load = ref_row.computed_load * exercise_row.load_ref_factor

        case "NONE":
            return None  # bodyweight / AMRAP-only

    # Plate rounding (same for all programs)
    increment = 5 if (exercise_row.has_plate_check and not profile.has_125kg_plates) else 2.5
    return round_to_nearest(raw_load, increment)
```

**Key insight:** The coach picks which formula type to use per row, fills in the parameters, and the engine does the rest. No program-specific branching anywhere.

### D.4 When Would We Need a New Formula Type?

Only if a future program has a genuinely **new calculation method** that can't be expressed with the existing 4 types:

| Scenario                                        | Solution                                     | New code needed?                  |
| ----------------------------------------------- | -------------------------------------------- | --------------------------------- |
| Coach wants 70% of Bench 1RM                    | `PERCENT_1RM` with `percentOneRm=7000`       | **No**                            |
| Coach wants back-off at 85% of top set          | `PERCENT_OF_ROW` with `loadRefFactor=0.85`   | **No**                            |
| Coach wants RPE @6 for 5 reps                   | `RPE_CHART` with `targetRpe=@6, repScheme=5` | **No**                            |
| Coach wants bodyweight exercise                 | `NONE`                                       | **No**                            |
| Coach wants "use last session's weight + 2.5kg" | New type: `LAST_SESSION_PLUS`                | **Yes** — add 1 enum + 1 function |
| Coach wants "RPE but from a custom chart"       | New type: `CUSTOM_RPE_CHART`                 | **Yes** — add 1 enum + 1 function |

In practice, 95%+ of powerlifting programs use only the first 4 types. Adding a new type is:

1. Add enum value to `load_computation`
2. Add one `case` block in the compute function
3. Add any new columns needed (e.g., `last_session_increment`)

### D.5 Admin Panel Workflow (How Coach Sets This Up)

When a coach creates a program in the admin panel:

```
Step 1: Coach creates program structure (blocks → weeks → days)

Step 2: For each exercise row, coach sets:
  - exercise name
  - sets, reps, RPE
  - load_computation type (dropdown: RPE Chart / %1RM / % of Row / None)
  - IF %1RM → fills in percentOneRm value
  - IF % of Row → picks which row to reference + factor (e.g., 90%)
  - IF RPE Chart → reps + RPE are enough (auto-computed)
  - IF None → no load fields needed

Step 3: For movement slots, coach additionally sets:
  - variation options (each option can override the above per-row)
  - overrides may use different load_computation than the base row

Step 4: Save → all parameters stored in program_exercise + movement_option_override
```

**The admin panel is the same for every program.** Coach just fills in different numbers for Gorilla vs Cobra vs any future program.

### D.6 Summary

| Question                               | Answer                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Do we need per-program formula code?   | **No.** Generic engine + per-row parameters.                               |
| What if Cobra has different formulas?  | Same 4 types, different parameter values in `program_exercise` rows.       |
| What if a program needs %1RM AND RPE?  | Different rows use different `load_computation` types — already supported. |
| What if we need a totally new formula? | Add 1 enum value + 1 case block. No existing code changes.                 |
| How does the coach configure it?       | Admin panel: picks formula type per row, fills in parameters.              |
| Does this scale to 100 programs?       | **Yes.** All programs share the same engine. Zero per-program code.        |
