# Movement Selection — Frontend Implementation Guide

**Audience:** Web/mobile app developers integrating with GrindKaro’s program runtime API.  
**Companion:** Backend behaviour is defined in `MOVEMENT_SELECTION_BACKEND_GUIDE.md` (or equivalent); this doc maps that contract to UI and client logic.

---

## 1. Feature summary

- Some programs define **movement slots** (e.g. primary squat, bench variation). Each slot has **options** (e.g. low bar vs high bar).
- The athlete chooses **one option per slot** (plus optional **1.25 kg plates** preference) **before or until** selections are **locked**.
- **Lock:** After the **first successful workout log** for that program, the server sets `selectionsLockedAt`. The athlete **cannot** change `movementSelections` via `PUT /profile` until a **coach** clears the lock (reset endpoint).
- **Computed days** resolve each exercise row through the chosen option, apply per-option **overrides**, hide rows with `sets: 0` or empty `repScheme`, and return **load bands** (`computedLoad`, `computedLoadLower`, `computedLoadUpper`).

---

## 2. When to show the Movement Selection screen

After purchase, when the user opens a program, fetch content and profile (see below). Show the dedicated **Movement Selection** flow if:

1. `GET …/content` returns `movementSlots.length > 0`, **and**
2. The athlete **still needs to confirm** selections:

   **Recommended gating (matches product intent):**
   - If `profile.movementSelections` is **null** or **incomplete** (missing any slot id from `movementSlots` as a key), show the screen until they save a **full** map, **unless** you intentionally auto-save defaults on first visit (then treat “all keys present” as complete).

   **Read-only / no save:**
   - If `profile.selectionsLockedAt != null`, treat selections as **locked** (disable dropdowns, hide primary save; optionally show copy that changes require coach reset).

You may still **navigate** the user to the screen when locked for **read-only review** (e.g. show current choices and plate toggle as disabled).

---

## 3. API surface (athlete, JWT)

Base path (all require **user** JWT and program ownership — `403` if not purchased):

| Method | Path                                        | Purpose                                                                |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| `GET`  | `/programs/:programId/content`              | Tree + **`movementSlots`**                                             |
| `GET`  | `/programs/:programId/profile`              | 1RMs, `movementSelections`, `has125kgPlates`, **`selectionsLockedAt`** |
| `PUT`  | `/programs/:programId/profile`              | Partial update; see §5                                                 |
| `GET`  | `/programs/:programId/days/:dayId/computed` | Day with resolved movements + loads                                    |
| `POST` | `/programs/:programId/days/:dayId/log`      | Log workout (triggers lock on first success)                           |

### 3.1 `GET /programs/:programId/content`

- **`movementSlots`:** array of slots, each with `id`, `slotKey`, `label`, `category`, `sortOrder`, **`options`**.
- Each **option**: `id`, `exerciseId` (nullable), `exerciseName`, `isDefault`, `sortOrder`, **`overrides`** (for admin/authored rows; useful for previews only — runtime resolution is server-side on `computed`).
- In the **program tree**, each exercise may include **`movementSlotId`** (nullable). Fixed exercises omit it.

### 3.2 `GET /programs/:programId/profile`

Relevant fields:

```typescript
type ProgramProfile = {
  id?: string; // absent if server returns a synthetic default before first persist
  userId?: string;
  programId?: string;
  squatOneRm: number | null;
  benchOneRm: number | null;
  deadliftOneRm: number | null;
  activeBlockId: string | null;
  movementSelections: Record<string, string> | null; // slotId → optionId
  has125kgPlates: boolean;
  selectionsLockedAt: string | null; // ISO 8601 — if non-null, selections locked
  notes: string | null;
};
```

**Note:** Before the first persisted profile row, `GET` may return a **synthetic** object (null `movementSelections`, `selectionsLockedAt: null`, etc.). Handle missing `id` if you key cache by profile id.

### 3.3 `PUT /programs/:programId/profile`

Body fields (all optional **except** you must follow server rules when sending `movementSelections`):

```typescript
type UpsertProgramProfileBody = {
  squatOneRm?: number | null;
  benchOneRm?: number | null;
  deadliftOneRm?: number | null;
  activeBlockId?: string | null;
  notes?: string | null;
  movementSelections?: Record<string, string>; // do NOT send null — see errors
  has125kgPlates?: boolean;
};
```

**Rules:**

- **`movementSelections`:** When the program has slots, the first “save” on the Movement screen should send **every** slot id from `content.movementSlots` as keys, each mapping to a valid **option id** under that slot.
- **Do not send `movementSelections: null`.** Clearing selections is **coach-only** (reset). Sending `null` yields **400**.
- **`has125kgPlates`:** Omit on PUT if unchanged; server keeps previous value.
- If **`selectionsLockedAt`** is set on the server and the client sends **`movementSelections` in the body** (any value), server responds **409** with the standard conflict message (contact coach).

### 3.4 `GET …/days/:dayId/computed`

