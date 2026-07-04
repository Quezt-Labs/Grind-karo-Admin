import api from "./api";

export interface FormCheckInboxItem {
  id: string;
  source: "program";
  userId: string;
  userName: string | null;
  userEmail: string;
  tabName: string | null;
  weekNumber: number | null;
  dayNumber: number | null;
  sortOrder?: number | null;
  setNumber: number;
  exerciseName: string;
  videoUrl: string;
  createdAt: string;
  coachComment: string | null;
  coachCommentId: string | null;
  reviewed: boolean;
  exerciseNotes?: string | null;
  setNotes?: string | null;
  /** @deprecated use exerciseNotes + setNotes */
  athleteNotes?: string | null;
  exerciseLogId?: string;
  programId?: string;
  workoutLogId?: string;
  programName?: string | null;
  exerciseCategory?: string | null;
  dayLabel?: string | null;
  prescriptionSets?: number | null;
  repScheme?: string | null;
  actualSets?: number | null;
  actualReps?: number | null;
  actualLoad?: number | null;
  actualRpe?: number | null;
  targetRpe?: string | null;
  prescribedLoadKg?: number | null;
}

export interface FormCheckInboxResponse {
  total: number;
  pendingCount: number;
  limit: number;
  offset: number;
  items: FormCheckInboxItem[];
}

export interface FormCheckInboxAthlete {
  userId: string;
  userName: string | null;
  userEmail: string;
  totalCount: number;
  pendingCount: number;
  latestVideoAt: string | null;
}

export interface FormCheckInboxAthletesByPlan {
  mega: FormCheckInboxAthlete[];
  ultra: FormCheckInboxAthlete[];
}

export const formCheckInboxService = {
  async list(params?: {
    uncommentedOnly?: boolean;
    weekNumber?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<FormCheckInboxResponse> {
    const { data } = await api.get("/admin/form-check-videos", {
      params,
      timeout: 60_000,
    });
    const response = data.data ?? data;
    return {
      ...response,
      items: (response.items ?? []).filter(
        (item: FormCheckInboxItem) => item.source === "program",
      ),
    };
  },

  async pendingCount(): Promise<{ pendingCount: number }> {
    const { data } = await api.get("/admin/form-check-videos/pending-count");
    return data.data ?? data;
  },

  async listAthletes(params?: {
    uncommentedOnly?: boolean;
  }): Promise<FormCheckInboxAthletesByPlan> {
    const { data } = await api.get("/admin/form-check-videos/athletes", {
      params,
    });
    return data.data ?? data;
  },
};
