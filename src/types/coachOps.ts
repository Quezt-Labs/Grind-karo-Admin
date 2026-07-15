export type CoachingSetupStatus =
  | "needs_intake"
  | "needs_sbd_videos"
  | "awaiting_program"
  | "ready";

export interface CoachOpsCoachFilter {
  id: string;
  label: string;
  count: number;
}

export interface CoachOpsBoardItem {
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  setupStatus: CoachingSetupStatus;
  coachId: string | null;
  coachName: string | null;
  formChecksDone: boolean;
  paymentDone: boolean;
  nextCheckInDate: string | null;
  opsNotes: string | null;
}

export interface CoachOpsBoardResponse {
  view: "admin" | "coach";
  date: string;
  coachFilters: CoachOpsCoachFilter[];
  items: CoachOpsBoardItem[];
  total: number;
}

export interface ProgramEndingSoonItem {
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  programId: string;
  weekNumber: number;
  weekTitle: string | null;
  weekStart: string | null;
  weekEnd: string;
  daysUntilEnd: number;
}

export interface ProgramsEndingSoonResponse {
  withinDays: number;
  items: ProgramEndingSoonItem[];
  total: number;
}

export interface PatchCoachOpsEntryPayload {
  date: string;
  formChecksDone?: boolean;
  paymentDone?: boolean;
  nextCheckInDate?: string | null;
  opsNotes?: string | null;
}
