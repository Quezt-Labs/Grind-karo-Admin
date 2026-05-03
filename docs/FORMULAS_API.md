# Powerlifting Formulas & Load Calculator — Backend Implementation Guide

All formulas below come from the **9-to-5 Powerbuilder** spreadsheet (e1rmsheet tab). This document is the **single source of truth** — implement these exactly and the frontend will match.

> All endpoints require `Authorization: Bearer <accessToken>` where JWT `role === 'ADMIN'`.

---

## Table of Contents

1. [Conventions](#conventions)
2. [The RPE ↔ %1RM Chart (full data)](#1-the-rpe--1rm-chart)
3. [Core Formulas (pseudocode + examples)](#2-core-formulas)
4. [Exercise Variation Defaults (from spreadsheet)](#3-exercise-variation-defaults)
   - [3A. Primary Exercise Variants (RPE-based)](#3a-primary-exercise-variants-rpe-based--no-1rm)
   - [3B. Secondary Exercise Defaults (%1RM-based + Weekly Progression)](#3b-secondary-exercise-defaults-1rm-based)
5. [API Endpoints](#4-api-endpoints)
6. [DB Migrations](#5-db-migrations)
7. [Worked Examples (for unit tests)](#6-worked-examples)

---

## Conventions

| Concern              | Rule                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| Percent of 1RM       | **Basis points** in API (`5300 = 53.00%`, `7500 = 75.00%`)                 |
| Load / E1RM / Weight | **kg**, decimal (e.g. `122.5`)                                             |
| Rounding             | `MROUND(value, roundToKg)` — round to nearest plate increment              |
| 1.25 kg plate toggle | If 1.25 kg plates available → `roundToKg = 2.5`, else `roundToKg = 5`      |
| RPE scale            | Decimal `4.0 → 10.0` in **0.5 increments** (13 rows total)                 |
| Reps (chart range)   | Integer `1 → 10`                                                           |
| Exercise category    | Enum: `SQUAT \| BENCH \| DEADLIFT \| ACCESSORY \| OTHER`                   |
| E1RM per lift        | Only `SQUAT`, `BENCH`, `DEADLIFT` categories have E1RM; rest return `null` |
| Accessory load       | `ACCESSORY` exercises skip load calc entirely (sheet returns blank)        |

---

## 1. The RPE ↔ %1RM Chart

This is the master lookup table. Each cell = fraction of 1RM (e.g. `0.863` = 86.3%).

**Read as:** "At RPE X, doing Y reps, the weight should be Z% of your 1RM."

| RPE \ Reps | 1 rep | 2 rep | 3 rep | 4 rep | 5 rep | 6 rep | 7 rep | 8 rep | 9 rep | 10 rep |
| ---------: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | -----: |
|     **10** | 1.000 | 0.955 | 0.922 | 0.892 | 0.863 | 0.837 | 0.811 | 0.786 | 0.762 |  0.739 |
|    **9.5** | 0.978 | 0.939 | 0.907 | 0.878 | 0.850 | 0.824 | 0.799 | 0.774 | 0.751 |  0.723 |
|      **9** | 0.955 | 0.922 | 0.892 | 0.863 | 0.837 | 0.811 | 0.786 | 0.762 | 0.739 |  0.707 |
|    **8.5** | 0.939 | 0.907 | 0.878 | 0.850 | 0.824 | 0.799 | 0.774 | 0.751 | 0.723 |  0.694 |
|      **8** | 0.922 | 0.892 | 0.863 | 0.837 | 0.811 | 0.786 | 0.762 | 0.739 | 0.707 |  0.680 |
|    **7.5** | 0.907 | 0.878 | 0.850 | 0.824 | 0.799 | 0.774 | 0.751 | 0.723 | 0.694 |  0.667 |
|      **7** | 0.892 | 0.863 | 0.837 | 0.811 | 0.786 | 0.762 | 0.739 | 0.707 | 0.680 |  0.653 |
|    **6.5** | 0.878 | 0.850 | 0.824 | 0.799 | 0.774 | 0.751 | 0.723 | 0.694 | 0.667 |  0.640 |
|      **6** | 0.863 | 0.837 | 0.811 | 0.786 | 0.762 | 0.739 | 0.707 | 0.680 | 0.653 |  0.626 |
|    **5.5** | 0.850 | 0.824 | 0.799 | 0.774 | 0.751 | 0.723 | 0.694 | 0.667 | 0.640 |  0.613 |
|      **5** | 0.837 | 0.811 | 0.786 | 0.762 | 0.739 | 0.707 | 0.680 | 0.653 | 0.626 |  0.599 |
|    **4.5** | 0.824 | 0.799 | 0.774 | 0.751 | 0.723 | 0.694 | 0.667 | 0.640 | 0.613 |  0.586 |
|      **4** | 0.811 | 0.786 | 0.762 | 0.739 | 0.707 | 0.680 | 0.653 | 0.626 | 0.599 |  0.572 |

### Storage format (JSON)

Store as an array of objects, sorted by RPE descending:

```json
[
  {
    "rpe": 10,
    "factors": [
      1.0, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739
    ]
  },
  {
    "rpe": 9.5,
    "factors": [
      0.978, 0.939, 0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723
    ]
  },
  {
    "rpe": 9,
    "factors": [
      0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707
    ]
  },
  {
    "rpe": 8.5,
    "factors": [
      0.939, 0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694
    ]
  },
  {
    "rpe": 8,
    "factors": [
      0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68
    ]
  },
  {
    "rpe": 7.5,
    "factors": [
      0.907, 0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667
    ]
  },
  {
    "rpe": 7,
    "factors": [
      0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653
    ]
  },
  {
    "rpe": 6.5,
    "factors": [
      0.878, 0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64
    ]
  },
  {
    "rpe": 6,
    "factors": [
      0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626
    ]
  },
  {
    "rpe": 5.5,
    "factors": [
      0.85, 0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64, 0.613
    ]
  },
  {
    "rpe": 5,
    "factors": [
      0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599
    ]
  },
  {
    "rpe": 4.5,
    "factors": [
      0.824, 0.799, 0.774, 0.751, 0.723, 0.694, 0.667, 0.64, 0.613, 0.586
    ]
  },
  {
    "rpe": 4,
    "factors": [
      0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572
    ]
  }
]
```

`factors[0]` = 1 rep, `factors[9]` = 10 reps. This can be hardcoded in a constant/seed — no UI to edit it.

---

## 2. Core Formulas

### 2.1 MROUND — Plate Rounding (Excel equivalent)

Round to the nearest plate increment. This is used **everywhere**.

```
MROUND(value, factor):
  if factor == 0  → return value
  return round(value / factor) * factor
```

**Examples:**

- `MROUND(91.3, 2.5) = 92.5` (round 36.52 → 37 → 37 × 2.5 = 92.5)
- `MROUND(91.3, 5)   = 90` (round 18.26 → 18 → 18 × 5 = 90)

### 2.2 RPE Factor Lookup

```
getRpeFactor(rpe, reps):
  row = RPE_CHART[rpe]        // e.g. RPE_CHART["8"]
  if row is null OR reps < 1 OR reps > 10 → return null
  return row[reps - 1]        // 0-indexed array
```

**Example:** `getRpeFactor(8, 5) = 0.811`

### 2.3 Training Load from %1RM

Direct calculation when the coach prescribes a percentage. The spreadsheet formula is:

```
=IF(A="ACC", " ",
    IF(plateToggle="NO",
       MROUND(IF(A="SQUAT", sqE1rm*H, IF(A="BENCH", bnE1rm*H, IF(A="DEADLIFT", dlE1rm*H))), 5),
       MROUND(IF(A="SQUAT", sqE1rm*H, IF(A="BENCH", bnE1rm*H, IF(A="DEADLIFT", dlE1rm*H))), 2.5)
    ))
```

In pseudocode:

```
calculateLoad(e1rm, percentDecimal, roundToKg = 2.5):
  return MROUND(e1rm × percentDecimal, roundToKg)
```

> **1.25 kg plate toggle:** `roundToKg` comes from Athlete Dashboard cell `D36` (YES → 2.5, NO → 5). Stored in `program_e1rm_settings.round_to_kg`.

**Example:** E1RM = 120kg, target = 75%

- `calculateLoad(120, 0.75, 2.5) = MROUND(90, 2.5) = 90.0 kg`

### 2.4 Training Load from RPE + Reps

When the coach prescribes RPE instead of a percentage — derive %1RM from the chart, then compute load.

```
computeLoadFromRpe(e1rm, rpe, reps, roundToKg = 2.5):
  factor = getRpeFactor(rpe, reps)
  if factor is null → return null
  return MROUND(e1rm × factor, roundToKg)
```

**Example:** E1RM = 120kg, RPE @8, 5 reps

- Factor = `RPE_CHART[8][4]` = `0.811`
- Load = `MROUND(120 × 0.811, 2.5)` = `MROUND(97.32, 2.5)` = **97.5 kg**

### 2.5 Load Range (±5%)

Show athlete a range to account for daily readiness.

```
loadRange(load, roundToKg = 2.5):
  upper = MROUND(load × 1.05, roundToKg)
  lower = MROUND(load × 0.95, roundToKg)
  return { upper, lower }
```

**Example:** Load = 90kg, roundTo = 2.5

- Upper = `MROUND(94.5, 2.5)` = **95.0 kg**
- Lower = `MROUND(85.5, 2.5)` = **85.0 kg**

### 2.6 E1RM Estimation — RPE Chart Method

Reverse-calculate E1RM from actual performance.

```
estimateE1rm_rpeChart(weight, reps, rpe, roundToKg = 2.5):
  factor = getRpeFactor(rpe, reps)
  if factor is null OR factor == 0 → return null
  return MROUND(weight / factor, roundToKg)
```

**Example:** Athlete did 100kg × 5 reps @ RPE 8

- Factor = `0.811`
- E1RM = `MROUND(100 / 0.811, 2.5)` = `MROUND(123.3, 2.5)` = **122.5 kg**

### 2.7 E1RM Estimation — Epley Formula

Classic formula used at top of each spreadsheet tab.

```
estimateE1rm_epley(weight, reps):
  denominator = 1.0278 − (0.0278 × reps)
  if denominator ≤ 0 → return 0
  return round(weight / denominator, 1 decimal)
```

**Example:** 100kg × 5 reps

- Denom = `1.0278 − 0.139` = `0.8888`
- E1RM = `100 / 0.8888` = **112.5 kg**

> **Note:** Epley is less accurate at low reps. The RPE chart method is preferred for powerlifting.

### 2.8 RPE to %1RM Display

Convenience function for UI — returns human-readable percentage.

```
rpeToPercent(rpe, reps):
  factor = getRpeFactor(rpe, reps)
  if factor is null → return null
  return format as "{factor × 100, 1 decimal}%"
```

**Example:** `rpeToPercent(8, 5)` → `"81.1%"`

### 2.9 Compute Row Load (combined logic)

This is the main function used when saving an exercise row. It picks the right path based on available data.

```
computeRowLoad(category, percentOneRm, e1rms, roundToKg, targetRpe, repScheme):

  // Step 1: Get the relevant E1RM for this exercise category
  e1rm = null
  if category == "SQUAT"   → e1rm = e1rms.squat
  if category == "BENCH"   → e1rm = e1rms.bench
  if category == "DEADLIFT"→ e1rm = e1rms.deadlift
  // ACCESSORY and OTHER → e1rm stays null → return null

  if e1rm is null or e1rm == 0 → return null

  // Step 2: Priority path — direct %1RM
  if percentOneRm is set and > 0:
    factor = percentOneRm / 10000          // basis points → decimal
    load   = MROUND(e1rm × factor, roundToKg)
    return { load, source: "percent", factor }

  // Step 3: Fallback — derive from RPE + Reps
  rpe  = parseRpe(targetRpe)               // see parsing rules below
  reps = parseReps(repScheme)              // see parsing rules below
  if rpe is not null AND reps is not null:
    factor = getRpeFactor(rpe, reps)
    if factor is not null:
      load = MROUND(e1rm × factor, roundToKg)
      return { load, source: "rpe", factor }

  return null
```

### 2.10 String Parsing Rules

**RPE Parsing** — extract first RPE value from free-text:

```
parseRpe(input):
  if input is null/empty → return null
  regex: /@?\s*(\d+\.?\d*)/       // matches "@7", "@8.5", "8", "ascending sets @8,9,9"
  match first occurrence
  value = parseFloat(match[1])
  if value < 4.0 OR value > 10.0 → return null    // outside chart range
  return value
```

**Rep Parsing** — extract first rep count from free-text:

```
parseReps(input):
  if input is null/empty → return null
  regex: /(\d+)/                   // matches "5", "5-8" (takes 5), "3x5" (takes 3 — beware)
  match first occurrence
  value = parseInt(match[1])
  if value < 1 OR value > 10 → return null         // outside chart range
  return value
```

**Frontend examples of real data these parsers handle:**

- `targetRpe`: `"@7"`, `"8.5"`, `"@8"`, `"ascending sets @8,9,9"`, `""`, `null`
- `repScheme`: `"5"`, `"5-8"`, `"3"`, `"AMRAP"`, `"10"`, `""`, `null`

---

## 3. Exercise Variation Defaults

### 3A. Primary Exercise Variants (RPE-based — NO %1RM)

Primary exercises use **RPE-based loading** with the VLOOKUP chart. The athlete chooses their variant on the Athlete Dashboard, and the sheet pulls RPE/rep defaults per set per week. These are **NOT** auto-filled from a defaults table — they're baked into the program template.

**Athlete Dashboard → Exercise Selection:**

| Slot                  | Dashboard Cell | Options                                                                               |
| --------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Squat Primary         | `D17`          | LOW BAR SQUAT, HIGH BAR SQUAT                                                         |
| Squat Secondary       | `D18`          | 2ct low bar paused squat, 2ct high bar paused squat, 3-0-0 tempo squat(any variation) |
| Bench Primary         | `D21`          | 2ct paused benchpress, 2ct paused larsen benchpress                                   |
| Bench Secondary (TNG) | `D22`          | shoulder width tng benchpress, med grip tng benchpress, wide grip tng benchpress      |
| Bench Tertiary        | `D23`          | Spoto press, 3-1-0 tempo benchpress, 4ct paused benchpress                            |
| Deadlift Primary      | `D26`          | conventional deadlift, sumo deadlift                                                  |
| Deadlift Secondary    | `D27`          | 2ct Paused conventional Deadlift, Romanian deadlift, 2ct Paused sumo Deadlift         |
| 1.25 kg plate?        | `D36`          | YES, NO                                                                               |

#### Squat Primary — RPE/Rep Templates (W1–W4)

| Variant        | Set     | Reps | W1 RPE | W2 RPE | W3 RPE | W4 RPE |
| -------------- | ------- | ---- | ------ | ------ | ------ | ------ |
| LOW BAR SQUAT  | 1 (top) | 3    | @5     | @6     | @7     | @8     |
| LOW BAR SQUAT  | 2       | 5    | @5     | @5.5   | @6     | @7     |
| LOW BAR SQUAT  | 3       | 5    | @6     | @6.5   | @7     | @8     |
| HIGH BAR SQUAT | 1 (top) | 5    | @5     | @6     | @7     | @8     |
| HIGH BAR SQUAT | 2       | 7    | @5     | @6     | @6     | @7     |
| HIGH BAR SQUAT | 3       | 7    | @6     | @6     | @7     | @8     |

> Top set gets E1RM back-calculation: `MROUND(load / VLOOKUP(aRpe, rpeChart, reps+1), 2.5)`

#### Bench Primary — RPE/Rep Templates (W1–W4)

| Variant                      | Set     | Reps | W1 RPE | W2 RPE | W3 RPE | W4 RPE |
| ---------------------------- | ------- | ---- | ------ | ------ | ------ | ------ |
| 2ct paused benchpress        | 1 (top) | 1    | @6     | @7     | @8     | @8.5   |
| 2ct paused benchpress        | 2       | 3    | @6     | @6     | @6.5   | @7     |
| 2ct paused benchpress        | 3       | 3    | @7     | @7     | @7.5   | @8     |
| 2ct paused benchpress        | 4       | 5    | @5     | @5     | @6     | @6     |
| 2ct paused benchpress        | 5       | 5    | @6     | @6     | @7     | @7     |
| 2ct paused larsen benchpress | 1 (top) | 3    | @7     | @8     | @8     | @9     |
| 2ct paused larsen benchpress | 2       | 5    | @6     | @6     | @6     | @7.5   |
| 2ct paused larsen benchpress | 3       | 5    | @7     | @7     | @8     | @8.5   |
| 2ct paused larsen benchpress | 4       | 7    | @5     | @5     | @6     | @6     |
| 2ct paused larsen benchpress | 5       | 7    | @6     | @6     | @7     | @7     |

#### Deadlift Primary — RPE/Rep Templates (W1–W4)

| Variant               | Set     | Reps | W1 RPE | W2 RPE | W3 RPE | W4 RPE |
| --------------------- | ------- | ---- | ------ | ------ | ------ | ------ |
| conventional deadlift | 1 (top) | 1    | @7     | @7     | @8     | @8     |
| conventional deadlift | 2       | 3    | @5     | @5.5   | @5     | @6     |
| conventional deadlift | 3       | 3    | @6     | @6.5   | @6     | @7     |
| sumo deadlift         | 1 (top) | 3    | @6     | @7     | @6     | @8     |
| sumo deadlift         | 2       | 5    | @5     | @6     | @7     | @7     |
| sumo deadlift         | 3       | 5    | @6     | @7     | @8     | @8.5   |

---

### 3B. Secondary Exercise Defaults (%1RM-based)

Secondary/tertiary exercises use **%1RM-based loading**. The `%1RM` value is set per exercise via nested IF formulas in the sheet, and it **increases every week** (progressive overload).

#### Complete Weekly %1RM Progression Table (Program 1, W1–W4)

| Exercise Name                      | Category | Sets | Reps | W1 %1RM | W2 %1RM | W3 %1RM | W4 %1RM | Step/wk |
| ---------------------------------- | -------- | ---- | ---- | ------- | ------- | ------- | ------- | ------- |
| `4ct paused benchpress`            | BENCH    | 2    | 3    | 53%     | 56%     | 59%     | 62%     | **+3%** |
| `spoto press`                      | BENCH    | 2    | 7    | 58%     | 61%     | 64%     | 67%     | **+3%** |
| `3-1-0 tempo benchpress`           | BENCH    | 2    | 5    | 65%     | 67%     | 69%     | 71%     | **+2%** |
| `med grip tng benchpress`          | BENCH    | 2    | 7    | 58%     | 61%     | 64%     | 67%     | **+3%** |
| `shoulder width tng benchpress`    | BENCH    | 2    | 5    | 51%     | 55%     | 59%     | 63%     | **+4%** |
| `wide grip tng benchpress`         | BENCH    | 2    | 10   | 53%     | 56%     | 59%     | 62%     | **+3%** |
| `2ct paused conventional deadlift` | DEADLIFT | 1    | 4    | 65%     | 67%     | 69%     | 71%     | **+2%** |
| `romanian deadlift`                | DEADLIFT | 3    | 8    | 51%     | 54%     | 57%     | 60%     | **+3%** |
| `2ct paused sumo deadlift`         | DEADLIFT | 2    | 6    | 67%     | 69%     | 71%     | 73%     | **+2%** |
| `2ct low bar paused squat`         | SQUAT    | 2    | 4    | 60%     | 63%     | 66%     | 69%     | **+3%** |
| `2ct high bar paused squat`        | SQUAT    | 2    | 6    | 65%     | 67%     | 69%     | 71%     | **+2%** |
| `3-0-0 tempo squat(any variation)` | SQUAT    | 2    | 5    | 67%     | 69%     | 71%     | 73%     | **+2%** |

> **Important:** The step per week varies by exercise — NOT a uniform +3%. Range is +2% to +4%. The W1 value is the "default" shown when the admin first selects the exercise. Backend should store the weekly step alongside the W1 default so the system can auto-fill all 4 weeks.

#### Suggested storage: add `weekly_step_pct` column

```sql
ALTER TABLE exercise_variation_defaults ADD COLUMN weekly_step_pct INT DEFAULT 300; -- basis points, 300 = +3%
```

With this, the load for any week can be computed:

```
weekPctOneRm = w1PctOneRm + (weekIndex × weeklyStepPct)  -- weekIndex 0-based
```

### Suggested DB table

```sql
CREATE TABLE exercise_variation_defaults (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name    TEXT NOT NULL UNIQUE,  -- lowercase, exact match key
  category         VARCHAR(20) NOT NULL CHECK (category IN ('SQUAT','BENCH','DEADLIFT','ACCESSORY','OTHER')),
  default_sets     INT,
  default_reps     TEXT,                  -- free-text like "3", "5-8"
  default_pct_1rm  INT,                   -- W1 basis points (5300 = 53%)
  weekly_step_pct  INT DEFAULT 300,       -- basis points step per week (300 = +3%, 200 = +2%, 400 = +4%)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. API Endpoints

### 4.1 RPE Chart

#### `GET /admin/formulas/rpe-chart`

Returns the full RPE ↔ %1RM table (see section 1 for exact data).

**Response (200):**

```json
[
  { "rpe": 10, "factors": [1.0, 0.955, 0.922, ...] },
  { "rpe": 9.5, "factors": [0.978, 0.939, 0.907, ...] },
  ...
]
```

---

### 4.2 Compute Load (server-side)

#### `POST /admin/formulas/compute-load`

**Request:**

```json
{
  "e1rmKg": 120,
  "percentOneRm": 7500,
  "targetRpe": null,
  "repScheme": null,
  "roundToKg": 2.5
}
```

| Field          | Type           | Required | Default | Description                                               |
| -------------- | -------------- | -------- | ------- | --------------------------------------------------------- |
| `e1rmKg`       | number         | Yes      | —       | Estimated 1-rep max in kg                                 |
| `percentOneRm` | number \| null | No       | null    | Target %1RM in **basis points** (`7500 = 75.00%`)         |
| `targetRpe`    | string \| null | No       | null    | Free-text RPE: `"@7"`, `"8.5"`, `"ascending sets @8,9,9"` |
| `repScheme`    | string \| null | No       | null    | Free-text reps: `"5"`, `"5-8"`, `"AMRAP"`                 |
| `roundToKg`    | number         | No       | 2.5     | Plate rounding increment                                  |

**Logic:** Use `computeRowLoad` (section 2.9) — if `percentOneRm` is set use path 1, else parse RPE+Reps for path 2. Return `400` if neither path can compute.

**Response (200):**

```json
{
  "loadKg": 90.0,
  "source": "percent",
  "factorUsed": 0.75,
  "lowerKg": 85.0,
  "upperKg": 95.0
}
```

| Field        | Type                   | Description                                      |
| ------------ | ---------------------- | ------------------------------------------------ |
| `loadKg`     | number                 | Computed training load, rounded to `roundToKg`   |
| `source`     | `"percent"` \| `"rpe"` | Which computation path was used                  |
| `factorUsed` | number                 | The decimal %1RM factor (e.g. `0.75`)            |
| `lowerKg`    | number                 | `MROUND(loadKg × 0.95, roundToKg)` — lower range |
| `upperKg`    | number                 | `MROUND(loadKg × 1.05, roundToKg)` — upper range |

**Error (400):**

```json
{
  "statusCode": 400,
  "message": "Cannot compute: provide percentOneRm or targetRpe + repScheme"
}
```

---

### 4.3 E1RM Estimation

#### `POST /admin/formulas/estimate-e1rm`

**Request:**

```json
{
  "weightKg": 100,
  "reps": 5,
  "rpe": 8,
  "roundToKg": 2.5,
  "method": "rpe-chart"
}
```

| Field       | Type                       | Required | Default       | Description                    |
| ----------- | -------------------------- | -------- | ------------- | ------------------------------ |
| `weightKg`  | number                     | Yes      | —             | Weight lifted in kg            |
| `reps`      | number                     | Yes      | —             | Reps completed (1–10 for RPE)  |
| `rpe`       | number                     | No       | —             | RPE (required for `rpe-chart`) |
| `roundToKg` | number                     | No       | 2.5           | Plate rounding                 |
| `method`    | `"rpe-chart"` \| `"epley"` | No       | `"rpe-chart"` | Which formula to use           |

**Logic:**

| Method      | Formula                                                              |
| ----------- | -------------------------------------------------------------------- |
| `rpe-chart` | `E1RM = MROUND(weightKg / getRpeFactor(rpe, reps), roundToKg)`       |
| `epley`     | `E1RM = round(weightKg / (1.0278 − 0.0278 × reps), 1 decimal place)` |

**Response (200):**

```json
{
  "estimatedE1rmKg": 122.5,
  "method": "rpe-chart"
}
```

---

### 4.4 E1RM Settings (per-program persistence)

Admin dashboard saves per-program E1RM inputs so they survive across devices/sessions.

#### `GET /admin/programs/:programId/e1rm-settings`

Returns saved settings. If nothing saved yet → `404`.

**Response (200):**

```json
{
  "programId": "uuid",
  "squatE1rm": 120,
  "benchE1rm": 80,
  "deadliftE1rm": 140,
  "roundToKg": 2.5,
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

#### `PUT /admin/programs/:programId/e1rm-settings`

Upsert (create or update).

**Request:**

```json
{
  "squatE1rm": 120,
  "benchE1rm": 80,
  "deadliftE1rm": 140,
  "roundToKg": 2.5
}
```

| Field          | Type   | Required | Default | Description              |
| -------------- | ------ | -------- | ------- | ------------------------ |
| `squatE1rm`    | number | Yes      | —       | Squat E1RM in kg         |
| `benchE1rm`    | number | Yes      | —       | Bench E1RM in kg         |
| `deadliftE1rm` | number | Yes      | —       | Deadlift E1RM in kg      |
| `roundToKg`    | number | No       | 2.5     | Plate rounding increment |

**Response (200):** Same shape as GET.

---

### 4.5 Exercise Variation Defaults

#### `GET /admin/formulas/variation-defaults`

Returns the default sets/reps/%1RM for known exercise variations (section 3).

**Response (200):**

```json
[
  {
    "exerciseName": "4ct paused benchpress",
    "category": "BENCH",
    "defaultSets": 2,
    "defaultReps": "3",
    "defaultPctOneRm": 5300,
    "weeklyStepPct": 300
  },
  {
    "exerciseName": "spoto press",
    "category": "BENCH",
    "defaultSets": 2,
    "defaultReps": "7",
    "defaultPctOneRm": 5800,
    "weeklyStepPct": 300
  }
]
```

---

### 4.6 Updated Exercise Row Fields

Two new **optional** fields on existing exercise row endpoints:

- `POST /admin/programs/:programId/days/:dayId/exercises`
- `PATCH /admin/programs/:programId/exercises/:rowId`

```json
{
  "sortOrder": 0,
  "category": "SQUAT",
  "exerciseId": "uuid",
  "exerciseNameOverride": null,
  "sets": 3,
  "repScheme": "5",
  "targetRpe": "@7",
  "percentOneRm": 7500,
  "computedLoadKg": 97.5,
  "loadSource": "percent",
  "loadNote": null,
  "notes": null
}
```

| New Field        | Type                           | Nullable | Description                                                          |
| ---------------- | ------------------------------ | -------- | -------------------------------------------------------------------- |
| `computedLoadKg` | number                         | Yes      | Pre-computed training load in kg (frontend computes, backend stores) |
| `loadSource`     | `"percent"` \| `"rpe"` \| null | Yes      | How the load was derived                                             |

**Backend validation (recommended):** When both `computedLoadKg` and enough data to recompute are present, verify the result matches. If mismatch > 5kg, log a warning (don't reject — it could be a rounding difference).

---

## 5. DB Migrations

### Migration 1: E1RM Settings table

```sql
CREATE TABLE program_e1rm_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  squat_e1rm    DECIMAL(6,1) NOT NULL DEFAULT 0,
  bench_e1rm    DECIMAL(6,1) NOT NULL DEFAULT 0,
  deadlift_e1rm DECIMAL(6,1) NOT NULL DEFAULT 0,
  round_to_kg   DECIMAL(4,1) NOT NULL DEFAULT 2.5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id)
);
```

### Migration 2: Computed load columns on exercise rows

```sql
ALTER TABLE program_exercises
  ADD COLUMN computed_load_kg DECIMAL(6,1),
  ADD COLUMN load_source VARCHAR(10)
    CHECK (load_source IN ('percent', 'rpe'));
```

### Migration 3: Exercise variation defaults

```sql
CREATE TABLE exercise_variation_defaults (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name    TEXT NOT NULL UNIQUE,
  category         VARCHAR(20) NOT NULL CHECK (category IN ('SQUAT','BENCH','DEADLIFT','ACCESSORY','OTHER')),
  default_sets     INT,
  default_reps     TEXT,
  default_pct_1rm  INT,   -- W1 basis points
  weekly_step_pct  INT DEFAULT 300,  -- basis points step per week
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (W1 defaults + weekly step)
INSERT INTO exercise_variation_defaults (exercise_name, category, default_sets, default_reps, default_pct_1rm, weekly_step_pct) VALUES
  ('4ct paused benchpress',             'BENCH',    2, '3',  5300, 300),   -- 53→56→59→62
  ('spoto press',                       'BENCH',    2, '7',  5800, 300),   -- 58→61→64→67
  ('3-1-0 tempo benchpress',           'BENCH',    2, '5',  6500, 200),   -- 65→67→69→71
  ('med grip tng benchpress',          'BENCH',    2, '7',  5800, 300),   -- 58→61→64→67
  ('shoulder width tng benchpress',    'BENCH',    2, '5',  5100, 400),   -- 51→55→59→63
  ('wide grip tng benchpress',         'BENCH',    2, '10', 5300, 300),   -- 53→56→59→62
  ('2ct paused conventional deadlift', 'DEADLIFT', 1, '4',  6500, 200),   -- 65→67→69→71
  ('romanian deadlift',                'DEADLIFT', 3, '8',  5100, 300),   -- 51→54→57→60
  ('2ct paused sumo deadlift',         'DEADLIFT', 2, '6',  6700, 200),   -- 67→69→71→73
  ('2ct low bar paused squat',         'SQUAT',    2, '4',  6000, 300),   -- 60→63→66→69
  ('2ct high bar paused squat',        'SQUAT',    2, '6',  6500, 200),   -- 65→67→69→71
  ('3-0-0 tempo squat(any variation)', 'SQUAT',    2, '5',  6700, 200);   -- 67→69→71→73
```

---

## 6. Worked Examples (for unit tests)

### Example 1: %1RM path

```
Input:  e1rm = 120kg, percentOneRm = 7500 (75%), roundTo = 2.5
Calc:   120 × 0.75 = 90.0
Round:  MROUND(90.0, 2.5) = 90.0
Range:  lower = MROUND(85.5, 2.5) = 85.0, upper = MROUND(94.5, 2.5) = 95.0
Result: { loadKg: 90, source: "percent", factorUsed: 0.75, lowerKg: 85, upperKg: 95 }
```

### Example 2: RPE path

```
Input:  e1rm = 120kg, targetRpe = "@8", repScheme = "5", roundTo = 2.5
Parse:  rpe = 8, reps = 5
Lookup: RPE_CHART[8][4] = 0.811
Calc:   120 × 0.811 = 97.32
Round:  MROUND(97.32, 2.5) = 97.5
Range:  lower = MROUND(92.625, 2.5) = 92.5, upper = MROUND(102.375, 2.5) = 102.5
Result: { loadKg: 97.5, source: "rpe", factorUsed: 0.811, lowerKg: 92.5, upperKg: 102.5 }
```

### Example 3: RPE E1RM estimation

```
Input:  weight = 100kg, reps = 5, rpe = 8, roundTo = 2.5
Lookup: RPE_CHART[8][4] = 0.811
Calc:   100 / 0.811 = 123.30
Round:  MROUND(123.30, 2.5) = 122.5
Result: { estimatedE1rmKg: 122.5, method: "rpe-chart" }
```

### Example 4: Epley E1RM

```
Input:  weight = 100kg, reps = 5
Calc:   1.0278 − (0.0278 × 5) = 0.8888
E1RM:   100 / 0.8888 = 112.509...
Round:  round to 1 decimal = 112.5
Result: { estimatedE1rmKg: 112.5, method: "epley" }
```

### Example 5: Free-text parsing

```
parseRpe("@8.5")                   → 8.5
parseRpe("ascending sets @8,9,9")  → 8
parseRpe("")                       → null
parseRpe("AMRAP")                  → null

parseReps("5")                     → 5
parseReps("5-8")                   → 5  (use lower bound)
parseReps("AMRAP")                 → null
parseReps("10")                    → 10
parseReps("12")                    → null (> 10, outside chart)
```

### Example 6: Category → E1RM mapping

```
e1rms = { squat: 140, bench: 100, deadlift: 180 }

category "SQUAT"     → e1rm = 140
category "BENCH"     → e1rm = 100
category "DEADLIFT"  → e1rm = 180
category "ACCESSORY" → e1rm = null → computeRowLoad returns null
category "OTHER"     → e1rm = null → computeRowLoad returns null
```

---

## Endpoint Summary

| Method | Endpoint                                   | Purpose                      | Priority     |
| ------ | ------------------------------------------ | ---------------------------- | ------------ |
| `GET`  | `/admin/formulas/rpe-chart`                | Full RPE chart data          | Must-have    |
| `POST` | `/admin/formulas/compute-load`             | Server-side load computation | Must-have    |
| `POST` | `/admin/formulas/estimate-e1rm`            | E1RM estimation              | Nice-to-have |
| `GET`  | `/admin/formulas/variation-defaults`       | Exercise variation defaults  | Nice-to-have |
| `GET`  | `/admin/programs/:programId/e1rm-settings` | Get saved E1RM settings      | Must-have    |
| `PUT`  | `/admin/programs/:programId/e1rm-settings` | Upsert E1RM settings         | Must-have    |

Exercise row `POST`/`PATCH` now accept two additional optional fields: `computedLoadKg` and `loadSource`.
