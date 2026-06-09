# Bulk form check comments (admin)

Apply the same coach comment to all **pending** videos in one action (textarea + **Pass** preset).

## Where it appears

- **Form Check Inbox** (`/form-checks`) — athlete video list
- **User detail → Sheet workout videos**
- **User detail → Workout logs** — inside an expanded session only

## Frontend implementation

| Piece               | Path                                                |
| ------------------- | --------------------------------------------------- |
| Pass preset         | `src/constants/formCheckComments.ts`                |
| Bulk upsert utility | `src/utils/bulkFormCheckComments.ts`                |
| Shared UI bar       | `src/components/shared/BulkFormCheckCommentBar.tsx` |

`bulkUpsertFormCheckComments` calls existing per-video APIs in parallel via `Promise.allSettled`:

- Program: `POST /admin/workout-set-video-comments`
- Sheet: `POST /admin/sheets-set-video-comments`

Only videos **without** an existing `coachComment` are targeted; reviewed videos are not overwritten.

## Backend — not required for MVP

No new `grindkaro-svc` endpoint is needed for bulk to work. Each call reuses the same upsert logic as single **Save comment**:

- Coach / assignment access
- Form check quota (mega / ultra weekly limits)
- DB insert / update
- Per-video push notification

Partial failures (e.g. quota limit on a new program week) are reported in the UI toast (`N saved · M failed`).

## Optional backend follow-up

Consider a backend bulk endpoint or DTO flag only if these become problems:

| Concern       | Frontend-only today                              | Possible backend improvement                               |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Push spam     | N pending videos → up to N athlete notifications | `skipPush` on upsert + one summary notification after bulk |
| Atomic batch  | Some comments may save while others fail         | Single transaction, all-or-nothing                         |
| Large batches | Many parallel HTTP calls from the browser        | One server-side loop / bulk API                            |
| Auditing      | Each upsert logged separately                    | One bulk action log entry                                  |

Until then, shipping frontend-only is intentional and sufficient for typical batches (~5–15 videos).