Each exercise row may include:

- `movementSlotId`, `selectedOptionId`
- `resolvedName`, `sets`, `repScheme`, `targetRpe`, `percentOneRm`, …
- `loadComputation`, `computedLoad`, **`computedLoadUpper`**, **`computedLoadLower`**, `basisOneRm`

Rows hidden by overrides **do not appear** in the array (no client-side filter for `sets === 0`).

### 3.5 `POST …/days/:dayId/log`

On **first** successful log for that user + program, the server sets **`selectionsLockedAt`** (and may create a minimal profile row if needed). After that, **`PUT profile` with `movementSelections` is rejected** until reset.

Optimistic UI should **refresh profile** after logging if you need an accurate lock flag on the next screen.

---

## 4. API surface (coach / admin, Admin JWT)

| Method | Path                                            | Body                             | Purpose                                                         |
| ------ | ----------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `POST` | `/programs/:programId/profile/reset-selections` | `{ "userId": "<athlete-uuid>" }` | Clear `movementSelections` and `selectionsLockedAt`             |
| `GET`  | `/admin/programs/:programId/athlete-selections` | —                                | List athletes with profile rows + their selections / lock state |

Reset response:

```json
{ "message": "Movement selections reset successfully." }
```

Use these from **admin** or **coach** tooling only (Admin JWT / `AdminGuard`).

---

## 5. Movement Selection screen — behaviour

### 5.1 Data loading

1. `GET /programs/:programId/content` → cache blocks + **`movementSlots`**.
2. `GET /programs/:programId/profile` → prefill **`movementSelections`**, **`has125kgPlates`**, read **`selectionsLockedAt`**.

### 5.2 Default preselection (client-only)

If `profile.movementSelections` is missing an entry for a slot, preselect the option where **`isDefault === true`** (must exist per slot). This is **UI state** until the user taps save.

### 5.3 Save

`PUT /programs/:programId/profile` with:

```json
{
  "movementSelections": {
    "<slot-uuid-1>": "<option-uuid-a>",
    "<slot-uuid-2>": "<option-uuid-b>"
  },
  "has125kgPlates": true
}
```

- Include **all** slots; partial maps are **400** when the program defines slots.
- On **200**, navigate per product flow (e.g. program home or first workout).
- On **409**, show message: movement selections cannot be changed after workouts; coach must reset.

### 5.4 Plates toggle

Persist **`has125kgPlates`** with the same PUT as movement selections when possible (one “Save & start training” action). If the screen is locked, you may still allow unrelated profile fields only if the product allows (server still rejects any body that includes **`movementSelections`** while locked).

---

## 6. Error handling (athlete)

| Status  | When                                                                                 | UX                                    |
| ------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| **400** | Invalid slot/option ids, partial `movementSelections`, or `movementSelections: null` | Show validation; fix map before retry |
| **403** | Not owning program                                                                   | Redirect to shop / entitlement        |
| **409** | `movementSelections` in body while `selectionsLockedAt` is set                       | Coach reset required                  |
| **401** | Expired JWT                                                                          | Refresh token or re-auth              |

---

## 7. TypeScript types (minimal)

```typescript
export type MovementOptionOverride = {
  programExerciseId: string;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null;
  loadComputation: string | null;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  loadNote: string | null;
  notes: string | null;
};

export type MovementOption = {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  isDefault: boolean;
  sortOrder: number;
  overrides: MovementOptionOverride[];
};

export type MovementSlot = {
  id: string;
  slotKey: string;
  label: string;
  category: "SQUAT" | "BENCH" | "DEADLIFT" | "ACCESSORY" | "OTHER";
  sortOrder: number;
  options: MovementOption[];
};

export type ProgramContentResponse = {
  programId: string;
  blocks: unknown; // your existing tree type
  resources: unknown;
  movementSlots: MovementSlot[];
};
```

---

## 8. Testing checklist

- [ ] Program **without** slots: no movement screen; `computed` behaves as before.
- [ ] Program **with** slots: first-time user saves full map + plates; subsequent opens show saved values.
- [ ] After **first** `POST …/log`, `GET profile` shows **`selectionsLockedAt`** set; **`PUT` with `movementSelections` → 409**.
- [ ] Coach **reset** clears lock; athlete can **`PUT` selections again** (even if old logs exist).
- [ ] `GET …/computed` shows **`resolvedName`** / **`selectedOptionId`** consistent with map; no rows for hidden overrides.

---

## 9. Optional: deep links

Suggested routes (app-specific):

- Athlete: `/client/programs/:programId/movements` (or `/client/movements/:programId` per original product brief).
- After save: return to `/client/programs/:programId` or `/client/workout/:programId` as appropriate.

Keep route names consistent with your router; the **server does not** define frontend paths.

---

## 10. Changelog vs older clients

If you previously keyed only on **`movementSelections`** or “any workout logged”, update to **`selectionsLockedAt`** for lock UX so **coach reset** works without contradicting the API.
