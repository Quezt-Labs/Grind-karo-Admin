export interface SetVideoEntryDto {
  setNumber: number;
  videoUrl: string;
  coachComment?: string | null;
  coachCommentId?: string | null;
  coachCommentUpdatedAt?: string | null;
}

export interface AdminWorkoutLogRow {
  id: string;
  programExerciseId: string | null;
  exerciseName: string | null;
  actualSets: number | null;
  actualReps: number | null;
  actualLoad: number | null;
  actualRpe: number | null;
  e1rm: number | null;
  notes: string | null;
  setVideos: SetVideoEntryDto[];
}

export interface AdminWorkoutLog {
  id: string;
  userId: string;
  programId: string;
  programName: string | null;
  programSlug: string | null;
  dayId: string | null;
  completedAt: string;
  bodyweight: number | null;
  notes: string | null;
  rows: AdminWorkoutLogRow[];
}

export interface AdminWorkoutLogsResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminWorkoutLog[];
}
