# Workout video comments (admin)

Coach comments on set videos from **User detail → Workout logs**.

For applying one comment to all pending videos at once, see **[BULK_FORM_CHECK_COMMENTS.md](./BULK_FORM_CHECK_COMMENTS.md)**.

## UI

Expand a logged session → each set video has a **Coach comment** textarea and **Save comment** button. Expanded sessions also show a **Bulk comment** bar when pending set videos exist.

## API

Service: `src/services/workoutVideoCommentService.ts`

- `POST /admin/workout-set-video-comments` — upsert comment
- Log list auto-includes `coachComment` on each `setVideos[]` entry via existing workout logs API

## Types

`SetVideoEntryDto` in `src/types/workoutLogs.ts` includes optional `coachComment`, `coachCommentId`, `coachCommentUpdatedAt`.
