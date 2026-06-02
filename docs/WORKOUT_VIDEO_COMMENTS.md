# Workout video comments (admin)

Coach comments on set videos from **User detail → Workout logs**.

## UI

Expand a logged session → each set video has a **Coach comment** textarea and **Save comment** button.

## API

Service: `src/services/workoutVideoCommentService.ts`

- `POST /admin/workout-set-video-comments` — upsert comment
- Log list auto-includes `coachComment` on each `setVideos[]` entry via existing workout logs API

## Types

`SetVideoEntryDto` in `src/types/workoutLogs.ts` includes optional `coachComment`, `coachCommentId`, `coachCommentUpdatedAt`.
