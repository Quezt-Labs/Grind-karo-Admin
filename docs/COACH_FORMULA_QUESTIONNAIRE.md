# Coach Formula Capture Checklist

Use this when migrating a sheet-based program into the admin DB editor or onboarding a new coaching athlete.

## A. Athlete inputs (profile)

- Squat / Bench / Deadlift: competition 1RM, training max, or E1RM?
- Update cadence: block start only, after PR, or coach manual?
- Plate rounding: 1.25 kg plates? ±5% range?
- Movement selections lock: first workout log (default) or never?

## B. Movement slots

Per slot document:

- Label + category (SQUAT / BENCH / DEADLIFT)
- Options (exact names) + default
- Per option × per row: sets, reps, RPE, %1RM, hide row (`sets = 0`)

## C. Load formulas (row-by-row)

| Row                     | Basis 1RM   | Strategy       | Values |
| ----------------------- | ----------- | -------------- | ------ |
| e.g. Squat top set W3D1 | Squat       | PERCENT_1RM    | 53%    |
| e.g. Backdown           | Top set row | PERCENT_OF_ROW | 90%    |

Strategies: `PERCENT_1RM`, `RPE_CHART`, `PERCENT_OF_ROW`, `NONE`.

## D. Top set → backdown

- Which row is the top set anchor?
- Backdown % of top set
- If athlete lifts different load: use actual → backdowns recompute in app

## E. Coaching onboarding

- Clone from which retail template(s)?
- Per-athlete structure always different, or same blocks with different numbers?

## F. Golden test cases (required)

Three athletes with:

1. Known SBD + movements → expected loads (Week/Day)
2. Different movement pick → different loads same day
3. Top set actual changed → expected new backdowns

Verify against `GET /programs/:id/days/:dayId/computed` before go-live.
