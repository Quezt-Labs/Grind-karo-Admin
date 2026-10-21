# Grind Karo Coach Admin — Copy Phone on Athlete Page  
## 30-Minute Screen Recording Guide (narration ↔ input sync)

**Task title:** Copy phone on athlete page  
**Repository:** `Grind-karo-Admin`  
**Route under test:** `/users/:id` (`UserDetailPage.tsx`)  
**Coding on camera:** ~6–8 minutes (~25%)  
**Walkthrough + verification:** ~22–24 minutes  

---

## How to read synced beats

Each **beat** has three lanes—perform them **in order**, left to right:

| Lane | Meaning |
|------|---------|
| **Mouse / keyboard** | Exact UI input (pause ~1s after each click) |
| **Narration (what / where / why)** | Full sentences; name **files**, **symbols**, and **UI labels**—avoid “this”, “that”, “here”, “it” without a noun |
| **Expected on screen** | What the viewer should see before the next beat |

**Narration rule:** Replace vague pointers with concrete names.  
- Weak: “I click this and copy that.”  
- Strong: “I click the **Copy phone** ghost button beside `phoneStatus.label` in the athlete header.”

---

## Table of contents

1. [Definition of done](#1-definition-of-done)
2. [Prerequisites](#2-prerequisites)
3. [TODO map](#3-todo-map)
4. [Walkthrough beats (5–7 minutes)](#4-walkthrough-beats-57-minutes)
5. [Coding beats — TODO 1–6](#5-coding-beats--todo-16)
6. [Verification beats](#6-verification-beats)
7. [Minute-by-minute master timeline](#7-minute-by-minute-master-timeline)
8. [Closing summary narration](#8-closing-summary-narration)
9. [Deliverables checklist](#9-deliverables-checklist)

---

## 1. Definition of done

| Requirement | Detail |
|-------------|--------|
| **Where** | Athlete header on `UserDetailPage`, phone row next to the `Phone` lucide icon |
| **What** | New `CopyPhoneButton` copies `phoneStatus.label` (formatted display string) |
| **Feedback** | Button text **Copy phone** → **Copied** → **Copy phone** (~2 seconds) |
| **When hidden** | Amber **Number missing** pill — **no** `CopyPhoneButton` |
| **What not to do** | No `PUT`/`PATCH` user APIs; clipboard only |

**Reference:** `CopyEmailButton.tsx` (same clipboard + timer pattern).

---

## 2. Prerequisites

### Environment

```bash
cp .env.example .env   # VITE_API_BASE_URL=https://api.grindkaro.in
npm install
npm run dev            # http://localhost:5173
```

### Test athletes (fake data on camera — no PII)

| Label | Phone on record | URL pattern | Header expectation |
|-------|-----------------|-------------|-------------------|
| **Athlete A** | Valid digits | `/users/<uuid-a>` | `phoneStatus.label` + **Copy phone** after TODO 6 |
| **Athlete B** | Empty / null | `/users/<uuid-b>` | **Number missing** only |

### Apps (Metadata topology)

Brave (LOOKUP) → Visual Studio Code (CREATE/MODIFY) → Brave (LOOKUP) → VS Code integrated Terminal (LOOKUP)

---

## 3. TODO map

| TODO | File | Where to look | Outcome |
|------|------|---------------|---------|
| **1** | `src/components/users/CopyPhoneButton.tsx` | Below file header comment | `COPIED_CONFIRMATION_MS` constant |
| **2** | Same | Inside `CopyPhoneButton` | `copied` state + reset `useEffect` |
| **3** | Same | Before `return` | `copyPhone()` clipboard handler |
| **4** | Same | Replace `return null` | Ghost `Button` UI |
| **5** | `src/pages/UserDetailPage.tsx` | Imports ~line 68 | `import { CopyPhoneButton } ...` |
| **6** | Same | Phone row ~line 405 | `<CopyPhoneButton phone={phoneStatus.label} />` in `else` branch only |

---

## 4. Walkthrough beats (5–7 minutes)

### Beat W1 — Intro goal (0:00–0:20)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Open Word or Google Docs; show one-line Goal; minimize window | “The goal is to add **Copy phone** on the Grind Karo coach admin **athlete detail page** at route `/users/:id`, copying the **formatted phone label** already shown beside the phone icon, with a two-second **Copied** confirmation and **no** profile API updates.” | Goal text visible briefly |

### Beat W2 — Repository stack (0:20–1:15)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| VS Code: Explorer → open `package.json` | “The admin app is a **Vite** React 19 project; script `npm run dev` starts the dev server.” | `"dev": "vite"` visible |
| Scroll `dependencies` | “Routing uses **react-router-dom**; server state uses **TanStack React Query**; HTTP uses **axios**.” | Dependency list |
| Open `src/main.tsx` | “`QueryClientProvider` wraps `App`, so athlete data on `UserDetailPage` is cached query data.” | Provider wrapper |

### Beat W3 — Route to athlete page (1:15–2:15)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Open `src/App.tsx`; `Cmd+F` → `UserDetailPage` | “Staff users reach **UserDetailPage** on path `/users/:id`.” | Route element line |
| Open `src/pages/UserDetailPage.tsx`; scroll to header JSX (~line 370+) | “The header block renders name, **email row**, **phone row**, role, and join date.” | Mail + Phone rows |

### Beat W4 — Configuration (2:15–3:00)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Open `.env.example` | “API base URL is **VITE_API_BASE_URL**; Copy phone does not add new environment variables.” | Single env line |
| Open `src/services/api.ts` | “Axios reads `import.meta.env.VITE_API_BASE_URL` for all REST calls; clipboard copy does not use Axios.” | Base URL assignment |

### Beat W5 — Phone data path (3:00–4:15)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| In `UserDetailPage.tsx`, `Cmd+F` → `phoneStatus` | “After `useUserDetail` loads `user`, line `const phoneStatus = formatAdminPhone(user.phone)` derives display label and missing flag.” | `formatAdminPhone` call ~line 295 |
| Open `src/utils/phoneStatus.ts` | “**formatAdminPhone** trims input, keeps digits, prefixes `+` when digits exist; **missing** is true when the label is empty.” | Function body |
| Return to `UserDetailPage` phone `<span>` | “The ternary shows amber **Number missing** when `phoneStatus.missing` is true; otherwise it prints `phoneStatus.label`.” | Conditional JSX |

### Beat W6 — Copy email reference (4:15–5:15)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Open `src/components/users/CopyEmailButton.tsx` | “**CopyEmailButton** already implements clipboard write, **Copied** state, and a two-second timeout—**CopyPhoneButton** mirrors that structure with prop `phone` instead of `email`.” | Full component |
| Open `src/components/users/CopyPhoneButton.tsx` | “Starter file **CopyPhoneButton.tsx** lists **TODO 1–4** and returns `null` until the recording implementation.” | TODO comments, `return null` |

### Beat W7 — Page wiring gap (5:15–6:00)

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| `UserDetailPage.tsx` imports ~line 68 | “**TODO 5** adds the **CopyPhoneButton** import after **CopyEmailButton**.” | Commented TODO 5 |
| Phone row comment `TODO 6` | “**TODO 6** mounts **CopyPhoneButton** only in the branch where `phoneStatus.missing` is false, passing `phone={phoneStatus.label}`.” | No live Copy phone button yet |

---

## 5. Coding beats — TODO 1–6

> Type code in **small saves**; narrate the **file name** and **symbol name** on each save.

### Beat C1 — TODO 1 constant

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Focus `CopyPhoneButton.tsx`; place cursor below imports | “**TODO 1** adds **COPIED_CONFIRMATION_MS** at module scope so the **Copied** label duration matches **CopyEmailButton**.” | — |
| Type: `const COPIED_CONFIRMATION_MS = 2000;` | “Two thousand milliseconds gives coaches time to read **Copied** before the label reverts to **Copy phone**.” | Constant in file |
| `Cmd+S` | “Saved **CopyPhoneButton.tsx** after **TODO 1**.” | Tab dirty dot clears |

### Beat C2 — TODO 2 state and timer

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Inside `CopyPhoneButton`, below props destructuring | “**TODO 2** introduces boolean state **copied** and a **useEffect** keyed on **copied**.” | — |
| Type `useState` + `useEffect` block (see snippet below) | “When **copied** becomes true, **useEffect** schedules **setCopied(false)** after **COPIED_CONFIRMATION_MS**; cleanup calls **window.clearTimeout**.” | No TypeScript errors |
| `Cmd+S` | “Saved **CopyPhoneButton.tsx** after **TODO 2**.” | — |

```ts
const [copied, setCopied] = useState(false);

useEffect(() => {
  if (!copied) return;
  const timer = window.setTimeout(
    () => setCopied(false),
    COPIED_CONFIRMATION_MS,
  );
  return () => window.clearTimeout(timer);
}, [copied]);
```

### Beat C3 — TODO 3 clipboard handler

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Below **useEffect**, add `async function copyPhone()` | “**TODO 3** writes the **phone** prop string to the system clipboard—already formatted for display by **formatAdminPhone**.” | — |
| Type try/catch with `navigator.clipboard.writeText(phone)` | “Success sets **copied** to true; denial or error sets **copied** false without a toast.” | Function present |
| `Cmd+S` | “Saved **CopyPhoneButton.tsx** after **TODO 3**.” | — |

```ts
async function copyPhone() {
  try {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
  } catch {
    setCopied(false);
  }
}
```

### Beat C4 — TODO 4 button UI

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Delete `return null;` | “**TODO 4** renders the shared **Button** primitive from `@/components/ui/Button`.” | — |
| Paste JSX (snippet below); `Cmd+S` | “Ghost variant, small size, same **className** as **CopyEmailButton**; **onClick** calls **void copyPhone()** because **copyPhone** is async.” | Component exports UI |

```tsx
return (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="h-6 px-2 py-0 text-xs text-gray-600 dark:text-gray-300"
    onClick={() => void copyPhone()}
  >
    {copied ? "Copied" : "Copy phone"}
  </Button>
);
```

### Beat C5 — TODO 5 import

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Open `UserDetailPage.tsx`; go to **TODO 5** comment ~line 68 | “**TODO 5** imports **CopyPhoneButton** next to **CopyEmailButton**.” | Comment visible |
| Replace comment with `import { CopyPhoneButton } from "@/components/users/CopyPhoneButton";` | “The import path uses the `@/components/users` alias configured in **tsconfig**.” | Import line active |
| `Cmd+S` | “Saved **UserDetailPage.tsx** after **TODO 5**.” | — |

### Beat C6 — TODO 6 wire phone row

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Scroll to phone row; find **TODO 6** inside `else` branch | “**TODO 6** places **CopyPhoneButton** immediately after `{phoneStatus.label}`.” | Fragment with label |
| Add `<CopyPhoneButton phone={phoneStatus.label} />`; remove TODO comment; `Cmd+S` | “Prop **phone** receives **phoneStatus.label** so paste matches the header text, not an unformatted database value.” | HMR may update Brave tab |

---

## 6. Verification beats

### Beat V1 — Start dev server

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| VS Code Terminal: `npm run dev` | “Vite serves the admin at **localhost:5173**.” | Local URL in terminal |
| Brave: open `http://localhost:5173`; sign in as staff if needed | “Staff session can open **Users** and athlete **UUID** routes.” | Dashboard or users list |

### Beat V2 — Athlete A happy path

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Navigate to `/users/<uuid-a>` | “Athlete A shows a formatted phone in the header row beside the **Phone** icon.” | Label + **Copy phone** |
| Click **Copy phone**; wait 2 seconds | “Label changes to **Copied**, then returns to **Copy phone**.” | Label cycle |
| Click address bar or Notes; `Cmd+V` | “Pasted text equals **phoneStatus.label** from the header.” | Paste matches display |

### Beat V3 — Athlete B missing phone

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Navigate to `/users/<uuid-b>` | “Athlete B triggers **phoneStatus.missing**.” | Amber **Number missing** |
| Scan phone row | “**CopyPhoneButton** is not mounted because **TODO 6** lives only in the non-missing branch.” | No **Copy phone** control |

### Beat V4 — Network quiet

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| DevTools → **Network** → filter **Fetch/XHR** | “I monitor XHR while clicking **Copy phone**.” | Network panel open |
| Click **Copy phone** three times | “Clipboard actions do not send **PUT** or **PATCH** to user profile endpoints.” | No new profile mutations |

### Beat V5 — Copy email regression

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| On Athlete A, click **Copy email**; paste once | “**CopyEmailButton** still copies **user.email**.” | Email paste works |
| Click **Copy phone** again | “Phone copy still works after email copy.” | Both controls OK |

### Beat V6 — Lint and build

| Mouse / keyboard | Narration | Expected |
|------------------|-----------|----------|
| Terminal: `npm run lint` | “ESLint scans **CopyPhoneButton** and **UserDetailPage** imports.” | Exit code 0 |
| Terminal: `npm run build` | “TypeScript project build includes the new component.” | Exit code 0 |

---

## 7. Minute-by-minute master timeline

| Time | Segment | Mouse / keyboard (summary) | Narration anchor (what / where / why) | Expected |
|------|---------|----------------------------|----------------------------------------|----------|
| 0:00–0:20 | Intro | Docs Goal | Task: **Copy phone** on `/users/:id` | Goal shown |
| 0:20–2:00 | Stack | `package.json`, `main.tsx` | Vite + React Query architecture | Files open |
| 2:00–3:00 | Routing | `App.tsx`, `UserDetailPage` header | Route `/users/:id` | Header JSX |
| 3:00–4:15 | Phone data | `phoneStatus`, `phoneStatus.ts` | **formatAdminPhone** label vs missing | Code + ternary |
| 4:15–5:15 | Reference | `CopyEmailButton`, starter `CopyPhoneButton` | Mirror email pattern | TODOs visible |
| 5:15–6:30 | Page gap | `UserDetailPage` TODO 5–6 comments | Import + conditional mount | No button yet |
| 6:30–8:00 | **C1–C2** | Type TODO 1–2 in `CopyPhoneButton.tsx` | Constant + timer | Saved file |
| 8:00–9:30 | **C3–C4** | Type TODO 3–4 | Clipboard + **Button** | Component complete |
| 9:30–10:30 | **C5–C6** | `UserDetailPage` import + JSX | Wire `phoneStatus.label` | HMR / refresh |
| 10:30–14:00 | **V1–V2** | `npm run dev`, Athlete A paste | Happy path verification | Paste match |
| 14:00–16:00 | **V3** | Athlete B | Missing phone gating | No button |
| 16:00–18:00 | **V4–V5** | Network tab + email click | No API + regression | Quiet network |
| 18:00–19:30 | **V6** | lint + build | Quality gate | Green output |
| 19:30–28:00 | Buffer | Repeat V2 slowly | Reinforce DoD | Same results |
| 28:00–30:00 | Close | Speak to camera | §8 summary | — |

---

## 8. Closing summary narration

Read verbatim or paraphrase with the same nouns:

“On the Grind Karo coach admin **UserDetailPage**, I added **CopyPhoneButton** beside the formatted **phoneStatus.label** in the athlete header. The component uses **navigator.clipboard.writeText** with the **phone** prop, shows **Copied** for **COPIED_CONFIRMATION_MS** milliseconds, and resets via **useEffect** and **clearTimeout**. **UserDetailPage** imports **CopyPhoneButton** and renders it only when **phoneStatus.missing** is false; athletes with **Number missing** see no copy control. I verified paste content on Athlete A, absence of the button on Athlete B, no profile XHR on copy, **Copy email** regression, and **npm run lint** plus **npm run build**. Files changed: **CopyPhoneButton.tsx** and **UserDetailPage.tsx**.”

---

## 9. Deliverables checklist

- [ ] **TODO 1–6** complete; `npm run dev` runs
- [ ] Beats **V2–V4** on camera
- [ ] **final output 2.mp4** — coding visible; narration matches clicks (~1s pause)
- [ ] **final output 3.rtf** — Topology chronological; Request = Copy phone brief
- [ ] **Deliverables.zip** — code only; no `.env`, `node_modules`, video, Metadata
- [ ] **No PII** — fake athletes only; Do Not Disturb on

---

## Metadata quick reference

**Request:** Add **Copy phone** on `/users/:id` when **phoneStatus.label** is shown; copy that label; **Copied** confirmation; hide when **Number missing**; no user updates.

**Topology:** Brave (LOOKUP) → Brave (LOOKUP) → Visual Studio Code (LOOKUP) → Visual Studio Code (CREATE) → Visual Studio Code (MODIFY) → Brave (LOOKUP) → Terminal (LOOKUP)

---

*Document version: 2026-10-22 — Copy phone guide with synced narration and input beats.*
